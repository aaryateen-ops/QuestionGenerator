from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# ==========================================
# Syllabus Units & Course Outcomes
# ==========================================

class UnitBase(BaseModel):
    unit_number: int = Field(..., ge=1, le=10)
    title: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    topics: Optional[str] = None

class UnitCreate(UnitBase):
    pass

class UnitUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    topics: Optional[str] = None

class UnitResponse(UnitBase):
    id: int
    subject_id: int
    model_config = ConfigDict(from_attributes=True)


class COBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=20)
    description: str = Field(..., min_length=5)
    target_bloom_level: str = Field(..., pattern="^L[1-6]$")

class COCreate(COBase):
    pass

class COUpdate(BaseModel):
    description: Optional[str] = None
    target_bloom_level: Optional[str] = None

class COResponse(COBase):
    id: int
    subject_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Subjects
# ==========================================

class SubjectBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=30)
    name: str = Field(..., min_length=3, max_length=150)
    department: str = Field(..., min_length=2, max_length=100)
    semester: int = Field(..., ge=1, le=8)
    regulation: str = Field(default="Autonomous", max_length=50)

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    regulation: Optional[str] = None

class SubjectResponse(SubjectBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SubjectDetailResponse(SubjectResponse):
    units: List[UnitResponse] = []
    course_outcomes: List[COResponse] = []
    question_count: int = 0


# ==========================================
# Questions
# ==========================================

class QuestionBase(BaseModel):
    subject_id: int
    unit_id: int
    co_id: int
    question_text: str = Field(..., min_length=5)
    marks: int = Field(..., ge=1, le=30)
    bloom_level: str = Field(..., pattern="^L[1-6]$")
    difficulty: str = Field(default="MEDIUM", pattern="^(EASY|MEDIUM|HARD)$")
    question_type: str = Field(default="SHORT", pattern="^(MCQ|SHORT|LONG)$")
    options: Optional[str] = None
    correct_answer: Optional[str] = None

class QuestionCreate(QuestionBase):
    action_verb: Optional[str] = None
    confidence_score: Optional[float] = 1.0

class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    marks: Optional[int] = None
    bloom_level: Optional[str] = None
    difficulty: Optional[str] = None
    question_type: Optional[str] = None
    options: Optional[str] = None
    correct_answer: Optional[str] = None
    unit_id: Optional[int] = None
    co_id: Optional[int] = None

class QuestionResponse(QuestionBase):
    id: int
    action_verb: Optional[str] = None
    confidence_score: float
    usage_count: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class BatchDeleteRequest(BaseModel):
    question_ids: List[int]


class BatchAssignRequest(BaseModel):
    question_ids: List[int]
    unit_id: Optional[int] = None
    co_id: Optional[int] = None


# ==========================================
# NLP Engine Schemas
# ==========================================

class NLPClassifyRequest(BaseModel):
    question_text: str = Field(..., min_length=4)
    subject_id: Optional[int] = None

class NLPVerbMatch(BaseModel):
    verb: str
    bloom_level: str
    level_name: str
    weight: float

class NLPClassifyResponse(BaseModel):
    question_text: str
    detected_verbs: List[NLPVerbMatch]
    primary_verb: Optional[str]
    predicted_bloom_level: str
    level_name: str
    confidence_score: float
    rationale: str
    suggested_co_code: Optional[str] = None
    suggested_unit_number: Optional[int] = None


class BulkImportItem(BaseModel):
    question_text: str
    marks: int
    unit_number: int
    co_code: Optional[str] = None
    bloom_level: Optional[str] = None
    difficulty: Optional[str] = "MEDIUM"
    question_type: Optional[str] = "SHORT"
    options: Optional[str] = None
    correct_answer: Optional[str] = None

class BulkImportRequest(BaseModel):
    subject_id: int
    questions: List[BulkImportItem]

class BulkImportResponse(BaseModel):
    total_received: int
    imported_count: int
    classified_count: int
    errors: List[str] = []


class ValidateApiKeyRequest(BaseModel):
    api_key: str = Field(..., min_length=8)

class ValidateApiKeyResponse(BaseModel):
    valid: bool
    model: str = "gemini-3.6-flash"
    message: Optional[str] = None
    error: Optional[str] = None

class SynthesizeQuestionRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=500)
    bloom_level: str = Field(default="L3", pattern="^L[1-6]$")
    marks: int = Field(default=2, ge=1, le=30)
    difficulty: str = Field(default="MEDIUM", pattern="^(EASY|MEDIUM|HARD)$")
    question_type: str = Field(default="SHORT", pattern="^(MCQ|SHORT|LONG)$")
    count: int = Field(default=2, ge=1, le=10)
    api_key: Optional[str] = None
    subject_id: Optional[int] = None
    unit_number: Optional[int] = None
    context_text: Optional[str] = None

class SynthesizedQuestionItem(BaseModel):
    question_text: str
    marks: int
    bloom_level: str
    difficulty: str
    question_type: str = "SHORT"
    options: Optional[str] = None
    correct_answer: Optional[str] = None
    action_verb: Optional[str] = None
    confidence_score: float = 1.0
    source: str = "AI Cognitive Synthesizer"
    suggested_co_code: Optional[str] = "CO1"
    suggested_unit_number: Optional[int] = 1

class SynthesizeQuestionResponse(BaseModel):
    topic: str
    target_bloom: str
    engine_used: str = "Academic Scenario Generator"
    gemini_error: Optional[str] = None
    questions: List[SynthesizedQuestionItem]


# ==========================================
# Exam Blueprint & Paper Generation
# ==========================================

class BloomDistribution(BaseModel):
    L1: float = Field(default=15.0, ge=0, le=100)
    L2: float = Field(default=20.0, ge=0, le=100)
    L3: float = Field(default=30.0, ge=0, le=100)
    L4: float = Field(default=20.0, ge=0, le=100)
    L5: float = Field(default=10.0, ge=0, le=100)
    L6: float = Field(default=5.0, ge=0, le=100)

class DifficultyDistribution(BaseModel):
    EASY: float = Field(default=30.0, ge=0, le=100)
    MEDIUM: float = Field(default=50.0, ge=0, le=100)
    HARD: float = Field(default=20.0, ge=0, le=100)

class GeneratePaperRequest(BaseModel):
    subject_id: int
    title: str = Field(default="Semester End Examination")
    academic_year: str = Field(default="2025-2026")
    semester_label: str = Field(default="B.Tech IV Year I Semester")
    exam_type: str = Field(default="END_SEM", pattern="^(END_SEM|MID_SEM|END_SEM_100|QUIZ_MCQ|CUSTOM)$")
    total_marks: int = Field(default=70, ge=10, le=150)
    duration_minutes: int = Field(default=180, ge=30, le=240)
    part_a_type: str = Field(default="SHORT", pattern="^(SHORT|MCQ|MIXED)$")
    include_part_c: bool = Field(default=False)
    bloom_distribution: BloomDistribution = Field(default_factory=BloomDistribution)
    difficulty_distribution: DifficultyDistribution = Field(default_factory=DifficultyDistribution)
    units_included: List[int] = Field(default=[1, 2, 3, 4, 5])

class PaperQuestionDTO(BaseModel):
    question_id: int
    q_number: str
    question_text: str
    marks: int
    bloom_level: str
    difficulty: str
    question_type: str = "SHORT"
    options: Optional[str] = None
    correct_answer: Optional[str] = None
    unit_number: int
    co_code: str
    is_choice: bool = False
    choice_group: Optional[str] = None # e.g. "Q11_OR"
    choice_option: Optional[str] = None # "A" or "B"

class PaperSectionDTO(BaseModel):
    name: str # e.g. "PART - A", "PART - B"
    description: str # "Answer all questions. (10 x 2 = 20 Marks)"
    total_marks: int
    questions: List[PaperQuestionDTO]

class GeneratedPaperResponse(BaseModel):
    id: int
    paper_code: str
    title: str
    subject_code: str
    subject_name: str
    department: str
    academic_year: str
    semester_label: str
    regulation: str
    total_marks: int
    duration_minutes: int
    status: str
    created_at: datetime
    sections: List[PaperSectionDTO]
    bloom_analysis: Dict[str, Any]
    co_attainment: Dict[str, Any]
    difficulty_analysis: Dict[str, Any]

class SwapQuestionRequest(BaseModel):
    paper_id: int
    current_question_id: int
    target_question_id: int

class CandidateQuestionResponse(BaseModel):
    question_id: int
    question_text: str
    marks: int
    bloom_level: str
    difficulty: str
    question_type: str = "SHORT"
    options: Optional[str] = None
    correct_answer: Optional[str] = None
    unit_number: int
    co_code: str
    match_score: float


# ==========================================
# User Authentication & RBAC
# ==========================================

class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=150)
    role: str = Field(default="FACULTY", pattern="^(ADMIN|FACULTY)$")
    department: Optional[str] = "Computer Science & Engineering"

class UserLoginRequest(BaseModel):
    username_or_email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    department: Optional[str] = None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    user: UserResponse

class UserUpdateRoleRequest(BaseModel):
    role: Optional[str] = Field(default=None, pattern="^(ADMIN|FACULTY)$")
    is_active: Optional[bool] = None
