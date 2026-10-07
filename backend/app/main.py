from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.errors import AppException
from app.db.session import engine, Base, SessionLocal
from app.db.seed_data import seed_database
from app.db.migrations import run_migrations
from app.api.router import api_router
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("qp_system")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    
    # Run safe schema migrations
    logger.info("Applying schema migrations...")
    run_migrations()
    
    # Auto-seed authentic engineering curriculum
    logger.info("Verifying seed data status...")
    db = SessionLocal()
    try:
        seeded = seed_database(db)
        logger.info(f"Database ready with {len(seeded)} authentic subjects ({', '.join(s.code for s in seeded)}).")
    except Exception as e:
        logger.error(f"Error seeding database: {e}", exc_info=True)
    finally:
        db.close()
        
    yield
    logger.info("Shutting down QP System...")
    engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Institutional RESTful Examination Management API for Outcome-Based Education (OBE) compliance, Revised Bloom's Taxonomy verification, and automated question paper blueprints.",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized structured domain error handling
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details
        }
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred during request processing."
        }
    )

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/", tags=["Health"])
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "docs_url": "/docs"
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
