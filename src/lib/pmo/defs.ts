import type { ListKey } from "./lists";

export type FieldType = "text" | "textarea" | "date" | "number" | "integer" | "percent" | "currency" | "select";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  list?: ListKey;
  required?: boolean;
  span?: 1 | 2 | 3;
  hint?: string;
  placeholder?: string;
}

export type HideAt = "sm" | "md" | "lg" | "xl";

export interface ColDef {
  name: string;
  label: string;
  list?: ListKey;
  align?: "right" | "center";
  money?: boolean;
  date?: boolean;
  center?: boolean;
  hide?: HideAt;
  link?: "project" | "projectName";
  wide?: boolean;
}

export interface RegisterDef {
  key: string;
  number: string;
  label: string;
  title: string;
  description: string;
  singular: string;
  group: "register" | "portfolio";
  projectScoped: boolean;
  fields: FieldDef[];
  cols: ColDef[];
  filter?: "status" | "rag" | "type";
}

export const REGISTERS: RegisterDef[] = [
  {
    key: "portfolio",
    number: "02",
    label: "Project Portfolio",
    title: "Project Portfolio Register",
    description:
      "Single source of truth for every project: customer, schedule, RAG, approved amount, actual and forecast cost. Mirrors 02_PROJECT_PORTFOLIO.",
    singular: "project",
    group: "portfolio",
    projectScoped: false,
    filter: "status",
    fields: [
      { name: "code", label: "Project ID", type: "text", required: true, placeholder: "PRJ-001" },
      { name: "name", label: "Project Name", type: "text", required: true, span: 2 },
      { name: "customer", label: "Customer", type: "select", list: "customer" },
      { name: "manager", label: "Project Manager", type: "text" },
      { name: "department", label: "Department", type: "select", list: "dept" },
      { name: "type", label: "Project Type", type: "select", list: "projType" },
      { name: "priority", label: "Priority", type: "select", list: "priority" },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "baselineEnd", label: "Baseline End", type: "date", hint: "Original committed end date" },
      { name: "forecastEnd", label: "Forecast End", type: "date", hint: "Latest predicted end date" },
      { name: "actualEnd", label: "Actual End", type: "date" },
      { name: "percent", label: "% Complete", type: "percent" },
      { name: "status", label: "Status", type: "select", list: "status", required: true },
      { name: "rag", label: "RAG", type: "select", list: "rag", required: true },
      { name: "totalApproved", label: "Total Approved Amount", type: "currency" },
      { name: "actualCost", label: "Actual Cost", type: "currency" },
      { name: "forecastCost", label: "Forecast Cost", type: "currency" },
      { name: "lastUpdated", label: "Last Updated", type: "date" },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "code", label: "ID", link: "project" },
      { name: "customer", label: "Customer", hide: "xl" },
      { name: "name", label: "Project", wide: true },
      { name: "status", label: "Status", list: "status" },
      { name: "rag", label: "RAG", list: "rag" },
      { name: "manager", label: "Manager", hide: "lg" },
      { name: "percent", label: "%", align: "right", hide: "md" },
      { name: "totalApproved", label: "Approved", money: true, align: "right", hide: "xl" },
      { name: "actualCost", label: "Actual", money: true, align: "right", hide: "xl" },
      { name: "sv", label: "Sched Var", align: "right", hide: "xl" },
      { name: "cv", label: "Cost Var", money: true, align: "right", hide: "xl" },
      { name: "health", label: "Health", list: "rag" },
    ],
  },

  {
    key: "milestones",
    number: "05",
    label: "Milestones",
    title: "Milestone Tracker",
    description:
      "Every milestone with baseline, forecast, days remaining and automatic RAG. Feeds the next-milestone strip on the dashboards.",
    singular: "milestone",
    group: "register",
    projectScoped: true,
    filter: "status",
    fields: [
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "milestone", label: "Milestone", type: "text", required: true, span: 2 },
      { name: "owner", label: "Owner", type: "text" },
      { name: "baselineDate", label: "Baseline Date", type: "date" },
      { name: "forecastDate", label: "Forecast Date", type: "date" },
      { name: "actualDate", label: "Actual Date", type: "date" },
      { name: "status", label: "Status", type: "select", list: "milestoneStatus" },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "project", label: "Project", link: "projectName", hide: "md" },
      { name: "milestone", label: "Milestone", wide: true },
      { name: "owner", label: "Owner", hide: "lg" },
      { name: "forecastDate", label: "Forecast", date: true, hide: "md" },
      { name: "days", label: "Days Left", align: "right", hide: "md" },
      { name: "status", label: "Status", list: "milestoneStatus" },
      { name: "rag", label: "Due", list: "rag" },
    ],
  },

  {
    key: "raid",
    number: "06",
    label: "RAID Log",
    title: "RAID Log - Risks, Assumptions, Issues, Dependencies",
    description:
      "One controlled register for risks, assumptions, issues and dependencies. Risk score = probability × impact; priority is automatic.",
    singular: "raid item",
    group: "register",
    projectScoped: true,
    filter: "type",
    fields: [
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "type", label: "Type", type: "select", list: "raidType", required: true },
      { name: "description", label: "Description", type: "textarea", required: true, span: 3 },
      { name: "category", label: "Category", type: "select", list: "raidCategory" },
      { name: "probability", label: "Probability", type: "select", list: "hml" },
      { name: "impact", label: "Impact", type: "select", list: "hml" },
      { name: "owner", label: "Owner", type: "text" },
      { name: "dueDate", label: "Due Date", type: "date" },
      { name: "status", label: "Status", type: "select", list: "raidStatus" },
      { name: "escalation", label: "Escalation", type: "text", span: 3 },
      { name: "mitigation", label: "Mitigation", type: "textarea", span: 3 },
      { name: "contingency", label: "Contingency", type: "textarea", span: 3 },
      { name: "resolution", label: "Resolution", type: "textarea", span: 3 },
      { name: "dateRaised", label: "Date Raised", type: "date" },
      { name: "dateClosed", label: "Date Closed", type: "date" },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "project", label: "Project", link: "projectName", hide: "xl" },
      { name: "type", label: "Type", list: "raidType" },
      { name: "description", label: "Description", wide: true },
      { name: "score", label: "Score", align: "right", hide: "md" },
      { name: "priority", label: "Priority", list: "priority", hide: "lg" },
      { name: "owner", label: "Owner", hide: "xl" },
      { name: "dueDate", label: "Due", date: true, hide: "md" },
      { name: "status", label: "Status", list: "raidStatus" },
    ],
  },

  {
    key: "actions",
    number: "07",
    label: "Action Tracker",
    title: "Action Tracker",
    description:
      "Every action from every meeting with one owner and one due date. Overdue = red, due within 3 days = amber, completed = green.",
    singular: "action",
    group: "register",
    projectScoped: true,
    filter: "status",
    fields: [
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "source", label: "Meeting / Source", type: "text" },
      { name: "action", label: "Action", type: "textarea", required: true, span: 3 },
      { name: "owner", label: "Owner", type: "text" },
      { name: "priority", label: "Priority", type: "select", list: "priority" },
      { name: "dateOpened", label: "Date Opened", type: "date" },
      { name: "dueDate", label: "Due Date", type: "date" },
      { name: "status", label: "Status", type: "select", list: "actionStatus" },
      { name: "completionDate", label: "Completion Date", type: "date" },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "project", label: "Project", link: "projectName", hide: "xl" },
      { name: "action", label: "Action", wide: true },
      { name: "owner", label: "Owner", hide: "lg" },
      { name: "dueDate", label: "Due", date: true, hide: "md" },
      { name: "od", label: "Overdue", align: "right", hide: "md" },
      { name: "status", label: "Status", list: "actionStatus" },
      { name: "rag", label: "Overdue", list: "rag" },
    ],
  },

  {
    key: "raci",
    number: "08",
    label: "RACI Matrix",
    title: "RACI Matrix",
    description:
      "Who is Responsible, Accountable, Consulted and Informed for each activity. Exactly one Accountable per row is shown in the validation column.",
    singular: "activity",
    group: "register",
    projectScoped: false,
    filter: undefined,
    fields: [
      { name: "activity", label: "Activity / Deliverable", type: "text", required: true, span: 3 },
      { name: "sponsor", label: "Sponsor", type: "select", list: "raci" },
      { name: "pmo", label: "PMO", type: "select", list: "raci" },
      { name: "projectManager", label: "Project Manager", type: "select", list: "raci" },
      { name: "businessOwner", label: "Business Owner", type: "select", list: "raci" },
      { name: "itLead", label: "IT Lead", type: "select", list: "raci" },
      { name: "developer", label: "Developer", type: "select", list: "raci" },
      { name: "finance", label: "Finance", type: "select", list: "raci" },
      { name: "procurement", label: "Procurement", type: "select", list: "raci" },
      { name: "qa", label: "QA", type: "select", list: "raci" },
      { name: "endUsers", label: "End Users", type: "select", list: "raci" },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "activity", label: "Activity", wide: true },
      { name: "sponsor", label: "Sponsor", list: "raci", center: true, hide: "lg" },
      { name: "pmo", label: "PMO", list: "raci", center: true, hide: "lg" },
      { name: "projectManager", label: "PM", list: "raci", center: true },
      { name: "businessOwner", label: "Biz Owner", list: "raci", center: true, hide: "lg" },
      { name: "itLead", label: "IT Lead", list: "raci", center: true, hide: "lg" },
      { name: "developer", label: "Dev", list: "raci", center: true, hide: "xl" },
      { name: "finance", label: "Finance", list: "raci", center: true, hide: "xl" },
      { name: "procurement", label: "Procurement", list: "raci", center: true, hide: "xl" },
      { name: "qa", label: "QA", list: "raci", center: true, hide: "xl" },
      { name: "endUsers", label: "End Users", list: "raci", center: true, hide: "xl" },
      { name: "aCount", label: "A Count", align: "right" },
      { name: "validation", label: "Validation", wide: true },
    ],
  },

  {
    key: "stakeholders",
    number: "09",
    label: "Stakeholders",
    title: "Stakeholder Register",
    description:
      "People who can help or block the portfolio, with influence/interest classification (automatic) and the engagement approach for each one.",
    singular: "stakeholder",
    group: "register",
    projectScoped: false,
    filter: undefined,
    fields: [
      { name: "name", label: "Stakeholder", type: "text", required: true, span: 2 },
      { name: "role", label: "Role", type: "text" },
      { name: "department", label: "Department", type: "select", list: "dept" },
      { name: "influence", label: "Influence", type: "select", list: "hml" },
      { name: "interest", label: "Interest", type: "select", list: "hml" },
      { name: "engagement", label: "Engagement Level", type: "select", list: "engagement" },
      { name: "infoNeeded", label: "Information Needed", type: "textarea", span: 3 },
      { name: "frequency", label: "Frequency", type: "select", list: "frequency" },
      { name: "channel", label: "Channel", type: "text" },
      { name: "owner", label: "Owner", type: "text" },
      { name: "strategy", label: "Strategy", type: "textarea", span: 3 },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "name", label: "Stakeholder", wide: true },
      { name: "role", label: "Role", hide: "lg" },
      { name: "class", label: "Class", wide: true },
      { name: "influence", label: "Power", list: "hml" },
      { name: "interest", label: "Interest", list: "hml", hide: "md" },
      { name: "engagement", label: "Engagement", list: "engagement", hide: "lg" },
      { name: "owner", label: "Owner", hide: "xl" },
    ],
  },

  {
    key: "changes",
    number: "10",
    label: "Change Control",
    title: "Change Control",
    description:
      "Formal change requests with impact assessment and approval. No change may be implemented unless the approval status is Approved.",
    singular: "change request",
    group: "register",
    projectScoped: true,
    filter: "status",
    fields: [
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "requestedBy", label: "Requested By", type: "text" },
      { name: "requestDate", label: "Request Date", type: "date" },
      { name: "description", label: "Change Description", type: "textarea", required: true, span: 3 },
      { name: "reason", label: "Reason", type: "textarea", span: 3 },
      { name: "scopeImpact", label: "Scope Impact", type: "textarea", span: 3 },
      { name: "scheduleImpact", label: "Schedule Impact (days)", type: "integer" },
      { name: "costImpact", label: "Cost Impact", type: "currency" },
      { name: "riskImpact", label: "Risk Impact", type: "textarea", span: 3 },
      { name: "priority", label: "Priority", type: "select", list: "priority" },
      { name: "impactAssessment", label: "Impact Assessment", type: "textarea", span: 3 },
      { name: "recommendation", label: "Recommendation", type: "textarea", span: 3 },
      { name: "approvalStatus", label: "Approval Status", type: "select", list: "changeStatus", required: true },
      { name: "approvedBy", label: "Approved By", type: "text" },
      { name: "approvalDate", label: "Approval Date", type: "date" },
      { name: "implementationStatus", label: "Implementation Status", type: "select", list: "changeImpl" },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "project", label: "Project", link: "projectName", hide: "xl" },
      { name: "description", label: "Change", wide: true },
      { name: "costImpact", label: "Cost Impact", money: true, align: "right", hide: "md" },
      { name: "scheduleImpact", label: "Sched (d)", align: "right", hide: "xl" },
      { name: "approvalStatus", label: "Approval", list: "changeStatus" },
      { name: "priority", label: "Priority", list: "priority", hide: "lg" },
      { name: "implementationStatus", label: "Implementation", list: "changeImpl", hide: "lg" },
    ],
  },

  {
    key: "costs",
    number: "11",
    label: "Cost Management",
    title: "Cost Management",
    description:
      "Approved amount vs committed, actual and forecast cost by category. Variance, utilisation and the category summary are automatic.",
    singular: "cost line",
    group: "register",
    projectScoped: true,
    filter: undefined,
    fields: [
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "category", label: "Cost Category", type: "select", list: "costCategory" },
      { name: "owner", label: "Owner", type: "text" },
      { name: "totalApproved", label: "Total Approved Amount", type: "currency" },
      { name: "committed", label: "Committed Cost", type: "currency" },
      { name: "actual", label: "Actual Cost", type: "currency" },
      { name: "forecast", label: "Forecast Cost", type: "currency" },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "project", label: "Project", link: "projectName", hide: "xl" },
      { name: "category", label: "Category", list: "costCategory" },
      { name: "totalApproved", label: "Approved", money: true, align: "right" },
      { name: "committed", label: "Committed", money: true, align: "right", hide: "md" },
      { name: "actual", label: "Actual", money: true, align: "right" },
      { name: "forecast", label: "Forecast", money: true, align: "right", hide: "md" },
      { name: "util", label: "Util %", align: "right", hide: "md" },
      { name: "variance", label: "Variance", money: true, align: "right", hide: "xl" },
    ],
  },

  {
    key: "resources",
    number: "12",
    label: "Resource Management",
    title: "Resource Management",
    description:
      "Allocation of people across projects. Utilisation is summed per person automatically: over 100% is overload (red), 80-100% amber, below 80% green.",
    singular: "resource",
    group: "register",
    projectScoped: false,
    filter: "status",
    fields: [
      { name: "resource", label: "Resource", type: "text", required: true, span: 2 },
      { name: "role", label: "Role", type: "text" },
      { name: "department", label: "Department", type: "select", list: "dept" },
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "allocation", label: "Allocation %", type: "percent" },
      { name: "availability", label: "Availability %", type: "percent" },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "endDate", label: "End Date", type: "date" },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "resource", label: "Resource", wide: true },
      { name: "role", label: "Role", hide: "lg" },
      { name: "department", label: "Dept", hide: "xl" },
      { name: "alloc", label: "Allocation %", align: "right" },
      { name: "util", label: "Utilisation %", align: "right", hide: "md" },
      { name: "load", label: "Load", list: "rag", hide: "md" },
      { name: "status", label: "Status", list: "resourceStatus" },
    ],
  },

  {
    key: "procurement",
    number: "13",
    label: "Procurement",
    title: "Procurement Tracker",
    description:
      "Purchase requests through quotation, approval, order and delivery, with the variance between approved amount and final cost.",
    singular: "procurement item",
    group: "register",
    projectScoped: true,
    filter: "status",
    fields: [
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "item", label: "Item", type: "text", required: true, span: 2 },
      { name: "requester", label: "Requester", type: "text" },
      { name: "supplier", label: "Supplier", type: "text" },
      { name: "quotation", label: "Quotation", type: "text", span: 3 },
      { name: "poNo", label: "PO No.", type: "text" },
      { name: "totalApproved", label: "Total Approved Amount", type: "currency" },
      { name: "quotedCost", label: "Quoted Cost", type: "currency" },
      { name: "approvedCost", label: "Approved Cost", type: "currency" },
      { name: "orderDate", label: "Order Date", type: "date" },
      { name: "expectedDelivery", label: "Expected Delivery", type: "date" },
      { name: "actualDelivery", label: "Actual Delivery", type: "date" },
      { name: "status", label: "Status", type: "select", list: "procurementStatus", required: true },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "project", label: "Project", link: "projectName", hide: "xl" },
      { name: "item", label: "Item", wide: true },
      { name: "supplier", label: "Supplier", hide: "lg" },
      { name: "approvedCost", label: "Approved", money: true, align: "right", hide: "md" },
      { name: "expectedDelivery", label: "Exp. Delivery", date: true, hide: "xl" },
      { name: "status", label: "Status", list: "procurementStatus" },
      { name: "variance", label: "Variance", money: true, align: "right", hide: "xl" },
    ],
  },

  {
    key: "quality",
    number: "14",
    label: "Quality Control",
    title: "Quality Control",
    description:
      "Quality checks for each deliverable with result, defects and corrective action. The KPI block reports pass rate.",
    singular: "quality check",
    group: "register",
    projectScoped: true,
    filter: "status",
    fields: [
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "deliverable", label: "Deliverable", type: "text", required: true, span: 2 },
      { name: "criteria", label: "Quality Criteria", type: "textarea", span: 3 },
      { name: "owner", label: "Owner", type: "text" },
      { name: "plannedDate", label: "Planned Date", type: "date" },
      { name: "actualDate", label: "Actual Date", type: "date" },
      { name: "result", label: "Result", type: "select", list: "qualityResult", required: true },
      { name: "defects", label: "Defects", type: "integer" },
      { name: "correctiveAction", label: "Corrective Action", type: "textarea", span: 3 },
      { name: "status", label: "Status", type: "select", list: "qualityStatus" },
      { name: "evidence", label: "Evidence", type: "text", span: 3 },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "project", label: "Project", link: "projectName", hide: "xl" },
      { name: "deliverable", label: "Deliverable", wide: true },
      { name: "owner", label: "Owner", hide: "lg" },
      { name: "plannedDate", label: "Planned", date: true, hide: "xl" },
      { name: "result", label: "Result", list: "qualityResult" },
      { name: "defects", label: "Defects", align: "right", hide: "md" },
      { name: "status", label: "Status", list: "qualityStatus", hide: "lg" },
    ],
  },

  {
    key: "meetings",
    number: "16",
    label: "Meeting Minutes",
    title: "Meeting Minutes & Actions",
    description:
      "Minutes with the decision taken and the action raised. Every action raised here must land in the Action Tracker with an owner and due date.",
    singular: "meeting",
    group: "register",
    projectScoped: true,
    filter: "status",
    fields: [
      { name: "date", label: "Date", type: "date" },
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "meetingType", label: "Meeting Type", type: "select", list: "meetingType" },
      { name: "chair", label: "Chair", type: "text" },
      { name: "attendees", label: "Attendees", type: "textarea", span: 3 },
      { name: "agenda", label: "Agenda", type: "textarea", span: 3 },
      { name: "discussion", label: "Discussion", type: "textarea", span: 3 },
      { name: "decision", label: "Decision", type: "textarea", span: 3 },
      { name: "action", label: "Action", type: "textarea", span: 3 },
      { name: "owner", label: "Owner", type: "text" },
      { name: "dueDate", label: "Due Date", type: "date" },
      { name: "status", label: "Status", type: "select", list: "meetingStatus" },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "date", label: "Date", date: true },
      { name: "project", label: "Project", link: "projectName", hide: "lg" },
      { name: "meetingType", label: "Type", list: "meetingType" },
      { name: "chair", label: "Chair", hide: "lg" },
      { name: "decision", label: "Decision", wide: true },
      { name: "action", label: "Action", wide: true },
      { name: "status", label: "Status", list: "meetingStatus", hide: "md" },
    ],
  },

  {
    key: "decisions",
    number: "17",
    label: "Decision Log",
    title: "Decision Log",
    description:
      "Management decisions with options, recommendation, decision maker and follow-up. Pending decisions appear on the executive dashboard.",
    singular: "decision",
    group: "register",
    projectScoped: true,
    filter: "status",
    fields: [
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "decisionDate", label: "Decision Date", type: "date" },
      { name: "decisionRequired", label: "Decision Required", type: "textarea", required: true, span: 3 },
      { name: "options", label: "Options", type: "textarea", span: 3 },
      { name: "recommendation", label: "Recommendation", type: "textarea", span: 3 },
      { name: "decision", label: "Decision Made", type: "textarea", span: 3 },
      { name: "maker", label: "Decision Maker", type: "text" },
      { name: "impact", label: "Impact", type: "textarea", span: 3 },
      { name: "owner", label: "Follow-up Owner", type: "text" },
      { name: "dueDate", label: "Due Date", type: "date" },
      { name: "status", label: "Status", type: "select", list: "decisionStatus", required: true },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "project", label: "Project", link: "projectName", hide: "xl" },
      { name: "decisionRequired", label: "Decision", wide: true },
      { name: "maker", label: "Maker", hide: "lg" },
      { name: "dueDate", label: "Due", date: true, hide: "md" },
      { name: "status", label: "Status", list: "decisionStatus" },
      { name: "owner", label: "Owner", hide: "xl" },
    ],
  },

  {
    key: "comms",
    number: "18",
    label: "Communication Plan",
    title: "Communication Plan",
    description:
      "Who receives which information, how often, in what format, from whom - plus the escalation path when information is not delivered.",
    singular: "communication",
    group: "register",
    projectScoped: false,
    filter: undefined,
    fields: [
      { name: "audience", label: "Audience", type: "text", required: true, span: 2 },
      { name: "info", label: "Information", type: "textarea", required: true, span: 3 },
      { name: "owner", label: "Owner", type: "text" },
      { name: "frequency", label: "Frequency", type: "select", list: "commFrequency" },
      { name: "format", label: "Format", type: "text" },
      { name: "channel", label: "Channel", type: "text" },
      { name: "timing", label: "Timing", type: "text" },
      { name: "purpose", label: "Purpose", type: "textarea", span: 3 },
      { name: "escalation", label: "Escalation Path", type: "textarea", span: 3 },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "audience", label: "Audience", wide: true },
      { name: "info", label: "Information", wide: true },
      { name: "owner", label: "Owner", hide: "lg" },
      { name: "frequency", label: "Frequency", list: "commFrequency", hide: "md" },
      { name: "channel", label: "Channel", hide: "xl" },
    ],
  },

  {
    key: "closure",
    number: "19",
    label: "Project Closure",
    title: "Project Closure Checklist",
    description:
      "Formal closure checklist per project. The completion indicator must reach 100% before the project is marked Closed.",
    singular: "closure item",
    group: "register",
    projectScoped: true,
    filter: "status",
    fields: [
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "item", label: "Closure Item", type: "text", required: true, span: 2 },
      { name: "owner", label: "Owner", type: "text" },
      { name: "dueDate", label: "Due Date", type: "date" },
      { name: "status", label: "Status", type: "select", list: "closureStatus", required: true },
      { name: "evidence", label: "Evidence / Reference", type: "text", span: 3 },
      { name: "completedDate", label: "Date Completed", type: "date" },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "project", label: "Project", link: "projectName", hide: "xl" },
      { name: "item", label: "Closure Item", wide: true },
      { name: "owner", label: "Owner", hide: "lg" },
      { name: "status", label: "Status", list: "closureStatus" },
      { name: "evidence", label: "Evidence", wide: true },
    ],
  },

  {
    key: "lessons",
    number: "20",
    label: "Lessons Learned",
    title: "Lessons Learned",
    description:
      "What went well, what did not, why, and the action that stops it happening again. Reviewed at every monthly portfolio review.",
    singular: "lesson",
    group: "register",
    projectScoped: true,
    filter: "status",
    fields: [
      { name: "projectId", label: "Project", type: "select", list: "customer", span: 2 },
      { name: "date", label: "Date", type: "date" },
      { name: "area", label: "Area", type: "text" },
      { name: "wentWell", label: "What Went Well", type: "textarea", span: 3 },
      { name: "wentWrong", label: "What Went Wrong", type: "textarea", span: 3 },
      { name: "rootCause", label: "Root Cause", type: "textarea", span: 3 },
      { name: "lesson", label: "Lesson", type: "textarea", span: 3 },
      { name: "recommendation", label: "Recommendation", type: "textarea", span: 3 },
      { name: "owner", label: "Owner", type: "text" },
      { name: "action", label: "Action", type: "text", span: 2 },
      { name: "status", label: "Status", type: "select", list: "lessonStatus", required: true },
      { name: "notes", label: "Notes", type: "textarea", span: 3 },
    ],
    cols: [
      { name: "project", label: "Project", link: "projectName", hide: "xl" },
      { name: "date", label: "Date", date: true },
      { name: "area", label: "Area", hide: "lg" },
      { name: "wentWell", label: "Went Well", wide: true },
      { name: "wentWrong", label: "Went Wrong", wide: true },
      { name: "lesson", label: "Lesson", wide: true },
      { name: "status", label: "Status", list: "lessonStatus" },
    ],
  },
];