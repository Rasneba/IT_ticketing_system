import "dotenv/config";
import { db } from "@/db";
import {
  pmoActions,
  pmoChanges,
  pmoClosure,
  pmoComms,
  pmoCosts,
  pmoDecisions,
  pmoLessons,
  pmoMeetings,
  pmoMilestones,
  pmoProcurement,
  pmoProjects,
  pmoQuality,
  pmoRaci,
  pmoRaid,
  pmoResources,
  pmoStakeholders,
} from "@/db/schema";

const d = (offsetDays: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
};

async function main() {
  const projects = await db
    .insert(pmoProjects)
    .values([
      {
        code: "PRJ-001",
        name: "Marina Residences Tower B",
        customer: "Marina Delta Holdings",
        type: "Implementation",
        department: "Operations",
        manager: "S. Bekele",
        priority: "High",
        startDate: d(-120),
        baselineEnd: d(120),
        forecastEnd: d(150),
        percent: 55,
        status: "Active",
        rag: "Yellow",
        totalApproved: 1200000,
        actualCost: 620000,
        forecastCost: 1300000,
        lastUpdated: d(-1),
        notes: "Foundation complete; fit-out behind plan by 30 days.",
      },
      {
        code: "PRJ-002",
        name: "Northstar Property Portal",
        customer: "Northstar Properties",
        type: "Integration",
        department: "IT",
        manager: "A. Hailu",
        priority: "Medium",
        startDate: d(-200),
        baselineEnd: d(30),
        forecastEnd: d(45),
        percent: 70,
        status: "Active",
        rag: "Green",
        totalApproved: 650000,
        actualCost: 420000,
        forecastCost: 690000,
        lastUpdated: d(-2),
      },
      {
        code: "PRJ-003",
        name: "Apex Fleet Telematics",
        customer: "Apex Engineering",
        type: "New Build",
        department: "Operations",
        manager: "B. Tesfaye",
        priority: "Critical",
        startDate: d(-60),
        baselineEnd: d(240),
        forecastEnd: d(300),
        percent: 20,
        status: "Active",
        rag: "Red",
        totalApproved: 2100000,
        actualCost: 900000,
        forecastCost: 2500000,
        lastUpdated: d(-1),
        notes: "Supplier integration slipping; external escalation active.",
      },
      {
        code: "PRJ-004",
        name: "Bluewater Chambers Renovation",
        customer: "Bluewater Chambers",
        type: "Upgrade",
        department: "Operations",
        manager: "C. Girma",
        priority: "Low",
        startDate: d(-300),
        baselineEnd: d(-10),
        actualEnd: d(-20),
        percent: 100,
        status: "Completed",
        rag: "Green",
        totalApproved: 380000,
        actualCost: 350000,
        forecastCost: 350000,
        lastUpdated: d(-20),
        notes: "Handover complete; closure checklist closed.",
      },
      {
        code: "PRJ-005",
        name: "Castleton CRM Rollout",
        customer: "Castleton Group",
        type: "Implementation",
        department: "IT",
        manager: "S. Bekele",
        priority: "Medium",
        startDate: d(-90),
        baselineEnd: d(90),
        forecastEnd: d(90),
        percent: 40,
        status: "On Hold",
        rag: "Yellow",
        totalApproved: 420000,
        actualCost: 180000,
        forecastCost: 460000,
        lastUpdated: d(-5),
        notes: "Paused pending business process sign-off.",
      },
      {
        code: "PRJ-006",
        name: "Durham Energy Billing Integration",
        customer: "Durham Energy",
        type: "Integration",
        department: "Finance",
        manager: "D. Fekadu",
        priority: "High",
        startDate: d(-150),
        baselineEnd: d(60),
        forecastEnd: d(80),
        percent: 68,
        status: "Active",
        rag: "Red",
        totalApproved: 980000,
        actualCost: 880000,
        forecastCost: 1150000,
        lastUpdated: d(-1),
        notes: "Over budget; change request #CC-001 to approve overrun.",
      },
      {
        code: "PRJ-007",
        name: "Internal Helpdesk Portal",
        customer: "Internal",
        type: "Internal",
        department: "IT",
        manager: "E. Kebede",
        priority: "Medium",
        startDate: d(-30),
        baselineEnd: d(150),
        forecastEnd: d(150),
        percent: 15,
        status: "Active",
        rag: "Green",
        totalApproved: 180000,
        actualCost: 20000,
        forecastCost: 190000,
        lastUpdated: d(-2),
      },
    ])
    .returning({ id: pmoProjects.id, code: pmoProjects.code });

  const byCode = (code: string) => {
    const p = projects.find((x) => x.code === code);
    if (!p) throw new Error(`missing project ${code}`);
    return p.id;
  };
  const pid = (idx: number) => projects[idx].id;

  await db.insert(pmoMilestones).values([
    { projectId: pid(0), milestone: "Foundation complete", owner: "S. Bekele", baselineDate: d(-80), forecastDate: d(-80), actualDate: d(-85), status: "Reached" },
    { projectId: pid(0), milestone: "Fit-out level 3", owner: "S. Bekele", baselineDate: d(120), forecastDate: d(150), status: "In Progress" },
    { projectId: pid(0), milestone: "Snagging & handover", owner: "S. Bekele", baselineDate: d(150), forecastDate: d(180), status: "Open" },
    { projectId: pid(1), milestone: "API integration cutover", owner: "A. Hailu", baselineDate: d(30), forecastDate: d(35), status: "In Progress" },
    { projectId: pid(2), milestone: "Telematics hardware pilot", owner: "B. Tesfaye", baselineDate: d(-20), forecastDate: d(20), status: "Missed" },
    { projectId: pid(2), milestone: "Fleet rollout batch 1", owner: "B. Tesfaye", baselineDate: d(120), forecastDate: d(160), status: "Open" },
    { projectId: pid(3), milestone: "Renovation complete", owner: "C. Girma", baselineDate: d(-10), forecastDate: d(-10), actualDate: d(-20), status: "Reached" },
    { projectId: pid(4), milestone: "CRM training delivered", owner: "S. Bekele", baselineDate: d(30), forecastDate: d(45), status: "In Progress" },
    { projectId: pid(5), milestone: "Billing engine go-live", owner: "D. Fekadu", baselineDate: d(60), forecastDate: d(80), status: "Open" },
    { projectId: pid(6), milestone: "Portal beta", owner: "E. Kebede", baselineDate: d(60), forecastDate: d(75), status: "Open" },
  ]);

  await db.insert(pmoRaid).values([
    { projectId: pid(2), type: "Risk", description: "Supplier telematics API delays integration", category: "Vendor", probability: "High", impact: "High", riskScore: 9, priority: "Critical", owner: "B. Tesfaye", dueDate: d(14), status: "Open", dateRaised: d(-30), escalation: "Steering committee" },
    { projectId: pid(5), type: "Issue", description: "Cost overrun on billing engine", category: "Cost", probability: "High", impact: "Medium", riskScore: 6, priority: "High", owner: "D. Fekadu", dueDate: d(7), status: "Open", dateRaised: d(-20), mitigation: "Approval gate via CC-001" },
    { projectId: pid(0), type: "Risk", description: "Permit approval for tower fit-out", category: "Compliance", probability: "Medium", impact: "Medium", riskScore: 4, priority: "Medium", owner: "S. Bekele", dueDate: d(21), status: "Monitoring", dateRaised: d(-60) },
    { projectId: pid(1), type: "Dependency", description: "Apartment data feed from legacy LDAP", category: "Technical", probability: "Low", impact: "Medium", riskScore: 2, priority: "Low", owner: "A. Hailu", status: "Closed", dateRaised: d(-90), dateClosed: d(-10), resolution: "Migration completed" },
    { projectId: pid(4), type: "Assumption", description: "Business owner provides training hours", category: "Resource", probability: "Medium", impact: "Low", riskScore: 2, priority: "Low", owner: "S. Bekele", dueDate: d(30), status: "Open", dateRaised: d(-40) },
  ]);

  await db.insert(pmoActions).values([
    { projectId: pid(2), source: "Risk Review 12", action: "Sign supplier integration addendum", owner: "B. Tesfaye", priority: "Critical", dateOpened: d(-10), dueDate: d(-2), status: "Open" },
    { projectId: pid(5), source: "Monthly Review", action: "Present cost overrun to steering for approval", owner: "D. Fekadu", priority: "High", dateOpened: d(-7), dueDate: d(0), status: "In Progress" },
    { projectId: pid(0), source: "Project Board", action: "Confirm revised fit-out sequence with consultant", owner: "S. Bekele", priority: "High", dateOpened: d(-5), dueDate: d(3), status: "Open" },
    { projectId: pid(1), source: "Daily Stand-up", action: "Update portal UAT script pack", owner: "A. Hailu", priority: "Medium", dateOpened: d(-4), dueDate: d(1), status: "Open" },
    { projectId: pid(3), source: "Closure Meeting", action: "Archive as-built drawings", owner: "C. Girma", priority: "Low", dateOpened: d(-15), status: "Completed", completionDate: d(-12) },
    { projectId: pid(6), source: "Kick-off", action: "Define helpdesk SLAs", owner: "E. Kebede", priority: "Medium", dateOpened: d(-10), dueDate: d(10), status: "In Progress" },
    { projectId: pid(4), source: "Change Board", action: "Draft CRM training budget", owner: "S. Bekele", priority: "Medium", dateOpened: d(-6), status: "Completed", completionDate: d(-3) },
  ]);

  await db.insert(pmoStakeholders).values([
    { name: "Sara Ahmed", role: "Portfolio Sponsor", department: "Executive", influence: "High", interest: "High", engagement: "Leading", class: "Key Player", infoNeeded: "Portfolio status, budget", frequency: "Monthly", channel: "Steering meeting", owner: "PMO" },
    { name: "David Miller", role: "Finance Director", department: "Finance", influence: "High", interest: "Medium", engagement: "Supportive", class: "Keep Satisfied", infoNeeded: "Cost and forecast", frequency: "Weekly", channel: "Email", owner: "D. Fekadu" },
    { name: "Helen Chen", role: "IT Operations", department: "IT", influence: "Medium", interest: "High", engagement: "Supportive", class: "Manage Closely", infoNeeded: "Release and cutover plans", frequency: "Weekly", channel: "Ops meeting", owner: "A. Hailu" },
    { name: "James Okafor", role: "Legal Counsel", department: "Legal", influence: "Medium", interest: "Low", engagement: "Neutral", class: "Keep Informed", infoNeeded: "Compliance approvals", frequency: "On Demand", channel: "Email", owner: "PMO" },
    { name: "Maria Rossi", role: "End User Rep", department: "Operations", influence: "Low", interest: "High", engagement: "Resistant", class: "Keep Informed", infoNeeded: "Training schedule", frequency: "Weekly", channel: "Town hall", owner: "C. Girma" },
  ]);

  await db.insert(pmoCosts).values([
    { projectId: pid(0), category: "Personnel", totalApproved: 480000, committed: 400000, actual: 260000, forecast: 500000, owner: "S. Bekele" },
    { projectId: pid(0), category: "Procurement", totalApproved: 520000, committed: 380000, actual: 240000, forecast: 540000, owner: "S. Bekele" },
    { projectId: pid(0), category: "Other", totalApproved: 200000, committed: 150000, actual: 120000, forecast: 260000, owner: "S. Bekele" },
    { projectId: pid(1), category: "Personnel", totalApproved: 300000, committed: 260000, actual: 210000, forecast: 320000, owner: "A. Hailu" },
    { projectId: pid(1), category: "Software", totalApproved: 350000, committed: 300000, actual: 210000, forecast: 370000, owner: "A. Hailu" },
    { projectId: pid(2), category: "Procurement", totalApproved: 1200000, committed: 900000, actual: 520000, forecast: 1500000, owner: "B. Tesfaye" },
    { projectId: pid(2), category: "Personnel", totalApproved: 600000, committed: 480000, actual: 260000, forecast: 680000, owner: "B. Tesfaye" },
    { projectId: pid(2), category: "Hardware", totalApproved: 300000, committed: 280000, actual: 120000, forecast: 320000, owner: "B. Tesfaye" },
    { projectId: pid(3), category: "Procurement", totalApproved: 250000, committed: 250000, actual: 240000, forecast: 240000, owner: "C. Girma" },
    { projectId: pid(5), category: "Personnel", totalApproved: 520000, committed: 510000, actual: 460000, forecast: 600000, owner: "D. Fekadu" },
    { projectId: pid(5), category: "Software", totalApproved: 460000, committed: 440000, actual: 360000, forecast: 550000, owner: "D. Fekadu" },
    { projectId: pid(6), category: "Personnel", totalApproved: 140000, committed: 60000, actual: 18000, forecast: 150000, owner: "E. Kebede" },
  ]);

  await db.insert(pmoResources).values([
    { resource: "S. Bekele", department: "Operations", role: "Project Manager", allocation: 80, availability: 100 },
    { resource: "A. Hailu", department: "IT", role: "Solutions Architect", allocation: 70, availability: 100 },
    { resource: "B. Tesfaye", department: "Operations", role: "Delivery Lead", allocation: 110, availability: 100 },
    { resource: "C. Girma", department: "Operations", role: "Site Manager", allocation: 50, availability: 100 },
    { resource: "D. Fekadu", department: "Finance", role: "Finance Analyst", allocation: 60, availability: 100 },
    { resource: "E. Kebede", department: "IT", role: "Product Owner", allocation: 40, availability: 60 },
    { resource: "F. Deneke", department: "IT", role: "Developer", allocation: 100, availability: 100 },
  ]);

  await db.insert(pmoChanges).values([
    { projectId: pid(5), requestedBy: "D. Fekadu", requestDate: d(-20), description: "Billing engine licence uplift to cover volume growth", reason: "Contractual volumes exceed estimate", scopeImpact: "Additional migration batch", scheduleImpact: 20, costImpact: 170000, priority: "High", impactAssessment: "Justified by volume growth; budget required", recommendation: "Approve", approvalStatus: "Pending", implementationStatus: "Not Started" },
    { projectId: pid(2), requestedBy: "B. Tesfaye", requestDate: d(-10), description: "Realign batch rollout to supplier availability", reason: "Supplier delay", scheduleImpact: 40, costImpact: 0, priority: "High", recommendation: "Approve with risk review", approvalStatus: "Approved", approvalDate: d(-3), implementationStatus: "In Progress" },
    { projectId: pid(0), requestedBy: "S. Bekele", requestDate: d(-4), description: "Add sprinkler upgrade to level 3 fit-out", reason: "Building code update", scheduleImpact: 15, costImpact: 120000, priority: "Medium", approvalStatus: "Pending", implementationStatus: "Not Started" },
  ]);

  await db.insert(pmoDecisions).values([
    { projectId: pid(5), decisionDate: d(-15), decisionRequired: "Approve cost overrun on billing engine", options: "Approve overrun; descope module; re-baseline", recommendation: "Approve and re-baseline budget", maker: "Sara Ahmed", owner: "D. Fekadu", dueDate: d(2), status: "Pending" },
    { projectId: pid(2), decisionDate: d(-20), decisionRequired: "Select telematics supplier addendum", recommendation: "Accept revised terms", maker: "Sara Ahmed", owner: "B. Tesfaye", dueDate: d(-3), status: "Made" },
    { projectId: pid(0), decisionRequired: "Approve sprinkler upgrade scope", options: "Full upgrade; defer to next phase", recommendation: "Full upgrade", owner: "S. Bekele", dueDate: d(10), status: "Pending" },
  ]);

  await db.insert(pmoMeetings).values([
    { date: d(-6), projectId: pid(2), meetingType: "Risk Review", chair: "PMO", attendees: "B. Tesfaye, Procurement", agenda: "Supplier risk", discussion: "Addendum terms reviewed", decision: "Accept revised terms", action: "Capture in decision log", owner: "B. Tesfaye", status: "Held" },
    { date: d(-2), projectId: pid(0), meetingType: "Project Board", chair: "Sara Ahmed", attendees: "S. Bekele, Consultant", agenda: "Fit-out sequence", decision: "Sequence revised", action: "Agree new forecast", owner: "S. Bekele", dueDate: d(3), status: "Held" },
    { date: d(1), projectId: pid(5), meetingType: "Steering", chair: "Sara Ahmed", attendees: "D. Fekadu, Finance", agenda: "Budget approval", status: "Scheduled" },
    { date: d(-12), projectId: pid(1), meetingType: "Status", chair: "PMO", attendees: "A. Hailu, IT", status: "Cancelled" },
  ]);

  await db.insert(pmoClosure).values([
    { projectId: pid(3), item: "As-built drawings archived", owner: "C. Girma", dueDate: d(-15), status: "Complete", completedDate: d(-12) },
    { projectId: pid(3), item: "Final accounts agreed", owner: "D. Fekadu", dueDate: d(-10), status: "Complete", completedDate: d(-8) },
    { projectId: pid(3), item: "Lessons learned captured", owner: "PMO", dueDate: d(-5), status: "Open" },
  ]);

  await db.insert(pmoQuality).values([
    { projectId: pid(1), deliverable: "UAT script pack", criteria: "All scenarios mapped", owner: "A. Hailu", plannedDate: d(-8), result: "Pass", defects: 0, status: "Complete" },
    { projectId: pid(2), deliverable: "Telematics pilot acceptance", criteria: "98% uptime over 30 days", owner: "B. Tesfaye", plannedDate: d(20), result: "Pending", status: "Open" },
    { projectId: pid(0), deliverable: "Level 3 engineering check", criteria: "Zero critical defects", owner: "C. Girma", plannedDate: d(10), result: "Fail", defects: 4, correctiveAction: "Contractor rework", status: "In Progress" },
  ]);

  await db.insert(pmoProcurement).values([
    { projectId: pid(2), item: "Telematics hardware batch 1", requester: "B. Tesfaye", supplier: "Apex Supply Co", poNo: "PO-2211", totalApproved: 600000, quotedCost: 570000, approvedCost: 580000, orderDate: d(-40), expectedDelivery: d(20), status: "Ordered" },
    { projectId: pid(0), item: "Lifts & elevators", requester: "S. Bekele", supplier: "Marina Shift Ltd", totalApproved: 400000, quotedCost: 420000, status: "Quotation" },
    { projectId: pid(6), item: "Helpdesk headsets", requester: "E. Kebede", supplier: "Office Depot", totalApproved: 5000, quotedCost: 4800, approvedCost: 4800, orderDate: d(-10), expectedDelivery: d(5), actualDelivery: d(3), status: "Delivered" },
  ]);

  await db.insert(pmoComms).values([
    { audience: "Steering committee", info: "Monthly portfolio status & budget", owner: "PMO", frequency: "Monthly", format: "Dashboard pack", channel: "Email", timing: "1st working day", purpose: "Governance", escalation: "CEO" },
    { audience: "Project managers", info: "Weekly progress pack", owner: "PMO", frequency: "Weekly", format: "Register extracts", channel: "Email", timing: "Friday", purpose: "Control" },
    { audience: "Staff", info: "Programme highlights", owner: "PMO", frequency: "Quarterly", format: "Newsletter", channel: "Intranet", purpose: "Engagement" },
    { audience: "Customers", info: "Delivery milestones reached", owner: "Project managers", frequency: "On Demand", format: "Status summary", channel: "Email", purpose: "Transparency", escalation: "Account director" },
  ]);

  await db.insert(pmoRaci).values([
    { activity: "Project charter sign-off", sponsor: "A", pmo: "R", projectManager: "C", businessOwner: "C", itLead: "I", endUsers: "I", validation: "OK - single accountable" },
    { activity: "Portfolio reporting", pmo: "A", projectManager: "R", sponsor: "I", finance: "C", validation: "OK - single accountable" },
    { activity: "Budget approval", sponsor: "A", finance: "R", pmo: "C", projectManager: "C", validation: "OK - single accountable" },
    { activity: "UAT execution", endUsers: "R", qa: "A", projectManager: "C", developer: "C", itLead: "I", validation: "OK - single accountable" },
  ]);

  await db.insert(pmoLessons).values([
    { projectId: pid(3), date: d(-10), area: "Procurement", wentWell: "Early engagement with supplier", wentWrong: "Lift scope changed late", rootCause: "Codes changed post design", lesson: "Validate codes before budget freeze", recommendation: "Embed building-code review gate", owner: "PMO", status: "Actioned" },
    { projectId: pid(5), date: d(-15), area: "Cost", wentWrong: "Underestimated integration effort", rootCause: "Data volume unknown", lesson: "Contingency for data migration", recommendation: "Fund migration pilots first", owner: "D. Fekadu", status: "Open" },
  ]);

  console.log("PMO seed complete:", projects.length, "projects");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});