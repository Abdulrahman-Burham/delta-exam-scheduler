import enum
from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, Enum
from sqlalchemy.orm import relationship

from app.database import Base


class ConstraintTypeEnum(str, enum.Enum):
    UNAVAILABLE = "UNAVAILABLE"         # Hard blackout (e.g. sick leave, travel, exam committee duty elsewhere)
    PREFERENCE_AVOID = "PREFERENCE_AVOID"  # Soft constraint (prefer not to be scheduled)
    PREFERENCE_PREFER = "PREFERENCE_PREFER"  # Soft constraint (preferred slot)


class AvailabilityConstraint(Base):
    __tablename__ = "availability_constraints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)  # If NULL, full day blackout
    end_time = Column(Time, nullable=True)
    constraint_type = Column(Enum(ConstraintTypeEnum), default=ConstraintTypeEnum.UNAVAILABLE, nullable=False)
    reason = Column(String(255), nullable=True)

    user = relationship("User", back_populates="constraints")
