"""
main.py — FastAPI app exposing endpoints for MAESTER AI Interview Agent.
"""

import os
import uuid
from pathlib import Path
from dotenv import load_dotenv

_HERE = Path(__file__).parent
for _env_file in [_HERE / ".env", _HERE / ".env.example"]:
    if _env_file.exists():
        load_dotenv(_env_file, override=True)
        break

import pypdf
import llm as llm_module
from fastapi import FastAPI, HTTPException, Request, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from session import InterviewSession, Turn

RATE_LIMIT = os.environ.get("RATE_LIMIT", "20/minute")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="MAESTER AI Interview Agent", version="1.0.0")
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

_sessions: dict[str, InterviewSession] = {}

class InterviewRequest(BaseModel):
    sessionId: str = Field(..., max_length=128)
    message: str | None = Field(None, max_length=2000)

class FeedbackResponse(BaseModel):
    summary: str
    strong_sections: list[str]
    weak_sections: list[str]
    areas_to_improve: list[str]

class InterviewResponse(BaseModel):
    reply: str
    done: bool
    feedback: FeedbackResponse | None = None

@app.post("/api/init-interview")
async def init_interview(
    request: Request,
    resume: UploadFile = File(...),
    role: str = Form(...),
    name: str = Form(...)
):
    try:
        pdf_reader = pypdf.PdfReader(resume.file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        # generate 10 questions
        questions = await llm_module.generate_questions(text, role)
        if len(questions) < 10:
            # fill with generic if parsing failed
            for i in range(len(questions), 10):
                questions.append(f"Could you elaborate more on your experience as a {role}?")
                
        session_id = str(uuid.uuid4())
        _sessions[session_id] = InterviewSession(
            session_id=session_id,
            candidate_name=name,
            role=role,
            questions=questions
        )
        return {"sessionId": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/interview", response_model=InterviewResponse)
@limiter.limit(RATE_LIMIT)
async def interview_step(request: Request, payload: InterviewRequest):
    session = _sessions.get(payload.sessionId)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.is_done:
        feedback = await _safe_generate_feedback(session)
        return InterviewResponse(reply="Interview complete.", done=True, feedback=feedback)

    # First turn logic: user just said "ready", ask first question
    if len(session.transcript) == 0:
        q = session.current_question
        session.transcript.append(Turn(question_index=session.plan_index, question=q))
        return InterviewResponse(reply=q, done=False)

    # User answered a question
    last_turn = session.transcript[-1]
    last_turn.answer = payload.message or "I don't know."
    
    judgment = await llm_module.judge_answer(last_turn.question, last_turn.answer)
    last_turn.judgment = judgment
    
    # Decide next step based on judgment
    reply, done = await _decide_next_reply(session, judgment)
    
    if done:
        feedback = await _safe_generate_feedback(session)
        return InterviewResponse(reply=reply, done=True, feedback=feedback)
    else:
        return InterviewResponse(reply=reply, done=False)

async def _decide_next_reply(session: InterviewSession, judgment: dict) -> tuple[str, bool]:
    # follow-ups only allowed if session.plan_index < 3
    
    completeness = judgment.get("completeness", "partial")
    quality = judgment.get("quality", "shallow")
    
    can_followup = (session.plan_index < 3)
    
    if can_followup:
        if session.followups_this_topic >= 2:
            session.advance_topic()
            return await _ask_next_question(session)
            
        if completeness == "missing":
            if session.missing_retries_this_topic >= 1:
                session.advance_topic()
                return await _ask_next_question(session)
            session.missing_retries_this_topic += 1
            session.followups_this_topic += 1
            reply = await llm_module.generate_followup(
                question=session.current_question,
                answer=session.transcript[-1].answer,
                reasoning="The candidate did not attempt to answer. Ask them to give it a try."
            )
            return reply, False
            
        if quality == "off_topic":
            if session.off_topic_redirects_this_topic >= 1:
                session.advance_topic()
                return await _ask_next_question(session)
            session.off_topic_redirects_this_topic += 1
            session.followups_this_topic += 1
            reply = await llm_module.generate_followup(
                question=session.current_question,
                answer=session.transcript[-1].answer,
                reasoning="The candidate went off topic. Redirect them."
            )
            return reply, False
            
        if completeness == "partial" or quality == "confused":
            session.followups_this_topic += 1
            reply = await llm_module.generate_followup(
                question=session.current_question,
                answer=session.transcript[-1].answer,
                reasoning="The candidate gave a partial or confused answer. Reframe simpler."
            )
            return reply, False
            
        if quality == "shallow":
            session.followups_this_topic += 1
            reply = await llm_module.generate_followup(
                question=session.current_question,
                answer=session.transcript[-1].answer,
                reasoning="The answer was shallow. Probe deeper."
            )
            return reply, False
            
    # if can_followup is False, or quality == strong, just advance
    session.advance_topic()
    return await _ask_next_question(session)

async def _ask_next_question(session: InterviewSession) -> tuple[str, bool]:
    if session.is_done:
        return "Thank you — that covers everything I had for you today. I'm now preparing your feedback.", True
        
    q = session.current_question
    session.transcript.append(Turn(question_index=session.plan_index, question=q))
    return q, False

def _build_judgment_log(session: InterviewSession) -> list[dict]:
    return [
        {
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
        return {
            "summary": "The interview concluded, but feedback generation failed.",
            "strong_sections": ["N/A"],
            "weak_sections": ["N/A"],
            "areas_to_improve": ["N/A"],
        }
