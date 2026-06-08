"""
csv_service.py — CSV import/export helpers for professors, books, and reports.
"""
import csv
import io
from typing import List, Dict, Any, Optional


PROFESSOR_IMPORT_COLUMNS = [
    "title", "initial", "name", "designation", "department",
    "university", "college_name", "address_line_1", "address_line_2",
    "city", "pincode", "mobile", "email",
]

VALID_TITLES = {"Mr", "Mrs", "Dr", "Prof"}


def parse_professor_csv(file_content) -> List[Dict[str, Any]]:
    """
    Parse an uploaded professor CSV file.
    Accepts str or bytes. Returns list of dicts with professor field values.
    Raises ValueError with a descriptive message if validation fails.
    """
    if isinstance(file_content, bytes):
        try:
            text = file_content.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = file_content.decode("latin-1")
    else:
        text = file_content  # already a string

    reader = csv.DictReader(io.StringIO(text))

    # Normalize header names (strip whitespace, lowercase)
    if reader.fieldnames is None:
        raise ValueError("CSV file appears to be empty or has no header row.")

    normalized_headers = [h.strip().lower() for h in reader.fieldnames]

    # Check required columns
    required = {"name", "college_name"}
    missing = required - set(normalized_headers)
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}. Required: name, college_name")

    professors = []
    errors = []

    for row_num, raw_row in enumerate(reader, start=2):  # start=2 because row 1 is header
        # Normalize keys
        row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}

        # Required field validation
        if not row.get("name"):
            errors.append(f"Row {row_num}: 'name' is required.")
            continue
        if not row.get("college_name"):
            errors.append(f"Row {row_num}: 'college_name' is required.")
            continue

        # Title validation
        title = row.get("title", "Mr")
        if title not in VALID_TITLES:
            # Default to Dr if unrecognized
            title = "Dr"

        professor = {
            "title": title,
            "initial": row.get("initial") or None,
            "name": row["name"],
            "designation": row.get("designation") or None,
            "department": row.get("department") or None,
            "university": row.get("university") or None,
            "college_name": row["college_name"],
            "address_line_1": row.get("address_line_1") or None,
            "address_line_2": row.get("address_line_2") or None,
            "city": row.get("city") or None,
            "pincode": row.get("pincode") or None,
            "mobile": row.get("mobile") or None,
            "email": row.get("email") or None,
        }
        professors.append(professor)

    if errors and not professors:
        raise ValueError("All rows had errors:\n" + "\n".join(errors))

    return professors


def get_professors_csv(professors: List[Any]) -> str:
    """
    Generate CSV string from list of Professor ORM objects.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Title", "Initial", "Name", "Designation", "Department",
        "University", "College Name", "Address Line 1", "Address Line 2",
        "City", "Pincode", "Mobile", "Email", "Sales Rep",
    ])

    for p in professors:
        sales_rep = p.sales_person.name if p.sales_person else ""
        writer.writerow([
            p.title.value if hasattr(p.title, "value") else (p.title or ""),
            p.initial or "",
            p.name or "",
            p.designation or "",
            p.department or "",
            p.university or "",
            p.college_name or "",
            p.address_line_1 or "",
            p.address_line_2 or "",
            p.city or "",
            p.pincode or "",
            p.mobile or "",
            p.email or "",
            sales_rep,
        ])

    return output.getvalue()


# ---------------------------------------------------------------------------
# Book CSV helpers
# ---------------------------------------------------------------------------

BOOK_IMPORT_COLUMNS = ["isbn_number", "title", "author", "status"]
VALID_BOOK_STATUSES = {"ACTIVE", "INACTIVE"}


def parse_book_csv(file_content) -> List[Dict[str, Any]]:
    """
    Parse an uploaded book CSV file.
    Expected columns: ISBN Number, Title, Author, Status
    Returns list of dicts ready to create Book records.
    """
    if isinstance(file_content, bytes):
        try:
            text = file_content.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = file_content.decode("latin-1")
    else:
        text = file_content

    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise ValueError("CSV file appears to be empty or has no header row.")

    # Normalise headers: strip, lowercase, replace spaces with underscores
    normalized_headers = [h.strip().lower().replace(" ", "_") for h in reader.fieldnames]

    # Require at least 'title'
    if "title" not in normalized_headers:
        raise ValueError("Missing required column: 'Title'. Expected columns: ISBN Number, Title, Author, Status")

    books = []
    errors = []

    for row_num, raw_row in enumerate(reader, start=2):
        # Normalise keys
        row = {
            k.strip().lower().replace(" ", "_"): (v.strip() if v else "")
            for k, v in raw_row.items()
            if k
        }

        title = row.get("title", "").strip()
        if not title:
            errors.append(f"Row {row_num}: 'Title' is required.")
            continue

        # Accept 'isbn_number' or 'isbn' or 'book_code'
        isbn = (
            row.get("isbn_number")
            or row.get("isbn")
            or row.get("book_code")
            or None
        )
        if isbn == "":
            isbn = None

        author = row.get("author") or row.get("author_name") or None
        if author == "":
            author = None

        raw_status = (row.get("status") or "ACTIVE").upper()
        status = raw_status if raw_status in VALID_BOOK_STATUSES else "ACTIVE"

        books.append({
            "book_code": isbn,
            "title": title,
            "author_name": author,
            "status": status,
        })

    if errors and not books:
        raise ValueError("All rows had errors:\n" + "\n".join(errors))

    return books


def get_books_csv(books: List[Any]) -> str:
    """
    Generate CSV string from list of Book ORM objects.
    Columns: ISBN Number, Title, Author, Status
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["ISBN Number", "Title", "Author", "Status"])

    for b in books:
        writer.writerow([
            b.book_code or "",
            b.title or "",
            b.author_name or "",
            b.status.value if hasattr(b.status, "value") else (b.status or "ACTIVE"),
        ])

    return output.getvalue()


def get_reports_csv(requests: List[Any]) -> str:
    """
    Generate the full tracking report CSV.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Request No", "Request Date",
        "Professor Name", "Department", "College",
        "Mobile", "Email",
        "Sales Rep",
        "Books", "Copies",
        "Delivery Type",
        "Status",
        "Dispatch Date", "Delivery Date",
        "Faculty Info Submitted",
    ])

    for req in requests:
        prof = req.professor if req.professor else None
        creator = req.creator if req.creator else None

        # Build books string
        books_parts = []
        for rb in req.books:
            if rb.book:
                if rb.copies > 1:
                    books_parts.append(f"{rb.book.title} – {rb.book.author_name} ({rb.copies} Copies)")
                else:
                    books_parts.append(f"{rb.book.title} – {rb.book.author_name}")

        books_str = "; ".join(books_parts)

        # Format dates
        def fmt_date(dt):
            if dt is None:
                return ""
            return dt.strftime("%d-%m-%Y %H:%M") if hasattr(dt, "strftime") else str(dt)

        writer.writerow([
            req.request_no or "",
            fmt_date(req.created_at),
            prof.name if prof else "",
            prof.department if prof else "",
            prof.college_name if prof else "",
            prof.mobile if prof else "",
            prof.email if prof else "",
            creator.name if creator else "",
            books_str,
            "",  # copies combined in books column
            req.delivery_type.value if hasattr(req.delivery_type, "value") else (req.delivery_type or ""),
            req.status.value if hasattr(req.status, "value") else (req.status or ""),
            fmt_date(req.dispatch_date),
            fmt_date(req.delivery_date),
            getattr(req, "_faculty_info_submitted", ""),
        ])

    return output.getvalue()
