import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.models.faculty_info import FacultyInfo
from app.schemas.faculty_info import FacultyInfoCreate, FacultyInfoResponse, FacultyInfoListResponse
from app.auth.dependencies import get_current_user, require_admin

router = APIRouter()


@router.post("", response_model=FacultyInfoResponse, status_code=status.HTTP_201_CREATED)
def submit_faculty_info(
    payload: FacultyInfoCreate,
    db: Session = Depends(get_db),
):
    existing = db.query(FacultyInfo).filter(FacultyInfo.mobile == payload.mobile).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A submission with this mobile number already exists.",
        )
    faculty_info = FacultyInfo(**payload.model_dump())
    db.add(faculty_info)
    db.commit()
    db.refresh(faculty_info)
    return faculty_info


@router.get("", response_model=FacultyInfoListResponse)
def list_faculty_info(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(FacultyInfo)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                FacultyInfo.professor_name.ilike(like),
                FacultyInfo.college_name.ilike(like),
                FacultyInfo.mobile.ilike(like),
                FacultyInfo.department.ilike(like),
            )
        )
    total = query.count()
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    items = query.order_by(FacultyInfo.submitted_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return FacultyInfoListResponse(
        data=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/{faculty_info_id}", response_model=FacultyInfoResponse)
def get_faculty_info(
    faculty_info_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    info = db.query(FacultyInfo).filter(FacultyInfo.id == faculty_info_id).first()
    if not info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty info not found")
    return info
