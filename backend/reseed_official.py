#!/usr/bin/env python3
"""
Official Delta University Faculty of Artificial Intelligence Database Reseeder
Populates the database with the EXACT official 5-page Mid-Term Exam Fall 2026-2027 timetable:
- 12 examination days (November 7 to November 19, 2026)
- 33 physical examination venues (Labs 1-12, PT, M1-M9, E1-E4, P1-P3, B1-B2, Ph1-Ph2)
- 64 faculty & TA staff members
- Solves initial optimal schedule with OR-Tools CP-SAT
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from app.database import Base, engine, SessionLocal
from app.services.seed_service import seed_database
from app.services.optimizer import InvigilationOptimizer
from app.schemas.schedule import ScheduleRunConfig
from app.models.user import User, RoleEnum
from app.models.exam import ExamSession
from app.models.venue import Venue
from app.models.assignment import ScheduleRun, ScheduleAssignment


def run_official_reseed():
    print("=" * 80)
    print("DELTA UNIVERSITY FACULTY OF ARTIFICIAL INTELLIGENCE — OFFICIAL RE-SEEDING")
    print("=" * 80)

    # Ensure tables match latest schema exactly
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("\n[1/3] Purging old records and seeding official PDF timetable & roster...")
        seed_database(db, force=True)

        users_count = db.query(User).count()
        venues_count = db.query(Venue).count()
        exams_count = db.query(ExamSession).count()
        print(f"  ✓ Users/Staff registered: {users_count}")
        print(f"  ✓ Examination Venues:     {venues_count}")
        print(f"  ✓ Room Exam Sessions:     {exams_count}")

        print("\n[2/3] Running Google OR-Tools CP-SAT Optimization Engine...")
        config = ScheduleRunConfig(
            workload_balance_weight=60,
            rest_interval_weight=45,
            building_proximity_weight=35,
            department_match_weight=55,
            honor_existing_locks=False,
        )

        all_users = db.query(User).filter(User.is_active == True).all()
        all_venues = db.query(Venue).filter(Venue.is_active == True).all()
        all_exams = db.query(ExamSession).filter(ExamSession.status == "SCHEDULED").all()
        all_constraints = []

        optimizer = InvigilationOptimizer(
            users=all_users,
            venues=all_venues,
            sessions=all_exams,
            constraints=all_constraints,
            existing_locked=[],
            config=config,
        )

        result = optimizer.solve()

        # Deactivate previous active runs
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

        print(f"\n[3/3] Solver Execution Completed Successfully!")
        print(f"  ✓ Solver Status:          {result.status}")
        print(f"  ✓ Total Staff Placements: {len(result.assignments)}")
        print(f"  ✓ Active Schedule Run ID: {new_run.id}")
        print("=" * 80)
        print("DATABASE SUCCESSFULLY POPULATED WITH OFFICIAL TIMETABLE!")
        print("=" * 80)

    finally:
        db.close()


if __name__ == "__main__":
    run_official_reseed()
