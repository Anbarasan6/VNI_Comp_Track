from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class FacultyInfo(Base):
    __tablename__ = "faculty_info"

    id = Column(Integer, primary_key=True, index=True)
    professor_name = Column(String(200), nullable=False)
    college_name = Column(String(300), nullable=False)
    department = Column(String(200), nullable=True)
    subjects_handling = Column(Text, nullable=True)
    student_strength = Column(Integer, nullable=True)
    current_textbook = Column(String(300), nullable=True)
    current_publisher = Column(String(300), nullable=True)
    remarks = Column(Text, nullable=True)
    mobile = Column(String(20), unique=True, nullable=False, index=True)
    request_ref = Column(String(30), nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
