import { useEffect, useRef, useState, useCallback } from "react";
import type { Message } from "../components/InterviewChat";

export type VoiceState = "idle" | "speaking" | "listening" | "processing" | "confirming_skip";

const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

interface UseVoiceRecognitionOptions {
  messages: Message[];
  loading: boolean;
  done: boolean;
  onSend: (text: string) => void;
  onFallbackToText: () => void;
}

export function useVoiceRecognition({
  messages,
  loading,
  done,
  onSend,
  onFallbackToText
}: UseVoiceRecognitionOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);
  
  const accumulatedTranscript = useRef("");
  const lastSpeechTimestamp = useRef<number>(Date.now());
  const silenceStrikes = useRef<number>(0);
  const silenceIntervalRef = useRef<number | null>(null);
  
  // Use a ref to access latest state inside callbacks without stale closures
  const stateRef = useRef({ voiceState, loading, done });
  stateRef.current = { voiceState, loading, done };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // Prevent auto-restart loop during manual stop
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  const initRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return null;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    
    rec.onresult = (event: any) => {
      lastSpeechTimestamp.current = Date.now();
      
      let interim = "";
      let finalPiece = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalPiece += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      
      if (finalPiece) {
        accumulatedTranscript.current += " " + finalPiece;
      }
      
      setTranscript((accumulatedTranscript.current + " " + interim).trim());
    };
    
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        stopListening();
        onFallbackToText();
      }
    };
    
    return rec;
  }, [onFallbackToText, stopListening]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
       recognitionRef.current = initRecognition();
    }
    if (recognitionRef.current) {
       recognitionRef.current.onend = () => {
         // Auto restart if it stops unexpectedly while we still want to listen
         if (stateRef.current.voiceState === "listening" || stateRef.current.voiceState === "confirming_skip") {
            try { recognitionRef.current?.start(); } catch {}
         }
       };
       try { recognitionRef.current.start(); } catch {}
    }
  }, [initRecognition]);

  const submitAnswer = useCallback((text: string) => {
    stopListening();
    setVoiceState("processing");
    accumulatedTranscript.current = "";
    setTranscript("");
    silenceStrikes.current = 0;
    synthRef.current.cancel();
    onSend(text.trim());
  }, [onSend, stopListening]);

  const speakText = useCallback((text: string, isAiMessage = true) => {
    stopListening();
    setVoiceState("speaking");
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      if (stateRef.current.done) {
        setVoiceState("idle");
        return;
      }
      if (isAiMessage) {
         accumulatedTranscript.current = "";
         setTranscript("");
         silenceStrikes.current = 0;
      }
      lastSpeechTimestamp.current = Date.now();
      
      if (silenceStrikes.current === 2) {
         setVoiceState("confirming_skip");
      } else {
         setVoiceState("listening");
      }
      startListening();
    };
    
    // In case of TTS error (e.g. user interacting with UI blocking TTS), we still need to proceed
    utterance.onerror = () => utterance.onend && (utterance.onend as any)();
    
    synthRef.current.speak(utterance);
  }, [startListening, stopListening]);

  const processSkipDecision = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const wantsToTry = ["no", "let me try", "continue"].some(word => lower.includes(word));

    if (wantsToTry) {
      silenceStrikes.current = 0;
      lastSpeechTimestamp.current = Date.now();
      accumulatedTranscript.current = "";
      setTranscript("");
      setVoiceState("listening");
      startListening();
    } else {
      // Default to skip on explicit skip, or if unrecognized/silent after strike 2
      submitAnswer(text || "Let's skip this question."); 
    }
  }, [startListening, submitAnswer]);

  const checkSilence = useCallback(() => {
    const vs = stateRef.current.voiceState;
    if (vs !== "listening" && vs !== "confirming_skip") return;
    if (stateRef.current.loading || stateRef.current.done) return;

    const now = Date.now();
    const silenceDuration = now - lastSpeechTimestamp.current;

    // Wait 7 seconds for silence detection per user request
    if (silenceDuration > 7000) {
      const currentText = accumulatedTranscript.current.trim();
      
      if (vs === "confirming_skip") {
        if (currentText) {
          processSkipDecision(currentText);
        } else {
          processSkipDecision("skip");
        }
        return;
      }

      if (currentText.length > 0) {
        // They spoke something and naturally paused for 7s. Auto-submit.
        submitAnswer(currentText);
      } else {
        // Complete silence.
        silenceStrikes.current += 1;
        
        if (silenceStrikes.current === 1) {
          speakText("I didn't catch that — could you try answering?", false);
        } else if (silenceStrikes.current === 2) {
          speakText("You're not answering this question — should we move on, or do you want to keep trying?", false);
        }
      }
    }
  }, [processSkipDecision, speakText, submitAnswer]);

  // Track the text of the last spoken message to survive Strict Mode remounts
  const lastSpokenText = useRef<string>("");

  // Effect to read AI messages
  useEffect(() => {
    if (done) return;
    const lastMsg = messages[messages.length - 1];
    
    // Check against message text instead of index so if Strict Mode cancels the utterance,
    // we can still attempt it or we ensure it actually fires.
    // Actually, to fix Strict Mode cancellation, we can use a small timeout to let the mount settle.
    if (lastMsg && lastMsg.role === "ai" && lastMsg.text !== lastSpokenText.current) {
      lastSpokenText.current = lastMsg.text;
      const timer = setTimeout(() => {
        speakText(lastMsg.text, true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages, done, speakText]);

  // Effect for processing state
  useEffect(() => {
    if (loading) {
      setVoiceState("processing");
      stopListening();
    }
  }, [loading, stopListening]);

  // Effect for silence detection interval
  useEffect(() => {
    silenceIntervalRef.current = window.setInterval(checkSilence, 1000);
    return () => {
      if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
    };
  }, [checkSilence]);

  // Cleanup on unmount
  useEffect(() => {
    const synth = synthRef.current;
    return () => {
      stopListening();
      synth.cancel();
      lastSpokenText.current = ""; // Clear to allow Strict Mode remounts to re-trigger
    };
  }, [stopListening]);

  return {
    voiceState,
    transcript: transcript || accumulatedTranscript.current,
    forceSubmit: () => submitAnswer(accumulatedTranscript.current + " " + transcript)
  };
}
