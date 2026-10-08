"""Post-build blocks: WBS gantt, cost/quality/closure summaries,
stakeholder power/interest matrix, and the generated data dictionary."""

import pmo_specs as S1
import pmo_specs2 as S2
from openpyxl.styles import Alignment, Side, Border
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

from pmo_core import (NAVY, BLUE, BLUE_MID, BLUE_LT, PALE, WHITE, GRAY_TX, BORDER_C,
                      G_BG, G_TX, A_BG, A_TX, R_BG, R_TX, N_BG, N_TX,
                      font, solid, al, band, sheet_title, write_header,
                      setup_print, cf_map, cf_formula, col_letter_map, FMT)
from pmo_dash_common import merge_style, thin_border, hair_bottom

FIRST, LAST = 5, 34


def _lists(name):
    for n, _, vals in S1.LISTS:
        if n == name:
            return vals
    raise KeyError(name)


def _spans(ws, row, spans, values, kind="value"):
    """kind: 'label' (header band) or 'value' (kpi cell)."""
    for (c1, c2), value in zip(spans, values):
        if kind == "label":
            merge_style(ws, row, c1, row, c2, value, solid(BLUE_MID), font(8.5, True, WHITE),
                        al("center", "center", wrap=True), border=thin_border(BLUE))
        else:
            fmt = value[1] if isinstance(value, tuple) else None
            v = value[0] if isinstance(value, tuple) else value
            merge_style(ws, row, c1, row, c2, v, solid(PALE), font(15, True, NAVY),
                        al("center", "center"), fmt, border=thin_border())
    ws.row_dimensions[row].height = 24 if kind == "label" else 30


def _note(ws, row, ncols, text):
    merge_style(ws, row, 1, row, ncols, text, solid(PALE), font(8.5, False, GRAY_TX, italic=True),
                al("left", "center", indent=1))
    ws.row_dimensions[row].height = 16


# --------------------------------------------------------------------------- #
# 04 - gantt
# --------------------------------------------------------------------------- #
def add_gantt(ws):
    spec = S1.WBS_SPEC
    cols = spec["cols"]
    L = col_letter_map(cols)
    ncols = len(cols)
    weeks = S1.GANTT_WEEKS
    g1 = ncols + 1
    g2 = ncols + weeks
    L1, L2 = get_column_letter(g1), get_column_letter(g2)
    start_c, fin_c, st_c = L["Start Date"], L["Finish Date"], L["Status"]

    band(ws, 3, g2, "GANTT - ONE COLUMN PER WEEK   |   start date of the timeline comes from "
                    "23_SETTINGS!B5   |   the highlighted week is this week", BLUE)
    ws.row_dimensions[3].height = 18

    for i in range(weeks):
        col = g1 + i
        cl = get_column_letter(col)
        cell = ws.cell(row=4, column=col)
        cell.value = "='23_SETTINGS'!$B$5" if i == 0 else f"={get_column_letter(col - 1)}4+7"
        cell.number_format = "dd-mmm"
        cell.font = font(8, True, NAVY)
        cell.alignment = Alignment(textRotation=90, horizontal="center", vertical="bottom")
        cell.fill = solid(BLUE_LT)
        cell.border = Border(left=Side(style="hair", color=BORDER_C),
                             right=Side(style="hair", color=BORDER_C),
                             top=Side(style="hair", color=BORDER_C),
                             bottom=Side(style="medium", color=BLUE_MID))
        ws.column_dimensions[cl].width = 3.6

    ws.row_dimensions[4].height = 56

    grid = Border(*[Side(style="hair", color=BORDER_C)] * 4)
    for r in range(FIRST, LAST + 1):
        for i in range(weeks):
            col = g1 + i
            cl = get_column_letter(col)
            cell = ws.cell(row=r, column=col)
            cell.value = (f'=IF(AND(${start_c}{r}<>"",${fin_c}{r}<>"",'
                          f'${start_c}{r}<={cl}$4+6,${fin_c}{r}>={cl}$4),1,"")')
            cell.number_format = "General"
            cell.alignment = al("center", "center")
            cell.font = font(8)
            cell.fill = solid(WHITE)
            cell.border = grid

    rng = f"{L1}{FIRST}:{L2}{LAST}"
    rules = [
        ("Complete", BLUE, WHITE),
        ("In Progress", BLUE_MID, WHITE),
        ("Blocked", R_BG, R_TX),
    ]
    for status, bg, tx in rules:
        cf_formula(ws, rng, f'AND(ISNUMBER({L1}{FIRST}),${st_c}{FIRST}="{status}")',
                   bg, tx, first_row=FIRST, stop=True)
    cf_formula(ws, rng, f"ISNUMBER({L1}{FIRST})", N_BG, N_TX, first_row=FIRST, stop=True)
    cf_formula(ws, f"{L1}4:{L2}4", f"AND({L1}$4<=TODAY(),{L1}$4+6>=TODAY())",
               R_BG, R_TX, bold=True, first_row=4, stop=True)

    band(ws, 36, g2,
         "LEGEND:   dark blue = complete   |   blue = in progress   |   red = blocked   |   "
         "grey = not started   |   red date column = the current week", BLUE)
    ws.row_dimensions[36].height = 18

    setup_print(ws, g2, 36, title_rows="1:4")


# --------------------------------------------------------------------------- #
# 11 - cost summary
# --------------------------------------------------------------------------- #
def add_cost_summary(ws):
    cols = S2.COST_SPEC["cols"]
    L = col_letter_map(cols)
    ncols = len(cols)

    def rng(h):
        return f"${L[h]}${FIRST}:${L[h]}${LAST}"

    band(ws, 36, ncols, "COST SUMMARY - AUTOMATIC (ALL COST LINES)", BLUE)
    spans = [(1, 2), (3, 4), (5, 6), (7, 8), (9, 10), (11, 12), (13, 13)]
    _spans(ws, 37, spans, ["TOTAL APPROVED", "COMMITTED", "ACTUAL", "FORECAST",
                           "BUDGET VARIANCE", "FORECAST VARIANCE", "UTILISATION"], "label")
    _spans(ws, 38, spans, [
        (f"=SUM({rng('Total Approved Amount')})", FMT["money"]),
        (f"=SUM({rng('Committed Cost')})", FMT["money"]),
        (f"=SUM({rng('Actual Cost')})", FMT["money"]),
        (f"=SUM({rng('Forecast Cost')})", FMT["money"]),
        (f"=SUM({rng('Budget Variance')})", FMT["money"]),
        (f"=SUM({rng('Forecast Variance')})", FMT["money"]),
        (f"=IFERROR(SUM({rng('Actual Cost')})/SUM({rng('Total Approved Amount')}),0)", FMT["pct"]),
    ])
    for stop, formula, bg, tx in (
            (True, "$I$38>1", R_BG, R_TX),
            (True, "$I$38>=0.9", A_BG, A_TX),
            (False, "$I$38>=0", G_BG, G_TX)):
        cf_formula(ws, "I38:I38", formula, bg, tx, bold=True, first_row=38, stop=stop)

    ws.row_dimensions[39].height = 8
    band(ws, 40, ncols, "COST BY CATEGORY - AUTOMATIC", BLUE)
    cspans = [(1, 2), (3, 4), (5, 6), (7, 8), (9, 10), (11, 13)]
    _spans(ws, 41, cspans, ["COST CATEGORY", "APPROVED", "ACTUAL", "FORECAST",
                            "UTILISATION", "STATUS"], "label")
    cat_l = L["Cost Category"]
    cat_rng = f"${cat_l}${FIRST}:${cat_l}${LAST}"
    for i, cat in enumerate(_lists("L_CostCategory")):
        r = 42 + i
        _spans(ws, r, cspans, [
            cat,
            (f'=SUMIFS({rng("Total Approved Amount")},{cat_rng},$A{r})', FMT["money"]),
            (f'=SUMIFS({rng("Actual Cost")},{cat_rng},$A{r})', FMT["money"]),
            (f'=SUMIFS({rng("Forecast Cost")},{cat_rng},$A{r})', FMT["money"]),
            (f"=IFERROR($E{r}/$C{r},0)", FMT["pct"]),
            (f'=IF($C{r}=0,"-",IF($I{r}>1,"OVER",IF($I{r}>=0.9,"WATCH","OK")))'),
        ])
    for stop, formula, bg, tx in (
            (True, "$I42>1", R_BG, R_TX),
            (True, "$I42>=0.9", A_BG, A_TX),
            (False, "$I42>=0", G_BG, G_TX)):
        cf_formula(ws, "I42:I49", formula, bg, tx, bold=True, first_row=42, stop=stop)
    cf_map(ws, "K42:K49", "K",
           {"OVER": (R_BG, R_TX), "WATCH": (A_BG, A_TX), "OK": (G_BG, G_TX)},
           first_row=42)
    _note(ws, 50, ncols,
          "Utilisation = actual / approved.  WATCH at 90% and above, OVER above 100%. "
          "Every figure sums the cost register above - nothing is typed twice.")
    setup_print(ws, ncols, 50, title_rows="1:4")


# --------------------------------------------------------------------------- #
# 14 - quality summary
# --------------------------------------------------------------------------- #
def add_quality_summary(ws):
    cols = S2.QUALITY_SPEC["cols"]
    L = col_letter_map(cols)
    ncols = len(cols)

    def rng(h):
        return f"${L[h]}${FIRST}:${L[h]}${LAST}"

    band(ws, 36, ncols, "QUALITY SUMMARY - AUTOMATIC (ALL QUALITY CHECKS)", BLUE)
    spans = [(1, 2), (3, 4), (5, 6), (7, 8), (9, 10), (11, 13)]
    _spans(ws, 37, spans, ["TOTAL CHECKS", "PASSED", "FAILED", "PENDING",
                           "PASS RATE", "TOTAL DEFECTS"], "label")
    _spans(ws, 38, spans, [
        (f'=COUNTIF({rng("QC ID")},"?*")', FMT["int"]),
        (f'=COUNTIFS({rng("Result")},"Pass")', FMT["int"]),
        (f'=COUNTIFS({rng("Result")},"Fail")', FMT["int"]),
        (f'=COUNTIFS({rng("Result")},"Pending")', FMT["int"]),
        (f'=IFERROR(COUNTIFS({rng("Result")},"Pass")/COUNTIF({rng("QC ID")},"?*"),0)', FMT["pct"]),
        (f'=SUM({rng("Defects")})', FMT["int"]),
    ])
    for stop, formula, bg, tx in (
            (True, "$E$38/$A$38<0.9", R_BG, R_TX),
            (True, "$E$38/$A$38<1", A_BG, A_TX),
            (False, "$A$38>=0", G_BG, G_TX)):
        cf_formula(ws, "I38:I38", formula, bg, tx, bold=True, first_row=38, stop=stop)

    spans2 = [(1, 4), (5, 8), (9, 13)]
    _spans(ws, 39, spans2, ["OPEN CORRECTIVE ACTIONS", "CHECKS OVERDUE", "QUALITY STATUS"], "label")
    _spans(ws, 40, spans2, [
        (f'=COUNTIFS({rng("Corrective Action")},"<>",{rng("Status")},"<>Complete")', FMT["int"]),
        (f'=COUNTIFS({rng("Planned Date")},"<"&TODAY(),{rng("Planned Date")},"<>",'
         f'{rng("Actual Date")},"",{rng("Result")},"")', FMT["int"]),
        '=IF($E$38>0,"ATTENTION",IF($G$38>0,"REVIEW","PASS"))',
    ])
    cf_map(ws, "I40:I40", "I",
           {"ATTENTION": (R_BG, R_TX), "REVIEW": (A_BG, A_TX), "PASS": (G_BG, G_TX)},
           first_row=40)
    _note(ws, 41, ncols,
          "Pass rate counts Pass against every recorded check.  A failed check always raises the "
          "status to ATTENTION until the corrective action is complete.")
    setup_print(ws, ncols, 41, title_rows="1:4")


# --------------------------------------------------------------------------- #
# 19 - closure summary
# --------------------------------------------------------------------------- #
def add_closure_summary(ws):
    cols = S2.CLOSURE_SPEC["cols"]
    L = col_letter_map(cols)
    ncols = len(cols)

    def rng(h):
        return f"${L[h]}${FIRST}:${L[h]}${LAST}"

    band(ws, 36, ncols, "CLOSURE SUMMARY - AUTOMATIC (ALL CLOSURE ITEMS)", BLUE)
    spans = [(1, 2), (3, 4), (5, 6), (7, 9)]
    _spans(ws, 37, spans, ["TOTAL ITEMS", "COMPLETE", "IN PROGRESS", "% COMPLETE"], "label")
    _spans(ws, 38, spans, [
        (f'=COUNTIF({rng("Item ID")},"?*")', FMT["int"]),
        (f'=COUNTIF({rng("Status")},"Complete")', FMT["int"]),
        (f'=COUNTIF({rng("Status")},"In Progress")', FMT["int"]),
        ('=IFERROR($C$38/$A$38,0)', FMT["pct"]),
    ])
    for stop, formula, bg, tx in (
            (True, "$G$38<0.5", R_BG, R_TX),
            (True, "$G$38<1", A_BG, A_TX),
            (False, "$G$38>=1", G_BG, G_TX)):
        cf_formula(ws, "G38:G38", formula, bg, tx, bold=True, first_row=38, stop=stop)

    _spans(ws, 39, spans, ["NOT STARTED", "OVERDUE", "DUE IN 7 DAYS", "CLOSURE STATUS"], "label")
    _spans(ws, 40, spans, [
        (f'=COUNTIF({rng("Status")},"Not Started")', FMT["int"]),
        (f'=COUNTIFS({rng("Due Date")},"<"&TODAY(),{rng("Due Date")},"<>",'
         f'{rng("Status")},"<>Complete")', FMT["int"]),
        (f'=COUNTIFS({rng("Due Date")},">="&TODAY(),{rng("Due Date")},"<="&TODAY()+7,'
         f'{rng("Status")},"<>Complete")', FMT["int"]),
        '=IF($A$38=0,"-",IF($C$38>=$A$38,"CLOSED",IF($G$38>=0.5,"ON TRACK","AT RISK")))',
    ])
    cf_map(ws, "G40:G40", "G",
           {"CLOSED": (G_BG, G_TX), "ON TRACK": (A_BG, A_TX), "AT RISK": (R_BG, R_TX)},
           first_row=40)
    _note(ws, 41, ncols,
          "Closure is complete when every checklist item for every project is Complete - "
          "the status cell turns green by itself.")
    setup_print(ws, ncols, 41, title_rows="1:4")


def add_summary_block(ws, kind):
    if kind == "cost":
        add_cost_summary(ws)
    elif kind == "quality":
        add_quality_summary(ws)
    elif kind == "closure":
        add_closure_summary(ws)
    else:
        raise ValueError(f"unknown summary block: {kind}")


# --------------------------------------------------------------------------- #
# 09 - power / interest matrix
# --------------------------------------------------------------------------- #
def add_quadrant(ws):
    cols = S2.STAKEHOLDER_SPEC["cols"]
    L = col_letter_map(cols)
    ncols = len(cols)

    def rng(h):
        return f"${L[h]}${FIRST}:${L[h]}${LAST}"

    band(ws, 36, ncols, "POWER / INTEREST MATRIX - AUTOMATIC COUNTS", BLUE)
    spans = [(1, 2), (3, 6), (7, 10), (11, 13)]
    _spans(ws, 37, spans, ["INFLUENCE  \\  INTEREST", "LOW", "MEDIUM", "HIGH"], "label")

    row_specs = [
        (38, "HIGH POWER", "High",
         [(3, 6, A_BG, A_TX), (7, 10, PALE, NAVY), (11, 13, G_BG, G_TX)]),
        (39, "MEDIUM POWER", "Medium",
         [(3, 6, PALE, NAVY), (7, 10, PALE, NAVY), (11, 13, PALE, NAVY)]),
        (40, "LOW POWER", "Low",
         [(3, 6, N_BG, N_TX), (7, 10, PALE, NAVY), (11, 13, A_BG, A_TX)]),
    ]
    for r, label, infl, cells in row_specs:
        merge_style(ws, r, 1, r, 2, label, solid(BLUE), font(9.5, True, WHITE),
                    al("center", "center"), border=thin_border())
        for (c1, c2, bg, tx), interest in zip(cells, ["Low", "Medium", "High"]):
            cell = merge_style(
                ws, r, c1, r, c2,
                f'=COUNTIFS({rng("Influence")},"{infl}",{rng("Interest")},"{interest}")',
                solid(bg), font(17, True, tx), al("center", "center"),
                border=thin_border())
            cell.number_format = "0"
        ws.row_dimensions[r].height = 34

    ws.row_dimensions[41].height = 8
    cspans = [(1, 3), (4, 6), (7, 9), (10, 13)]
    _spans(ws, 42, cspans, ["MANAGE CLOSELY", "KEEP SATISFIED", "KEEP INFORMED", "MONITOR"],
           "label")
    classes = ["Manage Closely", "Keep Satisfied", "Keep Informed", "Monitor"]
    colors = [(G_BG, G_TX), (A_BG, A_TX), (A_BG, A_TX), (N_BG, N_TX)]
    for (c1, c2), name, (bg, tx) in zip(cspans, classes, colors):
        cell = merge_style(ws, 43, c1, 43, c2, f'=COUNTIF({rng("Power/Interest Class")},"{name}")',
                           solid(bg), font(17, True, tx), al("center", "center"),
                           border=thin_border())
        cell.number_format = "0"
    ws.row_dimensions[43].height = 34

    _note(ws, 44, ncols,
          "Counts come from the Influence and Interest drop-downs above; the Power/Interest Class "
          "column (and this matrix) updates the moment either changes.")
    setup_print(ws, ncols, 44, title_rows="1:4")


# --------------------------------------------------------------------------- #
# 24 - data dictionary (generated from the specs)
# --------------------------------------------------------------------------- #
def all_specs():
    found = [v for k, v in vars(S1).items() if k.endswith("_SPEC")]
    found += [v for k, v in vars(S2).items() if k.endswith("_SPEC")]
    return sorted(found, key=lambda s: s["sheet"])


DD_COLS = [
    {"h": "SHEET", "w": 26},
    {"h": "TABLE", "w": 18},
    {"h": "FIELD", "w": 26},
    {"h": "TYPE", "w": 11},
    {"h": "SOURCE", "w": 14},
    {"h": "DROP-DOWN / FORMULA", "w": 22},
    {"h": "DESCRIPTION", "w": 70},
]


def build_data_dictionary(wb):
    specs = all_specs()
    ws = wb.create_sheet("24_DATA_DICTIONARY")
    ws.sheet_properties.tabColor = "9AA7B4"
    ws.sheet_view.showGridLines = False
    ncols = len(DD_COLS)

    for i, c in enumerate(DD_COLS, 1):
        ws.column_dimensions[get_column_letter(i)].width = c["w"]

    sheet_title(
        ws, "DATA DICTIONARY",
        "Every field in the system: what it is, where it comes from and which list feeds its "
        "drop-down. Read this before adding a column.",
        ncols,
        note="SOURCE: Input = you type it  |  Drop-down = chosen from 23_SETTINGS  |  "
             "Calculated = a formula that must never be overwritten.")

    write_header(ws, DD_COLS, row=4, height=28)

    row = 5
    for spec in specs:
        for c in spec["cols"]:
            source = c.get("src") or "Input"
            lst = c.get("lst") or ""
            if c.get("f") and not lst:
                lst = "Formula"
            values = [spec["sheet"], spec["table"], c["h"], c.get("t", "text"),
                      source, lst, c.get("d", "")]
            for i, v in enumerate(values, 1):
                cell = ws.cell(row=row, column=i, value=v)
                cell.font = font(9, i == 3)
                cell.alignment = al("left", "center", indent=1 if i >= 3 else 0)
                if i == 4:
                    cell.alignment = al("center", "center")
            ws.row_dimensions[row].height = 15
            row += 1

    last = row - 1
    tab = Table(displayName="tblDictionary", ref=f"A4:{get_column_letter(ncols)}{last}")
    tab.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showFirstColumn=False,
                                        showLastColumn=False, showRowStripes=True,
                                        showColumnStripes=False)
    ws.add_table(tab)

    cf_map(ws, f"E5:E{last}", "E",
           {"Drop-down": (BLUE_LT, BLUE), "Calculated": (PALE, NAVY)}, first_row=5)

    ws.freeze_panes = "A5"
    setup_print(ws, ncols, last, title_rows="1:4")
    return ws
