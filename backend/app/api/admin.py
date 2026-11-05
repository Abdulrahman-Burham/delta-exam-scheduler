"""
Administrative RBAC Router (/api/admin/*)
Strictly accessible to RoleEnum.ADMIN
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.exam import ExamSession
from app.models.venue import Venue
from app.models.assignment import ScheduleRun
from app.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["Administration"], dependencies=[Depends(require_admin)])


@router.get("/system-stats")
def get_system_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Administrative overview of security posture, user roles, venues, and exam sessions.
    Strictly protected for ADMIN role.
    """
    total_users = db.query(User).count()
    admins_count = db.query(User).filter(User.role == RoleEnum.ADMIN).count()
    doctors_count = db.query(User).filter(User.role.in_([RoleEnum.DOCTOR, RoleEnum.PROFESSOR])).count()
    tas_count = db.query(User).filter(User.role == RoleEnum.TA).count()
    active_users = db.query(User).filter(User.is_active == True).count()

    total_sessions = db.query(ExamSession).count()
    total_venues = db.query(Venue).count()
    active_run = db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).first()

    return {
        "status": "HEALTHY",
        "authorized_admin": admin_user.email,
        "users": {
            "total": total_users,
            "admins": admins_count,
            "doctors": doctors_count,
            "teaching_assistants": tas_count,
            "active": active_users,
            "deactivated": total_users - active_users,
        },
        "inventory": {
            "total_venues": total_venues,
            "total_exam_sessions": total_sessions,
        },
        "active_schedule_run_id": active_run.id if active_run else None,
        "security_controls": {
            "rate_limiting": "SlowAPI enabled (5/min login)",
            "auth_scheme": "HttpOnly SameSite=Lax JWT",
            "password_algorithm": "bcrypt (rounds=12)",
        }
    }
