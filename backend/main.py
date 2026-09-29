"""
main.py — FastAPI app exposing endpoints for MAESTER AI Interview Agent.
"""

import os
import uuid
from pathlib import Path
from dotenv import load_dotenv

_HERE = Path(__file__).parent
_env_file = _HERE / ".env"
if _env_file.exists():
    load_dotenv(_env_file)

import pypdf
import llm as llm_module
from fastapi import FastAPI, HTTPException, Request, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from session import InterviewSession, Turn
from planner import build_question_plan

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
    candidate: dict | None = None
    action: str | None = None

class FeedbackResponse(BaseModel):
    summary: str
    strong_sections: list[str] = Field(default_factory=list)
    weak_sections: list[str] = Field(default_factory=list)
    areas_to_improve: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    next: list[str] = Field(default_factory=list)
    questions_answered: int | None = None
    total_questions: int | None = None
    completion_rate: str | None = None
    score: int | None = None

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

@app.get("/api/session/{session_id}/questions")
async def get_session_questions(session_id: str):
    """Return all questions asked during the interview session."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "questions": [
            {
                "question": t.question,
                "answer": t.answer,
                "judgment": t.judgment,
            }
            for t in session.transcript
        ],
        "total_questions": len(session.questions),
        "questions_answered": len([t for t in session.transcript if t.answer and t.answer.strip()]),
    }

@app.post("/api/interview", response_model=InterviewResponse)
@limiter.limit(RATE_LIMIT)
async def interview_step(request: Request, payload: InterviewRequest):
    # Support Turn 1 initialization via candidate object (API contract compatibility)
    if payload.candidate is not None:
        if payload.sessionId not in _sessions:
            member = payload.candidate.get("member", {})
            cand_name = member.get("name", "Candidate")
            role = member.get("jobRole", "Software Engineer")
            plan = build_question_plan(payload.candidate)
            questions = [
                f"Can you explain your approach and technical decisions regarding {p.get('title', 'this topic')}?"
                for p in plan
            ]
            if len(questions) == 0:
                questions = [
                    f"How do you design scalable applications in your role as a {role}?",
                    "Can you walk me through a challenging technical problem you solved recently?",
                    "How do you approach error handling and reliability in production systems?"
                ]
            session = InterviewSession(
                session_id=payload.sessionId,
                candidate_name=cand_name,
                role=role,
                questions=questions,
            )
            _sessions[payload.sessionId] = session
            q = session.current_question
            session.transcript.append(Turn(question_index=session.plan_index, question=q))
            return InterviewResponse(reply=f"Welcome {cand_name.split()[0]}. Let's begin your technical interview.\n\n{q}", done=False)
        else:
            session = _sessions[payload.sessionId]
            return InterviewResponse(reply=session.transcript[-1].question if session.transcript else "Ready.", done=False)

    session = _sessions.get(payload.sessionId)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.is_done:
        feedback = await _safe_generate_feedback(session)
        return InterviewResponse(reply="Interview complete.", done=True, feedback=feedback)

    # Check for early completion signals (e.g. user clicked Finish or typed end intent)
    raw_msg = (payload.message or "").strip()
    msg_lower = raw_msg.lower()
    end_signals = [
        "__end_interview__", "__finish__", "end interview", "finish interview",
        "end the interview", "finish the interview", "stop the interview",
        "stop interview", "conclude interview", "conclude the interview",
        "give me my feedback", "give me feedback",
        "i want feedback", "i'm done", "i am done", "done with the interview",
        "please end", "please finish", "wrap up",
        "can i get feedback", "can i get my feedback", "ready for feedback",
        "get feedback"
    ]
    is_finish = payload.action in ("finish", "end") or any(sig in msg_lower for sig in end_signals)

    if is_finish:
        # If user answered something meaningful along with the end signal, record it
        if session.transcript and session.transcript[-1].answer is None:
            is_pure_signal = any(raw_msg.lower() == s for s in ["__end_interview__", "__finish__", "end interview", "finish interview", "stop interview"])
            if raw_msg and not is_pure_signal:
                session.transcript[-1].answer = raw_msg
                judgment = await llm_module.judge_answer(session.transcript[-1].question, raw_msg)
                session.transcript[-1].judgment = judgment
            else:
                session.transcript[-1].answer = "Interview concluded by candidate."
                session.transcript[-1].judgment = {
                    "completeness": "missing",
                    "quality": "missing",
                    "reasoning": "Candidate concluded the interview at this question."
                }
        session.is_force_done = True
        feedback = await _safe_generate_feedback(session)
        return InterviewResponse(
            reply="Thank you for participating in the interview! I have generated your evaluation and personalized feedback below.",
            done=True,
            feedback=feedback,
        )

    # First turn logic: user just said "ready" / empty string on Turn 1
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
            session.transcript.append(Turn(question_index=session.plan_index, question=reply))
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
            session.transcript.append(Turn(question_index=session.plan_index, question=reply))
            return reply, False
            
        if completeness == "partial" or quality == "confused":
            session.followups_this_topic += 1
            reply = await llm_module.generate_followup(
                question=session.current_question,
                answer=session.transcript[-1].answer,
                reasoning="The candidate gave a partial or confused answer. Reframe simpler."
            )
            session.transcript.append(Turn(question_index=session.plan_index, question=reply))
            return reply, False
            
        if quality == "shallow":
            session.followups_this_topic += 1
            reply = await llm_module.generate_followup(
                question=session.current_question,
                answer=session.transcript[-1].answer,
                reasoning="The answer was shallow. Probe deeper."
            )
            session.transcript.append(Turn(question_index=session.plan_index, question=reply))
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
        if t.answer is not None and t.answer.strip()
    ]

async def _safe_generate_feedback(session: InterviewSession) -> dict:
    judgment_log = _build_judgment_log(session)
    
    # Identify valid substantive answers (excluding skips, blanks, and canned placeholders)
    skip_phrases = {
        "i don't know.", "i don't know", "skip", "pass", "no idea", "n/a",
        "interview concluded by candidate.", "__end_interview__", "__finish__"
    }
    valid_answers = [
        t for t in session.transcript
        if t.answer and t.answer.strip() and t.answer.strip().lower() not in skip_phrases
    ]
    
    questions_answered = len(valid_answers)
    total_questions = len(session.questions)
    completion_percent = round((questions_answered / max(total_questions, 1)) * 100)
    
    # Calculate performance score based on answer completeness and quality
    quality_scores = {
        "strong": 100,
        "shallow": 60,
        "confused": 35,
        "off_topic": 15,
        "missing": 0,
    }
    completeness_scores = {
        "full": 100,
        "partial": 55,
        "missing": 0,
    }
    
    if questions_answered == 0:
        score = 0
        return {
            "summary": f"The interview concluded with 0 of {total_questions} questions answered. No technical answers were recorded for evaluation. Please complete the questions to receive an assessment.",
            "strong_sections": ["Interview session initiated."],
            "weak_sections": ["No substantive responses recorded."],
            "areas_to_improve": ["Attempt each question with technical explanations and relevant project examples."],
            "strengths": ["Interview session initiated."],
            "gaps": ["No substantive responses recorded."],
            "next": ["Attempt each question with technical explanations and relevant project examples."],
            "questions_answered": 0,
            "total_questions": total_questions,
            "completion_rate": f"0/{total_questions} (0%)",
            "score": 0,
        }
    
    total_turn_score = 0
    for t in valid_answers:
        j = t.judgment or {}
        q_score = quality_scores.get(j.get("quality", "shallow"), 55)
        c_score = completeness_scores.get(j.get("completeness", "partial"), 55)
        total_turn_score += (q_score + c_score) / 2
        
    score = round(total_turn_score / questions_answered)
    
    # Try LLM feedback generation with multiple fallback levels
    feedback = None
    try:
        feedback = await llm_module.generate_feedback(
            judgment_log=judgment_log,
            candidate_name=session.candidate_name,
            role=session.role,
            questions_answered=questions_answered,
            total_questions=total_questions,
        )
    except Exception as e:
        print(f"FEEDBACK GENERATION FAILED (LLM): {e}")
    
    # If LLM feedback is None or missing required fields, build from judgment log
    if not feedback or not isinstance(feedback, dict):
        feedback = {}
    
    # Build detailed feedback from judgment log if LLM didn't provide good data
    strong_from_log = []
    weak_from_log = []
    for t in valid_answers:
        j = t.judgment or {}
        q = j.get("quality", "shallow")
        c = j.get("completeness", "partial")
        if q == "strong" and c == "full":
            strong_from_log.append(t.question[:80])
        elif q in ("confused", "off_topic") or c == "missing":
            weak_from_log.append(t.question[:80])
    
    # Use LLM data if available, otherwise build from log
    strong_sections = feedback.get("strong_sections") or strong_from_log or ["Demonstrated willingness to answer technical questions."]
    weak_sections = feedback.get("weak_sections") or weak_from_log or [f"{total_questions - questions_answered} questions remained unanswered."]
    areas_to_improve = feedback.get("areas_to_improve") or ["Continue practicing explanations for core technical concepts."]
    
    summary = feedback.get("summary") or (
        f"The candidate answered {questions_answered} of {total_questions} questions "
        f"({completion_percent}% completion) with an overall performance score of {score}%. "
        f"Key strengths include {len(strong_sections)} demonstrated areas, "
        f"with {len(weak_sections)} areas needing further development."
    )
    
    return {
        "summary": summary,
        "strong_sections": strong_sections,
        "weak_sections": weak_sections,
        "areas_to_improve": areas_to_improve,
        "strengths": strong_sections,
        "gaps": weak_sections,
        "next": areas_to_improve,
        "questions_answered": questions_answered,
        "total_questions": total_questions,
        "completion_rate": f"{questions_answered}/{total_questions} ({completion_percent}%)",
        "score": score,
    }
