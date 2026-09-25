from datetime import datetime, timezone, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.database.models import User, Student, AttendanceSession, AttendanceRecord, Subject
from app.schemas.attendance import AttendanceRecordResponse
from app.api.deps import get_current_student

router = APIRouter(prefix="/student-portal", tags=["Student Portal (Read-Only)"])

@router.get("/dashboard")
def get_student_dashboard(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Returns personalized profile metrics and attendance summary for the authenticated student.
    Strictly isolated to their own records.
    """
    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id)
        .order_by(desc(AttendanceRecord.created_at))
        .all()
    )

    present_count = sum(1 for r in records if r.status == "PRESENT")
    late_count = sum(1 for r in records if r.status == "LATE")
    absent_count = sum(1 for r in records if r.status == "ABSENT")
    total_sessions = len(records)
    attended = present_count + late_count
    att_pct = round((attended / total_sessions) * 100.0, 1) if total_sessions > 0 else 0.0

    # Subject-wise attendance calculation
    subject_map = {}
    for r in records:
        sub_name = r.session.subject.name if r.session and r.session.subject else "General"
        sub_code = r.session.subject.code if r.session and r.session.subject else "GEN"
        if sub_code not in subject_map:
            subject_map[sub_code] = {"name": sub_name, "code": sub_code, "total": 0, "present": 0, "late": 0}
        subject_map[sub_code]["total"] += 1
        if r.status == "PRESENT":
            subject_map[sub_code]["present"] += 1
        elif r.status == "LATE":
            subject_map[sub_code]["late"] += 1

    subject_wise = []
    for code, data in subject_map.items():
        sub_att = data["present"] + data["late"]
        sub_pct = round((sub_att / data["total"]) * 100.0, 1) if data["total"] > 0 else 0.0
        subject_wise.append({
            "code": data["code"],
            "name": data["name"],
            "total": data["total"],
            "present": data["present"],
            "late": data["late"],
            "percentage": sub_pct
        })

    # Recent attendance items
    recent_items = []
    for r in records[:10]:
        recent_items.append({
            "id": r.id,
            "date": r.session.date if r.session else "",
            "subject": r.session.subject.name if r.session and r.session.subject else "General",
            "session_title": r.session.title if r.session else "Session",
            "check_in": r.check_in_time.strftime("%I:%M %p") if r.check_in_time else "--",
            "check_out": r.check_out_time.strftime("%I:%M %p") if r.check_out_time else "--",
            "duration": f"{r.duration_minutes} mins" if r.duration_minutes else "--",
            "status": r.status
        })

    return {
        "profile": {
            "id": student.id,
            "student_id": student.student_id,
            "roll_number": student.roll_number,
            "full_name": student.full_name,
            "email": student.user.email,
            "phone": student.user.phone,
            "department": student.department,
            "batch_year": student.batch_year,
            "face_registered": student.face_registered
        },
        "stats": {
            "attendance_percentage": att_pct,
            "total_sessions": total_sessions,
            "present_count": present_count,
            "absent_count": absent_count,
            "late_count": late_count
        },
        "subject_wise": subject_wise,
        "recent_attendance": recent_items
    }

@router.get("/attendance-history")
def get_student_attendance_history(
    subject_code: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=200),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Returns full attendance log for the current student.
    """
    query = (
        db.query(AttendanceRecord)
        .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
        .filter(AttendanceRecord.student_id == student.id)
        .order_by(desc(AttendanceSession.date), desc(AttendanceRecord.created_at))
    )

    if status_filter:
        query = query.filter(AttendanceRecord.status == status_filter.upper())

    if subject_code:
        query = query.join(Subject, AttendanceSession.subject_id == Subject.id).filter(Subject.code == subject_code)

    records = query.limit(limit).all()

    return [
        {
            "id": r.id,
            "date": r.session.date if r.session else "",
            "subject_name": r.session.subject.name if r.session and r.session.subject else "General",
            "subject_code": r.session.subject.code if r.session and r.session.subject else "GEN",
            "session_title": r.session.title if r.session else "Session",
            "session_type": r.session.session_type if r.session else "REGULAR",
            "check_in": r.check_in_time.strftime("%I:%M %p") if r.check_in_time else "--",
            "check_out": r.check_out_time.strftime("%I:%M %p") if r.check_out_time else "--",
            "duration": f"{r.duration_minutes} mins" if r.duration_minutes else "--",
            "status": r.status,
            "verified_by_biometrics": r.verified_by_biometrics
        }
        for r in records
    ]
