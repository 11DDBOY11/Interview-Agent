/**
 * storage.ts — localStorage persistence for interview sessions.
 * Saves messages, questions, feedback, and session metadata so that
 * refreshing the page does not lose interview progress.
 */

const STORAGE_KEY = "maester_interview_session";
const OWNER_KEY = "maester_owner_token";

export interface StoredQuestion {
  question: string;
  answer: string | null;
  judgment: {
    completeness: string;
    quality: string;
    reasoning: string;
  } | null;
}

export interface StoredSession {
  sessionId: string;
  candidateName: string;
  role: string;
  messages: { role: "ai" | "user"; text: string }[];
  questions: StoredQuestion[];
  feedback: unknown | null;
  done: boolean;
  savedAt: number;
}

export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.error("Failed to save session to localStorage:", e);
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear session from localStorage:", e);
  }
}

// ── Owner-only reset ──────────────────────────────────────────────────────────

const OWNER_SECRET = "MAESTER_OWNER_2026";

export function isOwner(): boolean {
  try {
    return localStorage.getItem(OWNER_KEY) === OWNER_SECRET;
  } catch {
    return false;
  }
}

export function unlockOwner(password: string): boolean {
  if (password === OWNER_SECRET) {
    try {
      localStorage.setItem(OWNER_KEY, OWNER_SECRET);
    } catch {}
    return true;
  }
  return false;
}

export function lockOwner(): void {
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {}
}
