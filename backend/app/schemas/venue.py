from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.venue import VenueTypeEnum


class VenueBase(BaseModel):
    name: str
    venue_type: VenueTypeEnum = VenueTypeEnum.HALL
    building: str
    floor: int = 1
    capacity: int
    is_active: bool = True


class VenueCreate(VenueBase):
    pass


class VenueUpdate(BaseModel):
    name: Optional[str] = None
    venue_type: Optional[VenueTypeEnum] = None
    building: Optional[str] = None
    floor: Optional[int] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None


class VenueOut(VenueBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

