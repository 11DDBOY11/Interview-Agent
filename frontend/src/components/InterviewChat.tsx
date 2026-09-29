import { useEffect, useRef, useState, useCallback } from "react";
import { type Feedback, sendMessage, finishInterview, getSessionQuestions } from "../api";
import FeedbackPanel from "./FeedbackPanel";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";
import { saveSession, loadSession, type StoredQuestion } from "../storage";

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
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-[#d3e3fd] flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-[#1a73e8]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
        </svg>
      </div>
      <div className="bg-[#f1f3f4] rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#5f6368] animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 rounded-full bg-[#5f6368] animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 rounded-full bg-[#5f6368] animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

function AIBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-full bg-[#d3e3fd] flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-[#1a73e8]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
        </svg>
      </div>
      <div className="bg-[#f1f3f4] text-[#1f1f1f] rounded-2xl rounded-tl-md px-4 py-3 max-w-[78%] leading-relaxed text-sm">
        {text}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="flex justify-end animate-slide-up">
      <div className="bg-[#1a73e8] text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-[78%] leading-relaxed text-sm">
        {text}
      </div>
    </div>
  );
}

function buildBasicFeedback(questions: StoredQuestion[]): Feedback {
  const answered = questions.filter(q => q.answer && q.answer.trim());
  const total = questions.length || 10;
  const completion = Math.round((answered.length / Math.max(total, 1)) * 100);

  const strong: string[] = [];
  const weak: string[] = [];

  for (const q of answered) {
    if (q.judgment) {
      if (q.judgment.quality === "strong" && q.judgment.completeness === "full") {
        strong.push(q.question.substring(0, 80));
      } else if (q.judgment.quality === "confused" || q.judgment.quality === "off_topic" || q.judgment.completeness === "missing") {
        weak.push(q.question.substring(0, 80));
      }
    }
  }

  return {
    summary: `The candidate answered ${answered.length} of ${total} questions (${completion}% completion). ${strong.length > 0 ? `Demonstrated strength in ${strong.length} area(s).` : ""} ${weak.length > 0 ? `${weak.length} area(s) need further development.` : ""}`,
    strong_sections: strong.length > 0 ? strong : ["Demonstrated willingness to answer technical questions."],
    weak_sections: weak.length > 0 ? weak : ["Additional practice recommended."],
    areas_to_improve: ["Continue practicing explanations for core technical concepts."],
    questions_answered: answered.length,
    total_questions: total,
    completion_rate: `${answered.length}/${total} (${completion}%)`,
    score: completion,
  };
}

export default function InterviewChat({
  sessionId,
  initialReply,
  candidateName,
  mode: initialMode,
  onFinish,
  onRestart,
}: InterviewChatProps) {
  const savedSession = loadSession();
  const [messages, setMessages] = useState<Message[]>(() => {
    if (savedSession && savedSession.sessionId === sessionId && savedSession.messages.length > 0) {
      return savedSession.messages.map(m => ({ role: m.role as "ai" | "user", text: m.text }));
    }
    return [{ role: "ai" as const, text: initialReply }];
  });
  const [questions, setQuestions] = useState<StoredQuestion[]>(() => {
    if (savedSession && savedSession.sessionId === sessionId) {
      return savedSession.questions || [];
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(() => {
    if (savedSession && savedSession.sessionId === sessionId) {
      return savedSession.done;
    }
    return false;
  });
  const [feedback, setFeedback] = useState<Feedback | null>(() => {
    if (savedSession && savedSession.sessionId === sessionId && savedSession.feedback) {
      return savedSession.feedback as Feedback;
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"text" | "voice">(initialMode);
  const [showQuestions, setShowQuestions] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const persistState = useCallback((msgs: Message[], qs: StoredQuestion[], fb: Feedback | null, isDone: boolean) => {
    saveSession({
      sessionId,
      candidateName,
      role: "",
      messages: msgs.map(m => ({ role: m.role as "ai" | "user", text: m.text })),
      questions: qs,
      feedback: fb,
      done: isDone,
      savedAt: Date.now(),
    });
  }, [sessionId, candidateName]);

  // Fetch questions from backend when restoring a session
  useEffect(() => {
    if (savedSession && savedSession.sessionId === sessionId && savedSession.questions.length === 0) {
      getSessionQuestions(sessionId).then(data => {
        const qs: StoredQuestion[] = data.questions.map(q => ({
          question: q.question,
          answer: q.answer,
          judgment: q.judgment,
        }));
        setQuestions(qs);
      }).catch(() => {});
    }
  }, []);

  // Tab-switching guardrail
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !done) {
        alert("WARNING: Tab switching detected. This is a proctored interview. Please remain focused on this tab.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [done]);

  // PiP Camera Feed
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (!done) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(s => {
        activeStream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      }).catch(err => console.error("PiP video error", err));
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [done]);

  // Voice Mode hook setup
  const { voiceState, transcript, forceSubmit } = useVoiceRecognition({
    messages: activeMode === "voice" ? messages : [],
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
    if ((activeMode === "text" && !textToSend.trim()) || loading || done) return;

    const newMessages: Message[] = [...messages];
    if (textToSend.trim()) {
      newMessages.push({ role: "user" as const, text: textToSend.trim() });
    }
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const resp = await sendMessage(sessionId, textToSend.trim());
      const updatedMessages: Message[] = [...newMessages, { role: "ai" as const, text: resp.reply }];
      setMessages(updatedMessages);

      const newQuestions = [...questions];
      if (resp.reply && !resp.done) {
        newQuestions.push({
          question: resp.reply,
          answer: null,
          judgment: null,
        });
      }
      setQuestions(newQuestions);

      if (resp.done) {
        setDone(true);
        const fb = resp.feedback || buildBasicFeedback(newQuestions);
        setFeedback(fb);
        persistState(updatedMessages, newQuestions, fb, true);
        onFinish?.(fb);
      } else {
        persistState(updatedMessages, newQuestions, feedback, false);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      persistState(newMessages, questions, feedback, done);
    } finally {
      setLoading(false);
      if (activeMode === "text") {
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    }
  }

  async function handleFinishEarly() {
    if (loading || done) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await finishInterview(sessionId);
      const newMessages: Message[] = [...messages];
      if (resp.reply) {
        newMessages.push({ role: "ai" as const, text: resp.reply });
      }
      setMessages(newMessages);

      const fb = resp.feedback || buildBasicFeedback(questions);
      setDone(true);
      setFeedback(fb);
      persistState(newMessages, questions, fb, true);
      onFinish?.(fb);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate feedback.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Question History Panel
  if (showQuestions) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in h-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium text-[#1f1f1f]">Question History</h2>
          <button onClick={() => setShowQuestions(false)} className="text-[#1a73e8] text-sm font-medium hover:underline">
            Back to Interview
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {questions.length === 0 && (
            <div className="text-center py-12 text-[#5f6368]">
              <svg className="w-12 h-12 mx-auto mb-3 text-[#dadce0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p className="text-sm">No questions recorded yet.</p>
            </div>
          )}
          {questions.map((q, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#e8eaed] p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[#1a73e8] text-xs font-medium mt-0.5 bg-[#d3e3fd] px-2 py-0.5 rounded-full">Q{i + 1}</span>
                <p className="text-[#1f1f1f] text-sm leading-relaxed">{q.question}</p>
              </div>
              {q.answer && (
                <div className="ml-12 pl-3 border-l-2 border-[#e8eaed]">
                  <p className="text-[#5f6368] text-xs italic">{q.answer}</p>
                </div>
              )}
              {q.judgment && (
                <div className="ml-12 mt-2 flex gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    q.judgment.completeness === "full" ? "bg-[#ceead6] border-[#188038]/30 text-[#0d652d]" :
                    q.judgment.completeness === "partial" ? "bg-[#feefc3] border-[#f9ab00]/30 text-[#7d5800]" :
                    "bg-[#f9dedc] border-[#d93025]/30 text-[#d93025]"
                  }`}>{q.judgment.completeness}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    q.judgment.quality === "strong" ? "bg-[#ceead6] border-[#188038]/30 text-[#0d652d]" :
                    q.judgment.quality === "shallow" ? "bg-[#feefc3] border-[#f9ab00]/30 text-[#7d5800]" :
                    q.judgment.quality === "confused" ? "bg-[#feefc3] border-[#e8710a]/30 text-[#e8710a]" :
                    "bg-[#f9dedc] border-[#d93025]/30 text-[#d93025]"
                  }`}>{q.judgment.quality}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (done && feedback) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowQuestions(true)} className="text-[#1a73e8] text-sm font-medium hover:underline flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View Questions ({questions.length})
          </button>
        </div>
        <div className="bg-white rounded-xl border border-[#e8eaed] p-4">
          <p className="text-[#5f6368] text-sm italic">"{messages[messages.length - 1]?.text}"</p>
        </div>
        <FeedbackPanel feedback={feedback} candidateName={candidateName} onRestart={onRestart} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Floating Camera */}
      <div className="absolute top-4 right-4 z-50 w-32 h-24 bg-[#f1f3f4] rounded-xl overflow-hidden border border-[#e8eaed] shadow-md">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" />
        <div className="absolute top-2 right-2 flex items-center justify-center w-3 h-3 bg-[#d93025] rounded-full shadow-sm">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pr-36">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#188038] animate-pulse" />
          <span className="text-[#5f6368] text-sm border border-[#e8eaed] rounded-full px-3 py-1 bg-white">
            Interviewing <span className="text-[#1f1f1f] font-medium">{candidateName}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuestions(true)}
            className="px-4 py-2 rounded-full text-sm font-medium text-[#1a73e8] border border-[#dadce0] hover:bg-[#f8f9fa] transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Questions ({questions.length})
          </button>
          <button
            onClick={handleFinishEarly}
            disabled={loading}
            className="px-4 py-2 rounded-full text-sm font-medium bg-[#188038] text-white hover:bg-[#0d652d] transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Finish & Get Feedback
          </button>
          <button onClick={onRestart} className="p-2 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] transition-colors" title="Exit">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 pb-4">
        {messages.map((m, i) =>
          m.role === "ai"
            ? <AIBubble key={i} text={m.text} />
            : <UserBubble key={i} text={m.text} />
        )}
        {activeMode === "voice" && transcript && !loading && (
          <div className="flex justify-end animate-slide-up opacity-70">
            <div className="bg-[#1a73e8] text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-[78%] leading-relaxed text-sm">
              {transcript}
            </div>
          </div>
        )}
        {loading && <TypingIndicator />}
        {error && (
          <div className="text-[#d93025] text-sm text-center py-3 bg-[#f9dedc] rounded-xl border border-[#d93025]/20">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-[#e8eaed]">
        {activeMode === "text" ? (
          <>
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                className="flex-1 bg-white border border-[#dadce0] rounded-full px-5 py-3 text-[#1f1f1f] placeholder-[#9aa0a6] text-sm focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all resize-none"
                rows={1}
                placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading || done}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || done || !input.trim()}
                className="w-12 h-12 rounded-full bg-[#1a73e8] text-white flex items-center justify-center hover:bg-[#1765cc] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-[#9aa0a6] text-xs mt-2 text-center">
              This interview is powered by AI · Responses are assessed in real-time
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              voiceState === 'listening' ? 'bg-[#ceead6] text-[#188038]' :
              voiceState === 'speaking' ? 'bg-[#d3e3fd] text-[#1a73e8]' :
              voiceState === 'confirming_skip' ? 'bg-[#feefc3] text-[#f9ab00]' :
              'bg-[#f1f3f4] text-[#9aa0a6]'
            }`}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className={`mt-3 text-sm font-medium ${
              voiceState === 'listening' ? 'text-[#188038]' :
              voiceState === 'speaking' ? 'text-[#1a73e8]' :
              voiceState === 'confirming_skip' ? 'text-[#f9ab00]' :
              'text-[#9aa0a6]'
            }`}>
              {voiceState === 'listening' ? 'Listening...' :
               voiceState === 'speaking' ? 'Agent is speaking...' :
               voiceState === 'confirming_skip' ? 'Waiting for your decision...' :
               'Processing...'}
            </p>
            {transcript && voiceState === 'listening' && (
              <button onClick={forceSubmit} className="mt-4 text-xs text-[#5f6368] hover:text-[#1f1f1f] underline">
                Send now
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
