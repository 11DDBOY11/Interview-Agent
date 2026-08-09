import requests
import json
import sys

BASE = "http://127.0.0.1:8000"
SESSION_ID = "api-contract-test-01"

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
        { "day": 10, "title": "Retrieval & Matching Engine", "passed": False, "attempts": 3 }
    ],
    "signals": { "commitDays": 22, "missionsCompleted": 23, "missionsFirstTry": 1 }
}

def post(payload: dict) -> dict:
    r = requests.post(f"{BASE}/api/interview", json=payload, timeout=60)
    r.raise_for_status()
    return r.json()

print("--- Testing Turn 1 ---")
resp1 = post({"sessionId": SESSION_ID, "candidate": CAND_010})
assert "reply" in resp1 and isinstance(resp1["reply"], str)
assert "done" in resp1 and resp1["done"] is False
assert "feedback" not in resp1 or resp1["feedback"] is None
print("Turn 1 OK")

print("--- Testing Middle Turn ---")
resp2 = post({"sessionId": SESSION_ID, "message": "Vector databases store embeddings."})
assert "reply" in resp2 and isinstance(resp2["reply"], str)
assert "done" in resp2 and resp2["done"] is False
assert "feedback" not in resp2 or resp2["feedback"] is None
print("Middle Turn OK")

print("--- Testing Final Turn (force finish) ---")
# Send two more to force advance since plan only has 1 item, so it finishes
post({"sessionId": SESSION_ID, "message": "I really don't know."})
resp3 = post({"sessionId": SESSION_ID, "message": "Just finish the interview."})

assert "reply" in resp3 and isinstance(resp3["reply"], str)
assert "done" in resp3 and resp3["done"] is True
assert "feedback" in resp3 and resp3["feedback"] is not None

feedback = resp3["feedback"]
assert "summary" in feedback and isinstance(feedback["summary"], str)
assert "strengths" in feedback and isinstance(feedback["strengths"], list)
assert "gaps" in feedback and isinstance(feedback["gaps"], list)
assert "next" in feedback and isinstance(feedback["next"], list)
# Check no extra keys
assert set(feedback.keys()) == {"summary", "strengths", "gaps", "next"}

print("Final Turn OK")
print("\nALL CONTRACTS COMPLIANT")
