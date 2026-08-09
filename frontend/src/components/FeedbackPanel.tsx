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
  if (!items.length) return null;
  return (
    <div className="animate-slide-up">
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
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600/40 to-violet-600/40 border border-brand-500/30 mb-4">
          <svg className="w-8 h-8 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Interview Complete</h2>
        <p className="text-gray-400 text-sm">Here's your personalised feedback, {candidateName.split(" ")[0]}</p>
      </div>

      {/* Summary */}
      <div className="glass p-4">
        <p className="text-gray-300 text-sm leading-relaxed">{feedback.summary}</p>
      </div>

      {/* Strengths / Gaps / Next */}
      <div className="glass p-5 space-y-6">
        <Section
          title="Strengths"
          items={feedback.strengths}
          colorClass="text-emerald-400"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <Section
          title="Gaps"
          items={feedback.gaps}
          colorClass="text-amber-400"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          }
        />
        <Section
          title="Next Steps"
          items={feedback.next}
          colorClass="text-brand-400"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          }
        />
      </div>

      <button onClick={onRestart} className="btn-ghost w-full text-center">
        ↩ Start New Interview
      </button>
    </div>
  );
}
