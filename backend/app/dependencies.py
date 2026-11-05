"""
FastAPI Enterprise Authentication & RBAC Dependencies
- Cookie-based HttpOnly JWT extraction with Authorization header fallback
- Reusable role gatekeepers (Admin, Doctor, TA)
- Active account verification
"""
from typing import List, Optional
import jwt
from fastapi import Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, RoleEnum
from app.security import decode_access_token


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    auth_header: Optional[str] = Header(None, alias="Authorization"),
) -> User:
    """
    Extracts and cryptographically validates the JWT access token from:
    1. HttpOnly 'access_token' cookie (primary secure transport)
    2. 'Authorization: Bearer <token>' header (API / programmatic fallback)
    Verifies user status, active state, and cryptographic signature.
    """
    token: Optional[str] = None

    # 1. Primary: Extract from secure HttpOnly cookie
    if "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    # 2. Fallback: Extract from Authorization Bearer header
    if not token and auth_header:
        parts = auth_header.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token claims",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token signature",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact the Exam Committee.",
        )

    return user


def require_role(allowed_roles: List[RoleEnum]):
    """
    Higher-order dependency enforcing strict Role-Based Access Control (RBAC).
    Returns HTTP 403 Forbidden with sanitized neutral error message if user lacks permission.
    """
    def role_verifier(current_user: User = Depends(get_current_user)) -> User:
        user_role_str = str(current_user.role.value if hasattr(current_user.role, "value") else current_user.role).upper()
        allowed_strs = [
            str(r.value if hasattr(r, "value") else r).upper()
            for r in allowed_roles
        ]

        # Handle DOCTOR <-> PROFESSOR equivalence
        is_allowed = user_role_str in allowed_strs
        if not is_allowed:
            if "DOCTOR" in allowed_strs and user_role_str in ("DOCTOR", "PROFESSOR"):
                is_allowed = True
            elif "PROFESSOR" in allowed_strs and user_role_str in ("DOCTOR", "PROFESSOR"):
                is_allowed = True

        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Insufficient privileges to access this resource",
            )
        return current_user

    return role_verifier


# Concrete Dependency Callables
require_admin = require_role([RoleEnum.ADMIN])
require_doctor = require_role([RoleEnum.ADMIN, RoleEnum.DOCTOR])
require_ta = require_role([RoleEnum.ADMIN, RoleEnum.TA])
require_authenticated = get_current_user
