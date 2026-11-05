import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum
from sqlalchemy.orm import relationship

from app.database import Base


class VenueTypeEnum(str, enum.Enum):
    HALL = "HALL"
    LAB = "LAB"


class Venue(Base):
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    venue_type = Column(Enum(VenueTypeEnum), nullable=False, default=VenueTypeEnum.HALL)
    building = Column(String(100), nullable=False)  # e.g., "Building A", "Building B"
    floor = Column(Integer, default=1, nullable=False)
    capacity = Column(Integer, nullable=False)  # Max student desks or lab workstations
    is_active = Column(Boolean, default=True, nullable=False)

    exam_sessions = relationship("ExamSession", back_populates="venue")
