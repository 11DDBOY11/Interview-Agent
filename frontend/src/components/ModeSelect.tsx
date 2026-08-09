import { useEffect, useState } from "react";
import type { Candidate } from "../candidates";

interface ModeSelectProps {
  candidate: Candidate;
  onSelect: (mode: "text" | "voice") => void;
  onBack: () => void;
}

export default function ModeSelect({ candidate, onSelect, onBack }: ModeSelectProps) {
  const [voiceSupported, setVoiceSupported] = useState(true);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      setVoiceSupported(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          title="Back to candidates"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">{candidate.member.name}</h2>
          <p className="text-sm text-gray-400">{candidate.member.jobRole}</p>
        </div>
      </div>

      <div className="space-y-4 mt-2">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Select Interview Mode</h3>
        
        <button
          onClick={() => onSelect("text")}
          className="w-full flex items-center gap-4 glass p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg group relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h4 className="text-lg font-medium text-white mb-1">Text Interview</h4>
            <p className="text-sm text-gray-400">Type your answers manually.</p>
          </div>
        </button>

        <button
          onClick={() => voiceSupported && onSelect("voice")}
          disabled={!voiceSupported}
          className={`w-full flex items-center gap-4 glass p-6 text-left transition-all group relative overflow-hidden ${
            voiceSupported ? "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer" : "opacity-50 cursor-not-allowed grayscale"
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h4 className="text-lg font-medium text-white mb-1">Voice Interview</h4>
            <p className="text-sm text-gray-400">Speak your answers, hands-free.</p>
            {!voiceSupported && (
              <p className="text-xs text-amber-400 mt-1">⚠ Voice not supported in this browser — try Chrome.</p>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
