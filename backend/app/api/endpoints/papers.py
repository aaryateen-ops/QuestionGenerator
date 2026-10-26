import json
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db.session import get_db
from app.models.entities import Subject, Question, GeneratedPaper, User
from app.api.endpoints.auth import get_current_user
from app.services.access import accessible_subject_ids, require_subject_access
from app.services.paper_quality import answerable_marks, assess_paper
from app.schemas.dtos import (
    GeneratePaperRequest, GeneratedPaperResponse, SwapQuestionRequest,
    CandidateQuestionResponse
)
from app.engine.paper_composer import PaperComposerEngine
from app.core.errors import NotFoundException, ConstraintViolationException

router = APIRouter(prefix="/papers", tags=["Question Paper Generator"])


@router.get('/{paper_id}/quality')
def paper_quality(paper_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    paper = db.query(GeneratedPaper).filter(GeneratedPaper.id == paper_id).first()
    if not paper:
        raise NotFoundException('GeneratedPaper', paper_id)
    require_subject_access(db, user, paper.subject_id)
    data = json.loads(paper.paper_data_json)
    data['total_marks'] = paper.total_marks
    ids = [question.get('question_id') for section in data.get('sections', []) for question in section.get('questions', [])]
    current = db.query(Question).filter(Question.id.in_(ids), Question.subject_id == paper.subject_id).all()
    return assess_paper(data, {question.id: question for question in current})

@router.get("", response_model=List[Dict[str, Any]])
def list_papers(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(GeneratedPaper)
    subject_ids = accessible_subject_ids(db, user)
    if subject_ids is not None:
        query = query.filter(GeneratedPaper.subject_id.in_(subject_ids))
    papers = query.order_by(GeneratedPaper.created_at.desc()).all()
    results = []
    for p in papers:
        data = json.loads(p.paper_data_json)
        results.append({
            "id": p.id,
            "paper_code": p.paper_code,
            "title": p.title,
            "subject_code": data.get("subject_code"),
            "subject_name": data.get("subject_name"),
            "total_marks": p.total_marks,
            "duration_minutes": p.duration_minutes,
            "status": p.status,
            "created_at": p.created_at
        })
    return results

@router.get("/{paper_id}", response_model=GeneratedPaperResponse)
def get_paper(paper_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = db.query(GeneratedPaper).filter(GeneratedPaper.id == paper_id).first()
    if not p:
        raise NotFoundException("GeneratedPaper", paper_id)
    require_subject_access(db, user, p.subject_id)
    
    data = json.loads(p.paper_data_json)
    return GeneratedPaperResponse(
        id=p.id,
        paper_code=p.paper_code,
        title=p.title,
        subject_code=data["subject_code"],
        subject_name=data["subject_name"],
        department=data.get("department", "Engineering"),
        academic_year=p.academic_year,
        semester_label=p.semester_label,
        regulation=data.get("regulation", "Autonomous"),
        total_marks=p.total_marks,
        duration_minutes=p.duration_minutes,
        status=p.status,
        created_at=p.created_at,
        sections=data["sections"],
        bloom_analysis=data["bloom_analysis"],
        co_attainment=data["co_attainment"],
        difficulty_analysis=data["difficulty_analysis"]
    )


from fastapi.responses import StreamingResponse
from app.engine.pdf_exporter import UniversityPDFExporter

@router.get("/{paper_id}/download-pdf")
def download_paper_pdf(paper_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Generates and downloads a submission-ready, official PDF examination sheet.
    """
    p = db.query(GeneratedPaper).filter(GeneratedPaper.id == paper_id).first()
    if not p:
        raise NotFoundException("GeneratedPaper", paper_id)
    require_subject_access(db, user, p.subject_id)

    data = json.loads(p.paper_data_json)
    pdf_buffer = UniversityPDFExporter.generate_pdf(data)

    filename = f"{p.paper_code}_Exam_Paper.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )


@router.post("/generate", response_model=GeneratedPaperResponse, status_code=status.HTTP_201_CREATED)
def generate_paper(payload: GeneratePaperRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_subject_access(db, user, payload.subject_id)
    subj = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subj:
        raise NotFoundException("Subject", payload.subject_id)

    # Fetch question pool for subject
    questions = db.query(Question).filter(Question.subject_id == payload.subject_id, Question.review_status == 'APPROVED').all()
    if not questions:
        raise ConstraintViolationException('No approved questions are available for this course. Review and approve repository questions before composing an examination.')

    # Convert questions to solver dict format
    pool = []
    unit_map = {u.id: u.unit_number for u in subj.units}
    co_map = {c.id: c.code for c in subj.course_outcomes}

    for q in questions:
        pool.append({
            "id": q.id,
            "unit_number": unit_map.get(q.unit_id, 1),
            "co_code": co_map.get(q.co_id, "CO1"),
            "question_text": q.question_text,
            "marks": q.marks,
            "bloom_level": q.bloom_level,
            "difficulty": q.difficulty,
            "question_type": q.question_type or "SHORT",
            "options": q.options,
            "correct_answer": q.correct_answer,
            "usage_count": q.usage_count
        })

    subject_dict = {
        "code": subj.code,
        "name": subj.name,
        "department": subj.department,
        "regulation": subj.regulation
    }

    blueprint_dict = {
        "title": payload.title,
        "academic_year": payload.academic_year,
        "semester_label": payload.semester_label,
        "exam_type": payload.exam_type,
        "total_marks": payload.total_marks,
        "duration_minutes": payload.duration_minutes,
        "part_a_type": payload.part_a_type,
        "include_part_c": payload.include_part_c,
        "units_included": payload.units_included,
        "bloom_distribution": payload.bloom_distribution.model_dump(),
        "difficulty_distribution": payload.difficulty_distribution.model_dump()
    }

    # Run solver
    composed_data = PaperComposerEngine.compose_paper(
        subject=subject_dict,
        question_pool=pool,
        blueprint=blueprint_dict
    )

    # Persist in DB
    paper_entity = GeneratedPaper(
        subject_id=subj.id,
        paper_code=composed_data["paper_code"],
        title=composed_data["title"],
        academic_year=composed_data["academic_year"],
        semester_label=composed_data["semester_label"],
        total_marks=composed_data["total_marks"],
        duration_minutes=composed_data["duration_minutes"],
        status="DRAFT",
        paper_data_json=json.dumps(composed_data)
    )
    db.add(paper_entity)

    # Increment question usage count
    for sec in composed_data["sections"]:
        for q_item in sec["questions"]:
            q_id = q_item["question_id"]
            db_q = db.query(Question).filter(Question.id == q_id).first()
            if db_q:
                db_q.usage_count += 1

    db.commit()
    db.refresh(paper_entity)

    return GeneratedPaperResponse(
        id=paper_entity.id,
        paper_code=paper_entity.paper_code,
        title=paper_entity.title,
        subject_code=composed_data["subject_code"],
        subject_name=composed_data["subject_name"],
        department=composed_data["department"],
        academic_year=paper_entity.academic_year,
        semester_label=paper_entity.semester_label,
        regulation=composed_data["regulation"],
        total_marks=paper_entity.total_marks,
        duration_minutes=paper_entity.duration_minutes,
        status=paper_entity.status,
        created_at=paper_entity.created_at,
        sections=composed_data["sections"],
        bloom_analysis=composed_data["bloom_analysis"],
        co_attainment=composed_data["co_attainment"],
        difficulty_analysis=composed_data["difficulty_analysis"]
    )

@router.get("/{paper_id}/swap-candidates/{question_id}", response_model=List[CandidateQuestionResponse])
def get_swap_candidates(paper_id: int, question_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    paper = db.query(GeneratedPaper).filter(GeneratedPaper.id == paper_id).first()
    if not paper:
        raise NotFoundException("GeneratedPaper", paper_id)
    require_subject_access(db, user, paper.subject_id)
    
    paper_data = json.loads(paper.paper_data_json)
    
    # Locate current question in paper structure
    target_q = None
    existing_ids = set()
    for sec in paper_data["sections"]:
        for q in sec["questions"]:
            existing_ids.add(q["question_id"])
            if q["question_id"] == question_id:
                target_q = q

    if not target_q:
        raise NotFoundException("Question in Paper", question_id)

    # Fetch pool for this subject
    all_questions = db.query(Question).filter(Question.subject_id == paper.subject_id, Question.review_status == 'APPROVED').all()
    subj = db.query(Subject).filter(Subject.id == paper.subject_id).first()
    unit_map = {u.id: u.unit_number for u in subj.units}
    co_map = {c.id: c.code for c in subj.course_outcomes}

    pool = []
    for q in all_questions:
        pool.append({
            "id": q.id,
            "unit_number": unit_map.get(q.unit_id, 1),
            "co_code": co_map.get(q.co_id, "CO1"),
            "question_text": q.question_text,
            "marks": q.marks,
            "bloom_level": q.bloom_level,
            "difficulty": q.difficulty,
            "question_type": q.question_type or "SHORT",
            "options": q.options,
            "correct_answer": q.correct_answer
        })

    candidates = PaperComposerEngine.find_swap_candidates(
        current_question=target_q,
        question_pool=pool,
        existing_paper_question_ids=existing_ids
    )

    return [CandidateQuestionResponse(**c) for c in candidates]

@router.post("/swap", response_model=GeneratedPaperResponse)
def execute_swap(payload: SwapQuestionRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    paper = db.query(GeneratedPaper).filter(GeneratedPaper.id == payload.paper_id).first()
    if not paper:
        raise NotFoundException("GeneratedPaper", payload.paper_id)
    require_subject_access(db, user, paper.subject_id)

    target_q = db.query(Question).filter(Question.id == payload.target_question_id).first()
    if not target_q:
        raise NotFoundException("Replacement Question", payload.target_question_id)
    if target_q.subject_id != paper.subject_id or target_q.review_status != 'APPROVED':
        raise ConstraintViolationException('Replacement questions must be approved and belong to this examination’s course.')

    paper_data = json.loads(paper.paper_data_json)
    subj = db.query(Subject).filter(Subject.id == paper.subject_id).first()
    unit_map = {u.id: u.unit_number for u in subj.units}
    co_map = {c.id: c.code for c in subj.course_outcomes}

    # Find the current question to validate marks match section budget
    current_q_data = None
    current_section = None
    for sec in paper_data["sections"]:
        for q in sec["questions"]:
            if q["question_id"] == payload.current_question_id:
                current_q_data = q
                current_section = sec
                break
        if current_q_data:
            break

    if not current_q_data:
        raise NotFoundException("Current Question in Paper", payload.current_question_id)

    # Validate: new question marks must equal original question marks (to preserve section budget)
    if target_q.marks != current_q_data["marks"]:
        raise ConstraintViolationException(
            f"Replacement question marks ({target_q.marks}) must match original question marks ({current_q_data['marks']}) "
            f"to preserve section mark allocation."
        )

    # Validate question type matches (MCQ <-> MCQ, SHORT <-> SHORT, LONG <-> LONG)
    current_type = current_q_data.get("question_type", "SHORT")
    target_type = target_q.question_type or "SHORT"
    if current_type != target_type:
        raise ConstraintViolationException(
            f"Replacement question type ({target_type}) must match original question type ({current_type})."
        )

    # Swap in sections
    swapped = False
    for sec in paper_data["sections"]:
        for q in sec["questions"]:
            if q["question_id"] == payload.current_question_id:
                q["question_id"] = target_q.id
                q["question_text"] = target_q.question_text
                q["marks"] = target_q.marks
                q["bloom_level"] = target_q.bloom_level
                q["difficulty"] = target_q.difficulty
                q["question_type"] = target_q.question_type or "SHORT"
                q["options"] = target_q.options
                q["correct_answer"] = target_q.correct_answer
                q["unit_number"] = unit_map.get(target_q.unit_id, 1)
                q["co_code"] = co_map.get(target_q.co_id, "CO1")
                swapped = True
                break
        if swapped:
            break

    if not swapped:
        raise NotFoundException("Current Question in Paper", payload.current_question_id)

    # Recompute analytics
    all_selected = []
    for sec in paper_data["sections"]:
        for q in sec["questions"]:
            all_selected.append(q)

    paper_data["bloom_analysis"] = PaperComposerEngine._calculate_bloom_distribution(all_selected)
    paper_data["co_attainment"] = PaperComposerEngine._calculate_co_distribution(all_selected)
    paper_data["difficulty_analysis"] = PaperComposerEngine._calculate_difficulty_distribution(all_selected)

    # Recalculate total_marks from updated paper data and update DB
    recalculated_total_marks = answerable_marks(paper_data['sections'])
    paper.total_marks = recalculated_total_marks
    paper_data['total_marks'] = recalculated_total_marks

    paper.paper_data_json = json.dumps(paper_data)
    db.commit()

    return GeneratedPaperResponse(
        id=paper.id,
        paper_code=paper.paper_code,
        title=paper.title,
        subject_code=paper_data["subject_code"],
        subject_name=paper_data["subject_name"],
        department=paper_data.get("department", "Engineering"),
        academic_year=paper.academic_year,
        semester_label=paper.semester_label,
        regulation=paper_data.get("regulation", "Autonomous"),
        total_marks=paper.total_marks,
        duration_minutes=paper.duration_minutes,
        status=paper.status,
        created_at=paper.created_at,
        sections=paper_data["sections"],
        bloom_analysis=paper_data["bloom_analysis"],
        co_attainment=paper_data["co_attainment"],
        difficulty_analysis=paper_data["difficulty_analysis"]
    )
