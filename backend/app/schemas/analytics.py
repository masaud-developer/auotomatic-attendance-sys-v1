from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class DailyTrendItem(BaseModel):
    date: str
    present: int
    late: int
    absent: int
    percentage: float

class SubjectStat(BaseModel):
    subject_id: int
    subject_code: str
    subject_name: str
    total_sessions: int
    total_present: int
    total_late: int
    attendance_rate: float

class StatusDistribution(BaseModel):
    present: int
    late: int
    absent: int
    total: int

class DashboardStats(BaseModel):
    total_students: int
    active_students: int
    inactive_students: int
    today_present: int
    today_absent: int
    today_late: int
    overall_attendance_rate: float
    active_session: Optional[Dict[str, Any]] = None
    recent_activity: List[Dict[str, Any]] = []
    system_status: Dict[str, Any] = {
        "camera": "Ready",
        "biometrics_engine": "Online",
        "database": "Connected",
        "api": "Healthy"
    }

class StudentAttendanceSummary(BaseModel):
    student_id: int
    student_code: str
    roll_number: str
    full_name: str
    total_sessions: int
    present_count: int
    late_count: int
    absent_count: int
    attendance_percentage: float
    subject_wise: List[Dict[str, Any]] = []
