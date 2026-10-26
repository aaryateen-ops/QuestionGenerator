import hashlib
import json
import re
import unicodedata
from difflib import SequenceMatcher

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.core.errors import AppException, ValidationException
from app.engine.image_scan import normalize_math
from app.models.entities import Question, QuestionReviewEvent, SyllabusUnit, CourseOutcome


def normalized_stem(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', text)).strip().casefold()


def fingerprint(text):
    return hashlib.sha256(normalized_stem(text).encode('utf-8')).hexdigest()


def ensure_unique(db, subject_id, text, exclude_id=None):
    normalized = normalized_stem(text)
    query = db.query(Question).filter(Question.subject_id == subject_id)
    if exclude_id:
        query = query.filter(Question.id != exclude_id)
    # Legacy rows have no fingerprint. Check them without rewriting or deleting existing data.
    candidates = query.filter((Question.text_fingerprint == fingerprint(text)) | Question.text_fingerprint.is_(None)).all()
    if any(normalized_stem(item.question_text) == normalized for item in candidates):
        raise AppException('This question already exists in this course. Edit the existing entry instead.',
                           409, error_code='QUESTION_DUPLICATE')


def validate_content(data, require_answer=False):
    values = dict(data)
    try:
        values['question_text'] = normalize_math(values['question_text'].strip())
        if len(values['question_text']) < 5:
            raise ValueError('Question text is too short')
        if not 1 <= values['marks'] <= 30:
            raise ValueError('Marks must be between 1 and 30')
        if values['question_type'] == 'MCQ':
            raw = values.get('options')
            options = json.loads(raw) if isinstance(raw, str) else raw
            if not isinstance(options, dict) or set(options) != {'A', 'B', 'C', 'D'}:
                raise ValueError('An MCQ needs exactly four options A, B, C and D')
            if not all(isinstance(value, str) and value.strip() for value in options.values()):
                raise ValueError('Complete all four MCQ options')
            values['options'] = json.dumps({key: normalize_math(value.strip()) for key, value in options.items()})
            answer = values.get('correct_answer')
            if answer and answer not in options:
                raise ValueError('The answer key must be A, B, C or D')
            if require_answer and not answer:
                raise ValueError('Confirm the MCQ answer key before marking this question reviewed')
        else:
            values['options'] = None
            values['correct_answer'] = None
        return values
    except (ValueError, TypeError, KeyError) as exc:
        raise ValidationException(str(exc)) from exc


def question_values(question):
    return {key: getattr(question, key) for key in ('question_text', 'marks', 'bloom_level', 'difficulty',
            'question_type', 'options', 'correct_answer', 'unit_id', 'co_id')}


def validate_mapping(db, subject_id, unit_id, co_id):
    unit = db.query(SyllabusUnit).filter(SyllabusUnit.id == unit_id, SyllabusUnit.subject_id == subject_id).first()
    co = db.query(CourseOutcome).filter(CourseOutcome.id == co_id, CourseOutcome.subject_id == subject_id).first()
    if not unit or not co:
        raise ValidationException('The unit and course outcome must belong to this question’s course.')


def record_event(db, question, user, event_type, comment, from_status='DRAFT'):
    db.flush()
    db.add(QuestionReviewEvent(question_id=question.id, reviewer_id=user.id,
            reviewer_name=user.full_name, event_type=event_type, from_status=from_status,
            to_status=question.review_status, comment=comment, **question_values(question)))


def preserve_legacy_snapshot(db, question, user):
    if not db.query(QuestionReviewEvent.id).filter(QuestionReviewEvent.question_id == question.id).first():
        record_event(db, question, user, 'LEGACY_BASELINE',
                     'Existing repository content recorded before its first tracked change.', question.review_status)


def transition(db, question, user, status, comment):
    current = question.review_status
    allowed = {'DRAFT': {'REVIEWED'}, 'REVIEWED': {'DRAFT', 'APPROVED'}, 'APPROVED': {'DRAFT'}}
    if status == 'APPROVED' and user.role != 'ADMIN':
        raise HTTPException(403, 'Only an administrator can approve examination questions.')
    if status not in allowed.get(current, set()):
        raise AppException(f'A {current.lower()} question cannot move directly to {status.lower()}.',
                           409, error_code='REVIEW_TRANSITION_INVALID')
    if len(comment.strip()) < 3:
        raise ValidationException('Add a meaningful reviewer comment.')
    if status != 'DRAFT':
        validate_content(question_values(question), require_answer=True)
        validate_mapping(db, question.subject_id, question.unit_id, question.co_id)
    preserve_legacy_snapshot(db, question, user)
    # Compare-and-set protects against an edit or another review between read and write.
    query = db.query(Question).filter(Question.id == question.id, Question.review_status == current)
    for field, value in question_values(question).items():
        query = query.filter(getattr(Question, field) == value)
    updated = query.update({'review_status': status}, synchronize_session=False)
    if updated != 1:
        raise AppException('This question changed during review. Refresh and review the latest version.',
                           409, error_code='QUESTION_CHANGED')
    question.review_status = status
    record_event(db, question, user, 'REVIEW', comment.strip(), current)


def commit_questions(db):
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise AppException('A duplicate question or conflicting update was detected. Refresh and try again.',
                           409, error_code='QUESTION_CONFLICT') from exc


def similar_questions(db, subject_id, text, exclude_id=None):
    query = db.query(Question).filter(Question.subject_id == subject_id)
    if exclude_id:
        query = query.filter(Question.id != exclude_id)
    target = normalized_stem(text)
    matches = []
    for question in query.order_by(Question.id.desc()).limit(1000):
        score = SequenceMatcher(None, target, normalized_stem(question.question_text), autojunk=False).ratio()
        if score >= 0.8:
            matches.append({'id': question.id, 'question_text': question.question_text,
                            'similarity': round(score, 3), 'exact': normalized_stem(question.question_text) == target})
    return sorted(matches, key=lambda item: item['similarity'], reverse=True)[:5]
