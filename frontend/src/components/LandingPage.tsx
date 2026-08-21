

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-indigo-400 tracking-tight drop-shadow-sm">
          MAESTER
        </h1>
        <p className="text-xl text-gray-300 max-w-xl mx-auto font-light leading-relaxed">
          The autonomous, resume-driven AI interviewer. Experience a proctored, adaptive technical interview tailored entirely to your experience.
        </p>
      </div>

      <button
        onClick={onStart}
        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-brand-600 border border-transparent rounded-full shadow-lg hover:bg-brand-500 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 focus:ring-offset-slate-900"
      >
        <span>Start Interview</span>
        <svg
          className="w-5 h-5 ml-2 -mr-1 transition-transform duration-200 group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl text-left">
        <div className="glass p-6 rounded-2xl border border-white/5">
          <div className="text-brand-300 mb-2">📄</div>
          <h3 className="text-white font-semibold mb-1">Resume Driven</h3>
          <p className="text-gray-400 text-sm">Upload your CV. We instantly generate 10 highly targeted questions based on your unique background.</p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5">
          <div className="text-brand-300 mb-2">🎤</div>
          <h3 className="text-white font-semibold mb-1">Proctored Experience</h3>
          <p className="text-gray-400 text-sm">Full voice capabilities with camera verification and tab-switching guardrails for realism.</p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5">
          <div className="text-brand-300 mb-2">📊</div>
          <h3 className="text-white font-semibold mb-1">Deep Evaluation</h3>
          <p className="text-gray-400 text-sm">Adaptive follow-ups on your first 3 answers, culminating in a detailed performance breakdown.</p>
        </div>
      </div>
    </div>
  );
}
