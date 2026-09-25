import React, { useState, useEffect } from 'react';
import { 
  Clock, Calendar, Play, CheckCircle2, Plus, 
  ScanFace, AlertCircle, Sparkles, Filter
} from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { AttendanceSession, Subject } from '../types';

const getFormattedTime = (d = new Date()) => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const getFutureTime = (minutesAhead: number) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutesAhead);
  return getFormattedTime(d);
};

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // New Session Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject_id: '',
    custom_subject_name: '',
    session_type: 'CUSTOM',
    date: new Date().toISOString().split('T')[0],
    start_time: getFormattedTime(),
    end_time: getFutureTime(60),
    room: 'Main Lecture Hall',
    late_threshold_minutes: 15,
    attendance_mode: 'CHECK_IN',
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const [sessData, subData] = await Promise.all([
        api.listSessions({ limit: 50 }),
        api.listSubjects(),
      ]);
      setSessions(sessData);
      setSubjects(subData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      await api.createSession({
        title: formData.title,
        subject_id: formData.subject_id ? Number(formData.subject_id) : undefined,
        custom_subject_name: formData.custom_subject_name.trim() || undefined,
        session_type: formData.session_type,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        room: formData.room,
        late_threshold_minutes: Number(formData.late_threshold_minutes),
        attendance_mode: formData.attendance_mode,
      });
      setShowCreateModal(false);
      fetchSessions();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create session.');
    }
  };

  const handleStartSession = async (id: number) => {
    try {
      await api.startSession(id);
      fetchSessions();
      window.location.href = '#/scanner';
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteSession = async (id: number) => {
    try {
      await api.completeSession(id);
      fetchSessions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout activePath="sessions">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Attendance Sessions</h1>
            <p className="text-xs text-slate-500 mt-1">Schedule, activate, and manage laboratory, practical, and lecture sessions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Session</span>
          </button>
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-3 py-16 text-center text-xs text-slate-400">Loading session schedule...</div>
          ) : sessions.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-xs text-slate-400">
              No sessions scheduled. Click "Create New Session" to configure one.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                  s.status === 'ACTIVE'
                    ? 'border-indigo-400 ring-2 ring-indigo-100 bg-indigo-50/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge status={s.status} size="sm" />
                    <span className="text-[11px] font-mono text-slate-500">{s.session_type.replace('_', ' ')}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {s.subject_name || 'General Institution Session'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date & Room</span>
                      <span className="font-semibold text-slate-800">{s.date} • {s.room}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Scheduled Time</span>
                      <span className="font-mono font-medium text-slate-800">{s.start_time} - {s.end_time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Late Grace Period</span>
                      <span className="font-medium text-slate-800">{s.late_threshold_minutes} mins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Attended / Marked</span>
                      <span className="font-mono font-bold text-emerald-600">{s.total_marked} Students</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  {s.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleStartSession(s.id)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start & Launch Scanner</span>
                    </button>
                  )}

                  {s.status === 'ACTIVE' && (
                    <div className="w-full flex items-center gap-2">
                      <a
                        href="#/scanner"
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <ScanFace className="w-3.5 h-3.5" />
                        <span>Scanner</span>
                      </a>
                      <button
                        onClick={() => handleCompleteSession(s.id)}
                        className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                      >
                        Conclude
                      </button>
                    </div>
                  )}

                  {s.status === 'COMPLETED' && (
                    <a
                      href={`#/attendance?session_id=${s.id}`}
                      className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 text-center block"
                    >
                      View Session Records ({s.total_marked})
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Session Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Attendance Session"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
                {createError}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Session Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Morning Lecture, Algorithms Lab, General Assembly"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject / Academic Unit</label>
                {subjects.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={formData.subject_id}
                      onChange={(e) => setFormData({ ...formData, subject_id: e.target.value, custom_subject_name: '' })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                    >
                      <option value="">Custom Subject (Type below)</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.code}: {sub.name}
                        </option>
                      ))}
                    </select>
                    {!formData.subject_id && (
                      <input
                        type="text"
                        value={formData.custom_subject_name}
                        onChange={(e) => setFormData({ ...formData, custom_subject_name: e.target.value })}
                        placeholder="Type subject name"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={formData.custom_subject_name}
                    onChange={(e) => setFormData({ ...formData, custom_subject_name: e.target.value })}
                    placeholder="Enter subject name (e.g. DBMS or General)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Type</label>
                <select
                  value={formData.session_type}
                  onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                >
                  <option value="REGULAR_CHECK_IN">Campus Check-In / Assembly</option>
                  <option value="SUBJECT_CLASS">Subject Lecture / Class</option>
                  <option value="LABORATORY">Practical / Laboratory</option>
                  <option value="EXAMINATION">Exam / Evaluation</option>
                  <option value="SPECIAL_EVENT">Special Event / Workshop</option>
                  <option value="CUSTOM">Custom Session</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Start Time</label>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      start_time: getFormattedTime(),
                      end_time: getFutureTime(60)
                    })}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    Set to Now
                  </button>
                </div>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Room / Station Location</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="e.g. Main Auditorium, Gate 1"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Late Threshold (Mins)</label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={formData.late_threshold_minutes}
                  onChange={(e) => setFormData({ ...formData, late_threshold_minutes: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold"
              >
                Create Session
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};
