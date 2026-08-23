import { useState } from "react";
import LandingPage from "./components/LandingPage";
import SetupPage from "./components/SetupPage";
import InterviewChat from "./components/InterviewChat";

type AppState =
  | { screen: "landing" }
  | { screen: "setup" }
  | { screen: "chat"; sessionId: string; candidateName: string; initialReply: string };

export default function App() {
  const [state, setState] = useState<AppState>({ screen: "landing" });

  return (
    <div className="min-h-screen bg-ink text-slate-50 font-sans selection:bg-sky-400/30">
      <div className="absolute inset-0 page-noise -z-10" />
      
      <div className={state.screen === "landing" ? "landing-frame flex flex-col relative z-0" : "container mx-auto px-4 h-screen py-5 flex flex-col relative z-0"}>
        <header className="app-header mb-8 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="brand-mark" aria-hidden="true">
              <span>M</span><i />
            </div>
            <div>
              <h1 className="brand-wordmark text-xl font-bold">
                MAESTER
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 relative">
          {state.screen === "landing" && (
            <LandingPage onStart={() => setState({ screen: "setup" })} />
          )}

          {state.screen === "setup" && (
            <SetupPage 
              onComplete={(sessionId, candidateName, initialReply) => setState({ screen: "chat", sessionId, candidateName, initialReply })}
              onCancel={() => setState({ screen: "landing" })}
            />
          )}

          {state.screen === "chat" && (
            <InterviewChat
              sessionId={state.sessionId}
              initialReply={state.initialReply}
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
