from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, get_current_user, require_role
from app.models.user import User, RoleEnum
from app.models.exam import ExamSession
from app.models.venue import Venue
from app.schemas.exam import ExamSessionCreate, ExamSessionUpdate, ExamSessionOut

router = APIRouter(prefix="/exams", tags=["Exam Sessions"])


@router.get("", response_model=List[ExamSessionOut])
def get_exam_sessions(
    exam_date: Optional[date] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ExamSession).options(joinedload(ExamSession.venue))
    if exam_date:
        query = query.filter(ExamSession.date == exam_date)
    if department:
        query = query.filter(ExamSession.department == department)
    return query.order_by(ExamSession.date, ExamSession.start_time).all()


@router.post("", response_model=ExamSessionOut, status_code=status.HTTP_201_CREATED)
def create_exam_session(
    session_in: ExamSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    # Verify venue exists
    venue = db.query(Venue).filter(Venue.id == session_in.venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Selected venue does not exist")

    # Auto-calculate TAs if not explicitly set (rule: 1 TA per 25-30 students, minimum 1)
    req_tas = session_in.required_tas
    if req_tas <= 0:
        req_tas = max(1, (session_in.student_headcount + 24) // 25)

    new_session = ExamSession(
        course_code=session_in.course_code,
        course_name=session_in.course_name,
        department=session_in.department,
        date=session_in.date,
        start_time=session_in.start_time,
        end_time=session_in.end_time,
        student_headcount=session_in.student_headcount,
        venue_id=session_in.venue_id,
        required_professors=session_in.required_professors,
        required_tas=req_tas,
        status=session_in.status,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.put("/{session_id}", response_model=ExamSessionOut)
def update_exam_session(
    session_id: int,
    session_in: ExamSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")

    for field, value in session_in.model_dump(exclude_unset=True).items():
        setattr(session, field, value)

    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
    db.delete(session)
    db.commit()
    return None
