from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class BookStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    book_code = Column(String(100), unique=True, nullable=True, index=True)
    title = Column(String(500), nullable=False)
    author_name = Column(String(300), nullable=True)
    edition = Column(String(100), nullable=True)
    status = Column(Enum(BookStatus), nullable=False, default=BookStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    request_books = relationship("RequestBook", back_populates="book")
