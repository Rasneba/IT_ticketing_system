/** Shared documentation content used by the in-app docs and the generated PDFs. */

export const FILE_TREE = `building-service-desk/
├── drizzle/0000_init.sql            # generated DDL (runtime bootstrap fallback)
├── drizzle.config.json
└── src/
    ├── proxy.ts                     # optimistic auth gate (Next.js 16 proxy)
    ├── instrumentation.ts           # schema bootstrap + demo seed on boot
    ├── db/
    │   ├── schema.ts                # enums + Unit, Asset, Ticket, TicketNote, MeterReading…
    │   ├── index.ts                 # pg Pool + Drizzle client
    │   ├── seed-data.ts · seed.ts   # realistic demo dataset + CLI (--reset)
    │   └── bootstrap.ts             # ensureDatabaseReady()
    ├── lib/
    │   ├── sla.ts                   # deterministic SLA engine (classify, timers)
    │   ├── workflow.ts              # ticket lifecycle state machine
    │   ├── domains.ts               # SystemDomain catalog + issue matrix
    │   ├── ticket-service.ts        # create · transition · auto-dispatch
    │   ├── audit-captures.ts        # license-key / encoder capture schemas
    │   ├── sop.ts · blueprint.ts    # SOP library + documentation content
    │   ├── auth.ts · password.ts    # sessions (scrypt + SHA-256 hashed tokens)
    │   ├── queries.ts               # read models & SLA breach SQL
    │   └── pdf/                     # IEEE 830 SRS + blueprint PDF generators
    ├── app/
    │   ├── actions/                 # Server Actions: auth, tickets, assets, admin, public
    │   ├── (app)/                   # authenticated shell with sidebar
    │   │   ├── dashboard/ · tickets/ · tickets/[id]/ (Resolution Workbench)
    │   │   ├── assets/ · assets/labels/ · units/ · meters/
    │   │   └── users/ · settings/ · audit/ · docs/
    │   ├── r/[token]/               # PUBLIC mobile Scan-to-Report view
    │   ├── track/[token]/           # PUBLIC ticket tracking
    │   ├── login/
    │   └── api/ health · v1/tickets · docs/[file]
    └── components/ ui · badges · sidebar · sla-timer · charts · form-controls`;

export const PRISMA_SCHEMA = `// Reference Prisma models (the running app implements the identical
// relational model with Drizzle ORM in src/db/schema.ts).
enum SystemDomain { HVAC PLUMBING ELECTRICAL SUB_METER WATER_PUMP
                    ACCESS_CONTROL LOCK_ENCODER VOIP_PBX POS_PRINTER CCTV NETWORK }
enum Role         { ADMIN MANAGER TECHNICIAN TENANT }
enum TicketStatus { OPEN IN_PROGRESS PENDING_PARTS RESOLVED CLOSED }
enum Priority     { P1 P2 P3 P4 }

model Unit {
  id           String   @id @default(uuid())
  code         String   @unique            // e.g. "4B"
  name         String                      // e.g. "Mado Coffee"
  type         UnitType @default(RESIDENTIAL)
  floor        String                      // e.g. "Ground Floor"
  floorLevel   Int      @default(0)
  occupantName String?
  assets       Asset[]
  tickets      Ticket[]
  users        User[]
}

model Asset {
  id             String       @id @default(uuid())
  tag            String       @unique      // printed on sticker
  qrToken        String       @unique      // unguessable QR URL token
  name           String
  domain         SystemDomain
  unit           Unit?        @relation(fields: [unitId], references: [id], onDelete: SetNull)
  unitId         String?
  locationDetail String?
  ipAddress      String?
  firmware       String?
  criticality    Criticality  @default(STANDARD)
  status         AssetStatus  @default(OPERATIONAL)
  environment    Json         @default("{}")   // public-safe settings
  specs          Json         @default("{}")   // internal technical specs
  tickets        Ticket[]
  readings       MeterReading[]
}

model Ticket {
  id               String       @id @default(uuid())
  seq              Int          @unique @default(autoincrement())  // SR-00042
  title            String
  description      String
  domain           SystemDomain
  issueCode        String
  priority         Priority
  status           TicketStatus @default(OPEN)
  channel          Channel      @default(PORTAL)
  impactScope      ImpactScope  @default(UNIT)
  safetyHazard     Boolean      @default(false)
  slaTrace         Json                        // deterministic decision trace
  asset            Asset?       @relation(fields: [assetId], references: [id], onDelete: SetNull)
  assetId          String?
  unit             Unit?        @relation(fields: [unitId], references: [id], onDelete: SetNull)
  unitId           String?
  assignee         User?        @relation("assignee", fields: [assigneeId], references: [id])
  assigneeId       String?
  responseDueAt    DateTime
  resolutionDueAt  DateTime
  firstResponseAt  DateTime?
  resolvedAt       DateTime?
  slaPausedAt      DateTime?
  slaPausedMinutes Int          @default(0)
  externalRef      String?                     // webhook idempotency key
  publicToken      String       @unique
  notes            TicketNote[]
  @@index([status, priority])
}

model TicketNote {
  id        String   @id @default(uuid())
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  ticketId  String
  authorId  String?
  type      NoteType @default(COMMENT)  // COMMENT STATUS_CHANGE AUDIT_CAPTURE ASSIGNMENT SYSTEM
  body      String
  metadata  Json     @default("{}")     // captureType, fields, sensitiveKeys, from/to
  isPublic  Boolean  @default(false)
  createdAt DateTime @default(now())
}

model MeterReading {
  id           String   @id @default(uuid())
  asset        Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)
  assetId      String
  value        Float                   // cumulative register (kWh / m3)
  readingAt    DateTime @default(now())
  anomaly      Boolean  @default(false)
  recordedById String?
}`;

export const SERVER_ACTIONS: { name: string; file: string; roles: string; description: string }[] = [
  { name: "loginAction / logoutAction", file: "actions/auth.ts", roles: "Anyone", description: "scrypt password check, SHA-256 hashed session token in an httpOnly cookie, audit entry" },
  { name: "createTicketAction", file: "actions/tickets.ts", roles: "All roles", description: "Validates catalog pair, runs classifyTicket(), computes due dates, auto-dispatches, redirects to workbench" },
  { name: "transitionTicketAction", file: "actions/tickets.ts", roles: "Staff", description: "State-machine guard, note requirements, SLA pause/resume, first-response stamp, asset recovery" },
  { name: "addNoteAction", file: "actions/tickets.ts", roles: "All (scoped)", description: "Internal or public comment; tenants limited to own unit's tickets" },
  { name: "addAuditCaptureAction", file: "actions/tickets.ts", roles: "Staff", description: "License key / encoder registration / IP / firmware / part / boot captures; syncs asset IP & firmware" },
  { name: "assignTicketAction", file: "actions/tickets.ts", roles: "Staff", description: "Reassigns with ASSIGNMENT note and audit log" },
  { name: "overridePriorityAction", file: "actions/tickets.ts", roles: "Manager, Admin", description: "Manual override with reason; recomputes due dates and appends to the decision trace" },
  { name: "updateTicketAction / deleteTicketAction", file: "actions/tickets.ts", roles: "Staff / Admin", description: "Edit title & description; hard delete (admin only)" },
  { name: "saveAssetAction / deleteAssetAction", file: "actions/assets.ts", roles: "Manager (create), Staff (edit)", description: "Asset registry CRUD with unique tag, IPv4 validation, key/value environment & specs" },
  { name: "setAssetStatusAction / regenerateQrAction", file: "actions/assets.ts", roles: "Staff / Manager", description: "Status changes and QR re-issue (invalidates old stickers)" },
  { name: "saveUnitAction / deleteUnitAction", file: "actions/admin.ts", roles: "Manager, Admin", description: "Units & zones CRUD" },
  { name: "saveUserAction / toggleUserActiveAction / deleteUserAction", file: "actions/admin.ts", roles: "Admin", description: "Users, roles, technician domain skills, tenant unit linkage" },
  { name: "addReadingAction / deleteReadingAction", file: "actions/admin.ts", roles: "Staff / Manager", description: "Cumulative readings, rollback guard, 2x trailing-average anomaly detection with auto P3 ticket" },
  { name: "createApiKeyAction / revokeApiKeyAction", file: "actions/admin.ts", roles: "Admin", description: "Ingestion API keys (shown once, stored as SHA-256)" },
  { name: "submitPublicReportAction", file: "actions/public.ts", roles: "Anonymous", description: "QR token lookup, honeypot, per-asset rate limit, ticket creation, redirect to tracking page" },
];

export const DATA_DICTIONARY: { table: string; purpose: string; keys: string }[] = [
  { table: "units", purpose: "Apartments, retail units, common areas, plant rooms", keys: "code (unique), name, type, floor, floor_level, occupant_name, contacts" },
  { table: "users", purpose: "Accounts with RBAC role and technician skills", keys: "email (unique), password_hash (scrypt), role, skills (jsonb), unit_id, active" },
  { table: "sessions", purpose: "Server-side sessions", keys: "id = SHA-256(token), user_id, expires_at, user_agent" },
  { table: "assets", purpose: "QR-tagged equipment across all domains", keys: "tag, qr_token (unique), domain, unit_id, ip_address, criticality, status, environment, specs" },
  { table: "tickets", purpose: "Service requests with SLA timers", keys: "seq, domain, issue_code, priority, status, response_due_at, resolution_due_at, sla_paused_at, public_token" },
  { table: "ticket_notes", purpose: "Timeline: comments, transitions, audit captures", keys: "ticket_id, author_id, type, body, metadata (jsonb), is_public" },
  { table: "meter_readings", purpose: "Cumulative sub-meter register values", keys: "asset_id, value, reading_at, anomaly, recorded_by_id" },
  { table: "audit_logs", purpose: "Immutable security & change log", keys: "actor_id, action, entity_type, entity_id, summary, detail" },
  { table: "api_keys", purpose: "Webhook / REST ingestion credentials", keys: "name, prefix, key_hash (SHA-256), last_used_at, revoked_at" },
];

export const API_ENDPOINTS: { method: string; path: string; auth: string; description: string }[] = [
  { method: "GET", path: "/api/health", auth: "None", description: "Liveness + database round-trip" },
  { method: "POST", path: "/api/v1/tickets", auth: "Bearer API key", description: "Ingest a ticket from monitoring / webhooks (idempotent on externalRef)" },
  { method: "GET", path: "/api/v1/tickets", auth: "Bearer API key", description: "List tickets with live SLA state (?status=&priority=&limit=)" },
  { method: "GET", path: "/api/docs/{file}.pdf", auth: "Staff session", description: "Generated SRS, blueprint and SOP handbook PDFs" },
];

export const INGEST_REQUEST = `POST /api/v1/tickets
Authorization: Bearer bsd_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "assetTag": "PBX-VM-01",          // or "qrToken"; optional if "domain" given
  "domain": "VOIP_PBX",             // derived from the asset when omitted
  "issueCode": "SIP_TRUNK_DOWN",    // must exist in the catalog for the domain
  "impactScope": "BUILDING",        // SINGLE | UNIT | FLOOR | BUILDING
  "safetyHazard": false,
  "description": "Trunk carrier-primary UNREACHABLE (503 on outbound)",
  "externalRef": "zabbix:evt-88213", // idempotency key for retries
  "reporterName": "Zabbix Monitoring"
}`;

export const INGEST_RESPONSE = `HTTP/1.1 201 Created
{
  "id": "5f0c1c3e-…",
  "reference": "SR-00029",
  "priority": "P1",
  "status": "OPEN",
  "responseDueAt": "2026-03-01T08:30:00.000Z",
  "resolutionDueAt": "2026-03-01T12:00:00.000Z",
  "slaTrace": ["R1 base rule: SIP_TRUNK_DOWN … = P1", "…"],
  "trackingUrl": "https://desk.example/track/Q7K2…",
  "deduplicated": false
}`;

export const WEBHOOK_EXAMPLES: { source: string; payload: string }[] = [
  {
    source: "ZKTeco / ZKBio CVSecurity device-offline event (via middleware)",
    payload: `{ "assetTag": "ACC-ZK-GYM", "issueCode": "ACCESS_DEVICE_OFFLINE",
  "impactScope": "UNIT", "externalRef": "zkbio:dev-offline:BOCK200360211",
  "description": "Device 192.168.10.23 offline > 5 min", "reporterName": "ZKBio" }`,
  },
  {
    source: "Hikvision NVR video-loss alarm",
    payload: `{ "assetTag": "CCTV-CAM-P03", "issueCode": "CAMERA_OFFLINE",
  "impactScope": "SINGLE", "externalRef": "hik:videoloss:D19",
  "description": "VIDEO LOSS on channel D19", "reporterName": "NVR event webhook" }`,
  },
  {
    source: "Grundfos CU 352 via BMS (Modbus → HTTP)",
    payload: `{ "assetTag": "PMP-BST-01", "issueCode": "PUMP_FAILURE_NO_SUPPLY",
  "impactScope": "BUILDING", "safetyHazard": false,
  "externalRef": "bms:cu352:dry-run:4411", "reporterName": "BMS" }`,
  },
];

export const SLA_JS_LOGIC = `// src/lib/sla.ts — deterministic: same input => same output
export function classifyTicket({ domain, issueCode, impactScope,
                                 safetyHazard, assetCriticality }) {
  const issue = findIssue(domain, issueCode);           // catalog lookup
  let level = LEVEL[issue?.basePriority ?? "P3"];       // R1 base rule
  if (impactScope === "BUILDING" && level > 1) level--; // R2 scope
  if (assetCriticality === "CRITICAL"
      && issue?.serviceAffecting && level > 1) level--; // R3 critical asset
  if (safetyHazard && level > 1) level = 1;             // R4 safety override
  const priority = "P" + level;
  return { priority, ...SLA_POLICY[priority] };         // response/resolution
}

export function computeDueDates(priority, from = new Date()) {
  const p = SLA_POLICY[priority];                       // minutes
  return { responseDueAt:   new Date(+from + p.responseMinutes * 60000),
           resolutionDueAt: new Date(+from + p.resolutionMinutes * 60000) };
}

// Pause / resume while PENDING_PARTS (ticket-service.ts)
if (from === "PENDING_PARTS" && t.slaPausedAt) {
  const pausedMs = now - t.slaPausedAt;
  patch.resolutionDueAt  = new Date(+t.resolutionDueAt + pausedMs);
  patch.slaPausedMinutes = t.slaPausedMinutes + Math.round(pausedMs / 60000);
  patch.slaPausedAt = null;
}

// Timer evaluation (UI + API): AT_RISK when < 25% of the window remains
export function evaluateTimer(start, due, completedAt, now, pausedAt) {
  if (completedAt) return completedAt <= due ? "MET" : "MISSED";
  const remaining = due - (pausedAt ?? now);
  if (remaining < 0) return "BREACHED";
  if (pausedAt) return "PAUSED";
  return remaining < (due - start) * 0.25 ? "AT_RISK" : "ON_TRACK";
}`;
