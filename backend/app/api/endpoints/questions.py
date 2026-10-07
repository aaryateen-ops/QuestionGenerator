from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.entities import Question, Subject, SyllabusUnit, CourseOutcome
from app.schemas.dtos import (
    QuestionResponse, QuestionCreate, QuestionUpdate,
    BulkImportRequest, BulkImportResponse,
    BatchDeleteRequest, BatchAssignRequest
)
from app.engine.bloom_classifier import BloomClassifierEngine
from app.engine.co_mapper import CourseOutcomeMapper
from app.core.errors import NotFoundException, ValidationException

router = APIRouter(prefix="/questions", tags=["Question Bank Repository"])

@router.get("", response_model=List[QuestionResponse])
def get_questions(
    subject_id: Optional[int] = Query(None),
    unit_id: Optional[int] = Query(None),
    bloom_level: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    question_type: Optional[str] = Query(None),
    marks: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Question)
    if subject_id:
        query = query.filter(Question.subject_id == subject_id)
    if unit_id:
        query = query.filter(Question.unit_id == unit_id)
    if bloom_level:
        query = query.filter(Question.bloom_level == bloom_level.upper())
    if difficulty:
        query = query.filter(Question.difficulty == difficulty.upper())
    if question_type:
        query = query.filter(Question.question_type == question_type.upper())
    if marks:
        query = query.filter(Question.marks == marks)
    if search:
        query = query.filter(Question.question_text.ilike(f"%{search}%"))

    return query.order_by(Question.unit_id, Question.marks, Question.id).all()

@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(payload: QuestionCreate, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subj:
        raise NotFoundException("Subject", payload.subject_id)
    
    unit = db.query(SyllabusUnit).filter(SyllabusUnit.id == payload.unit_id).first()
    if not unit or unit.subject_id != payload.subject_id:
        raise ValidationException("Invalid unit_id for the specified subject.")

    co = db.query(CourseOutcome).filter(CourseOutcome.id == payload.co_id).first()
    if not co or co.subject_id != payload.subject_id:
        raise ValidationException("Invalid co_id for the specified subject.")

    # Automatically run NLP classifier if verb/confidence not provided
    nlp_res = BloomClassifierEngine.classify(payload.question_text)
    assigned_bloom = payload.bloom_level if payload.bloom_level else nlp_res["predicted_bloom_level"]
    action_verb = payload.action_verb if payload.action_verb else nlp_res["primary_verb"]
    confidence = payload.confidence_score if payload.confidence_score else nlp_res["confidence_score"]

    # Determine question type if not explicitly set
    q_type = payload.question_type.upper() if payload.question_type else ("MCQ" if payload.options else ("SHORT" if payload.marks <= 5 else "LONG"))

    question = Question(
        subject_id=payload.subject_id,
        unit_id=payload.unit_id,
        co_id=payload.co_id,
        question_text=payload.question_text.strip(),
        marks=payload.marks,
        bloom_level=assigned_bloom,
        difficulty=payload.difficulty.upper(),
        question_type=q_type,
        options=payload.options,
        correct_answer=payload.correct_answer,
        action_verb=action_verb,
        confidence_score=confidence,
        usage_count=0
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question

@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(question_id: int, payload: QuestionUpdate, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise NotFoundException("Question", question_id)

    if payload.question_text is not None:
        q.question_text = payload.question_text.strip()
        # Re-run NLP analysis
        nlp_res = BloomClassifierEngine.classify(q.question_text)
        q.action_verb = nlp_res["primary_verb"]
        q.confidence_score = nlp_res["confidence_score"]
        if payload.bloom_level is None:
            q.bloom_level = nlp_res["predicted_bloom_level"]

    if payload.marks is not None:
        q.marks = payload.marks
    if payload.bloom_level is not None:
        q.bloom_level = payload.bloom_level.upper()
    if payload.difficulty is not None:
        q.difficulty = payload.difficulty.upper()
    if payload.question_type is not None:
        q.question_type = payload.question_type.upper()
    if payload.options is not None:
        q.options = payload.options
    if payload.correct_answer is not None:
        q.correct_answer = payload.correct_answer
    if payload.unit_id is not None:
        q.unit_id = payload.unit_id
    if payload.co_id is not None:
        q.co_id = payload.co_id

    db.commit()
    db.refresh(q)
    return q

@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise NotFoundException("Question", question_id)
    db.delete(q)
    db.commit()
    return None

@router.post("/batch-delete")
def batch_delete_questions(payload: BatchDeleteRequest, db: Session = Depends(get_db)):
    if not payload.question_ids:
        return {"status": "success", "deleted_count": 0}
    deleted_count = db.query(Question).filter(Question.id.in_(payload.question_ids)).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "deleted_count": deleted_count}

@router.post("/batch-assign")
def batch_assign_questions(payload: BatchAssignRequest, db: Session = Depends(get_db)):
    if not payload.question_ids:
        return {"status": "success", "updated_count": 0}
    update_data = {}
    if payload.unit_id is not None:
        update_data[Question.unit_id] = payload.unit_id
    if payload.co_id is not None:
        update_data[Question.co_id] = payload.co_id
    
    if not update_data:
        return {"status": "no_change", "updated_count": 0}
        
    updated_count = db.query(Question).filter(Question.id.in_(payload.question_ids)).update(update_data, synchronize_session=False)
    db.commit()
    return {"status": "success", "updated_count": updated_count}

@router.post("/bulk-import", response_model=BulkImportResponse)
def bulk_import_questions(payload: BulkImportRequest, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subj:
        raise NotFoundException("Subject", payload.subject_id)

    units_by_num = {u.unit_number: u for u in subj.units}
    cos_by_code = {c.code.upper(): c for c in subj.course_outcomes}

    imported = 0
    classified = 0
    errors = []

    for idx, item in enumerate(payload.questions, start=1):
        try:
            # 1. Resolve Unit
            unit_obj = units_by_num.get(item.unit_number)
            if not unit_obj:
                errors.append(f"Row {idx}: Unit number {item.unit_number} not found for this subject.")
                continue

            # 2. Run NLP Classification
            nlp_res = BloomClassifierEngine.classify(item.question_text)
            classified += 1

            # 3. Resolve Bloom Level (Use item override or NLP prediction)
            final_bloom = item.bloom_level.upper() if item.bloom_level else nlp_res["predicted_bloom_level"]

            # 4. Resolve Course Outcome (Use item code, or map via CO Engine, or default to CO{unit})
            if item.co_code and item.co_code.upper() in cos_by_code:
                co_obj = cos_by_code[item.co_code.upper()]
            else:
                default_co_code = f"CO{item.unit_number}"
                co_obj = cos_by_code.get(default_co_code, list(cos_by_code.values())[0] if cos_by_code else None)

            if not co_obj:
                errors.append(f"Row {idx}: No valid Course Outcome found for question.")
                continue

            q_type = (item.question_type or ("MCQ" if item.options else ("SHORT" if item.marks <= 5 else "LONG"))).upper()
            question = Question(
                subject_id=subj.id,
                unit_id=unit_obj.id,
                co_id=co_obj.id,
                question_text=item.question_text.strip(),
                marks=item.marks,
                bloom_level=final_bloom,
                difficulty=(item.difficulty or "MEDIUM").upper(),
                question_type=q_type,
                options=item.options,
                correct_answer=item.correct_answer,
                action_verb=nlp_res["primary_verb"],
                confidence_score=nlp_res["confidence_score"],
                usage_count=0
            )
            db.add(question)
            imported += 1
        except Exception as e:
            errors.append(f"Row {idx}: Exception during ingestion: {str(e)}")

    db.commit()
    return BulkImportResponse(
        total_received=len(payload.questions),
        imported_count=imported,
        classified_count=classified,
        errors=errors
    )


from fastapi import UploadFile, File, Form
from app.engine.document_parser import DocumentQuestionParser

@router.post("/upload-file", response_model=BulkImportResponse)
async def upload_questions_file(
    subject_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Ingests and parses questions from uploaded .docx or .txt documents.
    Extracts text, identifies marks & units, and auto-tags via Bloom NLP.
    """
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise NotFoundException("Subject", subject_id)

    file_bytes = await file.read()
    filename = file.filename.lower()

    if filename.endswith(".pdf"):
        parsed_items = DocumentQuestionParser.parse_pdf(file_bytes)
    elif filename.endswith(".docx"):
        parsed_items = DocumentQuestionParser.parse_docx(file_bytes)
    elif filename.endswith(".txt") or filename.endswith(".csv"):
        text_content = file_bytes.decode("utf-8", errors="ignore")
        parsed_items = DocumentQuestionParser.parse_txt(text_content)
    else:
        raise ValidationException("Unsupported file format. Please upload a .pdf, .docx, .txt, or .csv document.")

    if not parsed_items:
        raise ValidationException("No valid questions could be extracted from the uploaded document.")

    units_by_num = {u.unit_number: u for u in subj.units}
    cos_by_code = {c.code.upper(): c for c in subj.course_outcomes}

    imported = 0
    classified = 0
    errors = []

    for idx, item in enumerate(parsed_items, start=1):
        try:
            unit_num = item.get("unit_number", 1)
            unit_obj = units_by_num.get(unit_num, subj.units[0] if subj.units else None)
            co_code = f"CO{unit_num}"
            co_obj = cos_by_code.get(co_code, list(cos_by_code.values())[0] if cos_by_code else None)

            nlp_res = BloomClassifierEngine.classify(item["question_text"])
            classified += 1

            q_type = (item.get("question_type") or ("MCQ" if item.get("options") else ("SHORT" if item.get("marks", 2) <= 5 else "LONG"))).upper()
            question = Question(
                subject_id=subj.id,
                unit_id=unit_obj.id,
                co_id=co_obj.id,
                question_text=item["question_text"].strip(),
                marks=item.get("marks", 2),
                bloom_level=nlp_res["predicted_bloom_level"],
                difficulty=item.get("difficulty", "MEDIUM"),
                question_type=q_type,
                options=item.get("options"),
                correct_answer=item.get("correct_answer"),
                action_verb=nlp_res["primary_verb"],
                confidence_score=nlp_res["confidence_score"],
                usage_count=0
            )
            db.add(question)
            imported += 1
        except Exception as e:
            errors.append(f"Item {idx}: {str(e)}")

    db.commit()
    return BulkImportResponse(
        total_received=len(parsed_items),
        imported_count=imported,
        classified_count=classified,
        errors=errors
    )


@router.get("/stats/{subject_id}")
def get_repository_stats(subject_id: int, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise NotFoundException("Subject", subject_id)

    all_questions = db.query(Question).filter(Question.subject_id == subject_id).all()
    
    bloom_counts = {"L1": 0, "L2": 0, "L3": 0, "L4": 0, "L5": 0, "L6": 0}
    difficulty_counts = {"EASY": 0, "MEDIUM": 0, "HARD": 0}
    marks_counts = {2: 0, 5: 0, 10: 0, 12: 0, 16: 0}
    unit_counts = {u.unit_number: 0 for u in subj.units}

    for q in all_questions:
        if q.bloom_level in bloom_counts:
            bloom_counts[q.bloom_level] += 1
        if q.difficulty in difficulty_counts:
            difficulty_counts[q.difficulty] += 1
        marks_counts[q.marks] = marks_counts.get(q.marks, 0) + 1
        
        # Unit count
        unit = next((u for u in subj.units if u.id == q.unit_id), None)
        if unit:
            unit_counts[unit.unit_number] = unit_counts.get(unit.unit_number, 0) + 1

    return {
        "subject_code": subj.code,
        "subject_name": subj.name,
        "total_questions": len(all_questions),
        "bloom_distribution": bloom_counts,
        "difficulty_distribution": difficulty_counts,
        "marks_distribution": marks_counts,
        "unit_distribution": unit_counts
    }
