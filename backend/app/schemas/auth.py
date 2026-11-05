from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.user import RoleEnum


class LoginRequest(BaseModel):
    """
    Hardened login payload schema with domain constraint and input sanitization.
    """
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128, description="User password")

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not clean:
            raise ValueError("Email cannot be empty")
        return clean

    @field_validator("password")
    @classmethod
    def validate_password_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Password cannot be blank")
        return v


class UserResponse(BaseModel):
    """
    Sanitized user representation preventing data leakage of hashed credentials.
    """
    id: str
    staff_id: Optional[str] = None
    email: EmailStr
    full_name: str
    role: RoleEnum
    department: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    is_master_student: bool = False
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """
    Signed JWT access token response with role metadata.
    """
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    # Backwards compatibility fields
    role: Optional[RoleEnum] = None
    user_id: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    staff_id: Optional[str] = None
    department: Optional[str] = None


class MessageResponse(BaseModel):
    detail: str


# Backward compatibility schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    staff_id: str
    email: str
    full_name: str
    role: RoleEnum
    department: str
    user: Optional[UserResponse] = None


class TokenData(BaseModel):
    sub: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
