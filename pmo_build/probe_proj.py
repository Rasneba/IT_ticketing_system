"""Isolate the dashboard component Excel rejects."""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from openpyxl import Workbook
import win32com.client as win32
import pmo_dash_proj as P

TEMP = os.path.join(os.environ["TEMP"], "pmo_t4.xlsx")


def build(charts=True, chart_data=True):
    wb = Workbook()
    wb.remove(wb.active)
    if not chart_data:
        P._chart_data = lambda ws, m: None
    else:
        import importlib
        importlib.reload(P)
    if not charts:
        P._charts = lambda ws: None
    P.build_project_dashboard(wb)
    wb.calculation.fullCalcOnLoad = True
    wb.save(TEMP)


xl = win32.Dispatch("Excel.Application")
xl.Visible = False
xl.DisplayAlerts = False
try:
    for tag, cd, ch in (("full", True, True), ("no-data", False, True),
                        ("no-charts", True, False), ("neither", False, False)):
        build(ch, cd)
        try:
            bk = xl.Workbooks.Open(TEMP)
            print(f"OK   {tag}")
            bk.Close(False)
        except Exception:
            print(f"FAIL {tag}")
finally:
    xl.Quit()
