import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, UserX, Clock, CalendarCheck, 
  Percent, ArrowRight, ScanFace, Activity, ShieldCheck, 
  Sparkles, CheckCircle2, AlertCircle, Play
} from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { api } from '../services/api';
import { DashboardStats } from '../types';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout activePath="dashboard">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Title & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Institution Overview</h1>
            <p className="text-xs text-slate-500 mt-1">Real-time attendance intelligence and biometric recognition telemetry</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#/scanner"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs transition-all"
            >
              <ScanFace className="w-4 h-4" />
              <span>Launch Live Scanner</span>
            </a>
            <a
              href="#/register-student"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
            >
              <span>+ Register Student</span>
            </a>
          </div>
        </div>

        {/* Active Session Hero Banner */}
        {stats?.active_session ? (
          <div className="p-5 rounded-2xl bg-linear-to-r from-slate-900 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 shrink-0">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Live Session Active</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <h2 className="text-lg font-bold mt-0.5">{stats.active_session.title}</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Subject: <strong>{stats.active_session.subject}</strong> • Room: <strong>{stats.active_session.room}</strong> • Time: <strong>{stats.active_session.start_time} - {stats.active_session.end_time}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Recognized Attendance</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{stats.active_session.marked_count} Students</span>
              </div>
              <a
                href="#/scanner"
                className="px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors shadow-xs"
              >
                Open Camera Scanner
              </a>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>No session currently running. Create or start an attendance session to launch the camera scanner.</span>
            </div>
            <a href="#/sessions" className="font-semibold text-indigo-600 hover:underline">
              View Schedule →
            </a>
          </div>
        )}

        {/* Numeric Stat Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Enrolled"
            value={stats?.total_students ?? '--'}
            subtitle={`${stats?.active_students ?? '--'} Active • ${stats?.inactive_students ?? 0} Inactive`}
            icon={<Users className="w-4 h-4 text-slate-600" />}
            trendColor="blue"
            onClick={() => window.location.href = '#/students'}
          />
          <StatCard
            title="Present Today"
            value={stats?.today_present ?? '--'}
            subtitle="Face recognized check-ins"
            icon={<UserCheck className="w-4 h-4 text-emerald-600" />}
            trend={`${stats?.today_present ?? 0} Today`}
            trendColor="green"
            onClick={() => window.location.href = '#/attendance?status=PRESENT'}
          />
          <StatCard
            title="Late Today"
            value={stats?.today_late ?? '--'}
            subtitle="Past session late threshold"
            icon={<Clock className="w-4 h-4 text-amber-600" />}
            trendColor="amber"
            onClick={() => window.location.href = '#/attendance?status=LATE'}
          />
          <StatCard
            title="Overall Attendance"
            value={stats ? `${stats.overall_attendance_rate}%` : '--'}
            subtitle="Institutional benchmark (75%)"
            icon={<Percent className="w-4 h-4 text-indigo-600" />}
            trend={stats && stats.overall_attendance_rate >= 75 ? 'Healthy' : 'Attention'}
            trendColor={stats && stats.overall_attendance_rate >= 75 ? 'green' : 'amber'}
            onClick={() => window.location.href = '#/analytics'}
          />
        </div>

        {/* Middle Section: Recent Scans Stream & System Diagnostics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Attendance Stream (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Recent Attendance Events</h3>
                <p className="text-xs text-slate-500">Live feed of verified biometric face scans</p>
              </div>
              <a href="#/attendance" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <span>View Full Log</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="divide-y divide-slate-100">
              {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.slice(0, 6).map((item) => (
                  <div key={item.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                        {item.student_name ? item.student_name[0] : 'S'}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-900 block leading-tight">{item.student_name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{item.student_code} • {item.roll_number}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-xs text-slate-800 font-medium block leading-tight">{item.session_title}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{item.date} {item.time}</span>
                      </div>
                      <Badge status={item.status} size="sm" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No attendance records recorded yet. Start a session and begin scanning.
                </div>
              )}
            </div>
          </div>

          {/* System Telemetry & Quick Links (1 col) */}
          <div className="space-y-6">
            {/* System Status Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                System Diagnostics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="text-slate-600">Camera / WebRTC</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Connected</span>
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="text-slate-600">Face AI Engine (YuNet + SFace)</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Online</span>
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="text-slate-600">Database Engine</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Active (WAL)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-slate-600">Anti-Spoofing Liveness</span>
                  <span className="font-semibold text-indigo-600">Active Challenge</span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Panel */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <a
                  href="#/register-student"
                  className="p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 font-medium text-slate-800 transition-colors block text-center"
                >
                  Enroll Student
                </a>
                <a
                  href="#/sessions"
                  className="p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 font-medium text-slate-800 transition-colors block text-center"
                >
                  Create Session
                </a>
                <a
                  href="#/attendance"
                  className="p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 font-medium text-slate-800 transition-colors block text-center"
                >
                  Export CSV
                </a>
                <a
                  href="#/audit-logs"
                  className="p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 font-medium text-slate-800 transition-colors block text-center"
                >
                  Audit Trail
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
