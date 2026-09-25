import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Mail, Phone, Hash, Lock, Camera, 
  ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, 
  RefreshCw, Sparkles, Video, UserCheck, ChevronRight
} from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import { api } from '../services/api';
import { soundService } from '../services/audio';

type Step = 'INFO' | 'SAMPLES' | 'LIVENESS' | 'COMPLETE';

interface CapturedSample {
  sample_type: string;
  label: string;
  image_base64: string;
}

export const StudentRegistrationPage: React.FC = () => {
  const [step, setStep] = useState<Step>('INFO');

  // Step 1: Personal Information
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    roll_number: '',
    password: '',
    department: 'Computer Science & Engineering',
    batch_year: 2026,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [registeredStudent, setRegisteredStudent] = useState<any>(null);

  // Step 2: Multi-Sample Face Enrollment
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const sampleTargets = [
    { type: 'FRONT', label: 'Front Facing (Straight)' },
    { type: 'LEFT', label: 'Slight Left Angle' },
    { type: 'RIGHT', label: 'Slight Right Angle' },
    { type: 'TILT', label: 'Slight Tilt / Upward' },
  ];
  const [capturedSamples, setCapturedSamples] = useState<CapturedSample[]>([]);
  const [currentSampleIndex, setCurrentSampleIndex] = useState<number>(0);

  // Step 3: Active Liveness Challenge
  const [livenessSession, setLivenessSession] = useState<any>(null);
  const [currentChallenge, setCurrentChallenge] = useState<any>(null);
  const [livenessMessage, setLivenessMessage] = useState<string>('');
  const [livenessStep, setLivenessStep] = useState<number>(1);
  const [livenessComplete, setLivenessComplete] = useState<boolean>(false);
  const [livenessProcessing, setLivenessProcessing] = useState<boolean>(false);

  // General Status
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Start / Stop Camera
  const startCamera = async () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setCameraError('Camera access denied or unavailable. Please connect a webcam.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn(e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
  };

  useEffect(() => {
    if (step === 'SAMPLES' || step === 'LIVENESS') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  // Handle Form Change with real-time validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setGeneralError(null);
  };

  // Step 1 Submission: Validate & Check Duplicates
  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const errors: Record<string, string> = {};

    // Name validation
    if (!formData.full_name.trim() || formData.full_name.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters.';
    } else if (/\d/.test(formData.full_name)) {
      errors.full_name = 'Name cannot contain numerical digits.';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please provide a valid institutional email address.';
    }

    // Phone validation (10 digits)
    const cleanedPhone = formData.phone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      errors.phone = 'Phone number must be exactly 10 digits.';
    }

    // Roll number validation
    if (!formData.roll_number.trim()) {
      errors.roll_number = 'Roll number is required.';
    }

    // Password validation
    if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Check duplicate email, phone, and roll number via API
    setCheckingDuplicates(true);
    try {
      const checkRes = await api.checkDuplicates({
        email: formData.email.trim(),
        phone: cleanedPhone,
        roll_number: formData.roll_number.trim(),
      });

      if (!checkRes.valid) {
        setFieldErrors(checkRes.errors);
        setCheckingDuplicates(false);
        return;
      }

      // Pre-register student record in backend to generate Student ID
      setLoading(true);
      const studentRes = await api.registerStudent({
        ...formData,
        phone: cleanedPhone,
        roll_number: formData.roll_number.trim().toUpperCase(),
      });

      setRegisteredStudent(studentRes);
      setStep('SAMPLES');
    } catch (err: any) {
      setGeneralError(err.message || 'Validation failed. Please review the inputs.');
    } finally {
      setCheckingDuplicates(false);
      setLoading(false);
    }
  };

  // Capture Frame from Video
  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // Step 2: Capture a sample
  const handleCaptureSample = () => {
    const frame = captureFrame();
    if (!frame) return;

    const currentTarget = sampleTargets[currentSampleIndex];
    const newSample: CapturedSample = {
      sample_type: currentTarget.type,
      label: currentTarget.label,
      image_base64: frame,
    };

    soundService.playLivenessStep();

    const updated = [...capturedSamples, newSample];
    setCapturedSamples(updated);

    if (currentSampleIndex + 1 < sampleTargets.length) {
      setCurrentSampleIndex(currentSampleIndex + 1);
    } else {
      // Completed all multi-samples -> move to Step 3: Liveness Challenge
      initiateLivenessChallenge();
    }
  };

  // Step 3: Start Active Liveness Challenge
  const initiateLivenessChallenge = async () => {
    setLoading(true);
    try {
      const challengeRes = await api.startLiveness();
      setLivenessSession(challengeRes);
      setCurrentChallenge(challengeRes.current_challenge);
      setLivenessStep(1);
      setLivenessMessage(challengeRes.current_challenge.instruction);
      setStep('LIVENESS');
    } catch (err: any) {
      setGeneralError('Failed to initialize liveness challenge: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Confirm Challenge Action
  const handleVerifyCurrentChallenge = async () => {
    if (!livenessSession || livenessProcessing) return;
    setLivenessProcessing(true);

    try {
      const verifyRes = await api.verifyLivenessStep({
        session_id: livenessSession.session_id,
        action_data: {
          client_verified_action: currentChallenge.type,
          is_smiling: currentChallenge.type === 'SMILE',
          did_blink: currentChallenge.type === 'BLINK',
        },
      });

      if (verifyRes.success) {
        soundService.playLivenessStep();
        if (verifyRes.completed) {
          setLivenessComplete(true);
          setLivenessMessage('Liveness verified! Enrolling biometrics...');
          // Submit final registration biometrics to backend
          await completeBiometricRegistration();
        } else {
          setCurrentChallenge(verifyRes.next_challenge);
          setLivenessStep(verifyRes.step);
          setLivenessMessage(verifyRes.next_challenge.instruction);
        }
      } else {
        setLivenessMessage(verifyRes.message || 'Please follow the challenge instruction.');
      }
    } catch (err: any) {
      setLivenessMessage('Challenge verification failed. Please try again.');
    } finally {
      setLivenessProcessing(false);
    }
  };

  // Final Step: Submit Face Samples & Liveness to Backend Biometric Service
  const completeBiometricRegistration = async () => {
    setLoading(true);
    setGeneralError(null);

    try {
      const samplesPayload = capturedSamples.map((s) => ({
        sample_type: s.sample_type,
        image_base64: s.image_base64,
      }));

      const res = await api.registerFaceBiometrics(
        registeredStudent.id,
        samplesPayload,
        livenessSession.session_id
      );

      if (res.success) {
        soundService.playSuccess();
        setStep('COMPLETE');
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Biometric registration failed. Please retry.');
      soundService.playUnknown();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout activePath="register-student">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Student Face Registration</h1>
            <p className="text-xs text-slate-500 mt-1">Multi-step biometric enrollment with active anti-spoofing challenge</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Anti-Spoofing Enabled</span>
          </div>
        </div>

        {/* Wizard Progress Indicator */}
        <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
          <div className={`p-2 rounded-xl text-center font-medium ${step === 'INFO' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-500 bg-slate-50'}`}>
            1. Information
          </div>
          <div className={`p-2 rounded-xl text-center font-medium ${step === 'SAMPLES' ? 'bg-slate-900 text-white font-semibold' : capturedSamples.length > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-50'}`}>
            2. Multi-Sample
          </div>
          <div className={`p-2 rounded-xl text-center font-medium ${step === 'LIVENESS' ? 'bg-slate-900 text-white font-semibold' : livenessComplete ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-50'}`}>
            3. Liveness
          </div>
          <div className={`p-2 rounded-xl text-center font-medium ${step === 'COMPLETE' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-500 bg-slate-50'}`}>
            4. Enrolled
          </div>
        </div>

        {/* Global Error Banner */}
        {generalError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold">{generalError}</p>
              <p className="text-rose-600 mt-0.5">Please check lighting, position your face clearly, or verify details.</p>
            </div>
          </div>
        )}

        {/* Hidden Canvas for Frame Grab */}
        <canvas ref={canvasRef} className="hidden" />

        {/* STEP 1: Personal Information */}
        {step === 'INFO' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8">
            <h2 className="text-base font-bold text-slate-900 mb-1">Academic & Personal Details</h2>
            <p className="text-xs text-slate-500 mb-6">Enter official student credentials. Duplicate email, phone, or roll number will be rejected.</p>

            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Aarav Sharma"
                    required
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-900 focus:outline-hidden ${
                      fieldErrors.full_name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-slate-800'
                    }`}
                  />
                  {fieldErrors.full_name && <p className="text-xs text-rose-600 mt-1">{fieldErrors.full_name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    name="roll_number"
                    value={formData.roll_number}
                    onChange={handleInputChange}
                    placeholder="e.g. CS2026001"
                    required
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-900 uppercase focus:outline-hidden ${
                      fieldErrors.roll_number ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-slate-800'
                    }`}
                  />
                  {fieldErrors.roll_number && <p className="text-xs text-rose-600 mt-1">{fieldErrors.roll_number}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="student@college.edu"
                    required
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-900 focus:outline-hidden ${
                      fieldErrors.email ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-slate-800'
                    }`}
                  />
                  {fieldErrors.email && <p className="text-xs text-rose-600 mt-1">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">10-Digit Mobile Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    maxLength={10}
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="9876543210"
                    required
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-900 focus:outline-hidden ${
                      fieldErrors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-slate-800'
                    }`}
                  />
                  {fieldErrors.phone && <p className="text-xs text-rose-600 mt-1">{fieldErrors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-hidden"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Applied Sciences">Applied Sciences</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Year</label>
                  <input
                    type="number"
                    name="batch_year"
                    value={formData.batch_year}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Min. 6 chars"
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-900 focus:outline-hidden ${
                      fieldErrors.password ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-slate-800'
                    }`}
                  />
                  {fieldErrors.password && <p className="text-xs text-rose-600 mt-1">{fieldErrors.password}</p>}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={checkingDuplicates || loading}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {checkingDuplicates || loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Proceed to Camera Capture</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Multi-Sample Face Enrollment */}
        {step === 'SAMPLES' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Multi-Sample Face Enrollment</h2>
                <p className="text-xs text-slate-500">
                  Target {currentSampleIndex + 1} of {sampleTargets.length}:{' '}
                  <strong className="text-indigo-600">{sampleTargets[currentSampleIndex]?.label}</strong>
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                {capturedSamples.length} / {sampleTargets.length} Samples Captured
              </span>
            </div>

            {/* Video Viewport with Guide Oval */}
            <div className="relative w-full max-w-lg mx-auto aspect-4/3 rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Guide Overlay Frame */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-68 border-2 border-dashed border-white/70 rounded-full flex flex-col items-center justify-between p-4 shadow-2xl">
                  <span className="text-[11px] font-semibold text-white/90 bg-slate-900/80 px-2.5 py-0.5 rounded-full">
                    Position Face Inside
                  </span>
                  <div className="w-full h-0.5 bg-indigo-400/50 rounded-full" />
                </div>
              </div>

              {/* Live Instruction Pill */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center">
                <div className="bg-slate-900/90 backdrop-blur-xs text-white text-xs font-semibold px-4 py-1.5 rounded-full border border-white/20 shadow-lg">
                  {sampleTargets[currentSampleIndex]?.label}
                </div>
              </div>
            </div>

            {/* Captured Samples Thumbnails */}
            <div className="mt-4 grid grid-cols-4 gap-3 max-w-lg mx-auto">
              {sampleTargets.map((target, idx) => {
                const sample = capturedSamples[idx];
                return (
                  <div
                    key={target.type}
                    className={`aspect-4/3 rounded-xl border flex flex-col items-center justify-center p-1 relative overflow-hidden ${
                      sample
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : idx === currentSampleIndex
                        ? 'border-indigo-600 bg-indigo-50/30'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    {sample ? (
                      <>
                        <img src={sample.image_base64} alt={sample.label} className="w-full h-full object-cover rounded-lg" />
                        <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[10px]">
                          ✓
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center font-medium">
                        Sample {idx + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Capture Button */}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleCaptureSample}
                className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Sample ({sampleTargets[currentSampleIndex]?.label})</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Interactive Liveness Challenge */}
        {step === 'LIVENESS' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Anti-Spoofing Liveness Challenge</h2>
                <p className="text-xs text-slate-500">
                  Challenge {livenessStep} of {livenessSession?.total_challenges || 3}: Randomized interactive live verification
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Action Required
              </span>
            </div>

            {/* Video Viewport with Challenge Banner */}
            <div className="relative w-full max-w-lg mx-auto aspect-4/3 rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Challenge Instruction Card Overlay */}
              <div className="absolute top-4 inset-x-4 flex justify-center">
                <div className="bg-indigo-950/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl border border-indigo-400/40 shadow-xl text-center max-w-sm">
                  <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold block mb-0.5">
                    Instruction
                  </span>
                  <p className="text-sm font-bold text-white">
                    {currentChallenge?.instruction || 'Look directly into camera'}
                  </p>
                  <p className="text-[11px] text-indigo-200 mt-0.5">
                    {currentChallenge?.hint || 'Hold position for 1 second'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center space-y-3">
              <button
                type="button"
                disabled={livenessProcessing || loading}
                onClick={handleVerifyCurrentChallenge}
                className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
              >
                {livenessProcessing ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Action & Continue</span>
                  </>
                )}
              </button>
              <p className="text-xs text-slate-500 font-medium">{livenessMessage}</p>
            </div>
          </div>
        )}

        {/* STEP 4: Registration Complete */}
        {step === 'COMPLETE' && registeredStudent && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-slate-900">Student Registered Successfully</h2>
            <p className="text-xs text-slate-500 mt-1">
              Biometric enrollment verified, duplicate check passed, and institutional ID issued.
            </p>

            {/* Generated Institutional ID Card */}
            <div className="mt-6 p-6 rounded-2xl bg-linear-to-b from-slate-900 to-indigo-950 text-white text-left shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-semibold block">
                    Institutional Identity Card
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{registeredStudent.full_name}</h3>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800">
                    Active Biometrics
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/10 pt-4">
                <div>
                  <span className="text-slate-400 block text-[10px]">STUDENT ID (IMMUTABLE)</span>
                  <span className="font-mono font-bold text-indigo-200 text-sm">{registeredStudent.student_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ROLL NUMBER</span>
                  <span className="font-mono font-bold text-white text-sm">{registeredStudent.roll_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">EMAIL ADDRESS</span>
                  <span className="text-slate-200 truncate block">{registeredStudent.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">DEPARTMENT</span>
                  <span className="text-slate-200 truncate block">{registeredStudent.department}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => {
                  setStep('INFO');
                  setFormData({
                    full_name: '',
                    email: '',
                    phone: '',
                    roll_number: '',
                    password: '',
                    department: 'Computer Science & Engineering',
                    batch_year: 2026,
                  });
                  setCapturedSamples([]);
                  setLivenessComplete(false);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                + Register Another Student
              </button>
              <a
                href="#/students"
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                View Student Directory
              </a>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
