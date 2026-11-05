"""
Hardened Authentication Router
- Rate-limited login against brute-force (slowapi: 5/minute)
- Constant-time password validation & timing side-channel mitigation
- HttpOnly, SameSite=Lax, Path-scoped cookie transport
- Safe generic error responses to prevent user enumeration
"""
import os
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, RoleEnum
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse, MessageResponse, Token
from app.schemas.user import UserOut
from app.security import (
    verify_password,
    dummy_verify_timing_defense,
    create_access_token,
)
from app.dependencies import get_current_user
from app.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])

IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate faculty credentials.
    Rate limited: max 5 attempts per minute per IP.
    Sets HttpOnly, Secure, SameSite=Lax cookie 'access_token'.
    """
    user = db.query(User).filter(User.email == login_data.email).first()

    if not user:
        # Prevent timing side-channel attack for username enumeration
        dummy_verify_timing_defense()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        # Don't leak whether the account is disabled vs wrong credentials
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate short-lived signed JWT
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    token, expires_in = create_access_token(
        user_id=user.id,
        role=role_str,
        email=user.email,
        expires_minutes=60
    )

    # Attach token in HttpOnly, SameSite=Lax cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/",
        max_age=expires_in
    )

    user_resp = UserResponse(
        id=str(user.id),
        staff_id=user.staff_id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        title=user.title,
        phone=user.phone,
        is_master_student=user.is_master_student,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=getattr(user, "updated_at", user.created_at),
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user=user_resp,
        role=user.role,
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        staff_id=user.staff_id,
        department=user.department,
    )


@router.post("/logout", response_model=MessageResponse)
def logout(response: Response):
    """
    Terminates session by expiring the HttpOnly access_token cookie.
    """
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="lax",
    )
    return MessageResponse(detail="Successfully logged out")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the sanitized identity of the authenticated user.
    """
    return UserResponse(
        id=str(current_user.id),
        staff_id=current_user.staff_id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        title=current_user.title,
        phone=current_user.phone,
        is_master_student=current_user.is_master_student,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=getattr(current_user, "updated_at", current_user.created_at),
    )


@router.post("/switch-demo-user", response_model=Token)
def switch_demo_user(
    request: Request,
    email: str,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Fast Persona Switcher for evaluation and demonstration purposes.
    Sets HttpOnly cookie and returns full token payload.
    """
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo user '{email}' not found"
        )

    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    token, expires_in = create_access_token(
        user_id=user.id,
        role=role_str,
        email=user.email,
        expires_minutes=60
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/",
        max_age=expires_in
    )

    user_resp = UserResponse(
        id=str(user.id),
        staff_id=user.staff_id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        title=user.title,
        phone=user.phone,
        is_master_student=user.is_master_student,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=getattr(user, "updated_at", user.created_at),
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=str(user.id),
        staff_id=user.staff_id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        user=user_resp
    )
