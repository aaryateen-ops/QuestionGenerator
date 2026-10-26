from collections import Counter


def answerable_marks(sections):
    total = 0
    for section in sections:
        groups = set()
        for question in section.get('questions', []):
            group = question.get('choice_group') if question.get('is_choice') else None
            if group and group in groups:
                continue
            if group:
                groups.add(group)
            total += question.get('marks', 0)
    return total


def assess_paper(data, current_questions):
    questions = [question for section in data.get('sections', []) for question in section.get('questions', [])]
    computed = answerable_marks(data.get('sections', []))
    declared = data.get('total_marks', 0)
    warnings = []
    if computed != declared:
        warnings.append(f'Marks mismatch: the header declares {declared}, but answerable questions total {computed}.')
    ids = [question.get('question_id') for question in questions]
    if len(set(ids)) != len(ids):
        warnings.append('A repository question appears more than once in this paper.')
    approved = 0
    for question in questions:
        current = current_questions.get(question.get('question_id'))
        if current and current.review_status == 'APPROVED':
            approved += 1
            if any(getattr(current, key) != question.get(key) for key in ('question_text', 'marks', 'question_type', 'options', 'correct_answer')):
                warnings.append(f'Question {question.get("q_number", question.get("question_id"))} differs from its currently approved repository version.')
        elif current:
            warnings.append(f'Question {question.get("q_number", question.get("question_id"))} is currently {current.review_status.lower()}; review before releasing this saved paper.')
        else:
            warnings.append(f'Question {question.get("q_number", question.get("question_id"))} is no longer available in this course repository.')
    for section in data.get('sections', []):
        if answerable_marks([section]) != section.get('total_marks'):
            warnings.append(f'{section.get("name", "Section")} has an inconsistent marks subtotal.')
        choices = {}
        for question in section.get('questions', []):
            if question.get('is_choice'):
                choices.setdefault(question.get('choice_group'), []).append(question.get('marks'))
        if any(not group or len(marks) < 2 or len(set(marks)) != 1 for group, marks in choices.items()):
            warnings.append(f'{section.get("name", "Section")} contains an incomplete or unequal internal choice.')
    return {'declared_marks': declared, 'computed_marks': computed, 'question_count': len(questions),
            'approved_count': approved, 'warnings': list(dict.fromkeys(warnings)), 'ready': not warnings,
            'unit_coverage': dict(Counter(str(question.get('unit_number', '?')) for question in questions)),
            'bloom_counts': dict(Counter(question.get('bloom_level', '?') for question in questions)),
            'co_counts': dict(Counter(question.get('co_code', '?') for question in questions))}
