export type UserRole = 'ADMIN' | 'STUDENT';

export interface User {
  id: number;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface Student {
  id: number;
  user_id: number;
  student_id: string;
  roll_number: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  batch_year: number;
  face_registered: boolean;
  is_active: boolean;
  created_at: string;
  today_status?: 'PRESENT' | 'LATE' | 'ABSENT' | 'NOT_MARKED';
  attendance_percentage: number;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  department: string;
  semester: number;
  is_active: boolean;
}

export interface AttendanceSession {
  id: number;
  title: string;
  subject_id?: number;
  subject_name?: string;
  subject_code?: string;
  session_type: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  late_threshold_minutes: number;
  attendance_mode: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
  created_at: string;
  total_marked: number;
  present_count: number;
  late_count: number;
  absent_count: number;
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  session_title: string;
  session_date: string;
  subject_name: string;
  student_id: number;
  student_code: string;
  roll_number: string;
  student_name: string;
  student_email?: string;
  student_phone?: string;
  check_in_time?: string;
  check_out_time?: string;
  duration_minutes?: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  verified_by_biometrics: boolean;
  confidence_score?: number;
  is_manual_override: boolean;
  override_reason?: string;
  created_at: string;
}

export interface AbsentStudent {
  student_id: number;
  student_code: string;
  roll_number: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  session_id: number;
  session_title: string;
  subject_name?: string;
  status: string;
}

export interface LateStudent {
  student_id: number;
  student_code: string;
  roll_number: string;
  full_name: string;
  session_id: number;
  session_title: string;
  scheduled_start: string;
  actual_arrival: string;
  minutes_late: number;
  status: string;
}

export interface DashboardStats {
  total_students: number;
  active_students: number;
  inactive_students: number;
  today_present: number;
  today_absent: number;
  today_late: number;
  overall_attendance_rate: number;
  active_session?: {
    id: number;
    title: string;
    subject: string;
    room: string;
    start_time: string;
    end_time: string;
    marked_count: number;
  };
  recent_activity: Array<{
    id: number;
    student_name: string;
    student_code: string;
    roll_number: string;
    session_title: string;
    status: string;
    time: string;
    date: string;
  }>;
  system_status: {
    camera: string;
    biometrics_engine: string;
    database: string;
    api: string;
  };
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  user_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  timestamp: string;
}

export interface SystemSettings {
  recognition_threshold: number;
  duplicate_face_threshold: number;
  late_threshold_minutes: number;
  institution_name: string;
  institution_code: string;
  timezone: string;
  audio_enabled: boolean;
  liveness_enabled: boolean;
  liveness_sensitivity: string;
}
