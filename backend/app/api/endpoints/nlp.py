from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.models.entities import Subject
from app.schemas.dtos import (
    NLPClassifyRequest, NLPClassifyResponse, NLPVerbMatch,
    SynthesizeQuestionRequest, SynthesizeQuestionResponse, SynthesizedQuestionItem,
    ValidateApiKeyRequest, ValidateApiKeyResponse
)
from app.engine.bloom_classifier import BloomClassifierEngine
from app.engine.co_mapper import CourseOutcomeMapper
from app.engine.llm_synthesizer import LLMQuestionSynthesizer
from app.engine.document_parser import DocumentQuestionParser

router = APIRouter(prefix="/nlp", tags=["NLP Bloom Classifier"])

@router.post("/validate-api-key", response_model=ValidateApiKeyResponse)
async def validate_api_key(payload: ValidateApiKeyRequest):
    """
    Validates a Google Gemini API key by making a lightweight ping probe.
    """
    result = await LLMQuestionSynthesizer.validate_api_key(payload.api_key)
    return ValidateApiKeyResponse(**result)


@router.post("/classify", response_model=NLPClassifyResponse)
def live_classify_question(payload: NLPClassifyRequest, db: Session = Depends(get_db)):
    # 1. Run Bloom Taxonomy Classifier
    raw_result = BloomClassifierEngine.classify(payload.question_text)
    
    suggested_co = None
    suggested_unit = None

    # 2. If subject_id provided, run syllabus context mapping
    if payload.subject_id:
        subj = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if subj:
            units_data = [
                {
                    "unit_number": u.unit_number,
                    "title": u.title,
                    "description": u.description,
                    "topics": u.topics or ""
                }
                for u in subj.units
            ]
            cos_data = [
                {"code": c.code, "description": c.description, "target_bloom_level": c.target_bloom_level}
                for c in subj.course_outcomes
            ]
            co_mapping = CourseOutcomeMapper.suggest_mapping(
                question_text=payload.question_text,
                bloom_level=raw_result["predicted_bloom_level"],
                units=units_data,
                course_outcomes=cos_data
            )
            suggested_co = co_mapping["suggested_co_code"]
            suggested_unit = co_mapping["suggested_unit_number"]

    # Transform detected verbs to DTO
    verb_matches = [
        NLPVerbMatch(
            verb=m["verb"],
            bloom_level=m["bloom_level"],
            level_name=m["level_name"],
            weight=m["weight"]
        )
        for m in raw_result["detected_verbs"]
    ]

    return NLPClassifyResponse(
        question_text=raw_result["question_text"],
        detected_verbs=verb_matches,
        primary_verb=raw_result["primary_verb"],
        predicted_bloom_level=raw_result["predicted_bloom_level"],
        level_name=raw_result["level_name"],
        confidence_score=raw_result["confidence_score"],
        rationale=raw_result["rationale"],
        suggested_co_code=suggested_co,
        suggested_unit_number=suggested_unit
    )


@router.post("/synthesize", response_model=SynthesizeQuestionResponse)
async def synthesize_ai_questions(payload: SynthesizeQuestionRequest, db: Session = Depends(get_db)):
    """
    Generative AI Question Synthesizer.
    Generates novel questions (MCQ/SHORT/LONG) using Google Gemini API or deep procedural engine.
    """
    subj_name = None
    subj = None
    if payload.subject_id:
        subj = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if subj:
            subj_name = f"{subj.name} ({subj.code})" if subj.code else subj.name

    synth_output = await LLMQuestionSynthesizer.generate_questions(
        topic=payload.topic,
        bloom_level=payload.bloom_level,
        marks=payload.marks,
        difficulty=payload.difficulty,
        question_type=payload.question_type,
        count=payload.count,
        api_key=payload.api_key,
        context_text=payload.context_text,
        subject_name=subj_name
    )

    generated = synth_output["questions"]
    engine_used = synth_output["engine_used"]
    gemini_error = synth_output.get("gemini_error")

    # Optional syllabus mapping
    suggested_co = f"CO{payload.unit_number}" if payload.unit_number else "CO1"
    suggested_unit = payload.unit_number or 1

    if payload.subject_id:
        subj = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if subj:
            units_data = [
                {
                    "unit_number": u.unit_number,
                    "title": u.title,
                    "description": u.description,
                    "topics": u.topics or ""
                }
                for u in subj.units
            ]
            cos_data = [
                {"code": c.code, "description": c.description, "target_bloom_level": c.target_bloom_level}
                for c in subj.course_outcomes
            ]
            for item in generated:
                mapping = CourseOutcomeMapper.suggest_mapping(item["question_text"], item["bloom_level"], units_data, cos_data)
                item["suggested_co_code"] = mapping["suggested_co_code"]
                item["suggested_unit_number"] = mapping["suggested_unit_number"]
        else:
            for item in generated:
                item["suggested_co_code"] = suggested_co
                item["suggested_unit_number"] = suggested_unit
    else:
        for item in generated:
            item["suggested_co_code"] = suggested_co
            item["suggested_unit_number"] = suggested_unit

    return SynthesizeQuestionResponse(
        topic=payload.topic,
        target_bloom=payload.bloom_level,
        engine_used=engine_used,
        gemini_error=gemini_error,
        questions=[SynthesizedQuestionItem(**g) for g in generated]
    )


@router.post("/synthesize-from-document", response_model=SynthesizeQuestionResponse)
async def synthesize_from_document(
    file: UploadFile = File(...),
    subject_id: Optional[int] = Form(None),
    unit_number: Optional[int] = Form(None),
    question_type: str = Form("SHORT"),
    bloom_level: str = Form("L3"),
    marks: int = Form(2),
    difficulty: str = Form("MEDIUM"),
    count: int = Form(3),
    api_key: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Extracts text from uploaded notes/PDF/Word document and uses generative AI
    to author brand-new curriculum-aligned questions grounded in the document context.
    """
    file_bytes = await file.read()
    extracted_text = DocumentQuestionParser.extract_raw_text(file_bytes, file.filename)
    
    # Topic derived from filename or first line
    clean_filename = file.filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ')
    topic = f"Content from {clean_filename}"

    subj_name = None
    subj = None
    if subject_id:
        subj = db.query(Subject).filter(Subject.id == subject_id).first()
        if subj:
            subj_name = f"{subj.name} ({subj.code})" if subj.code else subj.name

    synth_output = await LLMQuestionSynthesizer.generate_questions(
        topic=topic,
        bloom_level=bloom_level,
        marks=marks,
        difficulty=difficulty,
        question_type=question_type,
        count=count,
        api_key=api_key,
        context_text=extracted_text,
        subject_name=subj_name
    )

    generated = synth_output["questions"]
    engine_used = synth_output["engine_used"]
    gemini_error = synth_output.get("gemini_error")

    suggested_co = f"CO{unit_number}" if unit_number else "CO1"
    suggested_unit = unit_number or 1

    if subject_id:
        subj = db.query(Subject).filter(Subject.id == subject_id).first()
        if subj:
            units_data = [
                {
                    "unit_number": u.unit_number,
                    "title": u.title,
                    "description": u.description,
                    "topics": u.topics or ""
                }
                for u in subj.units
            ]
            cos_data = [
                {"code": c.code, "description": c.description, "target_bloom_level": c.target_bloom_level}
                for c in subj.course_outcomes
            ]
            for item in generated:
                mapping = CourseOutcomeMapper.suggest_mapping(item["question_text"], item["bloom_level"], units_data, cos_data)
                item["suggested_co_code"] = mapping["suggested_co_code"]
                item["suggested_unit_number"] = mapping["suggested_unit_number"]
        else:
            for item in generated:
                item["suggested_co_code"] = suggested_co
                item["suggested_unit_number"] = suggested_unit
    else:
        for item in generated:
            item["suggested_co_code"] = suggested_co
            item["suggested_unit_number"] = suggested_unit

    return SynthesizeQuestionResponse(
        topic=topic,
        target_bloom=bloom_level,
        engine_used=engine_used,
        gemini_error=gemini_error,
        questions=[SynthesizedQuestionItem(**g) for g in generated]
    )
