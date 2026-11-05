import pytest
from datetime import date, time
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, engine, SessionLocal
from app.api.deps import get_db
from app.main import app
from app.models.user import User, RoleEnum
from app.models.venue import Venue, VenueTypeEnum
from app.models.exam import ExamSession
from app.models.assignment import ScheduleRun, ScheduleAssignment, AssignmentRoleEnum
from app.services.seed_service import seed_database
from app.services.export_service import ExportService
from app.services.optimizer import InvigilationOptimizer
from app.schemas.schedule import ScheduleRunConfig


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db, force=True)
    db.close()
    yield
    # Keep db intact for local testing or clean up if needed


client = TestClient(app)


def test_auth_login_and_token():
    # Login as Admin (Dean Assoc. Prof. Dr. Hanaa Salem)
    resp = client.post("/api/auth/login", json={"email": "admin@faculty.edu", "password": "AdminPass123!"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"
    assert "Hanaa Salem" in data["full_name"]


def test_auth_demo_switcher():
    # Switch to TA Ahmed Fekry
    resp = client.post("/api/auth/switch-demo-user?email=ahmed.fekry@deltauniv.edu.eg")
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "TA"
    assert "Ahmed Fekry" in data["full_name"]


def test_schedule_generation_and_matrix_api():
    # Login as Admin
    login_resp = client.post("/api/auth/login", json={"email": "admin@faculty.edu", "password": "AdminPass123!"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Generate schedule
    gen_resp = client.post(
        "/api/schedules/generate",
        headers=headers,
        json={
            "workload_balance_weight": 60,
            "rest_interval_weight": 40,
            "building_proximity_weight": 30,
            "department_match_weight": 50,
            "honor_existing_locks": True
        }
    )
    assert gen_resp.status_code == 200
    run_data = gen_resp.json()
    assert run_data["status"] in ("OPTIMAL", "FEASIBLE", "FALLBACK_HEURISTIC")
    assert len(run_data["assignments"]) > 0

    # Fetch matrix view
    mat_resp = client.get("/api/schedules/matrix", headers=headers)
    assert mat_resp.status_code == 200
    mat_data = mat_resp.json()
    assert len(mat_data["dates"]) > 0
    assert len(mat_data["cells"]) > 0

    # Check analytics summary
    ana_resp = client.get("/api/analytics/summary", headers=headers)
    assert ana_resp.status_code == 200
    ana_data = ana_resp.json()
    assert ana_data["coverage_rate_percent"] >= 80.0
    assert ana_data["fairness_index_percent"] > 70.0


def test_document_exports():
    login_resp = client.post("/api/auth/login", json={"email": "admin@faculty.edu", "password": "AdminPass123!"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Master PDF export
    pdf_resp = client.get("/api/exports/pdf/master", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 1000  # valid PDF binary

    # 2. Personal Slip PDF export
    db = SessionLocal()
    ta_user = db.query(User).filter(User.role == RoleEnum.TA).first()
    db.close()

    slip_resp = client.get(f"/api/exports/pdf/personal/{ta_user.id}", headers=headers)
    assert slip_resp.status_code == 200
    assert slip_resp.headers["content-type"] == "application/pdf"

    # 3. iCal (.ics) export
    ics_resp = client.get(f"/api/exports/ics/{ta_user.id}", headers=headers)
    assert ics_resp.status_code == 200
    assert "BEGIN:VCALENDAR" in ics_resp.text
    assert "END:VCALENDAR" in ics_resp.text

    # 4. CSV export
    csv_resp = client.get("/api/exports/csv", headers=headers)
    assert csv_resp.status_code == 200
    assert "Assignment ID,Date,Start Time" in csv_resp.text
