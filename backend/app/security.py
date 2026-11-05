"""
Enterprise Cryptography & JWT Security Module
- OWASP Top 10 hardened password hashing with bcrypt (rounds=12)
- Side-channel timing defense for credential checks
- Cryptographically signed JWT access tokens via PyJWT
"""
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
import bcrypt
import jwt
from passlib.context import CryptContext

# Fix passlib 1.7.4 compatibility with bcrypt >= 4.0
if not hasattr(bcrypt, "__about__"):
    class BcryptAbout:
        __version__ = getattr(bcrypt, "__version__", "4.0.1")
    bcrypt.__about__ = BcryptAbout()

from app.config import settings

# Password Hashing with bcrypt (work factor 12)
pwd_context = CryptContext(
    schemes=["bcrypt"],
    bcrypt__rounds=12,
    deprecated="auto"
)

# Dummy hash for constant-time comparison to prevent timing/enumeration attacks
# when a requested user email does not exist in the database.
DUMMY_BCRYPT_HASH = pwd_context.hash("delta_university_exam_system_dummy_timing_protection_salt_2026")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Safely verifies a plain password against the stored bcrypt hash.
    Catches invalid formats gracefully.
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def dummy_verify_timing_defense() -> None:
    """
    Executes a bcrypt comparison against the static dummy hash.
    This guarantees constant-time response for authentication failures,
    preventing attackers from measuring request latency to enumerate valid faculty emails.
    """
    try:
        pwd_context.verify("unmatched_password_constant_timing_probe", DUMMY_BCRYPT_HASH)
    except Exception:
        pass


def get_password_hash(password: str) -> str:
    """
    Hashes a password with bcrypt (rounds=12).
    """
    return pwd_context.hash(password)


def create_access_token(
    user_id: str,
    role: str,
    email: str,
    expires_minutes: Optional[int] = None
) -> Tuple[str, int]:
    """
    Generates an enterprise-grade signed JWT access token.
    Claims:
      - sub: user UUIDv4
      - email: faculty email
      - role: normalized role (ADMIN, DOCTOR, TA)
      - iat: issued at timestamp (UTC)
      - exp: expiration timestamp (short-lived 30-60m)
    Returns (token_string, expires_in_seconds)
    """
    now = datetime.now(timezone.utc)
    minutes = expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    expires_at = now + timedelta(minutes=minutes)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "email": str(email).lower(),
        "role": str(role).upper(),
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    expires_in_seconds = int(minutes * 60)
    return token, expires_in_seconds


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Validates token signature and expiration, returning decoded payload claims.
    Enforces 'sub', 'role', 'iat', and 'exp' claims existence.
    Raises jwt.PyJWTError on invalid signature, malformed token, or expiration.
    """
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        options={
            "require": ["sub", "role", "iat", "exp"],
            "verify_exp": True,
            "verify_iat": True,
        }
    )


def create_password_reset_token(user_id: str, email: str, expires_minutes: int = 15) -> str:
    """
    Generates a cryptographically signed password reset token.
    Claims: sub, email, purpose='password_reset', iat, exp (15 minutes).
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expires_minutes)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "email": str(email).lower(),
        "purpose": "password_reset",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_password_reset_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a password reset token.
    Enforces signature, expiration, and purpose == 'password_reset'.
    """
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        options={
            "require": ["sub", "email", "purpose", "exp"],
            "verify_exp": True,
        }
    )
    if payload.get("purpose") != "password_reset":
        raise jwt.InvalidTokenError("Token is not valid for password reset")
    return payload
