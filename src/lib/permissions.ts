import type { Role } from "@/db/schema";

const staff = (r: Role) => r !== "TENANT";
const mgmt = (r: Role) => r === "ADMIN" || r === "MANAGER";

export const can = {
  manageUsers: (r: Role) => r === "ADMIN",
  manageSettings: (r: Role) => r === "ADMIN",
  viewAudit: mgmt,
  viewInfrastructure: staff,
  manageAssets: mgmt,
  editAssets: staff,
  deleteAssets: mgmt,
  manageUnits: mgmt,
  manageCategories: mgmt,
  workTickets: staff,
  assignTickets: staff,
  overridePriority: mgmt,
  deleteTickets: (r: Role) => r === "ADMIN",
  recordReadings: staff,
  deleteReadings: mgmt,
  revealSecrets: mgmt,
  viewDocs: staff,
};
