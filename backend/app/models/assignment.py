from datetime import datetime
import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship

from app.database import Base


class AssignmentRoleEnum(str, enum.Enum):
    LEAD_PROFESSOR = "LEAD_PROFESSOR"
    INVIGILATOR_TA = "INVIGILATOR_TA"


class ScheduleRun(Base):
    __tablename__ = "schedule_runs"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(50), default="SUCCESS", nullable=False)  # SUCCESS, INFEASIBLE, FAILED
    algorithm_used = Column(String(100), default="OR-Tools CP-SAT", nullable=False)
    solve_time_ms = Column(Float, default=0.0, nullable=False)
    objective_value = Column(Float, default=0.0, nullable=False)
    
    # Optimization Weights Used
    workload_balance_weight = Column(Integer, default=50, nullable=False)
    rest_interval_weight = Column(Integer, default=40, nullable=False)
    building_proximity_weight = Column(Integer, default=30, nullable=False)
    department_match_weight = Column(Integer, default=60, nullable=False)

    total_sessions_count = Column(Integer, default=0, nullable=False)
    total_assignments_count = Column(Integer, default=0, nullable=False)
    is_current_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)

    assignments = relationship("ScheduleAssignment", back_populates="schedule_run", cascade="all, delete-orphan")


class ScheduleAssignment(Base):
    __tablename__ = "schedule_assignments"

    id = Column(Integer, primary_key=True, index=True)
    schedule_run_id = Column(Integer, ForeignKey("schedule_runs.id"), nullable=False)
    exam_session_id = Column(Integer, ForeignKey("exam_sessions.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role_in_exam = Column(Enum(AssignmentRoleEnum), nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    is_manual_override = Column(Boolean, default=False, nullable=False)
    override_notes = Column(String(255), nullable=True)

    schedule_run = relationship("ScheduleRun", back_populates="assignments")
    exam_session = relationship("ExamSession", back_populates="assignments")
    user = relationship("User", back_populates="assignments")
