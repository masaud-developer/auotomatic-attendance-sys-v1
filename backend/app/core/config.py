from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "AttendEdge - Face Recognition Attendance System"
    API_V1_STR: str = "/api/v1"
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "institution_super_secret_jwt_key_attend_edge_2026_x89f2a")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/attendance.db")
    
    # Institution Defaults
    INSTITUTION_NAME: str = "National Institute of Science & Technology"
    INSTITUTION_CODE: str = "NIST"
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"
    
    # Biometric Recognition Parameters
    RECOGNITION_SIMILARITY_THRESHOLD: float = 0.58  # Cosine similarity threshold for positive identification
    DUPLICATE_FACE_THRESHOLD: float = 0.65  # Threshold to trigger "Duplicate Face Detected" on registration
    LIVENESS_ENABLED: bool = True
    LIVENESS_SENSITIVITY: str = "medium"  # low, medium, high
    
    # Attendance Configuration
    DEFAULT_LATE_THRESHOLD_MINUTES: int = 15
    DUPLICATE_ATTENDANCE_COOLDOWN_SECONDS: int = 300  # 5 minutes minimum before allowed re-scan if configured
    
    # Storage & Models
    MODELS_DIR: str = str(BASE_DIR / "models_cache")
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
os.makedirs(settings.MODELS_DIR, exist_ok=True)
