import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship

from app.database import Base


class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    DOCTOR = "DOCTOR"
    TA = "TA"
    PROFESSOR = "DOCTOR"  # Backward compatibility alias for existing code


class User(Base):
    __tablename__ = "users"

    # UUIDv4 primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    staff_id = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.TA)
    department = Column(String(100), nullable=False)
    title = Column(String(100), nullable=True)  # e.g., "Dean", "Vice Dean", "Professor", "Teaching Assistant"
    phone = Column(String(30), nullable=True)
    is_master_student = Column(Boolean, default=False, nullable=False)  # Enrolled in Master's (gets 2 days off)
    max_daily_shifts = Column(Integer, default=2, nullable=False)
    max_total_shifts = Column(Integer, default=6, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    constraints = relationship("AvailabilityConstraint", back_populates="user", cascade="all, delete-orphan")
    assignments = relationship("ScheduleAssignment", back_populates="user", cascade="all, delete-orphan")
