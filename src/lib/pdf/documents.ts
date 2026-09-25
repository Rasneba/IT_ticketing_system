import type { Criticality, ImpactScope, SystemDomain, TicketStatus } from "@/db/schema";
import { classifyTicket, formatMinutes, PRIORITIES, SLA_POLICY } from "../sla";
import { DOMAIN_GROUPS, DOMAIN_META, DOMAINS, findIssue, IMPACT_SCOPE_META, ISSUE_CATALOG, ROLE_META, ROLES, type DomainGroup } from "../domains";
import { STATUS_META, TRANSITIONS } from "../workflow";
import { CAPTURE_TYPES } from "../audit-captures";
import { SOPS, type Sop } from "../sop";
import {
  API_ENDPOINTS,
  DATA_DICTIONARY,
  FILE_TREE,
  INGEST_REQUEST,
  INGEST_RESPONSE,
  PRISMA_SCHEMA,
  SERVER_ACTIONS,
  SLA_JS_LOGIC,
  WEBHOOK_EXAMPLES,
} from "../blueprint";
import { C, ML, PdfBuilder } from "./builder";

const ORG = "Marina Heights Facility Management";
const SITE = "Marina Heights Residences — mixed-use apartment tower with ground-floor retail (e.g. Mado Coffee, Ground Floor, Unit 4B)";
const STACK = "Next.js App Router (React Server Components, Server Actions), TypeScript, PostgreSQL, Drizzle ORM (Prisma-equivalent model), Tailwind CSS";
const today = () => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());
const REQ_COLS = [
  { header: "ID", width: 15, bold: true },
  { header: "Requirement", width: 69 },
  { header: "Priority", width: 16 },
];

/* ---------------------------------------------------------------------------------------------- */
/*                                           Diagrams                                             */
/* ---------------------------------------------------------------------------------------------- */

type Box = { x: number; top: number; w: number; h: number };

function entity(b: PdfBuilder, x: number, top: number, w: number, name: string, fields: [string, string?][]): Box {
  const headerH = 16;
  const rowH = 9.2;
  const h = headerH + fields.length * rowH + 6;
  b.rect(x, top, w, h, C.white, C.slate, 0.8);
  b.rect(x, top, w, headerH, C.indigo);
  b.textAt(name, x + w / 2, top - 11.5, { size: 8.5, font: b.f.bold, color: C.white, align: "center" });
  fields.forEach(([col, tag], i) => {
    const y = top - headerH - 8 - i * rowH;
    b.textAt(col, x + 6, y, { size: 6.8, font: tag === "PK" ? b.f.monoBold : b.f.mono, color: C.ink });
    if (tag) b.textAt(tag, x + w - 6, y, { size: 6, font: b.f.bold, color: tag === "PK" ? C.amber : tag === "FK" ? C.indigo : C.green, align: "right" });
  });
  return { x, top, w, h };
}

function card(b: PdfBuilder, x1: number, y1: number, x2: number, y2: number, a: string, z: string) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const off = 9;
  b.textAt(a, x1 + Math.cos(ang) * off + (Math.abs(Math.sin(ang)) > 0.7 ? 5 : 0), y1 + Math.sin(ang) * off + (Math.abs(Math.sin(ang)) > 0.7 ? 0 : 3), { size: 7, font: b.f.bold, color: C.indigo });
  b.textAt(z, x2 - Math.cos(ang) * (off + 4) + (Math.abs(Math.sin(ang)) > 0.7 ? 5 : 0), y2 - Math.sin(ang) * off + (Math.abs(Math.sin(ang)) > 0.7 ? 0 : 3), { size: 7, font: b.f.bold, color: C.indigo });
}

function drawErDiagram(b: PdfBuilder) {
  b.ensure(520);
  const Y = b.y - 12;
  const w = 140;
  const gap = (b.width - 3 * w) / 2;
  const c0 = ML;
  const c1 = ML + w + gap;
  const c2 = ML + 2 * (w + gap);
  const r2 = Y - 185;
  const r3 = Y - 400;

  entity(b, c0, Y, w, "units", [["id", "PK"], ["code", "UQ"], ["name"], ["type"], ["floor"], ["floor_level"], ["occupant_name"]]);
  const asset = entity(b, c1, Y, w, "assets", [["id", "PK"], ["tag", "UQ"], ["qr_token", "UQ"], ["name"], ["domain"], ["unit_id", "FK"], ["ip_address"], ["firmware"], ["criticality"], ["status"], ["environment"], ["specs"]]);
  entity(b, c2, Y, w, "meter_readings", [["id", "PK"], ["asset_id", "FK"], ["value"], ["reading_at"], ["anomaly"], ["recorded_by_id", "FK"]]);
  const user = entity(b, c0, r2, w, "users", [["id", "PK"], ["email", "UQ"], ["password_hash"], ["role"], ["skills"], ["unit_id", "FK"], ["active"]]);
  const ticket = entity(b, c1, r2, w, "tickets", [["id", "PK"], ["seq", "UQ"], ["domain"], ["issue_code"], ["priority"], ["status"], ["asset_id", "FK"], ["unit_id", "FK"], ["assignee_id", "FK"], ["response_due_at"], ["resolution_due_at"], ["sla_paused_at"], ["public_token", "UQ"]]);
  const note = entity(b, c2, r2, w, "ticket_notes", [["id", "PK"], ["ticket_id", "FK"], ["author_id", "FK"], ["type"], ["body"], ["metadata"], ["is_public"]]);
  entity(b, c0, r3, w, "sessions", [["id", "PK"], ["user_id", "FK"], ["expires_at"]]);
  entity(b, c1, r3, w, "audit_logs", [["id", "PK"], ["actor_id", "FK"], ["action"], ["entity_type"], ["entity_id"], ["summary"]]);
  entity(b, c2, r3, w, "api_keys", [["id", "PK"], ["name"], ["prefix"], ["key_hash", "UQ"], ["created_by_id", "FK"], ["revoked_at"]]);

  const rel = (x1: number, y1: number, x2: number, y2: number, label?: string, lx?: number, ly?: number) => {
    b.line(x1, y1, x2, y2, C.slate, 0.9);
    card(b, x1, y1, x2, y2, "1", "N");
    if (label) b.textAt(label, lx ?? (x1 + x2) / 2, ly ?? (y1 + y2) / 2 + 3, { size: 6.2, font: b.f.italic, color: C.muted, align: "center" });
  };
  rel(c0 + w, Y - 40, c1, Y - 40, "unit_id", undefined, Y - 36);
  rel(c1 + w, Y - 40, c2, Y - 40, "asset_id", undefined, Y - 36);
  rel(c1 + w / 2, asset.top - asset.h, c1 + w / 2, r2, "asset_id", c1 + w / 2 + 24, (asset.top - asset.h + r2) / 2);
  rel(c0 + w / 2, Y - 86.4, c0 + w / 2, r2, "tenant unit", c0 + w / 2 + 26, (Y - 86.4 + r2) / 2);
  rel(c0 + 120, Y - 86.4, c1 + 20, r2, "unit_id", c0 + w + 14, Y - 140);
  rel(c0 + w, r2 - 30, c1, r2 - 30, "assignee", undefined, r2 - 26);
  rel(c1 + w, r2 - 30, c2, r2 - 30, "ticket_id", undefined, r2 - 26);
  // users -> ticket_notes (author) routed below tickets
  const routeY = ticket.top - ticket.h - 18;
  b.line(c0 + 100, user.top - user.h, c0 + 100, routeY);
  b.line(c0 + 100, routeY, c2 + w / 2, routeY);
  b.line(c2 + w / 2, routeY, c2 + w / 2, note.top - note.h);
  b.textAt("1", c0 + 104, user.top - user.h - 10, { size: 7, font: b.f.bold, color: C.indigo });
  b.textAt("N", c2 + w / 2 + 4, note.top - note.h - 10, { size: 7, font: b.f.bold, color: C.indigo });
  b.textAt("author_id", (c1 + c2 + w) / 2, routeY + 3, { size: 6.2, font: b.f.italic, color: C.muted, align: "center" });
  rel(c0 + 40, user.top - user.h, c0 + 40, r3, "user_id", c0 + 60, (user.top - user.h + r3) / 2);
  rel(c0 + 125, user.top - user.h, c1 + 30, r3, "actor_id", c1 + 12, r3 + 34);

  b.y = r3 - 104;
  b.textAt("Legend:  PK primary key  ·  FK foreign key  ·  UQ unique  ·  1 — N one-to-many (crow's-foot side = N)", ML, b.y, { size: 7.5, color: C.muted });
  b.y -= 18;
}

const TRANSITION_IDS: [TicketStatus, TicketStatus, string][] = [
  ["OPEN", "IN_PROGRESS", "T1"],
  ["OPEN", "CLOSED", "T2"],
  ["IN_PROGRESS", "PENDING_PARTS", "T3"],
  ["IN_PROGRESS", "RESOLVED", "T4"],
  ["IN_PROGRESS", "OPEN", "T5"],
  ["PENDING_PARTS", "IN_PROGRESS", "T6"],
  ["PENDING_PARTS", "RESOLVED", "T7"],
  ["RESOLVED", "CLOSED", "T8"],
  ["RESOLVED", "IN_PROGRESS", "T9"],
  ["CLOSED", "OPEN", "T10"],
];

const SIDE_EFFECTS: Record<string, string> = {
  "OPEN>IN_PROGRESS": "Stamps firstResponseAt (response SLA met or missed); assigns the actor if unassigned",
  "OPEN>CLOSED": "Cancellation; SLA marked N/A; closedAt stamped",
  "IN_PROGRESS>PENDING_PARTS": "Pauses the resolution clock (slaPausedAt = now)",
  "IN_PROGRESS>RESOLVED": "Stamps resolvedAt; stores resolution summary; asset set OPERATIONAL when no other active tickets",
  "IN_PROGRESS>OPEN": "Returns the ticket to the dispatch queue",
  "PENDING_PARTS>IN_PROGRESS": "Resumes the clock: resolutionDueAt += paused duration; slaPausedMinutes accumulated",
  "PENDING_PARTS>RESOLVED": "Resumes then stops the clock; stamps resolvedAt; asset recovery",
  "RESOLVED>CLOSED": "Archives the ticket; closedAt stamped",
  "RESOLVED>IN_PROGRESS": "Reopen: clears resolvedAt and restarts the resolution SLA from now",
  "CLOSED>OPEN": "Manager reopen: clears resolvedAt / closedAt; restarts the resolution SLA",
};

function drawStateDiagram(b: PdfBuilder) {
  b.ensure(300);
  const top = b.y - 8;
  const w = 72;
  const h = 36;
  const gap = (b.width - 5 * w) / 4;
  const cy = top - 118;
  const states: TicketStatus[] = ["OPEN", "IN_PROGRESS", "PENDING_PARTS", "RESOLVED", "CLOSED"];
  const colors = [C.sky, C.violet, C.amber, C.green, C.slate];
  const xs = states.map((_, i) => ML + i * (w + gap));
  const cx = (i: number) => xs[i] + w / 2;
  const boxTop = cy + h / 2;
  const boxBottom = cy - h / 2;

  states.forEach((s, i) => {
    b.rect(xs[i], boxTop, w, h, C.white, colors[i], 1.4);
    b.rect(xs[i], boxTop, w, 4, colors[i]);
    b.textAt(STATUS_META[s].label.toUpperCase(), cx(i), cy - 1, { size: 7, font: b.f.bold, color: C.ink, align: "center" });
    b.textAt(s === "PENDING_PARTS" ? "clock paused" : s === "RESOLVED" || s === "CLOSED" ? "clock stopped" : "clock running", cx(i), cy - 11, { size: 5.8, font: b.f.italic, color: C.muted, align: "center" });
  });
  const straight = (i: number, label: string) => {
    b.arrow(xs[i] + w, cy, xs[i + 1] - 1, cy, C.ink, 1);
    b.textAt(label, (xs[i] + w + xs[i + 1]) / 2, cy + 4, { size: 6.5, font: b.f.bold, color: C.indigo, align: "center" });
  };
  straight(0, "T1");
  straight(1, "T3");
  straight(2, "T7");
  straight(3, "T8");
  const above = (from: number, fromOff: number, to: number, toOff: number, height: number, label: string) => {
    const x1 = cx(from) + fromOff;
    const x2 = cx(to) + toOff;
    b.curveArrow(x1, boxTop, (x1 + x2) / 2, boxTop + height * 2, x2, boxTop + 1, C.slate, 0.9);
    b.textAt(label, (x1 + x2) / 2, boxTop + height + 3, { size: 6.5, font: b.f.bold, color: C.indigo, align: "center" });
  };
  const below = (from: number, fromOff: number, to: number, toOff: number, depth: number, label: string) => {
    const x1 = cx(from) + fromOff;
    const x2 = cx(to) + toOff;
    b.curveArrow(x1, boxBottom, (x1 + x2) / 2, boxBottom - depth * 2, x2, boxBottom - 1, C.slate, 0.9);
    b.textAt(label, (x1 + x2) / 2, boxBottom - depth - 9, { size: 6.5, font: b.f.bold, color: C.indigo, align: "center" });
  };
  above(1, -12, 0, 12, 22, "T5");
  above(2, -12, 1, 12, 22, "T6");
  above(3, 0, 1, 26, 48, "T9");
  above(4, 0, 0, -22, 74, "T10");
  below(1, 0, 3, -10, 28, "T4");
  below(0, 0, 4, 0, 56, "T2");
  b.y = cy - 108;
}

/* ---------------------------------------------------------------------------------------------- */
/*                                         Shared sections                                        */
/* ---------------------------------------------------------------------------------------------- */

function slaMatrixTable(b: PdfBuilder) {
  b.table(
    [
      { header: "Priority", width: 13, bold: true },
      { header: "Response", width: 12 },
      { header: "Resolution", width: 12 },
      { header: "Definition", width: 30 },
      { header: "Examples", width: 33 },
    ],
    PRIORITIES.map((p) => [
      `${p} ${SLA_POLICY[p].label}`,
      formatMinutes(SLA_POLICY[p].responseMinutes),
      formatMinutes(SLA_POLICY[p].resolutionMinutes),
      SLA_POLICY[p].summary,
      SLA_POLICY[p].examples.join("; "),
    ]),
  );
}

function issueCatalogTables(b: PdfBuilder) {
  (Object.keys(DOMAIN_GROUPS) as DomainGroup[]).forEach((g) => {
    b.h3(DOMAIN_GROUPS[g].label);
    const rows: string[][] = [];
    DOMAINS.filter((d) => DOMAIN_META[d].group === g).forEach((d) =>
      ISSUE_CATALOG[d].forEach((i) => rows.push([DOMAIN_META[d].short, i.code, i.label, i.basePriority, i.serviceAffecting ? "Yes" : "No"])),
    );
    b.table(
      [
        { header: "Domain", width: 15 },
        { header: "Issue code", width: 27, mono: true },
        { header: "Label", width: 38 },
        { header: "Base", width: 8, bold: true },
        { header: "Svc-affecting", width: 12 },
      ],
      rows,
      { size: 7.4 },
    );
  });
}

function workedExamples(b: PdfBuilder) {
  const cases: { domain: SystemDomain; issue: string; scope: ImpactScope; crit: Criticality; safety?: boolean }[] = [
    { domain: "POS_PRINTER", issue: "THERMAL_PRINTER_FAIL", scope: "SINGLE", crit: "HIGH" },
    { domain: "ACCESS_CONTROL", issue: "MAIN_ENTRANCE_LOCK_FAILURE", scope: "BUILDING", crit: "CRITICAL" },
    { domain: "PLUMBING", issue: "LOCALIZED_LEAK", scope: "UNIT", crit: "STANDARD", safety: true },
    { domain: "NETWORK", issue: "UNIT_NETWORK_DOWN", scope: "BUILDING", crit: "CRITICAL" },
    { domain: "WATER_PUMP", issue: "PUMP_LOW_PRESSURE", scope: "FLOOR", crit: "CRITICAL" },
    { domain: "CCTV", issue: "CAMERA_OFFLINE", scope: "BUILDING", crit: "STANDARD" },
    { domain: "HVAC", issue: "HVAC_TEMP_ADJUST", scope: "UNIT", crit: "STANDARD" },
    { domain: "SUB_METER", issue: "METER_BILLING_INQUIRY", scope: "SINGLE", crit: "STANDARD" },
  ];
  b.table(
    [
      { header: "Input (domain / issue / scope / criticality / safety)", width: 46 },
      { header: "Rules fired", width: 38 },
      { header: "Result", width: 16, bold: true },
    ],
    cases.map((c) => {
      const r = classifyTicket({ domain: c.domain, issueCode: c.issue, impactScope: c.scope, assetCriticality: c.crit, safetyHazard: c.safety });
      const fired = r.trace.filter((t) => !t.includes("no change") && !t.startsWith("Result")).map((t) => t.split(":")[0]).join(", ");
      return [
        `${DOMAIN_META[c.domain].short} / ${c.issue} / ${c.scope} / ${c.crit}${c.safety ? " / SAFETY" : ""}`,
        fired || "R1",
        `${r.basePriority} -> ${r.priority} (${formatMinutes(r.responseMinutes)} / ${formatMinutes(r.resolutionMinutes)})`,
      ];
    }),
  );
}

function renderSop(b: PdfBuilder, sop: Sop, detailed: boolean) {
  b.h2(`${sop.id} — ${sop.title}`);
  b.p(sop.summary);
  b.table(
    [
      { header: "Domains", width: 25 },
      { header: "Trigger issue codes", width: 45 },
      { header: "Est. time", width: 12 },
      { header: "Performed by", width: 18 },
    ],
    [[sop.domains.map((d) => DOMAIN_META[d].short).join(", "), sop.issueCodes.join(", "), `${sop.estimatedMinutes} min`, sop.audience]],
    { size: 7.4 },
  );
  if (detailed) {
    b.h3("Tools & access");
    b.bullets(sop.tools, { size: 8.8 });
    b.callout(sop.safety.join("  •  "), "warn", "Safety & compliance");
  }
  b.table(
    [
      { header: "#", width: 5, bold: true },
      { header: "Action", width: 20, bold: true },
      { header: "Procedure / command", width: 50 },
      { header: "Expected result", width: 25 },
    ],
    sop.steps.map((s, i) => [String(i + 1), s.action, s.command ? `${s.detail}\n$ ${s.command.split("\n").join("\n$ ")}` : s.detail, s.expected]),
    { size: 7.3 },
  );
  if (detailed) {
    b.h3("Verification");
    b.bullets(sop.verification, { size: 8.8 });
    b.h3("Escalation");
    b.bullets(sop.escalation, { size: 8.8 });
    b.p(`Workbench captures: ${sop.captures.map((c) => CAPTURE_TYPES[c]?.label ?? c).join(", ")}.`, { size: 8.8, italic: true });
  }
}

/* ---------------------------------------------------------------------------------------------- */
/*                                              SRS                                               */
/* ---------------------------------------------------------------------------------------------- */

export async function buildSrsPdf() {
  const b = await PdfBuilder.create({
    title: "Software Requirements Specification — Building Service Desk",
    short: "SRS · Building Service Desk",
    docId: "BSD-SRS-001 v1.0",
    classification: `Internal — ${ORG}`,
    subject: "IEEE 830-compliant Software Requirements Specification",
  });
  b.titlePage({
    kicker: "IEEE Std 830-1998 · Software Requirements Specification",
    title: "Building Service Desk — Integrated Multi-Domain Maintenance Portal",
    subtitle:
      "Single management portal for physical property infrastructure and IT/security hardware, with QR Scan-to-Report intake and a deterministic SLA engine.",
    meta: [
      ["Document ID", "BSD-SRS-001"],
      ["Version", "1.0 — Approved for build"],
      ["Date", today()],
      ["Site", SITE],
      ["Prepared by", `${ORG} · IT & Systems`],
      ["Technology stack", STACK],
      ["File", "srs_building_service_desk.pdf"],
    ],
    footer: "Generated on demand from the application's source-of-truth modules (SLA engine, workflow, catalog, schema).",
  });

  b.h1("Document control");
  b.table(
    [
      { header: "Version", width: 12, bold: true },
      { header: "Date", width: 20 },
      { header: "Author", width: 24 },
      { header: "Change summary", width: 44 },
    ],
    [
      ["0.1", "Workshop", "Facility IT", "Initial draft from operations workshop and incident history review"],
      ["0.9", "Review", "Property Manager", "SLA matrix and QR intake validated with retail tenants and residents"],
      ["1.0", today(), "Facility Director", "Approved for build; security & compliance NFRs and ER model finalised"],
    ],
  );
  b.h2("Approvals");
  b.table(
    [
      { header: "Role", width: 30, bold: true },
      { header: "Name", width: 30 },
      { header: "Responsibility", width: 40 },
    ],
    [
      ["Facility Director (sponsor)", "Sara Al-Mansouri", "Scope, budget and SLA policy ownership"],
      ["Property Manager", "Omar Haddad", "Dispatch rules, tenant communication, overrides"],
      ["IT & Security Engineer", "Rajesh Kumar", "Security NFRs, integrations, SOP accuracy"],
    ],
  );

  b.h1("1. Introduction");
  b.h2("1.1 Purpose");
  b.p(
    "This Software Requirements Specification (SRS) defines the functional and non-functional requirements of the Building Service Desk (BSD), a web application that consolidates maintenance and support for a mixed-use apartment building into one portal. It is written for the facility management team, field technicians, the development team, and auditors who verify security and compliance controls.",
  );
  b.h2("1.2 Scope");
  b.p(
    "BSD covers the complete service lifecycle — intake, triage, dispatch, resolution and closure — for two infrastructure families that are traditionally managed in separate tools:",
  );
  b.bullets([
    "Physical infrastructure: HVAC (chillers, AHUs, FCUs, split and VRF units), plumbing, electrical distribution and generators, tenant electricity / water sub-meters, and booster / transfer / sump pumps.",
    "IT & security hardware: ZKTeco biometric access control, smart-card lock encoders (proUSB / eLock), FreePBX / Asterisk VoIP running on Hyper-V, POS terminals and thermal printers, CCTV cameras and NVR, core network and workstations.",
  ]);
  b.p(
    "In scope: asset and unit registry with QR stickers, unauthenticated Scan-to-Report intake, deterministic SLA classification with live timers, the Technician Resolution Workbench with technical audit captures, sub-meter readings with anomaly detection, a REST/webhook ingestion API, dashboards, SOP library and generated documentation. Out of scope: billing and invoicing, procurement/purchase orders, payroll, and direct device control (e.g. remotely opening doors).",
  );
  b.h2("1.3 Definitions, acronyms and abbreviations");
  b.table(
    [
      { header: "Term", width: 22, bold: true },
      { header: "Definition", width: 78 },
    ],
    [
      ["SLA", "Service Level Agreement — response and resolution time targets per priority."],
      ["P1–P4", "Priority levels: Urgent (30 min), High (2 h), Normal (8 h), Low (24 h) response targets."],
      ["Response", "Time from ticket creation to first technician engagement (IN_PROGRESS, PENDING_PARTS or RESOLVED)."],
      ["Resolution", "Time from creation to RESOLVED, excluding time spent in PENDING_PARTS."],
      ["Asset", "Any QR-tagged piece of equipment registered in BSD."],
      ["Unit / zone", "An apartment, retail unit, common area or technical room (e.g. Mado Coffee, Unit 4B)."],
      ["SystemDomain", "Enumeration of the 11 technical domains (HVAC … NETWORK)."],
      ["QR token", "Random, unguessable token encoded in an asset sticker URL (/r/{token})."],
      ["Audit capture", "Structured technical record (license key, encoder registration, IP change, firmware, part, boot recovery)."],
      ["ZKTeco / ZKBio", "Biometric access-control terminals and their management platform (ZKBio CVSecurity)."],
      ["proUSB / eLock", "Hotel-style smart-card lock management software and USB card encoders."],
      ["FreePBX / Asterisk", "Open-source IP-PBX stack, here virtualised on Microsoft Hyper-V."],
      ["GRUB", "Linux boot loader; boot failures are recovered per SOP-PBX-03."],
      ["NVR", "Network Video Recorder for the CCTV system."],
      ["RBAC", "Role-Based Access Control (Administrator, Property Manager, Field Technician, Tenant)."],
      ["RSC", "React Server Components — server-rendered UI in the Next.js App Router."],
      ["SOP", "Standard Operating Procedure — step-by-step field diagnostic workflow."],
    ],
  );
  b.h2("1.4 References");
  b.bullets([
    "IEEE Std 830-1998, Recommended Practice for Software Requirements Specifications.",
    "ISO/IEC 27001:2022 — Information security management systems (control objectives for access, logging, backup).",
    "OWASP Application Security Verification Standard (ASVS) 4.0.3, Level 2.",
    "UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (PDPL) and EU GDPR principles.",
    "WCAG 2.1 Level AA accessibility guidelines.",
    "Vendor documentation: ZKTeco terminals & inBio controllers, Epson TM-series printers, Sangoma FreePBX, Microsoft Hyper-V, Grundfos Hydro MPC.",
    "Companion documents: BSD-TMB-002 Ticket Management Blueprint; BSD-OPS-003 Integrated Operations SOP & Schema Blueprint.",
  ]);
  b.h2("1.5 Overview");
  b.p(
    "Section 2 describes the product context, users and constraints. Section 3 specifies external interfaces, system features with uniquely identified functional requirements, performance, database, design constraints and software system attributes including security and compliance. Appendices contain the ER diagram, the ticket lifecycle and a requirements traceability matrix.",
  );

  b.h1("2. Overall description");
  b.h2("2.1 Product perspective");
  b.p(
    "BSD is a self-contained web application (Next.js App Router) backed by PostgreSQL. It replaces spreadsheets, WhatsApp groups and vendor-specific portals with one system of record. It integrates with existing building systems through a REST/webhook ingestion API (monitoring such as Zabbix, ZKBio device events, NVR alarms, BMS alerts) and with people through QR stickers, a responsive staff portal and public tracking pages.",
  );
  b.h2("2.2 Product functions");
  b.bullets([
    "Integrated multi-domain asset & unit registry with printable QR stickers.",
    "Frictionless QR Scan-to-Report intake with pre-populated asset metadata, exact location, environment settings and target domain — no tenant login.",
    "Deterministic SLA engine: priority matrix, response / resolution timers, pause on PENDING_PARTS, breach and at-risk detection.",
    "Automatic dispatch to the least-loaded technician holding the domain skill.",
    "Technician Resolution Workbench: live operational metadata grid, state-machine transitions, technical audit logging for license key and encoder registration captures, instant revalidation.",
    "Sub-meter readings with 2x trailing-average anomaly detection and automatic tickets.",
    "Dashboards, SLA watchlist, technician workload, audit log, SOP library and generated PDFs.",
  ]);
  b.h2("2.3 User classes and characteristics");
  b.table(
    [
      { header: "User class", width: 22, bold: true },
      { header: "Characteristics", width: 43 },
      { header: "Key permissions", width: 35 },
    ],
    [
      ...ROLES.map((r) => [
        ROLE_META[r].label,
        r === "ADMIN"
          ? "Facility Director / IT administrator; occasional, high-privilege use."
          : r === "MANAGER"
            ? "Property manager on desktop; daily triage, tenant liaison."
            : r === "TECHNICIAN"
              ? "Field engineers on mobile; MEP, electrical, IT & low-current skills."
              : "Residents and retail tenants; infrequent, mobile-first.",
        ROLE_META[r].description,
      ]),
      ["Public reporter", "Anyone scanning a sticker (staff, visitors, shop employees).", "Submit a report for that asset; view its tracking page"],
      ["Integration client", "Monitoring / middleware using an API key.", "Create and list tickets via REST"],
    ],
  );
  b.h2("2.4 Operating environment");
  b.bullets([
    "Server: Node.js 20+ runtime hosting Next.js (App Router); PostgreSQL 14+; Linux container or VM behind a TLS-terminating reverse proxy.",
    "Clients: current Chrome, Edge, Safari and Firefox; iOS 15+ and Android 10+ camera apps for QR scanning.",
    "Network: building LAN with VLAN segmentation (Access 10, Voice 20, POS 30, CCTV 40, Office 50); internet access for public pages.",
  ]);
  b.h2("2.5 Design and implementation constraints");
  b.bullets([
    `Mandated stack: ${STACK}.`,
    "Database enums: SystemDomain, Role, TicketStatus, Priority (plus UnitType, AssetStatus, Criticality, Channel, ImpactScope, NoteType).",
    "Core models: Unit, Asset, Ticket, TicketNote, MeterReading (plus User, Session, AuditLog, ApiKey).",
    "All mutations are Server Actions or authenticated route handlers; no client-side database access.",
    "The SLA matrix and state machine are code-reviewed constants, not user-editable settings, to guarantee determinism and auditability.",
  ]);
  b.h2("2.6 User documentation");
  b.bullets([
    "In-app SOP library (8 procedures) linked from tickets and assets.",
    "This SRS, the Ticket Management Blueprint and the Operations SOP & Schema Blueprint, generated as PDFs.",
    "Contextual help: SLA decision trace, empty states and inline hints.",
  ]);
  b.h2("2.7 Assumptions and dependencies");
  b.bullets([
    "Assets are physically tagged with the printed QR stickers and stickers are replaced when damaged.",
    "Technicians have smartphones with mobile data or building Wi-Fi.",
    "Monitoring systems can emit HTTP requests (directly or via middleware) for API ingestion.",
    "Vendor escalation contacts (lock vendor, ZKTeco partner, carrier NOC, pump vendor) are maintained by management.",
  ]);

  b.h1("3. Specific requirements");
  b.h2("3.1 External interface requirements");
  b.h3("3.1.1 User interfaces");
  b.bullets([
    "Responsive staff portal with sidebar navigation (collapsible drawer below 1024 px), dashboard, tables that degrade to cards on mobile.",
    "Mobile-first public pages (/r/{token}, /track/{token}) with large touch targets and no login.",
    "Consistent status, priority and domain colour coding; skeleton loading states; empty states with next actions; toast feedback.",
  ]);
  b.h3("3.1.2 Hardware interfaces");
  b.table(
    [
      { header: "Device family", width: 24, bold: true },
      { header: "Interface", width: 30 },
      { header: "BSD integration", width: 46 },
    ],
    [
      ["ZKTeco terminals / inBio", "TCP 4370, ZKBio CVSecurity", "Registry (IP, firmware), webhook events, IP configuration captures (SOP-ACC-02)"],
      ["proUSB / eLock encoders", "USB HID / serial on reception PC", "Encoder registration captures, database repair SOP (SOP-LCK-01)"],
      ["FreePBX / Asterisk on Hyper-V", "SIP/PJSIP, SSH, PowerShell", "Monitoring webhooks, boot recovery & license captures (SOP-PBX-03)"],
      ["POS & thermal printers", "Ethernet, TCP 9100 RAW", "IP mapping captures (SOP-POS-04), QR intake by shop staff"],
      ["CCTV cameras / NVR", "ONVIF / ISAPI, HTTP alarms", "Video-loss webhooks, part replacement captures (SOP-CCTV-08)"],
      ["Sub-meters", "Modbus RTU to BMS, manual reads", "Meter readings, anomaly detection (SOP-MTR-07)"],
      ["Booster pumps", "Grundfos CU 352 via BMS", "Alarm webhooks, pump failure SOP (SOP-PMP-06)"],
    ],
  );
  b.h3("3.1.3 Software interfaces");
  b.bullets([
    "PostgreSQL via node-postgres connection pool; Drizzle ORM query builder (parameterised SQL).",
    "REST API: POST/GET /api/v1/tickets (JSON, Bearer API key); GET /api/health; GET /api/docs/{file}.pdf.",
    "QR generation (SVG) and PDF generation performed server-side without external services.",
  ]);
  b.h3("3.1.4 Communications interfaces");
  b.bullets([
    "HTTPS (TLS 1.2+) for all browser and API traffic; HTTP/2 via reverse proxy.",
    "Session cookie: httpOnly, SameSite=Lax, Secure when served over HTTPS.",
  ]);

  b.h2("3.2 System features");
  const feature = (title: string, desc: string, stim: string, reqs: [string, string, string][]) => {
    b.h3(title);
    b.p(desc);
    b.p(`Stimulus / response: ${stim}`, { italic: true, size: 9 });
    b.table(REQ_COLS, reqs);
  };
  feature(
    "3.2.1 Authentication & role-based access control",
    "Secure sign-in with server-side sessions and four roles. Priority: High.",
    "User submits credentials → system verifies, creates session, routes to the role-appropriate dashboard.",
    [
      ["FR-AUTH-01", "Authenticate with email and password; passwords stored with scrypt (16-byte random salt, 64-byte key).", "Must"],
      ["FR-AUTH-02", "Sessions use a 256-bit random token in an httpOnly SameSite=Lax cookie; only its SHA-256 digest is persisted.", "Must"],
      ["FR-AUTH-03", "Sessions expire after 7 days and are destroyed on sign-out.", "Must"],
      ["FR-AUTH-04", "Enforce RBAC on every page, route handler and Server Action (never client-side only).", "Must"],
      ["FR-AUTH-05", "Tenants only access tickets they reported or that belong to their unit, and only public notes.", "Must"],
      ["FR-AUTH-06", "Deactivated users lose access immediately, including existing sessions.", "Must"],
      ["FR-AUTH-07", "Record sign-in and sign-out events in the audit log.", "Should"],
    ],
  );
  feature(
    "3.2.2 Integrated multi-domain asset & unit registry",
    "One registry for physical infrastructure and IT/security hardware. Priority: High.",
    "Manager registers an asset → system validates, assigns a unique QR token and exposes a printable sticker.",
    [
      ["FR-AST-01", "Register assets across 11 SystemDomains grouped as Physical Infrastructure and IT & Security Hardware.", "Must"],
      ["FR-AST-02", "Each asset has a unique tag and a unique, unguessable QR token (10 chars, 32-symbol alphabet).", "Must"],
      ["FR-AST-03", "Capture manufacturer, model, serial, IPv4 address (validated), firmware, criticality, status, install and warranty dates.", "Must"],
      ["FR-AST-04", "Keep public-safe environment settings separate from internal technical specs.", "Must"],
      ["FR-AST-05", "Produce printable QR sticker sheets and per-asset SVG downloads.", "Must"],
      ["FR-AST-06", "Re-issuing a QR code invalidates previously printed stickers.", "Should"],
      ["FR-AST-07", "P1 service-affecting faults set the asset DOWN, P2 DEGRADED; resolution restores OPERATIONAL when no active tickets remain.", "Should"],
      ["FR-AST-08", "Maintain units (residential, commercial, common area, technical) with floor, occupant and contacts.", "Must"],
    ],
  );
  feature(
    "3.2.3 Frictionless QR Scan-to-Report intake",
    "Unauthenticated reporting from any smartphone camera. Priority: High.",
    "Reporter scans sticker → page opens pre-filled → reporter picks the issue and submits → ticket created, reporter sees live tracking page.",
    [
      ["FR-QR-01", "Scanning a sticker opens /r/{qrToken} without authentication.", "Must"],
      ["FR-QR-02", "Pre-populate asset name, tag, exact location (e.g. 'Mado Coffee - Ground Floor, Unit 4B'), environment settings and target domain.", "Must"],
      ["FR-QR-03", "Reporter selects the issue type from the domain catalog, the affected scope and an optional safety-hazard flag.", "Must"],
      ["FR-QR-04", "Display the expected response time computed by the SLA engine before submission.", "Should"],
      ["FR-QR-05", "Show active tickets on the same asset as a 'known issue' banner to reduce duplicates.", "Should"],
      ["FR-QR-06", "Require name and phone/email; enforce honeypot and per-asset rate limit (5 reports / 10 min).", "Must"],
      ["FR-QR-07", "Redirect to a public tracking page with live status, SLA timers and public updates.", "Must"],
      ["FR-QR-08", "Never expose IP addresses, serials, specs or internal notes on public pages.", "Must"],
    ],
  );
  feature(
    "3.2.4 Deterministic SLA engine",
    "Automated priority matrix and response / resolution timers. Priority: High.",
    "Ticket created (any channel) → engine classifies, stores decision trace and due dates → timers update live.",
    [
      ["FR-SLA-01", "Compute priority deterministically from (domain, issue code, impact scope, asset criticality, safety flag).", "Must"],
      ["FR-SLA-02", "Apply rules in fixed order: R1 catalog base; R2 BUILDING scope escalates one level; R3 CRITICAL asset with service-affecting fault escalates one level; R4 safety hazard forces P1.", "Must"],
      ["FR-SLA-03", "Targets: P1 30 min / 4 h, P2 2 h / 8 h, P3 8 h / 72 h, P4 24 h / 120 h (response / resolution).", "Must"],
      ["FR-SLA-04", "Store and display the decision trace with every ticket.", "Must"],
      ["FR-SLA-05", "Response is met at the first transition to IN_PROGRESS, PENDING_PARTS or RESOLVED.", "Must"],
      ["FR-SLA-06", "Pause the resolution clock in PENDING_PARTS; on resume extend the due date by the paused duration.", "Must"],
      ["FR-SLA-07", "Classify timers as ON_TRACK, AT_RISK (<25% remaining), BREACHED, PAUSED, MET or MISSED, updating live.", "Must"],
      ["FR-SLA-08", "Managers may override priority with a mandatory reason; due dates recomputed and override audited.", "Should"],
    ],
  );
  b.p("SLA policy matrix:", { size: 9 });
  slaMatrixTable(b);
  feature(
    "3.2.5 Technician Resolution Workbench",
    "Single screen for diagnosing, documenting and resolving a ticket. Priority: High.",
    "Technician opens a ticket → reviews metadata and SOP → performs transitions and captures → UI updates optimistically and revalidates.",
    [
      ["FR-WB-01", "Show a live operational metadata grid: asset, location, IP, firmware, criticality, environment and specs.", "Must"],
      ["FR-WB-02", "Enforce the lifecycle OPEN → IN_PROGRESS → PENDING_PARTS → RESOLVED → CLOSED with guarded back-transitions.", "Must"],
      ["FR-WB-03", "Require a note for PENDING_PARTS (parts/vendor), RESOLVED (resolution summary) and cancel/reopen (reason).", "Must"],
      ["FR-WB-04", "Record technical audit captures: license key, encoder registration, IP configuration, firmware update, part replacement, boot recovery.", "Must"],
      ["FR-WB-05", "Mask sensitive capture fields server-side for roles without reveal permission.", "Must"],
      ["FR-WB-06", "IP and firmware captures update the asset registry automatically.", "Should"],
      ["FR-WB-07", "Comments are internal or public (visible on the tracking page).", "Must"],
      ["FR-WB-08", "Apply optimistic UI updates and revalidate server data immediately after each action.", "Should"],
      ["FR-WB-09", "Link relevant SOPs by domain and issue code.", "Should"],
    ],
  );
  feature(
    "3.2.6 Sub-meter readings",
    "Electricity (kWh) and water (m³) sub-meter reading capture and validation. Priority: Medium.",
    "Technician records a register value → system validates, computes consumption, flags anomalies and may raise a ticket.",
    [
      ["FR-MTR-01", "Record cumulative readings with timestamp and recorder.", "Must"],
      ["FR-MTR-02", "Reject values lower than the previous reading unless 'meter replaced' is declared.", "Must"],
      ["FR-MTR-03", "Flag readings whose daily rate exceeds 2x the trailing average.", "Must"],
      ["FR-MTR-04", "Raise a P3 CONSUMPTION_ANOMALY ticket automatically unless one is already active.", "Should"],
      ["FR-MTR-05", "Display consumption trends per meter.", "Should"],
    ],
  );
  feature(
    "3.2.7 REST / webhook ingestion API",
    "Machine-to-machine ticket creation from monitoring platforms. Priority: Medium.",
    "Monitoring system posts an alert → API validates key and payload → creates or de-duplicates ticket → returns reference and SLA.",
    [
      ["FR-API-01", "Provide POST /api/v1/tickets authenticated with Bearer API keys.", "Must"],
      ["FR-API-02", "Show API keys once; store SHA-256 hashes; support revocation and last-used tracking.", "Must"],
      ["FR-API-03", "Return the existing active ticket when externalRef matches (idempotent retries).", "Must"],
      ["FR-API-04", "Return 422 with field-level issues for invalid payloads; 401 for bad keys; 404 for unknown assets.", "Must"],
      ["FR-API-05", "Provide GET /api/v1/tickets with live SLA state for external dashboards.", "Should"],
    ],
  );
  feature(
    "3.2.8 Dashboards & reporting",
    "Operational overview per role. Priority: Medium.",
    "User opens the dashboard → KPIs, watchlist and charts computed from live data.",
    [
      ["FR-DSH-01", "KPIs: active tickets, P1 active, SLA breaches, 30-day resolution compliance, average first response, assets needing attention.", "Must"],
      ["FR-DSH-02", "SLA watchlist ordered by nearest deadline with live timers.", "Must"],
      ["FR-DSH-03", "Ticket volume by domain and technician workload.", "Should"],
      ["FR-DSH-04", "Tenant dashboard restricted to the tenant's unit.", "Must"],
    ],
  );
  feature(
    "3.2.9 Documentation & SOP library",
    "Operational knowledge embedded in the workflow. Priority: Medium.",
    "Technician opens an SOP from a ticket → follows steps → records captures; staff download generated PDFs.",
    [
      ["FR-DOC-01", "Provide an SOP library with step tables, commands, expected results, verification and escalation.", "Must"],
      ["FR-DOC-02", "Generate the SRS, Ticket Management Blueprint and Operations SOP & Schema Blueprint as PDFs on demand.", "Must"],
      ["FR-DOC-03", "Generate documents from the same modules used at runtime (single source of truth).", "Should"],
    ],
  );

  b.h2("3.3 Performance requirements");
  b.table(REQ_COLS, [
    ["NFR-PERF-01", "95th percentile server render time below 800 ms at 50 concurrent users.", "Must"],
    ["NFR-PERF-02", "SLA classification is a pure function executing in under 5 ms.", "Must"],
    ["NFR-PERF-03", "Public QR page interactive within 3 s on a 4G connection.", "Should"],
    ["NFR-PERF-04", "Sustain 50,000 tickets and 5,000 assets using indexed queries (status, priority, assignee, asset, created_at).", "Should"],
  ]);
  b.h2("3.4 Logical database requirements");
  b.table(
    [
      { header: "Table", width: 18, mono: true },
      { header: "Purpose", width: 32 },
      { header: "Key columns", width: 50 },
    ],
    DATA_DICTIONARY.map((d) => [d.table, d.purpose, d.keys]),
  );
  b.bullets([
    "Referential integrity: ticket notes and meter readings cascade on parent deletion; asset/unit/user references on tickets are set NULL to preserve history.",
    "Retention: tickets and audit logs retained for at least 3 years; sessions purged after expiry.",
  ]);
  b.h2("3.5 Design constraints");
  b.bullets([
    "Server-first rendering with React Server Components; client components only for interactivity (timers, forms, optimistic updates).",
    "TypeScript strict mode; shared pure modules for SLA, workflow and catalog used by server, client and PDF generation.",
    "Schema changes delivered as versioned SQL migrations.",
  ]);
  b.h2("3.6 Software system attributes");
  b.h3("3.6.1 Security & compliance");
  b.table(REQ_COLS, [
    ["NFR-SEC-01", "All traffic uses TLS 1.2+; HSTS enforced at the reverse proxy.", "Must"],
    ["NFR-SEC-02", "Authentication, session and access-control controls meet OWASP ASVS L2.", "Must"],
    ["NFR-SEC-03", "Every Server Action re-validates the session and role; client input is never trusted.", "Must"],
    ["NFR-SEC-04", "Only parameterised SQL (ORM query builder); no string-concatenated queries.", "Must"],
    ["NFR-SEC-05", "Secrets (database URL, keys) come from environment variables and never reach the browser bundle.", "Must"],
    ["NFR-SEC-06", "Audit log for sign-in/out, transitions, captures, overrides, registry, user and API-key changes; retained 3 years.", "Must"],
    ["NFR-SEC-07", "License keys and registration codes are masked for non-manager roles; reveal limited to Manager/Admin.", "Must"],
    ["NFR-SEC-08", "Public pages use unguessable tokens (>= 50 bits), honeypot and rate limiting; expose no internal data.", "Must"],
    ["NFR-SEC-09", "Personal data minimised to reporter name and contact (PDPL / GDPR); subject requests handled by the controller.", "Must"],
    ["NFR-SEC-10", "CCTV footage and access-log exports require management approval recorded on the ticket.", "Must"],
    ["NFR-SEC-11", "Failed sign-ins incur a response delay; accounts can be deactivated instantly.", "Should"],
    ["NFR-SEC-12", "Daily encrypted PostgreSQL backups retained 30 days; quarterly restore test.", "Must"],
  ]);
  b.h3("3.6.2 Reliability & availability");
  b.table(REQ_COLS, [
    ["NFR-REL-01", "Monthly availability of 99.5% or better (excluding announced maintenance).", "Must"],
    ["NFR-REL-02", "Health endpoint /api/health verifies the database round-trip for orchestration.", "Must"],
    ["NFR-REL-03", "Idempotent schema bootstrap and demo seeding on start-up.", "Should"],
    ["NFR-REL-04", "Recovery objectives: RPO 24 h, RTO 4 h.", "Must"],
  ]);
  b.h3("3.6.3 Maintainability, portability & usability");
  b.bullets([
    "SLA matrix, issue catalog, workflow and SOPs are centralised modules with unit-testable pure functions.",
    "Runs on any Node.js host with PostgreSQL; no proprietary cloud dependencies.",
    "Responsive layout from 360 px; WCAG 2.1 AA colour contrast target; keyboard-accessible dialogs (Escape to close).",
  ]);
  b.h2("3.7 Other requirements");
  b.bullets([
    "Privacy notice on public pages; reporter contact used only for the related request.",
    "Life-safety: P1 guidance on public and staff pages to call emergency services first.",
    "Localisation-ready date formatting in the building time zone.",
  ]);

  b.h1("Appendix A — Entity-relationship diagram");
  b.p("Physical data model implemented in PostgreSQL. Enumerations: SystemDomain, Role, TicketStatus, Priority, UnitType, AssetStatus, Criticality, Channel, ImpactScope, NoteType.", { size: 9 });
  drawErDiagram(b);
  b.table(
    [
      { header: "Relationship", width: 42, mono: true },
      { header: "Cardinality", width: 14 },
      { header: "On delete", width: 14 },
      { header: "Meaning", width: 30 },
    ],
    [
      ["units.id -> assets.unit_id", "1 : N", "SET NULL", "Asset location"],
      ["units.id -> tickets.unit_id", "1 : N", "SET NULL", "Ticket location"],
      ["units.id -> users.unit_id", "1 : N", "SET NULL", "Tenant / manager unit"],
      ["assets.id -> tickets.asset_id", "1 : N", "SET NULL", "Affected asset"],
      ["assets.id -> meter_readings.asset_id", "1 : N", "CASCADE", "Sub-meter readings"],
      ["tickets.id -> ticket_notes.ticket_id", "1 : N", "CASCADE", "Timeline entries"],
      ["users.id -> tickets.assignee_id / reporter_user_id", "1 : N", "SET NULL", "Assignment / reporter"],
      ["users.id -> ticket_notes.author_id", "1 : N", "SET NULL", "Note author"],
      ["users.id -> sessions.user_id", "1 : N", "CASCADE", "Active sessions"],
      ["users.id -> audit_logs.actor_id", "1 : N", "SET NULL", "Actor of audited event"],
      ["users.id -> meter_readings.recorded_by_id / api_keys.created_by_id", "1 : N", "SET NULL", "Recorder / key creator"],
    ],
    { size: 7.4 },
  );

  b.h1("Appendix B — Ticket lifecycle");
  drawStateDiagram(b);
  b.table(
    [
      { header: "ID", width: 7, bold: true },
      { header: "From → To", width: 30 },
      { header: "Action", width: 22 },
      { header: "Note required", width: 14 },
      { header: "Roles", width: 27 },
    ],
    TRANSITION_IDS.map(([from, to, id]) => {
      const t = TRANSITIONS[from].find((x) => x.to === to)!;
      return [id, `${STATUS_META[from].label} → ${STATUS_META[to].label}`, t.label, t.requiresNote ?? "—", t.roles ? t.roles.map((r) => ROLE_META[r].label).join(", ") : "Staff"];
    }),
  );

  b.h1("Appendix C — Requirements traceability matrix");
  b.table(
    [
      { header: "Feature", width: 20, bold: true },
      { header: "Requirements", width: 18 },
      { header: "Implementation", width: 38, mono: true },
      { header: "Verification", width: 24 },
    ],
    [
      ["Authentication & RBAC", "FR-AUTH-01..07", "lib/auth.ts, lib/password.ts, lib/permissions.ts, proxy.ts", "Role matrix test, cookie inspection"],
      ["Asset & unit registry", "FR-AST-01..08", "actions/assets.ts, actions/admin.ts, (app)/assets, (app)/units", "CRUD UAT, sticker print test"],
      ["QR intake", "FR-QR-01..08", "app/r/[token], actions/public.ts, app/track/[token]", "Scan test on iOS/Android; rate-limit test"],
      ["SLA engine", "FR-SLA-01..08", "lib/sla.ts, lib/ticket-service.ts", "Worked-example unit tests (BSD-TMB-002 §4)"],
      ["Resolution workbench", "FR-WB-01..09", "(app)/tickets/[id], actions/tickets.ts, lib/workflow.ts", "Transition matrix test; masking test"],
      ["Sub-meters", "FR-MTR-01..05", "actions/admin.ts (addReadingAction), (app)/meters", "Anomaly scenario test"],
      ["Ingestion API", "FR-API-01..05", "api/v1/tickets/route.ts, lib/server-utils.ts", "curl contract tests; idempotency test"],
      ["Dashboards", "FR-DSH-01..04", "(app)/dashboard, lib/queries.ts", "KPI reconciliation with SQL"],
      ["Documentation", "FR-DOC-01..03", "lib/sop.ts, lib/pdf/*, (app)/docs", "Document review"],
      ["Security NFRs", "NFR-SEC-01..12", "auth, audit-log, server-utils, reverse proxy", "ASVS L2 checklist, pen-test"],
    ],
    { size: 7.4 },
  );

  b.insertToc();
  return b.finalize();
}

/* ---------------------------------------------------------------------------------------------- */
/*                                  Ticket Management Blueprint                                   */
/* ---------------------------------------------------------------------------------------------- */

export async function buildBlueprintPdf() {
  const b = await PdfBuilder.create({
    title: "Detailed Ticket Management Blueprint — Building Service Desk",
    short: "Ticket Management Blueprint",
    docId: "BSD-TMB-002 v1.0",
    classification: `Internal — ${ORG}`,
    subject: "Lifecycle, SLA logic, ingestion API and SOP execution",
  });
  b.titlePage({
    kicker: "Design blueprint · deep dive",
    title: "Detailed Ticket Management Blueprint",
    subtitle: "Lifecycle state transitions, dynamic SLA JavaScript logic, REST/webhook ingestion API schemas and step-by-step SOP execution tables.",
    meta: [
      ["Document ID", "BSD-TMB-002"],
      ["Version", "1.0"],
      ["Date", today()],
      ["Site", SITE],
      ["Companion", "BSD-SRS-001 (requirements), BSD-OPS-003 (SOP & schema blueprint)"],
      ["File", "ticket_management_blueprint.pdf"],
    ],
    footer: "All tables in this document are generated from the running system's workflow, SLA and SOP modules.",
  });

  b.h1("1. Purpose & scope");
  b.p(
    "This blueprint specifies how a ticket moves through the Building Service Desk: how it is created from each intake channel, how the deterministic SLA engine assigns priority and timers, which state transitions are permitted and what side effects they trigger, how external systems ingest tickets, and how field engineers execute SOPs while recording an auditable technical trail.",
  );
  b.h2("1.1 Ticket data contract");
  b.table(
    [
      { header: "Field", width: 22, mono: true },
      { header: "Type", width: 16 },
      { header: "Description", width: 62 },
    ],
    [
      ["seq / reference", "serial", "Human reference SR-00042 (zero-padded sequence)"],
      ["domain, issueCode", "enum, text", "Catalog pair that drives the base priority"],
      ["priority", "P1..P4", "Output of classifyTicket(); may be overridden by a manager"],
      ["status", "enum", "OPEN, IN_PROGRESS, PENDING_PARTS, RESOLVED, CLOSED"],
      ["channel", "enum", "QR_SCAN, PORTAL, API, PHONE, EMAIL"],
      ["impactScope, safetyHazard", "enum, bool", "Modifier inputs for rules R2 and R4"],
      ["slaTrace", "jsonb", "Ordered list of rules applied (auditable decision trace)"],
      ["responseDueAt / resolutionDueAt", "timestamptz", "Computed at intake; resolution extended by paused time"],
      ["firstResponseAt, resolvedAt, closedAt", "timestamptz", "Lifecycle stamps used for SLA evaluation"],
      ["slaPausedAt, slaPausedMinutes", "timestamptz, int", "Pause bookkeeping while PENDING_PARTS"],
      ["assetId, unitId, assigneeId", "uuid", "Context and dispatch"],
      ["externalRef", "text", "Idempotency key for webhook retries"],
      ["publicToken", "text", "16-char token for the public tracking page"],
    ],
  );

  b.h1("2. Lifecycle state machine");
  b.p("States and permitted transitions (T-IDs map to the transition table). The resolution clock runs in OPEN and IN_PROGRESS, pauses in PENDING_PARTS and stops at RESOLVED / CLOSED.", { size: 9 });
  drawStateDiagram(b);
  b.table(
    [
      { header: "ID", width: 6, bold: true },
      { header: "From → To", width: 21 },
      { header: "Action / guard", width: 22 },
      { header: "Side effects", width: 36 },
      { header: "Roles", width: 15 },
    ],
    TRANSITION_IDS.map(([from, to, id]) => {
      const t = TRANSITIONS[from].find((x) => x.to === to)!;
      return [
        id,
        `${STATUS_META[from].label} → ${STATUS_META[to].label}`,
        `${t.label}${t.requiresNote ? ` (requires ${t.requiresNote} note)` : ""}`,
        SIDE_EFFECTS[`${from}>${to}`] ?? "",
        t.roles ? t.roles.map((r) => ROLE_META[r].label).join(", ") : "Staff (Admin, Manager, Technician)",
      ];
    }),
    { size: 7.4 },
  );
  b.callout("Tenants and public reporters can never change status. Every transition writes a STATUS_CHANGE note (visible on the tracking page) and an audit log entry, then revalidates the workbench, queue and dashboard.", "info", "Invariants");

  b.h1("3. Deterministic SLA engine");
  b.h2("3.1 Policy matrix");
  slaMatrixTable(b);
  b.h2("3.2 Rule order");
  b.table(
    [
      { header: "Rule", width: 10, bold: true },
      { header: "Condition", width: 45 },
      { header: "Effect", width: 45 },
    ],
    [
      ["R1", "Catalog lookup of (domain, issueCode)", "Base priority; unknown codes default to P3"],
      ["R2", "impactScope = BUILDING and level > 1", "Escalate one level"],
      ["R3", "Asset criticality = CRITICAL and issue is service-affecting and level > 1", "Escalate one level"],
      ["R4", "safetyHazard = true", "Force P1"],
      ["Result", "Priority = clamp(level, P1..P4)", "Response / resolution targets from the matrix; trace persisted"],
    ],
  );
  b.h2("3.3 Dynamic SLA JavaScript logic");
  b.code(SLA_JS_LOGIC, { title: "src/lib/sla.ts · src/lib/ticket-service.ts (abridged)" });
  b.h2("3.4 Worked examples (computed live)");
  workedExamples(b);
  b.h2("3.5 Issue catalog");
  issueCatalogTables(b);
  b.h2("3.6 Timer states & escalation");
  b.table(
    [
      { header: "State", width: 16, bold: true },
      { header: "Definition", width: 84 },
    ],
    [
      ["ON_TRACK", "More than 25% of the window remains"],
      ["AT_RISK", "Less than 25% of the window remains"],
      ["BREACHED", "Due time passed without completion (or paused after the due time)"],
      ["PAUSED", "Resolution clock stopped while PENDING_PARTS"],
      ["MET / MISSED", "Completed before / after the due time"],
      ["N/A", "Ticket cancelled (closed without resolution)"],
    ],
  );
  b.table(
    [
      { header: "Threshold", width: 16, bold: true },
      { header: "P1 Urgent", width: 30 },
      { header: "P2 High", width: 27 },
      { header: "P3 / P4", width: 27 },
    ],
    [
      ["T+0", "Auto-dispatch + call on-call technician and property manager", "Auto-dispatch; notify technician", "Queue; notify technician"],
      ["75% (AT_RISK)", "Facility Director alerted; backup technician dispatched", "Property manager alerted", "Technician reminder"],
      ["100% (BREACHED)", "Vendor escalation; incident report opened", "Manager + vendor contact", "Manager review in daily stand-up"],
      ["150% of resolution", "Mandatory post-incident review", "Root-cause review", "Weekly SLA review"],
    ],
    { size: 7.6 },
  );

  b.h1("4. Intake channels");
  b.h2("4.1 QR Scan-to-Report flow");
  b.table(
    [
      { header: "#", width: 5, bold: true },
      { header: "Actor", width: 15 },
      { header: "System behaviour", width: 80 },
    ],
    [
      ["1", "Reporter", "Scans the sticker; camera opens https://<host>/r/<qrToken>"],
      ["2", "System", "Looks up the asset by token (retired / unknown tokens show a safe fallback page)"],
      ["3", "System", "Renders asset name, tag, location label (e.g. Mado Coffee · Ground Floor · Unit 4B), environment settings and domain"],
      ["4", "System", "Shows active tickets on the asset as 'Already reported' with tracking links"],
      ["5", "Reporter", "Chooses issue type, scope, optional safety flag and details; enters name and contact"],
      ["6", "System", "Live SLA estimate via classifyTicket() in the browser (same pure function as the server)"],
      ["7", "System", "submitPublicReportAction: honeypot, per-asset rate limit, validation, createTicketRecord(channel=QR_SCAN)"],
      ["8", "System", "Auto-dispatch, asset status update, audit log; redirect to /track/<publicToken>?new=1"],
      ["9", "Reporter", "Tracking page auto-refreshes every 30 s with status, timers and public notes"],
    ],
  );
  b.h2("4.2 Other channels");
  b.bullets([
    "Portal (staff / tenants): full form with asset & unit pickers and live SLA preview; tenants restricted to their unit.",
    "Phone / email: staff record channel, reporter name and contact; same classification path.",
    "API / webhook: machine ingestion with externalRef idempotency (Section 5).",
  ]);

  b.h1("5. REST / webhook ingestion API");
  b.table(
    [
      { header: "Method", width: 10, bold: true },
      { header: "Path", width: 25, mono: true },
      { header: "Auth", width: 18 },
      { header: "Description", width: 47 },
    ],
    API_ENDPOINTS.map((e) => [e.method, e.path, e.auth, e.description]),
  );
  b.h2("5.1 Request schema");
  b.code(INGEST_REQUEST);
  b.h2("5.2 Response");
  b.code(INGEST_RESPONSE);
  b.h2("5.3 Status & error codes");
  b.table(
    [
      { header: "HTTP", width: 10, bold: true },
      { header: "error", width: 28, mono: true },
      { header: "Meaning", width: 62 },
    ],
    [
      ["201", "—", "Ticket created; body contains reference, priority, due dates, trace and tracking URL"],
      ["200", "— (deduplicated: true)", "An active ticket with the same externalRef already exists"],
      ["400", "invalid_json", "Body is not valid JSON"],
      ["401", "unauthorized", "Missing, unknown or revoked API key"],
      ["404", "asset_not_found", "assetTag / qrToken does not match an asset"],
      ["422", "validation_failed", "Schema validation failed; 'issues' lists path + message"],
      ["422", "invalid_domain / invalid_issue_code", "Domain missing or issue code not in the domain catalog"],
    ],
  );
  b.h2("5.4 Webhook payload examples");
  WEBHOOK_EXAMPLES.forEach((w) => b.code(w.payload, { title: w.source }));
  b.callout("Keys are generated as bsd_live_<32 random chars>, displayed once and stored as SHA-256 hashes. Rotate keys by creating a new key, updating the sender, then revoking the old key.", "info", "Key management");

  b.h1("6. Resolution workbench");
  b.h2("6.1 Operational metadata grid");
  b.bullets([
    "Asset: name, tag, domain, criticality, live status, make/model, serial, IP address, firmware, install and warranty dates.",
    "Environment settings (public-safe) and technical specs (internal) rendered as key/value chips.",
    "Location label and occupant; SLA decision trace; relevant SOPs; reporter & intake details; asset ticket history.",
  ]);
  b.h2("6.2 Technical audit capture types");
  b.table(
    [
      { header: "Capture", width: 22, bold: true },
      { header: "Fields (sensitive marked *)", width: 55 },
      { header: "Registry sync", width: 23 },
    ],
    Object.entries(CAPTURE_TYPES).map(([k, t]) => [
      t.label,
      t.fields.map((f) => `${f.label}${f.sensitive ? "*" : ""}${f.required ? " (req.)" : ""}`).join(", "),
      k === "IP_CONFIGURATION" ? "asset.ip_address = newIp" : k === "FIRMWARE_UPDATE" ? "asset.firmware = toVersion" : "—",
    ]),
  );
  b.callout("Sensitive values are masked on the server (••••••••AB12) for technicians; managers and administrators may reveal them in the UI. Captures are immutable timeline entries and are also referenced in the audit log.", "warn", "Masking rule");

  b.h1("7. SOP execution tables");
  b.p("Each SOP is executed from the workbench; evidence and captures are recorded on the ticket as steps complete.", { size: 9 });
  SOPS.forEach((s) => renderSop(b, s, false));

  b.h1("8. RACI");
  b.table(
    [
      { header: "Activity", width: 32, bold: true },
      { header: "Tenant / reporter", width: 17 },
      { header: "Technician", width: 17 },
      { header: "Property Manager", width: 17 },
      { header: "Facility Director", width: 17 },
    ],
    [
      ["Intake & triage", "R", "I", "A", "I"],
      ["Dispatch / assignment", "—", "C", "A/R", "I"],
      ["Diagnosis & fix (SOP execution)", "C", "R", "A", "I"],
      ["Parts procurement (PENDING_PARTS)", "—", "R", "A", "C"],
      ["Priority override", "—", "C", "R", "A"],
      ["Closure & verification", "C", "R", "A", "I"],
      ["SLA policy & SOP maintenance", "—", "C", "R", "A"],
    ],
  );

  b.insertToc();
  return b.finalize();
}

/* ---------------------------------------------------------------------------------------------- */
/*                           Integrated Operations SOP & Schema Blueprint                          */
/* ---------------------------------------------------------------------------------------------- */

export async function buildOpsBlueprintPdf() {
  const b = await PdfBuilder.create({
    title: "Integrated Operations SOP & Schema Blueprint — Building Service Desk",
    short: "Operations SOP & Schema Blueprint",
    docId: "BSD-OPS-003 v1.0",
    classification: `Internal — ${ORG}`,
    subject: "File structure, data models, Server Actions, public report view and field SOPs",
  });
  b.titlePage({
    kicker: "Operations handbook · schema blueprint",
    title: "Integrated Operations SOP & Schema Blueprint",
    subtitle: "Complete file structure, data models, Next.js Server Actions, the public mobile report view and diagnostic SOPs for hardware field engineers.",
    meta: [
      ["Document ID", "BSD-OPS-003"],
      ["Version", "1.0"],
      ["Date", today()],
      ["Site", SITE],
      ["Audience", "Developers, field engineers, property management"],
      ["File", "operations_sop_schema_blueprint.pdf"],
    ],
    footer: "SOP content is generated from src/lib/sop.ts — the same library shown in the application.",
  });

  b.h1("1. Architecture overview");
  b.p(
    "The Building Service Desk is a Next.js App Router application. Pages are React Server Components that query PostgreSQL directly through Drizzle ORM; interactive islands (SLA timers, forms, optimistic lists) are client components. All mutations are Server Actions that authenticate, authorise, validate, write, audit and revalidate affected routes.",
  );
  b.bullets([
    "Request path: proxy.ts (optimistic cookie gate) → layout requireUser() (DB session check) → page (RSC) → client islands.",
    "Mutation path: client form / transition → Server Action → service layer (ticket-service.ts) → PostgreSQL → revalidatePath().",
    "Boot path: instrumentation.ts → ensureDatabaseReady() creates the schema from drizzle/*.sql when absent and seeds demo data when empty.",
  ]);
  b.h2("1.1 Complete file structure");
  b.code(FILE_TREE, { size: 7 });

  b.h1("2. Data models");
  b.h2("2.1 Enumerations");
  b.table(
    [
      { header: "Enum", width: 20, mono: true },
      { header: "Values", width: 80 },
    ],
    [
      ["SystemDomain", DOMAINS.join(", ")],
      ["Role", ROLES.join(", ")],
      ["TicketStatus", "OPEN, IN_PROGRESS, PENDING_PARTS, RESOLVED, CLOSED"],
      ["Priority", "P1, P2, P3, P4"],
      ["ImpactScope", Object.keys(IMPACT_SCOPE_META).join(", ")],
      ["UnitType / AssetStatus / Criticality", "RESIDENTIAL..TECHNICAL / OPERATIONAL..RETIRED / CRITICAL..LOW"],
      ["Channel / NoteType", "QR_SCAN, PORTAL, API, PHONE, EMAIL / COMMENT, STATUS_CHANGE, AUDIT_CAPTURE, ASSIGNMENT, SYSTEM"],
    ],
  );
  b.h2("2.2 Tables");
  b.table(
    [
      { header: "Table", width: 18, mono: true },
      { header: "Purpose", width: 32 },
      { header: "Key columns", width: 50 },
    ],
    DATA_DICTIONARY.map((d) => [d.table, d.purpose, d.keys]),
  );
  b.h2("2.3 Prisma-equivalent models");
  b.code(PRISMA_SCHEMA, { size: 6.9 });

  b.h1("3. Next.js Server Actions");
  b.table(
    [
      { header: "Action", width: 30, mono: true },
      { header: "Roles", width: 17 },
      { header: "Behaviour", width: 53 },
    ],
    SERVER_ACTIONS.map((a) => [`${a.name}\n${a.file}`, a.roles, a.description]),
    { size: 7.3 },
  );
  b.callout("Pattern: requireUser() → permission check (lib/permissions.ts) → validation → write → logAudit() → revalidatePath() → return ActionResult { ok, message | error, fieldErrors } or redirect().", "info", "Server Action contract");

  b.h1("4. Public mobile report view");
  b.bullets([
    "Route /r/[token] (no authentication). The token is the asset's qr_token — 10 characters from a 32-symbol alphabet (50 bits), not the database ID.",
    "Displays only public-safe data: asset name, tag, domain, location label, location detail and environment settings.",
    "Issue picker from ISSUE_CATALOG[asset.domain]; scope selector; safety toggle; optional details; name and contact.",
    "Client-side SLA preview using the shared classifyTicket(); server recomputes authoritatively on submit.",
    "Abuse controls: hidden honeypot field, 5 reports per asset per 10 minutes, input length limits.",
    "After submission: redirect to /track/[publicToken] with status stepper, live SLA timers, public notes and 30-second auto-refresh.",
  ]);
  b.table(
    [
      { header: "Element", width: 28, bold: true },
      { header: "Source", width: 32, mono: true },
      { header: "Visibility", width: 40 },
    ],
    [
      ["Asset name / tag / domain", "assets.name, tag, domain", "Public"],
      ["Location label", "units.name, floor, code + assets.location_detail", "Public"],
      ["Environment settings", "assets.environment (jsonb)", "Public (curated)"],
      ["IP, serial, firmware, specs", "assets.ip_address, serial_number, specs", "Staff only"],
      ["Known issues", "tickets (active, same asset)", "Public: reference, title, status"],
      ["Timeline", "ticket_notes where is_public", "Public"],
    ],
  );

  b.h1("5. Standard operating procedures");
  b.p("Diagnostic workflows for hardware field engineers. Record every capture listed at the end of each SOP in the ticket's technical audit log.", { size: 9 });
  SOPS.forEach((s, i) => {
    if (i > 0) b.space(6);
    renderSop(b, s, true);
  });

  b.h1("6. Demo environment");
  b.table(
    [
      { header: "Account", width: 34, mono: true },
      { header: "Role", width: 24 },
      { header: "Notes", width: 42 },
    ],
    [
      ["admin@marina.local", "Administrator", "Users, API keys, audit, all features"],
      ["manager@marina.local", "Property Manager", "Dispatch, overrides, registry"],
      ["tech@marina.local", "Field Technician", "IT & security workbench (Rajesh Kumar)"],
      ["tenant@marina.local", "Tenant", "Mado Coffee, Ground Floor, Unit 4B"],
    ],
  );
  b.p("Demo password for all seeded accounts: demo1234. Re-seed with: npx tsx src/db/seed.ts --reset", { size: 9, italic: true });
  void findIssue;

  b.insertToc();
  return b.finalize();
}
