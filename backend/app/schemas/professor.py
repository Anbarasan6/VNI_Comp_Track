from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.professor import TitleEnum


class ProfessorCreate(BaseModel):
    title: TitleEnum
    initial: Optional[str] = None
    name: str
    designation: Optional[str] = None
    department: Optional[str] = None
    university: Optional[str] = None
    college_name: str
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    mobile: str
    email: Optional[str] = None
    sales_person_id: Optional[int] = None


class ProfessorUpdate(BaseModel):
    title: Optional[TitleEnum] = None
    initial: Optional[str] = None
    name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    university: Optional[str] = None
    college_name: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    sales_person_id: Optional[int] = None


class ProfessorResponse(BaseModel):
    id: int
    title: TitleEnum
    initial: Optional[str] = None
    name: str
    designation: Optional[str] = None
    department: Optional[str] = None
    university: Optional[str] = None
    college_name: str
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    mobile: str
    email: Optional[str] = None
    sales_person_id: Optional[int] = None
    sales_rep_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_rep(cls, professor):
        data = {
            "id": professor.id,
            "title": professor.title,
            "initial": professor.initial,
            "name": professor.name,
            "designation": professor.designation,
            "department": professor.department,
            "university": professor.university,
            "college_name": professor.college_name,
            "address_line_1": professor.address_line_1,
            "address_line_2": professor.address_line_2,
            "city": professor.city,
            "pincode": professor.pincode,
            "mobile": professor.mobile,
            "email": professor.email,
            "sales_person_id": professor.sales_person_id,
            "sales_rep_name": professor.sales_person.name if professor.sales_person else None,
            "created_at": professor.created_at,
            "updated_at": professor.updated_at,
        }
        return cls(**data)


class ProfessorListResponse(BaseModel):
    data: list[ProfessorResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
