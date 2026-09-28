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
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* MD3 Top App Bar */}
      <header className="bg-white border-b border-[#e8eaed] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1a73e8] flex items-center justify-center text-white font-medium text-lg">
            M
          </div>
          <span className="text-[#1f1f1f] text-lg font-medium">MAESTER</span>
        </div>
        <button onClick={onCancel} className="text-[#5f6368] hover:text-[#1f1f1f] text-sm font-medium">
          Cancel
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-[#e8eaed] p-8 shadow-sm">
            <h2 className="text-2xl font-normal text-[#1f1f1f] mb-6">Setup Your Interview</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2" htmlFor="candidate-name">
                  Your Name
                </label>
                <input
                  id="candidate-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-white border border-[#dadce0] rounded-lg px-4 py-3 text-[#1f1f1f] focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                  disabled={loading}
                  required
                />
                {fieldErrors.name && <p className="text-[#d93025] text-xs mt-1">{fieldErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2" htmlFor="candidate-role">
                  Target Job Role
                </label>
                <input
                  id="candidate-role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full bg-white border border-[#dadce0] rounded-lg px-4 py-3 text-[#1f1f1f] focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                  disabled={loading}
                  required
                />
                {fieldErrors.role && <p className="text-[#d93025] text-xs mt-1">{fieldErrors.role}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2" htmlFor="resume-upload">
                  Upload Resume (PDF)
                </label>
                <input
                  id="resume-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => selectResume(e.target.files?.[0])}
                  className="sr-only"
                  disabled={loading}
                  required
                />
                <label
                  htmlFor="resume-upload"
                  className="block cursor-pointer border-2 border-dashed border-[#dadce0] rounded-xl p-6 text-center hover:border-[#1a73e8] hover:bg-[#f8f9fa] transition-all"
                >
                  <span className="text-2xl text-[#1a73e8] mb-2 block">↑</span>
                  <span className="block text-sm text-[#5f6368]">
                    {resume ? resume.name : "Drop your PDF here or browse"}
                  </span>
                  <span className="block text-xs text-[#9aa0a6] mt-1">Maximum 10 MB</span>
                </label>
                {fieldErrors.resume && <p className="text-[#d93025] text-xs mt-1">{fieldErrors.resume}</p>}
              </div>

              {error && (
                <div className="text-[#d93025] text-sm bg-[#f9dedc] p-3 rounded-lg border border-[#d93025]/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !stream}
                className="w-full bg-[#1a73e8] text-white py-3 rounded-full text-sm font-medium hover:bg-[#1765cc] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Initializing...
                  </>
                ) : (
                  "Start Interview"
                )}
              </button>
              <p className="text-[11px] leading-relaxed text-[#9aa0a6] text-center">
                By continuing, you consent to camera and microphone use for interview proctoring.
              </p>
            </form>
          </div>

          {/* Camera Preview */}
          <div className="flex flex-col gap-4">
            <div className="relative w-full aspect-video bg-[#f1f3f4] rounded-2xl overflow-hidden border border-[#e8eaed]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${mirrored ? "transform scale-x-[-1]" : ""}`}
              />
              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs text-[#5f6368] shadow-sm">
                <span className={`h-2 w-2 rounded-full ${stream ? "bg-[#188038]" : "bg-[#f9ab00]"}`} />
                {stream ? "Camera Ready" : "Camera Preview"}
              </div>
              <button
                type="button"
                onClick={() => setMirrored((value) => !value)}
                className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1.5 text-xs text-[#5f6368] shadow-sm hover:bg-white"
              >
                {mirrored ? "Unmirror" : "Mirror"}
              </button>
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center flex-col text-[#9aa0a6] p-6 text-center">
                  <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">{permissionOpen ? "Camera preview will appear here" : "Waiting for camera access..."}</p>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-[#e8eaed] p-6 text-center">
              <h4 className="text-[#1a73e8] font-medium mb-2">
                {stream ? "Camera Ready" : "Camera Access Needed"}
              </h4>
              <p className="text-xs text-[#5f6368] leading-relaxed">
                Ensure you are in a quiet room with good lighting. Look directly at the camera, be confident, and do not switch tabs during the interview.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Permission Dialog */}
      {permissionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl">
            <p className="text-[#1a73e8] text-xs font-medium tracking-wide uppercase mb-2">Before we begin</p>
            <h2 className="text-xl font-normal text-[#1f1f1f] mb-3">Set your interview space.</h2>
            <p className="text-sm leading-relaxed text-[#5f6368] mb-6">
              MAESTER uses your camera and microphone to create a realistic interview environment and verify focus during the session. Nothing starts until you allow access.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 rounded-full border border-[#dadce0] text-[#5f6368] text-sm font-medium hover:bg-[#f1f3f4] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={requestMedia}
                className="flex-1 py-3 rounded-full bg-[#1a73e8] text-white text-sm font-medium hover:bg-[#1765cc] transition-colors"
              >
                Allow access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
