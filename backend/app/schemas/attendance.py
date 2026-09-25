from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SubjectBase(BaseModel):
    code: str
    name: str
    department: str = "General"
    semester: int = 1

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=128)
    subject_id: Optional[int] = None
    custom_subject_name: Optional[str] = None
    session_type: str = "REGULAR_CHECK_IN"
    date: str = Field(..., description="YYYY-MM-DD")
    start_time: str = Field(..., description="HH:MM")
    end_time: str = Field(..., description="HH:MM")
    room: str = Field(default="Room 101")
    late_threshold_minutes: int = Field(default=15, ge=0, le=180)
    attendance_mode: str = Field(default="CHECK_IN")  # CHECK_IN, CHECK_OUT, BOTH
    auto_start: bool = Field(default=False)

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None  # SCHEDULED, ACTIVE, COMPLETED
    end_time: Optional[str] = None
    room: Optional[str] = None

class SessionResponse(BaseModel):
    id: int
    title: str
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    session_type: str
    date: str
    start_time: str
    end_time: str
    room: str
    late_threshold_minutes: int
    attendance_mode: str
    status: str
    created_at: datetime
    # Counts
    total_marked: int = 0
    present_count: int = 0
    late_count: int = 0
    absent_count: int = 0

    class Config:
        from_attributes = True

class AttendanceRecordResponse(BaseModel):
    id: int
    session_id: int
    session_title: Optional[str] = None
    session_date: Optional[str] = None
    subject_name: Optional[str] = None
    student_id: int
    student_code: str  # STU-2026-000124
    roll_number: str
    student_name: str
    student_email: Optional[str] = None
    student_phone: Optional[str] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: str  # PRESENT, LATE, ABSENT
    verified_by_biometrics: bool
    confidence_score: Optional[float] = None
    is_manual_override: bool = False
    override_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceOverrideRequest(BaseModel):
    new_status: str = Field(..., description="PRESENT, LATE, or ABSENT")
    reason: str = Field(..., min_length=4, description="Mandatory audit explanation for manual modification")

class AbsentStudentItem(BaseModel):
    student_id: int
    student_code: str
    roll_number: str
    full_name: str
    email: str
    phone: str
    department: str
    session_id: int
    session_title: str
    subject_name: Optional[str] = None
    status: str = "ABSENT"

class LateStudentItem(BaseModel):
    student_id: int
    student_code: str
    roll_number: str
    full_name: str
    session_id: int
    session_title: str
    scheduled_start: str
    actual_arrival: str
    minutes_late: int
    status: str = "LATE"
