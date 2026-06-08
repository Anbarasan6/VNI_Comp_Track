from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.request import DeliveryType, AddressType, RequestStatus
from app.schemas.professor import ProfessorResponse
from app.schemas.book import BookResponse


class RequestBookItem(BaseModel):
    book_id: int
    copies: int = 1

    @field_validator("copies")
    @classmethod
    def copies_must_be_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Copies must be at least 1")
        return v


class RequestBookResponse(BaseModel):
    id: int
    book_id: int
    copies: int
    book: BookResponse

    model_config = {"from_attributes": True}


class RequestCreate(BaseModel):
    professor_id: int
    delivery_type: DeliveryType
    address_type: AddressType = AddressType.COLLEGE
    remarks: Optional[str] = None
    books: List[RequestBookItem]

    @field_validator("books")
    @classmethod
    def books_not_empty(cls, v: List[RequestBookItem]) -> List[RequestBookItem]:
        if not v:
            raise ValueError("At least one book is required")
        return v


class RequestUpdate(BaseModel):
    remarks: Optional[str] = None
    books: Optional[List[RequestBookItem]] = None
    address_type: Optional[AddressType] = None


class StatusUpdate(BaseModel):
    status: Optional[RequestStatus] = None
    rejection_reason: Optional[str] = None


class ApproveRequest(BaseModel):
    pass


class RejectRequest(BaseModel):
    rejection_reason: str


class DispatchRequest(BaseModel):
    dispatch_date: Optional[datetime] = None


class DeliverRequest(BaseModel):
    delivery_date: Optional[datetime] = None


class LetterUpdate(BaseModel):
    letter_content: str


class SalesNotesUpdate(BaseModel):
    sales_notes: str


class RequestResponse(BaseModel):
    id: int
    request_no: str
    professor_id: int
    delivery_type: DeliveryType
    address_type: AddressType
    remarks: Optional[str] = None
    status: RequestStatus
    created_by: int
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    dispatch_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    letter_content: Optional[str] = None
    rejection_reason: Optional[str] = None
    sales_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    professor: Optional[ProfessorResponse] = None
    books: List[RequestBookResponse] = []
    sales_rep_name: Optional[str] = None
    approver_name: Optional[str] = None

    model_config = {"from_attributes": True}


class RequestListResponse(BaseModel):
    data: List[RequestResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
