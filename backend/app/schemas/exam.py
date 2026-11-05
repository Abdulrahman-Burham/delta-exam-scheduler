from datetime import date as DateType, time as TimeType
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.venue import VenueOut


class ExamSessionBase(BaseModel):
    course_code: str
    course_name: str
    department: str
    date: DateType
    start_time: TimeType
    end_time: TimeType
    student_headcount: int
    venue_id: int
    required_professors: int = 1
    required_tas: int = 1
    status: str = "SCHEDULED"


class ExamSessionCreate(ExamSessionBase):
    pass


class ExamSessionUpdate(BaseModel):
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    department: Optional[str] = None
    date: Optional[DateType] = None
    start_time: Optional[TimeType] = None
    end_time: Optional[TimeType] = None
    student_headcount: Optional[int] = None
    venue_id: Optional[int] = None
    required_professors: Optional[int] = None
    required_tas: Optional[int] = None
    status: Optional[str] = None


class ExamSessionOut(ExamSessionBase):
    id: int
    venue: Optional[VenueOut] = None
    model_config = ConfigDict(from_attributes=True)

