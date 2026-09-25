from datetime import datetime, timezone, time as dt_time, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database.session import get_db
from app.database.models import User, Student, AttendanceSession, AttendanceRecord, FaceEmbedding
from app.schemas.biometrics import (
    FaceEnrollmentRequest, LivenessChallengeVerifyRequest, 
    LiveScanRequest, LiveScanResponse
)
from app.recognition.service import biometric_service
from app.recognition.liveness import active_liveness
from app.core.config import settings
from app.api.deps import get_current_admin, log_audit_event

router = APIRouter(prefix="/biometrics", tags=["Biometric Recognition & Anti-Spoofing"])

@router.post("/liveness/start")
def start_liveness_challenge(admin: User = Depends(get_current_admin)):
    """
    Initializes a randomized active anti-spoofing challenge session.
    Returns the first randomized challenge (e.g. Blink, Smile, Turn Head Left/Right).
    """
    session_data = active_liveness.create_challenge_session(count=3)
    return session_data

@router.post("/liveness/verify-step")
def verify_liveness_step(
    payload: LivenessChallengeVerifyRequest,
    admin: User = Depends(get_current_admin)
):
    """
    Verifies client action or facial landmarks against the current randomized challenge.
    """
    landmarks = [tuple(p) for p in payload.landmarks] if payload.landmarks else []
    result = active_liveness.evaluate_challenge_frame(
        session_id=payload.session_id,
        landmarks=landmarks,
        face_box=payload.face_box or [],
        action_data=payload.action_data
    )
    return result

@router.post("/register-face")
def register_face_biometrics(
    payload: FaceEnrollmentRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Processes multi-sample biometric face enrollment:
    1. Validates all face samples (Front, Left, Right, Tilt).
    2. Enforces active liveness verification.
    3. Runs Duplicate Face Detection against all other students in DB.
    4. Saves 128-d normalized embeddings.
    """
    samples_data = [
        {"sample_type": s.sample_type, "image_base64": s.image_base64}
        for s in payload.samples
    ]

    result = biometric_service.process_registration_samples(
        db=db,
        samples=samples_data,
        student_id=payload.student_id,
        liveness_session_id=payload.liveness_session_id
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Biometric enrollment failed.")
        )

    student = db.query(Student).filter(Student.id == payload.student_id).first()

    log_audit_event(
        db,
        action="FACE_REGISTERED",
        user=admin,
        entity_type="Student",
        entity_id=student.id,
        details={
            "student_id": student.student_id,
            "samples_count": result.get("samples_registered"),
            "quality": result.get("average_quality")
        },
        request=request
    )

    return result

@router.post("/scan-frame", response_model=LiveScanResponse)
def scan_frame_for_attendance(
    payload: LiveScanRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Real-Time Attendance Recognition Pipeline:
    Camera Frame -> Face Detection -> Liveness -> 128-d Embedding -> Identity Match
    -> Session Validation -> Duplicate Check -> Attendance Creation (Present / Late).
    """
    # 1. Validate session
    session_obj = db.query(AttendanceSession).filter(AttendanceSession.id == payload.session_id).first()
    if not session_obj:
        return LiveScanResponse(
            status="INVALID_SESSION",
            message="Selected attendance session does not exist."
        )

    if session_obj.status == "COMPLETED":
        return LiveScanResponse(
            status="SESSION_COMPLETED",
            message="This attendance session has already been concluded."
        )

    # Automatically activate session if scheduled
    if session_obj.status == "SCHEDULED":
        session_obj.status = "ACTIVE"
        db.commit()

    # 2. Fetch all registered face embeddings for active students
    active_embeddings = (
        db.query(FaceEmbedding)
        .join(Student, FaceEmbedding.student_id == Student.id)
        .filter(Student.is_active == True)
        .all()
    )

    student_embedding_map: Dict[int, List[List[float]]] = {}
    for emb in active_embeddings:
        if emb.student_id not in student_embedding_map:
            student_embedding_map[emb.student_id] = []
        student_embedding_map[emb.student_id].append(emb.get_vector())

    # 3. Process frame through biometric pipeline
    verif_res = biometric_service.verify_live_frame(
        image_b64=payload.image_base64,
        active_student_embeddings=student_embedding_map
    )

    status_code = verif_res["status"]
    box = verif_res.get("box")
    landmarks = verif_res.get("landmarks")

    if status_code != "RECOGNIZED":
        return LiveScanResponse(
            status=status_code,
            message=verif_res.get("message", "Could not verify identity."),
            box=box,
            landmarks=landmarks
        )

    matched_student_id = verif_res["student_id"]
    confidence = verif_res["confidence"]

    student = db.query(Student).filter(Student.id == matched_student_id).first()
    if not student:
        return LiveScanResponse(
            status="UNKNOWN",
            message="Identity not found in institution database.",
            box=box,
            landmarks=landmarks
        )

    now = datetime.now(timezone.utc)

    # 4. Check Duplicate Attendance in this session (Database Constraint Enforcement)
    existing_record = (
        db.query(AttendanceRecord)
        .filter(
            AttendanceRecord.session_id == session_obj.id,
            AttendanceRecord.student_id == student.id
        )
        .first()
    )

    # Check-Out workflow
    if payload.mode == "CHECK_OUT":
        if not existing_record or not existing_record.check_in_time:
            return LiveScanResponse(
                status="INVALID_SEQUENCE",
                message="Cannot record Check-Out without prior Check-In for this session.",
                student_id=student.id,
                student_code=student.student_id,
                student_name=student.full_name,
                roll_number=student.roll_number,
                box=box
            )
        if existing_record.check_out_time:
            return LiveScanResponse(
                status="ALREADY_MARKED",
                message="Check-out already completed for this session.",
                student_id=student.id,
                student_code=student.student_id,
                student_name=student.full_name,
                roll_number=student.roll_number,
                original_check_in_time=existing_record.check_out_time.strftime("%I:%M %p"),
                box=box
            )
        
        # Calculate duration
        existing_record.check_out_time = now
        duration = int((now - existing_record.check_in_time).total_seconds() / 60)
        existing_record.duration_minutes = max(1, duration)
        db.commit()

        log_audit_event(
            db,
            action="ATTENDANCE_CHECK_OUT",
            user=admin,
            entity_type="AttendanceRecord",
            entity_id=existing_record.id,
            details={"student_id": student.student_id, "duration": duration},
            request=request
        )

        return LiveScanResponse(
            status="SUCCESS",
            message=f"Check-Out Recorded ({duration} mins attendance)",
            student_id=student.id,
            student_code=student.student_id,
            student_name=student.full_name,
            roll_number=student.roll_number,
            session_id=session_obj.id,
            session_title=session_obj.title,
            attendance_status="CHECKED_OUT",
            check_in_time=now.strftime("%I:%M %p"),
            confidence=confidence,
            box=box,
            landmarks=landmarks
        )

    # Standard Check-In workflow
    if existing_record:
        orig_time_str = existing_record.check_in_time.strftime("%I:%M %p") if existing_record.check_in_time else "Earlier"
        return LiveScanResponse(
            status="ALREADY_MARKED",
            message=f"Attendance already recorded at {orig_time_str}.",
            student_id=student.id,
            student_code=student.student_id,
            student_name=student.full_name,
            roll_number=student.roll_number,
            session_id=session_obj.id,
            session_title=session_obj.title,
            attendance_status=existing_record.status,
            original_check_in_time=orig_time_str,
            confidence=confidence,
            box=box,
            landmarks=landmarks
        )

    # 5. Determine if student arrived LATE
    # Parse session start_time (HH:MM)
    status_label = "PRESENT"
    try:
        sh, sm = [int(x) for x in session_obj.start_time.split(":")[:2]]
        # Local or UTC session start comparison
        session_dt = datetime.strptime(session_obj.date, "%Y-%m-%d").replace(hour=sh, minute=sm, tzinfo=timezone.utc)
        late_cutoff = session_dt + timedelta(minutes=session_obj.late_threshold_minutes)
        if now > late_cutoff:
            status_label = "LATE"
    except Exception:
        status_label = "PRESENT"

    # 6. Create new Attendance Record with Unique Constraint
    new_record = AttendanceRecord(
        session_id=session_obj.id,
        student_id=student.id,
        check_in_time=now,
        status=status_label,
        verified_by_biometrics=True,
        confidence_score=confidence
    )
    try:
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
    except IntegrityError:
        db.rollback()
        return LiveScanResponse(
            status="ALREADY_MARKED",
            message="Attendance already recorded.",
            student_id=student.id,
            student_code=student.student_id,
            student_name=student.full_name,
            roll_number=student.roll_number,
            box=box
        )

    log_audit_event(
        db,
        action="ATTENDANCE_MARKED",
        user=admin,
        entity_type="AttendanceRecord",
        entity_id=new_record.id,
        details={
            "student_id": student.student_id,
            "session_id": session_obj.id,
            "status": status_label,
            "confidence": confidence
        },
        request=request
    )

    return LiveScanResponse(
        status="SUCCESS",
        message="Attendance Marked",
        student_id=student.id,
        student_code=student.student_id,
        student_name=student.full_name,
        roll_number=student.roll_number,
        session_id=session_obj.id,
        session_title=session_obj.title,
        attendance_status=status_label,
        check_in_time=now.strftime("%I:%M %p"),
        confidence=confidence,
        box=box,
        landmarks=landmarks
    )
