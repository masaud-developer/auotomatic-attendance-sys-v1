from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class SystemSettingsUpdate(BaseModel):
    recognition_threshold: Optional[float] = None
    duplicate_face_threshold: Optional[float] = None
    late_threshold_minutes: Optional[int] = None
    institution_name: Optional[str] = None
    institution_code: Optional[str] = None
    timezone: Optional[str] = None
    audio_enabled: Optional[bool] = None
    liveness_enabled: Optional[bool] = None
    liveness_sensitivity: Optional[str] = None

class SystemSettingsResponse(BaseModel):
    recognition_threshold: float
    duplicate_face_threshold: float
    late_threshold_minutes: int
    institution_name: str
    institution_code: str
    timezone: str
    audio_enabled: bool
    liveness_enabled: bool
    liveness_sensitivity: str
