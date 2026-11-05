from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import RoleEnum
from app.schemas.constraint import ConstraintOut


class UserBase(BaseModel):
    staff_id: str
    email: EmailStr
    full_name: str
    role: RoleEnum
    department: str
    title: Optional[str] = None
    phone: Optional[str] = None
    is_master_student: bool = False
    max_daily_shifts: int = 2
    max_total_shifts: int = 6
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[RoleEnum] = None
    department: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    is_master_student: Optional[bool] = None
    max_daily_shifts: Optional[int] = None
    max_total_shifts: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserOut(UserBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)



class UserDetail(UserOut):
    constraints: List[ConstraintOut] = []
    total_assigned_shifts: int = 0
    total_assigned_hours: float = 0.0
