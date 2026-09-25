import React, { useState, useEffect } from 'react';
import { 
  UserCircle, Calendar, Clock, CheckCircle2, 
  AlertCircle, Percent, BookOpen, ChevronRight, Hash, Phone, Mail
} from 'lucide-react';
import { StudentLayout } from '../layouts/StudentLayout';
import { Badge } from '../components/Badge';
import { api } from '../services/api';

export const StudentDashboardPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);
      try {
        const [dash, hist] = await Promise.all([
          api.getStudentDashboard(),
          api.getStudentAttendanceHistory({ limit: 50 })
        ]);
        setData(dash);
        setHistory(hist);
      } catch (err) {
        console.error('Failed to load student data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, []);

  if (loading) {
    return (
      <StudentLayout>
        <div className="py-24 text-center text-xs text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <span>Loading student portal profile...</span>
        </div>
      </StudentLayout>
    );
  }

  const profile = data?.profile;
  const stats = data?.stats;
  const subjectWise = data?.subject_wise || [];

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Student Digital Identity Card */}
        <div className="p-6 rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xl text-indigo-300 shadow-inner">
                {profile?.full_name ? profile.full_name[0] : 'S'}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-widest block">
                  Student Identity Card
                </span>
                <h1 className="text-xl font-bold tracking-tight text-white mt-0.5 m-0">
                  {profile?.full_name}
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  {profile?.department} • Batch of {profile?.batch_year}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs font-mono">
              <div className="bg-white/10 px-3 py-1 rounded-lg border border-white/10">
                <span className="text-slate-400 text-[10px] mr-1.5">ID:</span>
                <span className="font-bold text-indigo-200">{profile?.student_id}</span>
              </div>
              <div className="bg-white/10 px-3 py-1 rounded-lg border border-white/10">
                <span className="text-slate-400 text-[10px] mr-1.5">ROLL:</span>
                <span className="font-bold text-white">{profile?.roll_number}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border-t border-white/10 pt-4 mt-5">
            <div>
              <span className="text-slate-400 text-[10px] block">REGISTERED EMAIL</span>
              <span className="text-slate-200 truncate block font-medium">{profile?.email}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">MOBILE PHONE</span>
              <span className="text-slate-200 font-mono block font-medium">{profile?.phone}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-400 text-[10px] block">BIOMETRIC ENROLLMENT</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active & Verified</span>
              </span>
            </div>
          </div>
        </div>

        {/* Attendance Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Attendance Rate</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-indigo-600">{stats?.attendance_percentage ?? 0}%</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Institutional min: 75%</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Present Sessions</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-emerald-600">{stats?.present_count ?? 0}</span>
              <span className="text-xs text-slate-400">/ {stats?.total_sessions ?? 0}</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Full presence</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Late Arrivals</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-amber-600">{stats?.late_count ?? 0}</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Past late threshold</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Absent Sessions</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-rose-600">{stats?.absent_count ?? 0}</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Missed classes</span>
          </div>
        </div>

        {/* Subject-Wise Attendance Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Subject-Wise Attendance Breakdown</h3>
              <p className="text-xs text-slate-500">Your attendance performance across specific lecture and laboratory courses</p>
            </div>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {subjectWise.length > 0 ? (
              subjectWise.map((sub: any) => (
                <div key={sub.code} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">{sub.code}</span>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{sub.name}</h4>
                    </div>
                    <span className="font-mono font-bold text-sm text-slate-900">{sub.percentage}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sub.percentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, sub.percentage)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                    <span>Present: {sub.present + sub.late}</span>
                    <span>Total: {sub.total} Sessions</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-6 text-xs text-slate-400">
                No subject-specific attendance recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Complete Attendance History Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Attendance History Log</h3>
              <p className="text-xs text-slate-500">Official log of your biometric recognition check-in events</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
              {history.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Subject & Session</th>
                  <th className="px-4 py-3.5">Check-In</th>
                  <th className="px-4 py-3.5">Check-Out</th>
                  <th className="px-4 py-3.5">Duration</th>
                  <th className="px-4 py-3.5">Verification</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 font-mono text-slate-700">{item.date}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-900 block">{item.session_title}</span>
                        <span className="text-[11px] text-slate-500 font-medium">{item.subject_name} ({item.subject_code})</span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-800">{item.check_in}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-800">{item.check_out}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">{item.duration}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Facial Biometric</span>
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Badge status={item.status} size="sm" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};
