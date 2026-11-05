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


@router.post("/reseed")
def reseed_official_database(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Resets and populates the database with the official Delta University
    Faculty of Artificial Intelligence Fall 2026-2027 examination timetable.
    """
    from app.services.seed_service import seed_database
    from app.services.optimizer import InvigilationOptimizer
    from app.schemas.schedule import ScheduleRunConfig
    from app.models.assignment import ScheduleAssignment

    # 1. Reseed records
    seed_database(db, force=True)

    # 2. Run initial optimization solve
    all_users = db.query(User).filter(User.is_active == True).all()
    all_venues = db.query(Venue).filter(Venue.is_active == True).all()
    all_exams = db.query(ExamSession).filter(ExamSession.status == "SCHEDULED").all()

    config = ScheduleRunConfig(
        workload_balance_weight=60,
        rest_interval_weight=45,
        building_proximity_weight=35,
        department_match_weight=55,
        honor_existing_locks=False,
    )

    optimizer = InvigilationOptimizer(
        users=all_users,
        venues=all_venues,
        sessions=all_exams,
        constraints=[],
        existing_locked=[],
        config=config,
    )
    result = optimizer.solve()

    db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).update({"is_current_active": False})
    new_run = ScheduleRun(
        status=result.status,
        algorithm_used="OR-Tools CP-SAT (Google)" if result.status in ("OPTIMAL", "FEASIBLE") else "Resilient Heuristic Hybrid",
        solve_time_ms=result.solve_time_ms,
        objective_value=result.objective_value,
        workload_balance_weight=config.workload_balance_weight,
        rest_interval_weight=config.rest_interval_weight,
        building_proximity_weight=config.building_proximity_weight,
        department_match_weight=config.department_match_weight,
        total_sessions_count=len(all_exams),
        total_assignments_count=len(result.assignments),
        is_current_active=True,
        notes="; ".join(result.bottlenecks) if result.bottlenecks else "Official conflict-free schedule generated.",
    )
    db.add(new_run)
    db.flush()

    if result.assignments:
        assignment_records = [
            ScheduleAssignment(
                schedule_run_id=new_run.id,
                exam_session_id=a_data["exam_session_id"],
                user_id=a_data["user_id"],
                role_in_exam=a_data["role_in_exam"],
                is_locked=a_data.get("is_locked", False),
                is_manual_override=a_data.get("is_manual_override", False),
            )
            for a_data in result.assignments
        ]
        db.bulk_save_objects(assignment_records)

    db.commit()

    return {
        "status": "SUCCESS",
        "message": "Official Delta University timetable reseeded successfully",
        "total_users": len(all_users),
        "total_venues": len(all_venues),
        "total_exam_sessions": len(all_exams),
        "total_assignments": len(result.assignments),
        "schedule_run_id": new_run.id,
    }
