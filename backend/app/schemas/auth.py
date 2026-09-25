from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
import re

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    email: str
    student_id: Optional[str] = None
    full_name: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email, 10-digit Phone number, or Student ID")
    password: str = Field(..., min_length=4)

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class AdminSetupRequest(BaseModel):
    email: EmailStr
    phone: str
    full_name: str
    password: str = Field(..., min_length=6)
    institution_name: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) != 10:
            raise ValueError("Phone number must be exactly 10 digits.")
        return cleaned

class UserResponse(BaseModel):
    id: int
    email: str
    phone: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
