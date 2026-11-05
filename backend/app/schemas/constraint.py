from datetime import date as DateType, time as TimeType
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.constraint import ConstraintTypeEnum


class ConstraintBase(BaseModel):
    user_id: str
    date: DateType
    start_time: Optional[TimeType] = None
    end_time: Optional[TimeType] = None
    constraint_type: ConstraintTypeEnum = ConstraintTypeEnum.UNAVAILABLE
    reason: Optional[str] = None


class ConstraintCreate(ConstraintBase):
    pass


class ConstraintOut(ConstraintBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

