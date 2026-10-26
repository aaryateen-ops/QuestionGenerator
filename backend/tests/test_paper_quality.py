from types import SimpleNamespace

from app.services.paper_quality import answerable_marks, assess_paper


def test_internal_choices_count_once():
    sections = [{'total_marks': 12, 'questions': [
        {'marks': 2}, {'marks': 10, 'is_choice': True, 'choice_group': 'Q2'},
        {'marks': 10, 'is_choice': True, 'choice_group': 'Q2'}]}]
    assert answerable_marks(sections) == 12


def test_quality_report_detects_unapproved_snapshot_and_marks():
    question = {'question_id': 1, 'q_number': '1', 'question_text': 'Explain induction.',
                'marks': 5, 'question_type': 'SHORT', 'options': None, 'correct_answer': None}
    data = {'total_marks': 10, 'sections': [{'name': 'Part A', 'total_marks': 5, 'questions': [question]}]}
    report = assess_paper(data, {1: SimpleNamespace(review_status='DRAFT')})
    assert report['computed_marks'] == 5
    assert report['approved_count'] == 0
    assert not report['ready']
    assert len(report['warnings']) == 2


def test_quality_report_accepts_current_approved_question():
    question = {'question_id': 1, 'q_number': '1', 'question_text': 'Explain induction.',
                'marks': 5, 'question_type': 'SHORT', 'options': None, 'correct_answer': None}
    data = {'total_marks': 5, 'sections': [{'name': 'Part A', 'total_marks': 5, 'questions': [question]}]}
    report = assess_paper(data, {1: SimpleNamespace(review_status='APPROVED', **question)})
    assert report['ready']
