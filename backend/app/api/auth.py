from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import re

from app.database.session import get_db
from app.database.models import User, Student, Subject, SystemSetting
from app.schemas.auth import Token, LoginRequest, PasswordChangeRequest, AdminSetupRequest, UserResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.deps import get_current_user, log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/setup-status")
def check_setup_status(db: Session = Depends(get_db)):
    """
    Checks if the system already has an administrator configured.
    """
    admin_count = db.query(User).filter(User.role == "ADMIN").count()
    return {
        "is_initialized": admin_count > 0,
        "admin_count": admin_count
    }

@router.post("/setup-initial-admin", response_model=Token)
def setup_initial_admin(
    payload: AdminSetupRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Sets up the primary institution administrator if not already initialized.
    """
    admin_count = db.query(User).filter(User.role == "ADMIN").count()
    if admin_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System is already initialized with an administrator."
        )

    # Check for existing email or phone
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email address is already registered.")
    if db.query(User).filter(User.phone == payload.phone).first():
        raise HTTPException(status_code=400, detail="Phone number is already registered.")

    # Create primary admin user
    new_admin = User(
        email=payload.email,
        phone=payload.phone,
        role="ADMIN",
        hashed_password=get_password_hash(payload.password),
        is_active=True,
        last_login_at=datetime.now(timezone.utc)
    )
    db.add(new_admin)
    db.flush()

    # Seed default system settings
    default_settings = [
        SystemSetting(key="institution_name", value=payload.institution_name or "Institute of Technology & Science"),
        SystemSetting(key="recognition_threshold", value="0.58"),
        SystemSetting(key="duplicate_face_threshold", value="0.65"),
        SystemSetting(key="late_threshold_minutes", value="15"),
        SystemSetting(key="audio_enabled", value="true"),
        SystemSetting(key="liveness_enabled", value="true"),
        SystemSetting(key="liveness_sensitivity", value="medium")
    ]
    for s in default_settings:
        if not db.query(SystemSetting).filter(SystemSetting.key == s.key).first():
            db.add(s)

    db.commit()
    db.refresh(new_admin)

    log_audit_event(
        db, 
        action="SYSTEM_INITIALIZED", 
        user=new_admin, 
        entity_type="User", 
        entity_id=new_admin.id,
        details={"email": new_admin.email, "role": "ADMIN"},
        request=request
    )

    token = create_access_token(
        subject=new_admin.id,
        role=new_admin.role,
        extra_data={"email": new_admin.email}
    )

    return Token(
        access_token=token,
        token_type="bearer",
        role=new_admin.role,
        user_id=new_admin.id,
        email=new_admin.email,
        full_name=payload.full_name
    )

@router.post("/login", response_model=Token)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Secure login accepting:
    - Email address
    - 10-digit Phone number
    - Student ID (e.g. STU-2026-000101)
    """
    identifier = payload.identifier.strip()
    user: Optional[User] = None
    student_obj: Optional[Student] = None

    # 1. Try by Email
    if "@" in identifier:
        user = db.query(User).filter(User.email.ilike(identifier)).first()
    
    # 2. Try by 10-digit Phone
    elif identifier.isdigit() and len(identifier) == 10:
        user = db.query(User).filter(User.phone == identifier).first()

    # 3. Try by Student ID
    elif identifier.upper().startswith("STU-") or "-" in identifier:
        student_obj = db.query(Student).filter(Student.student_id == identifier.upper()).first()
        if student_obj:
            user = db.query(User).filter(User.id == student_obj.user_id).first()

    # 4. Fallback search across email, phone, and student ID
    if not user:
        # Check student ID case-insensitively
        student_obj = db.query(Student).filter(Student.student_id.ilike(identifier)).first()
        if student_obj:
            user = db.query(User).filter(User.id == student_obj.user_id).first()
        else:
            user = db.query(User).filter(
                (User.email.ilike(identifier)) | (User.phone == identifier)
            ).first()

    # If user still not found
    if not user:
        log_audit_event(
            db, 
            action="LOGIN_FAILED", 
            user=None, 
            details={"identifier": identifier, "reason": "User not found"},
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your Email, Phone, or Student ID and password."
        )

    # Check account active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the institution administrator."
        )

    # Verify password
    if not verify_password(payload.password, user.hashed_password):
        user.failed_login_attempts += 1
        db.commit()
        log_audit_event(
            db, 
            action="LOGIN_FAILED", 
            user=user, 
            details={"identifier": identifier, "failed_attempts": user.failed_login_attempts},
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your password."
        )

    # Successful login: reset failed attempts & update last login
    user.failed_login_attempts = 0
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # Retrieve student details if role is STUDENT
    student_id_str = None
    full_name = None
    if user.role == "STUDENT":
        if not student_obj:
            student_obj = db.query(Student).filter(Student.user_id == user.id).first()
        if student_obj:
            student_id_str = student_obj.student_id
            full_name = student_obj.full_name
    else:
        full_name = "Institution Administrator"

    token = create_access_token(
        subject=user.id,
        role=user.role,
        extra_data={"email": user.email, "student_id": student_id_str}
    )

    log_audit_event(
        db, 
        action=f"{user.role}_LOGIN", 
        user=user, 
        entity_type="User", 
        entity_id=user.id,
        details={"email": user.email, "role": user.role},
        request=request
    )

    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        email=user.email,
        student_id=student_id_str,
        full_name=full_name
    )

@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns authenticated user information.
    """
    res = {
        "id": current_user.id,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "last_login_at": current_user.last_login_at,
        "created_at": current_user.created_at
    }

    if current_user.role == "STUDENT":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            res["student"] = {
                "id": student.id,
                "student_id": student.student_id,
                "roll_number": student.roll_number,
                "full_name": student.full_name,
                "department": student.department,
                "batch_year": student.batch_year,
                "face_registered": student.face_registered
            }

    return res

@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Allows user to update their own password.
    """
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()

    log_audit_event(
        db,
        action="PASSWORD_CHANGED",
        user=current_user,
        entity_type="User",
        entity_id=current_user.id,
        request=request
    )

    return {"success": True, "message": "Password updated successfully."}
