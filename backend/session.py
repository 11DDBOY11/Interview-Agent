"""
session.py — InterviewSession and Turn dataclasses.
"""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class Turn:
    day: int
    question: str
    answer: str | None = None
    # {completeness: "full"|"partial"|"missing", quality: "strong"|"shallow"|"confused"|"off_topic", reasoning: str}
    judgment: dict | None = None


@dataclass
class InterviewSession:
    session_id: str
    candidate: dict                       # raw candidate object, kept as-is
    question_plan: list[dict]             # ordered list of curriculum day dicts
    plan_index: int = 0
    transcript: list[Turn] = field(default_factory=list)
    followups_this_topic: int = 0
    topics_covered: set[int] = field(default_factory=set)
    questions_asked: int = 0
    # Track "missing" retries separately (cap at 1 per topic)
    missing_retries_this_topic: int = 0
    # Track off-topic redirects (cap at 1 per topic)
    off_topic_redirects_this_topic: int = 0

    @property
    def current_day(self) -> dict | None:
        """Return the curriculum day dict currently being probed."""
        if self.plan_index < len(self.question_plan):
            return self.question_plan[self.plan_index]
        return None

    @property
    def is_done(self) -> bool:
        return self.questions_asked >= 8 and len(self.topics_covered) >= 4

    def advance_topic(self) -> None:
        """Move to the next plan entry and reset per-topic counters."""
        if self.current_day:
            self.topics_covered.add(self.current_day["day"])
        self.plan_index += 1
        self.followups_this_topic = 0
        self.missing_retries_this_topic = 0
        self.off_topic_redirects_this_topic = 0
