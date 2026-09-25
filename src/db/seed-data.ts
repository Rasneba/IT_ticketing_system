import { inArray } from "drizzle-orm";
import type { db as appDb } from "./index";
import {
  apiKeys,
  assets,
  auditLogs,
  categories,
  meterReadings,
  ticketNotes,
  tickets,
  units,
  users,
  type Channel,
  type ImpactScope,
  type NoteMetadata,
  type NoteType,
  type SystemDomain,
  type TicketStatus,
} from "./schema";
import { classifyTicket, computeDueDates, SLA_POLICY } from "../lib/sla";
import { hashPassword, randomCode, randomSecret, sha256 } from "../lib/password";

type DB = typeof appDb;

const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type NoteSpec = {
  after: number;
  by: string;
  type?: NoteType;
  body: string;
  isPublic?: boolean;
  metadata?: NoteMetadata;
};

type TicketSpec = {
  asset?: string;
  unit?: string;
  domain?: SystemDomain;
  issue: string;
  scope: ImpactScope;
  safety?: boolean;
  title?: string;
  description: string;
  channel: Channel;
  reporter: string;
  reporterContact?: string;
  reporterUser?: string;
  ago: number;
  status: TicketStatus;
  assignee?: string;
  respondedAfter?: number;
  pausedAfter?: number;
  resumedAfter?: number;
  resolvedAfter?: number;
  closedAfter?: number;
  resolution?: string;
  partsNote?: string;
  externalRef?: string;
  notes?: NoteSpec[];
};

export async function seedDatabase(db: DB) {
  const now = Date.now();
  const passwordHash = await hashPassword("demo1234");
  const rand = mulberry32(20260301);

  await db.transaction(async (tx) => {
    /* ----------------------------- Categories ---------------------------- */
    const catRows = await tx
      .insert(categories)
      .values([
        { code: "TOWER-A", name: "Tower A", type: "UNIT", description: "Residential and retail floors of the main tower.", color: "indigo", sortOrder: 10 },
        { code: "TOWER-B", name: "Tower B", type: "UNIT", description: "Secondary residential tower.", color: "violet", sortOrder: 20 },
        { code: "PODIUM", name: "Podium & Retail", type: "UNIT", description: "Ground-floor retail and lobby areas.", color: "orange", sortOrder: 30 },
        { code: "BASEMENT", name: "Basement Plant", type: "UNIT", description: "Pump, electrical and comms plant rooms.", color: "slate", sortOrder: 40 },
        { code: "AMENITY", name: "Amenities", type: "UNIT", description: "Gym, pool deck, parking and other shared facilities.", color: "emerald", sortOrder: 50 },
        { code: "LIFTS", name: "Lifts & Vertical Transport", type: "ASSET", description: "Passenger and goods lifts, escalators.", color: "sky", sortOrder: 10 },
        { code: "HVAC-PLANT", name: "HVAC Plant", type: "ASSET", description: "Chillers, AHUs, cooling towers and fans.", color: "sky", sortOrder: 20 },
        { code: "WATER", name: "Water & Pumps", type: "ASSET", description: "Booster sets, tanks and treatment.", color: "sky", sortOrder: 30 },
        { code: "POWER", name: "Power & Backup", type: "ASSET", description: "LV switchgear, generators, UPS and ATS.", color: "amber", sortOrder: 40 },
        { code: "SECURITY", name: "Security Systems", type: "ASSET", description: "CCTV, access control and perimeter detection.", color: "rose", sortOrder: 50 },
        { code: "NETWORK", name: "Network & Telephony", type: "ASSET", description: "Switches, Wi-Fi, structured cabling and PBX.", color: "violet", sortOrder: 60 },
        { code: "COMPLIANCE", name: "Statutory Inspection", type: "TICKET", description: " legally mandated checks and certifications.", color: "rose", sortOrder: 10 },
        { code: "PREVENTIVE", name: "Preventive Maintenance", type: "TICKET", description: "Scheduled servicing ahead of failure.", color: "emerald", sortOrder: 20 },
        { code: "COSMETIC", name: "Cosmetic / Minor", type: "TICKET", description: "Non-urgent cosmetic defects, no service impact.", color: "slate", sortOrder: 90 },
      ])
      .returning();
    const C = Object.fromEntries(catRows.map((c) => [c.code, c]));

    /* ------------------------------- Units ------------------------------- */
    const unitRows = await tx
      .insert(units)
      .values([
        { code: "LOBBY", name: "Main Lobby & Reception", type: "COMMON_AREA", floor: "Ground Floor", floorLevel: 0, occupantName: "Front Desk", contactPhone: "+971 4 555 0100", contactEmail: "frontdesk@marinaheights.example", areaSqm: 420 },
        { code: "1A", name: "Al Shifa Pharmacy", type: "COMMERCIAL", floor: "Ground Floor", floorLevel: 0, occupantName: "Dr. Samir Aziz", contactPhone: "+971 4 555 0111", contactEmail: "g1a@alshifa.example", areaSqm: 95 },
        { code: "2A", name: "Swift Mart Mini-Market", type: "COMMERCIAL", floor: "Ground Floor", floorLevel: 0, occupantName: "Ravi Pillai", contactPhone: "+971 4 555 0122", contactEmail: "store@swiftmart.example", areaSqm: 140 },
        { code: "4B", name: "Mado Coffee", type: "COMMERCIAL", floor: "Ground Floor", floorLevel: 0, occupantName: "Emre Yilmaz (Store Manager)", contactPhone: "+971 50 214 7781", contactEmail: "g4b@madocoffee.example", areaSqm: 180, notes: "Trading 06:00–01:00. Kitchen with grease trap, walk-in chiller, 2 POS tills." },
        { code: "SEC-01", name: "Security Control Room", type: "TECHNICAL", floor: "Ground Floor", floorLevel: 0, occupantName: "Security Supervisor", contactPhone: "+971 4 555 0199", areaSqm: 24 },
        { code: "B1-PUMP", name: "Pump Room", type: "TECHNICAL", floor: "Basement B1", floorLevel: -1, areaSqm: 60 },
        { code: "B1-ELEC", name: "LV Electrical & Generator Room", type: "TECHNICAL", floor: "Basement B1", floorLevel: -1, areaSqm: 85 },
        { code: "B1-COMMS", name: "Server & Comms Room", type: "TECHNICAL", floor: "Basement B1", floorLevel: -1, areaSqm: 18, notes: "Hyper-V host HV-01, core switch, ISP demarc. FM-200 protected." },
        { code: "B1-PARK", name: "Basement Parking", type: "COMMON_AREA", floor: "Basement B1", floorLevel: -1, areaSqm: 3200 },
        { code: "L1-GYM", name: "Gym & Pool Deck", type: "COMMON_AREA", floor: "Level 1", floorLevel: 1, areaSqm: 310 },
        { code: "L1-MGMT", name: "Management Office", type: "COMMON_AREA", floor: "Level 1", floorLevel: 1, occupantName: "Omar Haddad", contactPhone: "+971 4 555 0150", areaSqm: 55 },
        { code: "305", name: "Apartment 305", type: "RESIDENTIAL", floor: "Level 3", floorLevel: 3, occupantName: "Fatima Noor", contactPhone: "+971 50 118 3305", contactEmail: "fatima.noor@example.com", areaSqm: 112 },
        { code: "407", name: "Apartment 407", type: "RESIDENTIAL", floor: "Level 4", floorLevel: 4, occupantName: "Daniel & Grace Mensah", contactPhone: "+971 55 310 4420", areaSqm: 128 },
        { code: "512", name: "Apartment 512", type: "RESIDENTIAL", floor: "Level 5", floorLevel: 5, occupantName: "Arjun Mehta", contactPhone: "+971 56 402 5120", contactEmail: "arjun.mehta@example.com", areaSqm: 96 },
        { code: "608", name: "Apartment 608", type: "RESIDENTIAL", floor: "Level 6", floorLevel: 6, occupantName: "Layla Haddad", contactPhone: "+971 50 660 8080", areaSqm: 104 },
        { code: "710", name: "Apartment 710", type: "RESIDENTIAL", floor: "Level 7", floorLevel: 7, occupantName: null, notes: "Vacant — ready to let. Viewings via management office.", areaSqm: 118 },
        { code: "904", name: "Apartment 904", type: "RESIDENTIAL", floor: "Level 9", floorLevel: 9, occupantName: "Chen Jing", contactPhone: "+971 52 777 9012", areaSqm: 132 },
        { code: "1201", name: "Penthouse 1201", type: "RESIDENTIAL", floor: "Level 12", floorLevel: 12, occupantName: "Khalid Al Suwaidi", contactPhone: "+971 50 120 1201", areaSqm: 310 },
        { code: "ROOF", name: "Rooftop Plant Room", type: "TECHNICAL", floor: "Roof", floorLevel: 13, areaSqm: 450 },
      ])
      .returning();
    const U = Object.fromEntries(unitRows.map((u) => [u.code, u]));

    // Attach the location categories to the seeded units.
    await tx
      .update(units)
      .set({ categoryId: C.BASEMENT.id })
      .where(inArray(units.code, ["B1-PUMP", "B1-ELEC", "B1-COMMS", "ROOF"]));
    await tx.update(units).set({ categoryId: C.PODIUM.id }).where(inArray(units.code, ["LOBBY", "1A", "2A", "4B", "SEC-01", "L1-MGMT"]));
    await tx.update(units).set({ categoryId: C.AMENITY.id }).where(inArray(units.code, ["B1-PARK", "L1-GYM"]));
    await tx.update(units).set({ categoryId: C["TOWER-A"].id }).where(inArray(units.code, ["305", "407", "512", "1201"]));
    await tx.update(units).set({ categoryId: C["TOWER-B"].id }).where(inArray(units.code, ["608", "710", "904"]));

    /* ------------------------------- Users ------------------------------- */
    const userRows = await tx
      .insert(users)
      .values([
        { name: "Sara Al-Mansouri", email: "admin@marina.local", passwordHash, role: "ADMIN", title: "Facility Director", phone: "+971 50 100 2001", skills: [] },
        { name: "Omar Haddad", email: "manager@marina.local", passwordHash, role: "MANAGER", title: "Property Manager", phone: "+971 50 100 2002", unitId: U["L1-MGMT"].id, skills: [] },
        { name: "Rajesh Kumar", email: "tech@marina.local", passwordHash, role: "TECHNICIAN", title: "IT & Security Engineer", phone: "+971 50 100 2003", skills: ["ACCESS_CONTROL", "LOCK_ENCODER", "VOIP_PBX", "NETWORK"] },
        { name: "Li Wei", email: "liwei@marina.local", passwordHash, role: "TECHNICIAN", title: "Low-Current Systems Technician", phone: "+971 50 100 2004", skills: ["CCTV", "ACCESS_CONTROL", "POS_PRINTER", "NETWORK"] },
        { name: "Ahmed Saleh", email: "ahmed@marina.local", passwordHash, role: "TECHNICIAN", title: "MEP Technician (HVAC & Plumbing)", phone: "+971 50 100 2005", skills: ["HVAC", "PLUMBING", "WATER_PUMP"] },
        { name: "Joseph Mathew", email: "joseph@marina.local", passwordHash, role: "TECHNICIAN", title: "Electrical Technician", phone: "+971 50 100 2006", skills: ["ELECTRICAL", "SUB_METER", "WATER_PUMP"] },
        { name: "Emre Yilmaz", email: "tenant@marina.local", passwordHash, role: "TENANT", title: "Store Manager — Mado Coffee", phone: "+971 50 214 7781", unitId: U["4B"].id, skills: [] },
        { name: "Fatima Noor", email: "fatima@marina.local", passwordHash, role: "TENANT", title: "Resident — Apt 305", phone: "+971 50 118 3305", unitId: U["305"].id, skills: [] },
      ])
      .returning();
    const byEmail = Object.fromEntries(userRows.map((u) => [u.email, u]));
    const email = (key: string) => (key.includes("@") ? key : `${key}@marina.local`);
    const userOf = (key: string) => byEmail[email(key)];

    await tx.update(users).set({ lastLoginAt: new Date(now - 2 * H) });

    /* ------------------------------- Assets ------------------------------ */
    type AssetSeed = Omit<typeof assets.$inferInsert, "qrToken"> & { unitCode?: string };
    const assetSeeds: AssetSeed[] = [
      // HVAC
      { tag: "HVAC-CH-01", name: "Air-cooled Chiller CH-01", domain: "HVAC", unitCode: "ROOF", locationDetail: "Rooftop, east bay", manufacturer: "Carrier", model: "AquaForce 30XA-502", serialNumber: "CAR30XA-18-22871", criticality: "CRITICAL", environment: { Refrigerant: "R-134a", Capacity: "500 TR", "Supply setpoint": "6.7 °C", Power: "400 V / 3Ph / 50 Hz" }, specs: { "BMS point": "BACnet device 1001", Compressors: "4 × screw", "Last oil analysis": "2026-01-12" }, installedAt: "2018-06-01", warrantyUntil: "2025-06-01" },
      { tag: "HVAC-AHU-LB", name: "Lobby Air Handling Unit AHU-01", domain: "HVAC", unitCode: "LOBBY", locationDetail: "Ceiling void above reception", manufacturer: "Trane", model: "CSAA012", serialNumber: "TRN-AHU-0193", criticality: "HIGH", status: "MAINTENANCE", environment: { Airflow: "12,000 CFM", Filter: "MERV 13 bag 592×592×635", Schedule: "24/7" }, specs: { VFD: "Danfoss FC-102 7.5 kW", "BMS point": "BACnet device 1101" }, installedAt: "2018-06-01" },
      { tag: "HVAC-SPL-4B", name: "Mado Coffee Dining Split AC", domain: "HVAC", unitCode: "4B", locationDetail: "Dining hall, wall above banquette", manufacturer: "Daikin", model: "FTKF71 / RKF71", serialNumber: "DKN-FTKF71-55120", criticality: "HIGH", status: "DEGRADED", environment: { Capacity: "24,000 BTU/h", Refrigerant: "R-32", "Operating hours": "06:00–01:00" }, specs: { "Error history": "U4 (comms) ×2", Breaker: "DB-4B way 7 (20 A)" }, installedAt: "2022-09-15", warrantyUntil: "2027-09-15" },
      { tag: "HVAC-VRF-RT", name: "VRF Outdoor Unit – Retail Block", domain: "HVAC", unitCode: "ROOF", locationDetail: "Rooftop, west bay", manufacturer: "Mitsubishi Electric", model: "City Multi PUHY-P400", serialNumber: "ME-PUHY-77410", criticality: "HIGH", environment: { Serves: "Units 1A, 2A (retail)", Refrigerant: "R-410A" }, specs: { "Central controller": "AE-200E @ 192.168.50.40" }, installedAt: "2019-03-10" },
      { tag: "HVAC-FCU-305", name: "Fan Coil Unit – Apt 305", domain: "HVAC", unitCode: "305", locationDetail: "Master bedroom ceiling", manufacturer: "Carrier", model: "42CE-004", serialNumber: "CAR42CE-305-A", criticality: "STANDARD", environment: { Thermostat: "Honeywell T6 (Modbus)", Valve: "2-way motorised" }, specs: {}, installedAt: "2018-06-01" },
      { tag: "HVAC-FCU-1201", name: "Fan Coil Units – Penthouse 1201", domain: "HVAC", unitCode: "1201", locationDetail: "Living room bulkhead (3 units)", manufacturer: "Carrier", model: "42CE-008", serialNumber: "CAR42CE-1201-A/B/C", criticality: "STANDARD", environment: { Zones: "Living, Master, Guest" }, specs: {}, installedAt: "2018-06-01" },
      // Plumbing
      { tag: "PLB-RSR-A", name: "Domestic Water Riser – Tower A", domain: "PLUMBING", unitCode: "B1-PUMP", locationDetail: "Riser shaft R1, all floors", manufacturer: "Georg Fischer", model: "PP-R DN100 riser", criticality: "HIGH", environment: { "Pressure zones": "B1–L6 / L7–L12 (PRV)" }, specs: { PRV: "L7 riser, set 3.5 bar" }, installedAt: "2018-06-01" },
      { tag: "PLB-GT-4B", name: "Grease Trap – Mado Coffee Kitchen", domain: "PLUMBING", unitCode: "4B", locationDetail: "Under kitchen prep sink", manufacturer: "ACO", model: "GreasePak 250", criticality: "STANDARD", environment: { Capacity: "250 L", "Service interval": "Monthly" }, specs: { "Last pump-out": "2026-02-20" }, installedAt: "2022-09-15" },
      { tag: "PLB-WH-407", name: "Water Heater – Apt 407", domain: "PLUMBING", unitCode: "407", locationDetail: "Utility cupboard", manufacturer: "Ariston", model: "PRO1 R 80 V", serialNumber: "ARS-80V-40721", criticality: "STANDARD", status: "DEGRADED", environment: { Capacity: "80 L", Power: "1.5 kW / 230 V" }, specs: { "T&P valve": "3/4\" 7 bar / 90 °C" }, installedAt: "2020-02-11" },
      // Electrical
      { tag: "ELE-MDB-01", name: "Main LV Switchboard MDB-01", domain: "ELECTRICAL", unitCode: "B1-ELEC", locationDetail: "LV room, panel row A", manufacturer: "Schneider Electric", model: "Prisma P 3200 A", serialNumber: "SE-MDB-01-2018", criticality: "CRITICAL", environment: { Incomer: "3200 A ACB (Masterpact MTZ)", Supply: "11 kV / 400 V transformer TX-01", Earthing: "TN-S" }, specs: { "Protection relay": "Micrologic 5.0 X", "Last IR scan": "2026-01-28" }, installedAt: "2018-05-20" },
      { tag: "ELE-GEN-01", name: "Standby Generator GEN-01", domain: "ELECTRICAL", unitCode: "B1-ELEC", locationDetail: "Generator room, acoustic enclosure", manufacturer: "FG Wilson", model: "P500-3 (Perkins 2506A)", serialNumber: "FGW-P500-18-3321", criticality: "CRITICAL", environment: { Rating: "500 kVA prime", Fuel: "Diesel, 1,000 L day tank", "ATS transfer": "< 15 s" }, specs: { Controller: "DSE 7320 MKII", "Run hours": "1,284 h" }, installedAt: "2018-05-20" },
      { tag: "ELE-DB-4B", name: "Distribution Board DB-4B", domain: "ELECTRICAL", unitCode: "4B", locationDetail: "Back-of-house corridor", manufacturer: "ABB", model: "MISTRAL65 36-way", criticality: "STANDARD", environment: { Supply: "63 A TP from SMDB-G" }, specs: {}, installedAt: "2022-09-15" },
      // Sub-meters
      { tag: "MTR-E-4B", name: "Electricity Sub-meter – Mado Coffee", domain: "SUB_METER", unitCode: "4B", locationDetail: "Meter room G-MR, position 4", manufacturer: "Schneider Electric", model: "iEM3255", serialNumber: "SE-IEM-4B-88120", meterUnit: "kWh", criticality: "HIGH", environment: { "CT ratio": "100/5 A", "Billing cycle": "Monthly, 1st" }, specs: { "Modbus ID": "14", Protocol: "Modbus RTU → BMS" }, installedAt: "2022-09-15" },
      { tag: "MTR-W-4B", name: "Water Sub-meter – Mado Coffee", domain: "SUB_METER", unitCode: "4B", locationDetail: "Kitchen isolation valve cupboard", manufacturer: "Sensus", model: "620C DN20", serialNumber: "SNS-620-4B-1102", meterUnit: "m³", criticality: "STANDARD", environment: { "Pulse output": "1 pulse / 10 L" }, specs: {}, installedAt: "2022-09-15" },
      { tag: "MTR-E-1A", name: "Electricity Sub-meter – Al Shifa Pharmacy", domain: "SUB_METER", unitCode: "1A", locationDetail: "Meter room G-MR, position 1", manufacturer: "Schneider Electric", model: "iEM3255", serialNumber: "SE-IEM-1A-88101", meterUnit: "kWh", criticality: "STANDARD", environment: { "CT ratio": "60/5 A" }, specs: { "Modbus ID": "11" }, installedAt: "2019-01-10" },
      { tag: "MTR-E-305", name: "Electricity Sub-meter – Apt 305", domain: "SUB_METER", unitCode: "305", locationDetail: "L3 electrical riser cupboard", manufacturer: "ABB", model: "B23 112-100", serialNumber: "ABB-B23-305", meterUnit: "kWh", criticality: "STANDARD", environment: { Type: "Direct connected 65 A" }, specs: {}, installedAt: "2018-06-01" },
      { tag: "MTR-W-305", name: "Water Sub-meter – Apt 305", domain: "SUB_METER", unitCode: "305", locationDetail: "L3 plumbing riser cupboard", manufacturer: "Sensus", model: "620C DN15", serialNumber: "SNS-620-305", meterUnit: "m³", criticality: "STANDARD", environment: {}, specs: {}, installedAt: "2018-06-01" },
      { tag: "MTR-E-1201", name: "Electricity Sub-meter – Penthouse 1201", domain: "SUB_METER", unitCode: "1201", locationDetail: "L12 electrical riser cupboard", manufacturer: "ABB", model: "B23 112-100", serialNumber: "ABB-B23-1201", meterUnit: "kWh", criticality: "STANDARD", environment: { Type: "Direct connected 65 A" }, specs: {}, installedAt: "2018-06-01" },
      // Water pumps
      { tag: "PMP-BST-01", name: "Booster Pump Set BP-01", domain: "WATER_PUMP", unitCode: "B1-PUMP", locationDetail: "Pump room, north wall", manufacturer: "Grundfos", model: "Hydro MPC-E 3 CRE 15-3", serialNumber: "GF-MPC-98822101", criticality: "CRITICAL", environment: { Setpoint: "4.5 bar", Configuration: "2 duty + 1 standby", Power: "400 V / 3Ph" }, specs: { Controller: "CU 352", "Pressure transmitter": "Replaced 2026-02 (0–16 bar)" }, installedAt: "2018-06-01" },
      { tag: "PMP-TRF-02", name: "Transfer Pump TP-02", domain: "WATER_PUMP", unitCode: "B1-PUMP", locationDetail: "Pump room, beside break tank", manufacturer: "Grundfos", model: "CR 10-6", serialNumber: "GF-CR10-6-44120", criticality: "HIGH", environment: { Duty: "Break tank → roof tank" }, specs: {}, installedAt: "2018-06-01" },
      { tag: "PMP-SMP-B1", name: "Sump Pump SP-B1 (Parking)", domain: "WATER_PUMP", unitCode: "B1-PARK", locationDetail: "Parking ramp sump pit", manufacturer: "Grundfos", model: "Unilift AP35.50", criticality: "STANDARD", environment: { Float: "Automatic" }, specs: {}, installedAt: "2018-06-01" },
      // Access control
      { tag: "ACC-ZK-MAIN", name: "ZKTeco SpeedFace-V5L – Main Entrance", domain: "ACCESS_CONTROL", unitCode: "LOBBY", locationDetail: "Main glass door, left pillar", manufacturer: "ZKTeco", model: "SpeedFace-V5L [P]", serialNumber: "CKPG221260117", ipAddress: "192.168.10.21", firmware: "ZAM180-NF-Ver6.4.1", criticality: "CRITICAL", status: "DOWN", environment: { "Lock type": "Maglock 600 lbf (fail-safe)", "Fire release": "Linked to FACP relay", Modes: "Face / Palm / Card · 24/7" }, specs: { "Comm port": "TCP 4370", "Comm key": "Set (see vault)", "Users enrolled": "412", Controller: "inBio460 door 1", Server: "ZKBio CVSecurity 6.1 @ 192.168.10.5" }, installedAt: "2023-02-01", warrantyUntil: "2026-02-01" },
      { tag: "ACC-ZK-INBIO", name: "ZKTeco inBio460 Door Controller", domain: "ACCESS_CONTROL", unitCode: "SEC-01", locationDetail: "Security room rack, U12", manufacturer: "ZKTeco", model: "inBio460 Pro", serialNumber: "AJ7Y184860012", ipAddress: "192.168.10.20", firmware: "AC Ver 5.7.8.3033", criticality: "CRITICAL", environment: { Doors: "Main, Parking gate, Gym, Service", Power: "12 V DC + 7 Ah battery" }, specs: { "Comm port": "TCP 4370" }, installedAt: "2023-02-01" },
      { tag: "ACC-ZK-PARK", name: "ZKTeco ProCapture-X – Parking Gate", domain: "ACCESS_CONTROL", unitCode: "B1-PARK", locationDetail: "Ramp entry barrier, driver side", manufacturer: "ZKTeco", model: "ProCapture-X", serialNumber: "CKPX224060033", ipAddress: "192.168.10.22", firmware: "ZMM220-Ver6.60", criticality: "HIGH", environment: { Barrier: "ZKTeco PB4000 (4 s)", Modes: "Card / Fingerprint" }, specs: {}, installedAt: "2023-02-01" },
      { tag: "ACC-ZK-GYM", name: "ZKTeco F22 – Gym Door", domain: "ACCESS_CONTROL", unitCode: "L1-GYM", locationDetail: "Gym entrance, right frame", manufacturer: "ZKTeco", model: "F22 (ID)", serialNumber: "BOCK200360211", ipAddress: "192.168.10.23", firmware: "Ver 6.60", criticality: "STANDARD", status: "DOWN", environment: { Hours: "05:00–23:00 residents only" }, specs: {}, installedAt: "2023-02-01" },
      // Lock encoders
      { tag: "LCK-ENC-RCP", name: "proUSB Card Encoder – Reception", domain: "LOCK_ENCODER", unitCode: "LOBBY", locationDetail: "Reception desk, RECEPTION-PC01", manufacturer: "proUSB", model: "USB card encoder V9", serialNumber: "PU-ENC-2203-0417", criticality: "HIGH", environment: { "Card type": "Mifare 1K", Software: "proUSB V9.3 / eLock", "Host PC": "RECEPTION-PC01 (Windows 10 Pro)" }, specs: { Database: "Access .mdb in install folder", Backup: "Nightly 02:00 → NAS" }, installedAt: "2022-03-01" },
      { tag: "LCK-ENC-MGT", name: "Card Encoder – Management Office", domain: "LOCK_ENCODER", unitCode: "L1-MGMT", locationDetail: "Manager desk, MGMT-PC02", manufacturer: "proUSB", model: "USB card encoder V9", serialNumber: "PU-ENC-2203-0418", criticality: "STANDARD", environment: { Purpose: "Backup encoder / master cards" }, specs: {}, installedAt: "2022-03-01" },
      // VoIP / PBX
      { tag: "PBX-VM-01", name: "FreePBX 16 / Asterisk 18 VM – PBX-01", domain: "VOIP_PBX", unitCode: "B1-COMMS", locationDetail: "Hyper-V host HV-01", manufacturer: "Sangoma", model: "FreePBX 16 (SNG7)", ipAddress: "192.168.20.5", firmware: "FreePBX 16.0.40 · Asterisk 18.20", criticality: "CRITICAL", environment: { Hypervisor: "Hyper-V Gen 2 VM on HV-01", "vCPU / RAM": "4 vCPU / 8 GB", Extensions: "64", Trunks: "2 × SIP (primary + failover)" }, specs: { "Secure Boot": "MicrosoftUEFICertificateAuthority", "Auto-start": "Enabled, 60 s delay", "Deployment ID": "Stored in vault" }, installedAt: "2021-11-20" },
      { tag: "PBX-HV-01", name: "Hyper-V Host HV-01 (Dell PowerEdge R450)", domain: "VOIP_PBX", unitCode: "B1-COMMS", locationDetail: "Comms rack A, U20–21", manufacturer: "Dell", model: "PowerEdge R450", serialNumber: "SVCTAG-7HX2Q93", ipAddress: "192.168.20.2", firmware: "BIOS 1.13.2 · iDRAC 7.00", criticality: "CRITICAL", environment: { OS: "Windows Server 2022 Datacenter", VMs: "PBX-01, ZKBIO-01", UPS: "APC SMT3000RMI2U" }, specs: { iDRAC: "192.168.20.3", RAID: "PERC H755 · RAID 10" }, installedAt: "2021-11-20", warrantyUntil: "2026-11-20" },
      { tag: "PBX-TEL-RCP", name: "Yealink T54W – Reception Handset", domain: "VOIP_PBX", unitCode: "LOBBY", locationDetail: "Reception desk, position 1", manufacturer: "Yealink", model: "SIP-T54W", ipAddress: "192.168.20.101", firmware: "96.86.0.75", criticality: "STANDARD", environment: { Extension: "100 (Reception hunt group)" }, specs: { VLAN: "20 (LLDP-MED)" }, installedAt: "2021-11-20" },
      // POS / printers
      { tag: "POS-TRM-4B", name: "POS Terminal – Mado Coffee Till 1", domain: "POS_PRINTER", unitCode: "4B", locationDetail: "Front counter, till 1", manufacturer: "Sunmi", model: "T2s", serialNumber: "T2S-4B-01-9912", ipAddress: "192.168.30.50", firmware: "Sunmi OS 2.4.1", criticality: "HIGH", environment: { "POS software": "Foodics POS (Android)", Network: "POS VLAN 30", "Trading hours": "06:00–01:00" }, specs: {}, installedAt: "2022-09-15" },
      { tag: "POS-PRN-4B", name: "Epson TM-T88VI Receipt Printer – Mado Coffee", domain: "POS_PRINTER", unitCode: "4B", locationDetail: "Front counter, till 1", manufacturer: "Epson", model: "TM-T88VI", serialNumber: "X6ZL012345", ipAddress: "192.168.30.51", firmware: "30.01 ESC/POS", criticality: "HIGH", status: "DOWN", environment: { Interface: "Ethernet", Paper: "80 mm thermal", Port: "TCP 9100 RAW" }, specs: { MAC: "00:26:AB:4B:10:51" }, installedAt: "2022-09-15" },
      { tag: "POS-KIT-4B", name: "Epson TM-U220 Kitchen Printer – Mado Coffee", domain: "POS_PRINTER", unitCode: "4B", locationDetail: "Kitchen pass station", manufacturer: "Epson", model: "TM-U220B", serialNumber: "G7XF043210", ipAddress: "192.168.30.52", criticality: "HIGH", environment: { Paper: "76 mm impact, 2-ply", Routing: "Hot kitchen + desserts" }, specs: { MAC: "00:26:AB:4B:10:52" }, installedAt: "2022-09-15" },
      { tag: "POS-PRN-2A", name: "Receipt Printer – Swift Mart", domain: "POS_PRINTER", unitCode: "2A", locationDetail: "Checkout 1", manufacturer: "Epson", model: "TM-T20III", ipAddress: "192.168.30.61", criticality: "STANDARD", environment: { Paper: "80 mm thermal" }, specs: {}, installedAt: "2021-05-01" },
      // CCTV
      { tag: "CCTV-NVR-01", name: "Hikvision NVR DS-7732NI-K4", domain: "CCTV", unitCode: "SEC-01", locationDetail: "Security room rack, U8", manufacturer: "Hikvision", model: "DS-7732NI-K4", serialNumber: "DS-7732NI-K4-20210915", ipAddress: "192.168.40.10", firmware: "V4.62.210", criticality: "CRITICAL", environment: { Channels: "32 (27 in use)", Storage: "4 × 6 TB (RAID 5)", Retention: "30 days" }, specs: { "HDD 3": "Replaced — WD62PURZ" }, installedAt: "2021-09-15" },
      { tag: "CCTV-CAM-L01", name: "Lobby Dome Camera CAM-L01", domain: "CCTV", unitCode: "LOBBY", locationDetail: "Lobby ceiling above lift bank", manufacturer: "Hikvision", model: "DS-2CD2143G2-I", ipAddress: "192.168.40.21", criticality: "STANDARD", environment: { Resolution: "4 MP AcuSense" }, specs: { Channel: "D1" }, installedAt: "2021-09-15" },
      { tag: "CCTV-CAM-P03", name: "Parking Bullet Camera CAM-P03", domain: "CCTV", unitCode: "B1-PARK", locationDetail: "Parking ramp, column C3", manufacturer: "Hikvision", model: "DS-2CD2T47G2-L", ipAddress: "192.168.40.33", criticality: "STANDARD", status: "DOWN", environment: { Resolution: "4 MP ColorVu" }, specs: { Channel: "D19" }, installedAt: "2021-09-15" },
      { tag: "CCTV-CAM-G04", name: "Mado Coffee Entrance Camera CAM-G04", domain: "CCTV", unitCode: "4B", locationDetail: "Shopfront canopy", manufacturer: "Hikvision", model: "DS-2CD2143G2-I", ipAddress: "192.168.40.24", criticality: "STANDARD", environment: {}, specs: { Channel: "D4" }, installedAt: "2022-09-15" },
      // Network
      { tag: "NET-CORE-01", name: "Core Switch – Comms Room", domain: "NETWORK", unitCode: "B1-COMMS", locationDetail: "Comms rack A, U40", manufacturer: "Cisco", model: "CBS350-48FP-4G", serialNumber: "PSZ2521R0HX", ipAddress: "192.168.1.2", firmware: "3.2.0.84", criticality: "CRITICAL", environment: { VLANs: "10 Access · 20 Voice · 30 POS · 40 CCTV · 50 Office", Uplink: "1 Gbps fibre ISP + 4G failover" }, specs: { "Config backup": "Nightly TFTP → NAS" }, installedAt: "2021-11-20" },
      { tag: "NET-PC-RCP", name: "Reception Workstation RECEPTION-PC01", domain: "NETWORK", unitCode: "LOBBY", locationDetail: "Reception desk", manufacturer: "Dell", model: "OptiPlex 7010", ipAddress: "192.168.50.21", firmware: "Windows 10 Pro 22H2", criticality: "STANDARD", environment: { Peripherals: "proUSB encoder, Zebra label printer" }, specs: {}, installedAt: "2022-03-01" },
      { tag: "NET-PC-MGT", name: "Management Office Workstation MGMT-PC02", domain: "NETWORK", unitCode: "L1-MGMT", locationDetail: "Manager desk", manufacturer: "HP", model: "EliteDesk 800 G6", ipAddress: "192.168.50.22", firmware: "Windows 11 Pro", criticality: "LOW", environment: {}, specs: {}, installedAt: "2022-03-01" },
    ];

    const assetRows = await tx
      .insert(assets)
      .values(
        assetSeeds.map(({ unitCode, ...a }) => ({
          ...a,
          qrToken: randomCode(10),
          unitId: unitCode ? U[unitCode].id : null,
          lastServiceAt: new Date(now - Math.floor(rand() * 60 + 5) * D),
        })),
      )
      .returning();
    const A = Object.fromEntries(assetRows.map((a) => [a.tag, a]));

    /* ------------------------------ Tickets ------------------------------ */
    const specs: TicketSpec[] = [
      {
        asset: "ACC-ZK-MAIN", issue: "MAIN_ENTRANCE_LOCK_FAILURE", scope: "BUILDING", channel: "QR_SCAN", reporter: "Front Desk – Aisha", reporterContact: "+971 4 555 0100",
        description: "Face and fingerprint verification failing at the main entrance since ~07:40. Residents are being let in manually by security. Screen shows the 'network disconnected' icon.",
        ago: 22 * MIN, status: "IN_PROGRESS", assignee: "tech", respondedAfter: 9 * MIN,
        notes: [
          { after: 10 * MIN, by: "tech", body: "On site. Terminal answers ping on 192.168.10.21 but ZKBio shows it offline. ARP shows a second MAC on .21 — IP conflict after the DHCP pool change. Following SOP-ACC-02." },
          { after: 12 * MIN, by: "tech", isPublic: true, body: "Technician on site. A security guard is posted at the entrance until the reader is restored." },
        ],
      },
      {
        asset: "PBX-VM-01", issue: "SIP_TRUNK_DOWN", scope: "BUILDING", channel: "API", reporter: "Zabbix Monitoring", externalRef: "zabbix:evt-88213",
        description: "Zabbix trigger: SIP trunk 'carrier-primary' UNREACHABLE on PBX-01 (192.168.20.5). Outbound calls failing with 503; inbound DIDs routing via the failover trunk.",
        ago: 48 * MIN, status: "OPEN", assignee: "tech",
        notes: [{ after: 6 * MIN, by: "manager", body: "Rajesh is on the main-entrance P1. Opened a case with the carrier NOC in parallel (ref NOC-552190)." }],
      },
      {
        asset: "POS-PRN-4B", issue: "THERMAL_PRINTER_FAIL", scope: "SINGLE", channel: "QR_SCAN", reporter: "Emre Yilmaz", reporterUser: "tenant", reporterContact: "+971 50 214 7781",
        description: "Receipt printer at till 1 stopped printing after this morning's power blip. POS shows 'Printer offline'. We're handwriting receipts for customers.",
        ago: 95 * MIN, status: "IN_PROGRESS", assignee: "liwei", respondedAfter: 25 * MIN,
        notes: [
          { after: 27 * MIN, by: "liwei", body: "Status sheet shows IP 192.168.192.168 — interface reset to factory defaults. Re-mapping to 192.168.30.51 per SOP-POS-04." },
          { after: 30 * MIN, by: "liwei", isPublic: true, body: "On site now — printing should be restored within 30 minutes." },
        ],
      },
      {
        asset: "HVAC-SPL-4B", issue: "HVAC_COMMERCIAL_DOWN", scope: "UNIT", channel: "QR_SCAN", reporter: "Barista on shift – Mado Coffee", reporterContact: "+971 50 214 7781",
        description: "Dining area AC blowing warm air; indoor unit display blinking 'U4'. Inside temperature 29 °C and rising — customers complaining.",
        ago: 110 * MIN, status: "OPEN", assignee: "ahmed",
      },
      {
        asset: "ACC-ZK-GYM", issue: "ACCESS_DEVICE_OFFLINE", scope: "UNIT", channel: "PORTAL", reporter: "Omar Haddad", reporterUser: "manager",
        description: "Gym door F22 terminal has a blank screen and does not respond to fingerprints. Residents are being let in by security.",
        ago: 6 * H, status: "PENDING_PARTS", assignee: "liwei", respondedAfter: 40 * MIN, pausedAfter: 90 * MIN,
        partsNote: "Terminal PSU board failed (no 12 V output). Replacement F22 ordered from the ZKTeco distributor — PO-2291, ETA tomorrow 10:00. Door set to card-only via the inBio panel meanwhile.",
      },
      {
        asset: "PLB-WH-407", issue: "LOCALIZED_LEAK", scope: "UNIT", channel: "PHONE", reporter: "Grace Mensah", reporterContact: "+971 55 310 4420",
        description: "Water dripping from the water heater in the utility cupboard — a small puddle is forming.",
        ago: 3 * H, status: "IN_PROGRESS", assignee: "ahmed", respondedAfter: 70 * MIN,
        notes: [{ after: 75 * MIN, by: "ahmed", body: "T&P relief valve passing. Isolated the heater; replacing the valve from van stock." }],
      },
      {
        asset: "PBX-VM-01", issue: "PBX_HOST_DOWN", scope: "BUILDING", channel: "API", reporter: "Zabbix Monitoring", externalRef: "zabbix:evt-88190",
        description: "Zabbix trigger: PBX-01 (192.168.20.5) unreachable — ICMP loss 100% for 5 min. All handsets show 'No Service'; reception reports no incoming calls.",
        ago: 190 * MIN, status: "RESOLVED", assignee: "tech", respondedAfter: 12 * MIN, resolvedAfter: 125 * MIN,
        resolution: "Root cause: unattended kernel update left GRUB without a valid default entry. Booted manually from grub>, regenerated grub.cfg, rebuilt the initramfs with Hyper-V drivers and verified an unattended reboot. Asterisk 18 up; inbound, outbound and internal calls tested OK. Checkpoint retained for 24 h.",
        notes: [
          { after: 14 * MIN, by: "tech", body: "VMConnect shows the VM stuck at a grub> prompt after last night's automatic kernel update. Taking a checkpoint and following SOP-PBX-03." },
          { after: 20 * MIN, by: "tech", isPublic: true, body: "Engineer working on the phone system. Please use mobile 050 555 0199 for reception meanwhile." },
          { after: 95 * MIN, by: "tech", type: "AUDIT_CAPTURE", body: "Boot recovery completed and verified.", metadata: { captureType: "BOOT_RECOVERY", fields: { host: "HV-01 / PBX-01", failureMode: "grub> prompt after kernel update", kernel: "3.10.0-1160.119.1.el7.x86_64", actionTaken: "Manual boot, grub2-mkconfig (UEFI), dracut -f with hv_* drivers", checkpoint: "pre-grub-fix-PBX01" }, sensitiveKeys: [] } },
          { after: 115 * MIN, by: "tech", type: "AUDIT_CAPTURE", body: "Commercial modules re-activated after recovery.", metadata: { captureType: "LICENSE_KEY", fields: { product: "FreePBX Commercial – EndPoint Manager + Class of Service", licenseKey: "FPBX-7Q4K-M2ZD-8R1C-XW3N", deploymentId: "Deployment 812345 · 00:15:5D:0A:14:05", seats: "64", expiry: "2027-03-31" }, sensitiveKeys: ["licenseKey"] } },
        ],
      },
      {
        asset: "CCTV-CAM-P03", issue: "CAMERA_OFFLINE", scope: "SINGLE", channel: "API", reporter: "NVR event webhook", externalRef: "hik:videoloss:D19",
        description: "NVR reports VIDEO LOSS on channel D19 (CAM-P03, parking ramp).",
        ago: 5 * H, status: "OPEN", assignee: "liwei",
      },
      {
        asset: "MTR-E-4B", issue: "CONSUMPTION_ANOMALY", scope: "UNIT", channel: "PORTAL", reporter: "Meter anomaly engine",
        description: "Daily consumption 468 kWh vs 7-day average 204 kWh (2.3×). Flagged automatically on reading entry.",
        ago: 20 * H, status: "IN_PROGRESS", assignee: "joseph", respondedAfter: 6 * H,
        notes: [{ after: 6 * H + 10 * MIN, by: "joseph", body: "Clamp test on DB-4B: walk-in chiller compressor drawing 38 A continuously — suspected failed defrost timer. Informed the Mado manager; refrigeration contractor visit arranged." }],
      },
      {
        asset: "NET-PC-RCP", issue: "WORKSTATION_TWEAK", scope: "SINGLE", channel: "PORTAL", reporter: "Front Desk – Aisha",
        description: "Please install the Zebra label printer driver and map the shared 'Move-in Packs' folder on the reception PC.",
        ago: 30 * H, status: "IN_PROGRESS", assignee: "tech", respondedAfter: 9 * H,
      },
      {
        asset: "HVAC-FCU-305", issue: "HVAC_TEMP_ADJUST", scope: "UNIT", channel: "PORTAL", reporter: "Fatima Noor", reporterUser: "fatima",
        description: "Bedroom stays at 27 °C even with the thermostat set to 21 °C.",
        ago: 4 * H, status: "OPEN", assignee: "ahmed",
      },
      {
        unit: "904", domain: "PLUMBING", issue: "DRIP_SLOW_DRAIN", scope: "UNIT", channel: "PHONE", reporter: "Chen Jing", reporterContact: "+971 52 777 9012",
        description: "Kitchen tap dripping constantly and the sink drains slowly.",
        ago: 50 * MIN, status: "OPEN", assignee: "ahmed",
      },
      {
        asset: "ACC-ZK-MAIN", issue: "ENROLMENT_REQUEST", scope: "SINGLE", channel: "PORTAL", reporter: "Emre Yilmaz", reporterUser: "tenant",
        title: "Enrol 3 new Mado Coffee baristas (face + card)",
        description: "Please enrol 3 new baristas for the staff entrance: Ali R., Maria S., Tomas P. Start date Monday.",
        ago: 10 * H, status: "OPEN", assignee: "liwei",
      },
      {
        asset: "ACC-ZK-PARK", issue: "ACCESS_LOG_REQUEST", scope: "SINGLE", channel: "EMAIL", reporter: "Arjun Mehta (Apt 512)", reporterContact: "arjun.mehta@example.com",
        description: "Requesting the parking gate access log for 12–14 March for an insurance claim (scratched vehicle).",
        ago: 26 * H, status: "IN_PROGRESS", assignee: "liwei", respondedAfter: 5 * H,
        notes: [{ after: 5 * H + 10 * MIN, by: "manager", body: "Approved by management — export only entries for the bay P-512 card, per privacy policy." }],
      },
      {
        asset: "HVAC-AHU-LB", issue: "HVAC_FILTER_SERVICE", scope: "SINGLE", channel: "PORTAL", reporter: "Omar Haddad", reporterUser: "manager",
        description: "Quarterly filter change due on the lobby AHU; differential pressure alarm at 250 Pa.",
        ago: 2 * D, status: "PENDING_PARTS", assignee: "ahmed", respondedAfter: 20 * H, pausedAfter: 22 * H,
        partsNote: "MERV 13 bag filters (592×592×635) out of stock — 6 pcs ordered, PO-2288, ETA 3 days.",
      },
      {
        asset: "LCK-ENC-RCP", issue: "LOCK_DB_ERROR", scope: "UNIT", channel: "PHONE", reporter: "Front Desk – Aisha",
        description: "proUSB shows 'Database connect error' on start-up; cannot issue key cards for the Apt 710 move-in at 15:00.",
        ago: 26 * H + 30 * MIN, status: "RESOLVED", assignee: "tech", respondedAfter: 35 * MIN, resolvedAfter: 3 * H,
        resolution: "Database repaired with Compact & Repair (Jet 4.0) after a full backup; DAO re-registered; encoder re-linked on a rear USB port. Three test cards issued and verified on test door 101. Nightly robocopy backup scheduled at 02:00 to the NAS.",
        notes: [
          { after: 45 * MIN, by: "tech", body: "The .mdb reports 'Unrecognized database format' — likely corruption from Tuesday's power cut. Backing up and running compact & repair per SOP-LCK-01." },
          { after: 160 * MIN, by: "tech", type: "AUDIT_CAPTURE", body: "Encoder re-registered after database repair.", metadata: { captureType: "ENCODER_REGISTRATION", fields: { encoderSerial: "PU-ENC-2203-0417", software: "proUSB V9.3 / eLock", systemCode: "MH-8841-2203", registrationCode: "REG-55KD-91QX-7TPA", workstation: "RECEPTION-PC01 · USB HID" }, sensitiveKeys: ["systemCode", "registrationCode"] } },
        ],
      },
      {
        asset: "PMP-TRF-02", issue: "PUMP_ROUTINE", scope: "SINGLE", channel: "PORTAL", reporter: "Omar Haddad", reporterUser: "manager",
        description: "Quarterly inspection of transfer pump TP-02.",
        ago: 30 * H, status: "RESOLVED", assignee: "joseph", respondedAfter: 4 * H, resolvedAfter: 6 * H,
        resolution: "Inspection complete: vibration 2.1 mm/s (OK), mechanical seal dry, motor 38 °C, insulation 500 MΩ.",
      },
      {
        asset: "PMP-BST-01", issue: "PUMP_FAILURE_NO_SUPPLY", scope: "BUILDING", channel: "PHONE", reporter: "Security Control Room", reporterContact: "+971 4 555 0199",
        description: "No water on any floor. Pump room panel showing a dry-running alarm.",
        ago: 2 * D + 3 * H, status: "CLOSED", assignee: "joseph", respondedAfter: 18 * MIN, resolvedAfter: 200 * MIN, closedAfter: 1 * D,
        resolution: "Break-tank float valve stuck closed after a municipal supply interruption. Tank refilled, float valve freed, dry-run alarm reset, duty/standby verified at 4.5 bar.",
      },
      {
        asset: "PBX-TEL-RCP", issue: "EXTENSION_UNREGISTERED", scope: "SINGLE", channel: "PHONE", reporter: "Front Desk – Aisha",
        description: "Reception handset shows 'No service' after the desk move.",
        ago: 2 * D + 6 * H, status: "CLOSED", assignee: "tech", respondedAfter: 2 * H, resolvedAfter: 4 * H, closedAfter: 1 * D,
        resolution: "Switch port had been moved to VLAN 50 by mistake. Set the port to voice VLAN 20 with LLDP-MED; handset registered.",
      },
      {
        unit: "608", domain: "LOCK_ENCODER", issue: "LOCK_LOW_BATTERY", scope: "SINGLE", channel: "PORTAL", reporter: "Layla Haddad", reporterContact: "+971 50 660 8080",
        description: "Door lock beeps 'low battery' whenever I tap my card.",
        ago: 3 * D, status: "CLOSED", assignee: "tech", respondedAfter: 3 * H, resolvedAfter: 5 * H, closedAfter: 1 * D,
        resolution: "Replaced 4 × AA lithium batteries and re-synced the lock clock via the encoder.",
      },
      {
        asset: "POS-PRN-2A", issue: "POS_CONSUMABLES", scope: "SINGLE", channel: "PHONE", reporter: "Swift Mart cashier",
        description: "Out of 80 mm receipt rolls.",
        ago: 4 * D, status: "CLOSED", assignee: "liwei", respondedAfter: 3 * H, resolvedAfter: 200 * MIN, closedAfter: 1 * D,
        resolution: "Delivered 20 × 80 mm thermal rolls from stock.",
      },
      {
        asset: "CCTV-NVR-01", issue: "NVR_RECORDING_FAILURE", scope: "BUILDING", channel: "PORTAL", reporter: "Security Supervisor – Karim",
        description: "NVR showing 'HDD Error' alarm; 9 channels not recording since 02:00.",
        ago: 5 * D, status: "CLOSED", assignee: "liwei", respondedAfter: 25 * MIN, resolvedAfter: 3 * H + 30 * MIN, closedAfter: 1 * D,
        resolution: "HDD 3 failed SMART. Exported incident clips first, replaced the disk, RAID rebuilt, all 27 channels recording and retention back to 30 days.",
        notes: [
          { after: 2 * H, by: "liwei", type: "AUDIT_CAPTURE", body: "Failed surveillance disk replaced.", metadata: { captureType: "PART_REPLACEMENT", fields: { partName: "Surveillance HDD 6 TB", partNumber: "WD62PURZ", serialRemoved: "WX12D81H7Y2K", serialInstalled: "WX52D30A1LPC", supplier: "Gulf IT Supplies · PO-2270" }, sensitiveKeys: [] } },
        ],
      },
      {
        asset: "POS-KIT-4B", issue: "PRINTER_IP_REMAP", scope: "SINGLE", channel: "PORTAL", reporter: "Emre Yilmaz", reporterUser: "tenant",
        description: "Kitchen printer moved to the new pass station; orders no longer print in the kitchen.",
        ago: 7 * D, status: "CLOSED", assignee: "liwei", respondedAfter: 1 * H, resolvedAfter: 150 * MIN, closedAfter: 2 * D,
        resolution: "Printer had fallen back to DHCP. Set static 192.168.30.52, re-mapped the kitchen routing group in the POS, test order OK.",
        notes: [
          { after: 2 * H, by: "liwei", type: "AUDIT_CAPTURE", body: "Kitchen printer pinned to a static address.", metadata: { captureType: "IP_CONFIGURATION", fields: { device: "Epson TM-U220 (kitchen)", previousIp: "192.168.30.60 (DHCP)", newIp: "192.168.30.52", subnetGateway: "255.255.255.0 / 192.168.30.1", vlanPort: "VLAN 30 · TCP 9100" }, sensitiveKeys: [] } },
        ],
      },
      {
        unit: "4B", domain: "PLUMBING", issue: "LOCALIZED_LEAK", scope: "UNIT", safety: true, channel: "PHONE", reporter: "Emre Yilmaz", reporterUser: "tenant",
        title: "Water leaking beside distribution board DB-4B",
        description: "Water leaking from the ceiling in back-of-house, dripping right next to the electrical distribution board.",
        ago: 8 * D, status: "CLOSED", assignee: "ahmed", respondedAfter: 12 * MIN, resolvedAfter: 160 * MIN, closedAfter: 1 * D,
        resolution: "AHU condensate drain line above the ceiling was blocked; cleared and re-lagged. DB-4B inspected by Joseph — dry, IR test OK.",
      },
      {
        asset: "PMP-BST-01", issue: "PUMP_LOW_PRESSURE", scope: "FLOOR", channel: "PHONE", reporter: "Khalid Al Suwaidi (PH 1201)",
        description: "Very low water pressure on the top floors; the shower is barely running.",
        ago: 9 * D, status: "CLOSED", assignee: "ahmed", respondedAfter: 35 * MIN, resolvedAfter: 3 * H, closedAfter: 1 * D,
        resolution: "Pressure transmitter drifting (reading 1.2 bar high). Replaced the transmitter, recalibrated the 4.5 bar setpoint and verified at the PH 1201 tap.",
      },
      {
        asset: "ELE-MDB-01", issue: "TOTAL_POWER_OUTAGE", scope: "BUILDING", channel: "PHONE", reporter: "Security Control Room", reporterContact: "+971 4 555 0199",
        description: "Complete blackout at 21:14. Generator started but the ATS did not transfer.",
        ago: 12 * D, status: "CLOSED", assignee: "joseph", respondedAfter: 8 * MIN, resolvedAfter: 310 * MIN, closedAfter: 1 * D,
        resolution: "ATS controller failed to transfer (controller battery low). Manual transfer to generator at 21:40; utility restored 02:05. Controller battery replaced and transfer tested.",
      },
      {
        asset: "POS-TRM-4B", issue: "POS_TERMINAL_DOWN", scope: "SINGLE", channel: "QR_SCAN", reporter: "Emre Yilmaz", reporterUser: "tenant",
        description: "POS terminal frozen on the boot logo after an update.",
        ago: 15 * D, status: "CLOSED", assignee: "liwei", respondedAfter: 100 * MIN, resolvedAfter: 10 * H, closedAfter: 1 * D,
        resolution: "Firmware update was interrupted. Re-flashed the Sunmi T2s firmware and restored POS data from the cloud. Delayed by vendor tool authorisation.",
        notes: [
          { after: 9 * H, by: "liwei", type: "AUDIT_CAPTURE", body: "Terminal re-flashed.", metadata: { captureType: "FIRMWARE_UPDATE", fields: { device: "Sunmi T2s (till 1)", fromVersion: "2.3.9 (corrupted)", toVersion: "Sunmi OS 2.4.1", method: "Sunmi flashing tool via USB" }, sensitiveKeys: [] } },
        ],
      },
      {
        asset: "NET-CORE-01", issue: "UNIT_NETWORK_DOWN", scope: "BUILDING", channel: "PHONE", reporter: "Front Desk – Aisha",
        title: "Building-wide network down — core switch reboot loop",
        description: "No internet or Wi-Fi anywhere in the building; shop POS terminals offline too.",
        ago: 20 * D, status: "CLOSED", assignee: "tech", respondedAfter: 10 * MIN, resolvedAfter: 110 * MIN, closedAfter: 1 * D,
        resolution: "Core switch stuck in a reboot loop after a power event. Replaced the failed PSU, restored config from backup, all VLANs verified.",
        notes: [
          { after: 100 * MIN, by: "tech", type: "AUDIT_CAPTURE", body: "Core switch PSU replaced.", metadata: { captureType: "PART_REPLACEMENT", fields: { partName: "Internal PSU (CBS350-48FP)", partNumber: "PWR-CBS350-740W", serialRemoved: "LIT2433A1B7", serialInstalled: "LIT2518C9Q2", supplier: "Cisco partner RMA-77120" }, sensitiveKeys: [] } },
        ],
      },
    ];

    specs.sort((a, b) => b.ago - a.ago);

    const ticketValues: (typeof tickets.$inferInsert)[] = [];
    const noteQueue: { token: string; notes: (Omit<typeof ticketNotes.$inferInsert, "ticketId">)[] }[] = [];
    const auditValues: (typeof auditLogs.$inferInsert)[] = [];

    const clampPast = (t: number) => new Date(Math.min(t, now - 5_000));

    for (const s of specs) {
      const asset = s.asset ? A[s.asset] : undefined;
      const domain = (asset?.domain ?? s.domain) as SystemDomain;
      const cls = classifyTicket({
        domain,
        issueCode: s.issue,
        impactScope: s.scope,
        safetyHazard: !!s.safety,
        assetCriticality: asset?.criticality ?? null,
      });
      const created = now - s.ago;
      const createdAt = new Date(created);
      const due = computeDueDates(cls.priority, createdAt);
      const assignee = s.assignee ? userOf(s.assignee) : undefined;
      const token = randomCode(16);

      let pausedMinutes = 0;
      let resolutionDueAt = due.resolutionDueAt;
      if (s.pausedAfter && s.resumedAfter) {
        pausedMinutes = Math.round((s.resumedAfter - s.pausedAfter) / MIN);
        resolutionDueAt = new Date(resolutionDueAt.getTime() + pausedMinutes * MIN);
      }

      ticketValues.push({
        title: s.title ?? `${cls.issue?.label ?? s.issue}${asset ? ` — ${asset.name}` : ""}`,
        description: s.description,
        domain,
        issueCode: s.issue,
        priority: cls.priority,
        status: s.status,
        channel: s.channel,
        impactScope: s.scope,
        safetyHazard: !!s.safety,
        slaTrace: cls.trace,
        assetId: asset?.id ?? null,
        unitId: asset?.unitId ?? (s.unit ? U[s.unit].id : null),
        reporterName: s.reporter,
        reporterContact: s.reporterContact ?? null,
        reporterUserId: s.reporterUser ? userOf(s.reporterUser).id : null,
        assigneeId: assignee?.id ?? null,
        responseDueAt: due.responseDueAt,
        resolutionDueAt,
        firstResponseAt: s.respondedAfter ? clampPast(created + s.respondedAfter) : null,
        resolvedAt: s.resolvedAfter ? clampPast(created + s.resolvedAfter) : null,
        closedAt: s.closedAfter ? clampPast(created + s.closedAfter) : null,
        slaPausedAt: s.status === "PENDING_PARTS" && s.pausedAfter ? clampPast(created + s.pausedAfter) : null,
        slaPausedMinutes: pausedMinutes,
        resolutionSummary: s.resolution ?? null,
        externalRef: s.externalRef ?? null,
        publicToken: token,
        createdAt,
        updatedAt: clampPast(created + Math.max(s.closedAfter ?? 0, s.resolvedAfter ?? 0, s.pausedAfter ?? 0, s.respondedAfter ?? 0)),
      });

      const notes: (Omit<typeof ticketNotes.$inferInsert, "ticketId">)[] = [
        {
          authorName: "SLA Engine",
          type: "SYSTEM",
          body: `Logged via ${s.channel === "QR_SCAN" ? "QR scan" : s.channel === "API" ? "API / Webhook" : s.channel.charAt(0) + s.channel.slice(1).toLowerCase()}. Deterministic SLA engine classified this request as ${cls.priority} (${SLA_POLICY[cls.priority].label}).`,
          metadata: { trace: cls.trace },
          isPublic: true,
          createdAt: createdAt,
        },
      ];
      if (assignee) {
        notes.push({
          authorName: "Dispatcher",
          type: "ASSIGNMENT",
          body: `Auto-dispatched to ${assignee.name} (least-loaded technician for this domain).`,
          metadata: { assigneeId: assignee.id },
          isPublic: false,
          createdAt: new Date(created + 1000),
        });
      }
      const statusNote = (after: number, from: TicketStatus, to: TicketStatus, body: string, by = assignee) =>
        notes.push({
          authorId: by?.id ?? null,
          authorName: by?.name ?? "System",
          type: "STATUS_CHANGE",
          body,
          metadata: { from, to },
          isPublic: true,
          createdAt: clampPast(created + after),
        });
      if (s.respondedAfter) statusNote(s.respondedAfter, "OPEN", "IN_PROGRESS", "");
      if (s.pausedAfter) statusNote(s.pausedAfter, "IN_PROGRESS", "PENDING_PARTS", s.partsNote ?? "Awaiting parts.");
      if (s.resumedAfter) statusNote(s.resumedAfter, "PENDING_PARTS", "IN_PROGRESS", "Parts received — resuming.");
      if (s.resolvedAfter) statusNote(s.resolvedAfter, s.pausedAfter && !s.resumedAfter ? "PENDING_PARTS" : "IN_PROGRESS", "RESOLVED", s.resolution ?? "");
      if (s.closedAfter) statusNote(s.closedAfter, "RESOLVED", "CLOSED", "Verified with the reporter — closing.", userOf("manager"));
      for (const n of s.notes ?? []) {
        const author = userOf(n.by);
        notes.push({
          authorId: author?.id ?? null,
          authorName: author?.name ?? n.by,
          type: n.type ?? "COMMENT",
          body: n.body,
          metadata: n.metadata ?? {},
          isPublic: n.isPublic ?? false,
          createdAt: clampPast(created + n.after),
        });
      }
      noteQueue.push({ token, notes });
    }

    const ticketRows = await tx.insert(tickets).values(ticketValues).returning();
    const byToken = Object.fromEntries(ticketRows.map((t) => [t.publicToken, t]));

    const allNotes: (typeof ticketNotes.$inferInsert)[] = [];
    for (const q of noteQueue) {
      const t = byToken[q.token];
      for (const n of q.notes) allNotes.push({ ...n, ticketId: t.id });
    }
    await tx.insert(ticketNotes).values(allNotes);

    for (const t of ticketRows) {
      auditValues.push({
        actorName: t.reporterName ?? "System",
        action: "ticket.create",
        entityType: "ticket",
        entityId: t.id,
        summary: `Created SR-${String(t.seq).padStart(5, "0")} (${t.priority}) via ${t.channel}`,
        detail: { issueCode: t.issueCode, priority: t.priority },
        createdAt: t.createdAt,
      });
    }

    /* --------------------------- Meter readings -------------------------- */
    const meterProfiles: { tag: string; start: number; daily: [number, number]; spikeDay?: number; spike?: number }[] = [
      { tag: "MTR-E-4B", start: 48210, daily: [185, 222], spikeDay: 1, spike: 468 },
      { tag: "MTR-W-4B", start: 1822.4, daily: [1.8, 2.5] },
      { tag: "MTR-E-1A", start: 20544, daily: [58, 76] },
      { tag: "MTR-E-305", start: 15320, daily: [17, 29] },
      { tag: "MTR-W-305", start: 612.3, daily: [0.34, 0.58] },
      { tag: "MTR-E-1201", start: 38770, daily: [44, 71] },
    ];
    const readingValues: (typeof meterReadings.$inferInsert)[] = [];
    const joseph = userOf("joseph");
    for (const p of meterProfiles) {
      const asset = A[p.tag];
      let value = p.start;
      for (let i = 30; i >= 1; i--) {
        const isSpike = p.spikeDay === i;
        const inc = isSpike ? p.spike! : p.daily[0] + rand() * (p.daily[1] - p.daily[0]);
        value += inc;
        readingValues.push({
          assetId: asset.id,
          value: Math.round(value * 100) / 100,
          readingAt: new Date(now - i * D - 2 * H),
          recordedById: joseph.id,
          anomaly: isSpike,
          note: isSpike ? "Auto-flagged: consumption > 2× trailing 7-day average" : null,
          createdAt: new Date(now - i * D - 2 * H),
        });
      }
    }
    await tx.insert(meterReadings).values(readingValues);

    /* ----------------------------- API keys ------------------------------ */
    const demoSecret = `bsd_live_${randomSecret(24)}`;
    await tx.insert(apiKeys).values({
      name: "Zabbix monitoring webhook",
      prefix: demoSecret.slice(0, 13),
      keyHash: sha256(demoSecret),
      createdById: userOf("admin").id,
      lastUsedAt: new Date(now - 48 * MIN),
      createdAt: new Date(now - 40 * D),
    });

    /* ----------------------------- Audit logs ---------------------------- */
    const admin = userOf("admin");
    const manager = userOf("manager");
    auditValues.push(
      { actorId: admin.id, actorName: admin.name, action: "apikey.create", entityType: "api_key", summary: "Created API key 'Zabbix monitoring webhook'", createdAt: new Date(now - 40 * D) },
      { actorId: manager.id, actorName: manager.name, action: "asset.update", entityType: "asset", entityId: A["PMP-BST-01"].id, summary: "Updated PMP-BST-01 specs (pressure transmitter replaced)", createdAt: new Date(now - 9 * D + 4 * H) },
      { actorId: admin.id, actorName: admin.name, action: "auth.login", entityType: "session", summary: "Signed in", createdAt: new Date(now - 2 * H) },
    );
    await tx.insert(auditLogs).values(auditValues);
  });
}
