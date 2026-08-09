"""
main.py — FastAPI app exposing POST /api/interview.

⚠️  SINGLE-WORKER CONSTRAINT
Sessions are stored in `_sessions`, a plain in-process Python dict.
This state is NOT shared across OS processes.
Always run with a single Uvicorn worker:
    uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1

If you need multiple workers, persist sessions to a shared store (e.g. SQLite)
before removing the --workers 1 flag — otherwise Turn 1 and Turn 2 can land on
different workers and the interview breaks silently.

Env: requires GROQ_API_KEY in .env or .env.example (see .env.example).
"""


import os
from pathlib import Path
from dotenv import load_dotenv

# Load from the directory this file lives in — works regardless of CWD
_HERE = Path(__file__).parent
for _env_file in [_HERE / ".env", _HERE / ".env.example"]:
    if _env_file.exists():
        load_dotenv(_env_file)
        break

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import llm as llm_module
from data import CURRICULUM
from planner import build_question_plan, selection_reason, confidence_ratio
from session import InterviewSession, Turn

RATE_LIMIT = os.environ.get("RATE_LIMIT", "20/minute")

# ── App ───────────────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="AI Interview Agent", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOW_ORIGINS = os.environ.get(
    "ALLOW_ORIGINS", 
    "http://localhost:5173,https://interview-agent-delta-roan.vercel.app"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory session store (single-worker only — see module docstring) ───────
_sessions: dict[str, InterviewSession] = {}


# ── Request / Response models ─────────────────────────────────────────────────
class MemberData(BaseModel):
    id: str
    name: str
    jobRole: str
    yearsExperience: int
    education: str | None = None
    status: str | None = None

class MissionData(BaseModel):
    day: int
    title: str | None = None
    passed: bool | None = None
    attempts: int | None = None
    skipped: bool | None = None

class CandidateSignals(BaseModel):
    commitDays: int | None = None
    missionsCompleted: int | None = None
    missionsFirstTry: int | None = None

class CandidateData(BaseModel):
    member: MemberData
    missions: list[MissionData]
    signals: CandidateSignals | None = None

class InterviewRequest(BaseModel):
    sessionId: str = Field(..., max_length=128)
    candidate: CandidateData | None = None   # present only on Turn 1
    message: str | None = Field(None, max_length=2000)      # present on Turn 2+


class FeedbackResponse(BaseModel):
    summary: str
    strengths: list[str]
    gaps: list[str]
    next: list[str]


class InterviewResponse(BaseModel):
    reply: str
    done: bool
    feedback: FeedbackResponse | None = None


# ── Adaptive flow logic ───────────────────────────────────────────────────────

async def _decide_next_reply(session: InterviewSession, judgment: dict) -> str:
    """
    Pure-Python decision engine — evaluation order (earlier conditions win):

    1. followups_this_topic >= 2  → force-advance (cap hit)
    2. completeness=missing       → gentle prompt (1 retry), then force-advance
    3. quality=off_topic          → one redirect, then force-advance
    4. completeness=partial | quality=confused  → reframe simpler
    5. quality=shallow + completeness=full      → depth follow-up
    6. quality=strong + completeness=full       → advance to next topic
    """
    day = session.current_day
    if day is None:
        return _close_interview()

    member = session.candidate["member"]
    job_role = member["jobRole"]
    last_turn = session.transcript[-1] if session.transcript else None
    question = last_turn.question if last_turn else ""
    answer = last_turn.answer if last_turn else ""

    completeness = judgment.get("completeness", "partial")
    quality = judgment.get("quality", "shallow")

    # 1. Cap check — always evaluated first
    if session.followups_this_topic >= 2:
        session.advance_topic()
        return await _ask_next_question(session)

    # 2. Missing answer
    if completeness == "missing":
        if session.missing_retries_this_topic >= 1:
            session.advance_topic()
            return await _ask_next_question(session)
        session.missing_retries_this_topic += 1
        session.followups_this_topic += 1
        return await llm_module.generate_followup(
            situation="The candidate did not attempt to answer the question. Politely but firmly ask them to give it a try, even if uncertain.",
            original_question=question,
            answer=answer,
            day=day,
            job_role=job_role,
        )

    # 3. Off-topic
    if quality == "off_topic":
        if session.off_topic_redirects_this_topic >= 1:
            session.advance_topic()
            return await _ask_next_question(session)
        session.off_topic_redirects_this_topic += 1
        session.followups_this_topic += 1
        return await llm_module.generate_followup(
            situation="The candidate went off-topic. Acknowledge briefly, then redirect them back to the actual question.",
            original_question=question,
            answer=answer,
            day=day,
            job_role=job_role,
        )

    # 4. Partial or confused — reframe simpler
    if completeness == "partial" or quality == "confused":
        session.followups_this_topic += 1
        return await llm_module.generate_followup(
            situation=(
                "The candidate gave a partial or confused answer. Reframe the question in simpler terms "
                "to help them demonstrate what they do know. Don't give away the answer."
            ),
            original_question=question,
            answer=answer,
            day=day,
            job_role=job_role,
        )

    # 5. Shallow but complete — probe deeper
    if quality == "shallow":
        session.followups_this_topic += 1
        return await llm_module.generate_followup(
            situation="The candidate gave a surface-level answer. Ask a follow-up that probes for deeper understanding, trade-offs, or a concrete example.",
            original_question=question,
            answer=answer,
            day=day,
            job_role=job_role,
        )

    # 6. Strong + full — advance
    session.advance_topic()
    return await _ask_next_question(session)


async def _ask_next_question(session: InterviewSession) -> str:
    """Generate a question for the current plan_index topic."""
    day = session.current_day
    if day is None:
        return _close_interview()

    mission = day.get("_mission", {})
    reason = selection_reason(mission)
    confidence = confidence_ratio(session.candidate)

    question = await llm_module.generate_question(day, session.candidate, reason, confidence)
    session.questions_asked += 1

    # Record the turn (answer filled in later)
    session.transcript.append(Turn(day=day["day"], question=question))
    return question


def _close_interview() -> str:
    return "Thank you — that covers everything I had for you today. I'm now preparing your feedback."


def _build_judgment_log(session: InterviewSession) -> list[dict]:
    return [
        {
            "day": t.day,
            "day_title": CURRICULUM.get(t.day, {}).get("title", f"Day {t.day}"),
            "question": t.question,
            "answer": t.answer,
            **(t.judgment or {"completeness": "missing", "quality": "missing", "reasoning": "no answer recorded"}),
        }
        for t in session.transcript
        if t.answer is not None
    ]


async def _safe_generate_feedback(session: InterviewSession) -> dict:
    judgment_log = _build_judgment_log(session)
    try:
        return await llm_module.generate_feedback(judgment_log)
    except Exception as e:
        print(f"FEEDBACK GENERATION FAILED: {e}")
        attempted = len(judgment_log)
        missing = sum(1 for entry in judgment_log if entry.get("judgment", {}).get("completeness") == "missing")
        off_topic = sum(1 for entry in judgment_log if entry.get("judgment", {}).get("quality") == "off_topic")
        
        return {
            "summary": f"The interview concluded after attempting {attempted} topics. A significant portion of the responses were missing or off-topic, making it difficult to fully assess technical proficiency.",
            "strengths": ["Demonstrated willingness to engage in the interview process."],
            "gaps": [
                f"{missing} questions were left unanswered.",
                f"{off_topic} responses were off-topic or misaligned with the questions."
            ],
            "next": [
                "Review the core concepts from the curriculum.",
                "Practice providing direct, relevant answers to technical questions."
            ]
        }


# ── Endpoint ──────────────────────────────────────────────────────────────────

@app.post("/api/interview", response_model=InterviewResponse)
@limiter.limit(RATE_LIMIT)
async def interview(request: Request, req: InterviewRequest):
    session_id = req.sessionId

    # ── Turn 1: initialise session ────────────────────────────────────────────
    if req.candidate is not None:
        if session_id in _sessions:
            raise HTTPException(400, f"Session {session_id!r} already exists.")

        candidate = req.candidate.model_dump()
        plan = build_question_plan(candidate)
        if not plan:
            raise HTTPException(422, "No eligible curriculum days found for this candidate.")

        candidate["_plan_titles"] = [d["title"] for d in plan]

        session = InterviewSession(
            session_id=session_id,
            candidate=candidate,
            question_plan=plan,
        )
        _sessions[session_id] = session

        opening = await llm_module.generate_opening(candidate)
        first_question = await _ask_next_question(session)
        reply = f"{opening}\n\n{first_question}"
        return InterviewResponse(reply=reply, done=False)

    # ── Turn 2+: process answer ───────────────────────────────────────────────
    if req.message is None:
        raise HTTPException(400, "Either 'candidate' (Turn 1) or 'message' (Turn 2+) must be provided.")

    session = _sessions.get(session_id)
    if session is None:
        raise HTTPException(404, f"Session {session_id!r} not found.")

    # Attach answer to the most recent unanswered turn
    if session.transcript and session.transcript[-1].answer is None:
        session.transcript[-1].answer = req.message

    try:
        # Judge the answer against current day
        day = session.current_day
        if day is None:
            feedback_data = await _safe_generate_feedback(session)
            return InterviewResponse(
                reply="Thank you — that concludes our interview. Here's your feedback.",
                done=True,
                feedback=FeedbackResponse(**feedback_data),
            )

        last_turn = session.transcript[-1]
        judgment = await llm_module.judge_answer(day, last_turn.question, last_turn.answer or "")
        last_turn.judgment = judgment

        # Hard stop check (in code, never delegated to LLM)
        if session.is_done:
            feedback_data = await _safe_generate_feedback(session)
            return InterviewResponse(
                reply="That completes the interview — well done working through all those topics. Your feedback is below.",
                done=True,
                feedback=FeedbackResponse(**feedback_data),
            )

        # Adaptive flow
        reply = await _decide_next_reply(session, judgment)
        return InterviewResponse(reply=reply, done=False)

    except Exception as e:
        # Global fallback for any unexpected errors (e.g. LLM crashes) during the interview
        print(f"CRITICAL FALLBACK TRIGGERED: {e}")
        session.advance_topic()
        try:
            fallback_question = await _ask_next_question(session)
            return InterviewResponse(
                reply="I ran into a slight processing issue on my end, but let's keep moving forward! " + fallback_question,
                done=False
            )
        except Exception as fallback_e:
            print(f"DOUBLE FAULT IN FALLBACK: {fallback_e}")
            return InterviewResponse(
                reply="I seem to be having technical difficulties. Let's wrap up here. Thank you for your time!",
                done=True
            )


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "sessions_active": len(_sessions)}
