"""
llm.py — All Groq API calls (async version).

Uses AsyncGroq so the event loop is never blocked inside FastAPI.
Structured outputs (json_schema) used for judgment + feedback.
tenacity retry wraps every call for free-tier rate-limit resilience.
"""
from __future__ import annotations

import json
import logging
import os

from groq import AsyncGroq, RateLimitError, Timeout, APIConnectionError
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from prompts import (
    OPENING_SYSTEM, OPENING_USER,
    QUESTION_GENERATOR_SYSTEM, QUESTION_GENERATOR_USER,
    JUDGMENT_CLASSIFIER_SYSTEM, JUDGMENT_CLASSIFIER_USER,
    FOLLOWUP_GENERATOR_SYSTEM, FOLLOWUP_GENERATOR_USER,
    FEEDBACK_SYNTHESIZER_SYSTEM, FEEDBACK_SYNTHESIZER_USER,
)

logger = logging.getLogger(__name__)

MODEL = "openai/gpt-oss-120b"
_client: AsyncGroq | None = None


def _get_client() -> AsyncGroq:
    """Lazy AsyncGroq client — created after load_dotenv() runs."""
    global _client
    if _client is None:
        _client = AsyncGroq(
            api_key=os.environ["GROQ_API_KEY"],
            timeout=Timeout(120.0, connect=30.0),
        )
    return _client


# ── JSON schemas for structured output ───────────────────────────────────────

_JUDGMENT_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "judgment",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "completeness": {"type": "string", "enum": ["full", "partial", "missing"]},
                "quality": {"type": "string", "enum": ["strong", "shallow", "confused", "off_topic"]},
                "reasoning": {"type": "string"},
            },
            "required": ["completeness", "quality", "reasoning"],
            "additionalProperties": False,
        },
    },
}

_FEEDBACK_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "feedback",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "strengths": {"type": "array", "items": {"type": "string"}},
                "gaps": {"type": "array", "items": {"type": "string"}},
                "next": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["summary", "strengths", "gaps", "next"],
            "additionalProperties": False,
        },
    },
}


# ── Retry decorator ──────────────────────────────────────────────────────────

def _make_retry():
    return retry(
        retry=retry_if_exception_type((RateLimitError, Timeout, APIConnectionError)),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        stop=stop_after_attempt(5),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )


# ── Low-level helpers ─────────────────────────────────────────────────────────

async def _call(system: str, user: str, max_tokens: int = 512) -> str:
    """Async plain-text Groq call."""
    @_make_retry()
    async def _inner():
        resp = await _get_client().chat.completions.create(
            model=MODEL,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return resp.choices[0].message.content.strip()
    return await _inner()


async def _call_json(system: str, user: str, schema: dict, max_tokens: int = 512) -> dict:
    """Async structured-output Groq call."""
    @_make_retry()
    async def _inner():
        resp = await _get_client().chat.completions.create(
            model=MODEL,
            max_tokens=max_tokens,
            response_format=schema,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        raw = resp.choices[0].message.content.strip()
        return json.loads(raw)
    return await _inner()


# ── Public API ────────────────────────────────────────────────────────────────

async def generate_opening(candidate: dict) -> str:
    member = candidate["member"]
    plan_days = candidate.get("_plan_titles", [])
    user = OPENING_USER.format(
        name=member["name"].split()[0],
        job_role=member["jobRole"],
        topic_list=", ".join(plan_days),
    )
    return await _call(OPENING_SYSTEM, user, max_tokens=256)


async def generate_question(
    day: dict,
    candidate: dict,
    reason: str,
    confidence: float,
) -> str:
    member = candidate["member"]
    objectives_text = "\n".join(f"- {o}" for o in day.get("objectives", []))
    user = QUESTION_GENERATOR_USER.format(
        day=day["day"],
        title=day["title"],
        objectives=objectives_text,
        job_role=member["jobRole"],
        years_experience=member.get("yearsExperience", 0),
        selection_reason=reason,
        confidence_level=f"{confidence:.2f}",
    )
    return await _call(QUESTION_GENERATOR_SYSTEM, user, max_tokens=256)


async def judge_answer(day: dict, question: str, answer: str) -> dict:
    objectives_text = "\n".join(f"- {o}" for o in day.get("objectives", []))
    user = JUDGMENT_CLASSIFIER_USER.format(
        objectives=objectives_text,
        question=question,
        answer=answer,
    )
    result = await _call_json(JUDGMENT_CLASSIFIER_SYSTEM, user, schema=_JUDGMENT_SCHEMA, max_tokens=1024)
    return {
        "completeness": result["completeness"],
        "quality": result["quality"],
        "reasoning": result["reasoning"],
        "day": day["day"],
        "day_title": day["title"],
    }


async def generate_followup(
    situation: str,
    original_question: str,
    answer: str,
    day: dict,
    job_role: str,
) -> str:
    objectives_text = "\n".join(f"- {o}" for o in day.get("objectives", []))
    user = FOLLOWUP_GENERATOR_USER.format(
        situation=situation,
        original_question=original_question,
        answer=answer,
        objectives=objectives_text,
        job_role=job_role,
    )
    return await _call(FOLLOWUP_GENERATOR_SYSTEM, user, max_tokens=256)


async def generate_feedback(judgment_log: list[dict]) -> dict:
    log_text = json.dumps(judgment_log, indent=2)
    user = FEEDBACK_SYNTHESIZER_USER.format(judgment_log=log_text)
    result = await _call_json(FEEDBACK_SYNTHESIZER_SYSTEM, user, schema=_FEEDBACK_SCHEMA, max_tokens=2048)
    return {
        "summary": result["summary"],
        "strengths": result["strengths"],
        "gaps": result["gaps"],
        "next": result["next"],
    }
