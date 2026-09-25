import pytest
import os
import tempfile
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use a separate test SQLite database
test_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False).name
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_file}"

from app.database.session import Base, get_db
from app.database.models import User, Student, AttendanceSession, Subject, AttendanceRecord
from app.main import app
from app.recognition.recognizer import face_recognizer

engine_test = create_engine(f"sqlite:///{test_db_file}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine_test)
    yield
    try:
        os.remove(test_db_file)
    except Exception:
        pass

@pytest.fixture
def client():
    return TestClient(app)

def test_initial_admin_setup_and_login(client):
    # 1. Setup status should initially show not initialized
    res = client.get("/api/v1/auth/setup-status")
    assert res.status_code == 200

    # 2. Setup initial admin
    admin_payload = {
        "email": "admin@college.edu",
        "phone": "9876543210",
        "full_name": "Dean Academic",
        "password": "AdminPassword123!",
        "institution_name": "College of Engineering & Science"
    }
    setup_res = client.post("/api/v1/auth/setup-initial-admin", json=admin_payload)
    assert setup_res.status_code == 200, setup_res.text
    token_data = setup_res.json()
    assert token_data["role"] == "ADMIN"
    assert "access_token" in token_data

    # 3. Subsequent setup must be rejected
    second_setup = client.post("/api/v1/auth/setup-initial-admin", json=admin_payload)
    assert second_setup.status_code == 400

    # 4. Test login using Email
    login_email = client.post("/api/v1/auth/login", json={"identifier": "admin@college.edu", "password": "AdminPassword123!"})
    assert login_email.status_code == 200
    assert login_email.json()["role"] == "ADMIN"

    # 5. Test login using 10-digit Phone
    login_phone = client.post("/api/v1/auth/login", json={"identifier": "9876543210", "password": "AdminPassword123!"})
    assert login_phone.status_code == 200

    # 6. Test invalid password
    invalid_login = client.post("/api/v1/auth/login", json={"identifier": "admin@college.edu", "password": "WrongPassword"})
    assert invalid_login.status_code == 401

def test_student_registration_validation(client):
    # Get admin token
    admin_token = client.post("/api/v1/auth/login", json={"identifier": "admin@college.edu", "password": "AdminPassword123!"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Register student 1
    s1_payload = {
        "full_name": "Aarav Sharma",
        "email": "aarav.sharma@college.edu",
        "phone": "9123456780",
        "roll_number": "CS2026001",
        "password": "StudentPassword123",
        "department": "Computer Science & Engineering",
        "batch_year": 2026
    }
    r1 = client.post("/api/v1/students/register", json=s1_payload, headers=headers)
    assert r1.status_code == 200, r1.text
    st1 = r1.json()
    assert st1["student_id"].startswith("STU-2026-")
    assert st1["roll_number"] == "CS2026001"

    # 2. Reject Duplicate Email
    dup_email_payload = dict(s1_payload, roll_number="CS2026002", phone="9123456781")
    r_dup_email = client.post("/api/v1/students/register", json=dup_email_payload, headers=headers)
    assert r_dup_email.status_code == 400
    assert "Email address is already registered" in r_dup_email.json()["detail"]

    # 3. Reject Duplicate Phone
    dup_phone_payload = dict(s1_payload, email="different@college.edu", roll_number="CS2026003")
    r_dup_phone = client.post("/api/v1/students/register", json=dup_phone_payload, headers=headers)
    assert r_dup_phone.status_code == 400
    assert "Phone number is already registered" in r_dup_phone.json()["detail"]

    # 4. Reject Duplicate Roll Number
    dup_roll_payload = dict(s1_payload, email="different2@college.edu", phone="9123456782")
    r_dup_roll = client.post("/api/v1/students/register", json=dup_roll_payload, headers=headers)
    assert r_dup_roll.status_code == 400
    assert "Roll number already exists" in r_dup_roll.json()["detail"]

    # 5. Reject invalid phone format (< 10 digits or letters)
    inv_phone_payload = dict(s1_payload, email="valid@college.edu", phone="12345", roll_number="CS2026004")
    r_inv_phone = client.post("/api/v1/students/register", json=inv_phone_payload, headers=headers)
    assert r_inv_phone.status_code == 422

    # 6. Test student login by Student ID
    stu_login = client.post("/api/v1/auth/login", json={"identifier": st1["student_id"], "password": "StudentPassword123"})
    assert stu_login.status_code == 200
    assert stu_login.json()["role"] == "STUDENT"
    assert stu_login.json()["student_id"] == st1["student_id"]

def test_biometric_similarity_and_duplicate_detection():
    # Synthetic 128-d vectors
    v1 = [0.1] * 128
    v2 = [0.1] * 128
    sim_same = face_recognizer.compute_similarity(v1, v2)
    assert sim_same >= 0.999

    # Orthogonal vectors
    v_diff = [-0.1 if i % 2 == 0 else 0.1 for i in range(128)]
    sim_diff = face_recognizer.compute_similarity(v1, v_diff)
    assert sim_diff < 0.2

    # Duplicate face check
    existing = [(1, v1)]
    is_dup, matched_id, score = face_recognizer.check_duplicate_face(v2, existing, threshold=0.65)
    assert is_dup is True
    assert matched_id == 1

def test_attendance_session_and_duplicate_prevention(client):
    admin_token = client.post("/api/v1/auth/login", json={"identifier": "admin@college.edu", "password": "AdminPassword123!"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create a subject
    sub_res = client.post("/api/v1/sessions/subjects", json={
        "code": "PHY201",
        "name": "Applied Physics Laboratory",
        "department": "Physics",
        "semester": 1
    }, headers=headers)
    assert sub_res.status_code in [200, 400]
    subject_id = sub_res.json()["id"] if sub_res.status_code == 200 else 1

    # 2. Create an attendance session
    sess_payload = {
        "title": "Physics Lab Practical Session 1",
        "subject_id": subject_id,
        "session_type": "PHYSICS_LAB",
        "date": "2026-09-22",
        "start_time": "10:00",
        "end_time": "12:00",
        "room": "Physics Lab A-204",
        "late_threshold_minutes": 15,
        "attendance_mode": "CHECK_IN"
    }
    s_res = client.post("/api/v1/sessions", json=sess_payload, headers=headers)
    assert s_res.status_code == 200, s_res.text
    session_id = s_res.json()["id"]

    # 3. Start session
    start_res = client.post(f"/api/v1/sessions/{session_id}/start", headers=headers)
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "ACTIVE"

    # 4. Get student 1 id
    students = client.get("/api/v1/students?search=Aarav", headers=headers).json()
    assert len(students) > 0
    student_id = students[0]["id"]

    # 5. Mark Attendance directly in database
    db = TestingSessionLocal()
    rec = AttendanceRecord(
        session_id=session_id,
        student_id=student_id,
        status="PRESENT",
        verified_by_biometrics=True
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    rec_id = rec.id
    db.close()

    # 6. Test manual override with audit reason
    override_res = client.post(
        f"/api/v1/attendance/override/{rec_id}",
        json={"new_status": "LATE", "reason": "Arrived 10 minutes late due to college bus delay."},
        headers=headers
    )
    assert override_res.status_code == 200
    assert override_res.json()["new_status"] == "LATE"

    # 7. Check audit logs to ensure audit entry was recorded
    audit_res = client.get("/api/v1/audit-logs?action=ATTENDANCE_OVERRIDE", headers=headers)
    assert audit_res.status_code == 200
    assert len(audit_res.json()) > 0
    assert "college bus delay" in str(audit_res.json()[0]["details"])

def test_rbac_security_isolation(client):
    # Student cannot access admin endpoints
    stu_login = client.post("/api/v1/auth/login", json={"identifier": "aarav.sharma@college.edu", "password": "StudentPassword123"})
    stu_token = stu_login.json()["access_token"]
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    # Student trying to list all students -> should be 403 Forbidden!
    forbidden_res = client.get("/api/v1/students", headers=stu_headers)
    assert forbidden_res.status_code == 403

    # Student trying to access audit logs -> 403 Forbidden!
    forbidden_audit = client.get("/api/v1/audit-logs", headers=stu_headers)
    assert forbidden_audit.status_code == 403

    # Student accessing their own student portal dashboard -> 200 OK!
    portal_res = client.get("/api/v1/student-portal/dashboard", headers=stu_headers)
    assert portal_res.status_code == 200
    data = portal_res.json()
    assert data["profile"]["full_name"] == "Aarav Sharma"
    assert "stats" in data

def test_custom_session_and_student_edit_delete(client):
    admin_token = client.post("/api/v1/auth/login", json={"identifier": "admin@college.edu", "password": "AdminPassword123!"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create a custom session without pre-made subject, with custom times and auto_start
    sess_payload = {
        "title": "On-demand Workshop Session",
        "custom_subject_name": "Artificial Intelligence Lab",
        "session_type": "CUSTOM",
        "date": "2026-09-22",
        "start_time": "14:00",
        "end_time": "16:00",
        "room": "Auditorium Hall 4",
        "late_threshold_minutes": 20,
        "auto_start": True
    }
    create_res = client.post("/api/v1/sessions", json=sess_payload, headers=headers)
    assert create_res.status_code == 200, create_res.text
    sess_data = create_res.json()
    assert sess_data["status"] == "ACTIVE"
    assert sess_data["subject_name"] == "Artificial Intelligence Lab"

    # 2. Register a student to test edit and delete
    new_stu = {
        "full_name": "Rohan Mehra",
        "email": "rohan.mehra@college.edu",
        "phone": "9812345678",
        "roll_number": "CS2026099",
        "password": "Password123!",
        "department": "Mechanical Engineering",
        "batch_year": 2026
    }
    reg_res = client.post("/api/v1/students/register", json=new_stu, headers=headers)
    assert reg_res.status_code == 200
    student_id = reg_res.json()["id"]

    # 3. Edit student: update roll_number, name, department
    edit_payload = {
        "full_name": "Rohan M. Mehra",
        "roll_number": "CS2026100",
        "department": "Computer Science & Engineering",
        "batch_year": 2027
    }
    edit_res = client.put(f"/api/v1/students/{student_id}", json=edit_payload, headers=headers)
    assert edit_res.status_code == 200
    updated_data = edit_res.json()
    assert updated_data["full_name"] == "Rohan M. Mehra"
    assert updated_data["roll_number"] == "CS2026100"
    assert updated_data["batch_year"] == 2027

    # 4. Delete student permanently
    del_res = client.delete(f"/api/v1/students/{student_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 5. Verify student is completely gone
    get_res = client.get(f"/api/v1/students/{student_id}", headers=headers)
    assert get_res.status_code == 404

