from fastapi import APIRouter, Depends
from app.api.endpoints import subjects, questions, nlp, papers, auth

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(subjects.router, dependencies=[Depends(auth.get_current_user)])
api_router.include_router(questions.router, dependencies=[Depends(auth.get_current_user)])
api_router.include_router(nlp.router, dependencies=[Depends(auth.get_current_user)])
api_router.include_router(papers.router, dependencies=[Depends(auth.get_current_user)])
