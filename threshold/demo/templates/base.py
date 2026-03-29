"""Shared ReportLab drawing utilities for mock government documents."""

from __future__ import annotations

import math

from reportlab.lib.colors import Color, black, gray, white
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen.canvas import Canvas

# ── Colors ──────────────────────────────────────────────────────────────────

DARK_BLUE = Color(0.05, 0.1, 0.3)
MEDIUM_BLUE = Color(0.15, 0.25, 0.5)
SEAL_GOLD = Color(0.6, 0.5, 0.2)
LIGHT_GRAY = Color(0.85, 0.85, 0.85)
FORM_GRAY = Color(0.95, 0.95, 0.95)

PAGE_W, PAGE_H = letter
MARGIN = 0.75 * inch


def new_canvas(filepath: str, pagesize=letter) -> Canvas:
    return Canvas(filepath, pagesize=pagesize)


# ── Letterhead ──────────────────────────────────────────────────────────────

def draw_letterhead(
    c: Canvas,
    agency: str,
    address: str,
    subtitle: str | None = None,
    y_start: float | None = None,
) -> float:
    """Draw a government-style letterhead. Returns y position below the header."""
    y = y_start or (PAGE_H - MARGIN)

    # Agency name
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(DARK_BLUE)
    c.drawCentredString(PAGE_W / 2, y, agency.upper())
    y -= 16

    # Subtitle (e.g., division name)
    if subtitle:
        c.setFont("Helvetica", 9)
        c.setFillColor(MEDIUM_BLUE)
        c.drawCentredString(PAGE_W / 2, y, subtitle)
        y -= 13

    # Address line
    c.setFont("Helvetica", 8)
    c.setFillColor(gray)
    c.drawCentredString(PAGE_W / 2, y, address)
    y -= 18

    # Horizontal rule
    c.setStrokeColor(DARK_BLUE)
    c.setLineWidth(1.5)
    c.line(MARGIN, y, PAGE_W - MARGIN, y)
    y -= 6
    c.setStrokeColor(MEDIUM_BLUE)
    c.setLineWidth(0.5)
    c.line(MARGIN, y, PAGE_W - MARGIN, y)
    y -= 20

    c.setFillColor(black)
    c.setStrokeColor(black)
    return y


# ── Document Title ──────────────────────────────────────────────────────────

def draw_title(c: Canvas, title: str, y: float, size: float = 13) -> float:
    """Draw a centered bold document title. Returns y below."""
    c.setFont("Helvetica-Bold", size)
    c.setFillColor(DARK_BLUE)
    c.drawCentredString(PAGE_W / 2, y, title)
    y -= size + 8
    c.setFillColor(black)
    return y


# ── Field Rows ──────────────────────────────────────────────────────────────

def draw_field_row(
    c: Canvas,
    x: float,
    y: float,
    label: str,
    value: str,
    label_width: float = 2.2 * inch,
    font_size: float = 10,
) -> float:
    """Draw a 'Label: Value' row. Returns y below."""
    c.setFont("Helvetica-Bold", font_size)
    c.drawString(x, y, f"{label}:")
    c.setFont("Courier", font_size)
    c.drawString(x + label_width, y, str(value))
    return y - (font_size + 6)


def draw_field_row_inline(
    c: Canvas,
    x: float,
    y: float,
    label: str,
    value: str,
    font_size: float = 10,
) -> float:
    """Draw label and value inline with underline under value."""
    c.setFont("Helvetica", font_size)
    c.drawString(x, y, f"{label}: ")
    label_w = c.stringWidth(f"{label}: ", "Helvetica", font_size)
    c.setFont("Courier", font_size)
    c.drawString(x + label_w, y, str(value))
    val_w = c.stringWidth(str(value), "Courier", font_size)
    c.setLineWidth(0.5)
    c.line(x + label_w, y - 2, x + label_w + max(val_w, 1.5 * inch), y - 2)
    return y - (font_size + 8)


# ── Checkboxes ──────────────────────────────────────────────────────────────

def draw_checkbox(
    c: Canvas,
    x: float,
    y: float,
    label: str,
    checked: bool = False,
    font_size: float = 10,
) -> float:
    """Draw a checkbox with label. Returns y below."""
    box_size = font_size - 1
    c.setLineWidth(0.8)
    c.rect(x, y - 1, box_size, box_size, fill=0)
    if checked:
        c.setFont("Helvetica-Bold", font_size)
        c.drawString(x + 1.5, y, "✓")
    c.setFont("Helvetica", font_size)
    c.drawString(x + box_size + 6, y, label)
    return y - (font_size + 6)


# ── Seal ────────────────────────────────────────────────────────────────────

def draw_seal(
    c: Canvas,
    x: float,
    y: float,
    outer_text: str = "STATE OF CONNECTICUT",
    inner_text: str = "OFFICIAL",
    radius: float = 0.6 * inch,
) -> None:
    """Draw a circular seal with text around the perimeter."""
    c.saveState()

    # Outer circle
    c.setStrokeColor(SEAL_GOLD)
    c.setLineWidth(2)
    c.circle(x, y, radius, fill=0)
    c.setLineWidth(1)
    c.circle(x, y, radius - 4, fill=0)

    # Inner circle
    inner_r = radius * 0.5
    c.circle(x, y, inner_r, fill=0)

    # Inner text
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(SEAL_GOLD)
    c.drawCentredString(x, y - 3, inner_text)

    # Circular text around perimeter
    c.setFont("Helvetica-Bold", 6)
    text_radius = radius - 12
    arc_start = 90  # start at top
    char_angle = 360 / max(len(outer_text) + 8, 30)
    start_angle = arc_start + (len(outer_text) * char_angle) / 2

    for i, ch in enumerate(outer_text):
        angle_deg = start_angle - i * char_angle
        angle_rad = math.radians(angle_deg)
        cx = x + text_radius * math.cos(angle_rad)
        cy = y + text_radius * math.sin(angle_rad)
        c.saveState()
        c.translate(cx, cy)
        c.rotate(angle_deg - 90)
        c.drawCentredString(0, 0, ch)
        c.restoreState()

    c.restoreState()


# ── Signature Line ──────────────────────────────────────────────────────────

def draw_signature_line(
    c: Canvas,
    x: float,
    y: float,
    name: str,
    title: str,
    width: float = 2.5 * inch,
) -> float:
    """Draw a signature line with name and title below. Returns y below."""
    # Simulated signature scrawl
    c.setFont("Courier-Oblique", 11)
    c.setFillColor(Color(0.1, 0.1, 0.4))
    # Simple signature: first initial + last name, slanted
    parts = name.replace("Hon. ", "").replace("Dr. ", "").split()
    sig = f"{parts[0][0]}. {parts[-1]}"
    c.drawString(x + 10, y + 4, sig)
    c.setFillColor(black)

    # Line
    c.setLineWidth(0.8)
    c.line(x, y, x + width, y)
    y -= 14

    # Name and title
    c.setFont("Helvetica", 9)
    c.drawString(x, y, name)
    y -= 12
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(gray)
    c.drawString(x, y, title)
    c.setFillColor(black)
    return y - 16


# ── Section Header ──────────────────────────────────────────────────────────

def draw_section_header(c: Canvas, y: float, text: str, font_size: float = 11) -> float:
    """Draw a section header with a shaded background bar."""
    c.setFillColor(FORM_GRAY)
    c.rect(MARGIN, y - 3, PAGE_W - 2 * MARGIN, font_size + 6, fill=1, stroke=0)
    c.setFillColor(DARK_BLUE)
    c.setFont("Helvetica-Bold", font_size)
    c.drawString(MARGIN + 6, y, text)
    c.setFillColor(black)
    return y - (font_size + 14)


# ── Paragraph Text ──────────────────────────────────────────────────────────

def draw_paragraph(
    c: Canvas,
    x: float,
    y: float,
    text: str,
    max_width: float | None = None,
    font: str = "Helvetica",
    font_size: float = 10,
    leading: float = 14,
) -> float:
    """Draw wrapped paragraph text. Returns y below last line."""
    max_width = max_width or (PAGE_W - 2 * MARGIN)
    c.setFont(font, font_size)
    words = text.split()
    line = ""
    for word in words:
        test = f"{line} {word}".strip()
        if c.stringWidth(test, font, font_size) > max_width:
            c.drawString(x, y, line)
            y -= leading
            line = word
        else:
            line = test
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y


# ── Date / Case Header ─────────────────────────────────────────────────────

def draw_case_info(c: Canvas, y: float, left_label: str, left_val: str,
                   right_label: str, right_val: str) -> float:
    """Draw a two-column case info row (e.g., Date / Case Number)."""
    c.setFont("Helvetica", 9)
    c.drawString(MARGIN, y, f"{left_label}: ")
    c.setFont("Courier", 9)
    lw = c.stringWidth(f"{left_label}: ", "Helvetica", 9)
    c.drawString(MARGIN + lw, y, left_val)

    c.setFont("Helvetica", 9)
    right_x = PAGE_W - MARGIN - 2.5 * inch
    c.drawString(right_x, y, f"{right_label}: ")
    rw = c.stringWidth(f"{right_label}: ", "Helvetica", 9)
    c.setFont("Courier", 9)
    c.drawString(right_x + rw, y, right_val)
    return y - 18


# ── Decorative Border ──────────────────────────────────────────────────────

def draw_certificate_border(c: Canvas, margin: float = 0.5 * inch) -> None:
    """Draw a double-line decorative border for certificates."""
    c.setStrokeColor(SEAL_GOLD)
    c.setLineWidth(2)
    c.rect(margin, margin, PAGE_W - 2 * margin, PAGE_H - 2 * margin, fill=0)
    c.setLineWidth(0.5)
    inner = margin + 6
    c.rect(inner, inner, PAGE_W - 2 * inner, PAGE_H - 2 * inner, fill=0)
    c.setStrokeColor(black)
