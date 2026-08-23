

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="landing-stage animate-fade-in">
      <div className="landing-image" aria-hidden="true" />
      <nav className="landing-nav" aria-label="Landing page navigation">
        <span>MAESTER / AI INTERVIEW STUDIO</span>
        <span>SESSION 01 / READY</span>
      </nav>
      <div className="landing-copy">
        <p className="eyebrow">THE NEXT GENERATION OF TECHNICAL SCREENING</p>
        <h2>Prove Your<br /><em>Skills.</em></h2>
        <p className="landing-description">
          A focused, adaptive interview built around your experience, your decisions, and the way you think under pressure.
        </p>

      <button
        onClick={onStart}
        className="hero-cta group"
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

        <div className="landing-meta">
          <span><b>01</b> Resume-led</span>
          <span><b>02</b> Adaptive questions</span>
          <span><b>03</b> Honest feedback</span>
        </div>
      </div>
      <div className="landing-index" aria-hidden="true">MAESTER® / 2026</div>
    </div>
  );
}
