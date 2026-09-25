import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, UserCheck, UserX, Clock, 
  Percent, MoreHorizontal, Edit, RefreshCw, Key, 
  X, CheckCircle2, AlertCircle, ArrowUpDown, ChevronRight,
  Eye, UserPlus, Phone, Mail, Hash, Trash2
} from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { Student } from '../types';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [todayFilter, setTodayFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'low' | 'high'>('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Selected Student Profile Modal / Drawer
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edit Modal
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    roll_number: '',
    email: '',
    phone: '',
    department: '',
    batch_year: 2026,
  });
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Password Reset Modal
  const [resetStudentId, setResetStudentId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await api.listStudents({
        search: search.trim() || undefined,
        status_filter: statusFilter !== 'all' ? statusFilter : undefined,
        today_status_filter: todayFilter !== 'all' ? todayFilter : undefined,
        attendance_filter: attendanceFilter !== 'all' ? attendanceFilter : undefined,
        sort_by: sortBy,
        order: sortOrder,
        limit: 100,
      });
      setStudents(data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(handler);
  }, [search, statusFilter, todayFilter, attendanceFilter, sortBy, sortOrder]);

  // Open profile detail
  const handleOpenProfile = async (id: number) => {
    setSelectedStudentId(id);
    setLoadingDetail(true);
    try {
      const detail = await api.getStudentDetail(id);
      setStudentDetail(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Toggle active/inactive
  const handleToggleActive = async (student: Student) => {
    try {
      if (student.is_active) {
        await api.deactivateStudent(student.id);
      } else {
        await api.reactivateStudent(student.id);
      }
      fetchStudents();
      if (selectedStudentId === student.id) {
        handleOpenProfile(student.id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setEditError(null);
    try {
      await api.updateStudent(editStudent.id, editFormData);
      setEditStudent(null);
      fetchStudents();
    } catch (err: any) {
      setEditError(err.message || 'Update failed.');
    }
  };

  // Handle Delete Student
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    try {
      await api.deleteStudent(studentToDelete.id);
      const deletedId = studentToDelete.id;
      setStudentToDelete(null);
      if (selectedStudentId === deletedId) {
        setSelectedStudentId(null);
        setStudentDetail(null);
      }
      fetchStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to delete student.');
    } finally {
      setDeleting(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStudentId || !newPassword) return;
    try {
      await api.resetStudentPassword(resetStudentId, newPassword);
      setResetMessage('Password has been successfully updated.');
      setTimeout(() => {
        setResetStudentId(null);
        setNewPassword('');
        setResetMessage(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTodayFilter('all');
    setAttendanceFilter('all');
  };

  const hasActiveFilters = search || statusFilter !== 'all' || todayFilter !== 'all' || attendanceFilter !== 'all';

  return (
    <AdminLayout activePath="students">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Student Directory</h1>
            <p className="text-xs text-slate-500 mt-1">Manage institutional identities, academic records, and biometric enrollments</p>
          </div>
          <a
            href="#/register-student"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Student</span>
          </a>
        </div>

        {/* Search & Filter Command Center */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          {/* Universal Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, roll number, student ID (STU-...), email, or phone number..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-slate-800"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Pill Groupings */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Account Status Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl font-medium text-slate-600">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                >
                  All Status
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === 'active' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === 'inactive' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                >
                  Inactive
                </button>
              </div>

              {/* Today's Attendance Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl font-medium text-slate-600">
                <button
                  onClick={() => setTodayFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors ${todayFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                >
                  Today: All
                </button>
                <button
                  onClick={() => setTodayFilter('present')}
                  className={`px-3 py-1 rounded-lg transition-colors ${todayFilter === 'present' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                >
                  Present
                </button>
                <button
                  onClick={() => setTodayFilter('late')}
                  className={`px-3 py-1 rounded-lg transition-colors ${todayFilter === 'late' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                >
                  Late
                </button>
                <button
                  onClick={() => setTodayFilter('absent')}
                  className={`px-3 py-1 rounded-lg transition-colors ${todayFilter === 'absent' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                >
                  Absent
                </button>
              </div>

              {/* Attendance Rate Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl font-medium text-slate-600">
                <button
                  onClick={() => setAttendanceFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors ${attendanceFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                >
                  Rate: All
                </button>
                <button
                  onClick={() => setAttendanceFilter('low')}
                  className={`px-3 py-1 rounded-lg transition-colors ${attendanceFilter === 'low' ? 'bg-rose-50 text-rose-700 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                >
                  Below 75%
                </button>
                <button
                  onClick={() => setAttendanceFilter('high')}
                  className={`px-3 py-1 rounded-lg transition-colors ${attendanceFilter === 'high' ? 'bg-emerald-50 text-emerald-700 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                >
                  75%+
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <span>Clear Filters</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results Counter & Sorting */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>{students.length} students found</span>
          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700"
            >
              <option value="name">Name</option>
              <option value="roll">Roll Number</option>
              <option value="student_id">Student ID</option>
              <option value="attendance">Attendance Rate</option>
              <option value="created_at">Registration Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              title="Toggle Ascending / Descending"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Student Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Roll Number</th>
                  <th className="px-4 py-3.5">Student ID</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5">Today</th>
                  <th className="px-4 py-3.5">Attendance %</th>
                  <th className="px-4 py-3.5">Biometrics</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                        <span>Loading directory records...</span>
                      </div>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      No matching students found. Adjust search criteria or filters.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 font-bold text-slate-700 flex items-center justify-center">
                            {student.full_name[0]}
                          </div>
                          <div>
                            <button
                              onClick={() => handleOpenProfile(student.id)}
                              className="font-semibold text-slate-900 hover:text-indigo-600 block text-left"
                            >
                              {student.full_name}
                            </button>
                            <span className="text-[11px] text-slate-500">{student.department}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{student.roll_number}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-500 text-[11px]">{student.student_id}</td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <div className="truncate max-w-[140px] text-[11px]">{student.email}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{student.phone}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge status={student.today_status || 'NOT_MARKED'} size="sm" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${student.attendance_percentage >= 75 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {student.attendance_percentage}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({student.present_count + student.late_count}/{student.total_sessions})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {student.face_registered ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Enrolled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <AlertCircle className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge status={student.is_active ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenProfile(student.id)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                            title="View Full Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditStudent(student);
                              setEditFormData({
                                full_name: student.full_name,
                                roll_number: student.roll_number,
                                email: student.email,
                                phone: student.phone,
                                department: student.department,
                                batch_year: student.batch_year || 2026,
                              });
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                            title="Edit Student Info"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setResetStudentId(student.id)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(student)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold ${
                              student.is_active
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={student.is_active ? 'Deactivate Student' : 'Reactivate Student'}
                          >
                            {student.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setStudentToDelete(student)}
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors"
                            title="Permanently Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Student Profile Modal */}
        <Modal
          isOpen={!!selectedStudentId}
          onClose={() => {
            setSelectedStudentId(null);
            setStudentDetail(null);
          }}
          title={studentDetail?.full_name || 'Student Profile'}
          subtitle={studentDetail ? `${studentDetail.student_id} • Roll: ${studentDetail.roll_number}` : ''}
          maxWidth="2xl"
        >
          {loadingDetail ? (
            <div className="py-12 text-center text-slate-400">Loading student dossier...</div>
          ) : studentDetail ? (
            <div className="space-y-6 text-xs">
              {/* Profile Top Stats */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Attendance Rate</span>
                  <span className="text-lg font-bold font-mono text-indigo-700">{studentDetail.attendance_percentage}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Present Sessions</span>
                  <span className="text-lg font-bold font-mono text-emerald-700">{studentDetail.present_count}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Late Arrivals</span>
                  <span className="text-lg font-bold font-mono text-amber-700">{studentDetail.late_count}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Biometric Samples</span>
                  <span className="text-lg font-bold font-mono text-slate-800">{studentDetail.face_samples_count} Templates</span>
                </div>
              </div>

              {/* Personal & Academic Details */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-4">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Institutional Email</span>
                  <span className="text-slate-900 font-medium">{studentDetail.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Registered Mobile</span>
                  <span className="text-slate-900 font-mono font-medium">{studentDetail.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Department</span>
                  <span className="text-slate-900 font-medium">{studentDetail.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Account Status</span>
                  <Badge status={studentDetail.is_active ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                </div>
              </div>

              {/* Recent Attendance Records */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Recent Attendance Sessions</h4>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  {studentDetail.recent_sessions && studentDetail.recent_sessions.length > 0 ? (
                    studentDetail.recent_sessions.map((rec: any) => (
                      <div key={rec.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <span className="font-semibold text-slate-900 block">{rec.session_title}</span>
                          <span className="text-[11px] text-slate-500">{rec.subject_name} • {rec.session_date}</span>
                        </div>
                        <div className="text-right">
                          <Badge status={rec.status} size="sm" />
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString() : '--'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400">No attendance records found.</div>
                  )}
                </div>
              </div>

              {/* Profile Modal Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const target = students.find(s => s.id === selectedStudentId);
                    if (target) {
                      setStudentToDelete(target);
                      setSelectedStudentId(null);
                      setStudentDetail(null);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Student Record</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentId(null);
                    setStudentDetail(null);
                  }}
                  className="px-4 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* Edit Student Modal */}
        <Modal
          isOpen={!!editStudent}
          onClose={() => setEditStudent(null)}
          title="Edit Student Information"
          subtitle={editStudent ? `${editStudent.student_id} • Roll: ${editStudent.roll_number}` : ''}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={editFormData.roll_number}
                  onChange={(e) => setEditFormData({ ...editFormData, roll_number: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Institutional Email</label>
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">10-Digit Mobile Phone</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Batch Year</label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={editFormData.batch_year}
                  onChange={(e) => setEditFormData({ ...editFormData, batch_year: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={editFormData.department}
                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>

        {/* Reset Password Modal */}
        <Modal
          isOpen={!!resetStudentId}
          onClose={() => {
            setResetStudentId(null);
            setNewPassword('');
            setResetMessage(null);
          }}
          title="Reset Student Password"
        >
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            {resetMessage ? (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-center font-semibold">
                {resetMessage}
              </div>
            ) : (
              <>
                <p className="text-slate-500">
                  Set a new secure password for this student account. Minimum 6 characters.
                </p>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden"
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetStudentId(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold"
                  >
                    Confirm Password Reset
                  </button>
                </div>
              </>
            )}
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!studentToDelete}
          onClose={() => setStudentToDelete(null)}
          title="Delete Student Record"
          subtitle="Permanent & Irreversible"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Confirm Permanent Deletion</span>
              </div>
              <p className="leading-relaxed">
                Are you sure you want to permanently delete student{' '}
                <strong className="font-bold text-rose-950 underline">{studentToDelete?.full_name}</strong>{' '}
                (Roll No: <span className="font-mono font-bold">{studentToDelete?.roll_number}</span>, ID:{' '}
                <span className="font-mono">{studentToDelete?.student_id}</span>)?
              </p>
              <ul className="list-disc list-inside text-rose-800 text-[11px] space-y-1">
                <li>All facial biometric embeddings and sample images will be erased.</li>
                <li>All historical attendance logs for this student will be deleted.</li>
                <li>Student portal authentication credentials will be immediately terminated.</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Yes, Delete Student'}</span>
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};
