import React, { useState, useEffect } from 'react';
import { School, ShieldCheck, Mail, Phone, Hash, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isAdmin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'email' | 'phone' | 'student_id'>('email');
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    // Check if system is initialized
    api.checkSetupStatus()
      .then((res) => {
        if (!res.is_initialized) {
          window.location.href = '#/setup';
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSetup(false));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        window.location.href = '#/dashboard';
      } else {
        window.location.href = '#/student';
      }
    }
  }, [isAuthenticated, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide your identifier and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setTabHelper = (tab: 'email' | 'phone' | 'student_id') => {
    setActiveTab(tab);
    setIdentifier('');
    setError(null);
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Top Header */}
        <div className="p-8 pb-6 text-center border-b border-slate-100 bg-linear-to-b from-slate-50/60 to-white">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 mx-auto flex items-center justify-center text-white shadow-xs mb-3">
            <School className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 m-0">AttendEdge Portal</h1>
          <p className="text-xs text-slate-500 mt-1">Institutional Face Recognition Attendance System</p>
        </div>

        {/* Tab Selector */}
        <div className="px-8 pt-6">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setTabHelper('email')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'email' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => setTabHelper('phone')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'phone' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Phone</span>
            </button>
            <button
              type="button"
              onClick={() => setTabHelper('student_id')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'student_id' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Student ID</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 pt-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {activeTab === 'email' && 'Email Address'}
              {activeTab === 'phone' && '10-Digit Mobile Phone'}
              {activeTab === 'student_id' && 'Unique Student ID'}
            </label>
            <div className="relative">
              <input
                type={activeTab === 'email' ? 'email' : 'text'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  activeTab === 'email'
                    ? 'user@college.edu'
                    : activeTab === 'phone'
                    ? '9876543210'
                    : 'STU-2026-000101'
                }
                required
                className="w-full pl-3.5 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-3.5 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center text-[11px] text-slate-500 gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Biometric Encrypted & Role-Protected</span>
        </div>
      </div>
    </div>
  );
};
