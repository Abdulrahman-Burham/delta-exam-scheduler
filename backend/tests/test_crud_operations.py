"""
End-to-End CRUD Operations Test Suite
- Staff (Doctors & Teaching Assistants) lifecycle: Create, Read, Update, Delete (Soft-delete)
- Venues (Halls & Labs) lifecycle
- Exam Sessions lifecycle
"""
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.user import User, RoleEnum
from app.models.venue import Venue, VenueTypeEnum
from app.models.exam import ExamSession
from app.security import create_access_token


@pytest.fixture(scope="module")
def admin_headers():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    admin = db.query(User).filter(User.role == RoleEnum.ADMIN).first()
    if not admin:
        admin = User(
            id=str(uuid.uuid4()),
            staff_id="ADMIN-TEST",
            email="admin.crud@faculty.edu",
            hashed_password="hashed_pass",
            full_name="Admin CRUD Tester",
            role=RoleEnum.ADMIN,
            department="AI",
            is_active=True,
        )
        db.add(admin)
        db.commit()
    admin_id = admin.id
    admin_email = admin.email
    db.close()

    token, _ = create_access_token(user_id=admin_id, role="ADMIN", email=admin_email)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client():
    return TestClient(app)


def test_staff_crud_lifecycle(client: TestClient, admin_headers: dict):
    """Test full CRUD lifecycle for teaching staff (Doctor/TA)."""
    # 1. Create Staff
    create_payload = {
        "staff_id": f"TEST-TA-{uuid.uuid4().hex[:6]}",
        "email": f"ta.{uuid.uuid4().hex[:6]}@deltauniv.edu.eg",
        "password": "SecurePassword123!",
        "full_name": "Eng. Test Invigilator (م. مراقب اختباري)",
        "role": "TA",
        "department": "Faculty of Artificial Intelligence",
        "title": "Teaching Assistant",
        "phone": "+20 100 123 4567",
        "is_master_student": False,
        "max_daily_shifts": 3,
        "max_total_shifts": 20,
    }

    create_res = client.post("/api/users", json=create_payload, headers=admin_headers)
    assert create_res.status_code == 201, create_res.text
    created_user = create_res.json()
    user_id = created_user["id"]
    assert created_user["email"] == create_payload["email"].lower()
    assert created_user["role"] == "TA"

    # 2. Read Staff Detail
    get_res = client.get(f"/api/users/{user_id}", headers=admin_headers)
    assert get_res.status_code == 200
    user_detail = get_res.json()
    assert user_detail["id"] == user_id
    assert user_detail["full_name"] == create_payload["full_name"]

    # 3. Update Staff
    update_payload = {
        "full_name": "Eng. Test Invigilator Updated",
        "phone": "+20 100 999 8888",
        "is_master_student": True,
    }
    put_res = client.put(f"/api/users/{user_id}", json=update_payload, headers=admin_headers)
    assert put_res.status_code == 200
    updated_user = put_res.json()
    assert updated_user["full_name"] == "Eng. Test Invigilator Updated"
    assert updated_user["is_master_student"] is True

    # 4. Soft Delete Staff
    del_res = client.delete(f"/api/users/{user_id}", headers=admin_headers)
    assert del_res.status_code == 204

    # Verify inactive
    recheck_res = client.get(f"/api/users/{user_id}", headers=admin_headers)
    assert recheck_res.status_code == 200
    assert recheck_res.json()["is_active"] is False


def test_venue_crud_lifecycle(client: TestClient, admin_headers: dict):
    """Test creating and listing examination venues (Halls & Computer Labs)."""
    venue_payload = {
        "name": f"New Testing Lab {uuid.uuid4().hex[:4]}",
        "venue_type": "LAB",
        "building": "AI Technology Hub",
        "floor": 4,
        "capacity": 45,
    }

    # 1. Create Venue
    create_res = client.post("/api/venues", json=venue_payload, headers=admin_headers)
    assert create_res.status_code == 201
    venue = create_res.json()
    assert venue["name"] == venue_payload["name"]
    assert venue["capacity"] == 45

    # 2. List Venues
    list_res = client.get("/api/venues", headers=admin_headers)
    assert list_res.status_code == 200
    venues = list_res.json()
    assert any(v["name"] == venue_payload["name"] for v in venues)


def test_exam_session_crud_lifecycle(client: TestClient, admin_headers: dict):
    """Test creating and listing scheduled exam sessions."""
    # First get a venue
    venues_res = client.get("/api/venues", headers=admin_headers)
    assert venues_res.status_code == 200
    venues = venues_res.json()
    assert len(venues) > 0
    venue_id = venues[0]["id"]

    exam_payload = {
        "course_code": f"AI-{uuid.uuid4().hex[:4].upper()}",
        "course_name": "Autonomous Intelligent Robotics",
        "department": "Artificial Intelligence",
        "date": "2026-11-25",
        "start_time": "09:00:00",
        "end_time": "11:00:00",
        "student_headcount": 40,
        "venue_id": venue_id,
        "required_professors": 1,
        "required_tas": 2,
    }

    # 1. Create Exam Session
    create_res = client.post("/api/exams", json=exam_payload, headers=admin_headers)
    assert create_res.status_code == 201
    exam = create_res.json()
    assert exam["course_name"] == exam_payload["course_name"]
    assert exam["required_tas"] == 2

    # 2. List Exam Sessions
    list_res = client.get("/api/exams", headers=admin_headers)
    assert list_res.status_code == 200
    exams = list_res.json()
    assert any(e["course_code"] == exam_payload["course_code"] for e in exams)

    # 3. Delete Exam Session
    session_id = exam["id"]
    del_res = client.delete(f"/api/exams/{session_id}", headers=admin_headers)
    assert del_res.status_code == 204


def test_assignment_add_and_remove_lifecycle(client: TestClient, admin_headers: dict):
    """Test manually assigning a proctor to an exam session and removing them with conflict validation."""
    # Ensure an active schedule run exists
    client.post(
        "/api/schedules/generate",
        headers=admin_headers,
        json={
            "workload_balance_weight": 50,
            "rest_interval_weight": 30,
            "building_proximity_weight": 20,
            "department_match_weight": 40,
            "honor_existing_locks": True,
        },
    )

    # Fetch users and exams
    users_res = client.get("/api/users", headers=admin_headers)
    assert users_res.status_code == 200
    users = [u for u in users_res.json() if u["role"] == "TA"]
    assert len(users) > 0
    test_user = users[0]

    exams_res = client.get("/api/exams", headers=admin_headers)
    assert exams_res.status_code == 200
    exams = exams_res.json()
    assert len(exams) > 0
    test_exam = exams[0]

    # 1. Add assignment
    assign_payload = {
        "exam_session_id": test_exam["id"],
        "user_id": test_user["id"],
        "role_in_exam": "INVIGILATOR_TA",
        "is_locked": True,
        "override_notes": "Automated test assignment",
    }
    add_res = client.post("/api/schedules/assignments", json=assign_payload, headers=admin_headers)
    # Could be 201 or 400 if user already has an overlap on that session
    if add_res.status_code == 400:
        # Expected conflict if already assigned
        assert "already assigned" in add_res.json()["detail"]
    else:
        assert add_res.status_code == 201
        created_assignment = add_res.json()
        assert created_assignment["user_id"] == test_user["id"]
        assignment_id = created_assignment["id"]

        # Conflict check: Attempting to assign again to the exact same session or overlapping session must fail
        dup_res = client.post("/api/schedules/assignments", json=assign_payload, headers=admin_headers)
        assert dup_res.status_code == 400

        # 2. Remove assignment
        del_res = client.delete(f"/api/schedules/assignments/{assignment_id}", headers=admin_headers)
        assert del_res.status_code == 204

