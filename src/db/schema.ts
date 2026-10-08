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

export const projectStatusEnum = pgEnum("project_status", ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]);

export const ragEnum = pgEnum("rag", ["GREEN", "YELLOW", "RED"]);

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

/* -------------------------------- Projects ------------------------------- */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    sponsor: varchar("sponsor", { length: 160 }),
    projectManager: varchar("project_manager", { length: 160 }),
    department: varchar("department", { length: 120 }),
    startDate: date("start_date"),
    targetEndDate: date("target_end_date"),
    status: projectStatusEnum("status").notNull().default("ACTIVE"),
    rag: ragEnum("rag").notNull().default("GREEN"),
    percentComplete: integer("percent_complete").notNull().default(0),
    budget: doublePrecision("budget").notNull().default(0),
    actualCost: doublePrecision("actual_cost").notNull().default(0),
    nextMilestone: varchar("next_milestone", { length: 200 }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("projects_status_idx").on(t.status), index("projects_rag_idx").on(t.rag), index("projects_start_idx").on(t.startDate)],
);

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
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type Rag = (typeof ragEnum.enumValues)[number];

export type Unit = typeof units.$inferSelect;
export type User = typeof users.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TicketNote = typeof ticketNotes.$inferSelect;
export type MeterReading = typeof meterReadings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Project = typeof projects.$inferSelect;

/* ========================================================================== */
/*                          PMO SYSTEM (Excel clone)                          */
/* ========================================================================== */

export const pmoProjects = pgTable(
  "pmo_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 16 }).notNull().unique(),
    customer: varchar("customer", { length: 200 }),
    name: varchar("name", { length: 200 }).notNull(),
    manager: varchar("manager", { length: 160 }),
    department: varchar("department", { length: 120 }),
    type: varchar("type", { length: 60 }),
    priority: varchar("priority", { length: 20 }).notNull().default("Medium"),
    startDate: date("start_date"),
    baselineEnd: date("baseline_end"),
    forecastEnd: date("forecast_end"),
    actualEnd: date("actual_end"),
    percent: integer("percent").notNull().default(0),
    status: varchar("status", { length: 30 }).notNull().default("Active"),
    rag: varchar("rag", { length: 20 }).notNull().default("Green"),
    totalApproved: doublePrecision("total_approved").notNull().default(0),
    actualCost: doublePrecision("actual_cost").notNull().default(0),
    forecastCost: doublePrecision("forecast_cost").notNull().default(0),
    lastUpdated: date("last_updated"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_projects_code_idx").on(t.code), index("pmo_projects_status_idx").on(t.status)],
);

export const pmoMilestones = pgTable(
  "pmo_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    milestone: varchar("milestone", { length: 200 }).notNull(),
    owner: varchar("owner", { length: 160 }),
    baselineDate: date("baseline_date"),
    forecastDate: date("forecast_date"),
    actualDate: date("actual_date"),
    status: varchar("status", { length: 30 }).notNull().default("Open"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_milestones_project_idx").on(t.projectId)],
);

export const pmoRaid = pgTable(
  "pmo_raid",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    type: varchar("type", { length: 20 }).notNull().default("Risk"),
    description: text("description").notNull(),
    category: varchar("category", { length: 60 }),
    probability: varchar("probability", { length: 20 }),
    impact: varchar("impact", { length: 20 }),
    riskScore: integer("risk_score").notNull().default(0),
    priority: varchar("priority", { length: 20 }).notNull().default("Medium"),
    owner: varchar("owner", { length: 160 }),
    mitigation: text("mitigation"),
    contingency: text("contingency"),
    dueDate: date("due_date"),
    status: varchar("status", { length: 30 }).notNull().default("Open"),
    escalation: varchar("escalation", { length: 120 }),
    resolution: text("resolution"),
    dateRaised: date("date_raised"),
    dateClosed: date("date_closed"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_raid_project_idx").on(t.projectId)],
);

export const pmoActions = pgTable(
  "pmo_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    source: varchar("source", { length: 120 }),
    action: text("action").notNull(),
    owner: varchar("owner", { length: 160 }),
    priority: varchar("priority", { length: 20 }).notNull().default("Medium"),
    dateOpened: date("date_opened"),
    dueDate: date("due_date"),
    status: varchar("status", { length: 30 }).notNull().default("Open"),
    completionDate: date("completion_date"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_actions_project_idx").on(t.projectId)],
);

export const pmoRaci = pgTable("pmo_raci", {
  id: uuid("id").primaryKey().defaultRandom(),
  activity: varchar("activity", { length: 220 }).notNull(),
  sponsor: varchar("sponsor", { length: 10 }),
  pmo: varchar("pmo", { length: 10 }),
  projectManager: varchar("project_manager", { length: 10 }),
  businessOwner: varchar("business_owner", { length: 10 }),
  itLead: varchar("it_lead", { length: 10 }),
  developer: varchar("developer", { length: 10 }),
  finance: varchar("finance", { length: 10 }),
  procurement: varchar("procurement", { length: 10 }),
  qa: varchar("qa", { length: 10 }),
  endUsers: varchar("end_users", { length: 10 }),
  validation: varchar("validation", { length: 120 }),
  notes: text("notes"),
  ...timestamps,
});

export const pmoStakeholders = pgTable(
  "pmo_stakeholders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    role: varchar("role", { length: 120 }),
    department: varchar("department", { length: 120 }),
    influence: varchar("influence", { length: 20 }),
    interest: varchar("interest", { length: 20 }),
    engagement: varchar("engagement", { length: 20 }),
    class: varchar("class", { length: 30 }),
    infoNeeded: text("info_needed"),
    frequency: varchar("frequency", { length: 20 }),
    channel: varchar("channel", { length: 80 }),
    owner: varchar("owner", { length: 160 }),
    strategy: text("strategy"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_stakeholders_name_idx").on(t.name)],
);

export const pmoChanges = pgTable(
  "pmo_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    requestedBy: varchar("requested_by", { length: 160 }),
    requestDate: date("request_date"),
    description: text("description").notNull(),
    reason: text("reason"),
    scopeImpact: text("scope_impact"),
    scheduleImpact: integer("schedule_impact"),
    costImpact: doublePrecision("cost_impact").notNull().default(0),
    riskImpact: text("risk_impact"),
    priority: varchar("priority", { length: 20 }).notNull().default("Medium"),
    impactAssessment: text("impact_assessment"),
    recommendation: text("recommendation"),
    approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("Pending"),
    approvedBy: varchar("approved_by", { length: 160 }),
    approvalDate: date("approval_date"),
    implementationStatus: varchar("implementation_status", { length: 30 }).notNull().default("Not Started"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_changes_project_idx").on(t.projectId)],
);

export const pmoCosts = pgTable(
  "pmo_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    category: varchar("category", { length: 60 }).notNull().default("Other"),
    owner: varchar("owner", { length: 160 }),
    totalApproved: doublePrecision("total_approved").notNull().default(0),
    committed: doublePrecision("committed").notNull().default(0),
    actual: doublePrecision("actual").notNull().default(0),
    forecast: doublePrecision("forecast").notNull().default(0),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_costs_project_idx").on(t.projectId)],
);

export const pmoResources = pgTable(
  "pmo_resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resource: varchar("resource", { length: 160 }).notNull(),
    department: varchar("department", { length: 120 }),
    role: varchar("role", { length: 120 }),
    projectId: uuid("project_id"),
    allocation: doublePrecision("allocation").notNull().default(0),
    startDate: date("start_date"),
    endDate: date("end_date"),
    availability: doublePrecision("availability").notNull().default(100),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_resources_name_idx").on(t.resource)],
);

export const pmoProcurement = pgTable(
  "pmo_procurement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    item: varchar("item", { length: 200 }).notNull(),
    requester: varchar("requester", { length: 160 }),
    supplier: varchar("supplier", { length: 160 }),
    quotation: text("quotation"),
    poNo: varchar("po_no", { length: 60 }),
    totalApproved: doublePrecision("total_approved").notNull().default(0),
    quotedCost: doublePrecision("quoted_cost").notNull().default(0),
    approvedCost: doublePrecision("approved_cost").notNull().default(0),
    orderDate: date("order_date"),
    expectedDelivery: date("expected_delivery"),
    actualDelivery: date("actual_delivery"),
    status: varchar("status", { length: 30 }).notNull().default("Requested"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_procurement_project_idx").on(t.projectId)],
);

export const pmoQuality = pgTable(
  "pmo_quality",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    deliverable: varchar("deliverable", { length: 200 }).notNull(),
    criteria: text("criteria"),
    owner: varchar("owner", { length: 160 }),
    plannedDate: date("planned_date"),
    actualDate: date("actual_date"),
    result: varchar("result", { length: 20 }).notNull().default("Pending"),
    defects: integer("defects").notNull().default(0),
    correctiveAction: text("corrective_action"),
    status: varchar("status", { length: 30 }).notNull().default("Open"),
    evidence: text("evidence"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_quality_project_idx").on(t.projectId)],
);

export const pmoMeetings = pgTable(
  "pmo_meetings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date"),
    projectId: uuid("project_id"),
    meetingType: varchar("meeting_type", { length: 60 }),
    chair: varchar("chair", { length: 160 }),
    attendees: text("attendees"),
    agenda: text("agenda"),
    discussion: text("discussion"),
    decision: text("decision"),
    action: text("action"),
    owner: varchar("owner", { length: 160 }),
    dueDate: date("due_date"),
    status: varchar("status", { length: 30 }).notNull().default("Open"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_meetings_project_idx").on(t.projectId)],
);

export const pmoDecisions = pgTable(
  "pmo_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    decisionDate: date("decision_date"),
    decisionRequired: text("decision_required").notNull(),
    options: text("options"),
    recommendation: text("recommendation"),
    decision: text("decision"),
    maker: varchar("maker", { length: 160 }),
    impact: text("impact"),
    owner: varchar("owner", { length: 160 }),
    dueDate: date("due_date"),
    status: varchar("status", { length: 30 }).notNull().default("Pending"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_decisions_project_idx").on(t.projectId)],
);

export const pmoComms = pgTable("pmo_comms", {
  id: uuid("id").primaryKey().defaultRandom(),
  audience: varchar("audience", { length: 200 }).notNull(),
  info: text("info"),
  owner: varchar("owner", { length: 160 }),
  frequency: varchar("frequency", { length: 20 }),
  format: varchar("format", { length: 60 }),
  channel: varchar("channel", { length: 80 }),
  timing: varchar("timing", { length: 120 }),
  purpose: text("purpose"),
  escalation: text("escalation"),
  notes: text("notes"),
  ...timestamps,
});

export const pmoClosure = pgTable(
  "pmo_closure",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    item: varchar("item", { length: 200 }).notNull(),
    owner: varchar("owner", { length: 160 }),
    dueDate: date("due_date"),
    status: varchar("status", { length: 30 }).notNull().default("Open"),
    evidence: text("evidence"),
    completedDate: date("completed_date"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_closure_project_idx").on(t.projectId)],
);

export const pmoLessons = pgTable(
  "pmo_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    date: date("date"),
    area: varchar("area", { length: 120 }),
    wentWell: text("went_well"),
    wentWrong: text("went_wrong"),
    rootCause: text("root_cause"),
    lesson: text("lesson"),
    recommendation: text("recommendation"),
    owner: varchar("owner", { length: 160 }),
    action: text("action"),
    status: varchar("status", { length: 30 }).notNull().default("Open"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("pmo_lessons_project_idx").on(t.projectId)],
);

export type PmoProject = typeof pmoProjects.$inferSelect;
export type PmoMilestone = typeof pmoMilestones.$inferSelect;
export type PmoRaid = typeof pmoRaid.$inferSelect;
export type PmoAction = typeof pmoActions.$inferSelect;
export type PmoRaci = typeof pmoRaci.$inferSelect;
export type PmoStakeholder = typeof pmoStakeholders.$inferSelect;
export type PmoChange = typeof pmoChanges.$inferSelect;
export type PmoCost = typeof pmoCosts.$inferSelect;
export type PmoResource = typeof pmoResources.$inferSelect;
export type PmoProcurement = typeof pmoProcurement.$inferSelect;
export type PmoQuality = typeof pmoQuality.$inferSelect;
export type PmoMeeting = typeof pmoMeetings.$inferSelect;
export type PmoDecision = typeof pmoDecisions.$inferSelect;
export type PmoComm = typeof pmoComms.$inferSelect;
export type PmoClosure = typeof pmoClosure.$inferSelect;
export type PmoLesson = typeof pmoLessons.$inferSelect;
