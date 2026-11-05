from datetime import datetime, date as DateType, time as TimeType
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.assignment import AssignmentRoleEnum
from app.models.user import RoleEnum
from app.schemas.user import UserOut
from app.schemas.exam import ExamSessionOut


class ScheduleRunConfig(BaseModel):
    workload_balance_weight: int = 50   # 1-100: balance invigilation count across staff
    rest_interval_weight: int = 40      # 1-100: avoid back-to-back consecutive slots
    building_proximity_weight: int = 30 # 1-100: avoid staff running across separate buildings
    department_match_weight: int = 60   # 1-100: prefer examiners from same department
    honor_existing_locks: bool = True   # Preserve locked assignments


class ScheduleAssignmentOut(BaseModel):
    id: int
    schedule_run_id: int
    exam_session_id: int
    user_id: str
    role_in_exam: AssignmentRoleEnum
    is_locked: bool
    is_manual_override: bool
    override_notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ScheduleAssignmentDetail(ScheduleAssignmentOut):
    user: UserOut
    exam_session: ExamSessionOut


class ScheduleRunOut(BaseModel):
    id: int
    created_at: Optional[datetime] = None
    status: str
    algorithm_used: str
    solve_time_ms: float
    objective_value: float
    workload_balance_weight: int
    rest_interval_weight: int
    building_proximity_weight: int
    department_match_weight: int
    total_sessions_count: int
    total_assignments_count: int
    is_current_active: bool
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)



class ScheduleRunDetail(ScheduleRunOut):
    assignments: List[ScheduleAssignmentDetail] = []


class ManualOverrideRequest(BaseModel):
    assignment_id: int
    new_user_id: str
    notes: Optional[str] = "Manual reassignment by exam committee lead"


class CreateAssignmentRequest(BaseModel):
    exam_session_id: int
    user_id: str
    role_in_exam: Optional[AssignmentRoleEnum] = None
    is_locked: bool = True
    override_notes: Optional[str] = "Manual assignment by examination committee"


class ToggleLockRequest(BaseModel):
    assignment_id: int
    is_locked: bool


class MatrixSlotItem(BaseModel):
    session_id: int
    course_code: str
    course_name: str
    department: str
    venue_id: int
    venue_name: str
    venue_building: str
    venue_type: str
    student_headcount: int
    lead_professor: Optional[UserOut] = None
    tas: List[UserOut] = []
    is_fully_staffed: bool
    is_locked: bool


class MatrixScheduleView(BaseModel):
    dates: List[str]
    time_slots: List[str]
    venues: List[dict]
    cells: List[MatrixSlotItem]


class UserWorkloadStat(BaseModel):
    user_id: str
    full_name: str
    role: RoleEnum
    department: str
    assigned_shifts_count: int
    assigned_hours: float
    target_hours: float
    variance: float


class ScheduleAnalyticsOut(BaseModel):
    total_exam_sessions: int
    total_venues: int
    total_faculty: int
    total_tas: int
    total_assignments: int
    coverage_rate_percent: float
    fairness_index_percent: float
    average_shifts_per_ta: float
    average_shifts_per_prof: float
    workload_distribution: List[UserWorkloadStat]
    solver_status: str
    algorithm_used: str


class AssignedStaffOut(UserOut):
    assignment_id: Optional[int] = None


class VenueSessionSlot(BaseModel):
    session_id: int
    course_code: str
    course_name: str
    department: str
    date: DateType
    start_time: TimeType
    end_time: TimeType
    student_headcount: int
    required_professors: int
    required_tas: int
    lead_professor: Optional[AssignedStaffOut] = None
    tas: List[AssignedStaffOut] = []
    is_locked: bool = False


class VenueScheduleOut(BaseModel):
    venue_id: int
    venue_name: str
    building: str
    floor: int
    capacity: int
    venue_type: str
    total_sessions: int
    sessions: List[VenueSessionSlot]


class SubstituteCandidateOut(BaseModel):
    user_id: str
    staff_id: Optional[str] = None
    full_name: str
    email: str
    phone: Optional[str] = None
    department: Optional[str] = None
    role: str
    is_present_today: bool
    today_sessions_count: int
    today_schedule_summary: List[str] = []
    total_shifts_count: int
