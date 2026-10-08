"""Open-test each table sheet individually to find the sheet Excel refuses."""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from openpyxl import Workbook
import build as B
import win32com.client as win32

only = sys.argv[1] if len(sys.argv) > 1 else None
TEMP = os.path.join(os.environ["TEMP"], "pmo_one.xlsx")

xl = win32.Dispatch("Excel.Application")
xl.Visible = False
xl.DisplayAlerts = False

try:
    for spec in B.SPECS:
        if only and only not in spec["sheet"]:
            continue
        wb = Workbook()
        wb.remove(wb.active)
        B.build_table_sheet(wb, spec)
        wb.save(TEMP)
        try:
            book = xl.Workbooks.Open(TEMP)
            print(f"OK   {spec['sheet']}")
            book.Close(False)
        except Exception:
            print(f"FAIL {spec['sheet']}")
finally:
    xl.Quit()
