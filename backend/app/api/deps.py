"""
Dependency exports adapter for existing routes and endpoints.
"""
from typing import Generator, List
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.user import User, RoleEnum
from app.dependencies import (
    get_current_user,
    require_role,
    require_admin,
    require_doctor,
    require_ta,
    require_authenticated,
)

__all__ = [
    "get_db",
    "SessionLocal",
    "User",
    "RoleEnum",
    "get_current_user",
    "require_role",
    "require_admin",
    "require_doctor",
    "require_ta",
    "require_authenticated",
]
