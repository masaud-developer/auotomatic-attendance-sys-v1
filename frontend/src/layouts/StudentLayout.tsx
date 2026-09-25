import React from 'react';
import { School, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const { user, student, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Navigation */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <School className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 block leading-tight">AttendEdge</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Student Portal</span>
          </div>
        </div>

        {/* Profile Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-900">{student?.full_name || user?.email}</span>
            <span className="text-[11px] font-mono text-slate-500">{student?.student_id || 'Student'}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200/60 text-center text-xs text-slate-400 bg-white">
        AttendEdge Face Recognition Attendance System • Student Portal (Read-Only)
      </footer>
    </div>
  );
};
