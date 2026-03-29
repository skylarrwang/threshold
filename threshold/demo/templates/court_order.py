"""CT Superior Court — Conditions of Release / Sentencing Order."""

from __future__ import annotations

from reportlab.lib.units import inch

from threshold.demo.templates.base import (
    MARGIN,
    PAGE_H,
    PAGE_W,
    draw_case_info,
    draw_checkbox,
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

    # Letterhead
    y = draw_letterhead(
        c,
        agency="State of Connecticut — Judicial Branch",
        address="Superior Court, Judicial District of Hartford  ·  95 Washington St, Hartford, CT 06106",
        subtitle="Criminal Division",
    )

    # Title
    y = draw_title(c, "ORDER OF CONDITIONS OF RELEASE", y)
    y -= 4

    # Case info
    y = draw_case_info(
        c, y,
        "Docket No.", TYLER["docket_number"],
        "Date", TYLER["release_date_display"],
    )
    y = draw_case_info(
        c, y,
        "Defendant", TYLER["legal_name"],
        "DOB", TYLER["dob_display"],
    )
    y -= 4

    # Preamble
    y = draw_paragraph(
        c, MARGIN, y,
        f"The Court, having reviewed the case of State of Connecticut v. {TYLER['legal_name']}, "
        f"Docket No. {TYLER['docket_number']}, and the defendant having entered a plea of guilty to "
        f"{TYLER['offense']} ({TYLER['offense_statute']}), {TYLER['offense_class']}, the Court hereby "
        f"orders the following conditions of release and supervision:",
    )
    y -= 8

    # Sentence section
    y = draw_section_header(c, y, "SENTENCE")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        f"The defendant is sentenced to {TYLER['sentence']}. "
        f"Inmate Number: {TYLER['inmate_number']}. "
        f"Facility: {TYLER['facility']}. "
        f"Release Date: {TYLER['release_date_display']}. "
        f"Maximum Expiration of Parole: {TYLER['parole_end_display']}.",
    )
    y -= 6

    # Conditions
    y = draw_section_header(c, y, "CONDITIONS OF SUPERVISED RELEASE")

    conditions = [
        ("Report to assigned Parole Officer as directed", True),
        ("Submit to random drug/alcohol testing", TYLER["drug_testing_required"]),
        ("Maintain approved residence and notify PO of any change", True),
        (f"Observe curfew: {TYLER['curfew_start']} – {TYLER['curfew_end']} daily", True),
        ("Seek and maintain lawful employment", True),
        ("Electronic monitoring required", TYLER["electronic_monitoring"]),
        ("Geographic restrictions apply", TYLER["geographic_restrictions"]),
        ("No-contact orders in effect", TYLER["no_contact_orders"]),
        ("Mandatory treatment program", TYLER["mandatory_treatment"]),
        ("Do not possess firearms or dangerous weapons", True),
        ("Do not leave the State of Connecticut without prior written approval", True),
    ]

    for label, checked in conditions:
        y = draw_checkbox(c, MARGIN + 10, y, label, checked)

    y -= 8

    # Financial obligations
    y = draw_section_header(c, y, "FINANCIAL OBLIGATIONS")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        f"Restitution: ${TYLER['restitution_amount']:,.2f} — payable at "
        f"${TYLER['restitution_monthly_payment']:,.2f}/month to the Office of Victim Services.",
    )
    y = draw_paragraph(
        c, MARGIN + 10, y,
        f"Court Costs: ${TYLER['court_costs']:,.2f}. "
        f"Outstanding Fines: ${TYLER['outstanding_fines_amount']:,.2f}.",
    )
    y -= 8

    # Assigned PO
    y = draw_section_header(c, y, "ASSIGNED PAROLE OFFICER")
    y = draw_paragraph(
        c, MARGIN + 10, y,
        f"{TYLER['po_name']}, {TYLER['po_title']}  ·  Phone: {TYLER['po_phone']}  ·  "
        f"{TYLER['po_address']}",
    )
    y -= 20

    # Signature block
    y = draw_signature_line(
        c,
        MARGIN,
        y,
        TYLER["judge_name"],
        TYLER["judge_title"],
    )

    # Seal
    draw_seal(
        c,
        PAGE_W - MARGIN - 0.8 * inch,
        y + 40,
        outer_text="STATE OF CONNECTICUT",
        inner_text="JUDICIAL\nBRANCH",
    )

    # Footer
    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(PAGE_W / 2, MARGIN - 20, "This is an official court document. Retain for your records.")

    c.save()
