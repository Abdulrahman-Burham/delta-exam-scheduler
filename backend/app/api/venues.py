from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_role
from app.models.user import User, RoleEnum
from app.models.venue import Venue
from app.schemas.venue import VenueCreate, VenueUpdate, VenueOut

router = APIRouter(prefix="/venues", tags=["Examination Venues"])


@router.get("", response_model=List[VenueOut])
def get_venues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Venue).filter(Venue.is_active == True).order_by(Venue.building, Venue.name).all()


@router.post("", response_model=VenueOut, status_code=status.HTTP_201_CREATED)
def create_venue(
    venue_in: VenueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    if db.query(Venue).filter(Venue.name == venue_in.name).first():
        raise HTTPException(status_code=400, detail="Venue with this name already exists")

    new_venue = Venue(
        name=venue_in.name,
        venue_type=venue_in.venue_type,
        building=venue_in.building,
        floor=venue_in.floor,
        capacity=venue_in.capacity,
        is_active=venue_in.is_active,
    )
    db.add(new_venue)
    db.commit()
    db.refresh(new_venue)
    return new_venue


@router.put("/{venue_id}", response_model=VenueOut)
def update_venue(
    venue_id: int,
    venue_in: VenueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    for field, value in venue_in.model_dump(exclude_unset=True).items():
        setattr(venue, field, value)

    db.commit()
    db.refresh(venue)
    return venue


@router.delete("/{venue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_venue(
    venue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.ADMIN]))
):
    venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    venue.is_active = False
    db.commit()
    return None
