import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { startInterview } from "./api";
import type { Candidate } from "./candidates";
import CandidatePicker from "./components/CandidatePicker";
import ModeSelect from "./components/ModeSelect";
import InterviewChat from "./components/InterviewChat";

type AppState =
  | { screen: "pick" }
  | { screen: "mode"; candidate: Candidate }
  | { screen: "chat"; sessionId: string; candidate: Candidate; initialReply: string; mode: "text" | "voice" }
  | { screen: "done" };

export default function App() {
  const [state, setState]   = useState<AppState>({ screen: "pick" });
  const [loading, setLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  function handlePickCandidate(candidate: Candidate) {
    setState({ screen: "mode", candidate });
    setStartError(null);
  }

  async function handleStartInterview(mode: "text" | "voice") {
    if (state.screen !== "mode") return;
    const { candidate } = state;
    
    setLoading(true);
    setStartError(null);
    const sessionId = uuidv4();
    try {
      const resp = await startInterview(sessionId, candidate);
      setState({ screen: "chat", sessionId, candidate, initialReply: resp.reply, mode });
    } catch (e: unknown) {
      setStartError(e instanceof Error ? e.message : "Failed to start interview");
    } finally {
      setLoading(false);
    }
  }

  function handleRestart() {
    setState({ screen: "pick" });
    setStartError(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo strip */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">AI Cohort · Interview Agent</span>
        </div>

        <div
          className="glass-darker p-6"
          style={{
            minHeight: state.screen === "chat" ? "72vh" : undefined,
            display: state.screen === "chat" ? "flex" : undefined,
            flexDirection: state.screen === "chat" ? "column" : undefined,
          }}
        >
          {state.screen === "pick" && (
            <CandidatePicker onStart={handlePickCandidate} loading={loading} />
          )}

          {state.screen === "mode" && (
            <>
              <ModeSelect 
                candidate={state.candidate} 
                onSelect={handleStartInterview} 
                onBack={() => setState({ screen: "pick" })} 
              />
              {loading && (
                <div className="mt-4 text-center text-brand-300 text-sm animate-pulse-slow">
                  Starting interview…
                </div>
              )}
              {startError && (
                <div className="mt-4 glass p-3 text-red-400 text-sm text-center animate-fade-in">
                  ⚠ {startError}
                </div>
              )}
            </>
          )}

          {state.screen === "chat" && (
            <InterviewChat
              sessionId={state.sessionId}
              initialReply={state.initialReply}
              candidateName={state.candidate.member.name}
              mode={state.mode}
              onFinish={() => {}}
              onRestart={handleRestart}
            />
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Grader endpoint: <code className="text-gray-500">POST http://localhost:8000/api/interview</code>
        </p>
      </div>
    </div>
  );
}
