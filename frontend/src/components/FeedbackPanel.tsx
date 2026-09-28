import type { Feedback } from "../api";

interface FeedbackPanelProps {
  feedback: Feedback;
  candidateName: string;
  onRestart: () => void;
}

function Section({
  title,
  items,
  colorClass,
  icon,
}: {
  title: string;
  items: string[];
  colorClass: string;
  icon: React.ReactNode;
}) {
  if (!items || !items.length) return null;
  return (
    <div className="animate-slide-up h-full">
      <div className={`flex items-center gap-2 mb-3 ${colorClass}`}>
        {icon}
        <h3 className="font-semibold text-sm uppercase tracking-wider">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.filter(Boolean).map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-sm text-gray-300 leading-relaxed"
          >
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${colorClass.replace("text-", "bg-")}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FeedbackPanel({
  feedback,
  candidateName,
  onRestart,
}: FeedbackPanelProps) {
  const answeredCount = feedback.questions_answered ?? 0;
  const totalCount = feedback.total_questions ?? 10;
  const score = feedback.score ?? 0;
  const percentComplete = Math.min(100, Math.round((answeredCount / max(totalCount, 1)) * 100));

  function max(a: number, b: number) {
    return a > b ? a : b;
  }

  const strongItems = feedback.strong_sections?.length ? feedback.strong_sections : (feedback.strengths || []);
  const weakItems = feedback.weak_sections?.length ? feedback.weak_sections : (feedback.gaps || []);
  const improveItems = feedback.areas_to_improve?.length ? feedback.areas_to_improve : (feedback.next || []);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600/40 to-violet-600/40 border border-brand-500/30 mb-4 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]">
          <svg className="w-8 h-8 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Interview Complete</h2>
        <p className="text-gray-400 text-sm">Here's your personalised evaluation report, {candidateName.split(" ")[0]}</p>
      </div>

      {/* Answer Performance & Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Questions Answered Card */}
        <div className="glass p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center">
          <span className="text-xs uppercase tracking-wider text-gray-400 mb-1 font-medium">Questions Answered</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-sky-400">{answeredCount}</span>
            <span className="text-sm text-gray-400">/ {totalCount}</span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-sky-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 mt-1.5">{answeredCount === 0 ? "No answers provided" : `${percentComplete}% of questions completed`}</span>
        </div>

        {/* Completion Rate Card */}
        <div className="glass p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center">
          <span className="text-xs uppercase tracking-wider text-gray-400 mb-1 font-medium">Completion Rate</span>
          <span className="text-2xl font-bold text-indigo-400">
            {percentComplete}%
          </span>
          <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-indigo-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 mt-1.5">Interview coverage</span>
        </div>

        {/* Answer Quality Score Card */}
        <div className="glass p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center">
          <span className="text-xs uppercase tracking-wider text-gray-400 mb-1 font-medium">Performance Score</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400"}`}>
              {score}%
            </span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${score >= 75 ? "bg-emerald-400" : score >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 mt-1.5">
            {score >= 75 ? "Strong Performance" : score >= 50 ? "Adequate Performance" : answeredCount === 0 ? "Not Assessed" : "Needs Practice"}
          </span>
        </div>
      </div>

      {/* AI Summary */}
      <div className="glass p-5 border-l-4 border-l-brand-500 rounded-lg bg-gradient-to-r from-brand-900/20 to-transparent">
        <h4 className="text-xs uppercase tracking-wider text-brand-300 font-semibold mb-2 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Overall Assessment
        </h4>
        <p className="text-gray-300 text-sm leading-relaxed">{feedback.summary}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Strengths & Gaps */}
        <div className="space-y-6">
          <div className="glass p-5 flex flex-col h-full border-t-2 border-t-emerald-500/50 rounded-lg">
            <Section
              title="Demonstrated Strengths"
              items={strongItems}
              colorClass="text-emerald-400"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            />
          </div>
          
          <div className="glass p-5 flex flex-col h-full border-t-2 border-t-red-400/50 rounded-lg">
            <Section
              title="Gaps & Weak Areas"
              items={weakItems}
              colorClass="text-red-400"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Right Column: Next Steps */}
        <div className="glass p-5 border-t-2 border-t-brand-400/50 h-full rounded-lg">
          <Section
            title="Actionable Areas to Improve"
            items={improveItems}
            colorClass="text-brand-400"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </div>
      </div>

      <button onClick={onRestart} className="btn-ghost w-full text-center py-3">
        Return to Home
      </button>
    </div>
  );
}
