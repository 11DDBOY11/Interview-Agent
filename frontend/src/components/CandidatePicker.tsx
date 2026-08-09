import { CANDIDATES, type Candidate } from "../candidates";

interface CandidatePickerProps {
  onStart: (candidate: Candidate) => void;
  loading: boolean;
}

function MissionTag({ mission }: { mission: { passed?: boolean; skipped?: boolean; attempts?: number } }) {
  if (mission.skipped) return <span className="badge badge-amber">skipped</span>;
  if (mission.passed === false) return <span className="badge badge-violet">failed</span>;
  const att = mission.attempts ?? 1;
  if (att >= 4) return <span className="badge badge-blue">{att} tries</span>;
  if (att >= 2) return <span className="badge" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#9ca3af" }}>{att} tries</span>;
  return <span className="badge badge-green">1st try</span>;
}

export default function CandidatePicker({ onStart, loading }: CandidatePickerProps) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center mb-2">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-brand-300 text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-slow" />
          AI Interview Agent
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Technical Interview<br />
          <span className="bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">
            Simulator
          </span>
        </h1>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          Select a candidate from the AI Cohort to begin a personalised, adaptive technical interview.
        </p>
      </div>

      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
        {CANDIDATES.map((c) => {
          const firstTryRatio = c.signals.missionsFirstTry / Math.max(c.signals.missionsCompleted, 1);
          const failedCount   = c.missions.filter(m => m.passed === false).length;
          const skippedCount  = c.missions.filter(m => m.skipped).length;

          return (
            <button
              key={c.member.id}
              onClick={() => !loading && onStart(c)}
              disabled={loading}
              className="w-full text-left glass p-4 hover:bg-white/[0.08] hover:border-brand-500/30
                         transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600/50 to-violet-600/50
                                  border border-brand-500/30 flex items-center justify-center flex-shrink-0
                                  text-sm font-bold text-brand-300 group-hover:scale-105 transition-transform">
                    {c.member.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{c.member.name}</div>
                    <div className="text-gray-400 text-xs">{c.member.jobRole} · {c.member.yearsExperience}y exp</div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-col items-end gap-1">
                  <div className="text-xs text-gray-500">
                    {Math.round(firstTryRatio * 100)}% first-try
                  </div>
                  <div className="flex gap-1">
                    {failedCount > 0  && <span className="badge badge-violet">{failedCount} failed</span>}
                    {skippedCount > 0 && <span className="badge badge-amber">{skippedCount} skipped</span>}
                    {failedCount === 0 && skippedCount === 0 && <span className="badge badge-green">all passed</span>}
                  </div>
                </div>
              </div>

              {/* Mission tags */}
              <div className="flex flex-wrap gap-1 mt-3">
                {c.missions.slice(0, 6).map((m) => (
                  <MissionTag key={m.day} mission={m} />
                ))}
                {c.missions.length > 6 && (
                  <span className="text-xs text-gray-600">+{c.missions.length - 6} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
