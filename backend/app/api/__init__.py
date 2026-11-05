from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.users import router as users_router
from app.api.venues import router as venues_router
from app.api.exams import router as exams_router
from app.api.schedules import router as schedules_router
from app.api.exports import router as exports_router
from app.api.analytics import router as analytics_router

__all__ = [
    "auth_router",
    "admin_router",
    "users_router",
    "venues_router",
    "exams_router",
    "schedules_router",
    "exports_router",
    "analytics_router",
]
