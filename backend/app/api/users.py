from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_role
from app.models.user import User, RoleEnum
from app.models.constraint import AvailabilityConstraint
from app.models.assignment import ScheduleAssignment
from app.schemas.user import UserCreate, UserUpdate, UserOut, UserDetail
from app.schemas.constraint import ConstraintCreate, ConstraintOut
from app.services.auth_service import get_password_hash

router = APIRouter(prefix="/users", tags=["Faculty & Staff Management"])


@router.get("", response_model=List[UserOut])
def get_users(
    role: Optional[RoleEnum] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User).filter(User.is_active == True)
    if role:
        query = query.filter(User.role == role)
    if department:
        query = query.filter(User.department == department)
    return query.order_by(User.role, User.full_name).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    if db.query(User).filter((User.email == user_in.email) | (User.staff_id == user_in.staff_id)).first():
        raise HTTPException(status_code=400, detail="User with this email or Staff ID already exists")

    new_user = User(
        staff_id=user_in.staff_id,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        department=user_in.department,
        title=user_in.title,
        phone=user_in.phone,
        is_master_student=user_in.is_master_student,
        max_days_per_week=getattr(user_in, 'max_days_per_week', 3) or 3,
        max_daily_shifts=user_in.max_daily_shifts,
        max_total_shifts=user_in.max_total_shifts,
        is_active=user_in.is_active,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/{user_id}", response_model=UserDetail)
def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Calculate current assignments stats
    assignments = db.query(ScheduleAssignment).filter(ScheduleAssignment.user_id == user_id).all()
    total_shifts = len(assignments)
    # Estimate ~2.5 hours per shift
    total_hours = total_shifts * 2.5

    constraints = db.query(AvailabilityConstraint).filter(AvailabilityConstraint.user_id == user_id).all()

    return UserDetail(
        id=user.id,
        staff_id=user.staff_id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        title=user.title,
        phone=user.phone,
        max_daily_shifts=user.max_daily_shifts,
        max_total_shifts=user.max_total_shifts,
        is_active=user.is_active,
        created_at=user.created_at,
        constraints=[ConstraintOut.model_validate(c) for c in constraints],
        total_assigned_shifts=total_shifts,
        total_assigned_hours=total_hours,
    )


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        user.hashed_password = get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False  # Soft delete
    db.commit()
    return None


@router.post("/{user_id}/constraints", response_model=ConstraintOut, status_code=status.HTTP_201_CREATED)
def add_user_constraint(
    user_id: str,
    constraint_in: ConstraintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # User can set their own, or Admin can set for anyone
    if current_user.role != RoleEnum.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot create constraints for other staff members")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_constraint = AvailabilityConstraint(
        user_id=user_id,
        date=constraint_in.date,
        start_time=constraint_in.start_time,
        end_time=constraint_in.end_time,
        constraint_type=constraint_in.constraint_type,
        reason=constraint_in.reason,
    )
    db.add(new_constraint)
    db.commit()
    db.refresh(new_constraint)
    return new_constraint


@router.delete("/constraints/{constraint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_constraint(
    constraint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(AvailabilityConstraint).filter(AvailabilityConstraint.id == constraint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Constraint not found")

    if current_user.role != RoleEnum.ADMIN and current_user.id != c.user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db.delete(c)
    db.commit()
    return None
