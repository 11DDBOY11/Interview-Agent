export const API_BASE = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE) {
  throw new Error("CRITICAL: VITE_API_BASE_URL is missing. You must set this environment variable (e.g. in Vercel) and redeploy.");
}

export interface Feedback {
  summary: string;
  strong_sections: string[];
  weak_sections: string[];
  areas_to_improve: string[];
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
  message: string
): Promise<InterviewResponse> {
  const res = await fetch(`${API_BASE}/api/interview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Server error on message turn");
  }
  return res.json();
}
