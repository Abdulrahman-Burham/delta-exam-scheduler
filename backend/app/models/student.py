from sqlalchemy import Column, Integer, String, Date, Time, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import enum
from datetime import datetime

from app.database import Base


class AttendanceStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_code = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    department = Column(String(100), nullable=False)
    academic_year = Column(String(50), default="2026-2027", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    seatings = relationship("StudentSeating", back_populates="student", cascade="all, delete-orphan")


class StudentSeating(Base):
    __tablename__ = "student_seatings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id", ondelete="SET NULL"), nullable=True, index=True)

    course_name = Column(String(150), nullable=False, index=True)
    department = Column(String(100), nullable=True)
    venue_name = Column(String(100), nullable=False, index=True)
    exam_date = Column(Date, nullable=True, index=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    seat_number = Column(Integer, nullable=True)

    attendance_status = Column(String(20), default="PENDING", nullable=False)
    attended_at = Column(DateTime, nullable=True)
    marked_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(String(255), nullable=True)

    student = relationship("Student", back_populates="seatings")
    exam_session = relationship("ExamSession")
    venue = relationship("Venue")
    marked_by = relationship("User")
