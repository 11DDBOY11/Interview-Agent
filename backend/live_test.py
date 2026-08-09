"""
live_test.py — Fires a real multi-turn interview against the running server.
Tests CAND-010 (Gerald Combs): 3 failed missions, 2 skips, low confidence.
Runs Turn 1 (init) + 4 answer turns, printing each reply.
"""
import requests
import json
import time

BASE = "http://127.0.0.1:8000"
SESSION_ID = "live-test-gerald-001"

CAND_010 = {
    "member": {
        "id": "CAND-010",
        "name": "Gerald Combs",
        "jobRole": "IT Support Specialist",
        "yearsExperience": 20,
        "education": "AAS Information Technology",
        "status": "COMPLETED"
    },
    "missions": [
        { "day": 1,  "title": "VS Code & Python Environment Setup",    "passed": True,  "attempts": 2 },
        { "day": 7,  "title": "Embeddings Explained",                   "passed": True,  "attempts": 5 },
        { "day": 8,  "title": "Vector Databases Overview",              "passed": False, "attempts": 4 },
        { "day": 10, "title": "Retrieval & Matching Engine",            "passed": False, "attempts": 3 },
        { "day": 12, "title": "Prompt Engineering Fundamentals",        "passed": True,  "attempts": 5 },
        { "day": 16, "title": "Chatbot Backend & API Integration",      "passed": True,  "attempts": 4 },
        { "day": 22, "title": "Multi-Agent Orchestration",              "passed": False, "attempts": 3 },
        { "day": 27, "title": "Security, Privacy & Guardrails",         "skipped": True },
        { "day": 28, "title": "Docker & Kubernetes Deployment",         "skipped": True },
        { "day": 31, "title": "Capstone Project & Final Demo",          "passed": True,  "attempts": 3 }
    ],
    "signals": { "commitDays": 22, "missionsCompleted": 23, "missionsFirstTry": 1 }
}

def post(payload: dict) -> dict:
    r = requests.post(f"{BASE}/api/interview", json=payload, timeout=60)
    r.raise_for_status()
    return r.json()

def divider(label: str):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print('='*60)

# ── Turn 1: init ──────────────────────────────────────────────────────────────
divider("TURN 1 — Init session with candidate")
resp = post({"sessionId": SESSION_ID, "candidate": CAND_010})
print(f"done: {resp['done']}")
print(f"reply:\n{resp['reply']}")

# ── Turn 2: vague / shallow answer ───────────────────────────────────────────
time.sleep(2)
divider("TURN 2 — Shallow answer (expect follow-up)")
resp = post({"sessionId": SESSION_ID, "message": "Vector databases are just databases that store vectors instead of regular data."})
print(f"done: {resp['done']}")
print(f"reply:\n{resp['reply']}")

# ── Turn 3: better answer ─────────────────────────────────────────────────────
time.sleep(2)
divider("TURN 3 — Better answer (expect advance or one more probe)")
resp = post({
    "sessionId": SESSION_ID,
    "message": (
        "Vector databases store high-dimensional embeddings and use approximate nearest "
        "neighbor search — like Chroma or Pinecone — so you can find semantically similar "
        "documents without exact keyword matching. That's what makes RAG retrieval work."
    )
})
print(f"done: {resp['done']}")
print(f"reply:\n{resp['reply']}")

# ── Turn 4: off-topic answer to test redirect ─────────────────────────────────
time.sleep(2)
divider("TURN 4 — Off-topic answer (expect redirect)")
resp = post({"sessionId": SESSION_ID, "message": "I think this is mostly about networking and TCP/IP protocols."})
print(f"done: {resp['done']}")
print(f"reply:\n{resp['reply']}")

# ── Turn 5: missing / no answer ───────────────────────────────────────────────
time.sleep(2)
divider("TURN 5 — Missing answer (I don't know)")
resp = post({"sessionId": SESSION_ID, "message": "I don't know, I never got to this topic."})
print(f"done: {resp['done']}")
print(f"reply:\n{resp['reply']}")
if resp.get("done"):
    print("\n--- FEEDBACK ---")
    print(json.dumps(resp.get("feedback"), indent=2))

print("\n=== LIVE TEST COMPLETE ===")
