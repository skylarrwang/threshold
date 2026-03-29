"""Housing application preparation tool.

Generates personalized checklists, document lists, and talking points
based on the type of housing and the user's profile. This is the
"get ready to apply" step.
"""

from __future__ import annotations

from langchain_core.tools import tool


# Document requirements by housing type
_DOCS_BY_TYPE: dict[str, list[str]] = {
    "any": [
        "Government-issued photo ID (state ID or driver's license)",
        "Social Security card (or proof of SSN)",
        "Proof of income (pay stubs, benefits letter, or SSI award letter)",
        "Birth certificate (backup ID if primary ID not yet restored)",
    ],
    "section_8": [
        "Housing Choice Voucher (if already issued)",
        "PHA approval letter",
        "All documents from 'any' list above",
        "Tax returns or W-2 for the last 2 years (if applicable)",
        "Verification of family composition (birth certificates for dependents)",
        "Verification of disability (if claiming disability preference)",
        "Letter from current shelter or transitional program (proof of homelessness)",
    ],
    "transitional": [
        "All documents from 'any' list above",
        "Release paperwork (discharge papers from DOC/jail)",
        "Parole or probation officer contact information",
        "Recovery program documentation (if applicable)",
        "Referral letter from case worker, reentry program, or 211",
    ],
    "private_rental": [
        "All documents from 'any' list above",
        "Proof of income — most landlords want 2.5-3x monthly rent",
        "Bank statements (last 2-3 months)",
        "References (employer, case worker, previous landlord if available)",
        "Personal statement letter (explain your situation positively)",
        "Credit report (pull yours free at annualcreditreport.com)",
    ],
    "recovery": [
        "All documents from 'any' list above",
        "Substance use assessment or treatment records",
        "Referral from treatment provider or counselor",
        "Insurance card (Medicaid, Medicare, or private)",
        "Commitment to house rules (sobriety, curfew, etc.)",
    ],
    "rapid_rehousing": [
        "All documents from 'any' list above",
        "Proof of homelessness (shelter stay letter, CAN assessment)",
        "Income verification (or proof of no income)",
        "Coordinated Access Network (CAN) assessment number",
    ],
}

_TALKING_POINTS = {
    "private_rental": [
        "Lead with your strengths: stable income, employment, support network",
        "Mention your case worker or parole officer as a support contact (only if comfortable)",
        "If asked about background: be honest but brief. Focus on what's changed.",
        "Know your rights: in CT, landlords in Hartford/New Haven can't ask about criminal "
        "history until AFTER a conditional offer (fair chance housing law)",
        "Ask about their screening criteria upfront — saves time for both sides",
        "Offer a larger deposit if you can — it shows financial stability",
        "Bring references who can speak to your reliability",
    ],
    "transitional": [
        "Ask about program length and what's expected of you",
        "Ask about house rules: curfew, visitors, substance use policy",
        "Ask what support services are included (case management, job help)",
        "Ask about the path to permanent housing — what's the exit plan?",
        "Be upfront about your needs (mental health, recovery, childcare)",
    ],
    "section_8": [
        "Ask if the waitlist is currently open — many have been closed for years",
        "Ask about any local preferences that might move you up (homeless, veteran, reentry)",
        "Ask about the timeline: application → waitlist → voucher → housing search",
        "Once you have a voucher, you typically have 60-120 days to find a unit",
        "The landlord must accept Section 8 — in CT, it's illegal to refuse a voucher holder",
    ],
    "recovery": [
        "Ask about their sobriety requirements and relapse policy",
        "Ask about MAT (Medication-Assisted Treatment) — is it allowed?",
        "Ask about costs: some are insurance-funded, some charge rent",
        "Ask about length of stay and transition planning",
    ],
}


@tool
def prepare_housing_application(
    housing_type: str,
    state: str = "CT",
    has_id: bool = False,
    has_income: bool = False,
    has_ssn_card: bool = False,
    on_supervision: bool = True,
) -> str:
    """Generate a personalized housing application checklist and preparation guide.

    Call this BEFORE the user applies anywhere — it tells them exactly what
    documents they need, what to say, and what to expect.

    Args:
        housing_type: One of: section_8, transitional, private_rental, recovery, rapid_rehousing
        state: Two-letter state code for state-specific tips (default "CT")
        has_id: Whether the user already has a government photo ID
        has_income: Whether the user currently has income (job, benefits, etc.)
        has_ssn_card: Whether the user has their Social Security card
        on_supervision: Whether the user is on parole/probation
    """
    ht = housing_type.lower().strip().replace(" ", "_")
    if ht not in _DOCS_BY_TYPE:
        ht = "any"

    lines = [f"## Housing Application Prep — {housing_type.replace('_', ' ').title()}\n"]

    # --- Document checklist ---
    lines.append("### Documents You Need\n")
    base_docs = _DOCS_BY_TYPE.get("any", [])
    specific_docs = _DOCS_BY_TYPE.get(ht, [])

    # Merge and deduplicate
    all_docs = []
    for doc in specific_docs:
        if "any" in doc.lower() and "list" in doc.lower():
            all_docs.extend(base_docs)
        else:
            all_docs.append(doc)
    if not all_docs:
        all_docs = base_docs

    # Deduplicate preserving order
    seen: set[str] = set()
    for doc in all_docs:
        if doc not in seen:
            seen.add(doc)
            # Add status indicators
            if "photo ID" in doc and has_id:
                lines.append(f"- [x] {doc}")
            elif "Social Security" in doc and has_ssn_card:
                lines.append(f"- [x] {doc}")
            elif "income" in doc.lower() and has_income:
                lines.append(f"- [x] {doc} *(verify it's current)*")
            else:
                lines.append(f"- [ ] {doc}")

    # --- Missing document guidance ---
    missing: list[str] = []
    if not has_id:
        missing.append(
            "**No photo ID?** Use `get_id_restoration_guide(\"" + state + "\")` for step-by-step "
            "instructions. Many programs accept a DOC release ID temporarily."
        )
    if not has_ssn_card:
        missing.append(
            "**No SSN card?** Apply at ssa.gov or visit your local Social Security office. "
            "You can often use your DOC number as interim proof."
        )
    if not has_income:
        missing.append(
            "**No income yet?** Apply for benefits first: SNAP, Medicaid, GA (General Assistance). "
            "Use `check_snap_eligibility()` to start. Benefits letters count as proof of income."
        )

    if missing:
        lines.append("\n### Action Items for Missing Documents\n")
        for item in missing:
            lines.append(f"- {item}")

    # --- Talking points ---
    points = _TALKING_POINTS.get(ht, _TALKING_POINTS.get("transitional", []))
    if points:
        lines.append(f"\n### What to Say / Ask\n")
        for point in points:
            lines.append(f"- {point}")

    # --- Supervision note ---
    if on_supervision:
        lines.append("\n### Supervision Considerations\n")
        lines.append("- Let your PO know you're applying for housing — many support this")
        lines.append("- Some programs require PO approval or a referral letter")
        lines.append("- Ask if the housing program communicates with your PO (most transitional ones do)")
        lines.append("- Make sure the housing location is within your approved travel zone")

    # --- State-specific tips ---
    if state.upper() == "CT":
        lines.append("\n### Connecticut-Specific Tips\n")
        lines.append("- **Source of Income protection:** CT law prohibits landlords from refusing "
                      "Section 8 or other housing subsidies (Conn. Gen. Stat. § 46a-64c)")
        lines.append("- **Fair chance housing:** Hartford and New Haven prohibit criminal history "
                      "questions until after conditional offer")
        lines.append("- **211 CT:** Call 211 or visit 211ct.org — they can tell you which programs "
                      "have current openings")
        lines.append("- **CAN Assessment:** Many programs require a Coordinated Access Network "
                      "assessment first. Call 1-888-774-2900")

    lines.append("\n---")
    lines.append(
        "*Gather as many documents as possible before applying. Missing documents are the "
        "#1 reason applications stall. Your case worker or reentry navigator can help obtain them.*"
    )
    return "\n".join(lines)
