from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    department = Column(String(100), nullable=False)
    semester = Column(Integer, nullable=False)
    regulation = Column(String(50), nullable=False, default="Autonomous")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    units = relationship("SyllabusUnit", back_populates="subject", cascade="all, delete-orphan", order_by="SyllabusUnit.unit_number")
    course_outcomes = relationship("CourseOutcome", back_populates="subject", cascade="all, delete-orphan", order_by="CourseOutcome.code")
    questions = relationship("Question", back_populates="subject", cascade="all, delete-orphan")
    blueprints = relationship("ExamBlueprint", back_populates="subject", cascade="all, delete-orphan")
    papers = relationship("GeneratedPaper", back_populates="subject", cascade="all, delete-orphan")


class SyllabusUnit(Base):
    __tablename__ = "syllabus_units"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_number = Column(Integer, nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    topics = Column(Text, nullable=True) # e.g. "Arrays, Linked Lists, Stacks, Queues"

    # Relationships
    subject = relationship("Subject", back_populates="units")
    questions = relationship("Question", back_populates="unit", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_subject_unit", "subject_id", "unit_number", unique=True),
    )


class CourseOutcome(Base):
    __tablename__ = "course_outcomes"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(20), nullable=False) # e.g. CO1, CO2
    description = Column(Text, nullable=False)
    target_bloom_level = Column(String(10), nullable=False) # e.g. L2, L3, L4

    # Relationships
    subject = relationship("Subject", back_populates="course_outcomes")
    questions = relationship("Question", back_populates="course_outcome")

    __table_args__ = (
        Index("idx_subject_co", "subject_id", "code", unique=True),
    )


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(Integer, ForeignKey("syllabus_units.id", ondelete="CASCADE"), nullable=False, index=True)
    co_id = Column(Integer, ForeignKey("course_outcomes.id", ondelete="CASCADE"), nullable=False, index=True)
    
    question_text = Column(Text, nullable=False)
    marks = Column(Integer, nullable=False) # 1, 2, 5, 8, 10, 12, 16
    bloom_level = Column(String(10), nullable=False, index=True) # L1, L2, L3, L4, L5, L6
    difficulty = Column(String(20), nullable=False, index=True, default="MEDIUM") # EASY, MEDIUM, HARD
    question_type = Column(String(20), nullable=False, default="SHORT", index=True) # MCQ, SHORT, LONG
    options = Column(Text, nullable=True) # JSON array/object of options for MCQ: {"A":"..","B":"..","C":"..","D":".."}
    correct_answer = Column(String(50), nullable=True) # e.g. "A" or option text
    
    # NLP Engine Analysis Metadata
    action_verb = Column(String(50), nullable=True)
    confidence_score = Column(Float, nullable=False, default=1.0)
    usage_count = Column(Integer, nullable=False, default=0)
    review_status = Column(String(20), nullable=False, default='DRAFT', server_default='DRAFT', index=True)
    text_fingerprint = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    subject = relationship("Subject", back_populates="questions")
    unit = relationship("SyllabusUnit", back_populates="questions")
    course_outcome = relationship("CourseOutcome", back_populates="questions")
    review_events = relationship('QuestionReviewEvent', cascade='all, delete-orphan')

    __table_args__ = (
        Index("idx_question_filters", "subject_id", "unit_id", "bloom_level", "difficulty"),
        Index('idx_question_fingerprint', 'subject_id', 'text_fingerprint', unique=True),
    )


class QuestionReviewEvent(Base):
    __tablename__ = 'question_review_events'

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey('questions.id', ondelete='CASCADE'), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reviewer_name = Column(String(150), nullable=False)
    event_type = Column(String(20), nullable=False)
    from_status = Column(String(20), nullable=False)
    to_status = Column(String(20), nullable=False)
    comment = Column(Text, nullable=False)
    question_text = Column(Text, nullable=False)
    marks = Column(Integer, nullable=False)
    bloom_level = Column(String(10), nullable=False)
    difficulty = Column(String(20), nullable=False)
    question_type = Column(String(20), nullable=False)
    options = Column(Text, nullable=True)
    correct_answer = Column(String(50), nullable=True)
    unit_id = Column(Integer, nullable=False)
    co_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class ExamBlueprint(Base):
    __tablename__ = "exam_blueprints"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    exam_type = Column(String(50), nullable=False, default="END_SEM") # END_SEM, MID_SEM, CUSTOM
    total_marks = Column(Integer, nullable=False, default=70)
    duration_minutes = Column(Integer, nullable=False, default=180)
    
    # Serialized configurations
    sections_config_json = Column(Text, nullable=False)
    bloom_distribution_json = Column(Text, nullable=False)
    difficulty_distribution_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", back_populates="blueprints")


class GeneratedPaper(Base):
    __tablename__ = "generated_papers"

    id = Column(Integer, primary_key=True, index=True)
    blueprint_id = Column(Integer, ForeignKey("exam_blueprints.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    paper_code = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    academic_year = Column(String(30), nullable=False, default="2025-2026")
    semester_label = Column(String(50), nullable=False, default="B.Tech IV Year I Semester")
    total_marks = Column(Integer, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    status = Column(String(30), nullable=False, default="DRAFT") # DRAFT, APPROVED, EXPORTED
    
    # Structured full JSON payload containing Part A, Part B, statistics, and CO attainment summary
    paper_data_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", back_populates="papers")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), nullable=False, default="FACULTY", index=True) # ADMIN, FACULTY
    department = Column(String(100), nullable=True)
    is_active = Column(Integer, nullable=False, default=1) # 1: Active, 0: Disabled
    created_at = Column(DateTime, default=datetime.utcnow)
