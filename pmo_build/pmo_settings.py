"""23_SETTINGS - controlled lists (all workbook drop-downs) + customer master."""

from openpyxl.workbook.defined_name import DefinedName
from openpyxl.utils import get_column_letter

from pmo_core import (NAVY, BLUE, BLUE_MID, PALE, WHITE, GRAY_TX, BORDER_C,
                      font, solid, al, border_all, band, sheet_title, setup_print)
from pmo_specs import LISTS, d

SET_SHEET = "23_SETTINGS"


def build_settings(wb, customers):
    ws = wb.create_sheet(SET_SHEET)
    ws.sheet_properties.tabColor = "9AA7B4"
    ws.sheet_view.showGridLines = False

    NC = 8
    widths = {1: 24, 2: 24, 3: 24, 4: 24, 5: 24, 6: 24, 7: 3, 8: 44}
    for c, w in widths.items():
        ws.column_dimensions[get_column_letter(c)].width = w

    sheet_title(
        ws, "SETTINGS - CONTROLLED LISTS & SYSTEM OPTIONS",
        "Every drop-down in this workbook reads from the lists below. Change a list value and "
        "the drop-downs follow. Never rename or delete a list header.",
        NC,
        note="Customer master list (column H) is loaded from the V7 customer file "
             "(ALL CUSTOMER / Org-Trade Name). Add your own customers to the bottom of column H.")

    # system settings ---------------------------------------------------------- #
    band(ws, 4, NC, "SYSTEM SETTINGS - CHANGE ONLY IF YOU KNOW WHY", BLUE)
    bd = border_all()

    def setting(row, lcol, label, value, fmt=None, input_cell=True):
        lc = ws.cell(row=row, column=lcol, value=label)
        lc.font = font(9, True, GRAY_TX)
        lc.fill = solid(PALE)
        lc.alignment = al("right", "center")
        lc.border = bd
        vc = ws.cell(row=row, column=lcol + 1, value=value)
        vc.font = font(10, True, NAVY)
        vc.fill = solid(WHITE if input_cell else PALE)
        vc.alignment = al("center", "center")
        vc.border = bd
        if fmt:
            vc.number_format = fmt
        return vc

    setting(5, 1, "Gantt start date", d("2026-06-29"), "dd-mmm-yy")
    setting(5, 3, "Gantt weeks shown", 24, "0")
    setting(5, 5, "Reporting week ends", "=TODAY()-WEEKDAY(TODAY(),2)+7", "dd-mmm-yy", input_cell=False)
    setting(6, 1, "Workbook owner", "PMO Office")
    setting(6, 3, "Last refreshed", "=TODAY()", "dd-mmm-yy", input_cell=False)
    setting(6, 5, "Number format", "#,##0 (no decimals)", input_cell=False)
    ws.row_dimensions[5].height = 20
    ws.row_dimensions[6].height = 20
    ws.row_dimensions[7].height = 8

    band(ws, 8, 6, "CONTROLLED LISTS - THE SOURCE OF EVERY DROP-DOWN", BLUE)

    # customer master ----------------------------------------------------------- #
    cust_hdr = ws.cell(row=8, column=8, value="CUSTOMER MASTER  (V7)")
    cust_hdr.font = font(9.5, True, WHITE)
    cust_hdr.fill = solid(NAVY)
    cust_hdr.alignment = al("center", "center")
    cust_hdr.border = border_all()
    for i, name in enumerate(customers):
        c = ws.cell(row=9 + i, column=8, value=name)
        c.font = font(9)
        c.alignment = al("left", "center")
    cust_last = 8 + len(customers)
    wb.defined_names["L_Customers"] = DefinedName(
        "L_Customers", attr_text=f"'{SET_SHEET}'!$H$9:$H${cust_last}")

    # list grid ----------------------------------------------------------------- #
    row = 10
    i = 0
    while i < len(LISTS):
        chunk = LISTS[i:i + 6]
        max_len = max(len(vals) for _, _, vals in chunk)
        for j, (name, label, vals) in enumerate(chunk):
            col = j + 1
            h = ws.cell(row=row, column=col, value=label.upper())
            h.font = font(8.5, True, WHITE)
            h.fill = solid(NAVY)
            h.alignment = al("center", "center", wrap=True)
            h.border = border_all(BLUE_MID)
            for k, v in enumerate(vals):
                c = ws.cell(row=row + 1 + k, column=col, value=v)
                c.font = font(9)
                c.alignment = al("left", "center", indent=1)
                c.border = border_all()
                c.fill = solid(PALE if k % 2 else WHITE)
            col_l = get_column_letter(col)
            wb.defined_names[name] = DefinedName(
                name, attr_text=f"'{SET_SHEET}'!${col_l}${row + 1}:${col_l}${row + len(vals)}")
        ws.row_dimensions[row].height = 26
        row += max_len + 2
        i += 6

    note_row = row
    ws.merge_cells(f"A{note_row}:F{note_row}")
    c = ws.cell(row=note_row, column=1,
                value="TIP: to retire a value, remove it from the list - existing records keep it, "
                      "new drop-downs no longer offer it.")
    c.font = font(8.5, False, GRAY_TX, italic=True)
    c.fill = solid(PALE)
    c.alignment = al("left", "center", indent=1)

    ws.freeze_panes = "A10"
    setup_print(ws, 6, note_row, title_rows="1:3")
    return ws
