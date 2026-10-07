import pytest
from app.engine.paper_composer import PaperComposerEngine
from app.db.seed_data import AUTHENTIC_SEED_DATA

@pytest.fixture
def question_pool():
    # Build a simulated pool based on authentic seed data
    pool = []
    q_id = 1
    for q in AUTHENTIC_SEED_DATA["questions"]:
        pool.append({
            "id": q_id,
            "unit_number": q["unit"],
            "co_code": f"CO{q['unit']}",
            "question_text": q["text"],
            "marks": q["marks"],
            "bloom_level": "L2" if q["marks"] == 2 else "L4",
            "difficulty": q["difficulty"],
            "usage_count": 0
        })
        q_id += 1
    return pool

def test_autonomous_70m_paper_composition(question_pool):
    subject = {
        "code": "CS8491",
        "name": "Data Structures and Algorithms",
        "department": "Artificial Intelligence & Data Science",
        "regulation": "Autonomous"
    }
    blueprint = {
        "title": "Semester End Examination",
        "academic_year": "2025-2026",
        "semester_label": "B.Tech IV Year I Semester",
        "exam_type": "END_SEM",
        "total_marks": 70,
        "duration_minutes": 180,
        "units_included": [1, 2, 3, 4, 5]
    }

    paper = PaperComposerEngine.compose_paper(
        subject=subject,
        question_pool=question_pool,
        blueprint=blueprint
    )

    assert paper["total_marks"] == 70
    assert len(paper["sections"]) == 2

    # Part A verification
    part_a = paper["sections"][0]
    assert part_a["name"] == "PART - A"
    assert part_a["total_marks"] == 20
    assert len(part_a["questions"]) == 10
    for q in part_a["questions"]:
        assert q["marks"] == 2

    # Part B verification
    part_b = paper["sections"][1]
    assert part_b["name"] == "PART - B"
    assert part_b["total_marks"] == 50
    # 5 pairs of either/or = 10 questions total in Part B
    assert len(part_b["questions"]) == 10
    for q in part_b["questions"]:
        assert q["marks"] == 10
        assert q["is_choice"] is True
        assert q["choice_group"] is not None

    # Verify zero duplicate questions
    all_q_ids = [q["question_id"] for q in part_a["questions"]] + [q["question_id"] for q in part_b["questions"]]
    assert len(all_q_ids) == len(set(all_q_ids)), "Duplicate question IDs detected in generated paper!"

    # Verify unit coverage in Part A: each unit must appear exactly twice
    part_a_units = [q["unit_number"] for q in part_a["questions"]]
    for u in [1, 2, 3, 4, 5]:
        assert part_a_units.count(u) == 2, f"Unit {u} was not represented exactly twice in Part A"

def test_swap_candidates_search(question_pool):
    current_q = {
        "question_id": 1,
        "unit_number": 1,
        "marks": 2,
        "bloom_level": "L2",
        "co_code": "CO1"
    }
    existing_ids = {1, 2, 3}

    candidates = PaperComposerEngine.find_swap_candidates(
        current_question=current_q,
        question_pool=question_pool,
        existing_paper_question_ids=existing_ids
    )

    assert len(candidates) > 0
    for c in candidates:
        assert c["question_id"] not in existing_ids
        assert c["unit_number"] == 1
        assert c["marks"] == 2
