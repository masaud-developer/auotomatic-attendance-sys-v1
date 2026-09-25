from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, String, Boolean, Float, DateTime, ForeignKey, 
    Text, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.database.session import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(128), unique=True, index=True, nullable=False)
    phone = Column(String(32), unique=True, index=True, nullable=False)
    role = Column(String(16), nullable=False, default="STUDENT")  # "ADMIN" or "STUDENT"
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    student = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    student_id = Column(String(32), unique=True, index=True, nullable=False)  # Immutable, e.g. STU-2026-000101
    roll_number = Column(String(64), unique=True, index=True, nullable=False)
    full_name = Column(String(128), index=True, nullable=False)
    department = Column(String(128), default="Computer Science & Engineering", nullable=False)
    batch_year = Column(Integer, default=2026, nullable=False)
    face_registered = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="student")
    face_embeddings = relationship("FaceEmbedding", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    sample_type = Column(String(32), default="FRONT", nullable=False)  # FRONT, LEFT, RIGHT, TILT_UP, TILT_DOWN
    vector_json = Column(Text, nullable=False)  # 128-d or 512-d normalized float vector
    quality_score = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    student = relationship("Student", back_populates="face_embeddings")

    def get_vector(self) -> list[float]:
        return json.loads(self.vector_json)

    def set_vector(self, vec: list[float]):
        self.vector_json = json.dumps(vec)


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, index=True, nullable=False)  # e.g. CS101, PHY201
    name = Column(String(128), nullable=False)
    department = Column(String(128), default="General", nullable=False)
    semester = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    sessions = relationship("AttendanceSession", back_populates="subject")


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(128), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    session_type = Column(String(64), default="REGULAR_CHECK_IN", nullable=False)
    # Types: REGULAR_CHECK_IN, REGULAR_CHECK_OUT, SUBJECT_CLASS, PHYSICS_LAB, CHEMISTRY_LAB, COMPUTER_LAB, PRACTICAL, EXAMINATION, CUSTOM
    date = Column(String(10), index=True, nullable=False)  # YYYY-MM-DD
    start_time = Column(String(8), nullable=False)  # HH:MM
    end_time = Column(String(8), nullable=False)  # HH:MM
    room = Column(String(64), default="Room 101", nullable=False)
    late_threshold_minutes = Column(Integer, default=15, nullable=False)
    attendance_mode = Column(String(32), default="CHECK_IN", nullable=False)  # CHECK_IN, CHECK_OUT, BOTH
    status = Column(String(32), default="SCHEDULED", nullable=False)  # SCHEDULED, ACTIVE, COMPLETED
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    subject = relationship("Subject", back_populates="sessions")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    check_in_time = Column(DateTime(timezone=True), nullable=True)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    status = Column(String(32), default="PRESENT", nullable=False)  # PRESENT, LATE, ABSENT
    verified_by_biometrics = Column(Boolean, default=True, nullable=False)
    confidence_score = Column(Float, nullable=True)
    is_manual_override = Column(Boolean, default=False, nullable=False)
    override_reason = Column(Text, nullable=True)
    override_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Unique constraint: only one attendance record per student per session!
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_student_session_attendance"),
        Index("idx_att_sess_student", "session_id", "student_id"),
        Index("idx_att_status", "status"),
    )

    # Relationships
    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("Student", back_populates="attendance_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(128), nullable=True)
    action = Column(String(64), nullable=False)
    # Examples: ADMIN_LOGIN, STUDENT_LOGIN, LOGIN_FAILED, STUDENT_REGISTER, STUDENT_UPDATE,
    # STUDENT_DEACTIVATE, STUDENT_REACTIVATE, FACE_REGISTERED, ATTENDANCE_MARKED,
    # ATTENDANCE_OVERRIDE, SESSION_CREATED, SESSION_STARTED, SESSION_COMPLETED, SETTINGS_UPDATE
    entity_type = Column(String(64), nullable=True)  # Student, AttendanceRecord, Session, Settings
    entity_id = Column(String(64), nullable=True)
    details_json = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="audit_logs")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(64), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
