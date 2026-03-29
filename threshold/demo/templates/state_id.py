"""CT Department of Correction — Discharge Papers."""

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
        subtitle="Office of Classification & Population Management",
    )

    y = draw_title(c, "CERTIFICATE OF DISCHARGE", y)
    y -= 4

    y = draw_case_info(c, y, "Inmate No.", TYLER["inmate_number"], "Date", TYLER["release_date_display"])

    # ── Inmate Information ─────────────────────────────────────────────────
    y = draw_section_header(c, y, "INMATE INFORMATION")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Legal Name", TYLER["legal_name"])
    y = draw_field_row(c, x, y, "Date of Birth", TYLER["dob_display"])
    y = draw_field_row(c, x, y, "SSN (last 4)", f"***-**-{TYLER['ssn_last4']}")
    y = draw_field_row(c, x, y, "Gender", TYLER["gender"])
    y = draw_field_row(c, x, y, "Address Upon Release", TYLER["address"])
    y = draw_field_row(c, x, y, "Phone", TYLER["phone"])
    y -= 4

    # ── Sentence & Release ─────────────────────────────────────────────────
    y = draw_section_header(c, y, "SENTENCE & RELEASE DETAILS")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Facility", TYLER["facility"])
    y = draw_field_row(c, x, y, "Offense", f"{TYLER['offense']} ({TYLER['offense_statute']})")
    y = draw_field_row(c, x, y, "Offense Class", TYLER["offense_class"])
    y = draw_field_row(c, x, y, "Case Number", TYLER["case_number"])
    y = draw_field_row(c, x, y, "Sentence", TYLER["sentence"])
    y = draw_field_row(c, x, y, "Date of Release", TYLER["release_date_display"])
    y = draw_field_row(c, x, y, "Type of Release", "Parole — Discretionary")
    y = draw_field_row(c, x, y, "Max Expiration", TYLER["parole_end_display"])
    y -= 4

    # ── Property Returned ──────────────────────────────────────────────────
    y = draw_section_header(c, y, "PROPERTY & DOCUMENTS RETURNED")
    x = MARGIN + 10
    items = [
        ("Personal clothing and belongings", True),
        ("Birth certificate (certified copy)", True),
        ("Social Security card", False),
        ("State-issued photo ID", False),
        ("GED certificate", True),
        ("Vocational certifications", True),
        ("Medical records summary", True),
        ("Discharge medication supply (30 days)", True),
        ("Gate money: $75.00", True),
    ]
    for label, checked in items:
        y = draw_checkbox(c, x, y, label, checked)
    y -= 4

    # ── Post-Release Instructions ──────────────────────────────────────────
    y = draw_section_header(c, y, "POST-RELEASE INSTRUCTIONS")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        f"You are required to report to your assigned Parole Officer, {TYLER['po_name']}, "
        f"at {TYLER['po_address']} within 24 hours of release. Contact: {TYLER['po_phone']}. "
        f"You must obtain a valid State of Connecticut photo ID within 30 days. "
        f"Visit any CT DMV branch with this discharge certificate and your birth certificate.",
    )
    y -= 20

    # ── Signatures ─────────────────────────────────────────────────────────
    y = draw_signature_line(c, MARGIN, y, "Lt. David M. Reyes", "Discharge Officer, Carl Robinson CI")

    draw_seal(
        c,
        PAGE_W - MARGIN - 0.8 * inch,
        y + 40,
        outer_text="DEPT OF CORRECTION",
        inner_text="CT DOC",
    )

    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(PAGE_W / 2, MARGIN - 20,
                        "This certificate serves as proof of identity for 30 days post-release per CGS §18-100h.")

    c.save()
