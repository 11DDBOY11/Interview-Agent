interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* MD3 Top App Bar */}
      <header className="bg-white border-b border-[#e8eaed] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1a73e8] flex items-center justify-center text-white font-medium text-lg">
            M
          </div>
          <span className="text-[#1f1f1f] text-lg font-medium tracking-tight">MAESTER</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-[#5f6368]">
          <span className="hidden sm:inline">AI Interview Studio</span>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <p className="text-[#1a73e8] text-sm font-medium tracking-wide uppercase mb-4">Technical Interview Platform</p>
            <h1 className="text-5xl sm:text-6xl font-normal text-[#1f1f1f] tracking-tight leading-tight mb-6">
              Prove Your<br />
              <span className="text-[#1a73e8]">Skills.</span>
            </h1>
            <p className="text-[#5f6368] text-lg leading-relaxed max-w-lg mx-auto">
              A focused, adaptive interview built around your experience, your decisions, and the way you think under pressure.
            </p>
          </div>

          <div className="flex justify-center mb-16">
            <button
              onClick={onStart}
              className="bg-[#1a73e8] text-white px-8 py-4 rounded-full text-base font-medium hover:bg-[#1765cc] transition-all shadow-md hover:shadow-lg flex items-center gap-3"
            >
              Start Interview
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </button>
          </div>

          <div className="flex justify-center gap-8 text-sm text-[#5f6368]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#d3e3fd] text-[#041e49] flex items-center justify-center text-xs font-medium">1</span>
              Resume-led
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#d3e3fd] text-[#041e49] flex items-center justify-center text-xs font-medium">2</span>
              Adaptive questions
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#d3e3fd] text-[#041e49] flex items-center justify-center text-xs font-medium">3</span>
              Honest feedback
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8eaed] px-6 py-4 text-center text-xs text-[#9aa0a6]">
        MAESTER / 2026
      </footer>
    </div>
  );
}
