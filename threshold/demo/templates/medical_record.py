"""Medical Discharge Summary / Primary Care Record."""

from __future__ import annotations

from reportlab.lib.units import inch

from threshold.demo.templates.base import (
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


def generate(filepath: str) -> None:
    c = new_canvas(filepath)

    y = draw_letterhead(
        c,
        agency=TYLER["clinic_name"],
        address=f"{TYLER['clinic_address']}  ·  Phone: (860) 249-9625  ·  Fax: (860) 249-9630",
        subtitle="Department of Internal Medicine",
    )

    y = draw_title(c, "PATIENT MEDICAL SUMMARY", y)
    y -= 4

    y = draw_case_info(c, y, "Date", "03/01/2026", "MRN", "CHC-2026-04418")

    # Patient info
    y = draw_section_header(c, y, "PATIENT INFORMATION")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Patient Name", TYLER["legal_name"])
    y = draw_field_row(c, x, y, "Date of Birth", TYLER["dob_display"])
    y = draw_field_row(c, x, y, "Gender", TYLER["gender"])
    y = draw_field_row(c, x, y, "Address", TYLER["address"])
    y = draw_field_row(c, x, y, "Phone", TYLER["phone"])
    y -= 4

    # Insurance
    y = draw_section_header(c, y, "INSURANCE INFORMATION")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Insurance", "Connecticut Medicaid (HUSKY)")
    y = draw_field_row(c, x, y, "Medicaid ID", TYLER["medicaid_id"])
    y = draw_field_row(c, x, y, "Coverage Status", "Active")
    y = draw_field_row(c, x, y, "Insurance Gap", "Yes — lapsed during incarceration, reinstated 03/2026")
    y -= 4

    # Diagnoses
    y = draw_section_header(c, y, "ACTIVE DIAGNOSES")
    x = MARGIN + 10
    for i, dx in enumerate(TYLER["diagnoses"], 1):
        y = draw_paragraph(c, x, y, f"{i}. {dx.title()} (ICD-10: I10) — diagnosed 2021, controlled with medication")
    y = draw_paragraph(c, x, y, "No mental health diagnoses on file.")
    y = draw_paragraph(c, x, y, "No substance use disorder diagnosis on file.")
    y -= 4

    # Medications
    y = draw_section_header(c, y, "CURRENT MEDICATIONS")
    x = MARGIN + 10
    for med in TYLER["medications"]:
        y = draw_field_row(c, x, y, med["name"], f"{med['dosage']} — {med['frequency']}")
    y -= 4

    # Disability / functional
    y = draw_section_header(c, y, "DISABILITY & FUNCTIONAL STATUS")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Disability Status", "None reported")
    y = draw_field_row(c, x, y, "Physical Limitations", "None")
    y = draw_field_row(c, x, y, "Chronic Conditions", ", ".join(TYLER["diagnoses"]).title())
    y -= 4

    # Notes
    y = draw_section_header(c, y, "PROVIDER NOTES")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        f"Patient {TYLER['legal_name']} presented for initial primary care visit following release from "
        f"incarceration on {TYLER['release_date_display']}. Blood pressure well-controlled on current "
        f"medication regimen. Medicaid coverage reinstated. Patient is in good overall health. "
        f"Recommended: annual physical, BP monitoring every 3 months, continued Lisinopril. "
        f"Follow-up scheduled for 06/2026.",
    )
    y -= 24

    # Signature
    y = draw_signature_line(c, MARGIN, y, TYLER["physician_name"], TYLER["physician_title"])

    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(PAGE_W / 2, MARGIN - 20,
                        "CONFIDENTIAL — Protected Health Information (HIPAA)")

    c.save()
