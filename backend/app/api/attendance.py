from datetime import datetime, timezone, date, timedelta
from typing import Optional, List
import io
import csv
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_, and_

from app.database.session import get_db
from app.database.models import User, Student, AttendanceSession, AttendanceRecord, Subject
from app.schemas.attendance import (
    AttendanceRecordResponse, AttendanceOverrideRequest, 
    AbsentStudentItem, LateStudentItem
)
from app.api.deps import get_current_admin, log_audit_event

router = APIRouter(prefix="/attendance", tags=["Attendance Management & Filtering"])

def parse_date_range(preset: Optional[str], custom_start: Optional[str], custom_end: Optional[str]):
    today = date.today()
    if preset == "today":
        return today.isoformat(), today.isoformat()
    elif preset == "yesterday":
        y = today - timedelta(days=1)
        return y.isoformat(), y.isoformat()
    elif preset == "this_week":
        start = today - timedelta(days=today.weekday())
        return start.isoformat(), today.isoformat()
    elif preset == "this_month":
        start = today.replace(day=1)
        return start.isoformat(), today.isoformat()
    elif preset == "custom" and custom_start and custom_end:
        return custom_start, custom_end
    return None, None

@router.get("", response_model=List[AttendanceRecordResponse])
def get_attendance_records(
    search: Optional[str] = Query(None, description="Search by student name, roll number, student ID, email, phone"),
    status_tab: Optional[str] = Query("ALL", description="ALL, PRESENT, ABSENT, LATE, CHECKED_IN, CHECKED_OUT"),
    date_preset: Optional[str] = Query(None, description="today, yesterday, this_week, this_month, custom"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    subject_id: Optional[int] = Query(None),
    session_id: Optional[int] = Query(None),
    sort_by: str = Query("check_in_time", description="check_in_time, name, roll_number, student_id"),
    order: str = Query("desc", description="asc or desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Advanced Attendance filtering & search combining tabs, date ranges, and student criteria.
    """
    query = (
        db.query(AttendanceRecord)
        .join(Student, AttendanceRecord.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
    )

    # Search filter
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Student.full_name.ilike(s),
                Student.roll_number.ilike(s),
                Student.student_id.ilike(s),
                User.email.ilike(s),
                User.phone.like(s)
            )
        )

    # Quick filter tabs
    if status_tab and status_tab != "ALL":
        stab = status_tab.upper()
        if stab == "PRESENT":
            query = query.filter(AttendanceRecord.status == "PRESENT")
        elif stab == "LATE":
            query = query.filter(AttendanceRecord.status == "LATE")
        elif stab == "ABSENT":
            query = query.filter(AttendanceRecord.status == "ABSENT")
        elif stab == "CHECKED_IN":
            query = query.filter(AttendanceRecord.check_in_time.isnot(None), AttendanceRecord.check_out_time.is_(None))
        elif stab == "CHECKED_OUT":
            query = query.filter(AttendanceRecord.check_out_time.isnot(None))

    # Date range filtering
    s_date, e_date = parse_date_range(date_preset, start_date, end_date)
    if s_date and e_date:
        query = query.filter(AttendanceSession.date >= s_date, AttendanceSession.date <= e_date)
    elif s_date:
        query = query.filter(AttendanceSession.date == s_date)

    # Subject & Session filtering
    if subject_id:
        query = query.filter(AttendanceSession.subject_id == subject_id)
    if session_id:
        query = query.filter(AttendanceRecord.session_id == session_id)

    # Sorting
    if sort_by == "name":
        query = query.order_by(desc(Student.full_name) if order == "desc" else asc(Student.full_name))
    elif sort_by == "roll_number":
        query = query.order_by(desc(Student.roll_number) if order == "desc" else asc(Student.roll_number))
    elif sort_by == "student_id":
        query = query.order_by(desc(Student.student_id) if order == "desc" else asc(Student.student_id))
    else:
        query = query.order_by(desc(AttendanceRecord.created_at) if order == "desc" else asc(AttendanceRecord.created_at))

    records = query.offset(skip).limit(limit).all()

    return [
        AttendanceRecordResponse(
            id=r.id,
            session_id=r.session_id,
            session_title=r.session.title if r.session else "Session",
            session_date=r.session.date if r.session else "",
            subject_name=r.session.subject.name if r.session and r.session.subject else "General",
            student_id=r.student_id,
            student_code=r.student.student_id if r.student else "",
            roll_number=r.student.roll_number if r.student else "",
            student_name=r.student.full_name if r.student else "",
            student_email=r.student.user.email if r.student and r.student.user else "",
            student_phone=r.student.user.phone if r.student and r.student.user else "",
            check_in_time=r.check_in_time,
            check_out_time=r.check_out_time,
            duration_minutes=r.duration_minutes,
            status=r.status,
            verified_by_biometrics=r.verified_by_biometrics,
            confidence_score=r.confidence_score,
            is_manual_override=r.is_manual_override,
            override_reason=r.override_reason,
            created_at=r.created_at
        )
        for r in records
    ]

@router.get("/absent-students", response_model=List[AbsentStudentItem])
def get_absent_students(
    session_id: Optional[int] = Query(None, description="Identify absent students for specific session"),
    date_filter: Optional[str] = Query(None, description="YYYY-MM-DD or today"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Dedicated view to identify all absent students for a chosen session or date.
    Calculates non-attendees among all active students.
    """
    target_date = date.today().isoformat() if date_filter == "today" else date_filter

    sessions_query = db.query(AttendanceSession).filter(AttendanceSession.status != "SCHEDULED")
    if session_id:
        sessions_query = sessions_query.filter(AttendanceSession.id == session_id)
    elif target_date:
        sessions_query = sessions_query.filter(AttendanceSession.date == target_date)
    else:
        # Default to latest session
        latest = db.query(AttendanceSession).order_by(desc(AttendanceSession.id)).first()
        if latest:
            sessions_query = sessions_query.filter(AttendanceSession.id == latest.id)

    target_sessions = sessions_query.all()
    if not target_sessions:
        return []

    active_students = db.query(Student).filter(Student.is_active == True).all()

    absent_list = []
    for s in target_sessions:
        # Get all students marked for this session
        marked_records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).all()
        attended_student_ids = {r.student_id for r in marked_records if r.status in ["PRESENT", "LATE"]}
        explicitly_absent_ids = {r.student_id for r in marked_records if r.status == "ABSENT"}

        for student in active_students:
            if student.id not in attended_student_ids:
                absent_list.append(AbsentStudentItem(
                    student_id=student.id,
                    student_code=student.student_id,
                    roll_number=student.roll_number,
                    full_name=student.full_name,
                    email=student.user.email,
                    phone=student.user.phone,
                    department=student.department,
                    session_id=s.id,
                    session_title=s.title,
                    subject_name=s.subject.name if s.subject else "General",
                    status="ABSENT"
                ))

    return absent_list

@router.get("/late-students", response_model=List[LateStudentItem])
def get_late_students(
    session_id: Optional[int] = Query(None),
    date_preset: Optional[str] = Query(None),
    sort_by: str = Query("most_late", description="most_late or latest_arrival"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Dedicated late student view with factual arrival times and minutes late.
    """
    query = (
        db.query(AttendanceRecord)
        .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
        .join(Student, AttendanceRecord.student_id == Student.id)
        .filter(AttendanceRecord.status == "LATE")
    )

    if session_id:
        query = query.filter(AttendanceRecord.session_id == session_id)

    s_date, e_date = parse_date_range(date_preset, None, None)
    if s_date and e_date:
        query = query.filter(AttendanceSession.date >= s_date, AttendanceSession.date <= e_date)

    records = query.all()
    late_items = []

    for r in records:
        sess = r.session
        st = r.student
        sh, sm = [int(x) for x in sess.start_time.split(":")[:2]]
        arrival_str = r.check_in_time.strftime("%I:%M %p") if r.check_in_time else "N/A"
        
        # Calculate actual minutes late
        mins_late = 0
        if r.check_in_time:
            # Scheduled time in minutes from midnight
            sched_mins = sh * 60 + sm
            arrival_mins = r.check_in_time.hour * 60 + r.check_in_time.minute
            mins_late = max(1, arrival_mins - sched_mins)

        late_items.append(LateStudentItem(
            student_id=st.id,
            student_code=st.student_id,
            roll_number=st.roll_number,
            full_name=st.full_name,
            session_id=sess.id,
            session_title=sess.title,
            scheduled_start=sess.start_time,
            actual_arrival=arrival_str,
            minutes_late=mins_late,
            status="LATE"
        ))

    if sort_by == "most_late":
        late_items.sort(key=lambda x: x.minutes_late, reverse=True)
    else:
        late_items.sort(key=lambda x: x.actual_arrival, reverse=True)

    return late_items

@router.post("/override/{id}")
def manual_attendance_override(
    id: int,
    payload: AttendanceOverrideRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Manual attendance correction:
    Never silently overwrites historical data.
    Records original status, new status, mandatory reason, changed_by, and timestamp in audit log.
    """
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found.")

    new_status = payload.new_status.upper()
    if new_status not in ["PRESENT", "LATE", "ABSENT"]:
        raise HTTPException(status_code=400, detail="Invalid status value. Must be PRESENT, LATE, or ABSENT.")

    orig_status = record.status
    record.status = new_status
    record.is_manual_override = True
    record.override_reason = payload.reason
    record.override_by_user_id = admin.id

    db.commit()

    log_audit_event(
        db,
        action="ATTENDANCE_OVERRIDE",
        user=admin,
        entity_type="AttendanceRecord",
        entity_id=record.id,
        details={
            "student_id": record.student.student_id if record.student else record.student_id,
            "session_id": record.session_id,
            "original_status": orig_status,
            "new_status": new_status,
            "reason": payload.reason
        },
        request=request
    )

    return {
        "success": True,
        "message": f"Attendance corrected from {orig_status} to {new_status}.",
        "record_id": record.id,
        "new_status": new_status
    }

@router.get("/export")
def export_attendance_csv(
    search: Optional[str] = Query(None),
    status_tab: Optional[str] = Query("ALL"),
    date_preset: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    subject_id: Optional[int] = Query(None),
    session_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Exports filtered attendance records to CSV.
    Guaranteed to respect all active filters.
    """
    records = get_attendance_records(
        search=search,
        status_tab=status_tab,
        date_preset=date_preset,
        start_date=start_date,
        end_date=end_date,
        subject_id=subject_id,
        session_id=session_id,
        sort_by="check_in_time",
        order="desc",
        skip=0,
        limit=5000,
        db=db,
        admin=admin
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record ID", "Student ID", "Roll Number", "Student Name", "Email", "Phone",
        "Session Title", "Date", "Subject", "Check-In Time", "Check-Out Time", 
        "Duration (Mins)", "Status", "Biometric Verified", "Manual Override", "Override Reason"
    ])

    for r in records:
        cin = r.check_in_time.strftime("%Y-%m-%d %I:%M %p") if r.check_in_time else ""
        cout = r.check_out_time.strftime("%Y-%m-%d %I:%M %p") if r.check_out_time else ""
        writer.writerow([
            r.id, r.student_code, r.roll_number, r.student_name, r.student_email, r.student_phone,
            r.session_title, r.session_date, r.subject_name, cin, cout,
            r.duration_minutes or "", r.status, "YES" if r.verified_by_biometrics else "NO",
            "YES" if r.is_manual_override else "NO", r.override_reason or ""
        ])

    csv_content = output.getvalue()
    filename = f"attendance_report_{date.today().isoformat()}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
