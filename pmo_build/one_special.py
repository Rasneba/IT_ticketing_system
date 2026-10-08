"""Open-test each special sheet individually."""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from openpyxl import Workbook
import build as B
from pmo_core import build_table_sheet
import win32com.client as win32

TEMP = os.path.join(os.environ["TEMP"], "pmo_special.xlsx")
customers = B.load_customers()


def make(name):
    wb = Workbook()
    wb.remove(wb.active)
    for spec in B.SPECS:
        build_table_sheet(wb, spec)
    if name == "home":
        B.build_home(wb)
    elif name == "exec":
        B.build_exec_dashboard(wb)
    elif name == "proj":
        B.build_project_dashboard(wb)
    elif name == "charter":
        B.build_charter(wb)
    elif name == "weekly":
        B.build_weekly_status(wb)
    elif name == "sop":
        B.build_sop(wb)
    elif name == "settings":
        B.build_settings(wb, customers)
    elif name == "dictionary":
        B.build_data_dictionary(wb)
    wb.calculation.fullCalcOnLoad = True
    wb.save(TEMP)


xl = win32.Dispatch("Excel.Application")
xl.Visible = False
xl.DisplayAlerts = False
try:
    for name in ("home", "exec", "proj", "charter", "weekly", "sop", "settings", "dictionary"):
        make(name)
        try:
            book = xl.Workbooks.Open(TEMP)
            print(f"OK   {name}")
            book.Close(False)
        except Exception:
            print(f"FAIL {name}")
finally:
    xl.Quit()
