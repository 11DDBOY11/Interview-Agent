import { useState } from "react";
import LandingPage from "./components/LandingPage";
import SetupPage from "./components/SetupPage";
import InterviewChat from "./components/InterviewChat";

type AppState =
  | { screen: "landing" }
  | { screen: "setup" }
  | { screen: "chat"; sessionId: string; candidateName: string };

export default function App() {
  const [state, setState] = useState<AppState>({ screen: "landing" });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-brand-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/20 via-slate-900/10 to-slate-950 -z-10" />
      
      <div className="container mx-auto px-4 h-screen py-12 flex flex-col relative z-0">
        <header className="mb-8 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <span className="font-bold text-white tracking-wider">M</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-200 to-indigo-300">
                MAESTER
              </h1>
              <p className="text-xs text-brand-400/80 font-medium tracking-wide uppercase">Proctored AI Interviewer</p>
            </div>
          </div>
        </header>

        <main className="flex-1 relative">
          {state.screen === "landing" && (
            <LandingPage onStart={() => setState({ screen: "setup" })} />
          )}

          {state.screen === "setup" && (
            <SetupPage 
              onComplete={(sessionId, candidateName) => setState({ screen: "chat", sessionId, candidateName })}
              onCancel={() => setState({ screen: "landing" })}
            />
          )}

          {state.screen === "chat" && (
            <InterviewChat
              sessionId={state.sessionId}
              initialReply="Hello! I've reviewed your resume. Let's begin the interview when you're ready."
              candidateName={state.candidateName}
              mode="voice"
              onFinish={() => setState({ screen: "landing" })}
              onRestart={() => setState({ screen: "landing" })}
            />
          )}
        </main>
      </div>
    </div>
  );
}
