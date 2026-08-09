"""
planner.py — Builds the question_plan for a session.

Rule: SETUP days are excluded FIRST (before sorting or capping),
so they can never consume a plan slot.
"""
from data import CURRICULUM, SETUP_DAYS

# Max curriculum days in the plan (ensures ≥8 questions with follow-ups)
PLAN_CAP = 7


def _mission_priority(mission: dict) -> int:
    """Lower number = higher priority."""
    if not mission.get("passed", True) and not mission.get("skipped", False):
        return 0  # passed: false — strongest probe
    if mission.get("skipped", False):
        return 1  # skipped — conceptual ask
    attempts = mission.get("attempts", 1)
    if attempts >= 3:
        return 2  # high-attempts passed — probe harder
    return 3  # low-attempts passed — quick confirmation


def build_question_plan(candidate: dict) -> list[dict]:
    """
    Returns an ordered list of curriculum day dicts for the interview.

    1. Filter out SETUP days entirely (before cap).
    2. Sort remaining missions by priority.
    3. Cap at PLAN_CAP entries.
    4. Map each mission day number to its full curriculum dict.
    """
    missions = candidate.get("missions", [])

    # Step 1: exclude SETUP days
    non_setup = [m for m in missions if m.get("day") not in SETUP_DAYS]

    # Step 2: sort by priority
    sorted_missions = sorted(non_setup, key=_mission_priority)

    # Step 3: cap
    capped = sorted_missions[:PLAN_CAP]

    # Step 4: enrich with full curriculum data (skip days not in curriculum)
    plan = []
    for mission in capped:
        day_num = mission.get("day")
        curriculum_day = CURRICULUM.get(day_num)
        if curriculum_day:
            # Attach the mission record so llm.py knows why this day was selected
            enriched = dict(curriculum_day)
            enriched["_mission"] = mission
            plan.append(enriched)

    return plan


def selection_reason(mission: dict) -> str:
    """Human-readable reason this day was selected — fed into question-gen prompt."""
    if not mission.get("passed", True) and not mission.get("skipped", False):
        return "failed — candidate attempted but did not pass this mission"
    if mission.get("skipped", False):
        return "skipped — candidate never attempted this topic"
    attempts = mission.get("attempts", 1)
    if attempts >= 3:
        return f"passed after {attempts} attempts — may have been shaky, probe for understanding"
    return f"passed on attempt {attempts} — confirmatory check, move on quickly if solid"


def confidence_ratio(candidate: dict) -> float:
    """Overall first-try ratio: 1.0 = very confident, <0.5 = struggled overall."""
    signals = candidate.get("signals", {})
    completed = signals.get("missionsCompleted", 1)
    first_try = signals.get("missionsFirstTry", 0)
    return first_try / max(completed, 1)
