from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.endpoints.auth import get_current_user
from app.core.errors import NotFoundException
from app.db.session import get_db
from app.models.entities import Question, QuestionReviewEvent, User
from app.schemas.dtos import QuestionResponse
from app.schemas.review import (BatchReviewRequest, DuplicateRequest, QuestionPage,
                                ReviewEventResponse, ReviewRequest, ReviewStatus)
from app.services.access import accessible_subject_ids, require_subject_access
from app.services.question_review import commit_questions, similar_questions, transition

router = APIRouter()


def authorized_question(db, user, question_id):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise NotFoundException('Question', question_id)
    require_subject_access(db, user, question.subject_id)
    return question


@router.get('/page', response_model=QuestionPage)
def question_page(
    subject_id: Optional[int] = None, search: Optional[str] = Query(None, max_length=300),
    unit_id: Optional[int] = None, bloom_level: Optional[str] = None,
    difficulty: Optional[str] = None, marks: Optional[int] = None,
    question_type: Optional[str] = None, review_status: Optional[ReviewStatus] = None,
    sort_by: Literal['created_at', 'marks', 'bloom_level', 'difficulty', 'unit_id', 'id'] = 'created_at',
    sort_direction: Literal['asc', 'desc'] = 'desc',
    page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    query = db.query(Question)
    if subject_id:
        require_subject_access(db, user, subject_id)
        query = query.filter(Question.subject_id == subject_id)
    else:
        ids = accessible_subject_ids(db, user)
        if ids is not None:
            query = query.filter(Question.subject_id.in_(ids))
    counts = {'all': query.count(), 'MCQ': 0, 'SHORT': 0, 'LONG': 0, 'DRAFT': 0, 'REVIEWED': 0, 'APPROVED': 0}
    for value, count in query.with_entities(Question.question_type, func.count(Question.id)).group_by(Question.question_type):
        counts[value] = count
    for value, count in query.with_entities(Question.review_status, func.count(Question.id)).group_by(Question.review_status):
        counts[value] = count
    filters = {'unit_id': unit_id, 'bloom_level': bloom_level, 'difficulty': difficulty,
               'marks': marks, 'question_type': question_type, 'review_status': review_status}
    for field, value in filters.items():
        if value is not None:
            query = query.filter(getattr(Question, field) == value)
    if search and search.strip():
        escaped = search.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        query = query.filter(Question.question_text.ilike(f'%{escaped}%', escape='\\'))
    total = query.count()
    column = getattr(Question, sort_by)
    order = column.asc() if sort_direction == 'asc' else column.desc()
    items = query.order_by(order, Question.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return QuestionPage(items=items, total=total, page=page, page_size=page_size, counts=counts)


@router.post('/check-duplicates')
def check_duplicates(payload: DuplicateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_subject_access(db, user, payload.subject_id)
    if payload.exclude_id:
        authorized_question(db, user, payload.exclude_id)
    return {'matches': similar_questions(db, payload.subject_id, payload.question_text, payload.exclude_id),
            'scope': 'Latest 1,000 course questions; exact duplicates are also checked when saving.'}


@router.post('/batch-review')
def batch_review(payload: BatchReviewRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    selected = [authorized_question(db, user, question_id) for question_id in dict.fromkeys(payload.question_ids)]
    try:
        for question in selected:
            transition(db, question, user, payload.status, payload.comment)
        commit_questions(db)
    except Exception:
        db.rollback()
        raise
    return {'updated_count': len(selected), 'review_status': payload.status}


@router.post('/{question_id}/review', response_model=QuestionResponse)
def review_question(question_id: int, payload: ReviewRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    question = authorized_question(db, user, question_id)
    transition(db, question, user, payload.status, payload.comment)
    commit_questions(db)
    db.refresh(question)
    return question


@router.get('/{question_id}/history', response_model=list[ReviewEventResponse])
def question_history(question_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    authorized_question(db, user, question_id)
    return db.query(QuestionReviewEvent).filter(QuestionReviewEvent.question_id == question_id).order_by(QuestionReviewEvent.id).all()
