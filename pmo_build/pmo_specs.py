"""Sheet schemas + sample data for the Assistant PMO workbook (part 1: lists, portfolio, WBS, milestones, RAID, actions)."""

from datetime import datetime

from pmo_core import (SAMPLE_NOTE, G_BG, G_TX, A_BG, A_TX, R_BG, R_TX, N_BG, N_TX)


def d(s):
    return datetime.strptime(s, "%Y-%m-%d")


def C(h, w, t="text", lst=None, f=None, desc="", fmt=None, **kw):
    c = {"h": h, "w": w, "t": t, "d": desc or h}
    if lst:
        c["lst"] = lst
    if f:
        c["f"] = f
    if fmt:
        c["fmt"] = fmt
    c["src"] = "Calculated" if f else ("Drop-down" if lst else "Input")
    c.update(kw)
    return c


LISTS = [
    ("L_Status", "Project Status", ["Not Started", "Active", "On Hold", "Completed", "Cancelled"]),
    ("L_RAG", "RAG Status", ["Green", "Yellow", "Red"]),
    ("L_Priority", "Priority", ["Low", "Medium", "High", "Critical"]),
    ("L_HML", "High / Medium / Low", ["High", "Medium", "Low"]),
    ("L_Prob", "Risk Probability", ["Low", "Medium", "High", "Critical"]),
    ("L_Impact", "Risk Impact", ["Low", "Medium", "High", "Critical"]),
    ("L_RAIDType", "RAID Type", ["Risk", "Assumption", "Issue", "Dependency"]),
    ("L_RAIDStatus", "RAID Status", ["Open", "In Progress", "Closed"]),
    ("L_RAIDCategory", "RAID Category", ["Scope", "Schedule", "Budget", "Resource", "Technical",
                                         "Vendor", "Quality", "Security", "Legal", "Other"]),
    ("L_ActionStatus", "Action Status", ["Open", "In Progress", "Complete", "Cancelled"]),
    ("L_ChangeStatus", "Change Approval", ["Pending", "Approved", "Rejected"]),
    ("L_ImplStatus", "Implementation Status", ["Not Started", "In Progress", "Complete", "Deferred"]),
    ("L_MilestoneStatus", "Milestone Status", ["Not Started", "In Progress", "Complete", "Delayed", "Cancelled"]),
    ("L_TaskStatus", "Task Status", ["Not Started", "In Progress", "Complete", "Blocked"]),
    ("L_Dept", "Department", ["IT", "HR", "Finance", "Marketing", "Operations", "Sales",
                              "Procurement", "Facilities"]),
    ("L_ProjType", "Project Type", ["System Implementation", "Infrastructure", "Development",
                                    "Process Improvement", "Compliance", "Maintenance"]),
    ("L_Owner", "Owner / Team", ["Ahmed Khan", "Lisa Chen", "David Okoro", "Maria Silva",
                                 "Priya Raman", "Tom Becker", "Grace Alemu", "Sarah Mitchell"]),
    ("L_Engagement", "Engagement Level", ["Unaware", "Resistant", "Neutral", "Supportive", "Leading"]),
    ("L_Frequency", "Frequency", ["Daily", "Twice Weekly", "Weekly", "Bi-Weekly", "Monthly",
                                  "Quarterly", "Ad-hoc"]),
    ("L_YesNo", "Yes / No", ["Yes", "No"]),
    ("L_RACI", "RACI Code", ["R", "A", "C", "I"]),
    ("L_CostCategory", "Cost Category", ["Personnel", "Software", "Hardware", "Procurement",
                                         "Consulting", "Training", "Travel", "Other"]),
    ("L_ProcStatus", "Procurement Status", ["Requested", "Quotation", "Approval", "Ordered",
                                            "Delivered", "Cancelled"]),
    ("L_QualityResult", "Quality Result", ["Pass", "Fail", "Pending", "Waived"]),
    ("L_MeetingType", "Meeting Type", ["Project Team", "Steering Committee", "Sponsor Review",
                                       "Vendor Review", "PMO Review", "Ad-hoc"]),
    ("L_DecisionStatus", "Decision Status", ["Pending", "Decided", "Deferred", "Rejected"]),
    ("L_ClosureStatus", "Closure Status", ["Not Started", "In Progress", "Complete", "N/A"]),
    ("L_LessonArea", "Lesson Area", ["Planning", "Schedule", "Cost", "Scope", "Quality", "Resource",
                                     "Communication", "Risk", "Vendor", "Requirements", "Testing"]),
    ("L_Channel", "Channel", ["Email", "Teams", "Meeting", "SharePoint", "Portal", "Report"]),
    ("L_Format", "Format", ["Email", "Report", "Dashboard", "Presentation", "Meeting"]),
    ("L_FilterStatus", "Filter - Status", ["All", "Not Started", "Active", "On Hold", "Completed", "Cancelled"]),
    ("L_FilterRAG", "Filter - RAG", ["All", "Green", "Yellow", "Red"]),
    ("L_FilterMgr", "Filter - Manager", ["All", "Ahmed Khan", "Lisa Chen", "David Okoro",
                                         "Maria Silva", "Priya Raman", "Tom Becker", "Grace Alemu",
                                         "Sarah Mitchell"]),
]

GANTT_START = "2026-06-29"
GANTT_WEEKS = 24

MS = "'05_MILESTONES'"
PR = "'02_PROJECT_PORTFOLIO'"
DB = "'01_EXECUTIVE_DASHBOARD'"

RAG_MAP = {"Green": (G_BG, G_TX), "Yellow": (A_BG, A_TX), "Red": (R_BG, R_TX)}
STATUS_MAP = {"Active": (G_BG, G_TX), "Completed": (N_BG, N_TX), "On Hold": (A_BG, A_TX),
              "Not Started": (N_BG, N_TX), "Cancelled": (R_BG, R_TX)}
ACTION_MAP = {"Open": (N_BG, N_TX), "In Progress": (A_BG, A_TX), "Complete": (G_BG, G_TX),
              "Cancelled": (N_BG, N_TX)}


def upcoming_ms(ref):
    return f"AGGREGATE(15,6,{MS}!$M$5:$M$34/({MS}!$B$5:$B$34={ref}),1)"


# --------------------------------------------------------------------------- #
PORTFOLIO_SPEC = {
    "sheet": "02_PROJECT_PORTFOLIO",
    "table": "tblProjects",
    "title": "PROJECT PORTFOLIO REGISTER",
    "purpose": "Single source of truth for every project: customer, schedule, RAG, approved amount, actual and forecast cost. Dashboard KPIs and charts read from this table.",
    "cols": [
        C("Project ID", 11, desc="Unique project code (PRJ-001)"),
        C("Customer", 24, lst="L_Customers", desc="Client from the customer master list"),
        C("Project Name", 30, desc="Business name of the project"),
        C("Project Manager", 17, lst="L_Owner", desc="Accountable delivery manager"),
        C("Department", 13, lst="L_Dept", desc="Owning department"),
        C("Project Type", 20, lst="L_ProjType", desc="Portfolio classification"),
        C("Priority", 10, lst="L_Priority", desc="Business priority"),
        C("Start Date", 12, t="date", desc="Approved start date"),
        C("Baseline End Date", 14, t="date", desc="Approved / contractual finish"),
        C("Forecast End Date", 14, t="date", desc="Current best-estimate finish"),
        C("Actual End Date", 13, t="date", desc="Real finish date"),
        C("% Complete", 11, t="pct", desc="Percent complete reported by PM"),
        C("Status", 12, lst="L_Status", desc="Lifecycle status"),
        C("RAG", 9, lst="L_RAG", desc="Overall health reported by PM"),
        C("Total Approved Amount", 17, t="money", desc="Total approved amount for the project"),
        C("Actual Cost", 13, t="money", desc="Cost spent to date"),
        C("Forecast Cost", 14, t="money", desc="Expected cost at completion"),
        C("Schedule Variance", 13, t="int", desc="Forecast end minus baseline end (days)",
          f=lambda L, r: f'=IF(OR({L["Baseline End Date"]}{r}="",{L["Forecast End Date"]}{r}=""),"",{L["Forecast End Date"]}{r}-{L["Baseline End Date"]}{r})'),
        C("Cost Variance", 13, t="money", desc="Approved amount minus actual cost",
          f=lambda L, r: f'=IF(OR({L["Total Approved Amount"]}{r}="",{L["Actual Cost"]}{r}=""),"",{L["Total Approved Amount"]}{r}-{L["Actual Cost"]}{r})'),
        C("Next Milestone", 30, desc="Next open milestone (auto)",
          f=lambda L, r: f'=IFERROR(INDEX({MS}!$C$5:$C$34,MATCH({upcoming_ms("$" + L["Project Name"] + str(r))},{MS}!$M$5:$M$34,0)),"")'),
        C("Milestone Date", 13, t="date", desc="Forecast date of that milestone",
          f=lambda L, r: f'=IFERROR(INT({upcoming_ms("$" + L["Project Name"] + str(r))}),"")'),
        C("Project Health", 16, desc="Automatic health flag",
          f=lambda L, r: (f'=IF({L["Project Name"]}{r}="","",IF({L["Status"]}{r}="Completed","Closed",'
                          f'IF({L["Status"]}{r}="Cancelled","N/A",IF({L["RAG"]}{r}="Red","Critical",'
                          f'IF(OR({L["RAG"]}{r}="Yellow",AND({L["Forecast Cost"]}{r}<>"",{L["Total Approved Amount"]}{r}<>"",{L["Forecast Cost"]}{r}>{L["Total Approved Amount"]}{r}),'
                          f'AND({L["Schedule Variance"]}{r}<>"",{L["Schedule Variance"]}{r}>7)),"Needs Attention","Healthy")))))')),
        C("Last Updated", 13, t="date", desc="Date record last refreshed"),
        C("Notes", 34, t="wrap", desc="Commentary / SAMPLE marker"),
        C("ChartIdx", 8, t="int", hidden=True, desc="Helper: chart row sequence",
          f=lambda L, r: f'=IF({L["Project Name"]}{r}="","",COUNTIF(${L["Project Name"]}$5:${L["Project Name"]}{r},"?*"))'),
        C("RedRank", 8, t="int", hidden=True, desc="Helper: rank of red projects",
          f=lambda L, r: (f'=IF(OR({L["Project Name"]}{r}="",{L["RAG"]}{r}<>"Red"),"",'
                          f'COUNTIF(${L["RAG"]}$5:${L["RAG"]}$34,"Red")-COUNTIF(${L["RAG"]}$5:${L["RAG"]}{r},"Red")+1)')),
        C("ViewRank", 9, t="int", hidden=True, desc="Helper: rank after dashboard filters",
          f=lambda L, r: (
              f'=IF({L["Project Name"]}{r}="","",IF(AND('
              f'OR({DB}!$C$42="All",{DB}!$C$42=${L["Status"]}{r}),'
              f'OR({DB}!$F$42="All",{DB}!$F$42=${L["RAG"]}{r}),'
              f'OR({DB}!$I$42="All",{DB}!$I$42=${L["Project Manager"]}{r})),'
              f'SUMPRODUCT((${L["Project Name"]}$5:${L["Project Name"]}{r}<>"")'
              f'*((({DB}!$C$42="All")+(${L["Status"]}$5:${L["Status"]}{r}={DB}!$C$42))>0)'
              f'*((({DB}!$F$42="All")+(${L["RAG"]}$5:${L["RAG"]}{r}={DB}!$F$42))>0)'
              f'*((({DB}!$I$42="All")+(${L["Project Manager"]}$5:${L["Project Manager"]}{r}={DB}!$I$42))>0)),""))')),
        C("Timeline", 26, hidden=True, desc="Helper: start/end text for filter view",
          f=lambda L, r: (f'=IF({L["Project Name"]}{r}="","",TEXT({L["Start Date"]}{r},"dd-mmm-yy")&" - "&'
                          f'TEXT(IF({L["Actual End Date"]}{r}<>"",{L["Actual End Date"]}{r},{L["Forecast End Date"]}{r}),"dd-mmm-yy"))')),
        C("Budget/Actual", 22, hidden=True, desc="Helper: approved vs actual text",
          f=lambda L, r: (f'=IF({L["Project Name"]}{r}="","",TEXT({L["Total Approved Amount"]}{r},"#,##0")&" / "&'
                          f'TEXT({L["Actual Cost"]}{r},"#,##0"))')),
    ],
    "sample": [
        {"Project ID": "PRJ-001", "Customer": "HEINEKEN", "Project Name": "ERP Implementation",
         "Project Manager": "Ahmed Khan", "Department": "IT", "Project Type": "System Implementation",
         "Priority": "Critical", "Start Date": d("2026-07-01"), "Baseline End Date": d("2026-12-18"),
         "Forecast End Date": d("2027-01-15"), "% Complete": 0.62, "Status": "Active", "RAG": "Yellow",
         "Total Approved Amount": 850000, "Actual Cost": 520000, "Forecast Cost": 910000,
         "Last Updated": d("2026-10-07"), "Notes": "SAMPLE - ERP rollout, one month late on baseline."},
        {"Project ID": "PRJ-002", "Customer": "Internal", "Project Name": "Network Infrastructure Upgrade",
         "Project Manager": "Lisa Chen", "Department": "IT", "Project Type": "Infrastructure",
         "Priority": "High", "Start Date": d("2026-08-15"), "Baseline End Date": d("2026-11-30"),
         "Forecast End Date": d("2026-11-25"), "% Complete": 0.45, "Status": "Active", "RAG": "Green",
         "Total Approved Amount": 320000, "Actual Cost": 140000, "Forecast Cost": 305000,
         "Last Updated": d("2026-10-07"), "Notes": "SAMPLE - ahead of plan, vendor on track."},
        {"Project ID": "PRJ-003", "Customer": "H A K F TRADING PLC", "Project Name": "HR Management System",
         "Project Manager": "David Okoro", "Department": "HR", "Project Type": "System Implementation",
         "Priority": "High", "Start Date": d("2026-09-01"), "Baseline End Date": d("2027-03-31"),
         "Forecast End Date": d("2027-05-15"), "% Complete": 0.22, "Status": "Active", "RAG": "Red",
         "Total Approved Amount": 480000, "Actual Cost": 150000, "Forecast Cost": 560000,
         "Last Updated": d("2026-10-06"), "Notes": "SAMPLE - vendor delay and forecast overrun."},
        {"Project ID": "PRJ-004", "Customer": "MEGERSA MERGA MEGENTA", "Project Name": "Website Development",
         "Project Manager": "Maria Silva", "Department": "Marketing", "Project Type": "Development",
         "Priority": "Medium", "Start Date": d("2026-09-15"), "Baseline End Date": d("2026-11-15"),
         "Forecast End Date": d("2026-12-05"), "% Complete": 0.40, "Status": "On Hold", "RAG": "Yellow",
         "Total Approved Amount": 120000, "Actual Cost": 62000, "Forecast Cost": 138000,
         "Last Updated": d("2026-10-05"), "Notes": "SAMPLE - paused pending content approval."},
        {"Project ID": "PRJ-005", "Customer": "Internal", "Project Name": "Office Security Upgrade",
         "Project Manager": "Tom Becker", "Department": "Operations", "Project Type": "Infrastructure",
         "Priority": "Medium", "Start Date": d("2026-09-15"), "Baseline End Date": d("2026-12-15"),
         "Forecast End Date": d("2026-12-15"), "% Complete": 0.15, "Status": "Active", "RAG": "Green",
         "Total Approved Amount": 60000, "Actual Cost": 9000, "Forecast Cost": 60000,
         "Last Updated": d("2026-10-06"), "Notes": "SAMPLE - small works package."},
        {"Project ID": "PRJ-006", "Customer": "SELAMU SEGARO", "Project Name": "Payroll Reporting Portal",
         "Project Manager": "Priya Raman", "Department": "Finance", "Project Type": "Development",
         "Priority": "Medium", "Start Date": d("2026-04-01"), "Baseline End Date": d("2026-09-30"),
         "Forecast End Date": d("2026-09-30"), "Actual End Date": d("2026-09-28"), "% Complete": 1.0,
         "Status": "Completed", "RAG": "Green", "Total Approved Amount": 95000, "Actual Cost": 92000,
         "Forecast Cost": 92000, "Last Updated": d("2026-10-01"), "Notes": "SAMPLE - closed, ready for closure checklist."},
        {"Project ID": "PRJ-007", "Customer": "Internal", "Project Name": "Legacy Fax System Decommission",
         "Project Manager": "Tom Becker", "Department": "IT", "Project Type": "Maintenance",
         "Priority": "Low", "Start Date": d("2026-06-01"), "Baseline End Date": d("2026-08-31"),
         "Forecast End Date": d("2026-08-31"), "% Complete": 0.10, "Status": "Cancelled", "RAG": "Red",
         "Total Approved Amount": 25000, "Actual Cost": 4000, "Forecast Cost": 4000,
         "Last Updated": d("2026-08-20"), "Notes": "SAMPLE - cancelled, superseded by network upgrade."},
    ],
    "capacity": 30,
    "tab": "1F4E79",
    "dq": {"dup": "Project ID", "miss_owner": "Project Manager", "miss_due": "Baseline End Date", "key": "Project ID"},
    "cf": [
        ("map", "RAG", RAG_MAP),
        ("map", "Status", STATUS_MAP),
        ("map", "Project Health", {"Healthy": (G_BG, G_TX), "Needs Attention": (A_BG, A_TX),
                                   "Critical": (R_BG, R_TX), "Closed": (N_BG, N_TX), "N/A": (N_BG, N_TX)}),
        ("bar", "% Complete"),
        ("f", "Schedule Variance", '=AND(ISNUMBER($R5),$R5>7)', R_BG, R_TX),
        ("f", "Cost Variance", '=AND(ISNUMBER($S5),$S5<0)', R_BG, R_TX),
    ],
}

# --------------------------------------------------------------------------- #
WBS_COLS = [
    C("WBS ID", 9, desc="Work breakdown code"),
    C("Project", 24, lst="L_Projects", desc="Owning project"),
    C("Phase", 15, desc="Delivery phase"),
    C("Task", 32, desc="Task description"),
    C("Deliverable", 24, desc="Output produced by the task"),
    C("Owner", 16, lst="L_Owner", desc="Task owner"),
    C("Dependency", 11, desc="Predecessor WBS ID"),
    C("Start Date", 12, t="date", desc="Planned start"),
    C("Finish Date", 12, t="date", desc="Planned finish"),
    C("Baseline Start", 13, t="date", desc="Baseline start"),
    C("Baseline Finish", 14, t="date", desc="Baseline finish"),
    C("Duration", 10, t="int", desc="Finish minus start + 1 (days)",
      f=lambda L, r: f'=IF(OR({L["Start Date"]}{r}="",{L["Finish Date"]}{r}=""),"",{L["Finish Date"]}{r}-{L["Start Date"]}{r}+1)'),
    C("% Complete", 11, t="pct", desc="Task progress"),
    C("Status", 13, lst="L_TaskStatus", desc="Task status"),
    C("Variance", 10, t="int", desc="Finish minus baseline finish (days)",
      f=lambda L, r: f'=IF(OR({L["Finish Date"]}{r}="",{L["Baseline Finish"]}{r}=""),"",{L["Finish Date"]}{r}-{L["Baseline Finish"]}{r})'),
    C("Milestone", 10, lst="L_YesNo", desc="Marks a milestone task"),
    C("Notes", 26, t="wrap", desc="Commentary"),
]

WBS_SAMPLE = [
    ("1.0", "ERP Implementation", "Initiation", "Project charter approval", "Signed charter", "Ahmed Khan", "",
     "2026-07-01", "2026-07-10", "2026-07-01", "2026-07-10", 1.0, "Complete", "Yes", "SAMPLE"),
    ("2.0", "ERP Implementation", "Requirements", "Gather business requirements", "Requirements specification",
     "Priya Raman", "1.0", "2026-07-13", "2026-08-07", "2026-07-13", "2026-08-07", 1.0, "Complete", "Yes", "SAMPLE"),
    ("3.0", "ERP Implementation", "Design", "Solution design workshops", "Design document", "Tom Becker", "2.0",
     "2026-08-10", "2026-08-28", "2026-08-10", "2026-08-28", 1.0, "Complete", "No", "SAMPLE"),
    ("4.0", "ERP Implementation", "Build", "Configure core ERP modules", "Configured system", "Ahmed Khan", "3.0",
     "2026-08-31", "2026-10-09", "2026-08-31", "2026-10-02", 0.7, "In Progress", "No", "SAMPLE - running 7 days late"),
    ("5.0", "ERP Implementation", "Build", "Data migration scripts", "Migration package", "David Okoro", "4.0",
     "2026-10-05", "2026-10-30", "2026-09-28", "2026-10-23", 0.25, "In Progress", "No", "SAMPLE"),
    ("6.0", "ERP Implementation", "Test", "System integration testing", "SIT report", "Grace Alemu", "5.0",
     "2026-11-02", "2026-11-20", "2026-10-26", "2026-11-13", 0.0, "Not Started", "No", "SAMPLE"),
    ("7.0", "ERP Implementation", "Test", "User acceptance testing", "UAT sign-off", "Maria Silva", "6.0",
     "2026-11-23", "2026-12-04", "2026-11-16", "2026-11-27", 0.0, "Not Started", "Yes", "SAMPLE"),
    ("8.0", "ERP Implementation", "Deployment", "Go-live preparation", "Cutover plan", "Tom Becker", "7.0",
     "2026-12-07", "2026-12-15", "2026-11-30", "2026-12-11", 0.0, "Not Started", "No", "SAMPLE"),
    ("9.0", "ERP Implementation", "Deployment", "Production go-live", "Live system", "Ahmed Khan", "8.0",
     "2026-12-16", "2026-12-18", "2026-12-14", "2026-12-18", 0.0, "Not Started", "Yes", "SAMPLE"),
    ("10.0", "ERP Implementation", "Closure", "Handover and documentation", "O&M manual", "Priya Raman", "9.0",
     "2026-12-21", "2027-01-15", "2026-12-21", "2027-01-15", 0.0, "Not Started", "Yes", "SAMPLE"),
    ("1.0", "Network Infrastructure Upgrade", "Initiation", "Site survey and design", "Survey report", "Lisa Chen", "",
     "2026-08-15", "2026-08-28", "2026-08-15", "2026-08-28", 1.0, "Complete", "Yes", "SAMPLE"),
    ("2.0", "Network Infrastructure Upgrade", "Procure", "Order switches and cabling", "Purchase order", "Lisa Chen", "1.0",
     "2026-08-31", "2026-09-18", "2026-08-31", "2026-09-11", 1.0, "Complete", "No", "SAMPLE"),
    ("3.0", "Network Infrastructure Upgrade", "Install", "Cabinet and switch installation", "Installed links",
     "Tom Becker", "2.0", "2026-09-21", "2026-10-24", "2026-09-21", "2026-10-17", 0.55, "In Progress", "No", "SAMPLE"),
    ("4.0", "Network Infrastructure Upgrade", "Test", "Network acceptance testing", "Test report", "Grace Alemu", "3.0",
     "2026-10-26", "2026-11-13", "2026-10-19", "2026-11-06", 0.0, "Not Started", "Yes", "SAMPLE"),
    ("5.0", "Network Infrastructure Upgrade", "Deploy", "Cutover and handover", "Cutover note", "Lisa Chen", "4.0",
     "2026-11-16", "2026-11-25", "2026-11-09", "2026-11-25", 0.0, "Not Started", "Yes", "SAMPLE"),
]

WBS_SPEC = {
    "sheet": "04_WBS_SCHEDULE",
    "table": "tblWBS",
    "title": "WBS, SCHEDULE & GANTT",
    "purpose": "Task-level plan with baseline, variance and an automatic weekly Gantt timeline (columns R onward). Green = on schedule, amber = minor delay, red = major delay.",
    "cols": WBS_COLS,
    "sample": [
        dict(zip([c["h"] for c in WBS_COLS],
                 [row[0], row[1], row[2], row[3], row[4], row[5], row[6], d(row[7]), d(row[8]),
                  d(row[9]), d(row[10]), None, row[11], row[12], None, row[13], row[14]]))
        for row in WBS_SAMPLE
    ],
    "capacity": 30,
    "tab": "2E75B6",
    "gantt": True,
    "dq": {"dup": "WBS ID", "miss_owner": "Owner", "miss_due": "Finish Date", "key": "WBS ID"},
    "cf": [
        ("map", "Status", {"Not Started": (N_BG, N_TX), "In Progress": (A_BG, A_TX),
                           "Complete": (G_BG, G_TX), "Blocked": (R_BG, R_TX)}),
        ("bar", "% Complete"),
        ("f", "Variance", '=AND(ISNUMBER($O5),$O5>5)', R_BG, R_TX),
        ("f", "Variance", '=AND(ISNUMBER($O5),$O5>0,$O5<=5)', A_BG, A_TX),
        ("f", "Variance", '=AND(ISNUMBER($O5),$O5<=0)', G_BG, G_TX),
    ],
}

# --------------------------------------------------------------------------- #
MILESTONE_COLS = [
    C("Milestone ID", 12, desc="Unique milestone code"),
    C("Project", 24, lst="L_Projects", desc="Owning project"),
    C("Milestone", 32, desc="Milestone name"),
    C("Owner", 16, lst="L_Owner", desc="Accountable owner"),
    C("Baseline Date", 13, t="date", desc="Baseline date"),
    C("Forecast Date", 13, t="date", desc="Forecast date"),
    C("Actual Date", 13, t="date", desc="Actual completion date"),
    C("Status", 14, lst="L_MilestoneStatus", desc="Milestone status"),
    C("Days Remaining", 13, t="int", desc="Forecast date minus today",
      f=lambda L, r: f'=IF(OR({L["Milestone ID"]}{r}="",{L["Status"]}{r}="Complete"),"",IF({L["Forecast Date"]}{r}="","",{L["Forecast Date"]}{r}-TODAY()))'),
    C("Variance", 10, t="int", desc="Forecast minus baseline (days)",
      f=lambda L, r: f'=IF(OR({L["Baseline Date"]}{r}="",{L["Forecast Date"]}{r}=""),"",{L["Forecast Date"]}{r}-{L["Baseline Date"]}{r})'),
    C("RAG", 9, desc="Automatic RAG: overdue = Red, 7 days = Yellow",
      f=lambda L, r: (f'=IF({L["Milestone ID"]}{r}="","",IF({L["Status"]}{r}="Complete","Green",'
                      f'IF({L["Forecast Date"]}{r}="","",IF({L["Forecast Date"]}{r}<TODAY(),"Red",'
                      f'IF({L["Forecast Date"]}{r}-TODAY()<=7,"Yellow","Green")))))')),
    C("Notes", 28, t="wrap", desc="Commentary"),
    C("Key", 12, hidden=True, desc="Helper: sortable key for upcoming milestones",
      f=lambda L, r: f'=IF(OR({L["Milestone ID"]}{r}="",{L["Forecast Date"]}{r}="",{L["Status"]}{r}="Complete"),"",IF({L["Forecast Date"]}{r}>=TODAY(),{L["Forecast Date"]}{r}+ROW()/100000,""))'),
    C("ProjKey", 14, hidden=True, desc="Helper: project + rank key",
      f=lambda L, r: (f'=IF({L["Key"]}{r}="","",{L["Project"]}{r}&"|"&(COUNTIFS({L["Project"]}$5:{L["Project"]}$34,{L["Project"]}{r},'
                      f'{L["Key"]}$5:{L["Key"]}$34,"<"&{L["Key"]}{r})+1))')),
]

MS_SAMPLE = [
    ("M-001", "ERP Implementation", "Charter approved", "Ahmed Khan", "2026-07-10", "2026-07-10", "2026-07-10", "Complete", "SAMPLE"),
    ("M-002", "ERP Implementation", "Requirements sign-off", "Priya Raman", "2026-08-07", "2026-08-07", "2026-08-07", "Complete", "SAMPLE"),
    ("M-003", "ERP Implementation", "Design sign-off", "Tom Becker", "2026-08-28", "2026-08-28", "2026-08-31", "Complete", "SAMPLE"),
    ("M-004", "ERP Implementation", "Core configuration complete", "Ahmed Khan", "2026-10-02", "2026-10-09", "", "In Progress", "SAMPLE - due in days"),
    ("M-005", "ERP Implementation", "Data migration complete", "David Okoro", "2026-10-23", "2026-10-30", "", "In Progress", "SAMPLE"),
    ("M-006", "ERP Implementation", "System integration testing complete", "Grace Alemu", "2026-11-13", "2026-11-20", "", "Not Started", "SAMPLE"),
    ("M-007", "ERP Implementation", "UAT sign-off", "Maria Silva", "2026-11-27", "2026-12-04", "", "Not Started", "SAMPLE"),
    ("M-008", "ERP Implementation", "Production go-live", "Ahmed Khan", "2026-12-18", "2027-01-15", "", "Not Started", "SAMPLE"),
    ("M-009", "Network Infrastructure Upgrade", "Switch installation complete", "Tom Becker", "2026-10-16", "2026-10-16", "", "In Progress", "SAMPLE"),
    ("M-010", "Network Infrastructure Upgrade", "Network go-live", "Lisa Chen", "2026-11-25", "2026-11-25", "", "Not Started", "SAMPLE"),
    ("M-011", "Network Infrastructure Upgrade", "Cabling inspection sign-off", "Lisa Chen", "2026-10-12", "2026-10-12", "", "In Progress", "SAMPLE"),
    ("M-012", "HR Management System", "Vendor shortlist agreed", "David Okoro", "2026-10-05", "2026-10-05", "", "Delayed", "SAMPLE - overdue"),
    ("M-013", "HR Management System", "Contract signed", "David Okoro", "2026-11-06", "2026-11-20", "", "Not Started", "SAMPLE"),
    ("M-014", "Website Development", "Design approval", "Maria Silva", "2026-10-14", "2026-10-21", "", "In Progress", "SAMPLE"),
    ("M-015", "Website Development", "Content ready for load", "Maria Silva", "2026-10-19", "2026-10-19", "", "In Progress", "SAMPLE"),
    ("M-016", "Office Security Upgrade", "Security assessment sign-off", "Tom Becker", "2026-10-05", "2026-10-14", "", "In Progress", "SAMPLE"),
    ("M-017", "Payroll Reporting Portal", "Project closure approved", "Priya Raman", "2026-09-30", "2026-09-30", "2026-09-28", "Complete", "SAMPLE"),
    ("M-018", "Network Infrastructure Upgrade", "User acceptance complete", "Grace Alemu", "2026-11-02", "2026-11-02", "", "Not Started", "SAMPLE"),
]

MILESTONE_SPEC = {
    "sheet": "05_MILESTONES",
    "table": "tblMilestones",
    "title": "MILESTONE TRACKER",
    "purpose": "Every milestone with baseline, forecast, days remaining and automatic RAG. Feeds the dashboard 'next milestones', 'upcoming milestones' chart and portfolio next-milestone column.",
    "cols": MILESTONE_COLS,
    "sample": [
        {"Milestone ID": r[0], "Project": r[1], "Milestone": r[2], "Owner": r[3], "Baseline Date": d(r[4]),
         "Forecast Date": d(r[5]), "Actual Date": d(r[6]) if r[6] else None, "Status": r[7], "Notes": r[8]}
        for r in MS_SAMPLE
    ],
    "capacity": 30,
    "tab": "2E75B6",
    "dq": {"dup": "Milestone ID", "miss_owner": "Owner", "miss_due": "Forecast Date", "key": "Milestone ID"},
    "cf": [
        ("map", "RAG", RAG_MAP),
        ("map", "Status", {"Not Started": (N_BG, N_TX), "In Progress": (A_BG, A_TX),
                           "Complete": (G_BG, G_TX), "Delayed": (R_BG, R_TX), "Cancelled": (N_BG, N_TX)}),
        ("f", "A5:L34", '=AND($A5<>"",$F5<>"",$F5<TODAY(),$H5<>"Complete")', R_BG, R_TX),
        ("f", "Days Remaining", '=AND(ISNUMBER($I5),$I5<0,$H5<>"Complete")', R_BG, R_TX),
        ("f", "Days Remaining", '=AND(ISNUMBER($I5),$I5>=0,$I5<=7,$H5<>"Complete")', A_BG, A_TX),
    ],
}

# --------------------------------------------------------------------------- #
RAID_COLS = [
    C("ID", 10, desc="RAID reference (RSK/ASM/ISS/DEP)"),
    C("Project", 24, lst="L_Projects", desc="Owning project"),
    C("Type", 13, lst="L_RAIDType", desc="Risk / Assumption / Issue / Dependency"),
    C("Description", 36, t="wrap", desc="What the item is"),
    C("Category", 13, lst="L_RAIDCategory", desc="Impact area"),
    C("Probability", 12, lst="L_Prob", desc="Probability (risks)"),
    C("Impact", 11, lst="L_Impact", desc="Impact (risks)"),
    C("Risk Score", 11, t="int", desc="Probability x Impact (1-16)",
      f=lambda L, r: f'=IF(OR({L["Probability"]}{r}="",{L["Impact"]}{r}=""),"",MATCH({L["Probability"]}{r},L_Prob,0)*MATCH({L["Impact"]}{r},L_Impact,0))'),
    C("Priority", 11, desc="Low / Medium / High / Critical from score",
      f=lambda L, r: (f'=IF({L["Risk Score"]}{r}="","",IF({L["Risk Score"]}{r}<=2,"Low",'
                      f'IF({L["Risk Score"]}{r}<=5,"Medium",IF({L["Risk Score"]}{r}<=9,"High","Critical"))))')),
    C("Owner", 16, lst="L_Owner", desc="Accountable owner"),
    C("Mitigation", 32, t="wrap", desc="Preventive action"),
    C("Contingency", 26, t="wrap", desc="Fallback if it happens"),
    C("Due Date", 12, t="date", desc="Response due date"),
    C("Status", 13, lst="L_RAIDStatus", desc="Open / In Progress / Closed"),
    C("Escalation", 11, lst="L_YesNo", desc="Escalated to management?"),
    C("Resolution", 26, t="wrap", desc="Outcome when closed"),
    C("Date Raised", 12, t="date", desc="Date identified"),
    C("Date Closed", 12, t="date", desc="Date resolved"),
    C("Rank", 8, t="int", hidden=True, desc="Helper: risk rank for dashboard",
      f=lambda L, r: (f'=IF(OR({L["Type"]}{r}<>"Risk",{L["Status"]}{r}="Closed",{L["ID"]}{r}="",{L["Risk Score"]}{r}=""),"",'
                      f'COUNTIFS({L["Type"]}$5:{L["Type"]}$34,"Risk",{L["Status"]}$5:{L["Status"]}$34,"<>Closed",{L["Risk Score"]}$5:{L["Risk Score"]}$34,">"&{L["Risk Score"]}{r})'
                      f'+COUNTIFS({L["Type"]}$5:{L["Type"]}{r},"Risk",{L["Status"]}$5:{L["Status"]}{r},"<>Closed",{L["Risk Score"]}$5:{L["Risk Score"]}{r},{L["Risk Score"]}{r}))')),
    C("ProjKey", 16, hidden=True, desc="Helper: type + project + rank key",
      f=lambda L, r: (f'=IF(OR({L["ID"]}{r}="",{L["Risk Score"]}{r}=""),"",{L["Type"]}{r}&"|"&{L["Project"]}{r}&"|"&'
                      f'(COUNTIFS({L["Type"]}$5:{L["Type"]}$34,{L["Type"]}{r},{L["Project"]}$5:{L["Project"]}$34,{L["Project"]}{r},'
                      f'{L["Risk Score"]}$5:{L["Risk Score"]}$34,">"&{L["Risk Score"]}{r})+1))')),
]

_RAID_ROWS = [
    ("RSK-001", "ERP Implementation", "Risk", "Key vendor may miss module delivery date", "Vendor", "High", "High",
     "Lisa Chen", "Weekly vendor checkpoints and delivery plan review", "Re-plan schedule with second supplier",
     "2026-10-30", "Open", "Yes", "", "2026-09-15", ""),
    ("RSK-002", "ERP Implementation", "Risk", "Data migration quality may fail UAT", "Technical", "Critical", "High",
     "David Okoro", "Data cleansing sprints and mock migration", "Manual clean-up buffer before UAT",
     "2026-10-24", "Open", "Yes", "", "2026-09-18", ""),
    ("RSK-003", "HR Management System", "Risk", "Business users unavailable during peak season", "Resource", "Medium", "High",
     "David Okoro", "Agree UAT window with HR early", "Shift UAT to next quarter",
     "2026-11-10", "Open", "No", "", "2026-09-22", ""),
    ("RSK-004", "Network Infrastructure Upgrade", "Risk", "Cable supply lead time exceeds plan", "Vendor", "Medium", "Medium",
     "Lisa Chen", "Order cable in advance of install window", "Use alternative local supplier",
     "2026-10-20", "In Progress", "No", "", "2026-09-10", ""),
    ("RSK-005", "Website Development", "Risk", "Scope creep from marketing change requests", "Scope", "High", "Medium",
     "Maria Silva", "Freeze scope and route changes to change control", "Reduce page count in phase 1",
     "2026-10-28", "Open", "No", "", "2026-09-25", ""),
    ("RSK-006", "Office Security Upgrade", "Risk", "Power interruption during installation", "Technical", "Low", "Medium",
     "Tom Becker", "Schedule works outside office hours", "Reschedule installation weekend",
     "2026-11-05", "Open", "No", "", "2026-10-01", ""),
    ("RSK-007", "Network Infrastructure Upgrade", "Risk", "Switch firmware defect found in test", "Technical", "High", "High",
     "Tom Becker", "Upgrade firmware before rollout", "Rollback to previous firmware",
     "2026-09-30", "Closed", "No", "Firmware 7.2.1 applied and verified", "2026-09-12", "2026-09-29"),
    ("ASM-001", "ERP Implementation", "Assumption", "Approved amount of 850,000 covers all phases", "Budget", "Medium", "High",
     "Priya Raman", "Confirm contingency drawdown rules with Finance", "Raise change request if gap",
     "2026-10-31", "Open", "No", "", "2026-07-05", ""),
    ("ASM-002", "HR Management System", "Assumption", "Legacy HR data can be migrated in one run", "Technical", "Medium", "Medium",
     "David Okoro", "Validate data quality sample", "Split migration into two batches",
     "2026-11-15", "Open", "No", "", "2026-09-08", ""),
    ("ISS-001", "ERP Implementation", "Issue", "UAT test environment not available", "Technical", "High", "High",
     "Tom Becker", "Provision environment by 12 Oct", "Book shared test server",
     "2026-10-12", "Open", "Yes", "", "2026-10-06", ""),
    ("ISS-002", "HR Management System", "Issue", "Incomplete employee data for migration", "Resource", "High", "Medium",
     "David Okoro", "HR to complete missing fields", "Manual completion during migration",
     "2026-10-15", "In Progress", "No", "", "2026-10-02", ""),
    ("ISS-003", "Network Infrastructure Upgrade", "Issue", "Site access delayed by facilities", "Resource", "Medium", "Medium",
     "Tom Becker", "Confirm access window with facilities", "Reschedule installation",
     "2026-10-14", "In Progress", "No", "", "2026-10-03", ""),
    ("ISS-004", "ERP Implementation", "Issue", "Finance analyst not yet assigned to project", "Resource", "Low", "Medium",
     "Ahmed Khan", "Sponsor to nominate analyst", "PMO provides interim support",
     "2026-10-20", "Open", "No", "", "2026-10-05", ""),
    ("ISS-005", "Website Development", "Issue", "Hosting certificate expired", "Technical", "Medium", "High",
     "Tom Becker", "Renew certificate", "Temporary certificate issued",
     "2026-09-20", "Closed", "No", "Certificate renewed for 12 months", "2026-09-18", "2026-09-19"),
    ("DEP-001", "ERP Implementation", "Dependency", "Payment gateway provider approval pending", "Vendor", "High", "Medium",
     "Priya Raman", "Weekly follow-up with provider", "Use manual payment interface initially",
     "2026-10-18", "Open", "Yes", "", "2026-09-20", ""),
    ("DEP-002", "HR Management System", "Dependency", "Legal contract review required before signature", "Legal", "Medium", "High",
     "Grace Alemu", "Book legal review slot", "Conditional approval from legal",
     "2026-11-01", "Open", "No", "", "2026-09-28", ""),
]

RAID_SPEC = {
    "sheet": "06_RAID_LOG",
    "table": "tblRAID",
    "title": "RAID LOG - RISKS, ASSUMPTIONS, ISSUES, DEPENDENCIES",
    "purpose": "One controlled register for risks, assumptions, issues and dependencies. Risk score = probability x impact; dashboard charts and top-risk panels read this table.",
    "cols": RAID_COLS,
    "sample": [
        {"ID": r[0], "Project": r[1], "Type": r[2], "Description": r[3], "Category": r[4], "Probability": r[5],
         "Impact": r[6], "Owner": r[7], "Mitigation": r[8], "Contingency": r[9], "Due Date": d(r[10]),
         "Status": r[11], "Escalation": r[12], "Resolution": r[13], "Date Raised": d(r[14]),
         "Date Closed": d(r[15]) if r[15] else None}
        for r in _RAID_ROWS
    ],
    "capacity": 30,
    "tab": "C0392B",
    "dq": {"dup": "ID", "miss_owner": "Owner", "miss_due": "Due Date", "key": "ID"},
    "cf": [
        ("map", "Priority", {"Low": (G_BG, G_TX), "Medium": (A_BG, A_TX), "High": (R_BG, R_TX),
                             "Critical": ("E8A0A0", "6B1512")}),
        ("map", "Status", {"Open": (A_BG, A_TX), "In Progress": (N_BG, N_TX), "Closed": (G_BG, G_TX)}),
        ("f", "Risk Score", '=AND(ISNUMBER($H5),$H5>9)', R_BG, R_TX),
        ("f", "Due Date", '=AND($A5<>"",$M5<>"",$M5<TODAY(),$N5<>"Closed")', R_BG, R_TX),
    ],
}

# --------------------------------------------------------------------------- #
ACTION_COLS = [
    C("Action ID", 11, desc="Unique action code"),
    C("Project", 24, lst="L_Projects", desc="Owning project"),
    C("Meeting / Source", 22, desc="Where the action came from"),
    C("Action", 36, t="wrap", desc="What must be done"),
    C("Owner", 16, lst="L_Owner", desc="Single accountable owner"),
    C("Priority", 10, lst="L_Priority", desc="Priority"),
    C("Date Opened", 12, t="date", desc="Date raised"),
    C("Due Date", 12, t="date", desc="Due date"),
    C("Status", 13, lst="L_ActionStatus", desc="Action status"),
    C("Days Remaining", 13, t="int", desc="Due date minus today",
      f=lambda L, r: f'=IF(OR({L["Action ID"]}{r}="",{L["Status"]}{r}="Complete",{L["Due Date"]}{r}=""),"",{L["Due Date"]}{r}-TODAY())'),
    C("Days Overdue", 13, t="int", desc="Days late (0 if not overdue)",
      f=lambda L, r: f'=IF(OR({L["Action ID"]}{r}="",{L["Due Date"]}{r}="",{L["Status"]}{r}="Complete"),0,MAX(0,TODAY()-{L["Due Date"]}{r}))'),
    C("Escalation", 11, lst="L_YesNo", desc="Escalated to management?"),
    C("Completion Date", 14, t="date", desc="Date actually completed"),
    C("Notes", 24, t="wrap", desc="Commentary"),
    C("OverdueRank", 12, t="int", hidden=True, desc="Helper: overdue rank for dashboard",
      f=lambda L, r: (f'=IF(OR({L["Action ID"]}{r}="",{L["Status"]}{r}="Complete",{L["Days Overdue"]}{r}<=0),"",'
                      f'COUNTIFS({L["Status"]}$5:{L["Status"]}$34,"<>Complete",{L["Days Overdue"]}$5:{L["Days Overdue"]}$34,">"&{L["Days Overdue"]}{r})'
                      f'+COUNTIFS({L["Status"]}$5:{L["Status"]}{r},"<>Complete",{L["Days Overdue"]}$5:{L["Days Overdue"]}{r},{L["Days Overdue"]}{r}))')),
    C("ProjKey", 14, hidden=True, desc="Helper: project + rank key",
      f=lambda L, r: (f'=IF(OR({L["Action ID"]}{r}="",{L["Status"]}{r}="Complete"),"",{L["Project"]}{r}&"|"&'
                      f'(COUNTIFS({L["Project"]}$5:{L["Project"]}$34,{L["Project"]}{r},{L["Status"]}$5:{L["Status"]}$34,"<>Complete",{L["Days Overdue"]}$5:{L["Days Overdue"]}$34,">"&{L["Days Overdue"]}{r})'
                      f'+COUNTIFS({L["Project"]}$5:{L["Project"]}{r},{L["Project"]}{r},{L["Status"]}$5:{L["Status"]}{r},"<>Complete",{L["Days Overdue"]}$5:{L["Days Overdue"]}{r},{L["Days Overdue"]}{r})))')),
]

_ACTION_ROWS = [
    ("ACT-001", "ERP Implementation", "Steering Committee 06-Oct", "Confirm UAT user list with business",
     "Maria Silva", "High", "2026-10-06", "2026-10-06", "Open", "Yes", "", "SAMPLE"),
    ("ACT-002", "ERP Implementation", "PMO Review 01-Oct", "Chase vendor on module delivery dates",
     "Lisa Chen", "Critical", "2026-10-01", "2026-10-05", "Open", "Yes", "", "SAMPLE"),
    ("ACT-003", "Network Infrastructure Upgrade", "Project Team 07-Oct", "Confirm site access schedule with facilities",
     "Tom Becker", "High", "2026-10-07", "2026-10-09", "In Progress", "No", "", "SAMPLE"),
    ("ACT-004", "HR Management System", "Steering Committee 08-Oct", "Sign off vendor shortlist",
     "David Okoro", "High", "2026-10-08", "2026-10-10", "Open", "No", "", "SAMPLE"),
    ("ACT-005", "ERP Implementation", "Sponsor Review 02-Oct", "Approve change request CR-001",
     "Ahmed Khan", "Critical", "2026-10-02", "2026-10-07", "Open", "Yes", "", "SAMPLE"),
    ("ACT-006", "Website Development", "Project Team 05-Oct", "Restart kick-off once scope is frozen",
     "Maria Silva", "Medium", "2026-10-05", "2026-10-17", "Open", "No", "", "SAMPLE"),
    ("ACT-007", "ERP Implementation", "PMO Review 06-Oct", "Update RAID with migration quality risk",
     "David Okoro", "Medium", "2026-10-06", "2026-10-13", "In Progress", "No", "", "SAMPLE"),
    ("ACT-008", "ERP Implementation", "Weekly Team 30-Sep", "Publish September cost report",
     "Priya Raman", "Medium", "2026-09-30", "2026-10-03", "Open", "Yes", "", "SAMPLE"),
    ("ACT-009", "ERP Implementation", "Project Team 08-Oct", "Book UAT training room and invites",
     "Maria Silva", "Low", "2026-10-08", "2026-10-20", "Open", "No", "", "SAMPLE"),
    ("ACT-010", "Network Infrastructure Upgrade", "Project Team 28-Sep", "Deliver cabling quotation",
     "Lisa Chen", "High", "2026-09-28", "2026-10-02", "Complete", "No", "2026-10-01", "SAMPLE"),
    ("ACT-011", "HR Management System", "Sponsor Review 01-Oct", "Confirm approved amount with Finance",
     "David Okoro", "Critical", "2026-10-01", "2026-10-15", "Open", "No", "", "SAMPLE"),
    ("ACT-012", "Office Security Upgrade", "Project Team 04-Oct", "Finalise vendor selection",
     "Lisa Chen", "High", "2026-10-04", "2026-10-06", "Open", "No", "", "SAMPLE"),
    ("ACT-013", "ERP Implementation", "Project Team 25-Sep", "Archive approved design documents",
     "Priya Raman", "Low", "2026-09-25", "2026-09-30", "Complete", "No", "2026-09-30", "SAMPLE"),
    ("ACT-014", "Payroll Reporting Portal", "Closure Review 01-Oct", "Collect lessons learned from project team",
     "Priya Raman", "Medium", "2026-10-01", "2026-10-09", "Open", "No", "", "SAMPLE"),
]

ACTION_SPEC = {
    "sheet": "07_ACTION_TRACKER",
    "table": "tblActions",
    "title": "ACTION TRACKER",
    "purpose": "Every action from every meeting with one owner and one due date. Overdue = red, due within 3 days = amber, complete = green. Feeds the dashboard overdue KPI and charts.",
    "cols": ACTION_COLS,
    "sample": [
        {"Action ID": r[0], "Project": r[1], "Meeting / Source": r[2], "Action": r[3], "Owner": r[4],
         "Priority": r[5], "Date Opened": d(r[6]), "Due Date": d(r[7]), "Status": r[8],
         "Escalation": r[9], "Completion Date": d(r[10]) if r[10] else None, "Notes": r[11]}
        for r in _ACTION_ROWS
    ],
    "capacity": 30,
    "tab": "C0392B",
    "dq": {"dup": "Action ID", "miss_owner": "Owner", "miss_due": "Due Date", "key": "Action ID"},
    "cf": [
        ("map", "Status", ACTION_MAP),
        ("f", "Days Overdue", '=AND(ISNUMBER($K5),$K5>0)', R_BG, R_TX),
        ("f", "J5:N34", '=AND($A5<>"",$K5>0,$I5<>"Complete")', R_BG, R_TX),
        ("f", "Days Remaining", '=AND(ISNUMBER($J5),$J5>=0,$J5<=3,$I5<>"Complete")', A_BG, A_TX),
        ("f", "Days Remaining", '=AND(ISNUMBER($J5),$J5<0,$I5<>"Complete")', R_BG, R_TX),
    ],
}
