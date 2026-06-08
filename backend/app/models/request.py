from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Enum, Text,
    UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class DeliveryType(str, enum.Enum):
    HAND_DELIVERY = "HAND_DELIVERY"
    OFFICE_DISPATCH = "OFFICE_DISPATCH"


class AddressType(str, enum.Enum):
    COLLEGE = "COLLEGE"
    RESIDENTIAL = "RESIDENTIAL"


class RequestStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    DISPATCHED = "DISPATCHED"
    DELIVERED = "DELIVERED"
    REJECTED = "REJECTED"


class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    request_no = Column(String(30), unique=True, nullable=False, index=True)
    professor_id = Column(Integer, ForeignKey("professors.id"), nullable=False)
    delivery_type = Column(Enum(DeliveryType), nullable=False)
    address_type = Column(Enum(AddressType), nullable=False, default=AddressType.COLLEGE)
    remarks = Column(Text, nullable=True)
    status = Column(Enum(RequestStatus), nullable=False, default=RequestStatus.REQUESTED)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    dispatch_date = Column(DateTime(timezone=True), nullable=True)
    delivery_date = Column(DateTime(timezone=True), nullable=True)
    letter_content = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    sales_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    professor = relationship("Professor", back_populates="requests")
    creator = relationship("User", back_populates="created_requests", foreign_keys=[created_by])
    approver = relationship("User", back_populates="approved_requests", foreign_keys=[approved_by])
    books = relationship("RequestBook", back_populates="request", cascade="all, delete-orphan")


class RequestBook(Base):
    __tablename__ = "request_books"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    copies = Column(Integer, nullable=False, default=1)

    __table_args__ = (
        UniqueConstraint("request_id", "book_id", name="uq_request_book"),
        CheckConstraint("copies >= 1", name="ck_copies_positive"),
    )

    # Relationships
    request = relationship("Request", back_populates="books")
    book = relationship("Book", back_populates="request_books")
