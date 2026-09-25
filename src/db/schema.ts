import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*                                    Enums                                   */
/* -------------------------------------------------------------------------- */

export const roleEnum = pgEnum("role", ["ADMIN", "MANAGER", "TECHNICIAN", "TENANT"]);

export const systemDomainEnum = pgEnum("system_domain", [
  "HVAC",
  "PLUMBING",
  "ELECTRICAL",
  "SUB_METER",
  "WATER_PUMP",
  "ACCESS_CONTROL",
  "LOCK_ENCODER",
  "VOIP_PBX",
  "POS_PRINTER",
  "CCTV",
  "NETWORK",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "OPEN",
  "IN_PROGRESS",
  "PENDING_PARTS",
  "RESOLVED",
  "CLOSED",
]);

export const priorityEnum = pgEnum("priority", ["P1", "P2", "P3", "P4"]);

export const unitTypeEnum = pgEnum("unit_type", ["RESIDENTIAL", "COMMERCIAL", "COMMON_AREA", "TECHNICAL"]);

export const assetStatusEnum = pgEnum("asset_status", [
  "OPERATIONAL",
  "DEGRADED",
  "DOWN",
  "MAINTENANCE",
  "RETIRED",
]);

export const criticalityEnum = pgEnum("criticality", ["CRITICAL", "HIGH", "STANDARD", "LOW"]);

export const channelEnum = pgEnum("ticket_channel", ["QR_SCAN", "PORTAL", "API", "PHONE", "EMAIL"]);

export const impactScopeEnum = pgEnum("impact_scope", ["SINGLE", "UNIT", "FLOOR", "BUILDING"]);

export const noteTypeEnum = pgEnum("note_type", ["COMMENT", "STATUS_CHANGE", "AUDIT_CAPTURE", "ASSIGNMENT", "SYSTEM"]);

export const categoryTypeEnum = pgEnum("category_type", ["UNIT", "ASSET", "TICKET"]);

export type CategoryType = (typeof categoryTypeEnum.enumValues)[number];

/* -------------------------------------------------------------------------- */
/*                                   Tables                                   */
/* -------------------------------------------------------------------------- */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    type: categoryTypeEnum("type").notNull(),
    description: text("description"),
    color: varchar("color", { length: 16 }).notNull().default("indigo"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("categories_type_idx").on(t.type), index("categories_sort_idx").on(t.sortOrder)],
);

export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    type: unitTypeEnum("type").notNull().default("RESIDENTIAL"),
    floor: varchar("floor", { length: 64 }).notNull(),
    floorLevel: integer("floor_level").notNull().default(0),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    occupantName: varchar("occupant_name", { length: 160 }),
    contactPhone: varchar("contact_phone", { length: 40 }),
    contactEmail: varchar("contact_email", { length: 160 }),
    areaSqm: integer("area_sqm"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("units_type_idx").on(t.type), index("units_category_idx").on(t.categoryId)],
);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("TECHNICIAN"),
  title: varchar("title", { length: 120 }),
  phone: varchar("phone", { length: 40 }),
  unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tag: varchar("tag", { length: 40 }).notNull().unique(),
    qrToken: varchar("qr_token", { length: 24 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    domain: systemDomainEnum("domain").notNull(),
    unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    locationDetail: varchar("location_detail", { length: 200 }),
    manufacturer: varchar("manufacturer", { length: 80 }),
    model: varchar("model", { length: 120 }),
    serialNumber: varchar("serial_number", { length: 120 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    firmware: varchar("firmware", { length: 80 }),
    criticality: criticalityEnum("criticality").notNull().default("STANDARD"),
    status: assetStatusEnum("status").notNull().default("OPERATIONAL"),
    environment: jsonb("environment").$type<Record<string, string>>().notNull().default({}),
    specs: jsonb("specs").$type<Record<string, string>>().notNull().default({}),
    meterUnit: varchar("meter_unit", { length: 16 }),
    installedAt: date("installed_at"),
    warrantyUntil: date("warranty_until"),
    lastServiceAt: timestamp("last_service_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("assets_domain_idx").on(t.domain),
    index("assets_unit_idx").on(t.unitId),
    index("assets_category_idx").on(t.categoryId),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seq: serial("seq").notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    domain: systemDomainEnum("domain").notNull(),
    issueCode: varchar("issue_code", { length: 64 }).notNull(),
    priority: priorityEnum("priority").notNull(),
    status: ticketStatusEnum("status").notNull().default("OPEN"),
    channel: channelEnum("channel").notNull().default("PORTAL"),
    impactScope: impactScopeEnum("impact_scope").notNull().default("UNIT"),
    safetyHazard: boolean("safety_hazard").notNull().default(false),
    slaTrace: jsonb("sla_trace").$type<string[]>().notNull().default([]),
    priorityOverridden: boolean("priority_overridden").notNull().default(false),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    reporterName: varchar("reporter_name", { length: 160 }),
    reporterContact: varchar("reporter_contact", { length: 160 }),
    reporterUserId: uuid("reporter_user_id").references(() => users.id, { onDelete: "set null" }),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    responseDueAt: timestamp("response_due_at", { withTimezone: true }).notNull(),
    resolutionDueAt: timestamp("resolution_due_at", { withTimezone: true }).notNull(),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    slaPausedAt: timestamp("sla_paused_at", { withTimezone: true }),
    slaPausedMinutes: integer("sla_paused_minutes").notNull().default(0),
    resolutionSummary: text("resolution_summary"),
    externalRef: varchar("external_ref", { length: 120 }),
    publicToken: varchar("public_token", { length: 32 }).notNull().unique(),
    ...timestamps,
  },
  (t) => [
    index("tickets_status_idx").on(t.status),
    index("tickets_priority_idx").on(t.priority),
    index("tickets_assignee_idx").on(t.assigneeId),
    index("tickets_asset_idx").on(t.assetId),
    index("tickets_category_idx").on(t.categoryId),
    index("tickets_created_idx").on(t.createdAt),
    index("tickets_external_idx").on(t.externalRef),
  ],
);

export type NoteMetadata = {
  from?: string;
  to?: string;
  captureType?: string;
  fields?: Record<string, string>;
  sensitiveKeys?: string[];
  [key: string]: unknown;
};

export const ticketNotes = pgTable(
  "ticket_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    authorName: varchar("author_name", { length: 160 }),
    type: noteTypeEnum("type").notNull().default("COMMENT"),
    body: text("body").notNull(),
    metadata: jsonb("metadata").$type<NoteMetadata>().notNull().default({}),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ticket_notes_ticket_idx").on(t.ticketId, t.createdAt)],
);

export const meterReadings = pgTable(
  "meter_readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    value: doublePrecision("value").notNull(),
    readingAt: timestamp("reading_at", { withTimezone: true }).notNull().defaultNow(),
    recordedById: uuid("recorded_by_id").references(() => users.id, { onDelete: "set null" }),
    anomaly: boolean("anomaly").notNull().default(false),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meter_readings_asset_idx").on(t.assetId, t.readingAt)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: varchar("actor_name", { length: 160 }),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 32 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    summary: text("summary").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_entity_idx").on(t.entityType)],
);

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  prefix: varchar("prefix", { length: 24 }).notNull(),
  keyHash: varchar("key_hash", { length: 128 }).notNull().unique(),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type Role = (typeof roleEnum.enumValues)[number];
export type SystemDomain = (typeof systemDomainEnum.enumValues)[number];
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number];
export type Priority = (typeof priorityEnum.enumValues)[number];
export type UnitType = (typeof unitTypeEnum.enumValues)[number];
export type AssetStatus = (typeof assetStatusEnum.enumValues)[number];
export type Criticality = (typeof criticalityEnum.enumValues)[number];
export type Channel = (typeof channelEnum.enumValues)[number];
export type ImpactScope = (typeof impactScopeEnum.enumValues)[number];
export type NoteType = (typeof noteTypeEnum.enumValues)[number];

export type Unit = typeof units.$inferSelect;
export type User = typeof users.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TicketNote = typeof ticketNotes.$inferSelect;
export type MeterReading = typeof meterReadings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
