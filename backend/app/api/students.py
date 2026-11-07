import io
from typing import Optional, List
from datetime import datetime, date, time
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.api.deps import get_db, get_current_user
from app.models.user import User, RoleEnum
from app.models.student import Student, StudentSeating, AttendanceStatusEnum
from app.models.exam import ExamSession
from app.models.venue import Venue
from app.models.assignment import ScheduleAssignment, AssignmentRoleEnum
from app.schemas.student import (
    StudentOut,
    StudentSeatingOut,
    SeatingStudentInfo,
    AttendanceBatchUpdateRequest,
    VenueRosterResponse,
    StudentLookupResponse,
    StudentLookupSeating,
)
from app.services.export_service import ExportService

router = APIRouter(prefix="/students", tags=["Students & Attendance"])


@router.get("/roster", response_model=VenueRosterResponse)
def get_venue_roster(
    session_id: Optional[int] = Query(None),
    venue_name: Optional[str] = Query(None),
    course_name: Optional[str] = Query(None),
    exam_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full student seating roster for a specific venue and exam session."""
    query = db.query(StudentSeating)

    if session_id:
        query = query.filter(StudentSeating.exam_session_id == session_id)
    else:
        if venue_name:
            query = query.filter(
                or_(
                    StudentSeating.venue_name.ilike(f"%{venue_name}%"),
                    StudentSeating.venue_name == venue_name,
                )
            )
        if course_name:
            query = query.filter(StudentSeating.course_name.ilike(f"%{course_name}%"))
        if exam_date:
            try:
                d = datetime.strptime(exam_date, "%Y-%m-%d").date()
                query = query.filter(StudentSeating.exam_date == d)
            except ValueError:
                pass

    seatings = query.order_by(StudentSeating.seat_number.asc(), StudentSeating.id.asc()).all()

    # Calculate stats
    total = len(seatings)
    present = sum(1 for s in seatings if s.attendance_status == "PRESENT")
    absent = sum(1 for s in seatings if s.attendance_status == "ABSENT")
    pending = total - present - absent

    first_item = seatings[0] if seatings else None
    vn = venue_name or (first_item.venue_name if first_item else "Unknown Venue")
    cn = course_name or (first_item.course_name if first_item else None)
    ed = first_item.exam_date if first_item else None
    st = first_item.start_time.strftime("%I:%M %p") if first_item and first_item.start_time else None
    et = first_item.end_time.strftime("%I:%M %p") if first_item and first_item.end_time else None

    # Format output items with student info
    out_students = []
    for s in seatings:
        st_info = SeatingStudentInfo(
            id=s.student.id,
            student_code=s.student.student_code,
            full_name=s.student.full_name,
            department=s.student.department,
        )
        out_students.append(
            StudentSeatingOut(
                id=s.id,
                student_id=s.student_id,
                student=st_info,
                exam_session_id=s.exam_session_id,
                venue_id=s.venue_id,
                course_name=s.course_name,
                department=s.department,
                venue_name=s.venue_name,
                exam_date=s.exam_date,
                start_time=s.start_time,
                end_time=s.end_time,
                seat_number=s.seat_number,
                attendance_status=s.attendance_status,
                attended_at=s.attended_at,
                notes=s.notes,
            )
        )

    return VenueRosterResponse(
        venue_name=vn,
        course_name=cn,
        exam_date=ed,
        start_time=st,
        end_time=et,
        total_students=total,
        present_count=present,
        absent_count=absent,
        pending_count=pending,
        students=out_students,
    )


@router.post("/attendance")
def update_attendance(
    payload: AttendanceBatchUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update attendance status for a list of students."""
    updated_count = 0
    now = datetime.utcnow()

    for item in payload.items:
        seating = db.query(StudentSeating).filter(StudentSeating.id == item.seating_id).first()
        if seating:
            seating.attendance_status = item.status.upper()
            seating.marked_by_user_id = current_user.id
            if item.status.upper() == "PRESENT":
                seating.attended_at = now
            elif item.status.upper() == "ABSENT":
                seating.attended_at = None
            if item.notes is not None:
                seating.notes = item.notes
            updated_count += 1

    db.commit()
    return {
        "success": True,
        "updated_count": updated_count,
        "message": f"Successfully updated attendance for {updated_count} students.",
    }


@router.get("/lookup", response_model=StudentLookupResponse)
def lookup_student_schedule(
    code: str = Query(..., description="Student University ID / Code (e.g. 4211015)"),
    db: Session = Depends(get_db),
):
    """Public / Student-facing lookup: Find all exam seating assignments and room locations by Student Code."""
    clean_code = code.strip()
    student = db.query(Student).filter(Student.student_code == clean_code).first()

    if not student:
        # Try search by full name
        student = db.query(Student).filter(Student.full_name.ilike(f"%{clean_code}%")).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail=f"No student record found with code or name: '{clean_code}'. Please verify your university ID.",
        )

    seatings = (
        db.query(StudentSeating)
        .filter(StudentSeating.student_id == student.id)
        .order_by(StudentSeating.exam_date.asc(), StudentSeating.start_time.asc())
        .all()
    )

    out_seatings = []
    for s in seatings:
        # Find proctor staff if linked to session
        lead_doc = None
        tas = []
        if s.exam_session_id:
            assignments = (
                db.query(ScheduleAssignment)
                .filter(ScheduleAssignment.exam_session_id == s.exam_session_id)
                .all()
            )
            for a in assignments:
                if a.role_in_exam == AssignmentRoleEnum.LEAD_PROFESSOR:
                    lead_doc = a.user.full_name
                elif a.role_in_exam == AssignmentRoleEnum.INVIGILATOR_TA:
                    tas.append(a.user.full_name)

        out_seatings.append(
            StudentLookupSeating(
                seating_id=s.id,
                course_name=s.course_name,
                department=s.department,
                venue_name=s.venue_name,
                exam_date=s.exam_date,
                start_time=s.start_time.strftime("%I:%M %p") if s.start_time else None,
                end_time=s.end_time.strftime("%I:%M %p") if s.end_time else None,
                seat_number=s.seat_number,
                attendance_status=s.attendance_status,
                lead_doctor=lead_doc,
                invigilator_tas=tas,
            )
        )

    return StudentLookupResponse(
        student_code=student.student_code,
        full_name=student.full_name,
        department=student.department,
        academic_year=student.academic_year,
        total_exams=len(out_seatings),
        seatings=out_seatings,
    )


@router.get("/analytics")
def get_student_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve high-level student seating analytics and capacity figures."""
    total_students = db.query(func.count(Student.id)).scalar() or 0
    total_seatings = db.query(func.count(StudentSeating.id)).scalar() or 0

    dept_counts = (
        db.query(Student.department, func.count(Student.id))
        .group_by(Student.department)
        .all()
    )

    attendance_stats = (
        db.query(StudentSeating.attendance_status, func.count(StudentSeating.id))
        .group_by(StudentSeating.attendance_status)
        .all()
    )

    return {
        "total_unique_students": total_students,
        "total_seatings_allocated": total_seatings,
        "departments": [{"department": d[0], "count": d[1]} for d in dept_counts],
        "attendance": [{"status": a[0], "count": a[1]} for a in attendance_stats],
    }


@router.get("/export-pdf")
def export_roster_pdf(
    session_id: Optional[int] = Query(None),
    venue_name: Optional[str] = Query(None),
    course_name: Optional[str] = Query(None),
    exam_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Generate official printable PDF Attendance & Sign-in Sheet for an examination venue."""
    query = db.query(StudentSeating)

    if session_id:
        query = query.filter(StudentSeating.exam_session_id == session_id)
    else:
        if venue_name:
            query = query.filter(StudentSeating.venue_name.ilike(f"%{venue_name}%"))
        if course_name:
            query = query.filter(StudentSeating.course_name.ilike(f"%{course_name}%"))
        if exam_date:
            try:
                d = datetime.strptime(exam_date, "%Y-%m-%d").date()
                query = query.filter(StudentSeating.exam_date == d)
            except ValueError:
                pass

    seatings = query.order_by(StudentSeating.seat_number.asc(), StudentSeating.id.asc()).all()

    if not seatings:
        raise HTTPException(
            status_code=404,
            detail="No student seatings found for the specified venue and session parameters.",
        )

    # Get metadata
    first = seatings[0]
    v_name = first.venue_name
    c_name = first.course_name
    e_date = first.exam_date.strftime("%Y-%m-%d") if first.exam_date else "N/A"
    e_time = f"{first.start_time.strftime('%I:%M %p')} - {first.end_time.strftime('%I:%M %p')}" if first.start_time and first.end_time else "N/A"

    # Find proctors if session exists
    lead_doc = "أستاذ المادة"
    ta_names = ["مراقب الدور"]
    if first.exam_session_id:
        assignments = (
            db.query(ScheduleAssignment)
            .filter(ScheduleAssignment.exam_session_id == first.exam_session_id)
            .all()
        )
        t_list = []
        for a in assignments:
            if a.role_in_exam == AssignmentRoleEnum.LEAD_PROFESSOR:
                lead_doc = a.user.full_name
            elif a.role_in_exam == AssignmentRoleEnum.INVIGILATOR_TA:
                t_list.append(a.user.full_name)
        if t_list:
            ta_names = t_list

    pdf_bytes = ExportService.generate_roster_pdf(
        venue_name=v_name,
        course_name=c_name,
        exam_date=e_date,
        time_slot=e_time,
        students=seatings,
        lead_doctor=lead_doc,
        tas=ta_names,
    )

    filename = f"Attendance_{v_name.replace(' ', '_')}_{e_date}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
