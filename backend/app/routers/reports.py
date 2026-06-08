import csv
import io
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.request import Request, RequestBook, RequestStatus
from app.models.professor import Professor
from app.models.faculty_info import FacultyInfo
from app.auth.dependencies import require_manager_or_admin

router = APIRouter()


@router.get("/export")
def export_report(
    req_status: Optional[str] = Query(default=None, alias="status"),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_manager_or_admin),
):
    query = (
        db.query(Request)
        .options(
            joinedload(Request.professor),
            joinedload(Request.creator),
            joinedload(Request.books).joinedload(RequestBook.book),
        )
        .join(Request.professor)
    )

    if req_status:
        try:
            status_enum = RequestStatus(req_status)
            query = query.filter(Request.status == status_enum)
        except ValueError:
            pass

    if date_from:
        try:
            df = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(Request.created_at >= df)
        except ValueError:
            pass

    if date_to:
        try:
            dt = datetime.strptime(date_to, "%Y-%m-%d")
            query = query.filter(Request.created_at <= dt)
        except ValueError:
            pass

    requests = query.order_by(Request.created_at.desc()).all()

    # Get all faculty info mobiles for quick lookup
    faculty_mobiles = {fi.mobile for fi in db.query(FacultyInfo.mobile).all()}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Request No",
        "Request Date",
        "Title",
        "Initial",
        "Name",
        "Designation",
        "Department",
        "College",
        "University",
        "Address Line 1",
        "Address Line 2",
        "City",
        "Pincode",
        "Sales Rep",
        "Books",
        "Delivery Type",
        "Status",
        "Delivery Date",
        "Faculty Info Submitted",
    ])

    for req in requests:
        prof = req.professor
        books_str = "; ".join(
            f"{rb.book.title} – {rb.book.author_name}" + (f" ({rb.copies} Copies)" if rb.copies > 1 else "")
            for rb in req.books
        )
        faculty_submitted = "Yes" if prof and prof.mobile in faculty_mobiles else "No"

        writer.writerow([
            req.request_no,
            req.created_at.strftime("%Y-%m-%d") if req.created_at else "",
            prof.title.value if prof and prof.title else "",
            prof.initial if prof else "",
            prof.name if prof else "",
            prof.designation if prof else "",
            prof.department if prof else "",
            prof.college_name if prof else "",
            prof.university if prof else "",
            prof.address_line_1 if prof else "",
            prof.address_line_2 if prof else "",
            prof.city if prof else "",
            prof.pincode if prof else "",
            req.creator.name if req.creator else "",
            books_str,
            req.delivery_type.value if req.delivery_type else "",
            req.status.value if req.status else "",
            req.delivery_date.strftime("%Y-%m-%d") if req.delivery_date else "",
            faculty_submitted,
        ])

    output.seek(0)
    filename = f"vni_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
