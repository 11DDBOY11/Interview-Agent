import { useEffect, useRef, useState } from "react";
import { type Feedback, sendMessage } from "../api";
import FeedbackPanel from "./FeedbackPanel";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";

export interface Message {
  role: "ai" | "user";
  text: string;
}

interface InterviewChatProps {
  sessionId: string;
  initialReply: string;
  candidateName: string;
  mode: "text" | "voice";
  onFinish: (feedback: Feedback) => void;
  onRestart: () => void;
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <div className="w-7 h-7 rounded-lg bg-brand-600/40 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-brand-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
        </svg>
      </div>
      <div className="bubble-ai flex items-center gap-1.5 py-4">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

function AIBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2 animate-slide-up">
      <div className="w-7 h-7 rounded-lg bg-brand-600/40 border border-brand-500/30 flex items-center justify-center flex-shrink-0 flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-brand-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
        </svg>
      </div>
      <div className="bubble-ai whitespace-pre-wrap">{text}</div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  if (!text) return null; // skip rendering empty bubbles for skipped responses
  return (
    <div className="flex justify-end animate-slide-up">
      <div className="bubble-user whitespace-pre-wrap">{text}</div>
    </div>
  );
}

export default function InterviewChat({
  sessionId,
  initialReply,
  candidateName,
  mode: initialMode,
  onFinish,
  onRestart,
}: InterviewChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: initialReply },
  ]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [feedback, setFeedback]   = useState<Feedback | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"text" | "voice">(initialMode);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  // Voice Mode hook setup (only actively responds if activeMode === "voice")
  const { voiceState, transcript, forceSubmit } = useVoiceRecognition({
    messages: activeMode === "voice" ? messages : [], // only pass messages if voice is active to trigger TTS
    loading,
    done,
    onSend: (text) => handleSend(text),
    onFallbackToText: () => {
      setError("Microphone permission denied. Switched to Text Mode.");
      setActiveMode("text");
    }
  });

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, transcript, voiceState]);

  // Auto-resize textarea
  useEffect(() => {
    if (activeMode !== "text") return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input, activeMode]);

  async function handleSend(forcedText?: string) {
    const textToSend = typeof forcedText === "string" ? forcedText : input;
    // Allow empty string to pass through for voice "skip" signals. Only block if text mode and empty.
    if ((activeMode === "text" && !textToSend.trim()) || loading || done) return;

    // Only render bubble if there is actual text
    if (textToSend.trim()) {
      setMessages(prev => [...prev, { role: "user", text: textToSend.trim() }]);
    }
    
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const resp = await sendMessage(sessionId, textToSend.trim());
      setMessages(prev => [...prev, { role: "ai", text: resp.reply }]);
      if (resp.done && resp.feedback) {
        setDone(true);
        setFeedback(resp.feedback);
        onFinish(resp.feedback);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      if (activeMode === "text") {
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (done && feedback) {
    return (
      <div className="flex flex-col gap-4">
        {/* Show last AI message (the closing remark) before feedback */}
        <div className="glass p-4">
          <p className="text-gray-300 text-sm italic">
            "{messages[messages.length - 1]?.text}"
          </p>
        </div>
        <FeedbackPanel
          feedback={feedback}
          candidateName={candidateName}
          onRestart={onRestart}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
          <span className="text-gray-400 text-xs">Interviewing <span className="text-white font-medium">{candidateName}</span></span>
        </div>
        <button onClick={onRestart} className="btn-ghost text-xs px-3 py-1.5">
          ✕ End
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin min-h-0 pb-4">
        {messages.map((m, i) =>
          m.role === "ai"
            ? <AIBubble key={i} text={m.text} />
            : <UserBubble key={i} text={m.text} />
        )}
        
        {/* Interim voice transcript bubble */}
        {activeMode === "voice" && transcript && !loading && (
           <div className="flex justify-end animate-slide-up opacity-70">
             <div className="bubble-user whitespace-pre-wrap">{transcript}</div>
           </div>
        )}
        
        {loading && <TypingIndicator />}
        {error && (
          <div className="text-red-400 text-xs text-center py-2 glass p-3 animate-fade-in">
            ⚠ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-white/[0.08]">
        {activeMode === "text" ? (
          <>
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                id="interview-input"
                className="input-field flex-1"
                rows={1}
                placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading || done}
              />
              <button
                id="interview-send-btn"
                onClick={() => handleSend()}
                disabled={loading || done || !input.trim()}
                className="btn-primary flex-shrink-0 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Send
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-2 text-center">
              This interview is powered by AI · Responses are assessed in real-time
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
             <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
               voiceState === 'listening' ? 'bg-emerald-500/20 text-emerald-400 animate-pulse-slow' :
               voiceState === 'speaking' ? 'bg-brand-500/20 text-brand-400' :
               voiceState === 'confirming_skip' ? 'bg-amber-500/20 text-amber-400' :
               'bg-gray-800 text-gray-500'
             }`}>
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
               </svg>
             </div>
             
             <p className={`mt-3 text-sm font-medium ${
               voiceState === 'listening' ? 'text-emerald-400' :
               voiceState === 'speaking' ? 'text-brand-400' :
               voiceState === 'confirming_skip' ? 'text-amber-400' :
               'text-gray-500'
             }`}>
               {voiceState === 'listening' ? 'Listening...' :
                voiceState === 'speaking' ? 'Agent is speaking...' :
                voiceState === 'confirming_skip' ? 'Waiting for your decision...' :
                'Processing...'}
             </p>
             
             {transcript && voiceState === 'listening' && (
                <button onClick={forceSubmit} className="mt-4 text-xs text-gray-400 hover:text-white underline">
                   Send now
                </button>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
