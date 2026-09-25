import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ScanFace, Clock, Play, Pause, CheckCircle2, AlertTriangle, 
  UserX, ShieldCheck, Volume2, VolumeX, ArrowLeft,
  ChevronDown, RefreshCw, Layers, Sparkles, Plus, Calendar, Zap,
  Camera, CameraOff
} from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { soundService } from '../services/audio';
import { AttendanceSession } from '../types';

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

export const LiveScannerPage: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [mode, setMode] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [scanResult, setScanResult] = useState<any | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [scanning, setScanning] = useState<boolean>(false);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(true);
  const [audioMuted, setAudioMuted] = useState<boolean>(!soundService.isEnabled());

  // Quick Start Session Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    title: '',
    custom_subject_name: '',
    session_type: 'CUSTOM',
    date: new Date().toISOString().split('T')[0],
    start_time: getFormattedTime(),
    end_time: getFutureTime(60),
    room: 'Campus Station 1',
    late_threshold_minutes: 15,
  });
  const [createSessionError, setCreateSessionError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);

  // Clock
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch available sessions
  const fetchSessions = async () => {
    try {
      const data = await api.listSessions({ limit: 20 });
      setSessions(data);
      // Auto-select active session or first session
      const active = data.find((s) => s.status === 'ACTIVE');
      if (active) {
        setSelectedSessionId(active.id);
        setSelectedSession(active);
      } else if (data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].id);
        setSelectedSession(data[0]);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId && sessions.length > 0) {
      const s = sessions.find((item) => item.id === selectedSessionId) || null;
      setSelectedSession(s);
    }
  }, [selectedSessionId, sessions]);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
      return true;
    } catch (err: any) {
      setCameraError('Camera access denied or unavailable. Connect a webcam and allow camera permissions.');
      setCameraActive(false);
      return false;
    }
  }, []);

  // Stop Camera completely releasing hardware
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setCameraActive(false);
  }, []);

  // Toggle Scanning & Camera Hardware
  const toggleScanning = async () => {
    if (isScanningActive) {
      setIsScanningActive(false);
      stopCamera();
    } else {
      setIsScanningActive(true);
      await startCamera();
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Audio mute toggle
  const toggleAudio = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    soundService.setEnabled(!next);
  };

  const handleQuickCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSessionError(null);
    setCreatingSession(true);
    try {
      const created = await api.createSession({
        ...sessionFormData,
        late_threshold_minutes: Number(sessionFormData.late_threshold_minutes),
        auto_start: true,
      });
      setSessions((prev) => [created, ...prev.filter(s => s.id !== created.id)]);
      setSelectedSessionId(created.id);
      setSelectedSession(created);
      setIsScanningActive(true);
      setShowCreateModal(false);
      setSessionFormData({
        title: '',
        custom_subject_name: '',
        session_type: 'CUSTOM',
        date: new Date().toISOString().split('T')[0],
        start_time: getFormattedTime(),
        end_time: getFutureTime(60),
        room: 'Campus Station 1',
        late_threshold_minutes: 15,
      });
    } catch (err: any) {
      setCreateSessionError(err.message || 'Failed to create and start session.');
    } finally {
      setCreatingSession(false);
    }
  };

  // Live Frame Scanner Loop
  const captureAndVerifyFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !selectedSessionId || scanning || !isScanningActive) return;

    const video = videoRef.current;
    if (video.readyState !== 4) return; // HAVE_ENOUGH_DATA

    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, 640, 480);
    const b64 = canvas.toDataURL('image/jpeg', 0.8);

    setScanning(true);
    try {
      const res = await api.scanLiveFrame(selectedSessionId, b64, mode);

      if (res.status === 'SUCCESS') {
        soundService.playSuccess();
        setScanResult(res);
        setRecentScans((prev) => [res, ...prev.slice(0, 7)]);
        // Update session counts
        setSelectedSession((prev) => prev ? {
          ...prev,
          total_marked: prev.total_marked + 1,
          present_count: res.attendance_status === 'PRESENT' ? prev.present_count + 1 : prev.present_count,
          late_count: res.attendance_status === 'LATE' ? prev.late_count + 1 : prev.late_count,
        } : null);
      } else if (res.status === 'ALREADY_MARKED') {
        soundService.playAlreadyMarked();
        setScanResult(res);
      } else if (res.status === 'UNKNOWN' || res.status === 'UNKNOWN_PERSON') {
        soundService.playUnknown();
        setScanResult(res);
      } else {
        // NO_FACE or MULTIPLE_FACES or POOR_QUALITY
        if (res.status !== 'NO_FACE') {
          setScanResult(res);
        }
      }
    } catch (err: any) {
      console.error('Scan evaluation error:', err);
    } finally {
      setScanning(false);
    }
  }, [selectedSessionId, mode, scanning, isScanningActive]);

  // Periodic frame sampling (throttled interval to protect performance)
  useEffect(() => {
    if (!cameraActive || !isScanningActive) return;
    const interval = setInterval(() => {
      captureAndVerifyFrame();
    }, 1200); // Sample every 1.2s for responsive scanner without overloading CPU
    return () => clearInterval(interval);
  }, [cameraActive, isScanningActive, captureAndVerifyFrame]);

  return (
    <AdminLayout activePath="scanner">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Control Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Session Selector & Quick Creator */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Target Session
                </label>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-0.5 ml-2"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Session</span>
                </button>
              </div>
              {sessions.length > 0 ? (
                <select
                  value={selectedSessionId || ''}
                  onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden bg-slate-50/50"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.date}) — {s.status}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/60 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Click to Start First Session</span>
                </button>
              )}
            </div>

            {/* Check-In / Check-Out Mode Switch */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                Scan Mode
              </label>
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMode('CHECK_IN')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    mode === 'CHECK_IN' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Check-In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('CHECK_OUT')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    mode === 'CHECK_OUT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Check-Out
                </button>
              </div>
            </div>

            {/* Prominent Stop / Start Scanner Toggle Button */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                Webcam & Scanner
              </label>
              <button
                type="button"
                onClick={toggleScanning}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isScanningActive
                    ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-300 ring-offset-1 shadow-sm'
                }`}
                title={isScanningActive ? 'Turn off webcam and stop scanner' : 'Turn on webcam and start scanner'}
              >
                {isScanningActive ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Stop Scanning & Camera</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Start Scanning & Camera</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Session Real-time Telemetry */}
          <div className="flex items-center gap-6 text-xs">
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Current Time</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{currentTime}</span>
            </div>

            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Marked</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">{selectedSession?.total_marked ?? 0}</span>
            </div>

            <button
              onClick={toggleAudio}
              className={`p-2 rounded-xl border transition-colors ${
                audioMuted ? 'border-slate-200 text-slate-400 bg-slate-50' : 'border-slate-200 text-indigo-600 bg-indigo-50/50'
              }`}
              title={audioMuted ? 'Unmute Audio Feedback' : 'Mute Audio Feedback'}
            >
              {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Hidden processing canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Main Scanning Arena Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Camera Viewport (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative w-full aspect-16/10 rounded-3xl bg-slate-950 overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Scanning Laser Beam Effect */}
              {cameraActive && isScanningActive && (
                <div className="absolute inset-x-0 h-0.5 bg-indigo-400/80 shadow-[0_0_12px_#818cf8] pointer-events-none animate-scanline" />
              )}

              {/* Face Guide Bounding Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className={`w-64 h-80 border-2 rounded-3xl relative transition-colors ${
                  isScanningActive ? 'border-indigo-400/60' : 'border-slate-500/40'
                }`}>
                  {/* Corner Targets */}
                  <span className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 ${isScanningActive ? 'border-indigo-400' : 'border-slate-500'}`} />
                  <span className={`absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 ${isScanningActive ? 'border-indigo-400' : 'border-slate-500'}`} />
                  <span className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 ${isScanningActive ? 'border-indigo-400' : 'border-slate-500'}`} />
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 ${isScanningActive ? 'border-indigo-400' : 'border-slate-500'}`} />
                </div>
              </div>

              {/* Camera Offline Warning */}
              {cameraError && isScanningActive && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-white z-20">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                  <p className="text-sm font-semibold">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold hover:bg-indigo-700"
                  >
                    Retry Camera Connection
                  </button>
                </div>
              )}

              {/* Scanner Paused / Standby Overlay */}
              {!isScanningActive && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white z-10">
                  <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-2xl">
                    <CameraOff className="w-8 h-8 text-rose-400" />
                  </div>
                  <p className="text-xl font-bold text-white tracking-tight">Webcam & Scanner Stopped</p>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-sm leading-relaxed">
                    Camera hardware is completely deactivated. No video streaming or face detection is running in the background.
                  </p>
                  <button
                    type="button"
                    onClick={toggleScanning}
                    className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white text-slate-950 text-xs font-bold hover:bg-slate-100 shadow-xl shadow-white/10 transition-all cursor-pointer transform active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current text-slate-950" />
                    <span>Start Webcam & Scanner</span>
                  </button>
                </div>
              )}

              {/* No Session Alert Overlay */}
              {!selectedSessionId && sessions.length === 0 && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center text-white z-10">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mb-3">
                    <Sparkles className="w-7 h-7 text-indigo-400" />
                  </div>
                  <p className="text-base font-bold text-white">No Active Session</p>
                  <p className="text-xs text-slate-300 mt-1 max-w-sm">Start or schedule an attendance session to begin recognizing students and logging entries.</p>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-lg transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Start Session Now</span>
                  </button>
                </div>
              )}

              {/* Bottom Camera Overlay Pill */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none z-10">
                <div className={`px-4 py-1.5 rounded-full border text-xs font-medium flex items-center gap-2 transition-all ${
                  isScanningActive
                    ? 'bg-slate-900/80 backdrop-blur-md border-white/10 text-white'
                    : 'bg-rose-950/80 backdrop-blur-md border-rose-500/30 text-rose-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isScanningActive ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
                  <span>
                    {isScanningActive ? 'Face Recognition Active • Position Face in Frame' : 'Webcam Offline • Scanner Stopped'}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Recognition Result Display Card */}
            {scanResult && (
              <div
                className={`p-5 rounded-2xl border transition-all duration-200 shadow-sm ${
                  scanResult.status === 'SUCCESS'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : scanResult.status === 'ALREADY_MARKED'
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : scanResult.status === 'UNKNOWN'
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                        scanResult.status === 'SUCCESS'
                          ? 'bg-emerald-600'
                          : scanResult.status === 'ALREADY_MARKED'
                          ? 'bg-amber-600'
                          : 'bg-rose-600'
                      }`}
                    >
                      {scanResult.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : scanResult.status === 'ALREADY_MARKED' ? (
                        <Clock className="w-6 h-6" />
                      ) : (
                        <UserX className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold tracking-wider">
                          {scanResult.status === 'SUCCESS'
                            ? 'Attendance Recorded'
                            : scanResult.status === 'ALREADY_MARKED'
                            ? 'Already Marked'
                            : 'Unknown Person'}
                        </span>
                        {scanResult.attendance_status && (
                          <Badge status={scanResult.attendance_status} size="sm" />
                        )}
                      </div>
                      <h3 className="text-base font-bold mt-0.5">
                        {scanResult.student_name || 'Unregistered Face'}
                      </h3>
                      <p className="text-xs opacity-80">
                        {scanResult.student_code && `${scanResult.student_code} • Roll: ${scanResult.roll_number} • `}
                        {scanResult.message}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span className="block opacity-60">RECORDED TIME</span>
                    <span className="font-bold text-sm">{scanResult.check_in_time || scanResult.original_check_in_time || currentTime}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Live Session Info & Attendance Ticker (1 Col) */}
          <div className="space-y-6">
            {/* Session Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Session Parameters
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Session Name</span>
                  <span className="font-semibold text-slate-900">{selectedSession?.title || '--'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Subject</span>
                  <span className="font-semibold text-slate-900">{selectedSession?.subject_name || 'General'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Room / Station</span>
                  <span className="font-semibold text-slate-900">{selectedSession?.room || 'Room 101'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Late Grace Period</span>
                  <span className="font-semibold text-slate-900">{selectedSession?.late_threshold_minutes ?? 15} mins</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Scheduled Time</span>
                  <span className="font-semibold text-slate-900">{selectedSession?.start_time} - {selectedSession?.end_time}</span>
                </div>
              </div>
            </div>

            {/* Recent Scans Stream Ticker */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">Live Scans Stream</span>
                <span className="text-[10px] font-mono text-slate-500">Real-Time</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {recentScans.length > 0 ? (
                  recentScans.map((scan, i) => (
                    <div key={i} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 block">{scan.student_name}</span>
                        <span className="text-[11px] font-mono text-slate-500">{scan.roll_number}</span>
                      </div>
                      <div className="text-right">
                        <Badge status={scan.attendance_status || 'PRESENT'} size="sm" />
                        <span className="text-[10px] text-slate-400 block mt-0.5">{scan.check_in_time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Awaiting face scans...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Quick Start Session Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Start Attendance Session"
          subtitle="Configure session parameters and start attendance scanning immediately"
        >
          <form onSubmit={handleQuickCreateSession} className="space-y-4 text-xs">
            {createSessionError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 font-medium">
                {createSessionError}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Session Title *</label>
              <input
                type="text"
                value={sessionFormData.title}
                onChange={(e) => setSessionFormData({ ...sessionFormData, title: e.target.value })}
                placeholder="e.g. Morning Lecture, Assembly, Seminar"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subject / Topic Name</label>
              <input
                type="text"
                value={sessionFormData.custom_subject_name}
                onChange={(e) => setSessionFormData({ ...sessionFormData, custom_subject_name: e.target.value })}
                placeholder="e.g. Operating Systems, Mathematics (or General)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Enter any subject or topic manually without pre-set limitations</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={sessionFormData.date}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Start Time</label>
                  <button
                    type="button"
                    onClick={() => setSessionFormData({
                      ...sessionFormData,
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
                  value={sessionFormData.start_time}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, start_time: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={sessionFormData.end_time}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, end_time: e.target.value })}
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
                  value={sessionFormData.room}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, room: e.target.value })}
                  placeholder="e.g. Room 101, Main Gate"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Late Grace (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={sessionFormData.late_threshold_minutes}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, late_threshold_minutes: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingSession}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold flex items-center gap-1.5 hover:bg-slate-800 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{creatingSession ? 'Starting Session...' : 'Start Session & Scan'}</span>
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};
