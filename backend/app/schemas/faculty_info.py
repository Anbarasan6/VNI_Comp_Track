from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FacultyInfoCreate(BaseModel):
    professor_name: str
    college_name: str
    department: Optional[str] = None
    subjects_handling: Optional[str] = None
    student_strength: Optional[int] = None
    current_textbook: Optional[str] = None
    current_publisher: Optional[str] = None
    remarks: Optional[str] = None
    mobile: str
    request_ref: Optional[str] = None


class FacultyInfoResponse(BaseModel):
    id: int
    professor_name: str
    college_name: str
    department: Optional[str] = None
    subjects_handling: Optional[str] = None
    student_strength: Optional[int] = None
    current_textbook: Optional[str] = None
    current_publisher: Optional[str] = None
    remarks: Optional[str] = None
    mobile: str
    request_ref: Optional[str] = None
    submitted_at: datetime

    model_config = {"from_attributes": True}


class FacultyInfoListResponse(BaseModel):
    data: list[FacultyInfoResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
