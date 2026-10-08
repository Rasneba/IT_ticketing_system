"""Patch dashboard helpers to no-ops one group at a time."""

import os
import sys
import importlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from openpyxl import Workbook
import win32com.client as win32

TEMP = os.path.join(os.environ["TEMP"], "pmo_t5.xlsx")
GROUPS = {
    "base": [],
    "no-kpi": ["kpi_card"],
    "no-panels": ["panel_header", "panel_line"],
    "no-cf": ["cf_map", "cf_databar"],
    "no-dv": ["add_list_validation"],
    "no-cd": ["cd_label", "cd_header", "cd_value"],
    "no-data-charts": ["_chart_data", "_charts"],
}


def build(skip):
    import pmo_dash_proj as P
    importlib.reload(P)
    original = {}
    for name in skip:
        original[name] = getattr(P, name)
        setattr(P, name, lambda *a, **k: None)
    wb = Workbook()
    wb.remove(wb.active)
    P.build_project_dashboard(wb)
    wb.calculation.fullCalcOnLoad = True
    wb.save(TEMP)


xl = win32.Dispatch("Excel.Application")
xl.Visible = False
xl.DisplayAlerts = False
try:
    for tag, skip in GROUPS.items():
        build(skip)
        try:
            bk = xl.Workbooks.Open(TEMP)
            print(f"OK   {tag}")
            bk.Close(False)
        except Exception:
            print(f"FAIL {tag}")
finally:
    xl.Quit()
