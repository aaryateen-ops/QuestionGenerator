from sqlalchemy import Column, Integer, ForeignKey
from app.db.session import Base

class SubjectMembership(Base):
    __tablename__ = "subject_memberships"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True)
