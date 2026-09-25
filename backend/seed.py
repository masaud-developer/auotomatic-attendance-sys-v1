"""
Optional Institutional Seed Script
Run this script manually if you wish to populate realistic test data:
    python seed.py
"""

import os
import json
import random
from datetime import datetime, timezone, date, timedelta
from app.database.session import SessionLocal, Base, engine
from app.database.models import User, Student, Subject, AttendanceSession, AttendanceRecord, FaceEmbedding, SystemSetting
from app.core.security import get_password_hash

def seed_database():
    print("[Seed] Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Admin Account
        admin_email = "admin@institution.edu"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            print("[Seed] Creating primary Administrator...")
            admin = User(
                email=admin_email,
                phone="9876543210",
                role="ADMIN",
                hashed_password=get_password_hash("AdminPass123!"),
                is_active=True,
                last_login_at=datetime.now(timezone.utc)
            )
            db.add(admin)
            db.flush()

        # 2. Subjects
        subjects_data = [
            ("CS101", "Data Structures & Algorithms", "Computer Science & Engineering", 1),
            ("CS102", "Object-Oriented Programming (Java/C++)", "Computer Science & Engineering", 2),
            ("PHY201", "Engineering Physics & Quantum Optics", "Applied Sciences", 2),
            ("CHEM101", "Applied Chemistry & Materials Science", "Applied Sciences", 1),
            ("CS301", "Database Systems & SQL Lab", "Computer Science & Engineering", 3),
            ("AI401", "Computer Vision & Deep Learning", "Artificial Intelligence", 4),
        ]
        created_subjects = []
        for code, name, dept, sem in subjects_data:
            s = db.query(Subject).filter(Subject.code == code).first()
            if not s:
                s = Subject(code=code, name=name, department=dept, semester=sem)
                db.add(s)
                db.flush()
            created_subjects.append(s)

        # 3. Students
        students_data = [
            ("Aarav Sharma", "aarav.sharma@institution.edu", "9123456781", "CS2026001", "Computer Science & Engineering"),
            ("Diya Patel", "diya.patel@institution.edu", "9123456782", "CS2026002", "Computer Science & Engineering"),
            ("Rohan Verma", "rohan.verma@institution.edu", "9123456783", "CS2026003", "Computer Science & Engineering"),
            ("Ananya Iyer", "ananya.iyer@institution.edu", "9123456784", "CS2026004", "Computer Science & Engineering"),
            ("Kabir Mehta", "kabir.mehta@institution.edu", "9123456785", "EC2026001", "Electronics & Communication"),
            ("Sneha Reddy", "sneha.reddy@institution.edu", "9123456786", "EC2026002", "Electronics & Communication"),
            ("Vikram Malhotra", "vikram.m@institution.edu", "9123456787", "AS2026001", "Applied Sciences"),
            ("Pooja Nair", "pooja.nair@institution.edu", "9123456788", "AS2026002", "Applied Sciences"),
        ]

        created_students = []
        for idx, (name, email, phone, roll, dept) in enumerate(students_data, start=101):
            stu_id_str = f"STU-2026-{idx:06d}"
            existing_user = db.query(User).filter(User.email == email).first()
            if not existing_user:
                u = User(
                    email=email,
                    phone=phone,
                    role="STUDENT",
                    hashed_password=get_password_hash("StudentPass123!"),
                    is_active=True
                )
                db.add(u)
                db.flush()

                st = Student(
                    user_id=u.id,
                    student_id=stu_id_str,
                    roll_number=roll,
                    full_name=name,
                    department=dept,
                    batch_year=2026,
                    face_registered=True,
                    is_active=True
                )
                db.add(st)
                db.flush()

                # Generate synthetic normalized 128-d biometric vectors for enrollment
                random.seed(idx)
                for stype in ["FRONT", "LEFT", "RIGHT", "TILT"]:
                    vec = [random.uniform(-1.0, 1.0) for _ in range(128)]
                    norm = sum(x**2 for x in vec) ** 0.5
                    norm_vec = [x / norm for x in vec]
                    fe = FaceEmbedding(
                        student_id=st.id,
                        sample_type=stype,
                        quality_score=round(random.uniform(0.85, 0.98), 2)
                    )
                    fe.set_vector(norm_vec)
                    db.add(fe)

                created_students.append(st)
            else:
                st = db.query(Student).filter(Student.user_id == existing_user.id).first()
                if st:
                    created_students.append(st)

        # 4. Sessions
        today = date.today()
        session_dates = [
            (today - timedelta(days=2)).isoformat(),
            (today - timedelta(days=1)).isoformat(),
            today.isoformat(),
        ]

        sample_sessions = [
            ("Physics Lab Practical - Optics", created_subjects[2].id if len(created_subjects) > 2 else None, "PHYSICS_LAB", "10:00", "12:00", "Physics Lab 201", 15),
            ("Data Structures Laboratory Session", created_subjects[0].id if len(created_subjects) > 0 else None, "COMPUTER_LAB", "14:00", "16:00", "Computing Lab A-102", 15),
            ("Database Management Architecture", created_subjects[4].id if len(created_subjects) > 4 else None, "SUBJECT_CLASS", "09:00", "10:00", "Lecture Hall 3", 10),
        ]

        for s_date in session_dates:
            for title, sub_id, stype, start_t, end_t, room, late_thresh in sample_sessions:
                sess_title = f"{title} ({s_date})"
                existing_s = db.query(AttendanceSession).filter(
                    AttendanceSession.title == sess_title,
                    AttendanceSession.date == s_date
                ).first()

                if not existing_s:
                    status = "COMPLETED" if s_date < today.isoformat() else "ACTIVE"
                    new_s = AttendanceSession(
                        title=sess_title,
                        subject_id=sub_id,
                        session_type=stype,
                        date=s_date,
                        start_time=start_t,
                        end_time=end_t,
                        room=room,
                        late_threshold_minutes=late_thresh,
                        status=status,
                        created_by_user_id=admin.id
                    )
                    db.add(new_s)
                    db.flush()

                    # 5. Populate attendance records for this session
                    sh, sm = [int(x) for x in start_t.split(":")]
                    for student in created_students:
                        # 80% Present, 10% Late, 10% Absent
                        chance = random.random()
                        if chance < 0.75:
                            status_val = "PRESENT"
                            check_in = datetime.strptime(s_date, "%Y-%m-%d").replace(
                                hour=sh, minute=sm + random.randint(1, late_thresh - 2), tzinfo=timezone.utc
                            )
                        elif chance < 0.90:
                            status_val = "LATE"
                            check_in = datetime.strptime(s_date, "%Y-%m-%d").replace(
                                hour=sh, minute=sm + late_thresh + random.randint(3, 20), tzinfo=timezone.utc
                            )
                        else:
                            status_val = "ABSENT"
                            check_in = None

                        rec = AttendanceRecord(
                            session_id=new_s.id,
                            student_id=student.id,
                            check_in_time=check_in,
                            check_out_time=check_in + timedelta(minutes=50) if check_in else None,
                            duration_minutes=50 if check_in else None,
                            status=status_val,
                            verified_by_biometrics=(status_val != "ABSENT"),
                            confidence_score=round(random.uniform(0.72, 0.94), 2) if status_val != "ABSENT" else None
                        )
                        db.add(rec)

        db.commit()
        print("[Seed] Successfully seeded baseline administrative and academic data!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
