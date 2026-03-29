"""CT Department of Social Services — HUSKY Health Enrollment Approval Notice."""

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

    y = draw_case_info(c, y, "Date", TYLER["medicaid_approval_date_display"],
                       "Case No.", TYLER["medicaid_case_number"])

    # Addressee
    y = draw_paragraph(c, MARGIN, y, TYLER["legal_name"])
    y = draw_paragraph(c, MARGIN, y, TYLER["address"])
    y -= 8

    y = draw_paragraph(c, MARGIN, y, f"Dear {TYLER['legal_name'].split()[0]},")
    y -= 4

    y = draw_paragraph(
        c, MARGIN, y,
        "We are pleased to inform you that your application for HUSKY Health "
        "(Connecticut Medicaid) has been approved. You are now enrolled in the plan "
        "shown below. Your Medicaid ID card will be mailed to the address on file "
        "within 10 business days. You may use your Medicaid ID number at participating "
        "providers immediately.",
    )
    y -= 8

    # Enrollment details
    y = draw_section_header(c, y, "ENROLLMENT DETAILS")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Program", "HUSKY Health (Connecticut Medicaid)")
    y = draw_field_row(c, x, y, "Plan", f"{TYLER['medicaid_plan']} — Low-Income Adults")
    y = draw_field_row(c, x, y, "Status", "APPROVED — ENROLLED")
    y = draw_field_row(c, x, y, "Medicaid ID", TYLER["medicaid_id"])
    y = draw_field_row(c, x, y, "Effective Date", TYLER["medicaid_start_date_display"])
    y = draw_field_row(c, x, y, "Managed Care Org", TYLER["medicaid_managed_care_org"])
    y = draw_field_row(c, x, y, "Recertification Due", TYLER["medicaid_recertification_date_display"])
    y -= 4

    # Applicant information
    y = draw_section_header(c, y, "APPLICANT INFORMATION")
    x = MARGIN + 10
    y = draw_field_row(c, x, y, "Name", TYLER["legal_name"])
    y = draw_field_row(c, x, y, "Date of Birth", TYLER["dob_display"])
    y = draw_field_row(c, x, y, "SSN (last 4)", f"***-**-{TYLER['ssn_last4']}")
    y = draw_field_row(c, x, y, "Address", TYLER["address"])
    y -= 4

    # Covered services
    y = draw_section_header(c, y, "COVERED SERVICES")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        "HUSKY A covers a wide range of medical services at no cost to you, including: "
        "primary and specialty doctor visits, hospital and emergency care, prescription "
        "medications, mental health and substance use treatment, dental and vision care, "
        "lab work and diagnostic imaging, and preventive screenings.",
    )
    y -= 4

    # Important information
    y = draw_section_header(c, y, "IMPORTANT INFORMATION")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        "You must report any changes in income, household size, or address to the Department "
        "of Social Services within 10 days. Your coverage must be renewed annually. You will "
        "receive a renewal notice before your recertification date.",
    )
    y -= 6

    # Your rights
    y = draw_section_header(c, y, "YOUR RIGHTS")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        "You have the right to request a fair hearing if you disagree with this determination. "
        "You may also choose or change your managed care organization by calling (800) 859-9889. "
        "To request a hearing, call (860) 424-5008 or write to the address above within 90 days.",
    )
    y -= 10

    # Signature
    y = draw_signature_line(c, MARGIN, y,
                            TYLER["dss_supervisor"], TYLER["dss_supervisor_title"])

    # Seal
    draw_seal(c, PAGE_W - MARGIN - 50, y + 40)

    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(PAGE_W / 2, MARGIN - 20,
                        "This notice is an official communication from the State of Connecticut.")

    c.save()
