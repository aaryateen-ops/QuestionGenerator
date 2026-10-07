from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.entities import Subject, SyllabusUnit, CourseOutcome, Question
from app.schemas.dtos import (
    SubjectResponse, SubjectDetailResponse, SubjectCreate, SubjectUpdate,
    UnitResponse, UnitCreate, UnitUpdate, COResponse, COCreate, COUpdate
)
from app.core.errors import NotFoundException, ValidationException

router = APIRouter(prefix="/subjects", tags=["Subjects & Syllabus"])

@router.get("", response_model=List[SubjectResponse])
def list_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.code).all()

@router.get("/{subject_id}", response_model=SubjectDetailResponse)
def get_subject_detail(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise NotFoundException("Subject", subject_id)
    
    q_count = db.query(Question).filter(Question.subject_id == subject_id).count()
    return SubjectDetailResponse(
        id=subject.id,
        code=subject.code,
        name=subject.name,
        department=subject.department,
        semester=subject.semester,
        regulation=subject.regulation,
        created_at=subject.created_at,
        units=[UnitResponse.model_validate(u) for u in subject.units],
        course_outcomes=[COResponse.model_validate(c) for c in subject.course_outcomes],
        question_count=q_count
    )

@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Subject).filter(Subject.code == payload.code.upper()).first()
    if existing:
        raise ValidationException(f"Subject with code '{payload.code.upper()}' already exists.")
    
    subj = Subject(
        code=payload.code.upper(),
        name=payload.name,
        department=payload.department,
        semester=payload.semester,
        regulation=payload.regulation
    )
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj

@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(subject_id: int, payload: SubjectUpdate, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise NotFoundException("Subject", subject_id)

    if payload.name is not None:
        subj.name = payload.name
    if payload.department is not None:
        subj.department = payload.department
    if payload.semester is not None:
        subj.semester = payload.semester
    if payload.regulation is not None:
        subj.regulation = payload.regulation

    db.commit()
    db.refresh(subj)
    return subj

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise NotFoundException("Subject", subject_id)
    db.delete(subj)
    db.commit()
    return None

@router.post("/{subject_id}/units", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
def add_unit(subject_id: int, payload: UnitCreate, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise NotFoundException("Subject", subject_id)
    
    existing = db.query(SyllabusUnit).filter(
        SyllabusUnit.subject_id == subject_id,
        SyllabusUnit.unit_number == payload.unit_number
    ).first()
    if existing:
        raise ValidationException(f"Unit {payload.unit_number} already exists for this subject.")

    unit = SyllabusUnit(
        subject_id=subject_id,
        unit_number=payload.unit_number,
        title=payload.title,
        description=payload.description,
        topics=payload.topics
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit

@router.put("/{subject_id}/units/{unit_id}", response_model=UnitResponse)
def update_unit(subject_id: int, unit_id: int, payload: UnitUpdate, db: Session = Depends(get_db)):
    unit = db.query(SyllabusUnit).filter(
        SyllabusUnit.id == unit_id,
        SyllabusUnit.subject_id == subject_id
    ).first()
    if not unit:
        raise NotFoundException("SyllabusUnit", unit_id)

    if payload.title is not None:
        unit.title = payload.title
    if payload.description is not None:
        unit.description = payload.description
    if payload.topics is not None:
        unit.topics = payload.topics

    db.commit()
    db.refresh(unit)
    return unit

@router.delete("/{subject_id}/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(subject_id: int, unit_id: int, db: Session = Depends(get_db)):
    unit = db.query(SyllabusUnit).filter(
        SyllabusUnit.id == unit_id,
        SyllabusUnit.subject_id == subject_id
    ).first()
    if not unit:
        raise NotFoundException("SyllabusUnit", unit_id)
    db.delete(unit)
    db.commit()
    return None

@router.post("/{subject_id}/cos", response_model=COResponse, status_code=status.HTTP_201_CREATED)
def add_course_outcome(subject_id: int, payload: COCreate, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise NotFoundException("Subject", subject_id)
    
    co = CourseOutcome(
        subject_id=subject_id,
        code=payload.code.upper(),
        description=payload.description,
        target_bloom_level=payload.target_bloom_level
    )
    db.add(co)
    db.commit()
    db.refresh(co)
    return co

@router.put("/{subject_id}/cos/{co_id}", response_model=COResponse)
def update_course_outcome(subject_id: int, co_id: int, payload: COUpdate, db: Session = Depends(get_db)):
    co = db.query(CourseOutcome).filter(
        CourseOutcome.id == co_id,
        CourseOutcome.subject_id == subject_id
    ).first()
    if not co:
        raise NotFoundException("CourseOutcome", co_id)

    if payload.description is not None:
        co.description = payload.description
    if payload.target_bloom_level is not None:
        co.target_bloom_level = payload.target_bloom_level

    db.commit()
    db.refresh(co)
    return co

@router.delete("/{subject_id}/cos/{co_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course_outcome(subject_id: int, co_id: int, db: Session = Depends(get_db)):
    co = db.query(CourseOutcome).filter(
        CourseOutcome.id == co_id,
        CourseOutcome.subject_id == subject_id
    ).first()
    if not co:
        raise NotFoundException("CourseOutcome", co_id)
    db.delete(co)
    db.commit()
    return None
