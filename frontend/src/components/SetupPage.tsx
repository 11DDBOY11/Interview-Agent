import React, { useState, useRef, useEffect } from "react";
import { API_BASE } from "../api";

interface SetupPageProps {
  onComplete: (sessionId: string, candidateName: string) => void;
  onCancel: () => void;
}

export default function SetupPage({ onComplete, onCancel }: SetupPageProps) {
  const [role, setRole] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Request camera and mic access on mount
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
        setError("Microphone and Camera access is required to proceed.");
      });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume || !role || !name) {
      setError("Please fill in all fields and upload a resume.");
      return;
    }
    if (!stream) {
      setError("Camera and Mic permissions are required.");
      return;
    }

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
      
      // Keep tracks alive? We unmount SetupPage and mount InterviewChat, which might kill tracks.
      // We will let InterviewChat request its own stream or handle it.
      onComplete(data.sessionId, name);
    } catch (err: any) {
      console.error("Setup error:", err);
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center h-full max-w-6xl mx-auto p-4 gap-8 animate-fade-in">
      <div className="flex-1 w-full max-w-md">
        <div className="glass p-8 rounded-3xl border border-white/5 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Setup Your Interview</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Target Job Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Upload Resume (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setResume(e.target.files?.[0] || null)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 transition-colors cursor-pointer"
                disabled={loading}
              />
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
                className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-300 hover:bg-slate-800 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-brand-600 hover:bg-brand-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={loading || !stream}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Initializing...
                  </>
                ) : (
                  "Begin Interview"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="flex-1 w-full max-w-md flex flex-col items-center space-y-4">
        <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
          />
          {!stream && (
            <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-400 p-6 text-center">
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p>Requesting camera access...</p>
            </div>
          )}
        </div>
        <div className="glass px-6 py-4 rounded-xl w-full text-center space-y-2 border border-brand-500/30 bg-brand-500/5">
          <h4 className="text-brand-300 font-medium">Proctoring Active</h4>
          <p className="text-xs text-gray-400">
            Ensure you are in a quiet room with good lighting. Look directly at the camera, be confident, and do not switch tabs during the interview.
          </p>
        </div>
      </div>
    </div>
  );
}
