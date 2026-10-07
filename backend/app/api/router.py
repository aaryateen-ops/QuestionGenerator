from fastapi import APIRouter
from app.api.endpoints import subjects, questions, nlp, papers, auth

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(subjects.router)
api_router.include_router(questions.router)
api_router.include_router(nlp.router)
api_router.include_router(papers.router)
