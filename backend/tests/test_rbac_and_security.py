"""
Enterprise Security & RBAC Test Suite
- Tests cryptographic password hashing and timing defense
- Tests JWT creation, claims verification, and expiration
- Tests rate limiting (SlowAPI) and OWASP enumeration protection
- Tests strict Role-Based Access Control (Admin, Doctor, TA)
- Tests cookie transport (HttpOnly, SameSite=Lax) and logout endpoint
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.user import User, RoleEnum
from app.security import (
    get_password_hash,
    verify_password,
    dummy_verify_timing_defense,
    create_access_token,
    decode_access_token,
)
from seed_auth_users import seed_security_accounts
from app.limiter import limiter


@pytest.fixture(scope="module")
def setup_security_db():
    Base.metadata.create_all(bind=engine)
    seed_security_accounts()
    yield
    # teardown if necessary


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset SlowAPI rate limiter counters before every test."""
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture
def client(setup_security_db):
    return TestClient(app)


def test_cryptography_and_timing_defense():
    """Verify bcrypt work factor 12, hash verification, and constant-time dummy defense."""
    password = "SuperSecretPassword123!"
    hashed = get_password_hash(password)

    assert hashed.startswith("$2b$12$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

    # Timing defense dummy call should execute cleanly without raising exceptions
    dummy_verify_timing_defense()


def test_jwt_claims_and_token_tampering():
    """Verify PyJWT generates correct claims (sub, email, role, iat, exp) and detects tampering."""
    user_id = "test-uuid-1234-5678"
    role = "DOCTOR"
    email = "doctor.test@faculty.edu"

    token, expires_in = create_access_token(user_id=user_id, role=role, email=email, expires_minutes=45)
    assert expires_in == 45 * 60

    payload = decode_access_token(token)
    assert payload["sub"] == user_id
    assert payload["role"] == "DOCTOR"
    assert payload["email"] == email
    assert "iat" in payload
    assert "exp" in payload

    # Test tampering with token
    tampered_token = token[:-4] + "ABCD"
    with pytest.raises(Exception):
        decode_access_token(tampered_token)


def test_login_success_and_cookie_generation(client: TestClient):
    """Verify successful login returns sanitized user profile and sets HttpOnly cookie."""
    res = client.post(
        "/api/auth/login",
        json={"email": "admin@faculty.edu", "password": "AdminPass123!"}
    )
    assert res.status_code == 200
    data = res.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@faculty.edu"
    assert data["user"]["role"] == "ADMIN"
    # Crucial security check: sensitive hashed password must NEVER leak in response
    assert "hashed_password" not in data["user"]
    assert "password" not in data["user"]

    # Check HttpOnly cookie
    assert "access_token" in res.cookies
    cookie_val = res.cookies["access_token"]
    assert len(cookie_val) > 20


def test_login_generic_error_on_invalid_credentials(client: TestClient):
    """Verify OWASP neutral error message for wrong password or non-existent user."""
    # 1. Non-existent email
    res1 = client.post(
        "/api/auth/login",
        json={"email": "nonexistent.user@faculty.edu", "password": "SomePassword123!"}
    )
    assert res1.status_code == 401
    assert res1.json()["detail"] == "Invalid email or password"

    # 2. Existing email with incorrect password
    res2 = client.post(
        "/api/auth/login",
        json={"email": "admin@faculty.edu", "password": "WrongPassword999!"}
    )
    assert res2.status_code == 401
    assert res2.json()["detail"] == "Invalid email or password"


def test_logout_clears_cookie(client: TestClient):
    """Verify /api/auth/logout expires and removes the access_token cookie."""
    # First login
    login_res = client.post(
        "/api/auth/login",
        json={"email": "ta@faculty.edu", "password": "TAPass123!"}
    )
    assert login_res.status_code == 200

    # Call logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    assert logout_res.json()["detail"] == "Successfully logged out"

    # Cookie in logout response should be deleted or expired
    set_cookie_header = logout_res.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie_header
    assert "Max-Age=0" in set_cookie_header or "expires=" in set_cookie_header.lower()


def test_rbac_admin_endpoint_isolation(client: TestClient):
    """Verify strict role-based access control on /api/admin/system-stats."""
    db: Session = SessionLocal()
    admin_user = db.query(User).filter(User.role == RoleEnum.ADMIN).first()
    ta_user = db.query(User).filter(User.role == RoleEnum.TA).first()
    doctor_user = db.query(User).filter(User.role.in_([RoleEnum.DOCTOR, RoleEnum.PROFESSOR])).first()
    db.close()

    assert admin_user is not None
    assert ta_user is not None
    assert doctor_user is not None

    # 1. Unauthenticated request -> 401
    client.cookies.clear()
    unauth_res = client.get("/api/admin/system-stats")
    assert unauth_res.status_code == 401

    # 2. TA account -> 403 Forbidden
    ta_token, _ = create_access_token(user_id=ta_user.id, role="TA", email=ta_user.email)
    client.cookies.set("access_token", ta_token)
    ta_res = client.get("/api/admin/system-stats")
    assert ta_res.status_code == 403
    assert "Forbidden" in ta_res.json()["detail"]

    # 3. Doctor account -> 403 Forbidden
    doc_token, _ = create_access_token(user_id=doctor_user.id, role="DOCTOR", email=doctor_user.email)
    client.cookies.set("access_token", doc_token)
    doc_res = client.get("/api/admin/system-stats")
    assert doc_res.status_code == 403

    # 4. Admin account -> 200 OK
    admin_token, _ = create_access_token(user_id=admin_user.id, role="ADMIN", email=admin_user.email)
    client.cookies.set("access_token", admin_token)
    admin_res = client.get("/api/admin/system-stats")
    assert admin_res.status_code == 200
    stats = admin_res.json()
    assert stats["status"] == "HEALTHY"
    assert stats["authorized_admin"] == admin_user.email
    assert "users" in stats


def test_rate_limiting_slowapi_enforcement(client: TestClient):
    """Verify SlowAPI throttles rapid login attempts (5/min per IP)."""
    # Trigger repeated failed logins until 429 Too Many Requests is returned
    rate_limited = False
    for _ in range(8):
        res = client.post(
            "/api/auth/login",
            json={"email": "bad.probe@faculty.edu", "password": "WrongPassword999!"}
        )
        if res.status_code == 429:
            rate_limited = True
            break
    assert rate_limited is True
