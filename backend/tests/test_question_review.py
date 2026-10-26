import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.endpoints import questions, papers
from app.api.endpoints.auth import get_current_user
from app.core.errors import AppException
from app.db.session import Base, get_db
from app.models.entities import Subject, SyllabusUnit, CourseOutcome, User


@pytest.fixture
def repository():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    with sessions() as db:
        user = User(email='reviewer@example.edu', username='reviewer', hashed_password='unused', full_name='Exam Reviewer', role='ADMIN', is_active=1)
        subject = Subject(code='MA101', name='Applied Mathematics', department='Mathematics', semester=1)
        subject.units = [SyllabusUnit(unit_number=1, title='Linear algebra')]
        subject.course_outcomes = [CourseOutcome(code='CO1', description='Solve linear equations', target_bloom_level='L3')]
        db.add_all([user, subject]); db.commit()
        payload = dict(subject_id=subject.id, unit_id=subject.units[0].id, co_id=subject.course_outcomes[0].id,
                       question_text='Solve the equation $2x+4=10$.', marks=2, bloom_level='L3')
    app = FastAPI()
    app.include_router(questions.router, prefix='/api/v1')
    app.include_router(papers.router, prefix='/api/v1')

    def database():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = database
    app.dependency_overrides[get_current_user] = lambda: user

    @app.exception_handler(AppException)
    async def errors(request, exc):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=exc.status_code, content={'message': exc.message, 'error_code': exc.error_code})

    with TestClient(app) as client:
        yield client, payload, sessions
    engine.dispose()


def create(repository, **changes):
    client, payload, _ = repository
    response = client.post('/api/v1/questions', json={**payload, **changes})
    assert response.status_code == 201, response.text
    return response.json()


def test_new_question_requires_review(repository):
    question = create(repository)
    assert question.get('review_status') == 'DRAFT'


def test_approval_requires_review_and_records_history(repository):
    client, _, _ = repository
    question = create(repository)
    path = f'/api/v1/questions/{question["id"]}/review'
    assert client.post(path, json={'status': 'APPROVED', 'comment': 'Checked answer'}).status_code == 409
    assert client.post(path, json={'status': 'REVIEWED', 'comment': 'Checked mathematics'}).status_code == 200
    approved = client.post(path, json={'status': 'APPROVED', 'comment': 'Approved for examination'})
    assert approved.status_code == 200, approved.text
    assert approved.json()['review_status'] == 'APPROVED'
    history = client.get(f'/api/v1/questions/{question["id"]}/history').json()
    assert [entry['to_status'] for entry in history] == ['DRAFT', 'REVIEWED', 'APPROVED']
    assert history[0]['question_text'] == question['question_text']


def test_edit_invalidates_previous_approval(repository):
    client, _, _ = repository
    question = create(repository)
    path = f'/api/v1/questions/{question["id"]}'
    for state in ('REVIEWED', 'APPROVED'):
        assert client.post(path + '/review', json={'status': state, 'comment': 'Academic verification'}).status_code == 200
    edited = client.put(path, json={'question_text': 'Solve the equation $3x+4=10$.'})
    assert edited.status_code == 200, edited.text
    assert edited.json()['review_status'] == 'DRAFT'
    history = client.get(path + '/history').json()
    assert history[-1]['event_type'] == 'EDITED'
    assert history[-2]['question_text'] == question['question_text']


def test_duplicate_question_is_rejected_without_second_write(repository):
    client, payload, _ = repository
    create(repository)
    duplicate = client.post('/api/v1/questions', json={**payload, 'question_text': '  Solve the equation $2x+4=10$.  '})
    assert duplicate.status_code == 409
    page = client.get('/api/v1/questions/page', params={'subject_id': payload['subject_id']}).json()
    assert page['total'] == 1


def test_paginated_filters_and_course_counts(repository):
    client, payload, _ = repository
    create(repository)
    create(repository, question_text='Explain the principle of induction.', bloom_level='L2', marks=5)
    result = client.get('/api/v1/questions/page', params={'subject_id': payload['subject_id'], 'page_size': 1, 'sort_by': 'marks', 'sort_direction': 'desc'})
    assert result.status_code == 200, result.text
    page = result.json()
    assert page['total'] == 2 and len(page['items']) == 1
    assert page['items'][0]['marks'] == 5
    assert page['counts']['DRAFT'] == 2
    assert client.get('/api/v1/questions/page', params={'subject_id': payload['subject_id'], 'review_status': 'APPROVED'}).json()['total'] == 0


def test_invalid_update_cannot_corrupt_question(repository):
    client, _, _ = repository
    question = create(repository)
    assert client.put(f'/api/v1/questions/{question["id"]}', json={'marks': -2}).status_code == 422


def test_mcq_cannot_be_approved_without_an_answer_key(repository):
    import json
    client, _, _ = repository
    question = create(repository, question_type='MCQ', options=json.dumps({'A': '$1$', 'B': '$2$', 'C': '$3$', 'D': '$4$'}))
    response = client.post(f'/api/v1/questions/{question["id"]}/review', json={'status': 'REVIEWED', 'comment': 'Check this MCQ'})
    assert response.status_code == 422


def test_unchanged_batch_assignment_preserves_approval(repository):
    client, payload, _ = repository
    question = create(repository)
    for state in ('REVIEWED', 'APPROVED'):
        assert client.post(f'/api/v1/questions/{question["id"]}/review', json={'status': state, 'comment': 'Verified mathematics'}).status_code == 200
    response = client.post('/api/v1/questions/batch-assign', json={'question_ids': [question['id']], 'unit_id': payload['unit_id'], 'co_id': payload['co_id']})
    assert response.status_code == 200
    assert client.get('/api/v1/questions/page').json()['items'][0]['review_status'] == 'APPROVED'


def test_production_cannot_enable_published_demo_accounts(monkeypatch):
    from app.core.config import Settings
    from pydantic import ValidationError
    monkeypatch.setenv('ENVIRONMENT', 'production')
    with pytest.raises(ValidationError):
        Settings(DEMO_MODE=True, SECRET_KEY='private-test-signing-key-with-at-least-32-characters')


def test_legacy_questions_migrate_without_implicit_approval(tmp_path):
    import sqlite3
    from app.db.migrations import run_migrations
    database = tmp_path / 'legacy.db'
    with sqlite3.connect(database) as db:
        db.execute('CREATE TABLE questions (id INTEGER PRIMARY KEY, subject_id INTEGER, question_text TEXT, marks INTEGER)')
        db.execute('CREATE TABLE syllabus_units (id INTEGER PRIMARY KEY)')
        db.execute("INSERT INTO questions VALUES (1, 1, 'Explain mathematical induction.', 5)")
    run_migrations(database)
    run_migrations(database)
    with sqlite3.connect(database) as db:
        assert db.execute('SELECT question_text, review_status FROM questions').fetchone() == ('Explain mathematical induction.', 'DRAFT')


def test_faculty_cannot_approve_and_cannot_read_another_course(repository):
    from app.api.endpoints.auth import get_current_user
    from app.models.access import SubjectMembership
    client, payload, sessions = repository
    question = create(repository)
    with sessions() as db:
        faculty = User(email='faculty@example.edu', username='faculty-test', hashed_password='unused', full_name='Course Faculty', role='FACULTY', is_active=1)
        db.add(faculty); db.flush()
        db.add(SubjectMembership(user_id=faculty.id, subject_id=payload['subject_id']))
        other = Subject(code='PH102', name='Applied Physics', department='Physics', semester=1)
        db.add(other); db.commit()
        other_id = other.id
    client.app.dependency_overrides[get_current_user] = lambda: faculty
    base = f'/api/v1/questions/{question["id"]}'
    assert client.post(base + '/review', json={'status': 'REVIEWED', 'comment': 'Faculty checked solution'}).status_code == 200
    assert client.post(base + '/review', json={'status': 'APPROVED', 'comment': 'Unauthorized approval'}).status_code == 403
    assert client.get('/api/v1/questions/page', params={'subject_id': other_id}).status_code == 403
    assert client.get('/api/v1/questions', params={'subject_id': other_id}).status_code == 403


def test_cross_course_unit_cannot_be_assigned(repository):
    client, _, sessions = repository
    question = create(repository)
    with sessions() as db:
        other = Subject(code='PH102', name='Applied Physics', department='Physics', semester=1)
        other.units = [SyllabusUnit(unit_number=1, title='Wave optics')]
        db.add(other); db.commit()
        other_unit = other.units[0].id
    assert client.put(f'/api/v1/questions/{question["id"]}', json={'unit_id': other_unit}).status_code == 422
    assert client.post('/api/v1/questions/batch-assign', json={'question_ids': [question['id']], 'unit_id': other_unit}).status_code == 422


def test_batch_review_failure_is_atomic(repository):
    client, _, _ = repository
    first = create(repository)
    second = create(repository, question_text='Explain mathematical induction and its applications.')
    client.post(f'/api/v1/questions/{second["id"]}/review', json={'status': 'REVIEWED', 'comment': 'Verified content'})
    result = client.post('/api/v1/questions/batch-review', json={'question_ids': [first['id'], second['id']], 'status': 'REVIEWED', 'comment': 'Batch verification'})
    assert result.status_code == 409
    questions = {item['id']: item for item in client.get('/api/v1/questions/page').json()['items']}
    assert questions[first['id']]['review_status'] == 'DRAFT'


def test_composer_rejects_unapproved_pool(repository):
    client, payload, _ = repository
    create(repository)
    result = client.post('/api/v1/papers/generate', json={'subject_id': payload['subject_id']})
    assert result.status_code == 400
    assert 'approved' in result.json()['message']


def test_paper_download_and_swap_cannot_cross_courses(repository):
    import json
    from app.models.entities import GeneratedPaper, Question
    from app.models.access import SubjectMembership
    client, payload, sessions = repository
    own = create(repository)
    with sessions() as db:
        other = Subject(code='PH102', name='Applied Physics', department='Physics', semester=1)
        other.units = [SyllabusUnit(unit_number=1, title='Wave optics')]
        other.course_outcomes = [CourseOutcome(code='CO1', description='Apply wave theory', target_bloom_level='L3')]
        faculty = User(email='assigned@example.edu', username='assigned', hashed_password='unused', full_name='Course Faculty', role='FACULTY', is_active=1)
        db.add_all([other, faculty]); db.flush()
        db.add(SubjectMembership(user_id=faculty.id, subject_id=payload['subject_id']))
        other_question = Question(subject_id=other.id, unit_id=other.units[0].id, co_id=other.course_outcomes[0].id,
            question_text='Calculate the wavelength of a wave.', marks=2, bloom_level='L3', review_status='APPROVED')
        own_paper = GeneratedPaper(subject_id=payload['subject_id'], paper_code='TEST-OWN', title='Course examination',
            total_marks=2, duration_minutes=30, paper_data_json=json.dumps({'sections': [{'questions': [{'question_id': own['id'], 'marks': 2}]}]}))
        foreign_paper = GeneratedPaper(subject_id=other.id, paper_code='TEST-OTHER', title='Physics examination', total_marks=2, duration_minutes=30, paper_data_json='{}')
        db.add_all([other_question, own_paper, foreign_paper]); db.commit()
        own_paper_id, foreign_paper_id, replacement_id = own_paper.id, foreign_paper.id, other_question.id
    client.app.dependency_overrides[get_current_user] = lambda: faculty
    assert client.get(f'/api/v1/papers/{foreign_paper_id}/download-pdf').status_code == 403
    assert client.get(f'/api/v1/papers/{foreign_paper_id}').status_code == 403
    result = client.post('/api/v1/papers/swap', json={'paper_id': own_paper_id, 'current_question_id': own['id'], 'target_question_id': replacement_id})
    assert result.status_code == 400


@pytest.mark.parametrize('method,path,payload', [('get', '/questions', None), ('get', '/questions/page', None),
    ('get', '/subjects', None), ('get', '/papers', None), ('post', '/nlp/classify', {'question_text': 'Define induction.'}),
    ('post', '/nlp/validate-api-key', {'api_key': 'untrusted-key'})])
def test_domain_routers_require_authentication(repository, method, path, payload):
    from app.api.router import api_router
    client, _, sessions = repository
    isolated = FastAPI()
    isolated.include_router(api_router, prefix='/api/v1')
    def database():
        with sessions() as db:
            yield db
    isolated.dependency_overrides[get_db] = database
    with TestClient(isolated) as anonymous:
        result = getattr(anonymous, method)('/api/v1' + path, **({'json': payload} if payload else {}))
    assert result.status_code == 401


def test_first_edit_of_legacy_question_retains_original_snapshot(repository):
    from app.models.entities import Question
    client, payload, sessions = repository
    with sessions() as db:
        question = Question(**payload)
        db.add(question); db.commit()
        question_id = question.id
    response = client.put(f'/api/v1/questions/{question_id}', json={'question_text': 'Solve the equation $3x+4=10$.'})
    assert response.status_code == 200
    history = client.get(f'/api/v1/questions/{question_id}/history').json()
    assert history[0]['event_type'] == 'LEGACY_BASELINE'
    assert history[0]['question_text'] == payload['question_text']
    assert history[1]['question_text'] == 'Solve the equation $3x+4=10$.'
