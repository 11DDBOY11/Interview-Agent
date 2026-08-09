import sys, os
os.environ['GROQ_API_KEY'] = 'dummy-for-import-test'

sys.path.insert(0, '.')
import data
print(f"[data] curriculum days loaded: {len(data.CURRICULUM)}")
print(f"[data] SETUP days: {sorted(data.SETUP_DAYS)}")
print(f"[data] candidates loaded: {len(data.CANDIDATES)}")

from session import InterviewSession, Turn
from planner import build_question_plan, selection_reason, confidence_ratio

# Test planner against CAND-001 (Sarah Johnson — confident, one skip)
cand = data.CANDIDATES['CAND-001']
plan = build_question_plan(cand)
print(f"\n[planner] CAND-001 (Sarah Johnson) plan — {len(plan)} days:")
for p in plan:
    m = p['_mission']
    tag = "FAILED" if not m.get('passed', True) and not m.get('skipped') else ("SKIP" if m.get('skipped') else f"ok/{m.get('attempts',1)}att")
    print(f"  Day {p['day']:2d} | {p['type']:10s} | {tag:8s} | {p['title']}")

# Test CAND-010 (Gerald — 3 passed:false, should be first)
cand10 = data.CANDIDATES['CAND-010']
plan10 = build_question_plan(cand10)
print(f"\n[planner] CAND-010 (Gerald Combs) plan — {len(plan10)} days:")
for p in plan10:
    m = p['_mission']
    tag = "FAILED" if not m.get('passed', True) and not m.get('skipped') else ("SKIP" if m.get('skipped') else f"ok/{m.get('attempts',1)}att")
    print(f"  Day {p['day']:2d} | {p['type']:10s} | {tag:8s} | {p['title']}")

# Test CAND-015 (Noah Kim — day 1 is SETUP, days 14+15 are LEARN/SHIP_IT skipped)
cand15 = data.CANDIDATES['CAND-015']
plan15 = build_question_plan(cand15)
print(f"\n[planner] CAND-015 (Noah Kim, Principal Architect) plan — {len(plan15)} days:")
for p in plan15:
    m = p['_mission']
    tag = "SKIP" if m.get('skipped') else f"ok/{m.get('attempts',1)}att"
    print(f"  Day {p['day']:2d} | {p['type']:10s} | {tag:8s} | {p['title']}")
assert all(p['day'] != 1 for p in plan15), "FAIL: Day 1 (SETUP) should be excluded!"
print("  >> Day 1 correctly excluded from plan")

# Test confidence_ratio
cr = confidence_ratio(cand10)
print(f"\n[planner] CAND-010 confidence_ratio: {cr:.2f} (expect ~0.04)")

import prompts
print("\n[prompts] all templates loaded OK")

import llm
print("[llm] module imported OK")

print("\n=== ALL IMPORTS OK ===")
