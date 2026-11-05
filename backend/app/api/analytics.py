import math
from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User, RoleEnum
from app.models.venue import Venue
from app.models.exam import ExamSession
from app.models.assignment import ScheduleRun, ScheduleAssignment, AssignmentRoleEnum
from app.schemas.schedule import ScheduleAnalyticsOut, UserWorkloadStat

router = APIRouter(prefix="/analytics", tags=["Scheduler Analytics & Insights"])


@router.get("/summary", response_model=ScheduleAnalyticsOut)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    users = db.query(User).filter(User.is_active == True).all()
    venues = db.query(Venue).filter(Venue.is_active == True).all()
    sessions = db.query(ExamSession).all()

    active_run = db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).first()
    assignments = []
    if active_run:
        assignments = db.query(ScheduleAssignment).filter(ScheduleAssignment.schedule_run_id == active_run.id).all()

    profs = [u for u in users if u.role == RoleEnum.PROFESSOR]
    tas = [u for u in users if u.role == RoleEnum.TA]

    # Calculate workload per user
    user_shift_counts: Dict[int, int] = {u.id: 0 for u in users}
    for a in assignments:
        user_shift_counts[a.user_id] = user_shift_counts.get(a.user_id, 0) + 1

    total_required = sum(s.required_professors + s.required_tas for s in sessions)
    coverage_rate = min(100.0, round((len(assignments) / max(1, total_required)) * 100.0, 1))

    ta_counts = [user_shift_counts.get(t.id, 0) for t in tas]
    prof_counts = [user_shift_counts.get(p.id, 0) for p in profs]

    avg_ta = sum(ta_counts) / max(1, len(tas))
    avg_prof = sum(prof_counts) / max(1, len(profs))

    # Fairness score for TAs
    if ta_counts and avg_ta > 0:
        var = sum((x - avg_ta) ** 2 for x in ta_counts) / len(ta_counts)
        std = math.sqrt(var)
        fairness = max(0.0, min(100.0, (1.0 - (std / (avg_ta + 1.0))) * 100.0))
    else:
        fairness = 100.0

    workload_distribution = []
    for u in users:
        shifts = user_shift_counts.get(u.id, 0)
        target = avg_ta if u.role == RoleEnum.TA else (avg_prof if u.role == RoleEnum.PROFESSOR else 0.0)
        workload_distribution.append(UserWorkloadStat(
            user_id=u.id,
            full_name=u.full_name,
            role=u.role,
            department=u.department,
            assigned_shifts_count=shifts,
            assigned_hours=round(shifts * 2.5, 1),
            target_hours=round(target * 2.5, 1),
            variance=round(shifts - target, 2)
        ))

    return ScheduleAnalyticsOut(
        total_exam_sessions=len(sessions),
        total_venues=len(venues),
        total_faculty=len(profs),
        total_tas=len(tas),
        total_assignments=len(assignments),
        coverage_rate_percent=coverage_rate,
        fairness_index_percent=round(fairness, 1),
        average_shifts_per_ta=round(avg_ta, 1),
        average_shifts_per_prof=round(avg_prof, 1),
        workload_distribution=sorted(workload_distribution, key=lambda x: (x.role, -x.assigned_shifts_count)),
        solver_status=active_run.status if active_run else "NOT_GENERATED",
        algorithm_used=active_run.algorithm_used if active_run else "N/A"
    )
