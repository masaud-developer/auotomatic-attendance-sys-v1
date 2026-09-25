from datetime import datetime, timezone, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.database.models import User, AttendanceSession, Subject, AttendanceRecord
from app.schemas.attendance import SessionCreate, SessionUpdate, SessionResponse, SubjectCreate, SubjectResponse
from app.api.deps import get_current_admin, log_audit_event

router = APIRouter(prefix="/sessions", tags=["Attendance Sessions"])

# Subject endpoints
@router.get("/subjects", response_model=List[SubjectResponse])
def list_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).filter(Subject.is_active == True).order_by(Subject.code).all()

@router.post("/subjects", response_model=SubjectResponse)
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    if db.query(Subject).filter(Subject.code.ilike(payload.code)).first():
        raise HTTPException(status_code=400, detail="Subject code already exists.")
    new_sub = Subject(
        code=payload.code.upper().strip(),
        name=payload.name.strip(),
        department=payload.department.strip(),
        semester=payload.semester
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub

# Sessions endpoints
@router.get("", response_model=List[SessionResponse])
def list_sessions(
    date_filter: Optional[str] = Query(None, description="YYYY-MM-DD or 'today'"),
    subject_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = db.query(AttendanceSession).order_by(desc(AttendanceSession.date), desc(AttendanceSession.start_time))

    if date_filter == "today":
        query = query.filter(AttendanceSession.date == date.today().isoformat())
    elif date_filter:
        query = query.filter(AttendanceSession.date == date_filter)

    if subject_id:
        query = query.filter(AttendanceSession.subject_id == subject_id)

    if status_filter:
        query = query.filter(AttendanceSession.status == status_filter.upper())

    sessions = query.limit(limit).all()

    # Calculate attendance statistics per session
    results = []
    for s in sessions:
        records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).all()
        pres = sum(1 for r in records if r.status == "PRESENT")
        late = sum(1 for r in records if r.status == "LATE")
        absent = sum(1 for r in records if r.status == "ABSENT")

        results.append(SessionResponse(
            id=s.id,
            title=s.title,
            subject_id=s.subject_id,
            subject_name=s.subject.name if s.subject else "General",
            subject_code=s.subject.code if s.subject else None,
            session_type=s.session_type,
            date=s.date,
            start_time=s.start_time,
            end_time=s.end_time,
            room=s.room,
            late_threshold_minutes=s.late_threshold_minutes,
            attendance_mode=s.attendance_mode,
            status=s.status,
            created_at=s.created_at,
            total_marked=len(records),
            present_count=pres,
            late_count=late,
            absent_count=absent
        ))
    return results

@router.get("/active", response_model=Optional[SessionResponse])
def get_active_session(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Returns the currently active attendance session if any, or today's latest scheduled session.
    """
    s = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.status == "ACTIVE")
        .order_by(desc(AttendanceSession.id))
        .first()
    )
    if not s:
        today_str = date.today().isoformat()
        s = (
            db.query(AttendanceSession)
            .filter(AttendanceSession.date == today_str, AttendanceSession.status == "SCHEDULED")
            .order_by(desc(AttendanceSession.start_time))
            .first()
        )

    if not s:
        return None

    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).all()
    pres = sum(1 for r in records if r.status == "PRESENT")
    late = sum(1 for r in records if r.status == "LATE")
    absent = sum(1 for r in records if r.status == "ABSENT")

    return SessionResponse(
        id=s.id,
        title=s.title,
        subject_id=s.subject_id,
        subject_name=s.subject.name if s.subject else "General",
        subject_code=s.subject.code if s.subject else None,
        session_type=s.session_type,
        date=s.date,
        start_time=s.start_time,
        end_time=s.end_time,
        room=s.room,
        late_threshold_minutes=s.late_threshold_minutes,
        attendance_mode=s.attendance_mode,
        status=s.status,
        created_at=s.created_at,
        total_marked=len(records),
        present_count=pres,
        late_count=late,
        absent_count=absent
    )

@router.post("", response_model=SessionResponse)
def create_session(
    payload: SessionCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    subject_id = payload.subject_id
    if not subject_id and payload.custom_subject_name and payload.custom_subject_name.strip():
        sub_name = payload.custom_subject_name.strip()
        existing_sub = db.query(Subject).filter(Subject.name.ilike(sub_name)).first()
        if existing_sub:
            subject_id = existing_sub.id
        else:
            # Generate clean subject code from initials or letters
            letters = "".join(w[0].upper() for w in sub_name.split() if w.isalnum())
            if len(letters) < 2:
                letters = sub_name[:3].upper()
            code_candidate = letters[:6] or "SUB"
            code = code_candidate
            counter = 1
            while db.query(Subject).filter(Subject.code == code).first():
                code = f"{code_candidate}{counter}"
                counter += 1
            new_sub = Subject(code=code, name=sub_name, department="General")
            db.add(new_sub)
            db.commit()
            db.refresh(new_sub)
            subject_id = new_sub.id

    new_sess = AttendanceSession(
        title=payload.title.strip(),
        subject_id=subject_id,
        session_type=payload.session_type,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room,
        late_threshold_minutes=payload.late_threshold_minutes,
        attendance_mode=payload.attendance_mode,
        status="ACTIVE" if payload.auto_start else "SCHEDULED",
        created_by_user_id=admin.id
    )
    db.add(new_sess)
    db.commit()
    db.refresh(new_sess)

    log_audit_event(
        db,
        action="SESSION_CREATED",
        user=admin,
        entity_type="AttendanceSession",
        entity_id=new_sess.id,
        details={"title": new_sess.title, "date": new_sess.date, "type": new_sess.session_type},
        request=request
    )

    return SessionResponse(
        id=new_sess.id,
        title=new_sess.title,
        subject_id=new_sess.subject_id,
        subject_name=new_sess.subject.name if new_sess.subject else "General",
        subject_code=new_sess.subject.code if new_sess.subject else None,
        session_type=new_sess.session_type,
        date=new_sess.date,
        start_time=new_sess.start_time,
        end_time=new_sess.end_time,
        room=new_sess.room,
        late_threshold_minutes=new_sess.late_threshold_minutes,
        attendance_mode=new_sess.attendance_mode,
        status=new_sess.status,
        created_at=new_sess.created_at,
        total_marked=0,
        present_count=0,
        late_count=0,
        absent_count=0
    )

@router.post("/{id}/start", response_model=SessionResponse)
def start_session(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    s = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")

    s.status = "ACTIVE"
    db.commit()

    log_audit_event(
        db,
        action="SESSION_STARTED",
        user=admin,
        entity_type="AttendanceSession",
        entity_id=s.id,
        details={"title": s.title},
        request=request
    )

    return SessionResponse(
        id=s.id,
        title=s.title,
        subject_id=s.subject_id,
        subject_name=s.subject.name if s.subject else "General",
        subject_code=s.subject.code if s.subject else None,
        session_type=s.session_type,
        date=s.date,
        start_time=s.start_time,
        end_time=s.end_time,
        room=s.room,
        late_threshold_minutes=s.late_threshold_minutes,
        attendance_mode=s.attendance_mode,
        status=s.status,
        created_at=s.created_at
    )

@router.post("/{id}/complete", response_model=SessionResponse)
def complete_session(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    s = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")

    s.status = "COMPLETED"
    db.commit()

    log_audit_event(
        db,
        action="SESSION_COMPLETED",
        user=admin,
        entity_type="AttendanceSession",
        entity_id=s.id,
        details={"title": s.title},
        request=request
    )

    return SessionResponse(
        id=s.id,
        title=s.title,
        subject_id=s.subject_id,
        subject_name=s.subject.name if s.subject else "General",
        subject_code=s.subject.code if s.subject else None,
        session_type=s.session_type,
        date=s.date,
        start_time=s.start_time,
        end_time=s.end_time,
        room=s.room,
        late_threshold_minutes=s.late_threshold_minutes,
        attendance_mode=s.attendance_mode,
        status=s.status,
        created_at=s.created_at
    )
