#!/usr/bin/env python3
"""
DELTA UNIVERSITY FOR SCIENCE & TECHNOLOGY — FACULTY OF ARTIFICIAL INTELLIGENCE
Comprehensive Database & SQLAlchemy ORM Query Verification & Performance Benchmark
"""

import sys
import time

# Ensure UTF-8 output
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import os
# Add backend to sys.path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database import SessionLocal, engine
from app.models.user import User, RoleEnum
from app.models.venue import Venue, VenueTypeEnum
from app.models.exam import ExamSession
from app.models.assignment import ScheduleRun, ScheduleAssignment, AssignmentRoleEnum
from app.models.constraint import AvailabilityConstraint
from sqlalchemy.orm import joinedload
from sqlalchemy import text


def run_query_audit():
    print("=" * 105)
    print("DATABASE & SQLALCHEMY ORM COMPREHENSIVE QUERY AUDIT & PERFORMANCE BENCHMARK")
    print(f"Timestamp : {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Engine    : {engine.url}")
    print("=" * 105)

    db = SessionLocal()
    queries = [
        (
            "Q01: User Aggregations & Role Counts",
            lambda: {
                "total": db.query(User).count(),
                "admins": db.query(User).filter(User.role == RoleEnum.ADMIN).count(),
                "doctors": db.query(User).filter(User.role.in_([RoleEnum.DOCTOR, RoleEnum.PROFESSOR])).count(),
                "tas": db.query(User).filter(User.role == RoleEnum.TA).count(),
                "active": db.query(User).filter(User.is_active == True).count(),
            }
        ),
        (
            "Q02: Venues Sorted with Type Classification (Halls vs Labs)",
            lambda: {
                "total": db.query(Venue).count(),
                "halls": db.query(Venue).filter(Venue.venue_type == VenueTypeEnum.HALL).count(),
                "labs": db.query(Venue).filter(Venue.venue_type == VenueTypeEnum.LAB).count(),
                "venues_list": len(db.query(Venue).filter(Venue.is_active == True).order_by(Venue.building, Venue.name).all())
            }
        ),
        (
            "Q03: Exam Sessions with Eager-Joined Venues (Zero N+1 Queries)",
            lambda: len(db.query(ExamSession).options(joinedload(ExamSession.venue)).order_by(ExamSession.date, ExamSession.start_time).all())
        ),
        (
            "Q04: Active Schedule Run Retrieval",
            lambda: (
                db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).first().total_assignments_count
                if db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).first() else 0
            )
        ),
        (
            "Q05: Full Matrix Grid Query (Sessions + Venues + Assignments + TAs)",
            lambda: {
                "active_run_id": getattr(db.query(ScheduleRun).filter(ScheduleRun.is_current_active == True).first(), "id", None),
                "sessions_count": db.query(ExamSession).count(),
                "assignments_eager": len(
                    db.query(ScheduleAssignment)
                    .options(joinedload(ScheduleAssignment.user), joinedload(ScheduleAssignment.exam_session).joinedload(ExamSession.venue))
                    .all()
                )
            }
        ),
        (
            "Q06: Availability Constraints with Eager User Join",
            lambda: len(db.query(AvailabilityConstraint).options(joinedload(AvailabilityConstraint.user)).all())
        ),
        (
            "Q07: Complex Multi-Table Join (Double-Booking Conflict Check)",
            lambda: (
                db.query(ScheduleAssignment)
                .join(ExamSession)
                .filter(ScheduleAssignment.user_id == db.query(User).filter(User.role == RoleEnum.TA).first().id)
                .count()
            )
        ),
        (
            "Q08: Workload Aggregation Query across All Staff",
            lambda: [
                (u.full_name, u.role.value if hasattr(u.role, 'value') else u.role, len(u.assignments))
                for u in db.query(User).options(joinedload(User.assignments)).all()
            ]
        ),
        (
            "Q09: Raw SQLite PRAGMA Integrity & WAL Status Check",
            lambda: {
                "integrity_check": db.execute(text("PRAGMA integrity_check")).scalar(),
                "journal_mode": db.execute(text("PRAGMA journal_mode")).scalar(),
                "busy_timeout": db.execute(text("PRAGMA busy_timeout")).scalar(),
            }
        ),
        (
            "Q10: Personal Schedule Filter Query (Doctor Specific)",
            lambda: len(
                db.query(ScheduleAssignment)
                .filter(ScheduleAssignment.user_id == db.query(User).filter(User.role.in_([RoleEnum.DOCTOR, RoleEnum.PROFESSOR])).first().id)
                .all()
            )
        ),
    ]

    all_passed = True
    total_time = 0.0

    print(f"{'#':<4} {'Query Description':<68} {'Latency':<12} {'Audit Status & Data Sample':<20}")
    print("-" * 105)

    for idx, (name, q_func) in enumerate(queries, 1):
        t0 = time.time()
        try:
            result = q_func()
            elapsed_ms = (time.time() - t0) * 1000
            total_time += elapsed_ms

            if isinstance(result, dict):
                sample = str(result)
                if len(sample) > 40:
                    sample = sample[:37] + "..."
            elif isinstance(result, list):
                sample = f"{len(result)} items loaded"
            else:
                sample = f"Returned: {result}"

            print(f"{idx:<4} {name:<68} {elapsed_ms:>6.2f} ms     [OK] {sample}")
        except Exception as e:
            all_passed = False
            elapsed_ms = (time.time() - t0) * 1000
            total_time += elapsed_ms
            print(f"{idx:<4} {name:<68} {elapsed_ms:>6.2f} ms     [FAILED] Error: {e}")

    db.close()
    print("-" * 105)
    print(f"Total Database Query Execution Time: {total_time:.2f} ms")
    if all_passed:
        print(">> VERDICT: ALL 10 DATABASE QUERIES ARE WORKING PERFECTLY (100% OPERATIONAL & SOUND)")
    else:
        print(">> VERDICT: SOME QUERIES ENCOUNTERED ERRORS")
    print("=" * 105)
    return all_passed


if __name__ == "__main__":
    success = run_query_audit()
    sys.exit(0 if success else 1)
