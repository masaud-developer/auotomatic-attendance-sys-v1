# AttendEdge - Enterprise Face Recognition Attendance Management System

[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4.3-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![OpenCV YuNet + SFace](https://img.shields.io/badge/Computer_Vision-YuNet_%2B_SFace-5C3EE8?style=flat&logo=opencv&logoColor=white)](https://opencv.org/)
[![SQLite WAL](https://img.shields.io/badge/Database-SQLite_WAL-003B57?style=flat&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

**AttendEdge** is an institutional-grade, contactless Face Recognition Attendance Management System designed for colleges, universities, and polytechnics. It replaces manual roll calls and vulnerable RFID cards with real-time deep-learning biometric identification, active anti-spoofing liveness verification, dynamic session management, and immutable audit logs.

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Complete Database Architecture](#2-complete-database-architecture)
   - [Database Configuration & Engine](#database-configuration--engine)
   - [Schema & Tables Specification](#schema--tables-specification)
   - [Entity-Relationship Diagram](#entity-relationship-diagram)
   - [Database Constraints & Integrity Rules](#database-constraints--integrity-rules)
3. [Biometric Computer Vision Pipeline](#3-biometric-computer-vision-pipeline)
   - [Face Detection (OpenCV YuNet)](#face-detection-opencv-yunet)
   - [Feature Embedding (OpenCV SFace)](#feature-embedding-opencv-sface)
   - [Similarity & Cosine Metric](#similarity--cosine-metric)
   - [Active & Passive Anti-Spoofing (Liveness)](#active--passive-anti-spoofing-liveness)
4. [Complete Backend API Reference](#4-complete-backend-api-reference)
   - [Authentication Router (`/api/v1/auth`)](#1-authentication-router-apiv1auth)
   - [Student Management Router (`/api/v1/students`)](#2-student-management-router-apiv1students)
   - [Biometrics Router (`/api/v1/biometrics`)](#3-biometrics-router-apiv1biometrics)
   - [Attendance Sessions Router (`/api/v1/sessions`)](#4-attendance-sessions-router-apiv1sessions)
   - [Attendance Records Router (`/api/v1/attendance`)](#5-attendance-records-router-apiv1attendance)
   - [Analytics & Reports Router (`/api/v1/analytics`)](#6-analytics--reports-router-apiv1analytics)
   - [Audit Logs Router (`/api/v1/audit`)](#7-audit-logs-router-apiv1audit)
   - [System Settings Router (`/api/v1/settings`)](#8-system-settings-router-apiv1settings)
   - [Student Personal Portal Router (`/api/v1/student-portal`)](#9-student-personal-portal-router-apiv1student-portal)
   - [System Health Check Router (`/api/v1/health`)](#10-system-health-check-router-apiv1health)
5. [Frontend Architecture & UI Design](#5-frontend-architecture--ui-design)
   - [Apple-Inspired UI Typography](#apple-inspired-ui-typography)
   - [Hardware-Controlled Camera Management](#hardware-controlled-camera-management)
   - [Real-Time Scanning HUD & Synthetic Audio](#real-time-scanning-hud--synthetic-audio)
   - [Dual Dedicated Portals (Admin vs Student)](#dual-dedicated-portals-admin-vs-student)
6. [Security & Compliance](#6-security--compliance)
7. [Default Credentials & Role Matrix](#7-default-credentials--role-matrix)
8. [Installation & Setup Guide](#8-installation--setup-guide)
9. [Automated Testing Suite](#9-automated-testing-suite)
10. [Presentation & Function Materials](#10-presentation--function-materials)
11. [Project Directory Layout](#11-project-directory-layout)

---

## 1. Architectural Overview

AttendEdge utilizes a decoupled full-stack architecture optimized for high concurrency, zero latency, and hardware independence:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (Browser)                          │
│   React 19 + TypeScript + Vite + Tailwind CSS v4 (Apple UI Styling)         │
│   WebRTC HTML5 Camera Feed • Web Audio API Synthesizer • Recharts Engine     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / REST (JSON)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BACKEND API LAYER                               │
│                   FastAPI (Python 3.11) with Uvicorn ASGI                   │
│   Route Guards (RBAC) • JWT Stateless Token Auth (HS256) • Pydantic v2      │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │                                     │
                    ▼                                     ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     BIOMETRIC VISION ENGINE          │  │        PERSISTENCE LAYER          │
│  - OpenCV YuNet (Face Detection)     │  │  SQLAlchemy 2.0 ORM               │
│  - 5-Point Sub-pixel Landmarks       │  │  SQLite with WAL Mode Enabled     │
│  - SFace 128-D CNN Embeddings        │  │  Foreign Keys Enforced (PRAGMA)   │
│  - Active Motion Challenge Engine    │  │  Unique (session_id, student_id)  │
│  - Cosine Distance Threshold (0.58)  │  │  Audit Logs & Settings Storage    │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

---

## 2. Complete Database Architecture

### Database Configuration & Engine
- **Engine**: SQLite 3 with SQLAlchemy 2.0 ORM.
- **Location**: `backend/attendance.db`
- **Concurrency Mode**: **WAL (Write-Ahead Logging)** enabled via SQLite connection hooks:
  - `PRAGMA journal_mode = WAL;` (Enables concurrent reads during writes).
  - `PRAGMA synchronous = NORMAL;` (Maximizes write performance while preserving ACID durability).
  - `PRAGMA foreign_keys = ON;` (Strict referential integrity enforcement).

---

### Schema & Tables Specification

The system comprises **8 relational database tables**:

#### 1. `users` Table
Stores authenticated system users with role segregation.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Unique user identifier |
| `email` | `VARCHAR(128)` | `UNIQUE`, `INDEX`, `NOT NULL` | User email address |
| `phone` | `VARCHAR(20)` | `UNIQUE`, `INDEX`, `NULLABLE` | 10-digit phone number |
| `hashed_password` | `VARCHAR(255)` | `NOT NULL` | Bcrypt password hash |
| `role` | `VARCHAR(20)` | `NOT NULL`, `DEFAULT 'STUDENT'` | Enum: `'ADMIN'`, `'STUDENT'` |
| `failed_login_attempts` | `INTEGER` | `DEFAULT 0` | Counter for failed logins |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE`, `INDEX` | Account active status flag |
| `last_login_at` | `DATETIME` | `NULLABLE` | UTC timestamp of latest login |
| `created_at` | `DATETIME` | `DEFAULT utc_now`, `NOT NULL` | Record creation timestamp |

#### 2. `students` Table
Stores student academic profiles linked to authentication credentials.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Internal primary key |
| `user_id` | `INTEGER` | `FOREIGN KEY(users.id)`, `UNIQUE` | One-to-one user link (`CASCADE`) |
| `student_id` | `VARCHAR(32)` | `UNIQUE`, `INDEX`, `NOT NULL` | Institutional ID (`STU-YYYY-XXXXXX`) |
| `roll_number` | `VARCHAR(32)` | `UNIQUE`, `INDEX`, `NOT NULL` | Class roll number (e.g., `0001`) |
| `full_name` | `VARCHAR(128)` | `INDEX`, `NOT NULL` | Student full legal name |
| `department` | `VARCHAR(128)` | `INDEX`, `NOT NULL` | Academic department / major |
| `batch_year` | `INTEGER` | `NOT NULL` | Enrollment graduation year |
| `face_registered` | `BOOLEAN` | `DEFAULT FALSE`, `INDEX` | Biometric enrollment flag |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE`, `INDEX` | Student status flag |
| `created_at` | `DATETIME` | `DEFAULT utc_now` | Enrollment timestamp |
| `updated_at` | `DATETIME` | `DEFAULT utc_now`, `ON UPDATE` | Last profile update timestamp |

#### 3. `subjects` Table
Maintains academic curriculum subjects and laboratories.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Subject identifier |
| `code` | `VARCHAR(32)` | `UNIQUE`, `INDEX`, `NOT NULL` | Course code (e.g., `CS101`) |
| `name` | `VARCHAR(128)` | `NOT NULL` | Full course title |
| `department` | `VARCHAR(128)` | `INDEX`, `NOT NULL` | Offering department |
| `semester` | `INTEGER` | `NOT NULL`, `DEFAULT 1` | Semester term number |
| `created_at` | `DATETIME` | `DEFAULT utc_now` | Subject registration date |

#### 4. `attendance_sessions` Table
Manages on-demand attendance tracking periods (lectures, labs, exams).
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Session identifier |
| `title` | `VARCHAR(128)` | `NOT NULL` | Session title entered by admin |
| `subject_id` | `INTEGER` | `FOREIGN KEY(subjects.id)`, `NULLABLE` | Course link (optional for custom) |
| `session_type` | `VARCHAR(32)` | `NOT NULL`, `DEFAULT 'LECTURE'` | `'LECTURE'`, `'LAB'`, `'CUSTOM'`, `'EXAM'` |
| `date` | `VARCHAR(10)` | `INDEX`, `NOT NULL` | Date in `YYYY-MM-DD` ISO format |
| `start_time` | `VARCHAR(8)` | `NOT NULL` | Start time in `HH:MM` 24h format |
| `end_time` | `VARCHAR(8)` | `NOT NULL` | End time in `HH:MM` 24h format |
| `room` | `VARCHAR(64)` | `NOT NULL` | Classroom, lab room, or terminal |
| `late_threshold_minutes` | `INTEGER` | `DEFAULT 15` | Grace period minutes before 'LATE' |
| `attendance_mode` | `VARCHAR(32)` | `DEFAULT 'FACE_ONLY'` | Mode: `'FACE_ONLY'`, `'HYBRID'` |
| `status` | `VARCHAR(20)` | `DEFAULT 'ACTIVE'`, `INDEX` | `'SCHEDULED'`, `'ACTIVE'`, `'COMPLETED'` |
| `created_by_user_id` | `INTEGER` | `FOREIGN KEY(users.id)` | Admin who created session |
| `created_at` | `DATETIME` | `DEFAULT utc_now` | Session creation timestamp |

#### 5. `attendance_records` Table
Stores immutable attendance verifications with duplicate prevention.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Record identifier |
| `session_id` | `INTEGER` | `FOREIGN KEY(attendance_sessions.id)` | Session link (`CASCADE`) |
| `student_id` | `INTEGER` | `FOREIGN KEY(students.id)` | Student link (`CASCADE`) |
| `check_in_time` | `DATETIME` | `DEFAULT utc_now`, `NOT NULL` | Exact biometric check-in timestamp |
| `check_out_time` | `DATETIME` | `NULLABLE` | Check-out timestamp |
| `status` | `VARCHAR(20)` | `NOT NULL`, `INDEX` | `'PRESENT'`, `'LATE'`, `'ABSENT'` |
| `verification_confidence`| `FLOAT` | `NOT NULL` | Cosine similarity score (e.g. `0.842`) |
| `entry_mode` | `VARCHAR(32)` | `DEFAULT 'FACE_RECOGNITION'` | Entry method |
| `is_manual_override` | `BOOLEAN` | `DEFAULT FALSE` | True if modified by admin |
| `override_reason` | `TEXT` | `NULLABLE` | Mandatory justification for audit |
| `override_by_user_id` | `INTEGER` | `FOREIGN KEY(users.id)` | Admin ID who modified mark |
| `created_at` | `DATETIME` | `DEFAULT utc_now`, `INDEX` | Record timestamp |

> **Critical Constraint**: `UNIQUE(session_id, student_id)` — Prevents any student from being marked twice in the same session.

#### 6. `face_embeddings` Table
Stores 128-dimensional L2-normalized float embedding vectors extracted by SFace CNN.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Embedding record identifier |
| `student_id` | `INTEGER` | `FOREIGN KEY(students.id)` | Enrolled student link (`CASCADE`) |
| `embedding_json` | `TEXT` | `NOT NULL` | JSON serialized array of 128 floats |
| `sample_index` | `INTEGER` | `DEFAULT 0` | Sample angle index (Front, Angle, etc.) |
| `quality_score` | `FLOAT` | `DEFAULT 1.0` | Laplacian sharpness/variance score |
| `liveness_score` | `FLOAT` | `DEFAULT 1.0` | Active liveness challenge score |
| `created_at` | `DATETIME` | `DEFAULT utc_now` | Registration timestamp |

#### 7. `system_settings` Table
Institutional key-value configuration table.
| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `institution_name` | `TEXT` | `National Institute of Science...` | Official college name |
| `institution_code` | `TEXT` | `NIST` | Institutional short code prefix |
| `timezone` | `TEXT` | `Asia/Kolkata` | Standard local timezone |
| `recognition_threshold` | `TEXT` | `0.58` | Cosine similarity positive match threshold |
| `duplicate_face_threshold`| `TEXT` | `0.65` | Threshold to flag duplicate face on registration |
| `late_threshold_minutes` | `TEXT` | `15` | Default grace period before marked LATE |
| `audio_enabled` | `TEXT` | `true` | Synthesized audio alert toggle |
| `liveness_enabled` | `TEXT` | `true` | Active liveness challenge enforcement |
| `liveness_sensitivity` | `TEXT` | `medium` | Sensitivity level (`low`, `medium`, `high`) |

#### 8. `audit_logs` Table
Regulatory audit trail logging all sensitive operations.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Audit log sequence identifier |
| `user_id` | `INTEGER` | `FOREIGN KEY(users.id)` | Acting user |
| `user_email` | `VARCHAR(128)` | `NULLABLE` | Recorded email of actor |
| `action` | `VARCHAR(64)` | `INDEX`, `NOT NULL` | Action code (`ADMIN_LOGIN`, `ATTENDANCE_OVERRIDE`, etc.) |
| `entity_type` | `VARCHAR(64)` | `NULLABLE` | Targeted entity (`Student`, `Session`, `Record`) |
| `entity_id` | `VARCHAR(64)` | `NULLABLE` | Target identifier |
| `details_json` | `TEXT` | `NULLABLE` | Detailed payload context / diff |
| `ip_address` | `VARCHAR(64)` | `NULLABLE` | Client network IP address |
| `timestamp` | `DATETIME` | `INDEX`, `NOT NULL` | Immutable event timestamp (UTC) |

---

## 3. Biometric Computer Vision Pipeline

```
Raw Camera Frame (WebRTC 1280x720)
       │
       ▼
[1. Passive Quality Filter] ──────► Blurry / Glare? ──► [Reject Frame]
       │ (Laplacian Variance > 60)
       ▼
[2. YuNet Deep Detector (ONNX)] ──► Extracts 5 Landmarks (Eyes, Nose, Mouth)
       │
       ▼
[3. Face Alignment & Crop] ──────► 112x112 Affine Normalized Face Crop
       │
       ▼
[4. SFace CNN Extractor] ────────► 128-Dimensional Float Vector (L2-Normalized)
       │
       ▼
[5. Cosine Distance Matching] ───► cos_sim(e1, e2) > 0.58?
       │
       ├── YES ──► Check (session_id, student_id) in DB ──► [Record Marked]
       └── NO  ──► Unrecognized / Unknown Face
```

### Face Detection (OpenCV YuNet)
- **Model**: `face_detection_yunet_2023mar.onnx`
- **Architecture**: Lightweight deep neural network optimized for CPU/NPU edge inference.
- **Landmark Coordinates**: Extracts 5 precise sub-pixel coordinates:
  - Right Eye $(x_1, y_1)$
  - Left Eye $(x_2, y_2)$
  - Nose Tip $(x_3, y_3)$
  - Right Mouth Corner $(x_4, y_4)$
  - Left Mouth Corner $(x_5, y_5)$
- **Inference Time**: ~15ms to 30ms on standard Intel/AMD CPU.

### Feature Embedding (OpenCV SFace)
- **Model**: `face_recognition_sface_2021dec.onnx`
- **Output**: 128-dimensional hyperspherical embedding vector:
  $$\vec{E} = [e_1, e_2, \dots, e_{128}], \quad \|\vec{E}\|_2 = 1.0$$
- **Invariance**: Robust against variations in ambient illumination, minor head pose yaw/pitch ($\pm 35^\circ$), and normal facial expressions.

### Similarity & Cosine Metric
Positive identity recognition evaluates the dot product of two L2-normalized vectors:
$$\text{Cosine Similarity}(\vec{A}, \vec{B}) = \frac{\vec{A} \cdot \vec{B}}{\|\vec{A}\| \|\vec{B}\|} = \sum_{i=1}^{128} A_i B_i$$
- **Recognition Threshold**: **$\ge 0.58$** confirms matching identity.
- **Duplicate Registration Threshold**: **$\ge 0.65$** prevents enrolling a student whose face already exists under another record.

### Active & Passive Anti-Spoofing (Liveness)
1. **Passive Checks**:
   - **Laplacian Variance Blur Filter**: $\sigma^2(\nabla^2 I) < 60$ flags blurred or motion-distorted images.
   - **Illumination Balance**: Rejects overexposed glare or extreme shadowing via pixel intensity histograms.
2. **Active Interactive Challenges**:
   - Random prompt generator requests physical gestures:
     - `BLINK` (Monitors eye aspect ratio collapse & recovery)
     - `SMILE` (Monitors mouth width-to-height ratio expansion)
     - `TURN_LEFT` & `TURN_RIGHT` (Monitors nose-to-eye horizontal distance shifts)
   - Thwarts static photographs, printed badges, and pre-recorded phone video playback.

---

## 4. Complete Backend API Reference

Base API Prefix: `/api/v1`  
All protected routes require standard HTTP header: `Authorization: Bearer <JWT_ACCESS_TOKEN>`

### 1. Authentication Router (`/api/v1/auth`)

| Method | Endpoint | Access | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/auth/setup-status` | Public | None | Returns whether system has an admin initialized (`{ is_initialized: bool, admin_count: int }`). |
| `POST` | `/auth/setup-initial-admin` | Public | `{ email, phone, password, full_name, institution_name }` | Initial system onboarding for first administrator. |
| `POST` | `/auth/login` | Public | `{ identifier, password }` | Authenticates Admin or Student. Identifier accepts **email**, **phone**, **student ID** (`STU-XXXX`), **roll number** (`0001`), or **`admin` shortcut**. |
| `GET` | `/auth/me` | Authenticated | None | Returns authenticated user profile, roles, and linked student data. |
| `POST` | `/auth/change-password` | Authenticated | `{ current_password, new_password }` | Allows users to change their own password. |

### 2. Student Management Router (`/api/v1/students`)

| Method | Endpoint | Access | Query / Body Params | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/students` | Admin | `search`, `status_filter`, `department`, `page`, `limit` | Paginated search across Name, Roll, Student ID, Email, and Phone with live today-status computation. |
| `POST` | `/students` | Admin | `{ full_name, email, phone, roll_number, department, batch_year, password }` | Registers new student, validates roll number and email uniqueness, generates `STU-YYYY-XXXXXX` ID. |
| `GET` | `/students/{id}` | Admin | Path `id: int` | Comprehensive profile detail including attendance stats, recent session history, and face sample counts. |
| `PUT` | `/students/{id}` | Admin | Path `id`, Body `{ full_name, email, phone, roll_number, department, batch_year, is_active }` | Updates student profile with collision checks. |
| `DELETE` | `/students/{id}` | Admin | Path `id: int` | Deletes student, cascades face embeddings and attendance records, logs audit event. |
| `POST` | `/students/{id}/deactivate` | Admin | Path `id: int` | Soft-deactivates student account. |
| `POST` | `/students/{id}/reactivate` | Admin | Path `id: int` | Restores inactive student account. |
| `POST` | `/students/{id}/reset-password` | Admin | Body `{ new_password: str }` | Resets a student's portal password. |

### 3. Biometrics Router (`/api/v1/biometrics`)

| Method | Endpoint | Access | Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/biometrics/register-face` | Admin | `{ student_id: int, image_base64: str, sample_index: int }` | Extracts 128-D vector, checks duplicate face threshold across all enrolled students, stores embedding. |
| `POST` | `/biometrics/verify-frame` | Admin | `{ session_id: int, image_base64: str }` | Live scanner frame matching. Evaluates face, finds student, checks duplicate marking, computes late status, returns student card & audio flag. |
| `POST` | `/biometrics/liveness-challenge` | Admin | `{ challenge_type: str, image_base64: str }` | Verifies active physical gesture against requested challenge. |
| `GET` | `/biometrics/status/{student_id}` | Admin | Path `student_id: int` | Returns face registration status and sample count. |
| `DELETE` | `/biometrics/{student_id}` | Admin | Path `student_id: int` | Purges all enrolled face embeddings for re-registration. |

### 4. Attendance Sessions Router (`/api/v1/sessions`)

| Method | Endpoint | Access | Parameters | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/sessions` | Admin | `status_filter`, `date_filter` | Lists attendance sessions with attendee counts and status tags. |
| `POST` | `/sessions` | Admin | `{ title, subject_id, custom_subject_name, session_type, date, start_time, end_time, room, late_threshold_minutes, auto_start }` | Creates on-demand session with custom hours and custom subject support. |
| `GET` | `/sessions/{id}` | Admin | Path `id: int` | Retrieves detailed session stats, present list, late list, and absent rosters. |
| `POST` | `/sessions/{id}/start` | Admin | Path `id: int` | Transitions session from SCHEDULED to ACTIVE. |
| `POST` | `/sessions/{id}/complete`| Admin | Path `id: int` | Completes session and computes absent records. |
| `POST` | `/sessions/{id}/cancel` | Admin | Path `id: int` | Cancels scheduled or active session. |

### 5. Attendance Records Router (`/api/v1/attendance`)

| Method | Endpoint | Access | Parameters | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/attendance/records` | Admin | `session_id`, `student_id`, `status`, `date_from`, `date_to` | Filtered list of verified attendance records. |
| `POST` | `/attendance/manual-mark` | Admin | `{ session_id, student_id, status, reason }` | Manual attendance override. Mandatory justification recorded in immutable audit log. |
| `GET` | `/attendance/export-csv` | Admin | Query filters matching records table | Generates structured CSV download containing names, rolls, session titles, timestamps, and confidence. |

### 6. Analytics & Reports Router (`/api/v1/analytics`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/dashboard-summary` | Admin | Aggregated stats: total students, active sessions, attendance rate today, late percentage, low-attendance alerts. |
| `GET` | `/analytics/attendance-trends` | Admin | Day-by-day and week-by-week attendance trend lines for Recharts. |
| `GET` | `/analytics/subject-comparison` | Admin | Subject-wise attendance percentages comparing lectures and practical labs. |
| `GET` | `/analytics/defaulters` | Admin | Roster of students with attendance $<75\%$ facing exam eligibility restrictions. |

### 7. Audit Logs Router (`/api/v1/audit`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/audit/logs` | Admin | Paginated security logbook tracking logins, overrides, enrollments, student deletions, and settings changes. |

### 8. System Settings Router (`/api/v1/settings`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/settings` | Admin | Retrieves all institutional system configuration key-values. |
| `PUT` | `/settings` | Admin | Updates thresholds (recognition similarity, duplicate face limit), grace periods, and timezone. |

### 9. Student Personal Portal Router (`/api/v1/student-portal`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/student-portal/dashboard` | Student | Personal dashboard: total attendance percentage dial, subject-by-subject breakdown cards, eligibility warning status. |
| `GET` | `/student-portal/history` | Student | Chronological history of all attended sessions with check-in timestamps and entry modes. |

### 10. System Health Check Router (`/api/v1/health`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | System status check returning database connectivity, YuNet detector state, SFace recognizer state, and operational status. |

---

## 5. Frontend Architecture & UI Design

### Apple-Inspired UI Typography
The interface adheres to an executive, modern design system:
- **Typography Stack**: `Plus Jakarta Sans`, `SF Pro Display`, `Inter`.
- **Tracking & Geometry**: `-0.015em` body letter tracking and `-0.028em` bold headings.
- **Color System**:
  - Backgrounds: Dark Slate `#0F172A` (Title/Nav) & Soft Clean Slate `#F8FAFC` (Panels).
  - Cards: Pure White `#FFFFFF` with subtle slate borders `#E2E8F0`.
  - Brand Indigo: `#4F46E5` (Primary buttons, accents, active states).
  - Success Emerald: `#10B981` (Verified presence, high attendance).
  - Alert Amber: `#F59E0B` (Late arrival, liveness challenges).
  - Danger Rose: `#EF4444` (Absenteeism, duplicate face rejection, account deactivation).

### Hardware-Controlled Camera Management
- **True Track Release**: Clicking the **Stop Camera** button iterates over all active `MediaStreamTrack` objects and executes `track.stop()`.
- **Zero Background Resource Drain**: The browser completely releases webcam hardware access; the camera LED turns off immediately.
- **Auto-Cleanup**: All camera components detach media streams upon tab switching or page unmounting.

### Real-Time Scanning HUD & Synthetic Audio
- **Animated Laser Reticle**: High-tech animated laser scanline over the live video view.
- **Web Audio API Sound Engine**:
  - `playSuccessBeep()`: Ascending two-tone chime (523Hz $\to$ 659Hz) on positive attendance confirmation.
  - `playWarningBeep()`: Lower alert tone (330Hz) on duplicate scan or late arrival.
  - Fully muttable via UI toggle.

### Dual Dedicated Portals (Admin vs Student)
1. **Administrator Portal**:
   - Live Scanner Station
   - Student Onboarding & Multi-Sample Biometric Enrollment
   - Student Directory (Search, Filter, Edit, Delete, Password Reset)
   - Dynamic Session Creator (Custom Hours, Custom Subjects)
   - Attendance Records & Manual Overrides
   - CSV Export & Institutional Analytics
   - System Configuration & Audit Logs
2. **Student Portal**:
   - Attendance Percentage Dial (Visual comparison against the 75% requirement)
   - Subject-Wise Breakdown Cards
   - Exam Eligibility Warning Badges
   - Personal Historical Timeline

---

## 6. Security & Compliance

1. **Authentication Security**:
   - Stateless JWT tokens signed with `HS256`.
   - Passwords securely hashed with Bcrypt (cost factor 12) via `passlib`.
2. **Route Authorization Guards**:
   - `get_current_user`: Validates JWT signature, expiration, and user active status.
   - `get_current_admin`: Strictly blocks non-admin users with `HTTP 403 Forbidden`.
3. **Database Integrity**:
   - Unique constraints prevent duplicate student enrollments, duplicate roll numbers, and duplicate session marks.
4. **Audit Compliance**:
   - Every administrative manual attendance override mandates an explicit reason string recorded in the immutable audit log table.

---

## 7. Default Credentials & Role Matrix

| Role | Username / Identifier Options | Password | Accessible Portals |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin`<br>`admin@institution.edu`<br>`admin@ins.edu`<br>`admin@institute.edu`<br>`9876543210` | `AdminPass123!` | Full Administrative Dashboard, Live Scanner, Student Registration, Audit Logs, Settings, Analytics. |
| **Student (Masaud)**| `STU-2026-000101`<br>`0001`<br>`mesaud@gmail.com`<br>`4857425648` | Password configured during registration | Student Dashboard, Attendance Percentage Dial, Subject Breakdown, Session Timeline. |

> **Tip**: The login page includes a one-click **"Auto-fill Admin"** button and a password visibility toggle.

---

## 8. Installation & Setup Guide

### Prerequisites
- **Python**: Version `3.11.x`
- **Node.js**: Version `18.x` or `20.x`
- **Git**: Installed and configured

### 1. Repository Setup
```powershell
git clone <repository_url>
cd mm
```

### 2. Backend Setup
```powershell
cd backend

# Create Python 3.11 virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run FastAPI Server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is live at:
- Base: `http://127.0.0.1:8000`
- Swagger Documentation: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
Open a second terminal window:
```powershell
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 9. Automated Testing Suite

The backend includes a comprehensive `pytest` test suite verifying all critical business workflows:

```powershell
cd backend
.\venv\Scripts\pytest tests/test_system.py -v
```

### Tests Covered:
- `test_system_health`: Checks root status and `/health` biometrics readiness.
- `test_admin_login`: Verifies JWT issuance and multi-identifier login.
- `test_student_registration_validation`: Verifies email and roll number uniqueness.
- `test_biometric_face_registration_and_duplicate_detection`: Tests SFace 128-D vector extraction and duplicate face rejection.
- `test_session_creation_and_attendance_marking`: Validates session creation and `(session_id, student_id)` uniqueness.
- `test_manual_attendance_override_and_audit`: Verifies administrative overrides and mandatory audit logging.
- `test_role_based_access_isolation`: Ensures students cannot access admin routes (`403 Forbidden`).

---

## 10. Presentation & Function Materials

For presenting this project at college symposiums, annual functions, or technical reviews, two complete presentation formats are provided in the root directory:

1. **PowerPoint Presentation (`.pptx`)**:
   - File: [`AttendEdge_Presentation.pptx`](AttendEdge_Presentation.pptx)
   - 10 Widescreen 16:9 executive slides.
   - Built with native vector shapes, card layouts, and website color palette.
   - Open and present directly with Microsoft PowerPoint, Google Slides, or Keynote.
2. **Interactive Web Slide Deck (`.html`)**:
   - File: [`presentation.html`](presentation.html)
   - Open in any modern web browser.
   - Fullscreen mode (press `F`), progress bar, and keyboard arrow navigation (`Right`/`Left`/`Space`).
   - Print or export to PDF anytime via `Ctrl + P`.
3. **Slide Generator Script**:
   - File: [`create_presentation.py`](create_presentation.py)
   - Python script to regenerate or customize slides anytime using `python-pptx`.

---

## 11. Project Directory Layout

```
mm/
├── AttendEdge_Presentation.pptx # 16:9 Executive PowerPoint Presentation
├── presentation.html            # Standalone Interactive HTML Slide Deck
├── create_presentation.py       # Slide deck generation script
├── README.md                    # Complete project documentation
├── .gitignore                   # Root Git ignore configuration
│
├── backend/
│   ├── app/
│   │   ├── api/                 # API route handlers
│   │   │   ├── analytics.py     # Attendance trends, subject comparisons, defaulters
│   │   │   ├── attendance.py    # Attendance marking, manual overrides, CSV export
│   │   │   ├── audit.py         # Institutional audit trail endpoints
│   │   │   ├── auth.py          # Authentication, JWT issuance, multi-identifier login
│   │   │   ├── biometrics.py    # Face registration, frame verification, liveness
│   │   │   ├── deps.py          # Dependencies, JWT extraction, audit logging
│   │   │   ├── health.py        # System health and readiness probes
│   │   │   ├── sessions.py      # Dynamic session creation and lifecycle
│   │   │   ├── settings.py      # Institutional configuration endpoints
│   │   │   ├── student_portal.py# Student self-service personal portal
│   │   │   └── students.py      # Student CRUD, search, pagination, password reset
│   │   ├── core/
│   │   │   ├── config.py        # Settings and environment configuration
│   │   │   └── security.py      # Password hashing and JWT token generator
│   │   ├── database/
│   │   │   ├── models.py        # SQLAlchemy relational ORM models (8 tables)
│   │   │   └── session.py       # SQLite engine, WAL mode PRAGMA, SessionLocal
│   │   ├── recognition/
│   │   │   ├── detector.py      # OpenCV YuNet deep-learning detector (5 landmarks)
│   │   │   ├── liveness.py      # Active interactive challenge state machine
│   │   │   ├── recognizer.py    # OpenCV SFace 128-D CNN embedding extractor
│   │   │   └── service.py       # Unified computer vision recognition service
│   │   ├── schemas/             # Pydantic v2 validation models
│   │   └── main.py              # FastAPI factory, lifespan startup, CORS
│   ├── models_cache/            # Cached ONNX neural weights (YuNet & SFace)
│   ├── tests/
│   │   └── test_system.py       # Automated integration test suite
│   ├── attendance.db            # Production SQLite database (WAL mode)
│   ├── requirements.txt         # Python dependencies
│   ├── seed.py                  # Optional institutional seed utility
│   └── README.md                # Backend technical overview
│
└── frontend/
    ├── public/                  # Favicon and static assets
    ├── src/
    │   ├── components/          # Reusable UI components (Modal, StatCard, Badge, ProtectedRoute)
    │   ├── contexts/            # React AuthContext (JWT profile management)
    │   ├── layouts/             # AdminLayout and StudentLayout
    │   ├── pages/
    │   │   ├── AdminDashboard.tsx         # Executive KPI summary & quick actions
    │   │   ├── AnalyticsPage.tsx          # Recharts visualizations & defaulter roster
    │   │   ├── AttendancePage.tsx         # Records table, filters, override modal, CSV export
    │   │   ├── AuditLogsPage.tsx          # Regulatory audit trail viewer
    │   │   ├── InitialSetupPage.tsx       # First-time admin onboarding wizard
    │   │   ├── LiveScannerPage.tsx        # Camera HUD, reticle, audio chimes, hardware stop
    │   │   ├── LoginPage.tsx              # Multi-identifier login, eye toggle, auto-fill
    │   │   ├── SessionsPage.tsx           # Custom session creator & monitor
    │   │   ├── SettingsPage.tsx           # Institutional threshold & policy settings
    │   │   ├── StudentDashboardPage.tsx   # Student personal view, attendance dial, history
    │   │   ├── StudentRegistrationPage.tsx# Step wizard, multi-sample capture, liveness
    │   │   └── StudentsPage.tsx           # Directory search, edit, delete, password reset
    │   ├── services/
    │   │   ├── api.ts           # Centralized typed HTTP API client
    │   │   └── audio.ts         # Web Audio API synthetic tone chime synthesizer
    │   ├── types/               # TypeScript interfaces and enum definitions
    │   ├── App.tsx              # Application route tree
    │   ├── index.css            # Tailwind CSS v4 & Apple UI typography configuration
    │   └── main.tsx             # React DOM entrypoint
    ├── package.json             # Frontend dependencies & scripts
    ├── tsconfig.json            # TypeScript configuration
    └── vite.config.ts           # Vite bundler & backend proxy config
```

---

## 12. License & Institutional Use

This software is developed for deployment in colleges, universities, and educational institutions.  
Designed and built by **Masaud Hasan & Project Team**. All rights reserved.
