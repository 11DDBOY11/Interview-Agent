export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export interface Feedback {
  summary: string;
  strong_sections: string[];
  weak_sections: string[];
  areas_to_improve: string[];
  strengths?: string[];
  gaps?: string[];
  next?: string[];
  questions_answered?: number;
  total_questions?: number;
  completion_rate?: string;
  score?: number;
}

export interface InterviewResponse {
  reply: string;
  done: boolean;
  feedback?: Feedback;
}

export async function startInterview(
  sessionId: string,
  candidate: object
): Promise<InterviewResponse> {
  const res = await fetch(`${API_BASE}/api/interview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, candidate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Server error on Turn 1");
  }
  return res.json();
}

export async function sendMessage(
  sessionId: string,
  message: string,
  action?: string
): Promise<InterviewResponse> {
  const res = await fetch(`${API_BASE}/api/interview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message, action }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Server error on message turn");
  }
  return res.json();
}

export async function finishInterview(sessionId: string): Promise<InterviewResponse> {
  return sendMessage(sessionId, "__END_INTERVIEW__", "finish");
}
