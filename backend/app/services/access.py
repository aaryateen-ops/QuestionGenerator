from fastapi import HTTPException
from app.models.access import SubjectMembership

def accessible_subject_ids(db, user):
    if user.role == "ADMIN":
        return None
    return [row[0] for row in db.query(SubjectMembership.subject_id).filter(SubjectMembership.user_id == user.id).all()]

def require_subject_access(db, user, subject_id):
    if user.role != "ADMIN" and not db.query(SubjectMembership).filter_by(user_id=user.id, subject_id=subject_id).first():
        raise HTTPException(status_code=403, detail="You are not assigned to this subject.")
