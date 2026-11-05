"""
Authentication Service Adapter wrapping security primitives.
"""
from typing import Optional, Dict, Any
from datetime import timedelta

from app.security import (
    pwd_context,
    verify_password,
    get_password_hash,
    dummy_verify_timing_defense,
    create_access_token as sec_create_token,
    decode_access_token as sec_decode_token,
)
from app.schemas.auth import TokenData


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    user_id = data.get("sub", "")
    role = data.get("role", "TA")
    email = data.get("email", user_id if "@" in str(user_id) else "")
    minutes = int(expires_delta.total_seconds() // 60) if expires_delta else 60
    token, _ = sec_create_token(user_id=user_id, role=role, email=email, expires_minutes=minutes)
    return token


def decode_access_token(token: str) -> Optional[TokenData]:
    try:
        payload = sec_decode_token(token)
        return TokenData(
            sub=str(payload.get("sub")),
            email=payload.get("email"),
            role=payload.get("role")
        )
    except Exception:
        return None
