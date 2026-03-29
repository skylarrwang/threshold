"""CT Department of Correction — Parole Supervision Papers."""

from __future__ import annotations

from reportlab.lib.units import inch

from threshold.demo.templates.base import (
    MARGIN,
    PAGE_H,
    PAGE_W,
    draw_case_info,
    draw_checkbox,
    draw_field_row,
    draw_letterhead,
    draw_paragraph,
    draw_seal,
    draw_section_header,
    draw_signature_line,
    draw_title,
    new_canvas,
)
from threshold.demo.tyler_data import TYLER


def generate(filepath: str) -> None:
    c = new_canvas(filepath)

    y = draw_letterhead(
        c,
        agency="State of Connecticut — Department of Correction",
        address="24 Wolcott Hill Rd, Wethersfield, CT 06109  ·  (860) 692-7480",
        subtitle="Parole & Community Services Division",
    )

    y = draw_title(c, "PAROLE SUPERVISION CERTIFICATE", y)
    y -= 4

    y = draw_case_info(
        c, y,
        "Inmate No.", TYLER["inmate_number"],
        "Case No.", TYLER["case_number"],
    )

    # ── Parolee Information ────────────────────────────────────────────────
    y = draw_section_header(c, y, "PAROLEE INFORMATION")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Legal Name", TYLER["legal_name"])
    y = draw_field_row(c, x, y, "Date of Birth", TYLER["dob_display"])
    y = draw_field_row(c, x, y, "Current Address", TYLER["address"])
    y = draw_field_row(c, x, y, "Phone", TYLER["phone"])
    y = draw_field_row(c, x, y, "Gender", TYLER["gender"])
    y -= 4

    # ── Release & Supervision ──────────────────────────────────────────────
    y = draw_section_header(c, y, "RELEASE & SUPERVISION DETAILS")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Release Date", TYLER["release_date_display"])
    y = draw_field_row(c, x, y, "Releasing Facility", TYLER["facility"])
    y = draw_field_row(c, x, y, "Supervision Type", "Parole")
    y = draw_field_row(c, x, y, "Max Expiration Date", TYLER["parole_end_display"])
    y = draw_field_row(c, x, y, "Offense", f"{TYLER['offense']} ({TYLER['offense_statute']})")
    y = draw_field_row(c, x, y, "Reporting Frequency", TYLER["reporting_frequency"].title())
    y = draw_field_row(c, x, y, "Next Reporting Date", TYLER["next_reporting_date"])
    y -= 4

    # ── Assigned Officer ───────────────────────────────────────────────────
    y = draw_section_header(c, y, "ASSIGNED PAROLE OFFICER")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Officer Name", TYLER["po_name"])
    y = draw_field_row(c, x, y, "Title", TYLER["po_title"])
    y = draw_field_row(c, x, y, "Office Phone", TYLER["po_phone"])
    y = draw_field_row(c, x, y, "Office Address", TYLER["po_address"])
    y -= 4

    # ── Special Conditions ─────────────────────────────────────────────────
    y = draw_section_header(c, y, "SPECIAL CONDITIONS")
    x = MARGIN + 10

    y = draw_checkbox(c, x, y, f"Curfew: {TYLER['curfew_start']} – {TYLER['curfew_end']} daily", True)
    y = draw_checkbox(c, x, y, f"Drug Testing: {TYLER['drug_testing_frequency']}", TYLER["drug_testing_required"])
    y = draw_checkbox(c, x, y, "Electronic Monitoring", TYLER["electronic_monitoring"])
    y = draw_checkbox(c, x, y, "Geographic Restrictions", TYLER["geographic_restrictions"])
    y = draw_checkbox(c, x, y, "No-Contact Orders", TYLER["no_contact_orders"])
    y = draw_checkbox(c, x, y, "Mandatory Treatment Program", TYLER["mandatory_treatment"])
    y -= 4

    # ── Financial Obligations ──────────────────────────────────────────────
    y = draw_section_header(c, y, "FINANCIAL OBLIGATIONS")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Restitution Owed", f"${TYLER['restitution_amount']:,.2f}")
    y = draw_field_row(c, x, y, "Monthly Payment", f"${TYLER['restitution_monthly_payment']:,.2f}")
    y = draw_field_row(c, x, y, "Outstanding Fines", f"${TYLER['outstanding_fines_amount']:,.2f}")
    y -= 16

    # ── Signatures ─────────────────────────────────────────────────────────
    y = draw_signature_line(c, MARGIN, y, TYLER["po_name"], TYLER["po_title"])

    draw_seal(
        c,
        PAGE_W - MARGIN - 0.8 * inch,
        y + 40,
        outer_text="DEPT OF CORRECTION",
        inner_text="CT DOC",
    )

    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(PAGE_W / 2, MARGIN - 20,
                        "Parolee acknowledges receipt of this certificate and understanding of all conditions.")

    c.save()
