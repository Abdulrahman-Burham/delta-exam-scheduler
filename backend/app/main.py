from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import *  # import all models to ensure registered on Base
from app.services.seed_service import seed_database
from app.limiter import limiter
from app.api import (
    auth_router,
    admin_router,
    users_router,
    venues_router,
    exams_router,
    schedules_router,
    exports_router,
    analytics_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed default realistic data
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Faculty-level AI Automated Exam Invigilation Management System Scaffolding & Optimization Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Attach SlowAPI Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS with strict origin whitelisting (No wildcards)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(venues_router, prefix=settings.API_V1_STR)
app.include_router(exams_router, prefix=settings.API_V1_STR)
app.include_router(schedules_router, prefix=settings.API_V1_STR)
app.include_router(exports_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "system": "Delta University Faculty Exam Invigilation Management System",
        "version": "1.0.0",
        "docs_url": "/docs",
        "status": "OPERATIONAL",
        "security": "Hardened RBAC + SlowAPI Rate Limiting + HttpOnly Cookie Auth",
    }
