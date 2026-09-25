from datetime import datetime, timezone, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc, func

from app.database.session import get_db
from app.database.models import User, Student, AttendanceRecord, AttendanceSession, FaceEmbedding
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse, StudentDetailResponse
from app.core.security import get_password_hash
from app.api.deps import get_current_admin, log_audit_event

router = APIRouter(prefix="/students", tags=["Student Management"])

def generate_next_student_id(db: Session, batch_year: int) -> str:
    """
    Generates an immutable, sequential institutional ID, e.g. STU-2026-000101
    """
    prefix = f"STU-{batch_year}-"
    last_student = (
        db.query(Student)
        .filter(Student.student_id.like(f"{prefix}%"))
        .order_by(desc(Student.id))
        .first()
    )
    if last_student:
        try:
            num_part = int(last_student.student_id.split("-")[-1])
            next_num = num_part + 1
        except Exception:
            next_num = db.query(Student).count() + 101
    else:
        next_num = 101

    return f"STU-{batch_year}-{next_num:06d}"

@router.post("/check-duplicates")
def check_duplicate_fields(
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Real-time uniqueness validator for Email, Phone, and Roll number.
    """
    email = payload.get("email")
    phone = payload.get("phone")
    roll_number = payload.get("roll_number")
    exclude_student_id = payload.get("exclude_student_id")

    errors = {}
    if email:
        query = db.query(User).filter(User.email.ilike(email))
        if exclude_student_id:
            st = db.query(Student).filter(Student.id == exclude_student_id).first()
            if st:
                query = query.filter(User.id != st.user_id)
        if query.first():
            errors["email"] = "Email address is already registered."

    if phone:
        query = db.query(User).filter(User.phone == phone)
        if exclude_student_id:
            st = db.query(Student).filter(Student.id == exclude_student_id).first()
            if st:
                query = query.filter(User.id != st.user_id)
        if query.first():
            errors["phone"] = "Phone number is already registered."

    if roll_number:
        query = db.query(Student).filter(Student.roll_number.ilike(roll_number))
        if exclude_student_id:
            query = query.filter(Student.id != exclude_student_id)
        if query.first():
            errors["roll_number"] = "Roll number already exists."

    return {
        "valid": len(errors) == 0,
        "errors": errors
    }

@router.post("/register", response_model=StudentResponse)
def register_student(
    payload: StudentCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Multi-step Registration - Step 1:
    Validates info, prevents duplicate Email/Phone/Roll, generates unique Student ID.
    """
    # 1. Duplicate email check
    if db.query(User).filter(User.email.ilike(payload.email)).first():
        raise HTTPException(status_code=400, detail="Email address is already registered.")

    # 2. Duplicate phone check
    if db.query(User).filter(User.phone == payload.phone).first():
        raise HTTPException(status_code=400, detail="Phone number is already registered.")

    # 3. Duplicate roll number check
    if db.query(Student).filter(Student.roll_number.ilike(payload.roll_number)).first():
        raise HTTPException(status_code=400, detail="Roll number already exists.")

    # Generate unique Student ID
    new_student_id = generate_next_student_id(db, payload.batch_year)

    # Create user record
    new_user = User(
        email=payload.email.lower().strip(),
        phone=payload.phone.strip(),
        role="STUDENT",
        hashed_password=get_password_hash(payload.password),
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # Create student record
    new_student = Student(
        user_id=new_user.id,
        student_id=new_student_id,
        roll_number=payload.roll_number.strip().upper(),
        full_name=payload.full_name.strip(),
        department=payload.department.strip(),
        batch_year=payload.batch_year,
        face_registered=False,
        is_active=True
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    log_audit_event(
        db,
        action="STUDENT_REGISTER",
        user=admin,
        entity_type="Student",
        entity_id=new_student.id,
        details={
            "student_id": new_student.student_id,
            "roll_number": new_student.roll_number,
            "full_name": new_student.full_name,
            "email": new_user.email
        },
        request=request
    )

    return StudentResponse(
        id=new_student.id,
        user_id=new_user.id,
        student_id=new_student.student_id,
        roll_number=new_student.roll_number,
        full_name=new_student.full_name,
        email=new_user.email,
        phone=new_user.phone,
        department=new_student.department,
        batch_year=new_student.batch_year,
        face_registered=new_student.face_registered,
        is_active=new_student.is_active,
        created_at=new_student.created_at,
        today_status="NOT_MARKED",
        attendance_percentage=0.0,
        total_sessions=0,
        present_count=0,
        absent_count=0,
        late_count=0
    )

@router.get("", response_model=List[StudentResponse])
def list_students(
    search: Optional[str] = Query(None, description="Search by name, roll number, student ID, email, or phone"),
    status_filter: Optional[str] = Query(None, description="active, inactive"),
    attendance_filter: Optional[str] = Query(None, description="low, high"),  # low: <75%, high: >=75%
    today_status_filter: Optional[str] = Query(None, description="present, absent, late"),
    department: Optional[str] = Query(None),
    sort_by: str = Query("name", description="name, roll, student_id, attendance, created_at"),
    order: str = Query("asc", description="asc or desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Advanced Student Search & Multi-filter combination.
    """
    today_str = date.today().isoformat()

    query = db.query(Student).join(User, Student.user_id == User.id)

    # 1. Search filter across all indexed fields
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

    # 2. Account status filter
    if status_filter == "active":
        query = query.filter(Student.is_active == True, User.is_active == True)
    elif status_filter == "inactive":
        query = query.filter(or_(Student.is_active == False, User.is_active == False))

    # 3. Department filter
    if department and department != "ALL":
        query = query.filter(Student.department == department)

    students = query.all()

    # Preload today's attendance records to compute today_status and percentages accurately
    today_records = (
        db.query(AttendanceRecord)
        .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
        .filter(AttendanceSession.date == today_str)
        .all()
    )
    today_status_map = {}
    for r in today_records:
        today_status_map[r.student_id] = r.status

    # Compute attendance statistics for each student
    total_inst_sessions = db.query(AttendanceSession).filter(AttendanceSession.status != "SCHEDULED").count()
    student_records = db.query(AttendanceRecord).all()
    stats_map = {}
    for r in student_records:
        if r.student_id not in stats_map:
            stats_map[r.student_id] = {"present": 0, "late": 0, "absent": 0, "total": 0}
        stats_map[r.student_id]["total"] += 1
        if r.status == "PRESENT":
            stats_map[r.student_id]["present"] += 1
        elif r.status == "LATE":
            stats_map[r.student_id]["late"] += 1
        elif r.status == "ABSENT":
            stats_map[r.student_id]["absent"] += 1

    results = []
    for s in students:
        s_stats = stats_map.get(s.id, {"present": 0, "late": 0, "absent": 0, "total": 0})
        # Considered attended if PRESENT or LATE
        attended = s_stats["present"] + s_stats["late"]
        # If student has recorded sessions, calculate against their sessions, or against total valid sessions
        divisor = s_stats["total"] if s_stats["total"] > 0 else (total_inst_sessions if total_inst_sessions > 0 else 1)
        att_pct = round((attended / divisor) * 100.0, 1) if divisor > 0 else 0.0

        today_stat = today_status_map.get(s.id, "ABSENT" if total_inst_sessions > 0 else "NOT_MARKED")

        # Apply attendance percentage filter (< 75% or >= 75%)
        if attendance_filter == "low" and att_pct >= 75.0:
            continue
        if attendance_filter == "high" and att_pct < 75.0:
            continue

        # Apply today_status_filter
        if today_status_filter:
            tsf = today_status_filter.upper()
            if tsf == "PRESENT" and today_stat != "PRESENT":
                continue
            elif tsf == "LATE" and today_stat != "LATE":
                continue
            elif tsf == "ABSENT" and today_stat != "ABSENT":
                continue

        results.append(StudentResponse(
            id=s.id,
            user_id=s.user_id,
            student_id=s.student_id,
            roll_number=s.roll_number,
            full_name=s.full_name,
            email=s.user.email,
            phone=s.user.phone,
            department=s.department,
            batch_year=s.batch_year,
            face_registered=s.face_registered,
            is_active=(s.is_active and s.user.is_active),
            created_at=s.created_at,
            today_status=today_stat,
            attendance_percentage=att_pct,
            total_sessions=s_stats["total"],
            present_count=s_stats["present"],
            absent_count=s_stats["absent"],
            late_count=s_stats["late"]
        ))

    # In-memory sorting for derived fields or SQL fields
    reverse = (order.lower() == "desc")
    if sort_by == "name":
        results.sort(key=lambda x: x.full_name.lower(), reverse=reverse)
    elif sort_by == "roll":
        results.sort(key=lambda x: x.roll_number.lower(), reverse=reverse)
    elif sort_by == "student_id":
        results.sort(key=lambda x: x.student_id.lower(), reverse=reverse)
    elif sort_by == "attendance":
        results.sort(key=lambda x: x.attendance_percentage, reverse=reverse)
    elif sort_by == "created_at":
        results.sort(key=lambda x: x.created_at, reverse=reverse)

    return results[skip:skip + limit]

@router.get("/{id}", response_model=StudentDetailResponse)
def get_student_detail(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Detailed Student Profile with academic history, biometrics, and recent attendance records.
    """
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id)
        .order_by(desc(AttendanceRecord.created_at))
        .limit(20)
        .all()
    )

    present_count = 0
    absent_count = 0
    late_count = 0
    recent_sessions = []

    for r in records:
        if r.status == "PRESENT":
            present_count += 1
        elif r.status == "LATE":
            late_count += 1
        elif r.status == "ABSENT":
            absent_count += 1

        recent_sessions.append({
            "id": r.id,
            "session_id": r.session_id,
            "session_title": r.session.title if r.session else "Session",
            "session_date": r.session.date if r.session else "",
            "subject_name": r.session.subject.name if r.session and r.session.subject else "General",
            "check_in_time": r.check_in_time.isoformat() if r.check_in_time else None,
            "check_out_time": r.check_out_time.isoformat() if r.check_out_time else None,
            "duration_minutes": r.duration_minutes,
            "status": r.status,
            "verified_by_biometrics": r.verified_by_biometrics
        })

    total = len(records)
    attended = present_count + late_count
    att_pct = round((attended / total) * 100.0, 1) if total > 0 else 0.0

    samples_count = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student.id).count()

    return StudentDetailResponse(
        id=student.id,
        user_id=student.user_id,
        student_id=student.student_id,
        roll_number=student.roll_number,
        full_name=student.full_name,
        email=student.user.email,
        phone=student.user.phone,
        department=student.department,
        batch_year=student.batch_year,
        face_registered=student.face_registered,
        is_active=(student.is_active and student.user.is_active),
        created_at=student.created_at,
        today_status="PRESENT" if any(r.get("session_date") == date.today().isoformat() and r.get("status") in ["PRESENT", "LATE"] for r in recent_sessions) else "ABSENT",
        attendance_percentage=att_pct,
        total_sessions=total,
        present_count=present_count,
        absent_count=absent_count,
        late_count=late_count,
        recent_sessions=recent_sessions,
        face_samples_count=samples_count
    )

@router.put("/{id}", response_model=StudentResponse)
def update_student(
    id: int,
    payload: StudentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Updates student academic or personal information with uniqueness checks.
    """
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    user = student.user

    # Email update check
    if payload.email and payload.email.lower() != user.email:
        if db.query(User).filter(User.email == payload.email.lower(), User.id != user.id).first():
            raise HTTPException(status_code=400, detail="Email address is already registered.")
        user.email = payload.email.lower().strip()

    # Phone update check
    if payload.phone and payload.phone != user.phone:
        if db.query(User).filter(User.phone == payload.phone, User.id != user.id).first():
            raise HTTPException(status_code=400, detail="Phone number is already registered.")
        user.phone = payload.phone.strip()

    # Roll number update check
    if payload.roll_number and payload.roll_number.strip().upper() != student.roll_number:
        new_roll = payload.roll_number.strip().upper()
        if db.query(Student).filter(Student.roll_number.ilike(new_roll), Student.id != student.id).first():
            raise HTTPException(status_code=400, detail="Roll number already exists.")
        student.roll_number = new_roll

    if payload.full_name:
        student.full_name = payload.full_name.strip()
    if payload.department:
        student.department = payload.department.strip()
    if payload.batch_year:
        student.batch_year = payload.batch_year
    if payload.is_active is not None:
        student.is_active = payload.is_active
        user.is_active = payload.is_active

    db.commit()
    db.refresh(student)

    log_audit_event(
        db,
        action="STUDENT_UPDATE",
        user=admin,
        entity_type="Student",
        entity_id=student.id,
        details={"updated_fields": payload.model_dump(exclude_unset=True)},
        request=request
    )

    return StudentResponse(
        id=student.id,
        user_id=user.id,
        student_id=student.student_id,
        roll_number=student.roll_number,
        full_name=student.full_name,
        email=user.email,
        phone=user.phone,
        department=student.department,
        batch_year=student.batch_year,
        face_registered=student.face_registered,
        is_active=student.is_active,
        created_at=student.created_at,
        today_status="NOT_MARKED",
        attendance_percentage=0.0
    )

@router.post("/{id}/deactivate")
def deactivate_student(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Soft deactivation of student account to preserve historical attendance integrity.
    """
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.is_active = False
    student.user.is_active = False
    db.commit()

    log_audit_event(
        db,
        action="STUDENT_DEACTIVATE",
        user=admin,
        entity_type="Student",
        entity_id=student.id,
        details={"student_id": student.student_id},
        request=request
    )

    return {"success": True, "message": f"Student {student.student_id} deactivated successfully."}

@router.post("/{id}/reactivate")
def reactivate_student(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Reactivates a deactivated student account.
    """
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.is_active = True
    student.user.is_active = True
    db.commit()

    log_audit_event(
        db,
        action="STUDENT_REACTIVATE",
        user=admin,
        entity_type="Student",
        entity_id=student.id,
        details={"student_id": student.student_id},
        request=request
    )

    return {"success": True, "message": f"Student {student.student_id} reactivated successfully."}

@router.post("/{id}/reset-password")
def reset_student_password(
    id: int,
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Admin resets student password.
    """
    new_password = payload.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.user.hashed_password = get_password_hash(new_password)
    student.user.failed_login_attempts = 0
    db.commit()

    log_audit_event(
        db,
        action="STUDENT_PASSWORD_RESET",
        user=admin,
        entity_type="Student",
        entity_id=student.id,
        details={"student_id": student.student_id},
        request=request
    )

    return {"success": True, "message": "Password reset successfully."}

@router.delete("/{id}")
def delete_student(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Permanently deletes a student record, associated biometric face embeddings, attendance records, and user account.
    """
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    user_id = student.user_id
    student_id_str = student.student_id
    student_name = student.full_name

    # Delete student (cascade will delete embeddings and attendance records)
    db.delete(student)
    # Also delete the associated user record
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)

    db.commit()

    log_audit_event(
        db,
        action="STUDENT_DELETED",
        user=admin,
        entity_type="Student",
        entity_id=id,
        details={"student_id": student_id_str, "full_name": student_name},
        request=request
    )

    return {"success": True, "message": f"Student {student_name} ({student_id_str}) was permanently deleted."}

