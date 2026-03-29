"""Generate all mock documents for the OCR demo pipeline."""

from __future__ import annotations

import os
from pathlib import Path

from threshold.demo.templates import (
    court_order,
    forklift_cert,
    ged_certificate,
    medical_record,
    medicaid_approval,
    medicaid_letter,
    parole_papers,
    restitution_schedule,
    snap_approval,
    snap_letter,
    state_id,
)

DEFAULT_OUTPUT_DIR = os.path.join(
    os.getenv("THRESHOLD_DATA_DIR", "./data"), "demo_documents"
)

DOCUMENTS = [
    ("court_order.pdf", court_order, "CT Superior Court — Conditions of Release"),
    ("parole_papers.pdf", parole_papers, "CT DOC — Parole Supervision Certificate"),
    ("discharge_papers.pdf", state_id, "CT DOC — Certificate of Discharge"),
    ("ged_certificate.pdf", ged_certificate, "GED / High School Equivalency Certificate"),
    ("medical_record.pdf", medical_record, "Medical Summary — Community Health Center"),
    ("snap_application.pdf", snap_letter, "CT DSS — SNAP Application Received (Pending)"),
    ("snap_approval.pdf", snap_approval, "CT DSS — SNAP Benefits Approved"),
    ("medicaid_application.pdf", medicaid_letter, "CT DSS — HUSKY Health Application Received (Pending)"),
    ("medicaid_approval.pdf", medicaid_approval, "CT DSS — HUSKY Health Enrollment Approved"),
    ("restitution_schedule.pdf", restitution_schedule, "Court Financial Obligations Statement"),
    ("forklift_cert.pdf", forklift_cert, "Forklift Operator Certification (OSHA)"),
]


def generate_all(output_dir: str | None = None) -> list[str]:
    """Generate all mock documents. Returns list of created file paths."""
    out = Path(output_dir or DEFAULT_OUTPUT_DIR)
    out.mkdir(parents=True, exist_ok=True)

    created = []
    for filename, module, description in DOCUMENTS:
        filepath = str(out / filename)
        module.generate(filepath)
        created.append(filepath)
        print(f"  ✓ {filename:<30s} {description}")

    return created
