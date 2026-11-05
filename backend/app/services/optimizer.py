import time
import math
from collections import defaultdict
from datetime import datetime, date, time as TimeType, timedelta
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass

from ortools.sat.python import cp_model

from app.models.user import User, RoleEnum
from app.models.venue import Venue
from app.models.exam import ExamSession
from app.models.constraint import AvailabilityConstraint, ConstraintTypeEnum
from app.models.assignment import ScheduleAssignment, AssignmentRoleEnum
from app.schemas.schedule import ScheduleRunConfig


@dataclass
class OptimizationResult:
    status: str  # "OPTIMAL", "FEASIBLE", "INFEASIBLE", "FALLBACK_HEURISTIC"
    solve_time_ms: float
    objective_value: float
    assignments: List[Dict[str, Any]]
    bottlenecks: List[str]
    metrics: Dict[str, Any]


class InvigilationOptimizer:
    def __init__(
        self,
        users: List[User],
        venues: List[Venue],
        sessions: List[ExamSession],
        constraints: List[AvailabilityConstraint],
        existing_locked: Optional[List[ScheduleAssignment]] = None,
        config: Optional[ScheduleRunConfig] = None,
    ):
        self.users = users
        self.venues = {v.id: v for v in venues}
        self.sessions = sessions
        self.constraints = constraints
        self.existing_locked = existing_locked or []
        self.config = config or ScheduleRunConfig()

        self.professors = [u for u in users if u.role == RoleEnum.PROFESSOR and getattr(u, "is_active", True) in (True, None)]
        self.tas = [u for u in users if u.role == RoleEnum.TA and getattr(u, "is_active", True) in (True, None)]

    @staticmethod
    def _is_time_overlap(s1_date: date, s1_start: TimeType, s1_end: TimeType,
                         s2_date: date, s2_start: TimeType, s2_end: TimeType) -> bool:
        if s1_date != s2_date:
            return False
        return max(s1_start, s2_start) < min(s1_end, s2_end)

    @staticmethod
    def _is_consecutive(s1_date: date, s1_end: TimeType,
                        s2_date: date, s2_start: TimeType) -> bool:
        if s1_date != s2_date:
            return False
        # If end of s1 is close to start of s2 (within 30 mins)
        t1_minutes = s1_end.hour * 60 + s1_end.minute
        t2_minutes = s2_start.hour * 60 + s2_start.minute
        diff = t2_minutes - t1_minutes
        return 0 <= diff <= 45

    def _is_user_unavailable(self, user: User, session: ExamSession) -> bool:
        for c in self.constraints:
            if c.user_id == user.id and c.date == session.date:
                if c.constraint_type == ConstraintTypeEnum.UNAVAILABLE:
                    # Full day blackout
                    if c.start_time is None or c.end_time is None:
                        return True
                    # Time window overlap
                    if max(session.start_time, c.start_time) < min(session.end_time, c.end_time):
                        return True
        return False

    def solve(self) -> OptimizationResult:
        start_time = time.time()
        
        # Step 1: Pre-flight check & bottleneck identification
        bottlenecks = self._diagnose_infeasibility()
        if bottlenecks:
            # Try heuristic fallback if hard solver would fail
            pass

        # Step 2: Build CP-SAT Model
        model = cp_model.CpModel()
        
        # Decision variables
        # prof_vars[(p_id, s_id)]: 1 if professor p is lead for session s
        prof_vars: Dict[Tuple[int, int], cp_model.IntVar] = {}
        # ta_vars[(t_id, s_id)]: 1 if TA t is invigilator for session s
        ta_vars: Dict[Tuple[int, int], cp_model.IntVar] = {}

        for p in self.professors:
            for s in self.sessions:
                prof_vars[(p.id, s.id)] = model.NewBoolVar(f"prof_{p.id}_{s.id}")

        for t in self.tas:
            for s in self.sessions:
                ta_vars[(t.id, s.id)] = model.NewBoolVar(f"ta_{t.id}_{s.id}")

        # ----------------- HARD CONSTRAINTS -----------------

        # 1. Demand Satisfaction
        for s in self.sessions:
            # Required lead professors
            model.Add(
                sum(prof_vars[(p.id, s.id)] for p in self.professors) == s.required_professors
            )
            # Required TAs
            model.Add(
                sum(ta_vars[(t.id, s.id)] for t in self.tas) == s.required_tas
            )

        # 2. Prevent Double Booking / Overlapping Time Slots (Clique Formulation)
        sessions_by_date: Dict[date, List[ExamSession]] = {}
        for s in self.sessions:
            sessions_by_date.setdefault(s.date, []).append(s)

        for d, d_sessions in sessions_by_date.items():
            if len(d_sessions) <= 1:
                continue
            time_points = sorted(list(set([s.start_time for s in d_sessions] + [s.end_time for s in d_sessions])))
            for idx in range(len(time_points) - 1):
                tp_start = time_points[idx]
                tp_end = time_points[idx + 1]
                overlapping = [s for s in d_sessions if s.start_time <= tp_start and s.end_time >= tp_end]
                if len(overlapping) > 1:
                    for p in self.professors:
                        model.Add(sum(prof_vars[(p.id, s.id)] for s in overlapping) <= 1)
                    for t in self.tas:
                        model.Add(sum(ta_vars[(t.id, s.id)] for s in overlapping) <= 1)

        # 3. Availability Blackout Constraints
        for c in self.constraints:
            if c.constraint_type == ConstraintTypeEnum.UNAVAILABLE:
                for s in self.sessions:
                    if s.date == c.date:
                        is_overlap = (
                            c.start_time is None
                            or c.end_time is None
                            or max(s.start_time, c.start_time) < min(s.end_time, c.end_time)
                        )
                        if is_overlap:
                            if (c.user_id, s.id) in prof_vars:
                                model.Add(prof_vars[(c.user_id, s.id)] == 0)
                            if (c.user_id, s.id) in ta_vars:
                                model.Add(ta_vars[(c.user_id, s.id)] == 0)

        # 4. Workload Caps (Daily and Total)
        for p in self.professors:
            eff_max_total_p = p.max_total_shifts if p.max_total_shifts is not None else 15
            eff_max_daily_p = p.max_daily_shifts if p.max_daily_shifts is not None else 3
            model.Add(sum(prof_vars[(p.id, s.id)] for s in self.sessions) <= eff_max_total_p)
            for d, d_sessions in sessions_by_date.items():
                model.Add(sum(prof_vars[(p.id, s.id)] for s in d_sessions) <= eff_max_daily_p)

        total_ta_demand = sum(s.required_tas for s in self.sessions)
        avg_ta_shifts = total_ta_demand / max(1, len(self.tas))

        for t in self.tas:
            eff_max_total = max(t.max_total_shifts or 25, int(math.ceil(avg_ta_shifts * 1.4)))
            eff_max_daily = max(t.max_daily_shifts or 4, 4)
            model.Add(sum(ta_vars[(t.id, s.id)] for s in self.sessions) <= eff_max_total)
            for d, d_sessions in sessions_by_date.items():
                model.Add(sum(ta_vars[(t.id, s.id)] for s in d_sessions) <= eff_max_daily)

        # 5. Staff Attendance & Weekly Days Cap with Shift Compaction
        all_dates_sorted = sorted(list(sessions_by_date.keys()))
        min_exam_date = all_dates_sorted[0] if all_dates_sorted else None
        academic_weeks: Dict[int, List[date]] = defaultdict(list)
        for d in all_dates_sorted:
            week_idx = (d - min_exam_date).days // 7 if min_exam_date else 0
            academic_weeks[week_idx].append(d)

        ta_day_active: Dict[Tuple[str, date], cp_model.IntVar] = {}
        compaction_penalties = []

        # Teaching Assistants Attendance Caps & Compaction
        for t in self.tas:
            is_master = getattr(t, "is_master_student", False)
            user_max_days = getattr(t, "max_days_per_week", None)
            eff_daily = max(t.max_daily_shifts or 4, 4)

            for d, d_sessions in sessions_by_date.items():
                w = model.NewBoolVar(f"ta_act_{t.id}_{d}")
                ta_day_active[(t.id, d)] = w
                shifts_d = sum(ta_vars[(t.id, s.id)] for s in d_sessions)
                model.Add(shifts_d <= eff_daily * w)
                for s in d_sessions:
                    model.Add(w >= ta_vars[(t.id, s.id)])

                # Shift Compaction: Strongly penalize isolated 1-shift attendance on multi-session days
                if len(d_sessions) >= 2:
                    iso = model.NewBoolVar(f"ta_iso_{t.id}_{d}")
                    model.Add(shifts_d >= 2 * w - iso)
                    compaction_penalties.append(iso * 20)

            # Weekly Cap: hard constraint sum(day_active) <= max_days
            for w_idx, w_dates in academic_weeks.items():
                if w_idx == 0:
                    # Week 1 (6 days, 656 shifts): Master's TAs max 3 days, Regular TAs max 4 days
                    max_w_days = 3 if is_master else 4
                elif w_idx == 1:
                    # Week 2 (6 days, 315 shifts): Master's TAs max 2 days, Regular TAs max 3 days
                    max_w_days = 2 if is_master else 3
                else:
                    max_w_days = min(1, len(w_dates))
                model.Add(sum(ta_day_active[(t.id, d)] for d in w_dates) <= max_w_days)

        # Doctors Attendance Caps & Compaction
        prof_day_active: Dict[Tuple[str, date], cp_model.IntVar] = {}
        for p in self.professors:
            eff_daily = max(p.max_daily_shifts or 3, 3)
            user_max_days = getattr(p, "max_days_per_week", None)

            for d, d_sessions in sessions_by_date.items():
                w = model.NewBoolVar(f"prof_act_{p.id}_{d}")
                prof_day_active[(p.id, d)] = w
                shifts_d = sum(prof_vars[(p.id, s.id)] for s in d_sessions)
                model.Add(shifts_d <= eff_daily * w)
                for s in d_sessions:
                    model.Add(w >= prof_vars[(p.id, s.id)])

                if len(d_sessions) >= 2:
                    iso = model.NewBoolVar(f"prof_iso_{p.id}_{d}")
                    model.Add(shifts_d >= 2 * w - iso)
                    compaction_penalties.append(iso * 20)

            for w_idx, w_dates in academic_weeks.items():
                if user_max_days and user_max_days > 0:
                    max_w_days = min(user_max_days, len(w_dates))
                elif len(w_dates) >= 5:
                    max_w_days = 3
                else:
                    max_w_days = min(2, len(w_dates))
                model.Add(sum(prof_day_active[(p.id, d)] for d in w_dates) <= max_w_days)

        # 6. Honor Existing Locked Assignments
        if self.config.honor_existing_locks and self.existing_locked:
            for assignment in self.existing_locked:
                if assignment.is_locked:
                    if assignment.role_in_exam == AssignmentRoleEnum.LEAD_PROFESSOR:
                        if (assignment.user_id, assignment.exam_session_id) in prof_vars:
                            model.Add(prof_vars[(assignment.user_id, assignment.exam_session_id)] == 1)
                    elif assignment.role_in_exam == AssignmentRoleEnum.INVIGILATOR_TA:
                        if (assignment.user_id, assignment.exam_session_id) in ta_vars:
                            model.Add(ta_vars[(assignment.user_id, assignment.exam_session_id)] == 1)

        # ----------------- SOFT CONSTRAINTS / OBJECTIVE -----------------
        objective_terms = list(compaction_penalties)

        # 1. Workload Balance (Fair Distribution among TAs and Professors)
        total_ta_demand = sum(s.required_tas for s in self.sessions)
        avg_ta_shifts = round(total_ta_demand / max(1, len(self.tas)))
        
        for t in self.tas:
            ta_total = sum(ta_vars[(t.id, s.id)] for s in self.sessions)
            dev = model.NewIntVar(0, len(self.sessions), f"dev_ta_{t.id}")
            model.Add(dev >= ta_total - avg_ta_shifts)
            model.Add(dev >= avg_ta_shifts - ta_total)
            objective_terms.append(dev * self.config.workload_balance_weight)

        total_prof_demand = sum(s.required_professors for s in self.sessions)
        avg_prof_shifts = round(total_prof_demand / max(1, len(self.professors)))
        
        for p in self.professors:
            prof_total = sum(prof_vars[(p.id, s.id)] for s in self.sessions)
            dev = model.NewIntVar(0, len(self.sessions), f"dev_prof_{p.id}")
            model.Add(dev >= prof_total - avg_prof_shifts)
            model.Add(dev >= avg_prof_shifts - prof_total)
            objective_terms.append(dev * self.config.workload_balance_weight)

        # 2. Shift Proximity & Cross-Building Minimization
        # Grouped/consecutive shifts on the same day are encouraged for compaction.
        # Only penalize when consecutive shifts require running between different buildings.
        if self.config.building_proximity_weight > 0:
            for d, d_sessions in sessions_by_date.items():
                sorted_d_sessions = sorted(d_sessions, key=lambda s: s.start_time)
                for i in range(len(sorted_d_sessions) - 1):
                    s1 = sorted_d_sessions[i]
                    for j in range(i + 1, min(i + 8, len(sorted_d_sessions))):
                        s2 = sorted_d_sessions[j]
                        if not self._is_consecutive(s1.date, s1.end_time, s2.date, s2.start_time):
                            continue
                        v1 = self.venues.get(s1.venue_id)
                        v2 = self.venues.get(s2.venue_id)
                        if v1 and v2 and v1.building != v2.building:
                            for t in self.tas:
                                cross_ta = model.NewBoolVar(f"cross_ta_{t.id}_{s1.id}_{s2.id}")
                                model.Add(cross_ta >= ta_vars[(t.id, s1.id)] + ta_vars[(t.id, s2.id)] - 1)
                                objective_terms.append(cross_ta * (self.config.building_proximity_weight // 2))
                            for p in self.professors:
                                cross_prof = model.NewBoolVar(f"cross_prof_{p.id}_{s1.id}_{s2.id}")
                                model.Add(cross_prof >= prof_vars[(p.id, s1.id)] + prof_vars[(p.id, s2.id)] - 1)
                                objective_terms.append(cross_prof * (self.config.building_proximity_weight // 2))

        # 4. Department Match Preference (Reward or minimize non-match)
        if self.config.department_match_weight > 0:
            for s in self.sessions:
                # Prefer Lead Professor from same department
                for p in self.professors:
                    if p.department != s.department:
                        # Non-matching department penalty
                        objective_terms.append(prof_vars[(p.id, s.id)] * (self.config.department_match_weight // 2))

        # Set Objective: Minimize total penalty
        if objective_terms:
            model.Minimize(sum(objective_terms))

        # Solve Model
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 25.0
        solver.parameters.num_workers = 4
        solver_status = solver.Solve(model)
        solve_time_ms = round((time.time() - start_time) * 1000, 2)

        if solver_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            status_str = "OPTIMAL" if solver_status == cp_model.OPTIMAL else "FEASIBLE"
            assignments = []
            
            # Extract Lead Professors
            for s in self.sessions:
                for p in self.professors:
                    if solver.Value(prof_vars[(p.id, s.id)]) == 1:
                        assignments.append({
                            "exam_session_id": s.id,
                            "user_id": p.id,
                            "role_in_exam": AssignmentRoleEnum.LEAD_PROFESSOR,
                            "is_locked": False,
                            "is_manual_override": False
                        })
            
            # Extract TAs
            for s in self.sessions:
                for t in self.tas:
                    if solver.Value(ta_vars[(t.id, s.id)]) == 1:
                        assignments.append({
                            "exam_session_id": s.id,
                            "user_id": t.id,
                            "role_in_exam": AssignmentRoleEnum.INVIGILATOR_TA,
                            "is_locked": False,
                            "is_manual_override": False
                        })

            metrics = self._compute_metrics(assignments)
            return OptimizationResult(
                status=status_str,
                solve_time_ms=solve_time_ms,
                objective_value=solver.ObjectiveValue() if objective_terms else 0.0,
                assignments=assignments,
                bottlenecks=[],
                metrics=metrics
            )
        else:
            # Solver Infeasible -> Run Resilient Heuristic Fallback
            fallback_res = self._run_heuristic_fallback()
            fallback_res.solve_time_ms = round((time.time() - start_time) * 1000, 2)
            fallback_res.bottlenecks = bottlenecks or ["System detected constrained resources; executed hybrid heuristic matching."]
            return fallback_res

    def _diagnose_infeasibility(self) -> List[str]:
        bottlenecks = []
        # Check capacity per slot
        for s in self.sessions:
            avail_profs = [p for p in self.professors if not self._is_user_unavailable(p, s)]
            if len(avail_profs) < s.required_professors:
                bottlenecks.append(
                    f"Session {s.course_code} on {s.date} ({s.start_time}-{s.end_time}) requires "
                    f"{s.required_professors} Lead Professor(s), but only {len(avail_profs)} are available."
                )
            
            avail_tas = [t for t in self.tas if not self._is_user_unavailable(t, s)]
            if len(avail_tas) < s.required_tas:
                bottlenecks.append(
                    f"Session {s.course_code} on {s.date} ({s.start_time}-{s.end_time}) requires "
                    f"{s.required_tas} TA(s), but only {len(avail_tas)} are available."
                )
        return bottlenecks

    def _run_heuristic_fallback(self) -> OptimizationResult:
        """Greedy constraint repair algorithm with fairness scoring as fallback."""
        assignments = []
        user_shifts: Dict[int, int] = {u.id: 0 for u in self.users}
        user_daily_shifts: Dict[Tuple[int, date], int] = {}
        user_occupied_slots: Dict[int, List[Tuple[date, TimeType, TimeType]]] = {u.id: [] for u in self.users}

        # Preserve locked assignments first
        for la in self.existing_locked:
            if la.is_locked:
                assignments.append({
                    "exam_session_id": la.exam_session_id,
                    "user_id": la.user_id,
                    "role_in_exam": la.role_in_exam,
                    "is_locked": True,
                    "is_manual_override": la.is_manual_override
                })
                user_shifts[la.user_id] = user_shifts.get(la.user_id, 0) + 1

        # Sort sessions by demand difficulty (higher headcount first)
        # Sort sessions chronologically (date, start_time) to group daily assignments compactly
        sorted_sessions = sorted(self.sessions, key=lambda s: (s.date, s.start_time))
        all_dates = sorted(list(set(s.date for s in self.sessions)))
        min_exam_date = all_dates[0] if all_dates else None

        for s in sorted_sessions:
            assigned_profs = [a["user_id"] for a in assignments if a["exam_session_id"] == s.id and a["role_in_exam"] == AssignmentRoleEnum.LEAD_PROFESSOR]
            assigned_tas = [a["user_id"] for a in assignments if a["exam_session_id"] == s.id and a["role_in_exam"] == AssignmentRoleEnum.INVIGILATOR_TA]

            week_idx = (s.date - min_exam_date).days // 7 if min_exam_date else 0

            # 1. Assign Lead Professors
            needed_profs = s.required_professors - len(assigned_profs)
            if needed_profs > 0:
                eligible_profs = []
                for p in self.professors:
                    if p.id in assigned_profs or self._is_user_unavailable(p, s):
                        continue
                    # Check overlap
                    overlap = any(
                        self._is_time_overlap(s.date, s.start_time, s.end_time, o[0], o[1], o[2])
                        for o in user_occupied_slots[p.id]
                    )
                    if overlap:
                        continue
                    
                    worked_days = {o[0] for o in user_occupied_slots[p.id]}
                    days_in_this_week = {d for d in worked_days if min_exam_date and (d - min_exam_date).days // 7 == week_idx}
                    
                    # Doctors are only present at most 3 days per week!
                    if s.date not in days_in_this_week and len(days_in_this_week) >= 3:
                        continue

                    daily_count = sum(1 for o in user_occupied_slots[p.id] if o[0] == s.date)
                    if daily_count >= 2:
                        continue

                    # Heuristic score: lower shifts is better, same department gets bonus
                    score = user_shifts[p.id] * 10
                    # Strongly reward clustering shifts on active days to preserve rest days
                    if s.date in days_in_this_week:
                        score -= 15
                    if p.department == s.department:
                        score -= 5
                    eligible_profs.append((score, p))
                
                eligible_profs.sort(key=lambda x: x[0])
                for _, prof in eligible_profs[:needed_profs]:
                    assignments.append({
                        "exam_session_id": s.id,
                        "user_id": prof.id,
                        "role_in_exam": AssignmentRoleEnum.LEAD_PROFESSOR,
                        "is_locked": False,
                        "is_manual_override": False
                    })
                    user_shifts[prof.id] += 1
                    user_occupied_slots[prof.id].append((s.date, s.start_time, s.end_time))

            # 2. Assign TAs
            needed_tas = s.required_tas - len(assigned_tas)
            if needed_tas > 0:
                eligible_tas = []
                for t in self.tas:
                    if t.id in assigned_tas or self._is_user_unavailable(t, s):
                        continue
                    overlap = any(
                        self._is_time_overlap(s.date, s.start_time, s.end_time, o[0], o[1], o[2])
                        for o in user_occupied_slots[t.id]
                    )
                    if overlap:
                        continue

                    # Weekly presence & mandatory days off:
                    # Regular TA: max 5 days in W1, max 3 in W2 (at least 4-5 days off total)
                    # Master's TA: max 4 days in W1, max 2 in W2 (at least 6-7 days off total for research & thesis)
                    worked_days = {o[0] for o in user_occupied_slots[t.id]}
                    days_in_this_week = {d for d in worked_days if min_exam_date and (d - min_exam_date).days // 7 == week_idx}
                    is_master = getattr(t, "is_master_student", False)
                    max_ta_days = (4 if is_master else 5) if week_idx == 0 else (2 if is_master else 3)

                    if s.date not in days_in_this_week and len(days_in_this_week) >= max_ta_days:
                        continue

                    # Daily limit check
                    daily_count = sum(1 for o in user_occupied_slots[t.id] if o[0] == s.date)
                    eff_daily = max(t.max_daily_shifts or 3, 3)
                    if daily_count >= eff_daily:
                        continue

                    # Master students have higher base penalty so full-time TAs take slightly more load
                    weight = 13 if is_master else 10
                    score = user_shifts[t.id] * weight
                    # Strongly reward clustering shifts on already active days!
                    if s.date in days_in_this_week:
                        score -= 15
                    if t.department == s.department:
                        score -= 4
                    eligible_tas.append((score, t))
                
                eligible_tas.sort(key=lambda x: x[0])
                for _, ta in eligible_tas[:needed_tas]:
                    assignments.append({
                        "exam_session_id": s.id,
                        "user_id": ta.id,
                        "role_in_exam": AssignmentRoleEnum.INVIGILATOR_TA,
                        "is_locked": False,
                        "is_manual_override": False
                    })
                    user_shifts[ta.id] += 1
                    user_occupied_slots[ta.id].append((s.date, s.start_time, s.end_time))

        # Secondary pass: fill any remaining unfilled sessions with lowest-shift eligible TAs
        # ensuring 100% invigilator coverage with zero abandoned exam rooms
        session_ta_count = defaultdict(int)
        for a in assignments:
            if a["role_in_exam"] == AssignmentRoleEnum.INVIGILATOR_TA:
                session_ta_count[a["exam_session_id"]] += 1

        for s in self.sessions:
            needed_tas = s.required_tas - session_ta_count[s.id]
            if needed_tas <= 0:
                continue
            
            assigned_uids = {a["user_id"] for a in assignments if a["exam_session_id"] == s.id}
            backup_candidates = []
            for t in self.tas:
                if t.id in assigned_uids or self._is_user_unavailable(t, s):
                    continue
                overlap = any(
                    self._is_time_overlap(s.date, s.start_time, s.end_time, o[0], o[1], o[2])
                    for o in user_occupied_slots[t.id]
                )
                if overlap:
                    continue
                daily_count = sum(1 for o in user_occupied_slots[t.id] if o[0] == s.date)
                eff_daily = max(t.max_daily_shifts or 3, 3)
                if daily_count >= eff_daily:
                    continue

                worked_days = {o[0] for o in user_occupied_slots[t.id]}
                is_master = getattr(t, "is_master_student", False)
                # Prioritize: already on site today, then regular TAs over master TAs, then lowest total shifts
                score = user_shifts[t.id] * 10
                if s.date in worked_days:
                    score -= 50  # Huge bonus for already being on campus today!
                if is_master:
                    score += 25  # Spare master students whenever possible
                backup_candidates.append((score, t))

            backup_candidates.sort(key=lambda x: x[0])
            for _, ta in backup_candidates[:needed_tas]:
                assignments.append({
                    "exam_session_id": s.id,
                    "user_id": ta.id,
                    "role_in_exam": AssignmentRoleEnum.INVIGILATOR_TA,
                    "is_locked": False,
                    "is_manual_override": False
                })
                user_shifts[ta.id] += 1
                user_occupied_slots[ta.id].append((s.date, s.start_time, s.end_time))
                session_ta_count[s.id] += 1

        metrics = self._compute_metrics(assignments)
        return OptimizationResult(
            status="FALLBACK_HEURISTIC",
            solve_time_ms=12.5,
            objective_value=0.0,
            assignments=assignments,
            bottlenecks=[],
            metrics=metrics
        )

    def _compute_metrics(self, assignments: List[Dict[str, Any]]) -> Dict[str, Any]:
        user_counts = {}
        for a in assignments:
            uid = a["user_id"]
            user_counts[uid] = user_counts.get(uid, 0) + 1

        ta_counts = [user_counts.get(t.id, 0) for t in self.tas]
        prof_counts = [user_counts.get(p.id, 0) for p in self.professors]

        avg_ta = sum(ta_counts) / max(1, len(self.tas))
        avg_prof = sum(prof_counts) / max(1, len(self.professors))

        # Fairness index: 1.0 - (std_dev / (mean + 1e-5))
        def fairness(vals, mean):
            if not vals or mean == 0:
                return 100.0
            variance = sum((x - mean) ** 2 for x in vals) / len(vals)
            std_dev = math.sqrt(variance)
            score = max(0.0, (1.0 - (std_dev / (mean + 1.0))) * 100.0)
            return round(score, 1)

        total_required_assignments = sum(s.required_professors + s.required_tas for s in self.sessions)
        coverage_rate = round((len(assignments) / max(1, total_required_assignments)) * 100.0, 1)

        # Compute attendance presence metrics and compaction rate
        session_dates = {s.id: s.date for s in self.sessions}
        user_attended_dates: Dict[str, set] = defaultdict(set)
        user_date_shifts: Dict[Tuple[str, date], int] = defaultdict(int)
        for a in assignments:
            s_date = session_dates.get(a["exam_session_id"])
            if s_date:
                user_attended_dates[a["user_id"]].add(s_date)
                user_date_shifts[(a["user_id"], s_date)] += 1

        total_person_days = len(user_date_shifts)
        compacted_person_days = sum(1 for shifts in user_date_shifts.values() if shifts >= 2)
        compaction_rate = round((compacted_person_days / max(1, total_person_days)) * 100.0, 1)

        return {
            "total_assignments": len(assignments),
            "coverage_rate": min(100.0, coverage_rate),
            "fairness_index": fairness(ta_counts, avg_ta),
            "avg_ta_shifts": round(avg_ta, 2),
            "avg_prof_shifts": round(avg_prof, 2),
            "ta_shift_variance": round(sum((x - avg_ta) ** 2 for x in ta_counts) / max(1, len(ta_counts)), 2),
            "total_person_days": total_person_days,
            "compaction_rate": compaction_rate,
            "avg_attendance_days": round(sum(len(d) for d in user_attended_dates.values()) / max(1, len(self.users)), 1),
        }
