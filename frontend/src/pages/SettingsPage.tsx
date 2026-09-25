import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Volume2, Clock, CheckCircle2, Building, Sliders } from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import { api } from '../services/api';
import { soundService } from '../services/audio';
import { SystemSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings()
      .then((data) => setSettings(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof SystemSettings, val: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: val });
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setError(null);
    setLoading(true);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      soundService.setEnabled(updated.audio_enabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout activePath="settings">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Institution Settings</h1>
            <p className="text-xs text-slate-500 mt-1">Configure biometric thresholds, late arrival rules, and institutional metadata</p>
          </div>
          {saved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-semibold animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings Saved Successfully</span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {error}
          </div>
        )}

        {loading && !settings ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading system settings...</div>
        ) : settings ? (
          <form onSubmit={handleSave} className="space-y-6">
            {/* 1. Biometric AI Engine Parameters */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Face Recognition Engine Parameters</h3>
                  <p className="text-xs text-slate-500">Mathematical cosine similarity and duplicate face detection sensitivity</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <label className="font-semibold text-slate-700">Recognition Confidence Threshold</label>
                    <span className="font-mono font-bold text-indigo-600">{settings.recognition_threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0.40"
                    max="0.85"
                    step="0.02"
                    value={settings.recognition_threshold}
                    onChange={(e) => handleChange('recognition_threshold', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Higher values require stricter facial similarity; default 0.58 is ideal for high-confidence institutional matching.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <label className="font-semibold text-slate-700">Duplicate Face Registration Threshold</label>
                    <span className="font-mono font-bold text-rose-600">{settings.duplicate_face_threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="0.85"
                    step="0.02"
                    value={settings.duplicate_face_threshold}
                    onChange={(e) => handleChange('duplicate_face_threshold', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Rejects registration if a candidate face matches an existing student above this similarity.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Anti-Spoofing & Liveness */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Liveness & Anti-Spoofing Rules</h3>
                  <p className="text-xs text-slate-500">Prevent replay attacks, photographs, and printed paper spoofs</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-900 block">Enforce Active Challenges</span>
                    <span className="text-slate-500 text-[11px]">Require randomized blink, smile, and head turns during enrollment</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.liveness_enabled}
                    onChange={(e) => handleChange('liveness_enabled', e.target.checked)}
                    className="w-4 h-4 rounded-md accent-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Challenge Sensitivity</label>
                  <select
                    value={settings.liveness_sensitivity}
                    onChange={(e) => handleChange('liveness_sensitivity', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden font-medium"
                  >
                    <option value="low">Low (Forgiving motion tolerance)</option>
                    <option value="medium">Medium (Standard institutional)</option>
                    <option value="high">High (Strict head yaw angle check)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Session & Attendance Rules */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Clock className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Attendance Policies</h3>
                  <p className="text-xs text-slate-500">Thresholds for calculating Late arrival and audio chime feedback</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default Late Grace Period (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={settings.late_threshold_minutes}
                    onChange={(e) => handleChange('late_threshold_minutes', parseInt(e.target.value) || 15)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Arrivals past this duration from start time are recorded as "Late".</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-900 block">Scanner Audio Feedback</span>
                    <span className="text-slate-500 text-[11px]">Play chime on recognized attendance or duplicate scan</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.audio_enabled}
                    onChange={(e) => handleChange('audio_enabled', e.target.checked)}
                    className="w-4 h-4 rounded-md accent-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 4. Institution Profile */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Building className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Institution Identity</h3>
                  <p className="text-xs text-slate-500">Official college branding and timezone</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Institution Name</label>
                  <input
                    type="text"
                    value={settings.institution_name}
                    onChange={(e) => handleChange('institution_name', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Institution Code</label>
                  <input
                    type="text"
                    value={settings.institution_code}
                    onChange={(e) => handleChange('institution_code', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-50"
              >
                {loading ? 'Saving Settings...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </AdminLayout>
  );
};
