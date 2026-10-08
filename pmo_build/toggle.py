"""Toggle parts of one table sheet to isolate what Excel rejects."""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo
import build as B
import pmo_specs as S1
from pmo_core import build_table_sheet, SAMPLE_NOTE
import win32com.client as win32

TEMP = os.path.join(os.environ["TEMP"], "pmo_toggle.xlsx")
SPEC = S1.PORTFOLIO_SPEC


def variant(mode):
    spec = dict(SPEC)
    spec["cols"] = [dict(c) for c in SPEC["cols"]]
    if mode == "nocf":
        spec["cf"] = []
    if mode == "nodq":
        spec["dq"] = {}
    if mode == "nodv":
        for c in spec["cols"]:
            c.pop("lst", None)
            c.pop("prompt", None)
    if mode == "noformulas":
        for c in spec["cols"]:
            c.pop("f", None)
    if mode == "nosample":
        spec["sample"] = []
    if mode == "nohelper":
        spec["cols"] = [c for c in spec["cols"] if not c.get("hidden")]
    if mode == "noteprint":
        pass
    wb = Workbook()
    wb.remove(wb.active)
    ws = build_table_sheet(wb, spec)
    if mode == "noprint":
        ws.print_area = None
        ws.print_title_rows = None
        ws.oddFooter.left.text = None
        ws.oddFooter.right.text = None
    wb.save(TEMP)
    return ws


xl = win32.Dispatch("Excel.Application")
xl.Visible = False
xl.DisplayAlerts = False
modes = ["base", "nocf", "nodq", "nodv", "noformulas", "nosample", "nohelper", "noprint"]
try:
    for mode in modes:
        variant(mode)
        try:
            book = xl.Workbooks.Open(TEMP)
            print(f"OK   {mode}")
            book.Close(False)
        except Exception:
            print(f"FAIL {mode}")
finally:
    xl.Quit()
