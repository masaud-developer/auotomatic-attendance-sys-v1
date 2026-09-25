import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, Calendar, Clock, 
  UserCheck, UserX, AlertTriangle, Edit3, X, 
  CheckCircle2, ArrowUpDown, ChevronDown, FileSpreadsheet
} from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { AttendanceRecord, AbsentStudent, LateStudent, AttendanceSession, Subject } from '../types';

type ViewMode = 'RECORDS' | 'ABSENT_VIEW' | 'LATE_VIEW';

export const AttendancePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('RECORDS');

  // Attendance Records
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [lateStudents, setLateStudents] = useState<LateStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  // Dropdown options
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Manual Override Modal
  const [overrideRecord, setOverrideRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<string>('PRESENT');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideLoading, setOverrideLoading] = useState<boolean>(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<string>('check_in_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load dropdowns on mount
  useEffect(() => {
    Promise.all([
      api.listSessions({ limit: 100 }),
      api.listSubjects()
    ]).then(([sessData, subData]) => {
      setSessions(sessData);
      setSubjects(subData);
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'RECORDS') {
        const data = await api.getAttendanceRecords({
          search: search.trim() || undefined,
          status_tab: statusTab !== 'ALL' ? statusTab : undefined,
          date_preset: datePreset,
          start_date: customStart || undefined,
          end_date: customEnd || undefined,
          subject_id: subjectId ? Number(subjectId) : undefined,
          session_id: sessionId ? Number(sessionId) : undefined,
          sort_by: sortBy,
          order: sortOrder,
          limit: 200,
        });
        setRecords(data);
      } else if (viewMode === 'ABSENT_VIEW') {
        const data = await api.getAbsentStudents({
          session_id: sessionId ? Number(sessionId) : undefined,
          date_filter: datePreset === 'today' ? 'today' : customStart || undefined,
        });
        setAbsentStudents(data);
      } else if (viewMode === 'LATE_VIEW') {
        const data = await api.getLateStudents({
          session_id: sessionId ? Number(sessionId) : undefined,
          date_preset: datePreset,
        });
        setLateStudents(data);
      }
    } catch (err) {
      console.error('Failed to load attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData();
    }, 250);
    return () => clearTimeout(handler);
  }, [viewMode, search, statusTab, datePreset, customStart, customEnd, subjectId, sessionId, sortBy, sortOrder]);

  // Handle Manual Override
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideRecord || !overrideReason.trim()) {
      setOverrideError('Mandatory audit explanation reason is required.');
      return;
    }
    setOverrideLoading(true);
    setOverrideError(null);
    try {
      await api.overrideAttendance(overrideRecord.id, newStatus, overrideReason.trim());
      setOverrideRecord(null);
      setOverrideReason('');
      fetchData();
    } catch (err: any) {
      setOverrideError(err.message || 'Failed to update record.');
    } finally {
      setOverrideLoading(false);
    }
  };

  const exportCsv = () => {
    const url = api.getExportCsvUrl({
      search: search.trim() || undefined,
      status_tab: statusTab !== 'ALL' ? statusTab : undefined,
      date_preset: datePreset,
      start_date: customStart || undefined,
      end_date: customEnd || undefined,
      subject_id: subjectId ? Number(subjectId) : undefined,
      session_id: sessionId ? Number(sessionId) : undefined,
    });
    window.open(url, '_blank');
  };

  return (
    <AdminLayout activePath="attendance">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Attendance Management</h1>
            <p className="text-xs text-slate-500 mt-1">Search, audit, and export verified biometric records across sessions</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold text-slate-700">
              <button
                onClick={() => setViewMode('RECORDS')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${viewMode === 'RECORDS' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
              >
                All Records
              </button>
              <button
                onClick={() => setViewMode('ABSENT_VIEW')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${viewMode === 'ABSENT_VIEW' ? 'bg-rose-600 text-white shadow-xs' : 'hover:text-slate-900'}`}
              >
                Absent View
              </button>
              <button
                onClick={() => setViewMode('LATE_VIEW')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${viewMode === 'LATE_VIEW' ? 'bg-amber-600 text-white shadow-xs' : 'hover:text-slate-900'}`}
              >
                Late View
              </button>
            </div>

            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Command Box */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          {/* Universal Search and Quick Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student name, roll number, ID, email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-slate-800"
              />
            </div>

            {/* Subject Selector */}
            <div className="md:col-span-3">
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden bg-slate-50/50"
              >
                <option value="">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code}: {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Session Selector */}
            <div className="md:col-span-4">
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden bg-slate-50/50"
              >
                <option value="">All Sessions</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.date})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range Presets & Quick Status Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            {/* Quick Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl font-medium text-slate-600 overflow-x-auto">
              {['ALL', 'PRESENT', 'LATE', 'ABSENT', 'CHECKED_IN', 'CHECKED_OUT'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusTab(tab)}
                  className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    statusTab === tab ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Date Preset Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Period:</span>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="px-3 py-1 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Date Range</option>
              </select>

              {datePreset === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2 py-0.5 rounded-lg border border-slate-200 text-xs"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-2 py-0.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Counter Results */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            {viewMode === 'RECORDS' && `${records.length} attendance records found`}
            {viewMode === 'ABSENT_VIEW' && `${absentStudents.length} absent students identified`}
            {viewMode === 'LATE_VIEW' && `${lateStudents.length} late arrival records identified`}
          </span>
        </div>

        {/* 1. Normal Records Table View */}
        {viewMode === 'RECORDS' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Roll Number</th>
                    <th className="px-4 py-3.5">Session & Subject</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Check-In</th>
                    <th className="px-4 py-3.5">Check-Out</th>
                    <th className="px-4 py-3.5">Duration</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Correction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                        Loading records...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                        No attendance records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-slate-900 block">{r.student_name}</span>
                          <span className="text-[11px] font-mono text-slate-500">{r.student_code}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{r.roll_number}</td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-800 block">{r.session_title}</span>
                          <span className="text-[11px] text-slate-500">{r.subject_name}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-600">{r.session_date}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-700">
                          {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-700">
                          {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-600">
                          {r.duration_minutes ? `${r.duration_minutes}m` : '--'}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Badge status={r.status} size="sm" />
                            {r.is_manual_override && (
                              <span className="text-[10px] text-amber-600 font-semibold" title={`Overridden: ${r.override_reason}`}>
                                (Edited)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setOverrideRecord(r);
                              setNewStatus(r.status);
                              setOverrideReason('');
                              setOverrideError(null);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Correct</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Dedicated Absent Students View */}
        {viewMode === 'ABSENT_VIEW' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between text-xs text-rose-900 font-semibold">
              <span>Absent Student Roster for Selected Session/Date</span>
              <span>Total: {absentStudents.length} Students</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Student Name</th>
                    <th className="px-4 py-3.5">Roll Number</th>
                    <th className="px-4 py-3.5">Student ID</th>
                    <th className="px-4 py-3.5">Session / Class</th>
                    <th className="px-4 py-3.5">Subject</th>
                    <th className="px-4 py-3.5">Contact Email</th>
                    <th className="px-6 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">Loading absent roster...</td>
                    </tr>
                  ) : absentStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No absent students found for this session! 100% attendance.
                      </td>
                    </tr>
                  ) : (
                    absentStudents.map((st, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">{st.full_name}</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{st.roll_number}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-500">{st.student_code}</td>
                        <td className="px-4 py-3.5 text-slate-800">{st.session_title}</td>
                        <td className="px-4 py-3.5 text-slate-600">{st.subject_name || 'General'}</td>
                        <td className="px-4 py-3.5 text-slate-500">{st.email}</td>
                        <td className="px-6 py-3.5 text-right">
                          <Badge status="ABSENT" size="sm" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Dedicated Late Students View */}
        {viewMode === 'LATE_VIEW' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between text-xs text-amber-900 font-semibold">
              <span>Late Arrival Telemetry (Factual Scheduled vs Arrival Times)</span>
              <span>Total: {lateStudents.length} Late Arrivals</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Student Name</th>
                    <th className="px-4 py-3.5">Roll Number</th>
                    <th className="px-4 py-3.5">Session</th>
                    <th className="px-4 py-3.5">Scheduled Start</th>
                    <th className="px-4 py-3.5">Actual Arrival</th>
                    <th className="px-4 py-3.5">Minutes Late</th>
                    <th className="px-6 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">Loading late arrival records...</td>
                    </tr>
                  ) : lateStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No late arrivals recorded for this filter.
                      </td>
                    </tr>
                  ) : (
                    lateStudents.map((st, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">{st.full_name}</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{st.roll_number}</td>
                        <td className="px-4 py-3.5 text-slate-800">{st.session_title}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-600">{st.scheduled_start}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-900 font-bold">{st.actual_arrival}</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-amber-700">
                          +{st.minutes_late} mins
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Badge status="LATE" size="sm" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Manual Attendance Correction Modal */}
        <Modal
          isOpen={!!overrideRecord}
          onClose={() => setOverrideRecord(null)}
          title="Manual Attendance Correction"
          subtitle={`Student: ${overrideRecord?.student_name} (${overrideRecord?.roll_number})`}
        >
          <form onSubmit={handleOverrideSubmit} className="space-y-4 text-xs">
            {overrideError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
                {overrideError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status</span>
                <span className="font-bold text-slate-900">{overrideRecord?.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Session</span>
                <span className="font-medium text-slate-800">{overrideRecord?.session_title}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden font-semibold"
              >
                <option value="PRESENT">PRESENT</option>
                <option value="LATE">LATE</option>
                <option value="ABSENT">ABSENT</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mandatory Explanation / Reason (Audit Logged) *
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Camera lighting issue during lab session; verified manually by instructor."
                rows={3}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverrideRecord(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={overrideLoading}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold flex items-center gap-2"
              >
                {overrideLoading ? 'Saving...' : 'Apply Correction & Log'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};
