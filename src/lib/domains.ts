import type {
  AssetStatus,
  Channel,
  Criticality,
  ImpactScope,
  Priority,
  Role,
  SystemDomain,
  UnitType,
} from "@/db/schema";

export const DOMAINS: SystemDomain[] = [
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
];

export type DomainGroup = "PHYSICAL" | "IT_SECURITY";

export const DOMAIN_GROUPS: Record<DomainGroup, { label: string; description: string }> = {
  PHYSICAL: { label: "Physical Infrastructure", description: "HVAC, plumbing, power, sub-meters and water pumps" },
  IT_SECURITY: {
    label: "IT & Security Hardware",
    description: "Access control, lock encoders, VoIP/PBX, POS printers, CCTV and network",
  },
};

export interface DomainMeta {
  label: string;
  short: string;
  group: DomainGroup;
  description: string;
  badge: string;
  accent: string;
  soft: string;
}

export const DOMAIN_META: Record<SystemDomain, DomainMeta> = {
  HVAC: {
    label: "HVAC",
    short: "HVAC",
    group: "PHYSICAL",
    description: "Chillers, AHUs, FCUs, split & VRF systems",
    badge: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    accent: "bg-cyan-500",
    soft: "bg-cyan-50 text-cyan-600",
  },
  PLUMBING: {
    label: "Plumbing",
    short: "Plumbing",
    group: "PHYSICAL",
    description: "Risers, drainage, grease traps, water heaters",
    badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
    accent: "bg-sky-500",
    soft: "bg-sky-50 text-sky-600",
  },
  ELECTRICAL: {
    label: "Electrical & Power",
    short: "Electrical",
    group: "PHYSICAL",
    description: "MDB/SMDB, generators, ATS, distribution boards",
    badge: "bg-yellow-50 text-yellow-800 ring-yellow-600/25",
    accent: "bg-yellow-500",
    soft: "bg-yellow-50 text-yellow-600",
  },
  SUB_METER: {
    label: "Sub-Metering",
    short: "Sub-meters",
    group: "PHYSICAL",
    description: "Tenant electricity (kWh) and water (m³) sub-meters",
    badge: "bg-lime-50 text-lime-800 ring-lime-600/25",
    accent: "bg-lime-500",
    soft: "bg-lime-50 text-lime-700",
  },
  WATER_PUMP: {
    label: "Water Pumps",
    short: "Water pumps",
    group: "PHYSICAL",
    description: "Booster sets, transfer and sump pumps",
    badge: "bg-blue-50 text-blue-700 ring-blue-600/20",
    accent: "bg-blue-500",
    soft: "bg-blue-50 text-blue-600",
  },
  ACCESS_CONTROL: {
    label: "Access Control (ZKTeco)",
    short: "Access control",
    group: "IT_SECURITY",
    description: "ZKTeco biometric terminals & inBio door controllers",
    badge: "bg-violet-50 text-violet-700 ring-violet-600/20",
    accent: "bg-violet-500",
    soft: "bg-violet-50 text-violet-600",
  },
  LOCK_ENCODER: {
    label: "Smart-Card Lock Encoders",
    short: "Lock encoders",
    group: "IT_SECURITY",
    description: "proUSB / eLock card encoders and RFID door locks",
    badge: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20",
    accent: "bg-fuchsia-500",
    soft: "bg-fuchsia-50 text-fuchsia-600",
  },
  VOIP_PBX: {
    label: "VoIP / PBX (FreePBX · Asterisk)",
    short: "VoIP / PBX",
    group: "IT_SECURITY",
    description: "FreePBX / Asterisk on Hyper-V, SIP trunks, handsets",
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    accent: "bg-indigo-500",
    soft: "bg-indigo-50 text-indigo-600",
  },
  POS_PRINTER: {
    label: "POS & Thermal Printers",
    short: "POS / printers",
    group: "IT_SECURITY",
    description: "Retail POS terminals, receipt & kitchen printers",
    badge: "bg-orange-50 text-orange-700 ring-orange-600/20",
    accent: "bg-orange-500",
    soft: "bg-orange-50 text-orange-600",
  },
  CCTV: {
    label: "CCTV & NVR",
    short: "CCTV",
    group: "IT_SECURITY",
    description: "IP cameras, NVR recording and retention",
    badge: "bg-rose-50 text-rose-700 ring-rose-600/20",
    accent: "bg-rose-500",
    soft: "bg-rose-50 text-rose-600",
  },
  NETWORK: {
    label: "Network & Workstations",
    short: "Network / IT",
    group: "IT_SECURITY",
    description: "Core switching, Wi-Fi, reception & office workstations",
    badge: "bg-slate-100 text-slate-700 ring-slate-500/20",
    accent: "bg-slate-500",
    soft: "bg-slate-100 text-slate-600",
  },
};

export interface IssueType {
  code: string;
  label: string;
  basePriority: Priority;
  serviceAffecting: boolean;
  hint?: string;
}

/**
 * Deterministic issue catalog. Every (domain, issueCode) pair maps to exactly one
 * base priority. Modifiers in `classifyTicket` are then applied in a fixed order.
 */
export const ISSUE_CATALOG: Record<SystemDomain, IssueType[]> = {
  HVAC: [
    { code: "HVAC_COMMERCIAL_DOWN", label: "No cooling – commercial / retail unit", basePriority: "P2", serviceAffecting: true, hint: "Shop floor or dining area without cooling" },
    { code: "HVAC_RESIDENTIAL_DOWN", label: "No cooling / heating – apartment", basePriority: "P2", serviceAffecting: true, hint: "AC completely off or blowing warm air" },
    { code: "HVAC_TEMP_ADJUST", label: "Temperature or thermostat adjustment", basePriority: "P3", serviceAffecting: false },
    { code: "HVAC_NOISE_DRIP", label: "Noise, odour or condensate drip", basePriority: "P3", serviceAffecting: false },
    { code: "HVAC_FILTER_SERVICE", label: "Filter clean / routine service", basePriority: "P4", serviceAffecting: false },
  ],
  PLUMBING: [
    { code: "WATER_OUTAGE_TOTAL", label: "Total water outage (floor or building)", basePriority: "P1", serviceAffecting: true, hint: "No water from any tap" },
    { code: "BURST_PIPE_FLOOD", label: "Burst pipe / active flooding", basePriority: "P1", serviceAffecting: true, hint: "Water spreading across the floor" },
    { code: "LOCALIZED_LEAK", label: "Localized leak or blocked drain", basePriority: "P2", serviceAffecting: true },
    { code: "DRIP_SLOW_DRAIN", label: "Dripping tap or slow drain", basePriority: "P3", serviceAffecting: false },
    { code: "FIXTURE_REQUEST", label: "Fixture replacement / routine inquiry", basePriority: "P4", serviceAffecting: false },
  ],
  ELECTRICAL: [
    { code: "TOTAL_POWER_OUTAGE", label: "Total power outage", basePriority: "P1", serviceAffecting: true, hint: "No power to the unit, floor or building" },
    { code: "PARTIAL_POWER_LOSS", label: "Breaker trip / partial power loss", basePriority: "P2", serviceAffecting: true },
    { code: "LIGHTING_SOCKET_FAULT", label: "Lighting or socket fault", basePriority: "P3", serviceAffecting: false },
    { code: "ELECTRICAL_INQUIRY", label: "Routine electrical inquiry", basePriority: "P4", serviceAffecting: false },
  ],
  SUB_METER: [
    { code: "METER_NOT_REGISTERING", label: "Meter blank / not registering", basePriority: "P3", serviceAffecting: true },
    { code: "METER_READING_CHECK", label: "Sub-meter reading check / verification", basePriority: "P3", serviceAffecting: false },
    { code: "CONSUMPTION_ANOMALY", label: "Abnormal consumption spike", basePriority: "P3", serviceAffecting: false },
    { code: "METER_BILLING_INQUIRY", label: "Billing / consumption inquiry", basePriority: "P4", serviceAffecting: false },
  ],
  WATER_PUMP: [
    { code: "PUMP_FAILURE_NO_SUPPLY", label: "Booster pump failure – no water supply", basePriority: "P1", serviceAffecting: true },
    { code: "PUMP_LOW_PRESSURE", label: "Low water pressure", basePriority: "P2", serviceAffecting: true },
    { code: "PUMP_NOISE_VIBRATION", label: "Abnormal pump noise / vibration", basePriority: "P3", serviceAffecting: false },
    { code: "PUMP_ROUTINE", label: "Routine pump inspection", basePriority: "P4", serviceAffecting: false },
  ],
  ACCESS_CONTROL: [
    { code: "MAIN_ENTRANCE_LOCK_FAILURE", label: "Main entrance biometric lock failure", basePriority: "P1", serviceAffecting: true, hint: "Residents cannot enter or door won't secure" },
    { code: "ACCESS_DEVICE_OFFLINE", label: "Access terminal offline / unreachable", basePriority: "P2", serviceAffecting: true },
    { code: "DOOR_READER_FAULT", label: "Unit or service door reader fault", basePriority: "P2", serviceAffecting: true },
    { code: "ENROLMENT_REQUEST", label: "Enrol / remove fingerprint, face or card", basePriority: "P4", serviceAffecting: false },
    { code: "ACCESS_LOG_REQUEST", label: "Access event log export", basePriority: "P4", serviceAffecting: false },
  ],
  LOCK_ENCODER: [
    { code: "ENCODER_CANNOT_ISSUE", label: "Encoder cannot issue key cards", basePriority: "P2", serviceAffecting: true },
    { code: "LOCK_DB_ERROR", label: "proUSB / eLock database error", basePriority: "P2", serviceAffecting: true },
    { code: "CARD_REENCODE", label: "Card re-encode / lost card", basePriority: "P3", serviceAffecting: false },
    { code: "LOCK_LOW_BATTERY", label: "Door lock low battery warning", basePriority: "P3", serviceAffecting: false },
  ],
  VOIP_PBX: [
    { code: "PBX_HOST_DOWN", label: "Primary PBX host down", basePriority: "P1", serviceAffecting: true, hint: "No phones working at all" },
    { code: "SIP_TRUNK_DOWN", label: "SIP trunk down – no external calls", basePriority: "P1", serviceAffecting: true },
    { code: "EXTENSION_UNREGISTERED", label: "Handset / extension not registering", basePriority: "P3", serviceAffecting: false },
    { code: "PBX_CHANGE_REQUEST", label: "IVR, ring group or extension change", basePriority: "P4", serviceAffecting: false },
  ],
  POS_PRINTER: [
    { code: "POS_TERMINAL_DOWN", label: "POS terminal failure", basePriority: "P2", serviceAffecting: true, hint: "Cannot take payments" },
    { code: "THERMAL_PRINTER_FAIL", label: "Receipt / kitchen thermal printer not printing", basePriority: "P2", serviceAffecting: true },
    { code: "PRINTER_IP_REMAP", label: "Printer IP mapping / reconfiguration", basePriority: "P3", serviceAffecting: false },
    { code: "POS_CONSUMABLES", label: "Paper rolls / consumables", basePriority: "P4", serviceAffecting: false },
  ],
  CCTV: [
    { code: "NVR_RECORDING_FAILURE", label: "NVR down / recording stopped", basePriority: "P2", serviceAffecting: true },
    { code: "CAMERA_OFFLINE", label: "Single camera offline", basePriority: "P3", serviceAffecting: false },
    { code: "FOOTAGE_REQUEST", label: "Footage retrieval request", basePriority: "P3", serviceAffecting: false },
    { code: "CAMERA_ADJUST", label: "Camera angle / focus adjustment", basePriority: "P4", serviceAffecting: false },
  ],
  NETWORK: [
    { code: "BUILDING_INTERNET_DOWN", label: "Building-wide internet outage", basePriority: "P1", serviceAffecting: true },
    { code: "UNIT_NETWORK_DOWN", label: "Unit network / Wi-Fi down", basePriority: "P2", serviceAffecting: true },
    { code: "WORKSTATION_TWEAK", label: "Standard workstation tweak", basePriority: "P3", serviceAffecting: false },
    { code: "IT_INQUIRY", label: "Routine IT inquiry", basePriority: "P4", serviceAffecting: false },
  ],
};

export function findIssue(domain: SystemDomain, code: string): IssueType | undefined {
  return ISSUE_CATALOG[domain]?.find((issue) => issue.code === code);
}

export function isDomain(value: unknown): value is SystemDomain {
  return typeof value === "string" && (DOMAINS as string[]).includes(value);
}

export const UNIT_TYPES: UnitType[] = ["RESIDENTIAL", "COMMERCIAL", "COMMON_AREA", "TECHNICAL"];
export const UNIT_TYPE_META: Record<UnitType, { label: string; badge: string }> = {
  RESIDENTIAL: { label: "Residential", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  COMMERCIAL: { label: "Commercial", badge: "bg-orange-50 text-orange-700 ring-orange-600/20" },
  COMMON_AREA: { label: "Common area", badge: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  TECHNICAL: { label: "Technical / plant", badge: "bg-slate-100 text-slate-700 ring-slate-500/20" },
};

export const ASSET_STATUSES: AssetStatus[] = ["OPERATIONAL", "DEGRADED", "DOWN", "MAINTENANCE", "RETIRED"];
export const ASSET_STATUS_META: Record<AssetStatus, { label: string; badge: string; dot: string }> = {
  OPERATIONAL: { label: "Operational", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  DEGRADED: { label: "Degraded", badge: "bg-amber-50 text-amber-700 ring-amber-600/25", dot: "bg-amber-500" },
  DOWN: { label: "Down", badge: "bg-red-50 text-red-700 ring-red-600/25", dot: "bg-red-500" },
  MAINTENANCE: { label: "Maintenance", badge: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  RETIRED: { label: "Retired", badge: "bg-slate-100 text-slate-500 ring-slate-500/20", dot: "bg-slate-400" },
};

export const CRITICALITIES: Criticality[] = ["CRITICAL", "HIGH", "STANDARD", "LOW"];
export const CRITICALITY_META: Record<Criticality, { label: string; badge: string }> = {
  CRITICAL: { label: "Critical", badge: "bg-red-600 text-white ring-red-600" },
  HIGH: { label: "High", badge: "bg-orange-50 text-orange-700 ring-orange-600/25" },
  STANDARD: { label: "Standard", badge: "bg-slate-100 text-slate-600 ring-slate-500/20" },
  LOW: { label: "Low", badge: "bg-white text-slate-500 ring-slate-300" },
};

export const ROLES: Role[] = ["ADMIN", "MANAGER", "TECHNICIAN", "TENANT"];
export const ROLE_META: Record<Role, { label: string; badge: string; description: string }> = {
  ADMIN: { label: "Administrator", badge: "bg-slate-900 text-white ring-slate-900", description: "Full access incl. users, API keys and audit" },
  MANAGER: { label: "Property Manager", badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/20", description: "Dispatch, SLA overrides, asset & unit registry" },
  TECHNICIAN: { label: "Field Technician", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", description: "Resolution workbench, captures, meter readings" },
  TENANT: { label: "Tenant", badge: "bg-amber-50 text-amber-700 ring-amber-600/25", description: "Raise & track requests for own unit" },
};

export const CHANNEL_META: Record<Channel, { label: string }> = {
  QR_SCAN: { label: "QR scan" },
  PORTAL: { label: "Portal" },
  API: { label: "API / Webhook" },
  PHONE: { label: "Phone" },
  EMAIL: { label: "Email" },
};

export const IMPACT_SCOPES: ImpactScope[] = ["SINGLE", "UNIT", "FLOOR", "BUILDING"];
export const IMPACT_SCOPE_META: Record<ImpactScope, { label: string; description: string }> = {
  SINGLE: { label: "Single device", description: "Only this device / one person" },
  UNIT: { label: "Whole unit", description: "The entire apartment or shop" },
  FLOOR: { label: "Whole floor", description: "Several units on the floor" },
  BUILDING: { label: "Entire building", description: "Everyone in the building" },
};
