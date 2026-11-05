import pytest
from datetime import date, time
from app.models.user import User, RoleEnum
from app.models.venue import Venue, VenueTypeEnum
from app.models.exam import ExamSession
from app.models.constraint import AvailabilityConstraint, ConstraintTypeEnum
from app.models.assignment import AssignmentRoleEnum
from app.schemas.schedule import ScheduleRunConfig
from app.services.optimizer import InvigilationOptimizer


def test_optimizer_basic_hard_constraints():
    # 2 Professors, 4 TAs
    prof1 = User(id=1, staff_id="P1", email="p1@f.edu", hashed_password="x", full_name="Prof A", role=RoleEnum.PROFESSOR, department="CS", max_daily_shifts=2, max_total_shifts=5, is_active=True)
    prof2 = User(id=2, staff_id="P2", email="p2@f.edu", hashed_password="x", full_name="Prof B", role=RoleEnum.PROFESSOR, department="AI", max_daily_shifts=2, max_total_shifts=5, is_active=True)

    ta1 = User(id=3, staff_id="T1", email="t1@f.edu", hashed_password="x", full_name="TA 1", role=RoleEnum.TA, department="CS", max_daily_shifts=2, max_total_shifts=6, is_active=True)
    ta2 = User(id=4, staff_id="T2", email="t2@f.edu", hashed_password="x", full_name="TA 2", role=RoleEnum.TA, department="AI", max_daily_shifts=2, max_total_shifts=6, is_active=True)
    ta3 = User(id=5, staff_id="T3", email="t3@f.edu", hashed_password="x", full_name="TA 3", role=RoleEnum.TA, department="CS", max_daily_shifts=2, max_total_shifts=6, is_active=True)
    ta4 = User(id=6, staff_id="T4", email="t4@f.edu", hashed_password="x", full_name="TA 4", role=RoleEnum.TA, department="AI", max_daily_shifts=2, max_total_shifts=6, is_active=True)
    ta5 = User(id=7, staff_id="T5", email="t5@f.edu", hashed_password="x", full_name="TA 5", role=RoleEnum.TA, department="IS", max_daily_shifts=2, max_total_shifts=6, is_active=True)

    users = [prof1, prof2, ta1, ta2, ta3, ta4, ta5]

    v1 = Venue(id=1, name="Hall 1", venue_type=VenueTypeEnum.HALL, building="Bldg A", floor=1, capacity=100)
    v2 = Venue(id=2, name="Hall 2", venue_type=VenueTypeEnum.HALL, building="Bldg A", floor=2, capacity=100)
    venues = [v1, v2]

    # Two concurrent sessions at 09:00 - 11:00 on 2026-06-15
    s1 = ExamSession(id=101, course_code="CS101", course_name="Intro CS", department="CS", date=date(2026, 6, 15), start_time=time(9, 0), end_time=time(11, 0), student_headcount=50, venue_id=1, required_professors=1, required_tas=2)
    s2 = ExamSession(id=102, course_code="AI101", course_name="Intro AI", department="AI", date=date(2026, 6, 15), start_time=time(9, 0), end_time=time(11, 0), student_headcount=50, venue_id=2, required_professors=1, required_tas=2)
    sessions = [s1, s2]

    # Blackout constraint: ta1 is unavailable
    c1 = AvailabilityConstraint(id=1, user_id=ta1.id, date=date(2026, 6, 15), start_time=time(9, 0), end_time=time(11, 0), constraint_type=ConstraintTypeEnum.UNAVAILABLE, reason="Medical")
    constraints = [c1]

    config = ScheduleRunConfig(
        workload_balance_weight=50,
        rest_interval_weight=30,
        building_proximity_weight=30,
        department_match_weight=40
    )

    optimizer = InvigilationOptimizer(users, venues, sessions, constraints, [], config)
    res = optimizer.solve()

    assert res.status in ("OPTIMAL", "FEASIBLE")
    assert len(res.assignments) == 6  # 2 profs + 4 TAs total

    # Verify ta1 was NOT assigned due to blackout constraint
    ta1_assignments = [a for a in res.assignments if a["user_id"] == ta1.id]
    assert len(ta1_assignments) == 0, "Unavailable TA was assigned despite blackout constraint!"

    # Verify each session has 1 prof and 2 tas
    s1_profs = [a for a in res.assignments if a["exam_session_id"] == 101 and a["role_in_exam"] == AssignmentRoleEnum.LEAD_PROFESSOR]
    s1_tas = [a for a in res.assignments if a["exam_session_id"] == 101 and a["role_in_exam"] == AssignmentRoleEnum.INVIGILATOR_TA]
    assert len(s1_profs) == 1
    assert len(s1_tas) == 2

    # Verify zero double bookings: no user assigned to both s1 and s2 concurrently
    user_session_map = {}
    for a in res.assignments:
        uid = a["user_id"]
        user_session_map.setdefault(uid, []).append(a["exam_session_id"])
    for uid, sess_ids in user_session_map.items():
        assert len(sess_ids) == 1, f"User {uid} was double booked across concurrent sessions!"


def test_optimizer_workload_balance():
    # 1 Prof, 4 TAs, 4 sequential sessions across 2 days
    prof = User(id=1, staff_id="P1", email="p1@f.edu", hashed_password="x", full_name="Prof Single", role=RoleEnum.PROFESSOR, department="CS", max_daily_shifts=3, max_total_shifts=10, is_active=True)
    tas = [
        User(id=10 + i, staff_id=f"T{i}", email=f"t{i}@f.edu", hashed_password="x", full_name=f"TA {i}", role=RoleEnum.TA, department="CS", max_daily_shifts=2, max_total_shifts=5, is_active=True)
        for i in range(4)
    ]
    users = [prof] + tas

    v = Venue(id=1, name="Hall A", venue_type=VenueTypeEnum.HALL, building="Bldg 1", floor=1, capacity=60)

    # 4 sessions, each requiring 1 TA (total 4 TA shifts across 4 TAs -> each TA should ideally get 1 shift)
    sessions = [
        ExamSession(id=201, course_code="C1", course_name="C1", department="CS", date=date(2026, 6, 15), start_time=time(9, 0), end_time=time(11, 0), student_headcount=25, venue_id=1, required_professors=1, required_tas=1),
        ExamSession(id=202, course_code="C2", course_name="C2", department="CS", date=date(2026, 6, 15), start_time=time(13, 0), end_time=time(15, 0), student_headcount=25, venue_id=1, required_professors=1, required_tas=1),
        ExamSession(id=203, course_code="C3", course_name="C3", department="CS", date=date(2026, 6, 16), start_time=time(9, 0), end_time=time(11, 0), student_headcount=25, venue_id=1, required_professors=1, required_tas=1),
        ExamSession(id=204, course_code="C4", course_name="C4", department="CS", date=date(2026, 6, 16), start_time=time(13, 0), end_time=time(15, 0), student_headcount=25, venue_id=1, required_professors=1, required_tas=1),
    ]

    optimizer = InvigilationOptimizer(users, [v], sessions, [], [], ScheduleRunConfig(workload_balance_weight=100))
    res = optimizer.solve()

    assert res.status in ("OPTIMAL", "FEASIBLE")
    
    # Each TA should have exactly 1 shift
    ta_counts = {}
    for a in res.assignments:
        if a["role_in_exam"] == AssignmentRoleEnum.INVIGILATOR_TA:
            ta_counts[a["user_id"]] = ta_counts.get(a["user_id"], 0) + 1
    
    for t in tas:
        assert ta_counts.get(t.id, 0) == 1, f"TA {t.id} did not get balanced 1 shift!"


def test_optimizer_infeasible_inputs_graceful_handling():
    """Verify solver handles gross staff deficit without crashing or unhandled exceptions."""
    # Only 1 TA and 1 Professor available
    prof = User(id="p-single", staff_id="P1", email="p1@f.edu", hashed_password="x", full_name="Solo Prof", role=RoleEnum.PROFESSOR, department="AI", is_active=True)
    ta = User(id="ta-single", staff_id="T1", email="t1@f.edu", hashed_password="x", full_name="Solo TA", role=RoleEnum.TA, department="AI", is_active=True)
    users = [prof, ta]

    v1 = Venue(id=1, name="Hall 101", venue_type=VenueTypeEnum.HALL, building="Bldg 1", floor=1, capacity=50)
    v2 = Venue(id=2, name="Hall 102", venue_type=VenueTypeEnum.HALL, building="Bldg 1", floor=1, capacity=50)

    # 4 concurrent sessions at the EXACT same time, requiring 8 TAs and 4 profs total
    sessions = [
        ExamSession(id=301 + i, course_code=f"CRS-{i}", course_name=f"Course {i}", department="AI", date=date(2026, 7, 1), start_time=time(9, 0), end_time=time(11, 0), student_headcount=30, venue_id=1, required_professors=1, required_tas=2)
        for i in range(4)
    ]

    optimizer = InvigilationOptimizer(users, [v1, v2], sessions, [])
    # Solver must not crash, must return valid result object
    res = optimizer.solve()

    assert res is not None
    assert res.status in ("INFEASIBLE", "FALLBACK_HEURISTIC")
    # Even in heuristic fallback, zero double-booking must be preserved for any staff member
    assigned_slots = {}
    for a in res.assignments:
        uid = a["user_id"]
        sess = next(s for s in sessions if s.id == a["exam_session_id"])
        if uid in assigned_slots:
            prev_sess = assigned_slots[uid]
            # Verify no concurrent overlap
            assert sess.id == prev_sess.id or not (max(sess.start_time, prev_sess.start_time) < min(sess.end_time, prev_sess.end_time)), \
                f"Double booking occurred for staff {uid}!"
        assigned_slots[uid] = sess


def test_optimizer_proctor_ratios_and_room_overlap_integrity():
    """Verify solver strictly enforces 2 TAs for labs and 3-4 for halls with zero double bookings."""
    profs = [
        User(id=f"prof-{i}", staff_id=f"P{i}", email=f"p{i}@f.edu", hashed_password="x", full_name=f"Prof {i}", role=RoleEnum.PROFESSOR, department="AI", is_active=True)
        for i in range(3)
    ]
    tas = [
        User(id=f"ta-{i}", staff_id=f"T{i}", email=f"t{i}@f.edu", hashed_password="x", full_name=f"TA {i}", role=RoleEnum.TA, department="AI", max_daily_shifts=3, max_total_shifts=10, is_active=True)
        for i in range(12)
    ]
    users = profs + tas

    lab_venue = Venue(id=1, name="Lab 405", venue_type=VenueTypeEnum.LAB, building="Hub", floor=4, capacity=40)
    hall_venue = Venue(id=2, name="Hall M1", venue_type=VenueTypeEnum.HALL, building="Central", floor=1, capacity=50)

    # 1 Lab session requiring 2 TAs, 1 Hall session requiring 3 TAs
    s1 = ExamSession(id=401, course_code="LAB101", course_name="Lab AI", department="AI", date=date(2026, 7, 5), start_time=time(9, 0), end_time=time(10, 30), student_headcount=35, venue_id=1, required_professors=1, required_tas=2)
    s2 = ExamSession(id=402, course_code="HALL101", course_name="Theory AI", department="AI", date=date(2026, 7, 5), start_time=time(9, 0), end_time=time(10, 30), student_headcount=50, venue_id=2, required_professors=1, required_tas=3)

    optimizer = InvigilationOptimizer(users, [lab_venue, hall_venue], [s1, s2], [])
    res = optimizer.solve()

    assert res.status in ("OPTIMAL", "FEASIBLE", "FALLBACK_HEURISTIC")

    # Lab session proctors count
    s1_tas = [a for a in res.assignments if a["exam_session_id"] == 401 and a["role_in_exam"] == AssignmentRoleEnum.INVIGILATOR_TA]
    assert len(s1_tas) == 2, f"Lab session required 2 TAs, got {len(s1_tas)}"

    # Hall session proctors count
    s2_tas = [a for a in res.assignments if a["exam_session_id"] == 402 and a["role_in_exam"] == AssignmentRoleEnum.INVIGILATOR_TA]
    assert len(s2_tas) == 3, f"Hall session required 3 TAs, got {len(s2_tas)}"

    # Zero overlap: disjoint set of assigned TAs across concurrent sessions
    s1_ta_ids = {a["user_id"] for a in s1_tas}
    s2_ta_ids = {a["user_id"] for a in s2_tas}
    assert len(s1_ta_ids.intersection(s2_ta_ids)) == 0, "Double-booking detected across concurrent sessions!"

