"""Sheet schemas + sample data (part 2): RACI, stakeholders, change, cost, resources,
procurement, quality, meetings, decisions, communication, closure, lessons, 30/60/90."""

from pmo_specs import C, d, RAG_MAP, ACTION_MAP
from pmo_core import G_BG, G_TX, A_BG, A_TX, R_BG, R_TX, N_BG, N_TX

# --------------------------------------------------------------------------- #
RACI_ROLES = ["Sponsor", "PMO", "Project Manager", "Business Owner", "IT Lead",
              "Developer", "Finance", "Procurement", "QA", "End Users"]

_RACI_ROWS = [
    ("Project charter approval", ["A", "R", "C", "C", "I", "I", "C", "I", "I", "I"]),
    ("Requirements sign-off", ["I", "C", "R", "A", "C", "I", "C", "I", "C", "C"]),
    ("Solution design", ["I", "I", "A", "C", "R", "R", "I", "I", "C", "I"]),
    ("Development / configuration", ["I", "I", "A", "I", "C", "R", "I", "I", "C", "I"]),
    ("Data migration", ["I", "I", "A", "C", "R", "R", "C", "I", "C", "I"]),
    ("Testing and UAT", ["I", "I", "C", "R", "C", "R", "I", "I", "A", "R"]),
    ("Go-live approval", ["A", "I", "R", "C", "C", "I", "C", "I", "C", "I"]),
    ("Budget approval", ["C", "I", "R", "I", "I", "I", "A", "I", "I", "I"]),
    ("Vendor selection", ["I", "I", "R", "I", "C", "I", "C", "A", "C", "I"]),
    ("Lessons learned", ["I", "A", "R", "C", "C", "I", "I", "I", "C", "C"]),
]

RACI_SPEC = {
    "sheet": "08_RACI_MATRIX",
    "table": "tblRACI",
    "title": "RACI MATRIX",
    "purpose": "Who is Responsible, Accountable, Consulted and Informed for each activity. Exactly one Accountable per row - the validation column flags any row that breaks the rule.",
    "cols": (
        [C("Activity / Deliverable", 32, desc="Project activity or deliverable")]
        + [C(role, 13, lst="L_RACI", desc=f"{role} RACI code") for role in RACI_ROLES]
        + [
            C("A Count", 9, t="int", desc="Number of Accountable cells in the row",
              f=lambda L, r: f'=IF({L["Activity / Deliverable"]}{r}="","",COUNTIF(${L["Activity / Deliverable"]}{r}:{L["End Users"]}{r},"A"))'),
            C("Validation", 24, desc="Rule check: exactly one Accountable",
              f=lambda L, r: (f'=IF({L["Activity / Deliverable"]}{r}="","",IF({L["A Count"]}{r}=1,"OK",'
                              f'IF({L["A Count"]}{r}=0,"ERROR - NO ACCOUNTABLE","ERROR - MULTIPLE ACCOUNTABLE")))')),
            C("Notes", 24, t="wrap", desc="Commentary"),
        ]
    ),
    "sample": [
        {**{"Activity / Deliverable": row[0], "Notes": "SAMPLE"},
         **{role: row[1][i] for i, role in enumerate(RACI_ROLES)}}
        for row in _RACI_ROWS
    ],
    "capacity": 30,
    "tab": "2E75B6",
    "cf": [
        ("f", "L5:L34", '=AND(ISNUMBER($L5),$L5<>1)', R_BG, R_TX),
        ("f", "L5:L34", '=AND(ISNUMBER($L5),$L5=1)', G_BG, G_TX),
        ("f", "M5:M34", '=AND($M5<>"",LEFT($M5,2)<>"OK")', R_BG, R_TX),
        ("f", "M5:M34", '=EXACT($M5,"OK")', G_BG, G_TX),
    ],
    "dq": {"dup": "Activity / Deliverable", "key": "Activity / Deliverable"},
}

# --------------------------------------------------------------------------- #
STAKEHOLDER_SPEC = {
    "sheet": "09_STAKEHOLDERS",
    "table": "tblStakeholders",
    "title": "STAKEHOLDER REGISTER",
    "purpose": "People who can help or block the portfolio, with influence/interest classification (automatic) and the engagement approach for each one.",
    "cols": [
        C("Stakeholder", 22, desc="Person or group"),
        C("Role", 18, desc="Role in the organisation"),
        C("Department", 14, lst="L_Dept", desc="Department"),
        C("Influence", 11, lst="L_HML", desc="Power to affect the project"),
        C("Interest", 11, lst="L_HML", desc="Level of interest"),
        C("Engagement Level", 16, lst="L_Engagement", desc="Current engagement"),
        C("Power/Interest Class", 20, desc="Automatic quadrant classification",
          f=lambda L, r: (f'=IF({L["Stakeholder"]}{r}="","",IF(AND({L["Influence"]}{r}="High",{L["Interest"]}{r}="High"),"Manage Closely",'
                          f'IF({L["Influence"]}{r}="High","Keep Satisfied",IF({L["Interest"]}{r}="High","Keep Informed","Monitor"))))')),
        C("Information Needed", 30, t="wrap", desc="What they must receive"),
        C("Frequency", 14, lst="L_Frequency", desc="How often"),
        C("Channel", 16, desc="How it is delivered"),
        C("Owner", 16, lst="L_Owner", desc="Who communicates"),
        C("Strategy", 32, t="wrap", desc="Engagement approach"),
        C("Notes", 22, t="wrap", desc="Commentary / SAMPLE marker"),
    ],
    "sample": [
        {"Stakeholder": "Sarah Mitchell (CEO)", "Role": "Executive Sponsor", "Department": "Operations",
         "Influence": "High", "Interest": "High", "Engagement Level": "Supportive",
         "Information Needed": "Portfolio RAG, top risks, decisions required", "Frequency": "Weekly",
         "Channel": "Executive dashboard", "Owner": "Priya Raman",
         "Strategy": "SAMPLE - manage closely, decision-ready pack every Friday", "Notes": "SAMPLE"},
        {"Stakeholder": "Ahmed Khan", "Role": "Project Manager", "Department": "IT",
         "Influence": "High", "Interest": "High", "Engagement Level": "Leading",
         "Information Needed": "Schedule, RAID, actions", "Frequency": "Daily", "Channel": "Teams",
         "Owner": "Priya Raman", "Strategy": "SAMPLE - daily stand-up and action follow-up",
         "Notes": "SAMPLE"},
        {"Stakeholder": "Finance Director", "Role": "Budget Owner", "Department": "Finance",
         "Influence": "High", "Interest": "Medium", "Engagement Level": "Neutral",
         "Information Needed": "Actual vs approved cost, forecast", "Frequency": "Monthly",
         "Channel": "Cost report", "Owner": "Priya Raman", "Strategy": "SAMPLE - keep satisfied with cost accuracy",
         "Notes": "SAMPLE"},
        {"Stakeholder": "HR Director", "Role": "Business Owner", "Department": "HR",
         "Influence": "High", "Interest": "High", "Engagement Level": "Supportive",
         "Information Needed": "HR system progress, UAT readiness", "Frequency": "Weekly",
         "Channel": "Meeting", "Owner": "David Okoro", "Strategy": "SAMPLE - manage closely",
         "Notes": "SAMPLE"},
        {"Stakeholder": "IT Operations Lead", "Role": "Technical Lead", "Department": "IT",
         "Influence": "Medium", "Interest": "High", "Engagement Level": "Leading",
         "Information Needed": "Infrastructure tasks, cut-over plan", "Frequency": "Weekly",
         "Channel": "Teams", "Owner": "Tom Becker", "Strategy": "SAMPLE - keep engaged",
         "Notes": "SAMPLE"},
        {"Stakeholder": "Procurement Manager", "Role": "Supplier Manager", "Department": "Procurement",
         "Influence": "Medium", "Interest": "Medium", "Engagement Level": "Neutral",
         "Information Needed": "Purchase requests, quotations", "Frequency": "Bi-Weekly",
         "Channel": "Email", "Owner": "Lisa Chen", "Strategy": "SAMPLE - keep informed",
         "Notes": "SAMPLE"},
        {"Stakeholder": "End User Community", "Role": "System Users", "Department": "Operations",
         "Influence": "Low", "Interest": "High", "Engagement Level": "Resistant",
         "Information Needed": "Training, go-live dates, changes", "Frequency": "Weekly",
         "Channel": "Newsletter", "Owner": "Maria Silva", "Strategy": "SAMPLE - keep informed, early training",
         "Notes": "SAMPLE"},
        {"Stakeholder": "Internal Audit", "Role": "Assurance", "Department": "Finance",
         "Influence": "Medium", "Interest": "Low", "Engagement Level": "Unaware",
         "Information Needed": "Control evidence, approvals", "Frequency": "Quarterly",
         "Channel": "Report", "Owner": "Grace Alemu", "Strategy": "SAMPLE - monitor",
         "Notes": "SAMPLE"},
    ],
    "capacity": 30,
    "tab": "2E75B6",
    "side_block": "quadrant",
    "cf": [
        ("map", "Power/Interest Class", {"Manage Closely": (G_BG, G_TX), "Keep Satisfied": (A_BG, A_TX),
                                         "Keep Informed": (A_BG, A_TX), "Monitor": (N_BG, N_TX)}),
        ("map", "Influence", {"High": (R_BG, R_TX), "Medium": (A_BG, A_TX), "Low": (G_BG, G_TX)}),
        ("map", "Interest", {"High": (R_BG, R_TX), "Medium": (A_BG, A_TX), "Low": (G_BG, G_TX)}),
    ],
    "dq": {"dup": "Stakeholder", "key": "Stakeholder"},
}

# --------------------------------------------------------------------------- #
CHANGE_SPEC = {
    "sheet": "10_CHANGE_CONTROL",
    "table": "tblChange",
    "title": "CHANGE CONTROL",
    "purpose": "Formal change requests with impact assessment and approval. No change may be implemented unless the approval status is Approved - the compliance column flags breaches.",
    "cols": [
        C("Change ID", 11, desc="Change request code"),
        C("Project", 24, lst="L_Projects", desc="Owning project"),
        C("Requested By", 17, desc="Requester"),
        C("Request Date", 13, t="date", desc="Date raised"),
        C("Change Description", 36, t="wrap", desc="What is changing"),
        C("Reason", 26, t="wrap", desc="Why the change is needed"),
        C("Scope Impact", 12, lst="L_HML", desc="Scope impact rating"),
        C("Schedule Impact (days)", 15, t="int", desc="Schedule impact in days"),
        C("Cost Impact", 13, t="money", desc="Cost impact amount"),
        C("Risk Impact", 12, lst="L_HML", desc="Risk impact rating"),
        C("Priority", 11, lst="L_Priority", desc="Change priority"),
        C("Impact Assessment", 30, t="wrap", desc="Assessment outcome"),
        C("Recommendation", 24, t="wrap", desc="PMO recommendation"),
        C("Approval Status", 15, lst="L_ChangeStatus", desc="Pending / Approved / Rejected"),
        C("Approved By", 16, lst="L_Owner", desc="Approver"),
        C("Approval Date", 13, t="date", desc="Date of decision"),
        C("Implementation Status", 17, lst="L_ImplStatus", desc="Delivery of the change"),
        C("Compliance Check", 24, desc="Automatic gate: implementation requires approval",
          f=lambda L, r: (f'=IF({L["Change ID"]}{r}="","",IF(AND({L["Approval Status"]}{r}<>"Approved",'
                          f'OR({L["Implementation Status"]}{r}="In Progress",{L["Implementation Status"]}{r}="Complete")),'
                          f'"INVALID - NOT APPROVED",IF({L["Approval Status"]}{r}="Pending","Awaiting Approval","OK")))')),
        C("Notes", 22, t="wrap", desc="Commentary"),
        C("PendingRank", 11, t="int", hidden=True, desc="Helper: pending rank for dashboard",
          f=lambda L, r: (f'=IF(OR({L["Change ID"]}{r}="",{L["Approval Status"]}{r}<>"Pending"),"",'
                          f'COUNTIF({L["Approval Status"]}$5:{L["Approval Status"]}$34,"Pending")'
                          f'-COUNTIF({L["Approval Status"]}$5:{L["Approval Status"]}{r},"Pending")+1)')),
    ],
    "sample": [
        {"Change ID": "CR-001", "Project": "ERP Implementation", "Requested By": "Business Owner",
         "Request Date": d("2026-10-02"), "Change Description": "Add payroll variance report to scope",
         "Reason": "New finance reporting requirement", "Scope Impact": "Medium", "Schedule Impact (days)": 12,
         "Cost Impact": 28000, "Risk Impact": "Medium", "Priority": "High",
         "Impact Assessment": "Adds 12 days and 28,000; no impact on go-live if built in sprint 4",
         "Recommendation": "Approve - funded from contingency", "Approval Status": "Pending",
         "Implementation Status": "Not Started", "Notes": "SAMPLE - awaiting steering approval"},
        {"Change ID": "CR-002", "Project": "Network Infrastructure Upgrade", "Requested By": "IT Operations Lead",
         "Request Date": d("2026-09-20"), "Change Description": "Upgrade switch count from 8 to 10",
         "Reason": "Two extra floors in scope", "Scope Impact": "Medium", "Schedule Impact (days)": 5,
         "Cost Impact": 15000, "Risk Impact": "Low", "Priority": "Medium",
         "Impact Assessment": "5 extra days, 15,000 cost", "Recommendation": "Approve",
         "Approval Status": "Approved", "Approved By": "Priya Raman", "Approval Date": d("2026-09-25"),
         "Implementation Status": "Complete", "Notes": "SAMPLE - ordered additional switches"},
        {"Change ID": "CR-003", "Project": "HR Management System", "Requested By": "HR Director",
         "Request Date": d("2026-10-06"), "Change Description": "Include mobile self-service module",
         "Reason": "Executive request", "Scope Impact": "High", "Schedule Impact (days)": 45,
         "Cost Impact": 95000, "Risk Impact": "High", "Priority": "High",
         "Impact Assessment": "45 days and 95,000 - breaches approved amount",
         "Recommendation": "Reject for phase 1, re-plan for phase 2", "Approval Status": "Pending",
         "Implementation Status": "Not Started", "Notes": "SAMPLE - needs sponsor decision"},
        {"Change ID": "CR-004", "Project": "Website Development", "Requested By": "Marketing Manager",
         "Request Date": d("2026-09-28"), "Change Description": "Add e-commerce checkout",
         "Reason": "Nice-to-have", "Scope Impact": "High", "Schedule Impact (days)": 60,
         "Cost Impact": 70000, "Risk Impact": "High", "Priority": "Low",
         "Impact Assessment": "Doubles remaining scope", "Recommendation": "Reject - out of phase 1",
         "Approval Status": "Rejected", "Approval Date": d("2026-10-01"),
         "Implementation Status": "Not Started", "Notes": "SAMPLE"},
        {"Change ID": "CR-005", "Project": "Office Security Upgrade", "Requested By": "Facilities Manager",
         "Request Date": d("2026-09-15"), "Change Description": "Add two extra camera locations",
         "Reason": "Blind spots identified", "Scope Impact": "Low", "Schedule Impact (days)": 2,
         "Cost Impact": 4500, "Risk Impact": "Low", "Priority": "Medium",
         "Impact Assessment": "2 days, 4,500 cost - within contingency", "Recommendation": "Approve",
         "Approval Status": "Approved", "Approved By": "Priya Raman", "Approval Date": d("2026-09-18"),
         "Implementation Status": "In Progress", "Notes": "SAMPLE"},
    ],
    "capacity": 30,
    "tab": "C0392B",
    "cf": [
        ("map", "Approval Status", {"Pending": (A_BG, A_TX), "Approved": (G_BG, G_TX), "Rejected": (R_BG, R_TX)}),
        ("map", "Compliance Check", {"OK": (G_BG, G_TX), "Awaiting Approval": (A_BG, A_TX),
                                     "INVALID - NOT APPROVED": (R_BG, R_TX)}),
    ],
    "dq": {"dup": "Change ID", "miss_owner": "Requested By", "miss_due": "Request Date", "key": "Change ID"},
}

# --------------------------------------------------------------------------- #
COST_ROWS = [
    ("CST-001", "ERP Implementation", "Personnel", "Ahmed Khan", 260000, 240000, 175000, 275000),
    ("CST-002", "ERP Implementation", "Software", "Priya Raman", 240000, 230000, 190000, 255000),
    ("CST-003", "ERP Implementation", "Hardware", "Tom Becker", 180000, 150000, 60000, 160000),
    ("CST-004", "ERP Implementation", "Consulting", "Grace Alemu", 120000, 100000, 70000, 170000),
    ("CST-005", "ERP Implementation", "Training", "Maria Silva", 50000, 20000, 25000, 50000),
    ("CST-006", "Network Infrastructure Upgrade", "Hardware", "Tom Becker", 220000, 210000, 95000, 205000),
    ("CST-007", "Network Infrastructure Upgrade", "Procurement", "Lisa Chen", 60000, 55000, 25000, 60000),
    ("CST-008", "Network Infrastructure Upgrade", "Personnel", "Grace Alemu", 40000, 38000, 20000, 40000),
    ("CST-009", "HR Management System", "Software", "David Okoro", 300000, 280000, 95000, 370000),
    ("CST-010", "HR Management System", "Consulting", "Grace Alemu", 120000, 110000, 35000, 130000),
    ("CST-011", "HR Management System", "Training", "Priya Raman", 60000, 40000, 20000, 60000),
    ("CST-012", "Website Development", "Personnel", "Maria Silva", 70000, 65000, 45000, 88000),
    ("CST-013", "Website Development", "Software", "Tom Becker", 30000, 25000, 12000, 30000),
    ("CST-014", "Website Development", "Other", "Priya Raman", 20000, 15000, 5000, 20000),
    ("CST-015", "Office Security Upgrade", "Hardware", "Tom Becker", 35000, 32000, 5000, 35000),
    ("CST-016", "Office Security Upgrade", "Procurement", "Lisa Chen", 25000, 22000, 4000, 25000),
    ("CST-017", "Payroll Reporting Portal", "Personnel", "Priya Raman", 75000, 75000, 72000, 72000),
    ("CST-018", "Payroll Reporting Portal", "Software", "Tom Becker", 20000, 20000, 20000, 20000),
    ("CST-019", "Legacy Fax System Decommission", "Other", "Tom Becker", 25000, 5000, 4000, 4000),
]

COST_SPEC = {
    "sheet": "11_COST_MANAGEMENT",
    "table": "tblCost",
    "title": "COST MANAGEMENT",
    "purpose": "Approved amount vs committed, actual and forecast cost by category. Variance, utilisation and the category summary are calculated automatically.",
    "cols": [
        C("Cost ID", 10, desc="Cost line code"),
        C("Project", 26, lst="L_Projects", desc="Owning project"),
        C("Cost Category", 16, lst="L_CostCategory", desc="Cost category"),
        C("Owner", 16, lst="L_Owner", desc="Cost owner"),
        C("Total Approved Amount", 17, t="money", desc="Approved amount for this line"),
        C("Committed Cost", 15, t="money", desc="Committed / ordered"),
        C("Actual Cost", 14, t="money", desc="Spent to date"),
        C("Forecast Cost", 15, t="money", desc="Expected at completion"),
        C("Budget Variance", 15, t="money", desc="Approved minus actual",
          f=lambda L, r: f'=IF(OR({L["Total Approved Amount"]}{r}="",{L["Actual Cost"]}{r}=""),"",{L["Total Approved Amount"]}{r}-{L["Actual Cost"]}{r})'),
        C("Forecast Variance", 15, t="money", desc="Approved minus forecast",
          f=lambda L, r: f'=IF(OR({L["Total Approved Amount"]}{r}="",{L["Forecast Cost"]}{r}=""),"",{L["Total Approved Amount"]}{r}-{L["Forecast Cost"]}{r})'),
        C("Cost Utilisation %", 15, t="pct", desc="Actual divided by approved",
          f=lambda L, r: f'=IF(OR({L["Cost ID"]}{r}="",{L["Total Approved Amount"]}{r}="",{L["Total Approved Amount"]}{r}=0),"",{L["Actual Cost"]}{r}/{L["Total Approved Amount"]}{r})'),
        C("Cost Status", 16, desc="Automatic cost flag",
          f=lambda L, r: (f'=IF({L["Cost ID"]}{r}="","",IF(OR({L["Total Approved Amount"]}{r}="",{L["Total Approved Amount"]}{r}=0),"No Budget",'
                          f'IF({L["Cost Utilisation %"]}{r}>1,"Over Budget",IF({L["Forecast Variance"]}{r}<0,"Forecast Overrun",'
                          f'IF({L["Cost Utilisation %"]}{r}>0.9,"Monitor","On Track")))))')),
        C("Notes", 24, t="wrap", desc="Commentary"),
    ],
    "sample": [
        {"Cost ID": r[0], "Project": r[1], "Cost Category": r[2], "Owner": r[3], "Total Approved Amount": r[4],
         "Committed Cost": r[5], "Actual Cost": r[6], "Forecast Cost": r[7], "Notes": "SAMPLE"}
        for r in COST_ROWS
    ],
    "capacity": 30,
    "tab": "1F4E79",
    "summary_block": "cost",
    "cf": [
        ("map", "Cost Status", {"On Track": (G_BG, G_TX), "Monitor": (A_BG, A_TX),
                                "Forecast Overrun": (R_BG, R_TX), "Over Budget": (R_BG, R_TX),
                                "No Budget": (N_BG, N_TX)}),
        ("bar", "Cost Utilisation %"),
        ("f", "Forecast Variance", '=AND(ISNUMBER($J5),$J5<0)', R_BG, R_TX),
    ],
    "dq": {"dup": "Cost ID", "miss_owner": "Owner", "key": "Cost ID"},
}

# --------------------------------------------------------------------------- #
RESOURCE_ROWS = [
    ("RES-001", "Ahmed Khan", "IT", "Project Manager", "ERP Implementation", 0.60, "2026-07-01", "2027-01-15", 1.0, "SAMPLE"),
    ("RES-002", "Ahmed Khan", "IT", "Project Manager", "Payroll Reporting Portal", 0.40, "2026-04-01", "2026-09-30", 1.0, "SAMPLE"),
    ("RES-003", "Lisa Chen", "IT", "Project Manager", "Network Infrastructure Upgrade", 0.70, "2026-08-15", "2026-11-30", 1.0, "SAMPLE"),
    ("RES-004", "Lisa Chen", "IT", "Project Manager", "Office Security Upgrade", 0.50, "2026-09-15", "2026-12-15", 1.0, "SAMPLE - over-allocated"),
    ("RES-005", "David Okoro", "HR", "Project Manager", "HR Management System", 0.80, "2026-09-01", "2027-05-15", 1.0, "SAMPLE"),
    ("RES-006", "Maria Silva", "Marketing", "Business Analyst", "Website Development", 0.50, "2026-09-15", "2026-12-05", 1.0, "SAMPLE"),
    ("RES-007", "Maria Silva", "Marketing", "Business Analyst", "ERP Implementation", 0.30, "2026-11-23", "2027-01-15", 1.0, "SAMPLE"),
    ("RES-008", "Priya Raman", "Finance", "PMO Analyst", "ERP Implementation", 0.60, "2026-07-01", "2027-01-15", 1.0, "SAMPLE"),
    ("RES-009", "Tom Becker", "Operations", "IT Lead", "Network Infrastructure Upgrade", 0.40, "2026-08-15", "2026-11-30", 1.0, "SAMPLE"),
    ("RES-010", "Tom Becker", "Operations", "IT Lead", "Office Security Upgrade", 0.40, "2026-09-15", "2026-12-15", 1.0, "SAMPLE"),
    ("RES-011", "Grace Alemu", "IT", "QA Lead", "ERP Implementation", 0.50, "2026-10-26", "2027-01-15", 1.0, "SAMPLE"),
]

RESOURCE_SPEC = {
    "sheet": "12_RESOURCE_MANAGEMENT",
    "table": "tblResources",
    "title": "RESOURCE MANAGEMENT",
    "purpose": "Allocation of people across projects. Utilisation is summed per person automatically: over 100% = red (overloaded), 80-100% = amber, below 80% = green.",
    "cols": [
        C("Resource ID", 11, desc="Allocation line code"),
        C("Resource", 20, desc="Person or team"),
        C("Department", 14, lst="L_Dept", desc="Department"),
        C("Role", 18, desc="Role on the project"),
        C("Project", 26, lst="L_Projects", desc="Project"),
        C("Allocation %", 13, t="pct", desc="Share of time allocated"),
        C("Start Date", 12, t="date", desc="Allocation start"),
        C("End Date", 12, t="date", desc="Allocation end"),
        C("Availability %", 14, t="pct", desc="Available capacity"),
        C("Utilisation %", 13, t="pct", desc="Total allocation of this person (auto)",
          f=lambda L, r: f'=IF({L["Resource"]}{r}="","",SUMIFS({L["Allocation %"]}$5:{L["Allocation %"]}$34,{L["Resource"]}$5:{L["Resource"]}$34,{L["Resource"]}{r}))'),
        C("Status", 15, desc="Overloaded / At Capacity / Available (auto)",
          f=lambda L, r: (f'=IF(OR({L["Resource"]}{r}="",{L["Utilisation %"]}{r}=""),"",IF({L["Utilisation %"]}{r}>1.001,"Overloaded",'
                          f'IF({L["Utilisation %"]}{r}>=0.8,"At Capacity","Available")))')),
        C("Notes", 26, t="wrap", desc="Commentary"),
    ],
    "sample": [
        {"Resource ID": r[0], "Resource": r[1], "Department": r[2], "Role": r[3], "Project": r[4],
         "Allocation %": r[5], "Start Date": d(r[6]), "End Date": d(r[7]), "Availability %": r[8],
         "Notes": r[9]}
        for r in RESOURCE_ROWS
    ],
    "capacity": 30,
    "tab": "1F4E79",
    "cf": [
        ("map", "Status", {"Overloaded": (R_BG, R_TX), "At Capacity": (A_BG, A_TX), "Available": (G_BG, G_TX)}),
        ("f", "Utilisation %", '=AND(ISNUMBER($J5),$J5>1)', R_BG, R_TX),
        ("f", "Utilisation %", '=AND(ISNUMBER($J5),$J5>=0.8,$J5<=1)', A_BG, A_TX),
        ("f", "Utilisation %", '=AND(ISNUMBER($J5),$J5<0.8)', G_BG, G_TX),
        ("f", "Allocation %", '=AND(ISNUMBER($F5),$F5>1)', R_BG, R_TX),
    ],
    "dq": {"dup": "Resource ID", "miss_owner": "Resource", "key": "Resource ID"},
}

# --------------------------------------------------------------------------- #
PROCUREMENT_ROWS = [
    ("PR-001", "ERP Implementation", "Application server", "Tom Becker", "Vendor A", "Q-4410", "PO-001", 250000, 245000, 245000, "2026-09-20", "2026-10-20", "2026-10-06", "Delivered", "SAMPLE"),
    ("PR-002", "Network Infrastructure Upgrade", "Managed switches (10)", "Lisa Chen", "Vendor B", "Q-4415", "PO-002", 220000, 218000, 218000, "2026-09-25", "2026-10-18", "", "Ordered", "SAMPLE"),
    ("PR-003", "Network Infrastructure Upgrade", "Cabling and connectors", "Lisa Chen", "Vendor C", "Q-4422", "", 60000, 58000, 0, "", "2026-10-30", "", "Approval", "SAMPLE"),
    ("PR-004", "HR Management System", "HR system licences", "David Okoro", "Vendor D", "Q-4431", "", 300000, 0, 0, "", "2026-11-15", "", "Quotation", "SAMPLE"),
    ("PR-005", "Office Security Upgrade", "CCTV cameras (8)", "Tom Becker", "Vendor E", "Q-4436", "PO-003", 35000, 34000, 34000, "2026-10-03", "2026-10-28", "", "Ordered", "SAMPLE"),
    ("PR-006", "ERP Implementation", "Training licences", "Maria Silva", "Vendor A", "Q-4440", "", 50000, 48000, 0, "", "2026-11-10", "", "Requested", "SAMPLE"),
    ("PR-007", "Website Development", "Hosting package", "Maria Silva", "Vendor F", "Q-4445", "PO-004", 30000, 30000, 30000, "2026-09-30", "2026-10-10", "2026-10-04", "Delivered", "SAMPLE"),
]

PROCUREMENT_SPEC = {
    "sheet": "13_PROCUREMENT",
    "table": "tblProcurement",
    "title": "PROCUREMENT TRACKER",
    "purpose": "Purchase requests through quotation, approval, order and delivery, with the variance between approved amount and approved cost.",
    "cols": [
        C("Request ID", 11, desc="Purchase request code"),
        C("Project", 26, lst="L_Projects", desc="Owning project"),
        C("Item", 26, desc="Item or service"),
        C("Requester", 16, lst="L_Owner", desc="Requester"),
        C("Supplier", 16, desc="Supplier"),
        C("Quotation", 13, desc="Quotation reference"),
        C("PO No.", 12, desc="Purchase order number"),
        C("Total Approved Amount", 17, t="money", desc="Approved amount for the item"),
        C("Quoted Cost", 14, t="money", desc="Supplier quotation"),
        C("Approved Cost", 14, t="money", desc="Cost approved for order"),
        C("Order Date", 12, t="date", desc="PO date"),
        C("Expected Delivery", 15, t="date", desc="Promised delivery"),
        C("Actual Delivery", 14, t="date", desc="Received date"),
        C("Status", 14, lst="L_ProcStatus", desc="Procurement status"),
        C("Variance", 13, t="money", desc="Approved amount minus approved cost",
          f=lambda L, r: f'=IF(OR({L["Total Approved Amount"]}{r}="",{L["Approved Cost"]}{r}=""),"",{L["Total Approved Amount"]}{r}-{L["Approved Cost"]}{r})'),
        C("Notes", 24, t="wrap", desc="Commentary"),
    ],
    "sample": [
        {"Request ID": r[0], "Project": r[1], "Item": r[2], "Requester": r[3], "Supplier": r[4],
         "Quotation": r[5], "PO No.": r[6], "Total Approved Amount": r[7], "Quoted Cost": r[8],
         "Approved Cost": r[9], "Order Date": d(r[10]) if r[10] else None,
         "Expected Delivery": d(r[11]) if r[11] else None,
         "Actual Delivery": d(r[12]) if r[12] else None, "Status": r[13], "Notes": r[14]}
        for r in PROCUREMENT_ROWS
    ],
    "capacity": 30,
    "tab": "1F4E79",
    "cf": [
        ("map", "Status", {"Requested": (N_BG, N_TX), "Quotation": (N_BG, N_TX), "Approval": (A_BG, A_TX),
                           "Ordered": (A_BG, A_TX), "Delivered": (G_BG, G_TX), "Cancelled": (R_BG, R_TX)}),
        ("f", "Expected Delivery", '=AND($A5<>"",$L5<>"",$L5<TODAY(),$M5="",$N5<>"Cancelled")', R_BG, R_TX),
    ],
    "dq": {"dup": "Request ID", "miss_owner": "Requester", "key": "Request ID"},
}

# --------------------------------------------------------------------------- #
QUALITY_ROWS = [
    ("QC-001", "ERP Implementation", "Requirements", "All requirements traceable and signed off", "Priya Raman", "2026-08-07", "2026-08-07", "Pass", 0, "", "Complete", "Sign-off document", "SAMPLE"),
    ("QC-002", "ERP Implementation", "Configuration", "Configuration reviewed against design", "Grace Alemu", "2026-10-09", "", "Pending", 0, "", "In Progress", "", "SAMPLE"),
    ("QC-003", "ERP Implementation", "Data migration", "Mock migration error rate below 1%", "David Okoro", "2026-10-30", "", "Pending", 0, "Re-run cleansing script", "In Progress", "", "SAMPLE"),
    ("QC-004", "Network Infrastructure Upgrade", "Installation", "Cable certification test passed", "Tom Becker", "2026-10-24", "", "Pending", 0, "", "In Progress", "", "SAMPLE"),
    ("QC-005", "Network Infrastructure Upgrade", "Design", "Site survey signed off by IT", "Lisa Chen", "2026-08-28", "2026-08-28", "Pass", 0, "", "Complete", "Survey report", "SAMPLE"),
    ("QC-006", "Website Development", "Design", "Brand and accessibility review", "Maria Silva", "2026-10-21", "", "Pending", 0, "", "In Progress", "", "SAMPLE"),
    ("QC-007", "HR Management System", "Requirements", "HR process workshops completed", "David Okoro", "2026-10-30", "", "Fail", 4, "Re-run two workshops with payroll team", "In Progress", "Workshop notes", "SAMPLE"),
    ("QC-008", "Payroll Reporting Portal", "Go-live", "Rollback plan tested", "Priya Raman", "2026-09-26", "2026-09-26", "Pass", 0, "", "Complete", "Test log", "SAMPLE"),
    ("QC-009", "Office Security Upgrade", "Assessment", "Security assessment report accepted", "Tom Becker", "2026-10-14", "", "Pending", 0, "", "Not Started", "", "SAMPLE"),
]

QUALITY_SPEC = {
    "sheet": "14_QUALITY_CONTROL",
    "table": "tblQuality",
    "title": "QUALITY CONTROL",
    "purpose": "Quality checks for each deliverable with result, defects and corrective action. The KPI block below reports pass rate and open corrective actions.",
    "cols": [
        C("QC ID", 10, desc="Quality check code"),
        C("Project", 26, lst="L_Projects", desc="Owning project"),
        C("Deliverable", 24, desc="Deliverable under review"),
        C("Quality Criteria", 34, t="wrap", desc="Acceptance criteria"),
        C("Owner", 16, lst="L_Owner", desc="Reviewer"),
        C("Planned Date", 13, t="date", desc="Planned review date"),
        C("Actual Date", 13, t="date", desc="Actual review date"),
        C("Result", 12, lst="L_QualityResult", desc="Pass / Fail / Pending / Waived"),
        C("Defects", 10, t="int", desc="Number of defects found"),
        C("Corrective Action", 28, t="wrap", desc="Action to fix failures"),
        C("Status", 14, lst="L_TaskStatus", desc="Check status"),
        C("Evidence", 20, desc="Link or reference to evidence"),
        C("Notes", 24, t="wrap", desc="Commentary / SAMPLE marker"),
    ],
    "sample": [
        {"QC ID": r[0], "Project": r[1], "Deliverable": r[2], "Quality Criteria": r[3], "Owner": r[4],
         "Planned Date": d(r[5]), "Actual Date": d(r[6]) if r[6] else None, "Result": r[7],
         "Defects": r[8], "Corrective Action": r[9], "Status": r[10], "Evidence": r[11], "Notes": r[12]}
        for r in QUALITY_ROWS
    ],
    "capacity": 30,
    "tab": "1F4E79",
    "summary_block": "quality",
    "cf": [
        ("map", "Result", {"Pass": (G_BG, G_TX), "Fail": (R_BG, R_TX), "Pending": (A_BG, A_TX),
                           "Waived": (N_BG, N_TX)}),
        ("map", "Status", {"Not Started": (N_BG, N_TX), "In Progress": (A_BG, A_TX),
                           "Complete": (G_BG, G_TX), "Blocked": (R_BG, R_TX)}),
        ("f", "Planned Date", '=AND($A5<>"",$F5<>"",$F5<TODAY(),$G5="")', R_BG, R_TX),
        ("f", "Defects", '=AND(ISNUMBER($I5),$I5>0)', A_BG, A_TX),
    ],
    "dq": {"dup": "QC ID", "miss_owner": "Owner", "miss_due": "Planned Date", "key": "QC ID"},
}

# --------------------------------------------------------------------------- #
MEETING_ROWS = [
    ("MTG-001", "2026-10-06", "ERP Implementation", "Steering Committee", "Sarah Mitchell",
     "Sarah Mitchell, Ahmed Khan, Priya Raman, David Okoro", "Status, RAID, change requests",
     "Reviewed Yellow RAG; vendor delivery risk escalated; CR-001 discussed",
     "Escalate vendor delivery risk to sponsor call", "Confirm vendor recovery plan", "Lisa Chen", "2026-10-13", "Open"),
    ("MTG-002", "2026-10-07", "Network Infrastructure Upgrade", "Project Team", "Lisa Chen",
     "Lisa Chen, Tom Becker, Grace Alemu", "Installation progress, site access",
     "Installation 55% complete; site access delayed by facilities",
     "Daily access confirmation until installation completes", "Confirm access window with facilities", "Tom Becker", "2026-10-09", "In Progress"),
    ("MTG-003", "2026-10-08", "HR Management System", "PMO Review", "Priya Raman",
     "Priya Raman, David Okoro, Grace Alemu", "Vendor shortlist, contract timeline",
     "Shortlist agreed; legal review booked; milestone M-012 overdue",
     "Re-baseline vendor milestone with steering committee", "Sign off vendor shortlist", "David Okoro", "2026-10-10", "Open"),
    ("MTG-004", "2026-10-01", "ERP Implementation", "Vendor Review", "Ahmed Khan",
     "Ahmed Khan, Vendor A delivery manager", "Module delivery dates",
     "Vendor confirmed revised dates for modules 3 and 4", "Accept revised dates, hold go-live date",
     "Publish revised delivery plan", "Ahmed Khan", "2026-10-08", "Complete"),
]

MEETING_SPEC = {
    "sheet": "16_MEETING_MINUTES",
    "table": "tblMeetings",
    "title": "MEETING MINUTES & ACTIONS",
    "purpose": "Minutes with the decision taken and the action raised. Every action must land in 07_ACTION_TRACKER with an owner and due date.",
    "cols": [
        C("Meeting ID", 11, desc="Meeting reference"),
        C("Date", 12, t="date", desc="Meeting date"),
        C("Project", 26, lst="L_Projects", desc="Project discussed"),
        C("Meeting Type", 18, lst="L_MeetingType", desc="Type of meeting"),
        C("Chair", 16, lst="L_Owner", desc="Chair"),
        C("Attendees", 34, t="wrap", desc="Who attended"),
        C("Agenda", 28, t="wrap", desc="Agenda items"),
        C("Discussion", 36, t="wrap", desc="What was discussed"),
        C("Decision", 32, t="wrap", desc="Decision taken"),
        C("Action", 32, t="wrap", desc="Action raised"),
        C("Owner", 16, lst="L_Owner", desc="Action owner"),
        C("Due Date", 12, t="date", desc="Action due date"),
        C("Status", 14, lst="L_ActionStatus", desc="Action status"),
        C("Notes", 24, t="wrap", desc="Commentary / SAMPLE marker"),
    ],
    "sample": [
        {"Meeting ID": r[0], "Date": d(r[1]), "Project": r[2], "Meeting Type": r[3], "Chair": r[4],
         "Attendees": r[5], "Agenda": r[6], "Discussion": r[7], "Decision": r[8], "Action": r[9],
         "Owner": r[10], "Due Date": d(r[11]), "Status": r[12], "Notes": "SAMPLE"}
        for r in MEETING_ROWS
    ],
    "capacity": 30,
    "tab": "2E75B6",
    "cf": [("map", "Status", ACTION_MAP)],
    "dq": {"dup": "Meeting ID", "miss_owner": "Chair", "miss_due": "Due Date", "key": "Meeting ID"},
}

# --------------------------------------------------------------------------- #
DECISION_ROWS = [
    ("DEC-001", "ERP Implementation", "2026-10-06", "Approve revised module delivery plan",
     "A) Accept vendor dates  B) Re-tender module  C) Descope module 4",
     "Accept vendor dates with weekly checkpoints", "", "Sarah Mitchell", "Go-live date protected",
     "Ahmed Khan", "2026-10-13", "Pending"),
    ("DEC-002", "HR Management System", "2026-10-08", "Select HR system vendor",
     "A) Vendor D  B) Vendor G  C) Build in-house",
     "Vendor D - best fit, references verified", "", "HR Director", "Contract value 300,000",
     "David Okoro", "2026-10-15", "Pending"),
    ("DEC-003", "ERP Implementation", "2026-09-25", "Approve data migration approach",
     "A) Single run  B) Phased by entity", "Phased migration by legal entity",
     "Use phased migration", "Sarah Mitchell", "Adds 5 days, lowers risk",
     "David Okoro", "2026-10-31", "Decided"),
    ("DEC-004", "Network Infrastructure Upgrade", "2026-09-18", "Approve additional switches",
     "A) Approve  B) Reject", "Approve - required for two extra floors",
     "Approve CR-002", "Priya Raman", "15,000 additional cost",
     "Lisa Chen", "2026-09-25", "Decided"),
    ("DEC-005", "Website Development", "2026-09-29", "Whether to add e-commerce checkout",
     "A) Add now  B) Phase 2", "Phase 2 - out of scope for launch",
     "Defer to phase 2", "Marketing Director", "No change to launch date",
     "Maria Silva", "2026-11-30", "Deferred"),
    ("DEC-006", "Office Security Upgrade", "2026-10-02", "Choose CCTV supplier",
     "A) Vendor E  B) Vendor H", "Vendor E - better warranty", "Select Vendor E",
     "Tom Becker", "Camera quality and warranty", "Tom Becker", "2026-10-10", "Decided"),
]

DECISION_SPEC = {
    "sheet": "17_DECISION_LOG",
    "table": "tblDecisions",
    "title": "DECISION LOG",
    "purpose": "Management decisions with options, recommendation, decision maker and follow-up. Pending decisions appear on the executive dashboard.",
    "cols": [
        C("Decision ID", 12, desc="Decision reference"),
        C("Project", 26, lst="L_Projects", desc="Owning project"),
        C("Decision Date", 13, t="date", desc="Date decision was taken"),
        C("Decision Required", 34, t="wrap", desc="The decision needed"),
        C("Options", 34, t="wrap", desc="Options considered"),
        C("Recommendation", 30, t="wrap", desc="PMO recommendation"),
        C("Decision", 30, t="wrap", desc="Final decision"),
        C("Decision Maker", 18, lst="L_Owner", desc="Who decides"),
        C("Impact", 26, t="wrap", desc="Impact if decided"),
        C("Follow-up Owner", 18, lst="L_Owner", desc="Who follows up"),
        C("Due Date", 12, t="date", desc="Decision required by"),
        C("Status", 14, lst="L_DecisionStatus", desc="Pending / Decided / Deferred / Rejected"),
        C("Notes", 22, t="wrap", desc="Commentary / SAMPLE marker"),
        C("PendingRank", 11, t="int", hidden=True, desc="Helper: pending rank for dashboard",
          f=lambda L, r: (f'=IF(OR({L["Decision ID"]}{r}="",{L["Status"]}{r}<>"Pending"),"",'
                          f'COUNTIF({L["Status"]}$5:{L["Status"]}$34,"Pending")-COUNTIF({L["Status"]}$5:{L["Status"]}{r},"Pending")+1)')),
    ],
    "sample": [
        {"Decision ID": r[0], "Project": r[1], "Decision Date": d(r[2]), "Decision Required": r[3],
         "Options": r[4], "Recommendation": r[5], "Decision": r[6], "Decision Maker": r[7],
         "Impact": r[8], "Follow-up Owner": r[9], "Due Date": d(r[10]), "Status": r[11],
         "Notes": "SAMPLE"}
        for r in DECISION_ROWS
    ],
    "capacity": 30,
    "tab": "1F4E79",
    "cf": [
        ("map", "Status", {"Pending": (A_BG, A_TX), "Decided": (G_BG, G_TX),
                           "Deferred": (N_BG, N_TX), "Rejected": (R_BG, R_TX)}),
        ("f", "Due Date", '=AND($A5<>"",$K5<>"",$K5<TODAY(),$L5="Pending")', R_BG, R_TX),
    ],
    "dq": {"dup": "Decision ID", "miss_owner": "Decision Maker", "miss_due": "Due Date", "key": "Decision ID"},
}

# --------------------------------------------------------------------------- #
COMM_ROWS = [
    ("COM-001", "Executive team", "Portfolio RAG, top risks, decisions required", "Priya Raman", "Weekly", "Dashboard", "Email", "Friday 09:00", "Management decision making", "CEO"),
    ("COM-002", "Project managers", "Schedule, RAID and action status", "Priya Raman", "Weekly", "Meeting", "Meeting", "Monday 10:00", "Coordinate delivery", "PMO Lead"),
    ("COM-003", "Project teams", "Task assignments and blockers", "Ahmed Khan", "Daily", "Meeting", "Teams", "09:15 stand-up", "Remove blockers", "Project Manager"),
    ("COM-004", "Finance", "Actual vs approved cost and forecast", "Priya Raman", "Monthly", "Report", "Email", "Working day 3", "Budget control", "Finance Director"),
    ("COM-005", "Business owners", "Progress, upcoming milestones, UAT readiness", "Maria Silva", "Weekly", "Report", "Email", "Thursday 16:00", "Set expectations", "Project Manager"),
    ("COM-006", "Suppliers", "Delivery plan and acceptance criteria", "Lisa Chen", "Bi-Weekly", "Meeting", "Meeting", "Alternate Tuesday", "Manage suppliers", "Procurement"),
    ("COM-007", "End users", "Training, go-live dates, changes", "Maria Silva", "Monthly", "Presentation", "Meeting", "Month 1 Wednesday", "Adoption and change", "Business Owner"),
    ("COM-008", "Steering committee", "Decisions, changes, benefits", "Priya Raman", "Monthly", "Presentation", "Meeting", "First Thursday", "Governance", "Executive Sponsor"),
]

COMM_SPEC = {
    "sheet": "18_COMMUNICATION_PLAN",
    "table": "tblCommPlan",
    "title": "COMMUNICATION PLAN",
    "purpose": "Who receives which information, how often, in what format, from whom - plus the escalation path when information does not flow.",
    "cols": [
        C("Comm ID", 10, desc="Communication reference"),
        C("Audience", 24, desc="Who receives the information"),
        C("Information", 36, t="wrap", desc="What is communicated"),
        C("Owner", 16, lst="L_Owner", desc="Who sends it"),
        C("Frequency", 14, lst="L_Frequency", desc="How often"),
        C("Format", 15, lst="L_Format", desc="Format of the message"),
        C("Channel", 16, lst="L_Channel", desc="Channel used"),
        C("Timing", 18, desc="When it is sent"),
        C("Purpose", 26, t="wrap", desc="Why it is sent"),
        C("Escalation Path", 22, desc="Where it goes if not delivered"),
        C("Notes", 22, t="wrap", desc="Commentary / SAMPLE marker"),
    ],
    "sample": [
        {"Comm ID": r[0], "Audience": r[1], "Information": r[2], "Owner": r[3], "Frequency": r[4],
         "Format": r[5], "Channel": r[6], "Timing": r[7], "Purpose": r[8],
         "Escalation Path": r[9], "Notes": "SAMPLE"}
        for r in COMM_ROWS
    ],
    "capacity": 30,
    "tab": "2E75B6",
    "cf": [],
    "dq": {"dup": "Comm ID", "miss_owner": "Owner", "key": "Comm ID"},
}

# --------------------------------------------------------------------------- #
_CLOSURE_ITEMS = [
    ("Deliverables accepted by business owner", "Maria Silva", "Complete", "Acceptance email 28-Sep"),
    ("Business sign-off obtained", "Priya Raman", "Complete", "Sign-off form"),
    ("Technical sign-off obtained", "Tom Becker", "Complete", "Tech review note"),
    ("Financial closure (invoices settled)", "Grace Alemu", "Complete", "Finance confirmation"),
    ("Contract closure with suppliers", "Lisa Chen", "N/A", "No external contract"),
    ("Documentation complete", "Priya Raman", "Complete", "Document library"),
    ("Training complete for users", "Maria Silva", "Complete", "Training attendance sheet"),
    ("Lessons learned captured", "Priya Raman", "In Progress", ""),
    ("Resources released", "Ahmed Khan", "Complete", "Resource plan update"),
    ("Archive complete (files, access, licences)", "Tom Becker", "In Progress", ""),
    ("Closure report issued", "Priya Raman", "Not Started", ""),
    ("Project formally closed", "Priya Raman", "Not Started", ""),
]

CLOSURE_SPEC = {
    "sheet": "19_PROJECT_CLOSURE",
    "table": "tblClosure",
    "title": "PROJECT CLOSURE CHECKLIST",
    "purpose": "Formal closure checklist per project. The completion indicator below must reach 100% before the project is marked Completed in the portfolio.",
    "cols": [
        C("Item ID", 10, desc="Checklist line code"),
        C("Project", 26, lst="L_Projects", desc="Project being closed"),
        C("Closure Item", 36, desc="What must be completed"),
        C("Owner", 16, lst="L_Owner", desc="Accountable owner"),
        C("Due Date", 13, t="date", desc="Due date"),
        C("Status", 15, lst="L_ClosureStatus", desc="Checklist status"),
        C("Evidence / Reference", 26, desc="Proof of completion"),
        C("Date Completed", 14, t="date", desc="Date completed"),
        C("Notes", 24, t="wrap", desc="Commentary"),
    ],
    "sample": [
        {"Item ID": f"CLS-{i+1:03d}", "Project": "Payroll Reporting Portal", "Closure Item": r[0],
         "Owner": r[1], "Due Date": d("2026-10-16"), "Status": r[2], "Evidence / Reference": r[3],
         "Date Completed": d("2026-10-02") if r[2] == "Complete" else None,
         "Notes": "SAMPLE"}
        for i, r in enumerate(_CLOSURE_ITEMS)
    ],
    "capacity": 30,
    "tab": "2E75B6",
    "summary_block": "closure",
    "cf": [
        ("map", "Status", {"Not Started": (N_BG, N_TX), "In Progress": (A_BG, A_TX),
                           "Complete": (G_BG, G_TX), "N/A": (N_BG, N_TX)}),
        ("f", "Due Date", '=AND($A5<>"",$E5<>"",$E5<TODAY(),$F5<>"Complete",$F5<>"N/A")', R_BG, R_TX),
    ],
    "dq": {"dup": "Item ID", "miss_owner": "Owner", "miss_due": "Due Date", "key": "Item ID"},
}

# --------------------------------------------------------------------------- #
LESSON_ROWS = [
    ("LL-001", "Payroll Reporting Portal", "2026-09-30", "Requirements",
     "Weekly business owner sessions kept scope stable", "Initial requirements took 6 weeks",
     "No process owner assigned at the start", "Assign a process owner before requirements start",
     "Make process owner a charter gate for every project", "Priya Raman", "Add to project charter template", "Complete"),
    ("LL-002", "Network Infrastructure Upgrade", "2026-10-03", "Vendor",
     "Early quotation request kept lead times short", "Cable delivery was late by one week",
     "Lead times not checked before planning", "Confirm supplier lead times during planning",
     "Add lead-time confirmation to the initiation checklist", "Lisa Chen", "Update initiation checklist", "In Progress"),
    ("LL-003", "ERP Implementation", "2026-10-06", "Risk",
     "Daily stand-ups surfaced blockers quickly", "UAT environment slipped", "Environments not ordered early",
     "Order test environments at design sign-off", "Add environment request as a design exit criterion",
     "Ahmed Khan", "Update design exit criteria", "Open"),
    ("LL-004", "Website Development", "2026-10-05", "Communication",
     "Marketing weekly demo kept users engaged", "Project paused for content approval", "Content owner not named",
     "Name content owners in the communication plan", "Require content owner in charter", "Maria Silva",
     "Update communication plan template", "In Progress"),
]

LESSON_SPEC = {
    "sheet": "20_LESSONS_LEARNED",
    "table": "tblLessons",
    "title": "LESSONS LEARNED",
    "purpose": "What went well, what did not, why, and the action that stops it happening again. Reviewed at every monthly portfolio meeting.",
    "cols": [
        C("Lesson ID", 11, desc="Lesson reference"),
        C("Project", 26, lst="L_Projects", desc="Source project"),
        C("Date", 12, t="date", desc="Date captured"),
        C("Area", 16, lst="L_LessonArea", desc="Knowledge area"),
        C("What Went Well", 32, t="wrap", desc="Positive observation"),
        C("What Went Wrong", 32, t="wrap", desc="Negative observation"),
        C("Root Cause", 30, t="wrap", desc="Why it happened"),
        C("Lesson", 32, t="wrap", desc="What was learned"),
        C("Recommendation", 32, t="wrap", desc="Recommended change"),
        C("Owner", 16, lst="L_Owner", desc="Who owns the improvement"),
        C("Action", 28, t="wrap", desc="Action to implement"),
        C("Status", 14, lst="L_ActionStatus", desc="Status of the action"),
        C("Notes", 22, t="wrap", desc="Commentary / SAMPLE marker"),
    ],
    "sample": [
        {"Lesson ID": r[0], "Project": r[1], "Date": d(r[2]), "Area": r[3], "What Went Well": r[4],
         "What Went Wrong": r[5], "Root Cause": r[6], "Lesson": r[7], "Recommendation": r[8],
         "Owner": r[9], "Action": r[10], "Status": r[11], "Notes": "SAMPLE"}
        for r in LESSON_ROWS
    ],
    "capacity": 30,
    "tab": "2E75B6",
    "cf": [("map", "Status", ACTION_MAP)],
    "dq": {"dup": "Lesson ID", "miss_owner": "Owner", "key": "Lesson ID"},
}

# --------------------------------------------------------------------------- #
_PLAN_ROWS = [
    ("First 30 Days", "Learn the portfolio", "Read the portfolio, RAID, actions and schedule for every active project", "Portfolio familiarisation notes", "All active projects understood", "Priya Raman", "2026-10-30", "In Progress"),
    ("First 30 Days", "Meet stakeholders", "Meet every project manager, sponsor and key business owner", "Stakeholder map", "100% of project managers met", "Priya Raman", "2026-10-23", "In Progress"),
    ("First 30 Days", "Learn PMO processes", "Document how status, changes and approvals currently work", "Current process map", "Process map approved", "Priya Raman", "2026-10-30", "Open"),
    ("First 30 Days", "Learn reporting", "Reproduce the existing weekly report and dashboard", "Baseline report", "Report produced without help", "Priya Raman", "2026-10-16", "Open"),
    ("First 30 Days", "Build the project register", "Load every project into this workbook with owner, dates and approved amount", "Project portfolio filled", "100% projects registered", "Priya Raman", "2026-10-15", "In Progress"),
    ("First 30 Days", "Learn company tools", "Learn the toolset used for finance, tickets and documents", "Tool access list", "Access granted to all systems", "Priya Raman", "2026-10-10", "Complete"),
    ("Days 31-60", "Improve reporting", "Switch the weekly report to formula-driven pulls from this workbook", "Automated weekly report", "Report time cut by 50%", "Priya Raman", "2026-11-15", "Open"),
    ("Days 31-60", "Standardise templates", "Roll out these templates to all project managers", "Template pack issued", "All PMs using the templates", "Priya Raman", "2026-11-10", "Open"),
    ("Days 31-60", "Improve RAID tracking", "Introduce weekly risk review and scoring discipline", "Weekly RAID review running", "No risk older than 30 days without review", "Priya Raman", "2026-11-20", "Open"),
    ("Days 31-60", "Improve action tracking", "Chase overdue actions daily from the dashboard", "Overdue action trend", "Overdue actions below 5", "Priya Raman", "2026-11-25", "Open"),
    ("Days 31-60", "Introduce governance", "Set change control and decision log rules with management", "Governance note approved", "No unapproved changes implemented", "Priya Raman", "2026-11-30", "Open"),
    ("Days 61-90", "Portfolio reporting", "Publish a monthly portfolio pack from the dashboard", "Monthly portfolio pack", "Pack issued on time each month", "Priya Raman", "2026-12-15", "Open"),
    ("Days 61-90", "KPI analysis", "Track RAG, cost and schedule trends over three months", "KPI trend report", "Trends visible for all KPIs", "Priya Raman", "2026-12-20", "Open"),
    ("Days 61-90", "Process improvement", "Remove the biggest causes of late reporting and late actions", "Improvement backlog", "At least 3 improvements delivered", "Priya Raman", "2026-12-31", "Open"),
    ("Days 61-90", "Executive reporting", "Run the monthly management review from the dashboard", "Management review minutes", "Management decisions logged within 5 days", "Priya Raman", "2026-12-31", "Open"),
]

PLAN_SPEC = {
    "sheet": "22_30_60_90_PLAN",
    "table": "tblPlan30",
    "title": "ASSISTANT PMO 30 / 60 / 90 DAY PLAN",
    "purpose": "Onboarding and improvement plan for the Assistant PMO: first 30 days learn and stabilise, 31-60 control and improve, 61-90 optimise and lead.",
    "cols": [
        C("Phase", 15, desc="First 30 / 31-60 / 61-90 days"),
        C("Focus Area", 22, desc="Focus of the activity"),
        C("Key Actions", 46, t="wrap", desc="What to do"),
        C("Deliverable", 26, t="wrap", desc="What must exist afterwards"),
        C("Success Measure", 28, t="wrap", desc="How success is measured"),
        C("Owner", 16, lst="L_Owner", desc="Owner"),
        C("Target Date", 13, t="date", desc="Target completion date"),
        C("Status", 14, lst="L_ActionStatus", desc="Status"),
        C("Notes", 22, t="wrap", desc="Commentary"),
    ],
    "sample": [
        {"Phase": r[0], "Focus Area": r[1], "Key Actions": r[2], "Deliverable": r[3],
         "Success Measure": r[4], "Owner": r[5], "Target Date": d(r[6]), "Status": r[7],
         "Notes": "SAMPLE"}
        for r in _PLAN_ROWS
    ],
    "capacity": 30,
    "tab": "2E75B6",
    "cf": [
        ("map", "Status", ACTION_MAP),
        ("map", "Phase", {"First 30 Days": (G_BG, G_TX), "Days 31-60": (A_BG, A_TX), "Days 61-90": (R_BG, R_TX)}),
        ("f", "Target Date", '=AND($G5<>"",$G5<TODAY(),$H5<>"Complete")', R_BG, R_TX),
    ],
    "dq": {"miss_owner": "Owner", "miss_due": "Target Date", "key": "Key Actions"},
}
