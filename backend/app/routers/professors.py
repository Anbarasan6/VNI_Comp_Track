import csv
import io
import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User, UserRole
from app.models.professor import Professor
from app.schemas.professor import (
    ProfessorCreate, ProfessorUpdate, ProfessorResponse, ProfessorListResponse
)
from app.auth.dependencies import get_current_user, require_admin
from app.services.csv_service import parse_professor_csv, get_professors_csv

router = APIRouter()


def _build_professor_response(professor: Professor) -> ProfessorResponse:
    try:
        return ProfessorResponse.from_orm_with_rep(professor)
    except Exception:
        # Fallback if relationship not loaded
        return ProfessorResponse(
            id=professor.id,
            title=professor.title,
            initial=professor.initial,
            name=professor.name,
            designation=professor.designation,
            department=professor.department,
            university=professor.university,
            college_name=professor.college_name,
            address_line_1=professor.address_line_1,
            address_line_2=professor.address_line_2,
            city=professor.city,
            pincode=professor.pincode,
            mobile=professor.mobile,
            email=professor.email,
            sales_person_id=professor.sales_person_id,
            sales_rep_name=None,
            created_at=professor.created_at,
            updated_at=professor.updated_at,
        )


def _apply_access_filter(query, current_user: User):
    """Sales reps see: their own professors + professors not yet assigned to anyone.
    Managers and admins see all professors."""
    if current_user.role == UserRole.sales_rep:
        query = query.filter(
            or_(
                Professor.sales_person_id == current_user.id,
                Professor.sales_person_id == None,  # noqa: E711
            )
        )
    return query


@router.get("/colleges", response_model=list[str])
def get_colleges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Professor.college_name).distinct()
    query = _apply_access_filter(query, current_user)
    results = query.order_by(Professor.college_name).all()
    return [r[0] for r in results if r[0]]


@router.get("/departments", response_model=list[str])
def get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Professor.department).distinct()
    query = _apply_access_filter(query, current_user)
    results = query.order_by(Professor.department).all()
    return [r[0] for r in results if r[0]]


@router.get("/cities", response_model=list[str])
def get_cities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Professor.city).distinct()
    query = _apply_access_filter(query, current_user)
    results = query.order_by(Professor.city).all()
    return [r[0] for r in results if r[0]]


@router.get("/export-csv")
def export_professors_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Professor).join(Professor.sales_person, isouter=True)
    query = _apply_access_filter(query, current_user)
    professors = query.order_by(Professor.name).all()
    csv_content = get_professors_csv(professors)
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=professors.csv"},
    )


@router.get("", response_model=ProfessorListResponse)
def list_professors(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    college: Optional[str] = Query(default=None),
    department: Optional[str] = Query(default=None),
    city: Optional[str] = Query(default=None),
    sales_person_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Professor).join(Professor.sales_person, isouter=True)
    # Sales reps: see their own + unassigned professors
    # Managers/Admins: see all professors
    query = _apply_access_filter(query, current_user)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Professor.name.ilike(like),
                Professor.college_name.ilike(like),
                Professor.department.ilike(like),
                Professor.mobile.ilike(like),
                Professor.email.ilike(like),
                Professor.city.ilike(like),
            )
        )
    if college:
        query = query.filter(Professor.college_name.ilike(f"%{college}%"))
    if department:
        query = query.filter(Professor.department.ilike(f"%{department}%"))
    if city:
        query = query.filter(Professor.city.ilike(f"%{city}%"))
    if sales_person_id and current_user.role != UserRole.sales_rep:
        query = query.filter(Professor.sales_person_id == sales_person_id)

    total = query.count()
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    professors = query.order_by(Professor.name).offset((page - 1) * per_page).limit(per_page).all()

    return ProfessorListResponse(
        data=[_build_professor_response(p) for p in professors],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("", response_model=ProfessorResponse, status_code=status.HTTP_201_CREATED)
def create_professor(
    payload: ProfessorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check mobile uniqueness
    if db.query(Professor).filter(Professor.mobile == payload.mobile).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A professor with this mobile number already exists")
    # Check email uniqueness (if provided)
    if payload.email and db.query(Professor).filter(Professor.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A professor with this email already exists")

    sales_person_id = payload.sales_person_id
    if current_user.role == UserRole.sales_rep:
        sales_person_id = current_user.id

    professor = Professor(
        title=payload.title,
        initial=payload.initial,
        name=payload.name,
        designation=payload.designation,
        department=payload.department,
        university=payload.university,
        college_name=payload.college_name,
        address_line_1=payload.address_line_1,
        address_line_2=payload.address_line_2,
        city=payload.city,
        pincode=payload.pincode,
        mobile=payload.mobile,
        email=payload.email,
        sales_person_id=sales_person_id,
    )
    db.add(professor)
    db.flush()   # assigns professor.id without ending transaction
    prof_id = professor.id
    db.commit()

    # Reload fresh with all relationships
    from sqlalchemy.orm import joinedload as jl
    import logging
    logger = logging.getLogger(__name__)
    try:
        loaded = (
            db.query(Professor)
            .options(jl(Professor.sales_person))
            .filter(Professor.id == prof_id)
            .first()
        )
        if not loaded:
            raise ValueError(f"Professor {prof_id} not found after create")
        return _build_professor_response(loaded)
    except Exception as exc:
        logger.error(f"Error building professor response after create: {exc}")
        # Return minimal response that always works
        return ProfessorResponse(
            id=prof_id,
            title=payload.title,
            initial=payload.initial,
            name=payload.name,
            designation=payload.designation,
            department=payload.department,
            university=payload.university,
            college_name=payload.college_name,
            address_line_1=payload.address_line_1,
            address_line_2=payload.address_line_2,
            city=payload.city,
            pincode=payload.pincode,
            mobile=payload.mobile,
            email=payload.email,
            sales_person_id=sales_person_id,
            sales_rep_name=current_user.name,
            created_at=__import__('datetime').datetime.utcnow(),
            updated_at=__import__('datetime').datetime.utcnow(),
        )


@router.get("/{professor_id}", response_model=ProfessorResponse)
def get_professor(
    professor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    professor = db.query(Professor).filter(Professor.id == professor_id).first()
    if not professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor not found")
    # Sales reps can view their own professors OR unassigned professors
    if current_user.role == UserRole.sales_rep and professor.sales_person_id is not None and professor.sales_person_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return _build_professor_response(professor)


@router.put("/{professor_id}", response_model=ProfessorResponse)
def update_professor(
    professor_id: int,
    payload: ProfessorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    professor = db.query(Professor).filter(Professor.id == professor_id).first()
    if not professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor not found")

    if current_user.role == UserRole.sales_rep:
        # Allow claim: professor is unassigned AND rep is only setting their own sales_person_id
        update_data_check = payload.model_dump(exclude_unset=True)
        is_claim_only = (
            professor.sales_person_id is None
            and set(update_data_check.keys()) == {'sales_person_id'}
            and update_data_check.get('sales_person_id') == current_user.id
        )
        # Also allow: rep editing their own professor (full edit)
        is_own = professor.sales_person_id == current_user.id
        if not is_claim_only and not is_own:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    update_data = payload.model_dump(exclude_unset=True)
    if "mobile" in update_data and update_data["mobile"] != professor.mobile:
        if db.query(Professor).filter(Professor.mobile == update_data["mobile"]).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A professor with this mobile number already exists")
    if "email" in update_data and update_data["email"] and update_data["email"] != professor.email:
        if db.query(Professor).filter(Professor.email == update_data["email"]).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A professor with this email already exists")

    for field, value in update_data.items():
        setattr(professor, field, value)

    db.commit()
    db.refresh(professor)
    return _build_professor_response(professor)


@router.delete("/{professor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_professor(
    professor_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    professor = db.query(Professor).filter(Professor.id == professor_id).first()
    if not professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor not found")
    db.delete(professor)
    db.commit()


@router.post("/import-csv", status_code=status.HTTP_201_CREATED)
def import_professors_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files are accepted")

    content = file.file.read().decode("utf-8-sig")
    try:
        rows = parse_professor_csv(content)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    created_count = 0
    skipped_count = 0
    errors = []

    for idx, row in enumerate(rows, start=2):
        mobile = row.get("mobile", "").strip()
        if not mobile:
            errors.append(f"Row {idx}: mobile is required")
            continue
        existing = db.query(Professor).filter(Professor.mobile == mobile).first()
        if existing:
            skipped_count += 1
            continue
        sales_person_id = current_user.id if current_user.role == UserRole.sales_rep else row.get("sales_person_id")
        try:
            professor = Professor(
                title=row.get("title", "Mr"),
                initial=row.get("initial"),
                name=row.get("name", "").strip(),
                designation=row.get("designation"),
                department=row.get("department"),
                university=row.get("university"),
                college_name=row.get("college_name", "").strip(),
                address_line_1=row.get("address_line_1"),
                address_line_2=row.get("address_line_2"),
                city=row.get("city"),
                pincode=row.get("pincode"),
                mobile=mobile,
                email=row.get("email"),
                sales_person_id=sales_person_id,
            )
            db.add(professor)
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
