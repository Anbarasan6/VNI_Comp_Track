import csv
import io
import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.book import Book, BookStatus
from app.models.user import User
from app.schemas.book import BookCreate, BookUpdate, BookResponse, BookListResponse
from app.auth.dependencies import get_current_user, require_admin
from app.services.csv_service import parse_book_csv, get_books_csv

router = APIRouter()


@router.get("/export-csv")
def export_books_csv(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    books = db.query(Book).order_by(Book.title).all()
    csv_content = get_books_csv(books)
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=books.csv"},
    )


@router.get("", response_model=BookListResponse)
def list_books(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=500),
    search: Optional[str] = Query(default=None),
    book_status: Optional[BookStatus] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Book)
    if search:
        like = f"%{search}%"
        query = query.filter(
            Book.title.ilike(like) | Book.author_name.ilike(like) | Book.book_code.ilike(like)
        )
    if book_status:
        query = query.filter(Book.status == book_status)

    total = query.count()
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    books = query.order_by(Book.title).offset((page - 1) * per_page).limit(per_page).all()

    return BookListResponse(
        data=books,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
def create_book(
    payload: BookCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if payload.book_code:
        existing = db.query(Book).filter(Book.book_code == payload.book_code).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Book code already exists")
    book = Book(**payload.model_dump())
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.get("/{book_id}", response_model=BookResponse)
def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return book


@router.put("/{book_id}", response_model=BookResponse)
def update_book(
    book_id: int,
    payload: BookUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    update_data = payload.model_dump(exclude_unset=True)
    if "book_code" in update_data and update_data["book_code"] != book.book_code:
        existing = db.query(Book).filter(Book.book_code == update_data["book_code"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Book code already exists")
    for field, value in update_data.items():
        setattr(book, field, value)
    db.commit()
    db.refresh(book)
    return book


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    db.delete(book)
    db.commit()


@router.post("/import-csv", status_code=status.HTTP_201_CREATED)
def import_books_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files are accepted")

    content = file.file.read().decode("utf-8-sig")
    try:
        rows = parse_book_csv(content)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    created_count = 0
    skipped_count = 0
    errors = []

    for idx, row in enumerate(rows, start=2):
        title = (row.get("title") or "").strip()
        if not title:
            errors.append(f"Row {idx}: title is required")
            continue

        # Skip duplicate ISBN if provided
        isbn = (row.get("book_code") or "").strip() or None
        if isbn:
            existing = db.query(Book).filter(Book.book_code == isbn).first()
            if existing:
                skipped_count += 1
                continue

        # Skip duplicate title (same title + same author)
        author = (row.get("author_name") or "").strip() or None
        duplicate = db.query(Book).filter(Book.title == title).first()
        if duplicate and not isbn:
            skipped_count += 1
            continue

        raw_status = (row.get("status") or "ACTIVE").upper()
        book_status = BookStatus.ACTIVE if raw_status not in {"ACTIVE", "INACTIVE"} else BookStatus(raw_status)

        try:
            book = Book(
                book_code=isbn,
                title=title,
                author_name=author,
                status=book_status,
            )
            db.add(book)
            db.flush()
            created_count += 1
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")
            db.rollback()
            continue

    db.commit()
    return {
        "created": created_count,
        "skipped": skipped_count,
        "errors": errors,
    }
