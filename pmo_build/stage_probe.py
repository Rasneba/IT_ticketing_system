"""Build the workbook stage by stage and find which stage makes Excel refuse to open it."""

import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import build as B
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
import win32com.client as win32

STAGE = int(sys.argv[1]) if len(sys.argv) > 1 else 99
TMP = os.path.join(tempfile.gettempdir(), f"pmo_stage{STAGE}.xlsx")

customers = B.load_customers()
wb = Workbook()
wb.remove(wb.active)

for spec in B.SPECS:
    B.build_table_sheet(wb, spec)
if STAGE >= 2:
    B.build_home(wb)
    B.build_exec_dashboard(wb)
    B.build_project_dashboard(wb)
    B.build_charter(wb)
    B.build_weekly_status(wb)
    B.build_sop(wb)
    B.build_settings(wb, customers)
    B.build_data_dictionary(wb)
if STAGE >= 3:
    B.add_gantt(wb["04_WBS_SCHEDULE"])
    B.add_summary_block(wb["11_COST_MANAGEMENT"], "cost")
    B.add_summary_block(wb["14_QUALITY_CONTROL"], "quality")
    B.add_summary_block(wb["19_PROJECT_CLOSURE"], "closure")
    B.add_quadrant(wb["09_STAKEHOLDERS"])
if STAGE >= 4:
    wb.defined_names["L_Projects"] = DefinedName(
        "L_Projects", attr_text="'02_PROJECT_PORTFOLIO'!$C$5:$C$34")
if STAGE >= 5:
    wb._sheets.sort(key=lambda ws: B.ORDER.index(ws.title))
    wb.active = 0
wb.calculation.fullCalcOnLoad = True
wb.save(TMP)
print(f"stage {STAGE} saved {TMP}")

xl = win32.Dispatch("Excel.Application")
xl.Visible = False
xl.DisplayAlerts = False
try:
    book = xl.Workbooks.Open(TMP)
    print(f"stage {STAGE}: OPEN OK ({book.Sheets.Count} sheets)")
    book.Close(False)
    result = 0
except Exception as e:
    print(f"stage {STAGE}: OPEN FAILED {e}")
    result = 1
finally:
    xl.Quit()
sys.exit(result)
