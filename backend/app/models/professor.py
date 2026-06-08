from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class TitleEnum(str, enum.Enum):
    Mr = "Mr"
    Mrs = "Mrs"
    Dr = "Dr"
    Prof = "Prof"
    Ms = "Ms"


class Professor(Base):
    __tablename__ = "professors"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Enum(TitleEnum), nullable=False)
    initial = Column(String(20), nullable=True)
    name = Column(String(200), nullable=False)
    designation = Column(String(200), nullable=True)
    department = Column(String(200), nullable=True)
    university = Column(String(300), nullable=True)
    college_name = Column(String(300), nullable=False)
    address_line_1 = Column(String(300), nullable=True)
    address_line_2 = Column(String(300), nullable=True)
    city = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    mobile = Column(String(20), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=True)
    sales_person_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    sales_person = relationship("User", back_populates="professors", foreign_keys=[sales_person_id])
    requests = relationship("Request", back_populates="professor")
