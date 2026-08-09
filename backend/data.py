"""
data.py — loads curriculum and candidates at startup into plain dicts.
"""
import json
import os
from pathlib import Path

# Resolve paths relative to this file's location (backend/) → parent (ABtalks/)
_ROOT = Path(__file__).parent.parent

def _load_json(filename: str) -> dict:
    path = _ROOT / filename
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ── Curriculum ──────────────────────────────────────────────────────────────
_curriculum_raw = _load_json("curriculum (2).json")

# Flat lookup: day_number → day dict (includes title, type, tools, objectives)
CURRICULUM: dict[int, dict] = {
    day["day"]: day for day in _curriculum_raw["days"]
}

SETUP_DAYS: set[int] = {
    day["day"] for day in _curriculum_raw["days"] if day["type"] == "SETUP"
}

# ── Candidates ───────────────────────────────────────────────────────────────
_candidates_raw = _load_json("candidates.json")

# Lookup by member id
CANDIDATES: dict[str, dict] = {
    c["member"]["id"]: c for c in _candidates_raw["candidates"]
}
