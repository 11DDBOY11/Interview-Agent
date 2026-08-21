"""
session.py — InterviewSession and Turn dataclasses.
"""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class Turn:
    question_index: int
    question: str
    answer: str | None = None
    # {completeness: "full"|"partial"|"missing", quality: "strong"|"shallow"|"confused"|"off_topic", reasoning: str}
    judgment: dict | None = None


@dataclass
class InterviewSession:
    session_id: str
    candidate_name: str
    role: str
    questions: list[str]  # exactly 10 questions
    plan_index: int = 0
    transcript: list[Turn] = field(default_factory=list)
    followups_this_topic: int = 0
    # Track "missing" retries separately (cap at 1 per topic)
    missing_retries_this_topic: int = 0
    # Track off-topic redirects (cap at 1 per topic)
    off_topic_redirects_this_topic: int = 0

    @property
    def current_question(self) -> str | None:
        """Return the current base question."""
        if self.plan_index < len(self.questions):
            return self.questions[self.plan_index]
        return None

    @property
    def is_done(self) -> bool:
        return self.plan_index >= len(self.questions)

    def advance_topic(self) -> None:
        """Move to the next base question and reset per-topic counters."""
        self.plan_index += 1
        self.followups_this_topic = 0
        self.missing_retries_this_topic = 0
        self.off_topic_redirects_this_topic = 0
