from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine, Base, SessionLocal
from app.database.models import Subject, SystemSetting
from app.api import (
    auth, students, biometrics, sessions, attendance, 
    analytics, audit, settings as settings_api, student_portal, health
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)

    # Baseline configuration on startup
    db = SessionLocal()
    try:
        # Baseline settings
        default_settings = [
            ("institution_name", settings.INSTITUTION_NAME, "Official Name of Educational Institution"),
            ("institution_code", settings.INSTITUTION_CODE, "Institutional Code Prefix"),
            ("timezone", settings.DEFAULT_TIMEZONE, "System Local Timezone"),
            ("recognition_threshold", str(settings.RECOGNITION_SIMILARITY_THRESHOLD), "Cosine similarity threshold for recognition"),
            ("duplicate_face_threshold", str(settings.DUPLICATE_FACE_THRESHOLD), "Threshold to flag duplicate face during registration"),
            ("late_threshold_minutes", str(settings.DEFAULT_LATE_THRESHOLD_MINUTES), "Grace period in minutes before student is marked Late"),
            ("audio_enabled", "true", "Enable audio tone/voice alerts during scanner recognition"),
            ("liveness_enabled", "true", "Enforce active liveness challenges during face registration"),
            ("liveness_sensitivity", settings.LIVENESS_SENSITIVITY, "Liveness challenge sensitivity level")
        ]
        for key, val, desc in default_settings:
            if not db.query(SystemSetting).filter(SystemSetting.key == key).first():
                db.add(SystemSetting(key=key, value=val, description=desc))

        db.commit()
    finally:
        db.close()

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for institutional intranet & local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(students.router, prefix=api_v1_prefix)
app.include_router(biometrics.router, prefix=api_v1_prefix)
app.include_router(sessions.router, prefix=api_v1_prefix)
app.include_router(attendance.router, prefix=api_v1_prefix)
app.include_router(analytics.router, prefix=api_v1_prefix)
app.include_router(audit.router, prefix=api_v1_prefix)
app.include_router(settings_api.router, prefix=api_v1_prefix)
app.include_router(student_portal.router, prefix=api_v1_prefix)
app.include_router(health.router, prefix=api_v1_prefix)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "OPERATIONAL",
        "api_docs": "/docs"
    }
