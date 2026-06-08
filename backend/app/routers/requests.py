import math
import re
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, extract, func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.request import Request, RequestBook, RequestStatus, DeliveryType
from app.models.professor import Professor
from app.models.book import Book
from app.schemas.request import (
    RequestCreate, RequestUpdate, RequestResponse, RequestListResponse,
    RejectRequest, LetterUpdate, SalesNotesUpdate, DeliverRequest
)
from app.schemas.professor import ProfessorResponse
from app.auth.dependencies import get_current_user, require_admin, require_manager_or_admin
from app.services.email_service import send_dispatch_email, send_delivery_email
from app.config import settings

router = APIRouter()


def _generate_request_no(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"REQ-{year}-"
    existing = db.query(Request.request_no).filter(Request.request_no.like(f"{prefix}%")).all()
    max_seq = 0
    for (rno,) in existing:
        match = re.search(r"REQ-\d{4}-(\d+)$", rno)
        if match:
            seq = int(match.group(1))
            if seq > max_seq:
                max_seq = seq
    return f"{prefix}{max_seq + 1:04d}"


def _load_request(db: Session, request_id: int) -> Request:
    req = (
        db.query(Request)
        .options(
            joinedload(Request.professor).joinedload(Professor.sales_person),
            joinedload(Request.creator),
            joinedload(Request.approver),
            joinedload(Request.books).joinedload(RequestBook.book),
        )
        .filter(Request.id == request_id)
        .first()
    )
    return req


def _build_request_response(req: Request) -> RequestResponse:
    prof_response = None
    if req.professor:
        prof_response = ProfessorResponse.from_orm_with_rep(req.professor)

    return RequestResponse(
        id=req.id,
        request_no=req.request_no,
        professor_id=req.professor_id,
        delivery_type=req.delivery_type,
        address_type=req.address_type,
        remarks=req.remarks,
        status=req.status,
        created_by=req.created_by,
        approved_by=req.approved_by,
        approved_at=req.approved_at,
        dispatch_date=req.dispatch_date,
        delivery_date=req.delivery_date,
        letter_content=req.letter_content,
        rejection_reason=req.rejection_reason,
        created_at=req.created_at,
        updated_at=req.updated_at,
        sales_notes=req.sales_notes,
        professor=prof_response,
        books=req.books,
        sales_rep_name=req.creator.name if req.creator else None,
        approver_name=req.approver.name if req.approver else None,
    )


def _check_access(req: Request, current_user: User):
    if current_user.role == UserRole.sales_rep and req.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@router.get("/dispatch-queue", response_model=RequestListResponse)
def get_dispatch_queue(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = (
        db.query(Request)
        .options(
            joinedload(Request.professor).joinedload(Professor.sales_person),
            joinedload(Request.creator),
            joinedload(Request.approver),
            joinedload(Request.books).joinedload(RequestBook.book),
        )
        .filter(
            Request.status == RequestStatus.APPROVED,
            Request.delivery_type == DeliveryType.OFFICE_DISPATCH,
        )
        .order_by(Request.created_at.asc())
    )
    total = query.count()
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    requests = query.offset((page - 1) * per_page).limit(per_page).all()
    return RequestListResponse(
        data=[_build_request_response(r) for r in requests],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    professor = db.query(Professor).filter(Professor.id == payload.professor_id).first()
    if not professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor not found")

    for rb in payload.books:
        book = db.query(Book).filter(Book.id == rb.book_id).first()
        if not book:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Book {rb.book_id} not found")

    request_no = _generate_request_no(db)

    req = Request(
        request_no=request_no,
        professor_id=payload.professor_id,
        delivery_type=payload.delivery_type,
        address_type=payload.address_type,
        remarks=payload.remarks,
        status=RequestStatus.REQUESTED,
        created_by=current_user.id,
    )
    db.add(req)
    db.flush()

    for rb in payload.books:
        request_book = RequestBook(request_id=req.id, book_id=rb.book_id, copies=rb.copies)
        db.add(request_book)

    db.commit()
    loaded = _load_request(db, req.id)
    return _build_request_response(loaded)


@router.get("", response_model=RequestListResponse)
def list_requests(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    req_status: Optional[str] = Query(default=None, alias="status"),
    delivery_type: Optional[str] = Query(default=None),
    professor_id: Optional[int] = Query(default=None),
    college: Optional[str] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Request)
        .options(
            joinedload(Request.professor).joinedload(Professor.sales_person),
            joinedload(Request.creator),
            joinedload(Request.approver),
            joinedload(Request.books).joinedload(RequestBook.book),
        )
        .join(Request.professor)
    )

    if current_user.role == UserRole.sales_rep:
        query = query.filter(Request.created_by == current_user.id)

    if req_status:
        try:
            status_enum = RequestStatus(req_status)
            query = query.filter(Request.status == status_enum)
        except ValueError:
            pass

    if delivery_type:
        try:
            dt_enum = DeliveryType(delivery_type)
            query = query.filter(Request.delivery_type == dt_enum)
        except ValueError:
            pass

    if professor_id:
        query = query.filter(Request.professor_id == professor_id)

    if college:
        query = query.filter(Professor.college_name.ilike(f"%{college}%"))

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Request.request_no.ilike(like),
                Professor.name.ilike(like),
                Professor.college_name.ilike(like),
                Professor.mobile.ilike(like),
            )
        )

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

    total = query.count()
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    requests = query.order_by(Request.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return RequestListResponse(
        data=[_build_request_response(r) for r in requests],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/{request_id}", response_model=RequestResponse)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = _load_request(db, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    _check_access(req, current_user)
    return _build_request_response(req)


@router.put("/{request_id}", response_model=RequestResponse)
def update_request(
    request_id: int,
    payload: RequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = _load_request(db, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    _check_access(req, current_user)

    # Sales rep can only edit REQUESTED status
    if current_user.role == UserRole.sales_rep and req.status != RequestStatus.REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only REQUESTED status requests can be edited by sales rep",
        )

    if payload.remarks is not None:
        req.remarks = payload.remarks
    if payload.address_type is not None:
        req.address_type = payload.address_type

    if payload.books is not None:
        # Delete existing and re-create
        db.query(RequestBook).filter(RequestBook.request_id == req.id).delete()
        for rb in payload.books:
            book = db.query(Book).filter(Book.id == rb.book_id).first()
            if not book:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Book {rb.book_id} not found")
            request_book = RequestBook(request_id=req.id, book_id=rb.book_id, copies=rb.copies)
            db.add(request_book)

    db.commit()
    loaded = _load_request(db, req.id)
    return _build_request_response(loaded)


@router.put("/{request_id}/approve", response_model=RequestResponse)
def approve_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    req = _load_request(db, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.status != RequestStatus.REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve request in {req.status.value} status",
        )
    req.status = RequestStatus.APPROVED
    req.approved_by = current_user.id
    req.approved_at = datetime.now(timezone.utc)
    db.commit()
    loaded = _load_request(db, req.id)
    return _build_request_response(loaded)


@router.put("/{request_id}/reject", response_model=RequestResponse)
def reject_request(
    request_id: int,
    payload: RejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    req = _load_request(db, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.status != RequestStatus.REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject request in {req.status.value} status",
        )
    req.status = RequestStatus.REJECTED
    req.rejection_reason = payload.rejection_reason
    req.approved_by = current_user.id
    req.approved_at = datetime.now(timezone.utc)
    db.commit()
    loaded = _load_request(db, req.id)
    return _build_request_response(loaded)


@router.put("/{request_id}/dispatch", response_model=RequestResponse)
def dispatch_request(
    request_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    req = _load_request(db, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.status != RequestStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot dispatch request in {req.status.value} status. Request must be APPROVED.",
        )

    req.status = RequestStatus.DISPATCHED
    req.dispatch_date = datetime.now(timezone.utc)
    db.commit()
    loaded = _load_request(db, req.id)

    # Send dispatch email in background
    if loaded.professor and loaded.professor.email:
        books_list = [
            {"title": rb.book.title, "author": rb.book.author_name, "copies": rb.copies}
            for rb in loaded.books
        ]
        background_tasks.add_task(
            send_dispatch_email,
            professor_email=loaded.professor.email,
            professor_name=loaded.professor.name,
            request_no=loaded.request_no,
            books_list=books_list,
        )

    return _build_request_response(loaded)


@router.put("/{request_id}/deliver", response_model=RequestResponse)
def deliver_request(
    request_id: int,
    background_tasks: BackgroundTasks,
    payload: DeliverRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = _load_request(db, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    # Access control:
    # - Sales rep can only deliver their own HAND_DELIVERY requests
    # - Admin can deliver any request (OFFICE_DISPATCH or HAND_DELIVERY)
    # - Manager cannot mark delivered
    if current_user.role == UserRole.sales_rep:
        if req.delivery_type != DeliveryType.HAND_DELIVERY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sales reps can only mark Hand Delivery requests as delivered.",
            )
        if req.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only deliver your own requests.",
            )
    elif current_user.role == UserRole.manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers cannot mark requests as delivered.",
        )

    allowed_statuses = [RequestStatus.DISPATCHED, RequestStatus.REQUESTED]
    if req.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot deliver request in {req.status.value} status.",
        )

    req.status = RequestStatus.DELIVERED
    # Use provided delivery_date if given, else use now
    if payload and payload.delivery_date:
        req.delivery_date = payload.delivery_date
    else:
        req.delivery_date = datetime.now(timezone.utc)
    db.commit()
    loaded = _load_request(db, req.id)

    # Send delivery email in background
    if loaded.professor and loaded.professor.email:
        books_list = [
            {"title": rb.book.title, "author": rb.book.author_name, "copies": rb.copies}
            for rb in loaded.books
        ]
        background_tasks.add_task(
            send_delivery_email,
            professor_email=loaded.professor.email,
            professor_name=loaded.professor.name,
            request_no=loaded.request_no,
            books_list=books_list,
            faculty_form_url=settings.FACULTY_FORM_URL,
        )

    return _build_request_response(loaded)



@router.put("/{request_id}/letter", response_model=RequestResponse)
def save_letter(
    request_id: int,
    payload: LetterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = _load_request(db, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    _check_access(req, current_user)
    req.letter_content = payload.letter_content
    db.commit()
    loaded = _load_request(db, req.id)
    return _build_request_response(loaded)


@router.put("/{request_id}/notes", response_model=RequestResponse)
def update_sales_notes(
    request_id: int,
    payload: SalesNotesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sales rep can add/update notes on their own delivered requests."""
    req = _load_request(db, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if current_user.role == UserRole.sales_rep and req.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    req.sales_notes = payload.sales_notes
    db.commit()
    loaded = _load_request(db, req.id)
    return _build_request_response(loaded)
