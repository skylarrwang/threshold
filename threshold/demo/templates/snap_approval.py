"""CT Department of Social Services — SNAP Benefits Approval Notice."""

from __future__ import annotations

from threshold.demo.templates.base import (
    MARGIN,
    PAGE_W,
    draw_case_info,
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
        agency="State of Connecticut — Department of Social Services",
        address="55 Farmington Ave, Hartford, CT 06105  ·  (860) 424-5008  ·  www.ct.gov/dss",
        subtitle="Bureau of Assistance Programs",
    )

    y = draw_title(c, "NOTICE OF ELIGIBILITY DETERMINATION — APPROVED", y, size=12)
    y -= 4

    y = draw_case_info(c, y, "Date", TYLER["snap_approval_date_display"],
                       "Case No.", TYLER["snap_case_number"])

    # Addressee
    y = draw_paragraph(c, MARGIN, y, TYLER["legal_name"])
    y = draw_paragraph(c, MARGIN, y, TYLER["address"])
    y -= 8

    y = draw_paragraph(c, MARGIN, y, f"Dear {TYLER['legal_name'].split()[0]},")
    y -= 4

    y = draw_paragraph(
        c, MARGIN, y,
        "We are pleased to inform you that your application for the Supplemental Nutrition "
        "Assistance Program (SNAP) has been approved. Your benefits are effective as of the "
        "date shown below. An Electronic Benefits Transfer (EBT) card will be mailed to the "
        "address on file within 5–7 business days.",
    )
    y -= 8

    # Benefit details
    y = draw_section_header(c, y, "BENEFIT DETAILS")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Program", "SNAP (Supplemental Nutrition Assistance Program)")
    y = draw_field_row(c, x, y, "Status", "APPROVED")
    y = draw_field_row(c, x, y, "Monthly Benefit", f"${TYLER['snap_monthly_amount']:.2f}")
    y = draw_field_row(c, x, y, "Benefit Start Date", TYLER["snap_start_date"])
    y = draw_field_row(c, x, y, "Certification Period",
                       f"{TYLER['snap_start_date']} through {TYLER['snap_recertification_date']}")
    y = draw_field_row(c, x, y, "Recertification Due", TYLER["snap_recertification_date"])
    y = draw_field_row(c, x, y, "EBT Card Number", TYLER["snap_ebt_card_number"])
    y -= 4

    # Applicant information
    y = draw_section_header(c, y, "APPLICANT INFORMATION")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Name", TYLER["legal_name"])
    y = draw_field_row(c, x, y, "Date of Birth", TYLER["dob_display"])
    y = draw_field_row(c, x, y, "SSN (last 4)", f"***-**-{TYLER['ssn_last4']}")
    y = draw_field_row(c, x, y, "Address", TYLER["address"])
    y = draw_field_row(c, x, y, "Household Size", "1")
    y -= 4

    # Important information
    y = draw_section_header(c, y, "IMPORTANT INFORMATION")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        "You are required to report any changes in income, household size, or address to the "
        "Department of Social Services within 10 days. Failure to report changes may result in "
        "an overpayment that must be repaid or a reduction in benefits.",
    )
    y -= 4
    y = draw_paragraph(
        c, MARGIN + 10, y,
        "Your EBT card can be used at authorized SNAP retailers. To activate your card, call "
        "the number on the back of the card or visit www.connectebt.com. Protect your PIN — "
        "do not share it with anyone.",
    )
    y -= 8

    # Your rights
    y = draw_section_header(c, y, "YOUR RIGHTS")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        "You have the right to request a fair hearing if you disagree with this determination. "
        "To request a hearing, call (860) 424-5008 or write to the address above within 90 days "
        "of the date of this notice.",
    )
    y -= 14

    # Signature
    y = draw_signature_line(c, MARGIN, y,
                            TYLER["dss_supervisor"], TYLER["dss_supervisor_title"])

    # Seal
    draw_seal(c, PAGE_W - MARGIN - 50, y + 40)

    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(PAGE_W / 2, MARGIN - 20,
                        "This notice is an official communication from the State of Connecticut.")

    c.save()
