from pydantic import BaseModel, Field
from app.schemas.dtos import UserRegisterRequest

class UserProvisionRequest(UserRegisterRequest):
    pass

class SubjectAssignmentRequest(BaseModel):
    subject_ids: list[int] = Field(default_factory=list, max_length=1000)
