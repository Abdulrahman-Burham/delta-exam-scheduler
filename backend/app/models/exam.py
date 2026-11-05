from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String(50), index=True, nullable=False)
    course_name = Column(String(150), nullable=False)
    department = Column(String(100), nullable=False)
    date = Column(Date, index=True, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    student_headcount = Column(Integer, nullable=False)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)
    required_professors = Column(Integer, default=1, nullable=False)
    required_tas = Column(Integer, default=1, nullable=False)
    status = Column(String(30), default="SCHEDULED", nullable=False)

    venue = relationship("Venue", back_populates="exam_sessions")
    assignments = relationship("ScheduleAssignment", back_populates="exam_session", cascade="all, delete-orphan")
