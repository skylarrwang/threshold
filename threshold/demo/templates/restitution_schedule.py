"""Court Financial Services — Restitution & Fines Payment Schedule."""

from __future__ import annotations

from reportlab.lib.colors import black
from reportlab.lib.units import inch

from threshold.demo.templates.base import (
    DARK_BLUE,
    FORM_GRAY,
    LIGHT_GRAY,
    MARGIN,
    PAGE_H,
    PAGE_W,
    draw_case_info,
    draw_field_row,
    draw_letterhead,
    draw_paragraph,
    draw_section_header,
    draw_signature_line,
    draw_title,
    new_canvas,
)
from threshold.demo.tyler_data import TYLER


def _draw_table_row(c, x, y, cols, widths, bold=False, header=False):
    """Draw a single table row with columns."""
    font = "Helvetica-Bold" if bold else "Helvetica"
    if header:
        c.setFillColor(DARK_BLUE)
        c.rect(x, y - 3, sum(widths), 16, fill=1, stroke=0)
        c.setFillColor(white)
        font = "Helvetica-Bold"
    else:
        c.setFillColor(black)

    c.setFont(font, 9)
    cx = x
    for col, w in zip(cols, widths):
        c.drawString(cx + 4, y, str(col))
        cx += w

    if header:
        c.setFillColor(black)
    return y - 16


from reportlab.lib.colors import white


def generate(filepath: str) -> None:
    c = new_canvas(filepath)

    y = draw_letterhead(
        c,
        agency="State of Connecticut — Judicial Branch",
        address="Court Support Services Division  ·  936 Silas Deane Highway, Wethersfield, CT 06109",
        subtitle="Financial Services Unit",
    )

    y = draw_title(c, "FINANCIAL OBLIGATIONS STATEMENT", y)
    y -= 4

    y = draw_case_info(c, y, "Docket No.", TYLER["docket_number"], "Date", "03/15/2026")
    y = draw_case_info(c, y, "Defendant", TYLER["legal_name"], "Inmate No.", TYLER["inmate_number"])

    # Summary
    y = draw_section_header(c, y, "OBLIGATIONS SUMMARY")
    x = MARGIN + 10

    total = TYLER["restitution_amount"] + TYLER["outstanding_fines_amount"] + TYLER["court_costs"]
    y = draw_field_row(c, x, y, "Restitution", f"${TYLER['restitution_amount']:,.2f}")
    y = draw_field_row(c, x, y, "Outstanding Fines", f"${TYLER['outstanding_fines_amount']:,.2f}")
    y = draw_field_row(c, x, y, "Court Costs", f"${TYLER['court_costs']:,.2f}")

    c.setLineWidth(0.8)
    c.line(x + 2.2 * inch, y + 4, x + 4 * inch, y + 4)
    y -= 4
    y = draw_field_row(c, x, y, "TOTAL OWED", f"${total:,.2f}")
    y -= 4

    # Payment schedule
    y = draw_section_header(c, y, "PAYMENT SCHEDULE")

    widths = [1.8 * inch, 1.5 * inch, 1.5 * inch, 2 * inch]
    y = _draw_table_row(c, MARGIN + 10, y, ["Due Date", "Amount", "Category", "Running Balance"], widths, header=True)

    balance = total
    payments = [
        ("04/01/2026", 100.00, "Restitution"),
        ("05/01/2026", 100.00, "Restitution"),
        ("06/01/2026", 100.00, "Restitution"),
        ("07/01/2026", 100.00, "Fines"),
        ("08/01/2026", 100.00, "Fines"),
        ("09/01/2026", 100.00, "Court Costs"),
        ("10/01/2026", 100.00, "Court Costs"),
        ("11/01/2026", 100.00, "Restitution"),
        ("12/01/2026", 100.00, "Restitution"),
        ("01/01/2027", 100.00, "Restitution"),
    ]

    for i, (date, amt, cat) in enumerate(payments):
        balance -= amt
        # Alternating row background
        if i % 2 == 0:
            c.setFillColor(FORM_GRAY)
            c.rect(MARGIN + 10, y - 3, sum(widths), 16, fill=1, stroke=0)
            c.setFillColor(black)
        y = _draw_table_row(c, MARGIN + 10, y,
                            [date, f"${amt:,.2f}", cat, f"${balance:,.2f}"],
                            widths)

    y -= 8
    y = draw_paragraph(
        c, MARGIN + 10, y,
        f"Payments of ${TYLER['restitution_monthly_payment']:,.2f} are due on the 1st of each month. "
        f"Payments can be made online at www.jud.ct.gov/payments, by mail to the address above, "
        f"or in person at any CT Superior Court clerk's office. Failure to make timely payments "
        f"may result in additional penalties or a violation of parole conditions.",
    )
    y -= 8

    # Payment methods
    y = draw_section_header(c, y, "PAYMENT METHODS")
    methods = [
        "Online: www.jud.ct.gov/payments (Docket No. required)",
        "Mail: Check or money order payable to 'CT Judicial Branch'",
        "In Person: Any CT Superior Court Clerk's Office",
    ]
    for m in methods:
        y = draw_paragraph(c, MARGIN + 20, y, f"•  {m}", font_size=9)
    y -= 16

    # Signature
    y = draw_signature_line(c, MARGIN, y, TYLER["clerk_name"], "Clerk, Financial Services Unit")

    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(PAGE_W / 2, MARGIN - 20,
                        "Retain this document for your records. Contact (860) 263-2734 with questions.")

    c.save()
