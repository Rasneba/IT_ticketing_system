import io

p = r'C:\genius-erp\IT_ticketing_system\pmo_build\pmo_specs.py'
s = io.open(p, encoding='utf-8').read()
s = s.replace('''    ("L_Owner", "Owner / Team", ["Ahmed Khan", "Lisa Chen", "David Okoro", "Maria Silva",
                                 "Priya Raman", "Tom Becker", "Grace Alemu"]),''',
'''    ("L_Owner", "Owner / Team", ["Ahmed Khan", "Lisa Chen", "David Okoro", "Maria Silva",
                                 "Priya Raman", "Tom Becker", "Grace Alemu", "Sarah Mitchell"]),''')
s = s.replace('''    ("L_FilterMgr", "Filter - Manager", ["All", "Ahmed Khan", "Lisa Chen", "David Okoro",
                                         "Maria Silva", "Priya Raman", "Tom Becker", "Grace Alemu"]),''',
'''    ("L_FilterMgr", "Filter - Manager", ["All", "Ahmed Khan", "Lisa Chen", "David Okoro",
                                         "Maria Silva", "Priya Raman", "Tom Becker", "Grace Alemu",
                                         "Sarah Mitchell"]),''')
io.open(p, 'w', encoding='utf-8').write(s)

p2 = r'C:\genius-erp\IT_ticketing_system\pmo_build\pmo_specs2.py'
s = io.open(p2, encoding='utf-8').read()

s = s.replace('''        C("Status", 14, lst="L_DecisionStatus", desc="Pending / Decided / Deferred / Rejected"),
        C("PendingRank"''', '''        C("Status", 14, lst="L_DecisionStatus", desc="Pending / Decided / Deferred / Rejected"),
        C("Notes", 22, t="wrap", desc="Commentary / SAMPLE marker"),
        C("PendingRank"''')
s = s.replace('''         "Impact": r[8], "Follow-up Owner": r[9], "Due Date": d(r[10]), "Status": r[11]}
        for r in DECISION_ROWS''', '''         "Impact": r[8], "Follow-up Owner": r[9], "Due Date": d(r[10]), "Status": r[11],
         "Notes": "SAMPLE"}
        for r in DECISION_ROWS''')

s = s.replace('''        C("Purpose", 26, t="wrap", desc="Why it is sent"),
        C("Escalation Path", 22, desc="Where it goes if not delivered"),
    ],''', '''        C("Purpose", 26, t="wrap", desc="Why it is sent"),
        C("Escalation Path", 22, desc="Where it goes if not delivered"),
        C("Notes", 22, t="wrap", desc="Commentary / SAMPLE marker"),
    ],''')
s = s.replace('''         "Format": r[5], "Channel": r[6], "Timing": r[7], "Purpose": r[8], "Escalation Path": r[9]}
        for r in COMM_ROWS''', '''         "Format": r[5], "Channel": r[6], "Timing": r[7], "Purpose": r[8],
         "Escalation Path": r[9], "Notes": "SAMPLE"}
        for r in COMM_ROWS''')

s = s.replace('''        C("Action", 28, t="wrap", desc="Action to implement"),
        C("Status", 14, lst="L_ActionStatus", desc="Status of the action"),
    ],''', '''        C("Action", 28, t="wrap", desc="Action to implement"),
        C("Status", 14, lst="L_ActionStatus", desc="Status of the action"),
        C("Notes", 22, t="wrap", desc="Commentary / SAMPLE marker"),
    ],''')
s = s.replace('''         "Owner": r[9], "Action": r[10], "Status": r[11]}
        for r in LESSON_ROWS''', '''         "Owner": r[9], "Action": r[10], "Status": r[11], "Notes": "SAMPLE"}
        for r in LESSON_ROWS''')

s = s.replace('''        {**{"Activity / Deliverable": row[0]}, **{role: row[1][i] for i, role in enumerate(RACI_ROLES)}}
        for row in _RACI_ROWS''', '''        {**{"Activity / Deliverable": row[0], "Notes": "SAMPLE"},
         **{role: row[1][i] for i, role in enumerate(RACI_ROLES)}}
        for row in _RACI_ROWS''')

io.open(p2, 'w', encoding='utf-8').write(s)
print("patched ok")
