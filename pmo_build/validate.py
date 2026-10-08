"""Validate the built workbook.

Stage 1 - structural + formula lint (openpyxl, no Excel needed)
Stage 2 - full recalculation in Excel and a scan for error values (COM)
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from openpyxl import load_workbook
from openpyxl.utils import get_column_letter

OUT = os.path.join(ROOT, "Assistant_PMO_Production_PMOSystem.xlsx")
ERRORS = ("#REF!", "#VALUE!", "#NAME?", "#DIV/0!", "#N/A", "#NUM!", "#NULL!")


def lint_formulas(wb, problems):
    sheet_names = set(wb.sheetnames)
    defined = set(wb.defined_names)
    total = 0

    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for cell in row:
                v = cell.value
                if not isinstance(v, str) or not v.startswith("="):
                    continue
                total += 1
                where = f"{ws.title}!{cell.coordinate}"

                for bad in ("#REF!", "_xlfn", "XLOOKUP(", "TEXTJOIN(", "FILTER(",
                            "SWITCH(", "MINIFS(", "MAXIFS("):
                    if bad in v:
                        problems.append(f"{where}: forbidden token {bad}: {v[:90]}")
                if re.search(r"(?<![A-Za-z])IFS\(", v):
                    problems.append(f"{where}: forbidden IFS(): {v[:90]}")

                depth, in_str = 0, False
                i = 0
                while i < len(v):
                    ch = v[i]
                    if ch == '"':
                        in_str = not in_str
                    elif not in_str:
                        if ch == "(":
                            depth += 1
                        elif ch == ")":
                            depth -= 1
                            if depth < 0:
                                problems.append(f"{where}: unbalanced ')' : {v[:90]}")
                                break
                    i += 1
                if in_str:
                    problems.append(f"{where}: unterminated string: {v[:90]}")
                if depth > 0:
                    problems.append(f"{where}: {depth} unclosed '(': {v[:90]}")

                in_str = False
                for ch in v:
                    if ch == '"':
                        in_str = not in_str
                    elif not in_str and ord(ch) > 127:
                        problems.append(f"{where}: unquoted non-ASCII char in formula: {v[:90]}")
                        break

                for ref in re.findall(r"'([^']+)'!", v):
                    if ref not in sheet_names:
                        problems.append(f"{where}: unknown sheet '{ref}'")

                for name in re.findall(r"\bL_[A-Za-z]+\b", v):
                    if name not in defined:
                        problems.append(f"{where}: unknown defined name {name}")

    for ws in wb.worksheets:
        for dv in ws.data_validations.dataValidation:
            f = dv.formula1 or ""
            if f.startswith('"') or "=" in f or not f:
                continue
            if f not in defined:
                problems.append(f"{ws.title}: DV list '{f}' is not a defined name")
    return total


def stage1():
    wb = load_workbook(OUT)
    problems = []

    order = [n for n in wb.sheetnames]
    expected = ["00_HOME", "01_EXECUTIVE_DASHBOARD", "01B_PROJECT_DASHBOARD",
                "02_PROJECT_PORTFOLIO", "03_PROJECT_CHARTER", "04_WBS_SCHEDULE",
                "05_MILESTONES", "06_RAID_LOG", "07_ACTION_TRACKER", "08_RACI_MATRIX",
                "09_STAKEHOLDERS", "10_CHANGE_CONTROL", "11_COST_MANAGEMENT",
                "12_RESOURCE_MANAGEMENT", "13_PROCUREMENT", "14_QUALITY_CONTROL",
                "15_WEEKLY_STATUS", "16_MEETING_MINUTES", "17_DECISION_LOG",
                "18_COMMUNICATION_PLAN", "19_PROJECT_CLOSURE", "20_LESSONS_LEARNED",
                "21_PMOSOP", "22_30_60_90_PLAN", "23_SETTINGS", "24_DATA_DICTIONARY"]
    if order != expected:
        problems.append(f"sheet order wrong: {order}")

    formulas = lint_formulas(wb, problems)

    charts = sum(len(ws._charts) for ws in wb.worksheets)
    tables = sum(len(ws.tables) for ws in wb.worksheets)
    dvs = sum(len(ws.data_validations.dataValidation) for ws in wb.worksheets)
    cfs = sum(len(ws.conditional_formatting._cf_rules) for ws in wb.worksheets)

    if charts < 15:
        problems.append(f"only {charts} charts")
    if tables != 22:
        problems.append(f"expected 22 tables, got {tables}")
    if not wb.calculation.fullCalcOnLoad:
        problems.append("fullCalcOnLoad not set")

    print(f"STAGE 1: sheets={len(order)} tables={tables} formulas={formulas} "
          f"dv={dvs} cf={cfs} charts={charts} names={len(wb.defined_names)}")
    for p in problems:
        print("  PROBLEM:", p)
    if not problems:
        print("  no structural or formula problems")
    return not problems


def stage2():
    try:
        import win32com.client as win32
    except ImportError:
        print("STAGE 2: pywin32 not available - skipped")
        return True

    print("STAGE 2: opening Excel, recalculating...")
    try:
        excel = win32.gencache.EnsureDispatch("Excel.Application")
    except Exception:
        excel = win32.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False
    issues = []
    try:
        wb = excel.Workbooks.Open(OUT)
        excel.CalculateFullRebuild()
        for ws in wb.Worksheets:
            used = ws.UsedRange
            for cell_type, label in ((-4123, "formula errors"),
                                     (-4122, "constant errors")):
                try:
                    cells = used.SpecialCells(cell_type, 16)  # xlErrors
                except Exception:
                    cells = None
                if cells is None:
                    continue
                for area in cells.Areas:
                    for r in range(1, area.Rows.Count + 1):
                        for c in range(1, area.Columns.Count + 1):
                            cell = area.Cells(r, c)
                            issues.append(
                                f"{label}: {ws.Name}!{cell.Address(False, False)} -> "
                                f"{cell.Text}   [{cell.Formula}]")
        wb.Close(False)
    finally:
        excel.Quit()

    for i in issues[:80]:
        print("  ERROR:", i)
    if not issues:
        print("  recalculated workbook has no error cells")
    return not issues


if __name__ == "__main__":
    ok1 = stage1()
    ok2 = stage2()
    if ok1 and ok2:
        print("VALIDATION PASSED")
    else:
        print("VALIDATION FAILED")
        sys.exit(1)
