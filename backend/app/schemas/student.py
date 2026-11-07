from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, time, datetime


class StudentBase(BaseModel):
    student_code: str
    full_name: str
    department: str
    academic_year: str = "2026-2027"


class StudentOut(StudentBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SeatingStudentInfo(BaseModel):
    id: int
    student_code: str
    full_name: str
    department: str


class StudentSeatingOut(BaseModel):
    id: int
    student_id: int
    student: SeatingStudentInfo
    exam_session_id: Optional[int] = None
    venue_id: Optional[int] = None
    course_name: str
    department: Optional[str] = None
    venue_name: str
    exam_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    seat_number: Optional[int] = None
    attendance_status: str
    attended_at: Optional[datetime] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceUpdateItem(BaseModel):
    seating_id: int
    status: str  # PENDING, PRESENT, ABSENT
    notes: Optional[str] = None


class AttendanceBatchUpdateRequest(BaseModel):
    items: List[AttendanceUpdateItem]


class VenueRosterResponse(BaseModel):
    venue_name: str
    course_name: Optional[str] = None
    exam_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    total_students: int
    present_count: int
    absent_count: int
    pending_count: int
    students: List[StudentSeatingOut]


class StudentLookupSeating(BaseModel):
    seating_id: int
    course_name: str
    department: Optional[str] = None
    venue_name: str
    exam_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    seat_number: Optional[int] = None
    attendance_status: str
    lead_doctor: Optional[str] = None
    invigilator_tas: List[str] = []


class StudentLookupResponse(BaseModel):
    student_code: str
    full_name: str
    department: str
    academic_year: str
    total_exams: int
    seatings: List[StudentLookupSeating]
