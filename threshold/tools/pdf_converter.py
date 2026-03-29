"""Markdown to PDF conversion utility."""

import io
from pathlib import Path

import markdown
from xhtml2pdf import pisa


# CSS for professional resume styling
RESUME_CSS = """
@page {
    size: letter;
    margin: 0.75in;
}

body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #333;
}

h1 {
    font-size: 20pt;
    font-weight: bold;
    color: #1a1a1a;
    margin-bottom: 5px;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 5px;
}

h2 {
    font-size: 13pt;
    font-weight: bold;
    color: #1a1a1a;
    margin-top: 15px;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

h3 {
    font-size: 11pt;
    font-weight: bold;
    margin-top: 10px;
    margin-bottom: 5px;
}

p {
    margin: 5px 0;
}

ul {
    margin: 5px 0;
    padding-left: 20px;
}

li {
    margin: 3px 0;
}

strong {
    font-weight: bold;
}

em {
    font-style: italic;
}

/* Contact info line (first paragraph after h1) */
h1 + p {
    color: #666;
    font-size: 10pt;
    margin-bottom: 15px;
}
"""


def markdown_to_pdf(md_content: str, output_path: Path | None = None) -> bytes | None:
    """Convert markdown content to PDF.

    Args:
        md_content: Markdown string to convert
        output_path: Optional path to save PDF. If None, returns bytes.

    Returns:
        PDF bytes if output_path is None, otherwise None (writes to file)
    """
    # Convert markdown to HTML
    html_content = markdown.markdown(
        md_content,
        extensions=["extra", "smarty"],
    )

    # Wrap in full HTML document with styling
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
        {RESUME_CSS}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    # Convert to PDF
    if output_path:
        with open(output_path, "wb") as f:
            pisa_status = pisa.CreatePDF(full_html, dest=f)
        return None
    else:
        pdf_buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(full_html, dest=pdf_buffer)
        if pisa_status.err:
            raise ValueError(f"PDF conversion failed: {pisa_status.err}")
        pdf_buffer.seek(0)
        return pdf_buffer.read()


def convert_resume_to_pdf(md_file_path: Path) -> bytes:
    """Read a markdown resume file and convert to PDF bytes."""
    md_content = md_file_path.read_text(encoding="utf-8")
    return markdown_to_pdf(md_content)
