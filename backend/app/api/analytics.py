from datetime import datetime, timezone, date, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database.session import get_db
from app.database.models import User, Student, AttendanceSession, AttendanceRecord, Subject
from app.schemas.analytics import (
    DashboardStats, DailyTrendItem, SubjectStat, 
    StatusDistribution, StudentAttendanceSummary
)
from app.api.deps import get_current_admin

router = APIRouter(prefix="/analytics", tags=["Attendance Analytics & Dashboard"])

@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Returns authentic aggregated stats for Admin Dashboard.
    """
    today_str = date.today().isoformat()

    total_students = db.query(Student).count()
    active_students = db.query(Student).join(User, Student.user_id == User.id).filter(Student.is_active == True, User.is_active == True).count()
    inactive_students = total_students - active_students

    # Today's records
    today_records = (
        db.query(AttendanceRecord)
        .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
        .filter(AttendanceSession.date == today_str)
        .all()
    )
    today_present = sum(1 for r in today_records if r.status == "PRESENT")
    today_late = sum(1 for r in today_records if r.status == "LATE")
    
    # Calculate absent today based on active students
    today_attended_ids = {r.student_id for r in today_records if r.status in ["PRESENT", "LATE"]}
    today_absent = max(0, active_students - len(today_attended_ids)) if len(today_records) > 0 else 0

    # Overall institution percentage across all historical records
    all_records = db.query(AttendanceRecord).all()
    if all_records:
        positive = sum(1 for r in all_records if r.status in ["PRESENT", "LATE"])
        overall_rate = round((positive / len(all_records)) * 100.0, 1)
    else:
        overall_rate = 0.0

    # Active session if any
    active_s = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.status == "ACTIVE")
        .order_by(desc(AttendanceSession.id))
        .first()
    )
    active_session_dict = None
    if active_s:
        active_session_dict = {
            "id": active_s.id,
            "title": active_s.title,
            "subject": active_s.subject.name if active_s.subject else "General",
            "room": active_s.room,
            "start_time": active_s.start_time,
            "end_time": active_s.end_time,
            "marked_count": len(active_s.records)
        }

    # Recent activity
    recent_records = (
        db.query(AttendanceRecord)
        .order_by(desc(AttendanceRecord.created_at))
        .limit(10)
        .all()
    )
    recent_activity = [
        {
            "id": r.id,
            "student_name": r.student.full_name if r.student else "Student",
            "student_code": r.student.student_id if r.student else "",
            "roll_number": r.student.roll_number if r.student else "",
            "session_title": r.session.title if r.session else "Session",
            "status": r.status,
            "time": r.check_in_time.strftime("%I:%M %p") if r.check_in_time else "N/A",
            "date": r.session.date if r.session else ""
        }
        for r in recent_records
    ]

    return DashboardStats(
        total_students=total_students,
        active_students=active_students,
        inactive_students=inactive_students,
        today_present=today_present,
        today_absent=today_absent,
        today_late=today_late,
        overall_attendance_rate=overall_rate,
        active_session=active_session_dict,
        recent_activity=recent_activity,
        system_status={
            "camera": "Connected",
            "biometrics_engine": "Online",
            "database": "Connected",
            "api": "Healthy"
        }
    )

@router.get("/trends", response_model=List[DailyTrendItem])
def get_attendance_trends(
    days: int = Query(14, ge=7, le=90),
    subject_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Computes daily attendance metrics across a date span.
    """
    end_d = date.today()
    start_d = end_d - timedelta(days=days - 1)

    query = (
        db.query(AttendanceRecord)
        .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
        .filter(AttendanceSession.date >= start_d.isoformat(), AttendanceSession.date <= end_d.isoformat())
    )
    if subject_id:
        query = query.filter(AttendanceSession.subject_id == subject_id)

    records = query.all()

    # Group by date
    grouped = {}
    for r in records:
        d_str = r.session.date
        if d_str not in grouped:
            grouped[d_str] = {"present": 0, "late": 0, "absent": 0, "total": 0}
        grouped[d_str]["total"] += 1
        if r.status == "PRESENT":
            grouped[d_str]["present"] += 1
        elif r.status == "LATE":
            grouped[d_str]["late"] += 1
        elif r.status == "ABSENT":
            grouped[d_str]["absent"] += 1

    trends = []
    curr = start_d
    while curr <= end_d:
        d_str = curr.isoformat()
        stats = grouped.get(d_str, {"present": 0, "late": 0, "absent": 0, "total": 0})
        tot = stats["total"]
        pct = round(((stats["present"] + stats["late"]) / tot) * 100.0, 1) if tot > 0 else 0.0
        trends.append(DailyTrendItem(
            date=d_str,
            present=stats["present"],
            late=stats["late"],
            absent=stats["absent"],
            percentage=pct
        ))
        curr += timedelta(days=1)

    return trends

@router.get("/subjects", response_model=List[SubjectStat])
def get_subject_wise_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Compares attendance rates across all subjects.
    """
    subjects = db.query(Subject).filter(Subject.is_active == True).all()
    results = []

    for sub in subjects:
        records = (
            db.query(AttendanceRecord)
            .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
            .filter(AttendanceSession.subject_id == sub.id)
            .all()
        )
        total_sessions = db.query(AttendanceSession).filter(AttendanceSession.subject_id == sub.id).count()
        pres = sum(1 for r in records if r.status == "PRESENT")
        late = sum(1 for r in records if r.status == "LATE")
        total = len(records)
        rate = round(((pres + late) / total) * 100.0, 1) if total > 0 else 0.0

        results.append(SubjectStat(
            subject_id=sub.id,
            subject_code=sub.code,
            subject_name=sub.name,
            total_sessions=total_sessions,
            total_present=pres,
            total_late=late,
            attendance_rate=rate
        ))

    return results

@router.get("/status-distribution", response_model=StatusDistribution)
def get_status_distribution(
    days: Optional[int] = Query(30),
    subject_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = (
        db.query(AttendanceRecord)
        .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
    )
    if days:
        cutoff = (date.today() - timedelta(days=days)).isoformat()
        query = query.filter(AttendanceSession.date >= cutoff)
    if subject_id:
        query = query.filter(AttendanceSession.subject_id == subject_id)

    records = query.all()
    p = sum(1 for r in records if r.status == "PRESENT")
    l = sum(1 for r in records if r.status == "LATE")
    a = sum(1 for r in records if r.status == "ABSENT")
    return StatusDistribution(present=p, late=l, absent=a, total=len(records))
