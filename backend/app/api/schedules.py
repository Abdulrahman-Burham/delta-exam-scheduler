import threading
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, get_current_user, require_role
from app.models.user import User, RoleEnum
from app.models.venue import Venue
from app.models.exam import ExamSession
from app.models.constraint import AvailabilityConstraint
from app.models.assignment import ScheduleRun, ScheduleAssignment, AssignmentRoleEnum
from app.schemas.schedule import (
    ScheduleRunConfig,
    ScheduleRunOut,
    ScheduleRunDetail,
    ScheduleAssignmentDetail,
    ManualOverrideRequest,
    ToggleLockRequest,
    MatrixScheduleView,
    MatrixSlotItem,
)
from app.schemas.user import UserOut
from app.services.optimizer import InvigilationOptimizer

router = APIRouter(prefix="/schedules", tags=["AI Scheduling Engine & Allocations"])

SOLVER_LOCK = threading.Lock()


@router.post("/generate", response_model=ScheduleRunDetail)
def generate_schedule(
    config: ScheduleRunConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    if not SOLVER_LOCK.acquire(blocking=False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A schedule generation optimization run is already in progress. Please wait for it to complete."
        )

    try:
        users = db.query(User).filter(User.is_active == True).all()
        venues = db.query(Venue).filter(Venue.is_active == True).all()
        sessions = db.query(ExamSession).all()
        constraints = db.query(AvailabilityConstraint).all()

        if not sessions:
            raise HTTPException(status_code=400, detail="No exam sessions found. Please define sessions first.")
        if not users:
            raise HTTPException(status_code=400, detail="No active faculty or TA staff members found.")

        # Fetch currently active locked assignments if preserving
        existing_locked = []
        if config.honor_existing_locks:
            active_run = db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).first()
            if active_run:
                existing_locked = db.query(ScheduleAssignment).filter(
                    ScheduleAssignment.schedule_run_id == active_run.id,
                    ScheduleAssignment.is_locked == True
                ).all()

        optimizer = InvigilationOptimizer(
            users=users,
            venues=venues,
            sessions=sessions,
            constraints=constraints,
            existing_locked=existing_locked,
            config=config,
        )
        result = optimizer.solve()

        # Deactivate previous active runs
        db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).update({"is_current_active": False})

        # Record new schedule run
        new_run = ScheduleRun(
            status=result.status,
            algorithm_used="OR-Tools CP-SAT (Google)" if result.status in ("OPTIMAL", "FEASIBLE") else "Resilient Heuristic Hybrid",
            solve_time_ms=result.solve_time_ms,
            objective_value=result.objective_value,
            workload_balance_weight=config.workload_balance_weight,
            rest_interval_weight=config.rest_interval_weight,
            building_proximity_weight=config.building_proximity_weight,
            department_match_weight=config.department_match_weight,
            total_sessions_count=len(sessions),
            total_assignments_count=len(result.assignments),
            is_current_active=True,
            notes="; ".join(result.bottlenecks) if result.bottlenecks else "Optimal conflict-free schedule generated.",
        )
        db.add(new_run)
        db.flush()

        # High-performance bulk persist assignments
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

        # Reload full run with relationships
        return get_current_schedule(db=db, current_user=current_user)
    finally:
        SOLVER_LOCK.release()


@router.get("/current", response_model=ScheduleRunDetail)
def get_current_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    active_run = db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).order_by(ScheduleRun.id.desc()).first()
    if not active_run:
        # If no run exists, return an empty run structure
        return ScheduleRunDetail(
            id=0,
            created_at=None,
            status="NOT_GENERATED",
            algorithm_used="None",
            solve_time_ms=0.0,
            objective_value=0.0,
            workload_balance_weight=50,
            rest_interval_weight=40,
            building_proximity_weight=30,
            department_match_weight=60,
            total_sessions_count=0,
            total_assignments_count=0,
            is_current_active=False,
            notes="Schedule has not been generated yet. Click 'Run Schedule Generation'.",
            assignments=[]
        )

    assignments = (
        db.query(ScheduleAssignment)
        .join(ScheduleAssignment.exam_session)
        .filter(ScheduleAssignment.schedule_run_id == active_run.id)
        .options(
            joinedload(ScheduleAssignment.user),
            joinedload(ScheduleAssignment.exam_session).joinedload(ExamSession.venue)
        )
        .order_by(ExamSession.date.asc(), ExamSession.start_time.asc())
        .all()
    )

    return ScheduleRunDetail(
        id=active_run.id,
        created_at=active_run.created_at,
        status=active_run.status,
        algorithm_used=active_run.algorithm_used,
        solve_time_ms=active_run.solve_time_ms,
        objective_value=active_run.objective_value,
        workload_balance_weight=active_run.workload_balance_weight,
        rest_interval_weight=active_run.rest_interval_weight,
        building_proximity_weight=active_run.building_proximity_weight,
        department_match_weight=active_run.department_match_weight,
        total_sessions_count=active_run.total_sessions_count,
        total_assignments_count=active_run.total_assignments_count,
        is_current_active=active_run.is_current_active,
        notes=active_run.notes,
        assignments=[ScheduleAssignmentDetail.model_validate(a) for a in assignments]
    )


@router.get("/matrix", response_model=MatrixScheduleView)
def get_matrix_view(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    active_run = db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).first()
    sessions = db.query(ExamSession).options(joinedload(ExamSession.venue)).order_by(ExamSession.date, ExamSession.start_time).all()
    venues = db.query(Venue).filter(Venue.is_active == True).all()

    assignments_map: Dict[int, List[ScheduleAssignment]] = {}
    if active_run:
        assignments = db.query(ScheduleAssignment).filter(
            ScheduleAssignment.schedule_run_id == active_run.id
        ).options(joinedload(ScheduleAssignment.user)).all()
        for a in assignments:
            assignments_map.setdefault(a.exam_session_id, []).append(a)

    dates = sorted(list({s.date.strftime("%Y-%m-%d") for s in sessions}))
    time_slots = sorted(list({f"{s.start_time.strftime('%H:%M')} - {s.end_time.strftime('%H:%M')}" for s in sessions}))

    cells: List[MatrixSlotItem] = []
    for s in sessions:
        v = s.venue
        session_assigns = assignments_map.get(s.id, [])
        lead_prof = next((a.user for a in session_assigns if a.role_in_exam == AssignmentRoleEnum.LEAD_PROFESSOR), None)
        tas = [a.user for a in session_assigns if a.role_in_exam == AssignmentRoleEnum.INVIGILATOR_TA]
        is_locked = any(a.is_locked for a in session_assigns)

        cells.append(MatrixSlotItem(
            session_id=s.id,
            course_code=s.course_code,
            course_name=s.course_name,
            department=s.department,
            venue_id=v.id if v else 0,
            venue_name=v.name if v else "TBD",
            venue_building=v.building if v else "TBD",
            venue_type=v.venue_type.value if v else "HALL",
            student_headcount=s.student_headcount,
            lead_professor=UserOut.model_validate(lead_prof) if lead_prof else None,
            tas=[UserOut.model_validate(t) for t in tas],
            is_fully_staffed=(lead_prof is not None and len(tas) >= s.required_tas),
            is_locked=is_locked
        ))

    venues_list = [
        {"id": v.id, "name": v.name, "building": v.building, "type": v.venue_type.value, "capacity": v.capacity}
        for v in venues
    ]

    return MatrixScheduleView(
        dates=dates,
        time_slots=time_slots,
        venues=venues_list,
        cells=cells
    )


@router.post("/override", response_model=ScheduleAssignmentDetail)
def manual_override_assignment(
    req: ManualOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    """Allows Admin to manually swap or reassign an invigilator with live conflict checks."""
    assignment = db.query(ScheduleAssignment).filter(ScheduleAssignment.id == req.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment record not found")

    new_user = db.query(User).filter(User.id == req.new_user_id).first()
    if not new_user:
        raise HTTPException(status_code=404, detail="Target replacement user not found")

    session = db.query(ExamSession).filter(ExamSession.id == assignment.exam_session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")

    # Conflict check: Check if new_user already has an overlapping session in this run
    overlapping_assignment = db.query(ScheduleAssignment).join(ExamSession).filter(
        ScheduleAssignment.schedule_run_id == assignment.schedule_run_id,
        ScheduleAssignment.user_id == new_user.id,
        ExamSession.date == session.date,
        ExamSession.id != session.id
    ).first()

    if overlapping_assignment:
        # Check time overlap
        other_sess = overlapping_assignment.exam_session
        if max(session.start_time, other_sess.start_time) < min(session.end_time, other_sess.end_time):
            raise HTTPException(
                status_code=400,
                detail=f"Conflict Alert: {new_user.full_name} is already assigned to {other_sess.course_code} at {other_sess.start_time}-{other_sess.end_time}!"
            )

    # Check blackout constraints
    constraint = db.query(AvailabilityConstraint).filter(
        AvailabilityConstraint.user_id == new_user.id,
        AvailabilityConstraint.date == session.date,
        AvailabilityConstraint.constraint_type == "UNAVAILABLE"
    ).first()
    if constraint:
        if constraint.start_time is None or max(session.start_time, constraint.start_time) < min(session.end_time, constraint.end_time):
            raise HTTPException(
                status_code=400,
                detail=f"Availability Conflict: {new_user.full_name} has marked this slot as UNAVAILABLE ({constraint.reason or 'Leave'})."
            )

    # Apply override
    assignment.user_id = new_user.id
    assignment.is_manual_override = True
    assignment.is_locked = True  # Automatically lock overridden assignments
    assignment.override_notes = req.notes or "Manually reallocated by Admin"

    db.commit()
    db.refresh(assignment)

    # Return refreshed assignment with joins
    reloaded = db.query(ScheduleAssignment).options(
        joinedload(ScheduleAssignment.user),
        joinedload(ScheduleAssignment.exam_session).joinedload(ExamSession.venue)
    ).filter(ScheduleAssignment.id == assignment.id).first()

    return ScheduleAssignmentDetail.model_validate(reloaded)


@router.post("/lock")
def toggle_lock(
    req: ToggleLockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    assignment = db.query(ScheduleAssignment).filter(ScheduleAssignment.id == req.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.is_locked = req.is_locked
    db.commit()
    return {"status": "SUCCESS", "assignment_id": assignment.id, "is_locked": assignment.is_locked}


@router.post("/lock-all")
def lock_all_current(
    lock: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    active_run = db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).first()
    if not active_run:
        raise HTTPException(status_code=404, detail="No active schedule run found")

    db.query(ScheduleAssignment).filter(
        ScheduleAssignment.schedule_run_id == active_run.id
    ).update({"is_locked": lock})
    db.commit()
    return {"status": "SUCCESS", "is_locked": lock}


@router.get("/user/{user_id}", response_model=List[ScheduleAssignmentDetail])
def get_user_schedule(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the finalized schedule assignments for a specific Professor or TA."""
    # Ensure role privacy: non-admins can only view their own schedule
    if current_user.role != RoleEnum.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to view other users' schedules")

    active_run = db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).first()
    if not active_run:
        return []

    assignments = (
        db.query(ScheduleAssignment)
        .join(ScheduleAssignment.exam_session)
        .filter(
            ScheduleAssignment.schedule_run_id == active_run.id,
            ScheduleAssignment.user_id == user_id
        )
        .options(
            joinedload(ScheduleAssignment.user),
            joinedload(ScheduleAssignment.exam_session).joinedload(ExamSession.venue)
        )
        .order_by(ExamSession.date.asc(), ExamSession.start_time.asc())
        .all()
    )

    return [ScheduleAssignmentDetail.model_validate(a) for a in assignments]
