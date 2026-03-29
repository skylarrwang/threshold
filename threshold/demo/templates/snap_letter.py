"""CT Department of Social Services — SNAP Application Receipt / Pending Notice."""

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
        agency="State of Connecticut — Department of Social Services",
        address="55 Farmington Ave, Hartford, CT 06105  ·  (860) 424-5008  ·  www.ct.gov/dss",
        subtitle="Bureau of Assistance Programs",
    )

    y = draw_title(c, "NOTICE OF APPLICATION RECEIVED", y)
    y -= 4

    y = draw_case_info(c, y, "Date", "03/05/2026", "Case No.", TYLER["snap_case_number"])

    # Addressee
    y = draw_paragraph(c, MARGIN, y, TYLER["legal_name"])
    y = draw_paragraph(c, MARGIN, y, TYLER["address"])
    y -= 8

    y = draw_paragraph(c, MARGIN, y, f"Dear {TYLER['legal_name'].split()[0]},")
    y -= 4

    y = draw_paragraph(
        c, MARGIN, y,
        "This letter confirms that your application for the Supplemental Nutrition Assistance "
        "Program (SNAP) has been received and is currently being processed. Under federal "
        "regulations, a determination will be made within 30 days of your application date. "
        "If you qualify for expedited benefits, you may receive them within 7 days.",
    )
    y -= 8

    # Application details
    y = draw_section_header(c, y, "APPLICATION DETAILS")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Program Applied For", "SNAP (Supplemental Nutrition Assistance Program)")
    y = draw_field_row(c, x, y, "Case Number", TYLER["snap_case_number"])
    y = draw_field_row(c, x, y, "Application Date", "03/05/2026")
    y = draw_field_row(c, x, y, "Application Status", "PENDING — Under Review")
    y = draw_field_row(c, x, y, "Estimated Decision By", "04/04/2026")
    y = draw_field_row(c, x, y, "Household Size", "1")
    y -= 4

    # Applicant information
    y = draw_section_header(c, y, "APPLICANT INFORMATION")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Name", TYLER["legal_name"])
    y = draw_field_row(c, x, y, "Date of Birth", TYLER["dob_display"])
    y = draw_field_row(c, x, y, "SSN (last 4)", f"***-**-{TYLER['ssn_last4']}")
    y = draw_field_row(c, x, y, "Address", TYLER["address"])
    y = draw_field_row(c, x, y, "Phone", TYLER["phone"])
    y = draw_field_row(c, x, y, "Veteran Status", "No")
    y -= 4

    # Documents needed
    y = draw_section_header(c, y, "DOCUMENTS REQUIRED FOR PROCESSING")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        "To complete your application, please provide the following by your interview date. "
        "Missing documents may delay your determination.",
    )
    x = MARGIN + 10
    y -= 4
    docs = [
        ("Proof of identity (state ID, birth certificate, or discharge papers)", True),
        ("Proof of residence (lease, utility bill, or shelter verification letter)", False),
        ("Proof of income or lack of income (pay stubs, unemployment letter, or signed statement)", False),
        ("Social Security Number verification", False),
    ]
    for label, checked in docs:
        y = draw_checkbox(c, x, y, label, checked)
    y -= 4

    # Interview
    y = draw_section_header(c, y, "ELIGIBILITY INTERVIEW")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        "You are scheduled for a phone interview on 03/18/2026 between 9:00 AM and 12:00 PM. "
        "A caseworker will call you at the phone number on file. If you need to reschedule, "
        "contact us at (860) 424-5008 before your interview date.",
    )
    y -= 8

    # Rights
    y = draw_section_header(c, y, "YOUR RIGHTS")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        "You have the right to a fair hearing if your application is denied or if no decision is made "
        "within 30 days. To request a hearing, call (860) 424-5008 or write to the address above. "
        "You may also apply for expedited (emergency) benefits if you have less than $150 in liquid "
        "resources and monthly income below $150.",
    )
    y -= 14

    # Contact line instead of full signature (letter is long)
    c.setFont("Helvetica", 9)
    c.drawString(MARGIN, y, f"Questions? Contact {TYLER['dss_caseworker']}, Eligibility Specialist, at (860) 424-5008.")

    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(PAGE_W / 2, MARGIN - 20,
                        "This notice is an official communication from the State of Connecticut.")

    c.save()
