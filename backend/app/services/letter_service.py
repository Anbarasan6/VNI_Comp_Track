from typing import List, Dict, Any
from datetime import datetime
from jinja2 import Environment, BaseLoader


LETTER_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Letter - {{ request_no }}</title>
<style>

@page {
    size: A4;
    margin: 0;
}

body {
    background: #fff;
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
}

.preview-box {
    background: #fff;
    padding-top: 2.5in;
    padding-left: 1in;
    padding-right: 1in;
    padding-bottom: 1.2in;
    min-height: 11.69in;
    box-sizing: border-box;
}

.letter-text {
    font-family: "Times New Roman", serif;
    font-size: 18px;
    color: #000;
}

.ref-section {
    line-height: 1.2;
    margin-bottom: 15px;
}

.address-section {
    line-height: 1.25;
    margin-bottom: 20px;
}

.subject-section {
    line-height: 1.25;
    margin-bottom: 15px;
}

.content-section {
    line-height: 1.5;
    margin-bottom: 15px;
    text-align: justify;
}

.book-section {
    line-height: 1.5;
    margin-left: 40px;
    margin-bottom: 15px;
}

.book-item {
    margin-bottom: 8px;
}

.signature-section {
    line-height: 1;
    margin-top: 30px;
}

.page-break {
    page-break-before: always;
    break-before: page;
    margin-top: 1in;
}

@media print {
    body { background: #fff; }
    .preview-box { box-shadow: none; }
}

</style>
</head>
<body>
<div class="preview-box">
<div class="letter-text">

<!-- REF & DATE -->
<div class="ref-section">
{{ ref_no }}<br>
{{ letter_date }}
</div>

<!-- 1. One blank line after date -->
<br>

<!-- 2. ADDRESS BLOCK -->
<div class="address-section">
{% if address_type == 'COLLEGE' %}
{{ prof_name }}<br>
{% if designation %}{{ designation }}<br>{% endif %}
{% if department %}{{ department }}<br>{% endif %}
{{ college_name }}<br>
{% if city %}{{ city }}{% if pincode %} – {{ pincode }}{% endif %}<br>{% endif %}
{% if mobile %}{{ mobile }}{% endif %}
{% else %}
{{ prof_name }}<br>
{% if address_line_1 %}{{ address_line_1 }}<br>{% endif %}
{% if address_line_2 %}{{ address_line_2 }}<br>{% endif %}
{% if city %}{{ city }}{% if pincode %} – {{ pincode }}{% endif %}<br>{% endif %}
{% if mobile %}{{ mobile }}{% endif %}
{% endif %}
</div>

<!-- 3. One blank line after mobile -->
<br>

<!-- SALUTATION -->
<div class="subject-section">
Dear {{ short_name }}
</div>

<!-- OPENING BODY -->
<!-- 4. Sales rep with Mr. prefix -->
<div class="content-section">
Further to your discussion with my colleague Mr. {{ rep_name }}, I have great pleasure enclosing {{ copy_line }}.
</div>

<!-- 5. Half-line space before books, tab indent, half-line space after -->
<div style="margin-bottom: 0.5em;"></div>
<b><div class="book-section">
{% for book in books %}
<div class="book-item">
&emsp;{{ book.title }} – {{ book.author }}{% if book.copies > 1 %} ({{ book.copies }} Copies){% else %} (1 Copy){% endif %}
</div>
{% endfor %}
</div></b>
<div style="margin-bottom: 0.5em;"></div>

{% if total_books > 10 %}
<div class="page-break"></div>
{% endif %}

<!-- CLOSING BODY -->
<div class="content-section">
We hope you will like the books and prescribe them to your students. Please do order a few copies for your library too.
</div>

<!-- SIGNATURE -->
<div class="signature-section">
Thanking you
<br><br>
Sincerely
<br><br><br>
PK Madhavan<br>
Managing Director
<br><br>
Encl: As Above{% if address_type == 'RESIDENTIAL' %}<br>
Ref: {{ college_name }}{% endif %}
</div>

</div>
</div>
</body>
</html>
"""


def _get_short_name(full_name: str) -> str:
    """Return professor name without initials (e.g. 'Dr. R. Tamilselvi' → 'Dr. Tamilselvi')."""
    if not full_name:
        return ""
    words = full_name.strip().split()
    result = []
    for word in words:
        # Keep title prefixes (Dr., Prof., Mr., Mrs., Ms.)
        if word.lower() in {"dr.", "prof.", "mr.", "mrs.", "ms.", "dr", "prof", "mr", "mrs", "ms"}:
            result.append(word if word.endswith(".") else word + ".")
        elif not word.endswith("."):
            # Not an initial — keep it
            result.append(word)
        # Skip initials like "R." "K." etc.
    return " ".join(result)


def _build_prof_name(title: str, initial: str, name: str) -> str:
    """Build full professor name: e.g. 'Dr. R. Tamilselvi'"""
    parts = []
    if title:
        t = str(title).strip()
        if not t.endswith("."):
            t += "."
        parts.append(t)
    if initial:
        i = str(initial).strip()
        if not i.endswith("."):
            i += "."
        parts.append(i)
    if name:
        parts.append(name.strip())
    return " ".join(parts)


def generate_letter_html(
    request_data: Any,
    professor_data: Any,
    books_data: List[Dict],
    rep_name: str,
) -> str:
    env = Environment(loader=BaseLoader())
    template = env.from_string(LETTER_TEMPLATE)

    # Date
    letter_date = datetime.now().strftime("%d %B %Y")

    # Request ref (use request_no as ref)
    ref_no = f"PKM/{request_data.request_no}" if request_data.request_no else ""

    # Professor fields
    title = professor_data.title.value if professor_data.title else ""
    initial = professor_data.initial or ""
    name = professor_data.name or ""
    prof_name = _build_prof_name(title, initial, name)
    short_name = _get_short_name(prof_name)

    designation = professor_data.designation or ""
    department = professor_data.department or ""
    college_name = professor_data.college_name or ""
    address_line_1 = professor_data.address_line_1 or ""
    address_line_2 = professor_data.address_line_2 or ""
    city = professor_data.city or ""
    pincode = professor_data.pincode or ""
    mobile = professor_data.mobile or ""

    address_type = (
        request_data.address_type.value
        if request_data.address_type
        else "COLLEGE"
    )

    # Books
    total_books = len(books_data)
    copy_line = "a specimen copy of our book" if total_books == 1 else "specimen copies of our books"

    # Enrich books list with display fields
    books = []
    for b in books_data:
        books.append({
            "title": b.get("title", ""),
            "author": b.get("author", "") or b.get("author_name", ""),
            "copies": b.get("copies", 1),
        })

    context = {
        "request_no": request_data.request_no or "",
        "ref_no": ref_no,
        "letter_date": letter_date,
        "prof_name": prof_name,
        "short_name": short_name,
        "designation": designation,
        "department": department,
        "college_name": college_name,
        "address_line_1": address_line_1,
        "address_line_2": address_line_2,
        "city": city,
        "pincode": pincode,
        "mobile": mobile,
        "address_type": address_type,
        "rep_name": rep_name,
        "books": books,
        "total_books": total_books,
        "copy_line": copy_line,
    }

    return template.render(**context)


def generate_pdf(html_content: str) -> bytes:
    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes
    except ImportError:
        raise RuntimeError("weasyprint is not installed. Install it with: pip install weasyprint")
    except Exception as e:
        raise RuntimeError(f"PDF generation failed: {str(e)}")
