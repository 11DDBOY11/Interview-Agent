import React, { useState, useRef, useEffect } from "react";
import { API_BASE, sendMessage } from "../api";

interface SetupPageProps {
  onComplete: (sessionId: string, candidateName: string, initialReply: string) => void;
  onCancel: () => void;
}

type FieldName = "name" | "role" | "resume";
type FormErrors = Partial<Record<FieldName, string>>;

export default function SetupPage({ onComplete, onCancel }: SetupPageProps) {
  const [role, setRole] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionOpen, setPermissionOpen] = useState(true);
  const [mirrored, setMirrored] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const requestMedia = () => {
    setPermissionOpen(false);
    setError("");
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        setStream(s);
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.error("Media permission error:", err);
        setError("Camera and microphone access is required to begin.");
      });
  };

  const selectResume = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setFieldErrors((current) => ({ ...current, resume: "Please upload a PDF resume." }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors((current) => ({ ...current, resume: "Your resume must be smaller than 10 MB." }));
      return;
    }
    setResume(file);
    setFieldErrors((current) => ({ ...current, resume: undefined }));
    setError("");
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = "Please enter your name.";
    if (!role.trim()) nextErrors.role = "Please enter your target job role.";
    if (!resume) nextErrors.resume = "Please upload a PDF resume.";
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!stream) {
      setError("Camera and Mic permissions are required.");
      return;
    }
    if (!resume) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", resume);
      formData.append("role", role);
      formData.append("name", name);

      const res = await fetch(`${API_BASE}/api/init-interview`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to initialize interview.");
      }

      const data = await res.json();
      const firstQuestion = await sendMessage(data.sessionId, "");
      onComplete(data.sessionId, name, firstQuestion.reply);
    } catch (err: any) {
      console.error("Setup error:", err);
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="setup-page flex flex-col md:flex-row items-center justify-center h-full max-w-6xl mx-auto p-4 gap-10 animate-fade-in">
      <div className="flex-1 w-full max-w-md">
        <div className="glass setup-card p-8 rounded-md border border-white/10 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Setup Your Interview</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="candidate-name">Your Name</label>
              <input
                id="candidate-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-md px-4 py-3 text-white focus:outline-none focus:border-sky-300 transition-colors"
                disabled={loading}
                required
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
              />
              {fieldErrors.name && <p id="name-error" className="field-error">{fieldErrors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="candidate-role">Target Job Role</label>
              <input
                id="candidate-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-md px-4 py-3 text-white focus:outline-none focus:border-sky-300 transition-colors"
                disabled={loading}
                required
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.role)}
                aria-describedby={fieldErrors.role ? "role-error" : undefined}
              />
              {fieldErrors.role && <p id="role-error" className="field-error">{fieldErrors.role}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="resume-upload">Upload Resume (PDF)</label>
              <input
                id="resume-upload"
                type="file"
                accept="application/pdf"
                onChange={(e) => selectResume(e.target.files?.[0])}
                className="sr-only"
                disabled={loading}
                required
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.resume)}
                aria-describedby={fieldErrors.resume ? "resume-error" : undefined}
              />
              <label htmlFor="resume-upload" className="upload-zone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectResume(e.dataTransfer.files[0]); }}>
                <span className="text-2xl text-sky-300">↑</span>
                <span className="block text-sm text-gray-200 mt-2">{resume ? resume.name : "Drop your PDF here or browse"}</span>
                <span className="block text-xs text-gray-500 mt-1">Maximum 10 MB</span>
              </label>
              {fieldErrors.resume && <p id="resume-error" className="field-error">{fieldErrors.resume}</p>}
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="btn-ghost flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="hero-cta flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !stream}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Initializing...
                  </>
                ) : (
                  "Start Interview"
                )}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">By continuing, you consent to camera and microphone use for interview proctoring. Your responses are processed to generate feedback.</p>
          </form>
        </div>
      </div>

      <div className="flex-1 w-full max-w-md flex flex-col items-center space-y-4">
        <div className="relative w-full aspect-video bg-slate-900 rounded-md overflow-hidden border border-sky-300/50 shadow-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${mirrored ? "transform scale-x-[-1]" : ""}`}
          />
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-[11px] text-white backdrop-blur-sm">
            <span className={`h-2 w-2 rounded-full ${stream ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            {stream ? "Camera Ready" : "Camera Preview"}
          </div>
          <button type="button" onClick={() => setMirrored((value) => !value)} className="absolute bottom-3 right-3 rounded bg-black/50 px-2.5 py-1.5 text-[11px] text-gray-200 backdrop-blur-sm hover:bg-black/70">{mirrored ? "Unmirror" : "Mirror"}</button>
          {!stream && (
            <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-400 p-6 text-center">
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p>{permissionOpen ? "Camera preview will appear here" : "Waiting for camera access..."}</p>
            </div>
          )}
        </div>
        <div className="glass px-6 py-4 rounded-md w-full text-center space-y-2 border border-brand-500/30 bg-brand-500/5">
          <h4 className="text-sky-300 font-medium">{stream ? "Camera Ready" : "Camera Access Needed"}</h4>
          <p className="text-xs text-gray-400">
            Ensure you are in a quiet room with good lighting. Look directly at the camera, be confident, and do not switch tabs during the interview.
          </p>
        </div>
      </div>
      {permissionOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass max-w-md p-7 shadow-2xl">
            <p className="eyebrow">BEFORE WE BEGIN</p>
            <h2 className="text-2xl font-semibold text-white">Set your interview space.</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">MAESTER uses your camera and microphone to create a realistic interview environment and verify focus during the session. Nothing starts until you allow access.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
              <button type="button" onClick={requestMedia} className="hero-cta flex-1 justify-center">Allow access</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
