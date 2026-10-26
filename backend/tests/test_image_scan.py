import asyncio
import io
import json

import httpx
import pytest
from PIL import Image

from app.core.errors import AppException
from app.engine.llm_synthesizer import LLMQuestionSynthesizer


def png_bytes():
    output = io.BytesIO()
    Image.new('RGB', (100, 100), 'white').save(output, format='PNG')
    return output.getvalue()


def test_image_validation_rejects_disguised_document():
    from app.engine.image_validation import validate_image
    with pytest.raises(AppException) as error:
        validate_image(b'%PDF-content', 'image/png')
    assert error.value.status_code == 422


def test_image_validation_preserves_valid_png():
    from app.engine.image_validation import validate_image
    image = png_bytes()
    assert validate_image(image, 'image/png') == (image, 'image/png')


def test_image_validation_rejects_size_boundary():
    from app.engine.image_validation import validate_image
    with pytest.raises(AppException) as error:
        validate_image(b'x' * (10 * 1024 * 1024), 'image/png')
    assert error.value.status_code == 413


def scan(monkeypatch, response, status=200, mode='EXTRACT'):
    original_client = httpx.AsyncClient

    def handler(request):
        body = json.loads(request.content)
        assert body['contents'][0]['parts'][1]['inline_data']['mime_type'] == 'image/png'
        assert request.headers['x-goog-api-key'] == 'test-key'
        assert 'test-key' not in str(request.url)
        return httpx.Response(status, json=response)

    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kw: original_client(
        transport=httpx.MockTransport(handler), **kw))
    return asyncio.run(LLMQuestionSynthesizer.extract_or_synthesize_from_image(
        png_bytes(), 'image/png', mode, None, 'L3', 2, 'SHORT', 1, 'test-key', None))


def response_for(items):
    return {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [
        {'text': json.dumps(items)}]}}]}


def test_extract_preserves_formula_marks_and_unknown_answer(monkeypatch):
    questions, _ = scan(monkeypatch, response_for([{
        'question_text': r'Solve $x^2 + \frac{1}{2} = 4$.',
        'question_type': 'MCQ', 'marks': 5,
        'options': {'A': '$1$', 'B': '$2$', 'C': '$3$', 'D': '$4$'},
    }]))
    assert questions[0]['question_text'] == r'Solve $x^2 + \frac{1}{2} = 4$.'
    assert questions[0]['marks'] == 5
    assert questions[0]['correct_answer'] is None
    assert questions[0]['bloom_level'] == 'L3'


@pytest.mark.parametrize('payload', [response_for([]), response_for([{'question_text': ''}]),
                                      {'candidates': []}])
def test_unreadable_image_never_falls_back_to_invented_questions(monkeypatch, payload):
    with pytest.raises(AppException) as error:
        scan(monkeypatch, payload)
    assert error.value.status_code == 422


def test_provider_rate_limit_is_actionable(monkeypatch):
    with pytest.raises(AppException) as error:
        scan(monkeypatch, {}, status=429)
    assert error.value.status_code == 429


def test_missing_key_fails_before_network(monkeypatch):
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    with pytest.raises(AppException) as error:
        asyncio.run(LLMQuestionSynthesizer.extract_or_synthesize_from_image(
            png_bytes(), 'image/png', 'EXTRACT', None, 'L3', 2, 'SHORT', 1, None, None))
    assert error.value.error_code == 'VISION_KEY_REQUIRED'


@pytest.mark.parametrize('payload', [None, {'candidates': [None]}, response_for([
    {'question_text': r'Solve \\(x^2 = 4\\)', 'question_type': 'SHORT', 'marks': 0}]),
    response_for([{'question_text': 'Solve $x^2 = 4', 'question_type': 'SHORT'}])])
def test_malformed_or_uncertain_transcriptions_are_rejected(monkeypatch, payload):
    with pytest.raises(AppException) as error:
        scan(monkeypatch, payload)
    assert error.value.status_code in (422, 502)


def test_synthesis_respects_requested_marks(monkeypatch):
    questions, _ = scan(monkeypatch, response_for([{
        'question_text': 'Calculate $x$ when $2x=10$.', 'question_type': 'SHORT', 'marks': 10,
    }]), mode='SYNTHESIZE')
    assert questions[0]['marks'] == 2


def test_synthesis_rejects_wrong_cognitive_level(monkeypatch):
    with pytest.raises(AppException) as error:
        scan(monkeypatch, response_for([{
            'question_text': 'Define a quadratic equation.', 'question_type': 'SHORT',
        }]), mode='SYNTHESIZE')
    assert error.value.error_code == 'VISION_ALIGNMENT_FAILED'


def test_explicit_math_delimiters_are_normalized_without_changing_formula(monkeypatch):
    questions, _ = scan(monkeypatch, response_for([{
        'question_text': r'Calculate \(\frac{1}{2}\) and $$x^2$$.', 'question_type': 'SHORT',
    }]))
    assert questions[0]['question_text'] == r'Calculate $\frac{1}{2}$ and $x^2$.'


@pytest.fixture
def scan_client():
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    from fastapi.testclient import TestClient
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from app.api.endpoints.nlp import router
    from app.db.session import Base, get_db
    from app.models.entities import Subject, SyllabusUnit, CourseOutcome

    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory() as db:
        subject = Subject(id=1, code='MA101', name='Algebra', department='Mathematics', semester=1)
        subject.units = [SyllabusUnit(unit_number=1, title='Quadratic equations', topics='quadratic roots')]
        subject.course_outcomes = [CourseOutcome(code='CO1', description='Solve quadratic equations', target_bloom_level='L3')]
        db.add(subject)
        db.commit()

    def database():
        with factory() as db:
            yield db

    app = FastAPI()
    app.include_router(router, prefix='/api/v1')
    app.dependency_overrides[get_db] = database
    from app.api.endpoints.auth import get_current_user
    from types import SimpleNamespace
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1, role='ADMIN')

    @app.exception_handler(AppException)
    async def errors(request: Request, exc: AppException):
        return JSONResponse(status_code=exc.status_code, content={'message': exc.message, 'error_code': exc.error_code})

    with TestClient(app) as client:
        yield client
    engine.dispose()


@pytest.mark.parametrize('fields,status', [({'mode': 'OTHER'}, 422), ({'marks': 0}, 422),
    ({'count': 21}, 422), ({'subject_id': 999}, 404), ({'subject_id': 1, 'unit_number': 99}, 404)])
def test_endpoint_rejects_invalid_scan_settings(scan_client, fields, status):
    result = scan_client.post('/api/v1/nlp/scan-image', data=fields,
                              files={'file': ('question.png', png_bytes(), 'image/png')})
    assert result.status_code == status


def test_endpoint_classifies_and_maps_without_saving(scan_client, monkeypatch):
    original_client = httpx.AsyncClient
    payload = response_for([{'question_text': 'Solve the quadratic equation $x^2-4=0$.',
                             'question_type': 'SHORT', 'marks': 5}])
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kw: original_client(
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json=payload)), **kw))
    response = scan_client.post('/api/v1/nlp/scan-image', data={'subject_id': 1, 'api_key': 'test-key'},
                               files={'file': ('question.png', png_bytes(), 'image/png')})
    assert response.status_code == 200, response.text
    question = response.json()['questions'][0]
    assert question['suggested_co_code'] == 'CO1'
    assert question['suggested_unit_number'] == 1
    assert question['marks'] == 5
    assert question['bloom_level'] == 'L3'


@pytest.mark.parametrize('mime,format_name', [('image/jpeg', 'JPEG'), ('image/webp', 'WEBP'), ('image/heic', 'HEIF')])
def test_supported_image_formats_decode(mime, format_name):
    from app.engine.image_validation import validate_image
    output = io.BytesIO()
    Image.new('RGB', (64, 64), 'white').save(output, format=format_name)
    data = output.getvalue()
    assert validate_image(data, mime) == (data, mime)


def test_endpoint_rejects_mime_spoof(scan_client):
    response = scan_client.post('/api/v1/nlp/scan-image', data={'api_key': 'test-key'},
        files={'file': ('question.png', b'%PDF-fake', 'image/png')})
    assert response.status_code == 422
    assert response.json()['error_code'] == 'IMAGE_INVALID'


def test_document_ingestion_still_reads_docx_and_pdf():
    from docx import Document
    from reportlab.pdfgen.canvas import Canvas
    from app.engine.document_parser import DocumentQuestionParser
    text = 'Explain the principle of mathematical induction and its applications.'
    document = Document()
    document.add_paragraph(text)
    docx = io.BytesIO()
    document.save(docx)
    assert text in DocumentQuestionParser.extract_raw_text(docx.getvalue(), 'notes.docx')
    pdf = io.BytesIO()
    canvas = Canvas(pdf)
    canvas.drawString(30, 700, text)
    canvas.save()
    assert text in DocumentQuestionParser.extract_raw_text(pdf.getvalue(), 'notes.pdf')


def test_text_synthesis_still_works_without_vision_key(monkeypatch):
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    result = asyncio.run(LLMQuestionSynthesizer.generate_questions(
        topic='Mathematical induction', bloom_level='L2', marks=2, count=2))
    assert len(result['questions']) == 2
    assert all('Mathematical induction' in q['question_text'] for q in result['questions'])
