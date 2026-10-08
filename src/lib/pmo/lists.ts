/* -------------------------------------------------------------------------- */
/* PMO controlled lists - mirrors the 23_SETTINGS sheet of the Excel system.   */
/* Every drop-down in the PMO module reads from these lists.                   */
/* -------------------------------------------------------------------------- */

export type ListKey =
  | "status"
  | "rag"
  | "priority"
  | "projType"
  | "dept"
  | "customer"
  | "hml"
  | "engagement"
  | "frequency"
  | "raidType"
  | "raidCategory"
  | "raidStatus"
  | "actionStatus"
  | "milestoneStatus"
  | "riskStatus"
  | "changeStatus"
  | "changeImpl"
  | "decisionStatus"
  | "costCategory"
  | "costStatus"
  | "resourceStatus"
  | "procurementStatus"
  | "qualityResult"
  | "qualityStatus"
  | "meetingType"
  | "meetingStatus"
  | "closureStatus"
  | "lessonStatus"
  | "commFrequency"
  | "raci";

const badge =
  (base: string) =>
  (...clr: string[]) =>
    `${base} ${clr[0]} ${clr[1] ?? clr[0]}`;

const SOFT = "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset";

export const LISTS: Record<ListKey, readonly string[]> = {
  status: ["Not Started", "Active", "On Hold", "Completed", "Cancelled"],
  rag: ["Green", "Yellow", "Red"],
  priority: ["Low", "Medium", "High", "Critical"],
  projType: ["Implementation", "Upgrade", "New Build", "Integration", "Process", "Internal", "Compliance"],
  dept: ["Operations", "IT", "Finance", "HR", "Procurement", "Marketing", "Executive", "Legal"],
  customer: [],
  hml: ["High", "Medium", "Low"],
  engagement: ["Unaware", "Resistant", "Neutral", "Supportive", "Leading"],
  frequency: ["Daily", "Weekly", "Bi-Weekly", "Monthly", "Quarterly", "On Demand"],
  raidType: ["Risk", "Assumption", "Issue", "Dependency"],
  raidCategory: ["Schedule", "Cost", "Scope", "Resource", "Technical", "Vendor", "Compliance", "Operations"],
  raidStatus: ["Open", "Monitoring", "Closed"],
  actionStatus: ["Open", "In Progress", "Completed", "Cancelled"],
  milestoneStatus: ["Open", "In Progress", "Reached", "Missed"],
  riskStatus: ["Low", "Medium", "High", "Critical"],
  changeStatus: ["Pending", "Approved", "Rejected", "Withdrawn"],
  changeImpl: ["Not Started", "In Progress", "Implemented"],
  decisionStatus: ["Pending", "Made", "Implemented"],
  costCategory: ["Personnel", "Software", "Hardware", "Procurement", "Consulting", "Training", "Travel", "Other"],
  costStatus: ["On Budget", "Over Budget", "Under Budget"],
  resourceStatus: ["Available", "Allocated", "On Leave", "Exited"],
  procurementStatus: ["Requested", "Quotation", "Approval", "Ordered", "Delivered", "Cancelled"],
  qualityResult: ["Pass", "Fail", "Pending", "Waived"],
  qualityStatus: ["Open", "In Progress", "Complete"],
  meetingType: ["Steering", "Project Board", "Status", "Risk Review", "Change Board", "UAT", "Retrospective"],
  meetingStatus: ["Scheduled", "Held", "Cancelled", "No Show"],
  closureStatus: ["Open", "Complete", "N/A"],
  lessonStatus: ["Open", "Actioned", "Closed"],
  commFrequency: ["Daily", "Weekly", "Monthly", "Quarterly", "Ad Hoc"],
  raci: ["R", "A", "C", "I"],
};

export const META: Record<ListKey, Record<string, string>> = {
  status: {
    "Not Started": `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
    Active: `${SOFT} text-sky-700 bg-sky-50 ring-sky-200`,
    "On Hold": `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Completed: `${SOFT} text-emerald-700 bg-emerald-50 ring-emerald-200`,
    Cancelled: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
  },
  rag: {
    Green: `${SOFT} text-emerald-700 bg-emerald-50 ring-emerald-200`,
    Yellow: `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Red: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
  },
  priority: {
    Low: `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
    Medium: `${SOFT} text-sky-700 bg-sky-50 ring-sky-200`,
    High: `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Critical: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
  },
  projType: Object.fromEntries(LISTS.projType.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  dept: Object.fromEntries(LISTS.dept.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  customer: {},
  hml: {
    High: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
    Medium: `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Low: `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
  },
  engagement: Object.fromEntries(LISTS.engagement.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  frequency: Object.fromEntries(LISTS.frequency.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  raidType: {
    Risk: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
    Assumption: `${SOFT} text-sky-700 bg-sky-50 ring-sky-200`,
    Issue: `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Dependency: `${SOFT} text-violet-700 bg-violet-50 ring-violet-200`,
  },
  raidCategory: Object.fromEntries(LISTS.raidCategory.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  raidStatus: {
    Open: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
    Monitoring: `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Closed: `${SOFT} text-emerald-700 bg-emerald-50 ring-emerald-200`,
  },
  actionStatus: {
    Open: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
    "In Progress": `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Completed: `${SOFT} text-emerald-700 bg-emerald-50 ring-emerald-200`,
    Cancelled: `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
  },
  milestoneStatus: {
    Open: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
    "In Progress": `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Reached: `${SOFT} text-emerald-700 bg-emerald-50 ring-emerald-200`,
    Missed: `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
  },
  riskStatus: {
    Low: `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
    Medium: `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    High: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
    Critical: `${SOFT} text-white bg-red-600 ring-red-600`,
  },
  changeStatus: {
    Pending: `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Approved: `${SOFT} text-emerald-700 bg-emerald-50 ring-emerald-200`,
    Rejected: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
    Withdrawn: `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
  },
  changeImpl: Object.fromEntries(LISTS.changeImpl.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  decisionStatus: {
    Pending: `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Made: `${SOFT} text-emerald-700 bg-emerald-50 ring-emerald-200`,
    Implemented: `${SOFT} text-sky-700 bg-sky-50 ring-sky-200`,
  },
  costCategory: Object.fromEntries(LISTS.costCategory.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  costStatus: {
    "On Budget": `${SOFT} text-emerald-700 bg-emerald-50 ring-emerald-200`,
    "Over Budget": `${SOFT} text-red-700 bg-red-50 ring-red-200`,
    "Under Budget": `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
  },
  resourceStatus: {
    Available: `${SOFT} text-emerald-700 bg-emerald-50 ring-emerald-200`,
    Allocated: `${SOFT} text-sky-700 bg-sky-50 ring-sky-200`,
    "On Leave": `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Exited: `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
  },
  procurementStatus: Object.fromEntries(LISTS.procurementStatus.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  qualityResult: {
    Pass: `${SOFT} text-emerald-700 bg-emerald-50 ring-emerald-200`,
    Fail: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
    Pending: `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Waived: `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
  },
  qualityStatus: Object.fromEntries(LISTS.qualityStatus.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  meetingType: Object.fromEntries(LISTS.meetingType.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  meetingStatus: Object.fromEntries(LISTS.meetingStatus.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  closureStatus: {
    Open: `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    Complete: `${SOFT} text-emerald-700 bg-emerald-50 ring-emerald-200`,
    "N/A": `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
  },
  lessonStatus: Object.fromEntries(LISTS.lessonStatus.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  commFrequency: Object.fromEntries(LISTS.commFrequency.map((v) => [v, `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`])),
  raci: {
    R: `${SOFT} text-sky-700 bg-sky-50 ring-sky-200`,
    A: `${SOFT} text-red-700 bg-red-50 ring-red-200`,
    C: `${SOFT} text-amber-700 bg-amber-50 ring-amber-200`,
    I: `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`,
  },
};

export function badgeClass(list: ListKey, value: string | null | undefined): string {
  if (!value) return `${SOFT} text-slate-400 bg-slate-100 ring-slate-200`;
  return META[list][value] ?? META[list]["Medium"] ?? `${SOFT} text-slate-600 bg-slate-100 ring-slate-200`;
}

export const CUSTOMERS: string[] = [
  "Internal",
  "Marina Delta Holdings",
  "Northstar Properties",
  "Apex Engineering",
  "Bluewater Chambers",
  "Castleton Group",
  "Durham Energy",
];