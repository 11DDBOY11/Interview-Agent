import { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import SetupPage from "./components/SetupPage";
import InterviewChat from "./components/InterviewChat";
import { loadSession, clearSession, isOwner, unlockOwner, lockOwner } from "./storage";

type AppState =
  | { screen: "landing" }
  | { screen: "setup" }
  | { screen: "chat"; sessionId: string; candidateName: string; initialReply: string };

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = loadSession();
    if (saved && saved.sessionId) {
      return { screen: "chat", sessionId: saved.sessionId, candidateName: saved.candidateName, initialReply: "" };
    }
    return { screen: "landing" };
  });

  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerUnlocked, setOwnerUnlocked] = useState(isOwner());
  const [ownerMessage, setOwnerMessage] = useState("");
  const [showStorageInfo, setShowStorageInfo] = useState(false);

  useEffect(() => {
    if (state.screen === "landing") {
      const saved = loadSession();
      if (saved && saved.sessionId) {
        setState({ screen: "chat", sessionId: saved.sessionId, candidateName: saved.candidateName, initialReply: "" });
      }
    }
  }, []);

  const handleOwnerUnlock = () => {
    if (unlockOwner(ownerPassword)) {
      setOwnerUnlocked(true);
      setOwnerMessage("Owner access granted.");
    } else {
      setOwnerMessage("Invalid password.");
    }
    setOwnerPassword("");
  };

  const handleOwnerLock = () => {
    lockOwner();
    setOwnerUnlocked(false);
    setOwnerMessage("Owner access locked.");
  };

  const handleClearAllData = () => {
    if (!ownerUnlocked) return;
    clearSession();
    setState({ screen: "landing" });
    setShowOwnerPanel(false);
    setOwnerMessage("All interview data cleared.");
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1f1f1f] font-sans">
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
        <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
          {/* MD3 Top App Bar */}
          <header className="bg-white border-b border-[#e8eaed] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a73e8] flex items-center justify-center text-white font-medium text-lg">
                M
              </div>
              <span className="text-[#1f1f1f] text-lg font-medium">MAESTER</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStorageInfo(!showStorageInfo)}
                className="text-[#5f6368] hover:text-[#1f1f1f] text-sm font-medium px-3 py-2 rounded-full hover:bg-[#f1f3f4] transition-colors"
              >
                Storage Info
              </button>
              {ownerUnlocked && (
                <button
                  onClick={() => setShowOwnerPanel(!showOwnerPanel)}
                  className="text-[#5f6368] hover:text-[#1f1f1f] text-sm font-medium px-3 py-2 rounded-full hover:bg-[#f1f3f4] transition-colors"
                >
                  {showOwnerPanel ? "Close" : "Owner"}
                </button>
              )}
            </div>
          </header>

          {/* Storage Info Panel */}
          {showStorageInfo && (
            <div className="bg-white border-b border-[#e8eaed] px-6 py-4 animate-fade-in">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-sm font-medium text-[#1f1f1f] mb-3">Local Storage Information</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-xs text-[#5f6368]">
                  <div className="bg-[#f8f9fa] rounded-xl p-4 border border-[#e8eaed]">
                    <p className="font-medium text-[#1f1f1f] mb-1">Storage Location</p>
                    <p className="font-mono text-[11px]">localStorage["maester_interview_session"]</p>
                  </div>
                  <div className="bg-[#f8f9fa] rounded-xl p-4 border border-[#e8eaed]">
                    <p className="font-medium text-[#1f1f1f] mb-1">Browser Path (Chrome)</p>
                    <p className="font-mono text-[11px]">%LocalAppData%\Google\Chrome\User Data\Default\Local Storage\</p>
                  </div>
                  <div className="bg-[#f8f9fa] rounded-xl p-4 border border-[#e8eaed]">
                    <p className="font-medium text-[#1f1f1f] mb-1">Data Persistence</p>
                    <p>Data persists across page refreshes and browser restarts until manually cleared.</p>
                  </div>
                  <div className="bg-[#f8f9fa] rounded-xl p-4 border border-[#e8eaed]">
                    <p className="font-medium text-[#1f1f1f] mb-1">How to View</p>
                    <p>Open DevTools → Application → Local Storage → http://localhost:5173</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Owner Panel */}
          {showOwnerPanel && ownerUnlocked && (
            <div className="bg-white border-b border-[#e8eaed] px-6 py-4 animate-fade-in">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-sm font-medium text-[#1f1f1f] mb-3">Owner Controls</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleClearAllData}
                    className="px-4 py-2 bg-[#d93025] text-white text-xs rounded-full hover:bg-[#b3261e] transition-colors"
                  >
                    Clear All Interview Data
                  </button>
                  <button
                    onClick={handleOwnerLock}
                    className="px-4 py-2 border border-[#dadce0] text-[#5f6368] text-xs rounded-full hover:bg-[#f1f3f4] transition-colors"
                  >
                    Lock Owner Access
                  </button>
                </div>
                {ownerMessage && <p className="text-xs text-[#5f6368] mt-2">{ownerMessage}</p>}
              </div>
            </div>
          )}

          {/* Owner Login */}
          {!ownerUnlocked && (
            <div className="fixed bottom-6 right-6 z-50">
              <button
                onClick={() => setShowOwnerPanel(!showOwnerPanel)}
                className="text-xs text-[#9aa0a6] hover:text-[#5f6368] transition-colors"
              >
                Owner Login
              </button>
              {showOwnerPanel && (
                <div className="absolute bottom-8 right-0 bg-white rounded-2xl border border-[#e8eaed] p-5 w-72 shadow-xl">
                  <p className="text-xs text-[#5f6368] mb-3">Enter owner password:</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleOwnerUnlock()}
                      className="flex-1 bg-white border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-[#1f1f1f] focus:outline-none focus:border-[#1a73e8]"
                      placeholder="Password"
                    />
                    <button
                      onClick={handleOwnerUnlock}
                      className="px-4 py-2 bg-[#1a73e8] text-white text-sm rounded-lg hover:bg-[#1765cc] transition-colors"
                    >
                      Unlock
                    </button>
                  </div>
                  {ownerMessage && <p className="text-xs text-[#d93025] mt-2">{ownerMessage}</p>}
                </div>
              )}
            </div>
          )}

          {/* Chat Content */}
          <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
            <InterviewChat
              sessionId={state.sessionId}
              initialReply={state.initialReply}
              candidateName={state.candidateName}
              mode="voice"
              onFinish={() => {}}
              onRestart={() => {
                clearSession();
                setState({ screen: "landing" });
              }}
            />
          </main>
        </div>
      )}
    </div>
  );
}
