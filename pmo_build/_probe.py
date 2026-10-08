import sys
sys.path.insert(0, r'pmo_build')
import pmo_specs as s1, pmo_specs2 as s2

for name, sp in [("WBS", s1.WBS_SPEC), ("PORTFOLIO", s1.PORTFOLIO_SPEC)]:
    print("==", name, sp["sheet"], sp["table"])
    print("  keys:", list(sp.keys()))
    for c in sp["cols"]:
        print("   ", c)

for name, sp in [("COST", s2.COST_SPEC), ("QUALITY", s2.QUALITY_SPEC),
                 ("CLOSURE", s2.CLOSURE_SPEC), ("STAKE", s2.STAKEHOLDER_SPEC)]:
    print("==", name, sp["sheet"], sp["table"])
    print("  keys:", list(sp.keys()))
    print("  cols:", [(c["h"], c.get("t")) for c in sp["cols"]])
