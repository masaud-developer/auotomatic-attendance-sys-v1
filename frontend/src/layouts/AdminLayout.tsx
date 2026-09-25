import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ScanFace, Users, UserPlus, 
  CalendarCheck, Clock, BarChart3, ShieldAlert, 
  Settings as SettingsIcon, LogOut, Activity, ChevronRight,
  School, Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePath: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activePath }) => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [showHealthModal, setShowHealthModal] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    const fetchQuickStatus = async () => {
      try {
        const [h, s] = await Promise.all([
          api.getSystemHealth(),
          api.getActiveSession()
        ]);
        setHealth(h);
        setActiveSession(s);
      } catch (e) {
        // silent
      }
    };
    fetchQuickStatus();
    const interval = setInterval(fetchQuickStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '#/dashboard', id: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Live Scanner', path: '#/scanner', id: 'scanner', icon: <ScanFace className="w-4 h-4" />, highlight: true },
    { name: 'Students', path: '#/students', id: 'students', icon: <Users className="w-4 h-4" /> },
    { name: 'Register Student', path: '#/register-student', id: 'register-student', icon: <UserPlus className="w-4 h-4" /> },
    { name: 'Attendance', path: '#/attendance', id: 'attendance', icon: <CalendarCheck className="w-4 h-4" /> },
    { name: 'Sessions', path: '#/sessions', id: 'sessions', icon: <Clock className="w-4 h-4" /> },
    { name: 'Analytics', path: '#/analytics', id: 'analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { name: 'Audit Logs', path: '#/audit-logs', id: 'audit-logs', icon: <ShieldAlert className="w-4 h-4" /> },
    { name: 'Settings', path: '#/settings', id: 'settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0">
        {/* Brand */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <School className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 block leading-tight">AttendEdge</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Institutional</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activePath === item.id;
            return (
              <a
                key={item.id}
                href={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : item.highlight
                    ? 'text-indigo-600 bg-indigo-50/70 hover:bg-indigo-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : item.highlight ? 'text-indigo-600' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </div>
                {item.highlight && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                )}
              </a>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.email}</p>
              <span className="inline-block text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                Administrator
              </span>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 px-8 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
          {/* Active Session Status Banner */}
          <div className="flex items-center gap-3">
            {activeSession ? (
              <a
                href="#/scanner"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Active Session: <strong>{activeSession.title}</strong> ({activeSession.room})</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
              </a>
            ) : (
              <span className="text-xs text-slate-500">No active attendance session in progress</span>
            )}
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4">
            {/* System Health Indicator */}
            <button
              onClick={() => setShowHealthModal(!showHealthModal)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>System: <strong>{health?.status || 'Online'}</strong></span>
            </button>

            <div className="text-xs text-slate-400 font-mono">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Health Diagnostics Popup */}
        {showHealthModal && (
          <div className="absolute right-8 top-20 w-80 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-40 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <span className="font-semibold text-slate-900">System Health Diagnostics</span>
              <button onClick={() => setShowHealthModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">API Service</span>
                <span className="font-medium text-emerald-600">{health?.diagnostics?.api || 'Online'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Database Engine</span>
                <span className="font-medium text-emerald-600">{health?.diagnostics?.database || 'Connected'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Face Detector</span>
                <span className="font-medium text-slate-800">{health?.diagnostics?.face_detector || 'YuNet (Deep Learning)'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Face Recognizer</span>
                <span className="font-medium text-slate-800">{health?.diagnostics?.face_recognizer || 'SFace 128-d'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Active Sessions</span>
                <span className="font-medium text-slate-800">{health?.diagnostics?.active_sessions ?? 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
