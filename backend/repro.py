import requests
import json
import time

BASE = "http://127.0.0.1:8000"
import uuid
SESSION_ID = "bug-repro-" + uuid.uuid4().hex

from data import CANDIDATES

def post(payload: dict) -> dict:
    print(f"\nSending payload: {json.dumps(payload, indent=2)[:200]}...")
    r = requests.post(f"{BASE}/api/interview", json=payload, timeout=60)
    print(f"Status Code: {r.status_code}")
    if not r.ok:
        print(f"Error Response: {r.text}")
    r.raise_for_status()
    resp = r.json()
    return resp

cand = CANDIDATES["CAND-001"]

print("=== STEP 1: Init ===")
post({"sessionId": SESSION_ID, "candidate": cand})

time.sleep(1)
print("\n=== STEP 2: Off-topic 1 ===")
post({"sessionId": SESSION_ID, "message": "I really like temperature settings in my house."})

time.sleep(1)
print("\n=== STEP 3: Off-topic 2 (should advance) ===")
post({"sessionId": SESSION_ID, "message": "The temperature is 72 degrees."})

time.sleep(1)
print("\n=== STEP 4: Off-topic 3 (should crash according to user) ===")
post({"sessionId": SESSION_ID, "message": "My thermostat is broken."})

print("\nDONE!")
