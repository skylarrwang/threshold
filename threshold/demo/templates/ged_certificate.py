"""GED / High School Equivalency Certificate."""

from __future__ import annotations

from reportlab.lib.colors import black
from reportlab.lib.units import inch

from threshold.demo.templates.base import (
    DARK_BLUE,
    PAGE_H,
    PAGE_W,
    SEAL_GOLD,
    draw_certificate_border,
    draw_seal,
    draw_signature_line,
    new_canvas,
)
from threshold.demo.tyler_data import TYLER


def generate(filepath: str) -> None:
    c = new_canvas(filepath)
    draw_certificate_border(c)

    center_x = PAGE_W / 2

    # Header
    y = PAGE_H - 1.2 * inch
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(DARK_BLUE)
    c.drawCentredString(center_x, y, "STATE OF CONNECTICUT")
    y -= 22
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, y, "State Department of Education")
    y -= 16
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, y, "165 Capitol Ave, Hartford, CT 06106")
    y -= 40

    # Certificate title
    c.setFont("Helvetica-Bold", 20)
    c.setFillColor(SEAL_GOLD)
    c.drawCentredString(center_x, y, "Certificate of High School Equivalency")
    y -= 40

    # Preamble
    c.setFont("Helvetica", 11)
    c.setFillColor(black)
    c.drawCentredString(center_x, y, "This certifies that")
    y -= 36

    # Name (large)
    c.setFont("Times-BoldItalic", 28)
    c.setFillColor(DARK_BLUE)
    c.drawCentredString(center_x, y, TYLER["legal_name"])
    y -= 30

    # Decorative line under name
    c.setStrokeColor(SEAL_GOLD)
    c.setLineWidth(1)
    c.line(center_x - 2.5 * inch, y, center_x + 2.5 * inch, y)
    y -= 30

    # Body text
    c.setFont("Helvetica", 11)
    c.setFillColor(black)
    lines = [
        "has satisfactorily completed the requirements of the",
        "GED® (General Educational Development) Testing Program",
        "and is hereby awarded this certificate, which is equivalent to",
        "a high school diploma issued by the State of Connecticut.",
    ]
    for line in lines:
        c.drawCentredString(center_x, y, line)
        y -= 18
    y -= 10

    # Date
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, y, f"Date of Completion: {TYLER['ged_date_display']}")
    y -= 14
    c.setFont("Courier", 9)
    c.drawCentredString(center_x, y, f"Certificate No. GED-CT-2024-{TYLER['inmate_number']}")
    y -= 50

    # Signature and seal
    sig_x = 1.5 * inch
    y = draw_signature_line(c, sig_x, y, TYLER["ged_registrar"], "Registrar, CT State Dept. of Education")

    draw_seal(
        c,
        PAGE_W - 1.8 * inch,
        y + 60,
        outer_text="STATE OF CONNECTICUT",
        inner_text="DEPT OF\nEDUCATION",
        radius=0.7 * inch,
    )

    c.save()
