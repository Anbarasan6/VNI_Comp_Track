from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.book import BookStatus


class BookCreate(BaseModel):
    book_code: Optional[str] = None
    title: str
    author_name: Optional[str] = None
    edition: Optional[str] = None
    status: BookStatus = BookStatus.ACTIVE


class BookUpdate(BaseModel):
    book_code: Optional[str] = None
    title: Optional[str] = None
    author_name: Optional[str] = None
    edition: Optional[str] = None
    status: Optional[BookStatus] = None


class BookResponse(BaseModel):
    id: int
    book_code: Optional[str] = None
    title: str
    author_name: Optional[str] = None
    edition: Optional[str] = None
    status: BookStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookListResponse(BaseModel):
    data: list[BookResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
