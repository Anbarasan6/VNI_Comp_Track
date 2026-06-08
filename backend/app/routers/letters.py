from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.request import Request, RequestBook
from app.models.professor import Professor
from app.auth.dependencies import get_current_user
from app.services.letter_service import generate_letter_html, generate_pdf

router = APIRouter()


def _get_request_or_404(request_id: int, db: Session) -> Request:
    req = (
        db.query(Request)
        .options(
            joinedload(Request.professor).joinedload(Professor.sales_person),
            joinedload(Request.creator),
            joinedload(Request.books).joinedload(RequestBook.book),
        )
        .filter(Request.id == request_id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    return req


@router.get("/{request_id}/generate", response_class=HTMLResponse)
def generate_letter(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = _get_request_or_404(request_id, db)

    professor = req.professor
    books_data = [
        {
            "title": rb.book.title,
            "author": rb.book.author_name,
            "copies": rb.copies,
        }
        for rb in req.books
    ]

    rep_name = req.creator.name if req.creator else "Sales Representative"

    html = generate_letter_html(
        request_data=req,
        professor_data=professor,
        books_data=books_data,
        rep_name=rep_name,
    )
    return HTMLResponse(content=html)


@router.get("/{request_id}/pdf")
def download_letter_pdf(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = _get_request_or_404(request_id, db)

    professor = req.professor
    books_data = [
        {
            "title": rb.book.title,
            "author": rb.book.author_name,
            "copies": rb.copies,
        }
        for rb in req.books
    ]

    rep_name = req.creator.name if req.creator else "Sales Representative"

    # Use saved letter content if available, else generate fresh
    if req.letter_content:
        html = req.letter_content
    else:
        html = generate_letter_html(
            request_data=req,
            professor_data=professor,
            books_data=books_data,
            rep_name=rep_name,
        )

    pdf_bytes = generate_pdf(html)
    filename = f"{req.request_no}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
