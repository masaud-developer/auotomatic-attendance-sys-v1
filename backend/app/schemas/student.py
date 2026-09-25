from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re

class StudentCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=128)
    email: EmailStr
    phone: str
    roll_number: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=6)
    department: str = Field(default="Computer Science & Engineering")
    batch_year: int = Field(default=2026)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) != 10:
            raise ValueError("Phone number must be exactly 10 digits for Indian phone numbers.")
        return cleaned

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        if any(char.isdigit() for char in v):
            raise ValueError("Name cannot contain numbers.")
        return v

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    roll_number: Optional[str] = None
    department: Optional[str] = None
    batch_year: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) != 10:
            raise ValueError("Phone number must be exactly 10 digits.")
        return cleaned

class StudentResponse(BaseModel):
    id: int
    user_id: int
    student_id: str
    roll_number: str
    full_name: str
    email: str
    phone: str
    department: str
    batch_year: int
    face_registered: bool
    is_active: bool
    created_at: datetime
    # Aggregated fields for table display
    today_status: Optional[str] = "ABSENT"
    attendance_percentage: float = 0.0
    total_sessions: int = 0
    present_count: int = 0
    absent_count: int = 0
    late_count: int = 0

    class Config:
        from_attributes = True

class StudentDetailResponse(StudentResponse):
    recent_sessions: List[dict] = []
    face_samples_count: int = 0
