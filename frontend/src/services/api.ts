const API_BASE = '/api/v1';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('attend_edge_token');
  }

  public setToken(token: string) {
    localStorage.setItem('attend_edge_token', token);
  }

  public removeToken() {
    localStorage.removeItem('attend_edge_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
        }
      } catch {
        // use default
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- Auth Endpoints ---
  async checkSetupStatus() {
    return this.request<{ is_initialized: boolean; admin_count: number }>('/auth/setup-status');
  }

  async setupInitialAdmin(data: any) {
    return this.request<any>('/auth/setup-initial-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(identifier: string, password: string) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  async changePassword(current_password: string, new_password: string) {
    return this.request<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    });
  }

  // --- Student Management Endpoints ---
  async checkDuplicates(data: { email?: string; phone?: string; roll_number?: string; exclude_student_id?: number }) {
    return this.request<{ valid: boolean; errors: Record<string, string> }>('/students/check-duplicates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async registerStudent(data: any) {
    return this.request<any>('/students/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listStudents(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return this.request<any[]>(`/students?${query.toString()}`);
  }

  async getStudentDetail(id: number) {
    return this.request<any>(`/students/${id}`);
  }

  async updateStudent(id: number, data: any) {
    return this.request<any>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStudent(id: number) {
    return this.request<any>(`/students/${id}`, {
      method: 'DELETE',
    });
  }

  async deactivateStudent(id: number) {
    return this.request<any>(`/students/${id}/deactivate`, { method: 'POST' });
  }

  async reactivateStudent(id: number) {
    return this.request<any>(`/students/${id}/reactivate`, { method: 'POST' });
  }

  async resetStudentPassword(id: number, new_password: string) {
    return this.request<any>(`/students/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password }),
    });
  }

  // --- Biometrics Endpoints ---
  async startLiveness() {
    return this.request<any>('/biometrics/liveness/start', { method: 'POST' });
  }

  async verifyLivenessStep(payload: { session_id: string; landmarks?: number[][]; face_box?: number[]; action_data?: any }) {
    return this.request<any>('/biometrics/liveness/verify-step', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async registerFaceBiometrics(student_id: number, samples: Array<{ sample_type: string; image_base64: string }>, liveness_session_id?: string) {
    return this.request<any>('/biometrics/register-face', {
      method: 'POST',
      body: JSON.stringify({ student_id, samples, liveness_session_id }),
    });
  }

  async scanLiveFrame(session_id: number, image_base64: string, mode: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN') {
    return this.request<any>('/biometrics/scan-frame', {
      method: 'POST',
      body: JSON.stringify({ session_id, image_base64, mode }),
    });
  }

  // --- Sessions & Subjects ---
  async listSubjects() {
    return this.request<any[]>('/sessions/subjects');
  }

  async createSubject(data: { code: string; name: string; department?: string; semester?: number }) {
    return this.request<any>('/sessions/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listSessions(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return this.request<any[]>(`/sessions?${query.toString()}`);
  }

  async getActiveSession() {
    return this.request<any>('/sessions/active');
  }

  async createSession(data: any) {
    return this.request<any>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async startSession(id: number) {
    return this.request<any>(`/sessions/${id}/start`, { method: 'POST' });
  }

  async completeSession(id: number) {
    return this.request<any>(`/sessions/${id}/complete`, { method: 'POST' });
  }

  // --- Attendance Management ---
  async getAttendanceRecords(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return this.request<any[]>(`/attendance?${query.toString()}`);
  }

  async getAbsentStudents(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return this.request<any[]>(`/attendance/absent-students?${query.toString()}`);
  }

  async getLateStudents(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return this.request<any[]>(`/attendance/late-students?${query.toString()}`);
  }

  async overrideAttendance(record_id: number, new_status: string, reason: string) {
    return this.request<any>(`/attendance/override/${record_id}`, {
      method: 'POST',
      body: JSON.stringify({ new_status, reason }),
    });
  }

  getExportCsvUrl(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return `${API_BASE}/attendance/export?${query.toString()}`;
  }

  // --- Analytics ---
  async getDashboardStats() {
    return this.request<any>('/analytics/dashboard');
  }

  async getTrends(days: number = 14, subject_id?: number) {
    const query = new URLSearchParams({ days: String(days) });
    if (subject_id) query.append('subject_id', String(subject_id));
    return this.request<any[]>(`/analytics/trends?${query.toString()}`);
  }

  async getSubjectWiseAnalytics() {
    return this.request<any[]>('/analytics/subjects');
  }

  async getStatusDistribution(days?: number, subject_id?: number) {
    const query = new URLSearchParams();
    if (days) query.append('days', String(days));
    if (subject_id) query.append('subject_id', String(subject_id));
    return this.request<any>(`/analytics/status-distribution?${query.toString()}`);
  }

  // --- Audit Logs ---
  async getAuditLogs(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return this.request<any[]>(`/audit-logs?${query.toString()}`);
  }

  // --- Settings ---
  async getSettings() {
    return this.request<any>('/settings');
  }

  async updateSettings(data: any) {
    return this.request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Diagnostics ---
  async getSystemHealth() {
    return this.request<any>('/health');
  }

  // --- Student Portal ---
  async getStudentDashboard() {
    return this.request<any>('/student-portal/dashboard');
  }

  async getStudentAttendanceHistory(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return this.request<any[]>(`/student-portal/attendance-history?${query.toString()}`);
  }
}

export const api = new ApiClient();
