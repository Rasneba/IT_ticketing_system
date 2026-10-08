"""Add each stage-3 post block individually to find the Excel-rejected one."""

import os
import sys
import importlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from openpyxl import Workbook
import win32com.client as win32
import build as B

TEMP = os.path.join(os.environ["TEMP"], "pmo_post.xlsx")
customers = B.load_customers()
BLOCKS = {
    "gantt": lambda wb: B.add_gantt(wb["04_WBS_SCHEDULE"]),
    "cost": lambda wb: B.add_summary_block(wb["11_COST_MANAGEMENT"], "cost"),
    "quality": lambda wb: B.add_summary_block(wb["14_QUALITY_CONTROL"], "quality"),
    "closure": lambda wb: B.add_summary_block(wb["19_PROJECT_CLOSURE"], "closure"),
    "quadrant": lambda wb: B.add_quadrant(wb["09_STAKEHOLDERS"]),
}


def base():
    wb = Workbook()
    wb.remove(wb.active)
    for spec in B.SPECS:
        B.build_table_sheet(wb, spec)
    return wb


xl = win32.Dispatch("Excel.Application")
xl.Visible = False
xl.DisplayAlerts = False
try:
    for tag, fn in BLOCKS.items():
        wb = base()
        fn(wb)
        wb.calculation.fullCalcOnLoad = True
        wb.save(TEMP)
        try:
            bk = xl.Workbooks.Open(TEMP)
            print(f"OK   {tag}")
            bk.Close(False)
        except Exception:
            print(f"FAIL {tag}")
finally:
    xl.Quit()
