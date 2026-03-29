"""Forklift Operator Certification (OSHA-compliant format)."""

from __future__ import annotations

from reportlab.lib.colors import black
from reportlab.lib.units import inch

from threshold.demo.templates.base import (
    DARK_BLUE,
    PAGE_H,
    PAGE_W,
    SEAL_GOLD,
    draw_certificate_border,
    draw_field_row,
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
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(DARK_BLUE)
    c.drawCentredString(center_x, y, TYLER["forklift_issuing_org"].upper())
    y -= 18
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, y, "OSHA-Compliant Training & Certification  ·  29 CFR 1910.178")
    y -= 40

    # Title
    c.setFont("Helvetica-Bold", 20)
    c.setFillColor(SEAL_GOLD)
    c.drawCentredString(center_x, y, "Certificate of Completion")
    y -= 28
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(DARK_BLUE)
    c.drawCentredString(center_x, y, "POWERED INDUSTRIAL TRUCK OPERATOR")
    y -= 40

    # Preamble
    c.setFont("Helvetica", 11)
    c.setFillColor(black)
    c.drawCentredString(center_x, y, "This certifies that")
    y -= 36

    # Name
    c.setFont("Times-BoldItalic", 28)
    c.setFillColor(DARK_BLUE)
    c.drawCentredString(center_x, y, TYLER["legal_name"])
    y -= 28

    # Decorative line
    c.setStrokeColor(SEAL_GOLD)
    c.setLineWidth(1)
    c.line(center_x - 2.5 * inch, y, center_x + 2.5 * inch, y)
    y -= 30

    # Body
    c.setFont("Helvetica", 11)
    c.setFillColor(black)
    lines = [
        "has successfully completed the required training program for the safe operation",
        "of powered industrial trucks in accordance with OSHA Standard 29 CFR 1910.178,",
        "including classroom instruction, practical evaluation, and workplace assessment.",
    ]
    for line in lines:
        c.drawCentredString(center_x, y, line)
        y -= 16
    y -= 10

    # Equipment types
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(DARK_BLUE)
    c.drawCentredString(center_x, y, "EQUIPMENT TYPES CERTIFIED:")
    y -= 18
    c.setFont("Helvetica", 10)
    c.setFillColor(black)
    for eq_type in TYLER["forklift_equipment_types"]:
        c.drawCentredString(center_x, y, eq_type)
        y -= 15
    y -= 10

    # Cert details
    x = 1.8 * inch
    y = draw_field_row(c, x, y, "Certificate No.", TYLER["forklift_cert_number"], label_width=1.8 * inch)
    y = draw_field_row(c, x, y, "Date Issued", TYLER["forklift_cert_date"], label_width=1.8 * inch)
    y = draw_field_row(c, x, y, "Expiration Date", TYLER["forklift_cert_expiry"], label_width=1.8 * inch)
    y -= 20

    # Signature and seal
    sig_x = 1.5 * inch
    y = draw_signature_line(c, sig_x, y, "Michael R. Torres", "Lead Safety Instructor")

    draw_seal(
        c,
        PAGE_W - 1.8 * inch,
        y + 60,
        outer_text="NATIONAL SAFETY COMPLIANCE",
        inner_text="OSHA\nCOMPLIANT",
        radius=0.65 * inch,
    )

    # Footer
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(SEAL_GOLD)
    c.drawCentredString(center_x, 0.7 * inch,
                        "This certification is valid for 3 years from date of issue per OSHA guidelines.")

    c.save()
