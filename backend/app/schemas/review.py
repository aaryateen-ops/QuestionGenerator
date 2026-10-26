from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.dtos import QuestionResponse

ReviewStatus = Literal['DRAFT', 'REVIEWED', 'APPROVED']


class ReviewRequest(BaseModel):
    status: ReviewStatus
    comment: str = Field(min_length=3, max_length=2000)


class BatchReviewRequest(ReviewRequest):
    question_ids: list[int] = Field(min_length=1, max_length=100)


class QuestionPage(BaseModel):
    items: list[QuestionResponse]
    total: int
    page: int
    page_size: int
    counts: dict[str, int]


class ReviewEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    from_status: str
    to_status: str
    event_type: str
    comment: str
    reviewer_name: str
    created_at: datetime
    question_text: str
    marks: int
    bloom_level: str
    difficulty: str
    question_type: str
    options: Optional[str] = None
    correct_answer: Optional[str] = None


class DuplicateRequest(BaseModel):
    subject_id: int = Field(ge=1)
    question_text: str = Field(min_length=5, max_length=20000)
    exclude_id: Optional[int] = None
