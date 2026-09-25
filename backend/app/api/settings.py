from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import User, SystemSetting
from app.schemas.settings import SystemSettingsUpdate, SystemSettingsResponse
from app.core.config import settings as app_settings
from app.api.deps import get_current_admin, log_audit_event

router = APIRouter(prefix="/settings", tags=["System Settings"])

def get_setting_val(db: Session, key: str, default: str) -> str:
    s = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return s.value if s else default

@router.get("", response_model=SystemSettingsResponse)
def get_system_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return SystemSettingsResponse(
        recognition_threshold=float(get_setting_val(db, "recognition_threshold", str(app_settings.RECOGNITION_SIMILARITY_THRESHOLD))),
        duplicate_face_threshold=float(get_setting_val(db, "duplicate_face_threshold", str(app_settings.DUPLICATE_FACE_THRESHOLD))),
        late_threshold_minutes=int(get_setting_val(db, "late_threshold_minutes", str(app_settings.DEFAULT_LATE_THRESHOLD_MINUTES))),
        institution_name=get_setting_val(db, "institution_name", app_settings.INSTITUTION_NAME),
        institution_code=get_setting_val(db, "institution_code", app_settings.INSTITUTION_CODE),
        timezone=get_setting_val(db, "timezone", app_settings.DEFAULT_TIMEZONE),
        audio_enabled=get_setting_val(db, "audio_enabled", "true").lower() == "true",
        liveness_enabled=get_setting_val(db, "liveness_enabled", "true").lower() == "true",
        liveness_sensitivity=get_setting_val(db, "liveness_sensitivity", app_settings.LIVENESS_SENSITIVITY)
    )

@router.put("", response_model=SystemSettingsResponse)
def update_system_settings(
    payload: SystemSettingsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    updates = payload.model_dump(exclude_unset=True)

    for k, v in updates.items():
        val_str = str(v).lower() if isinstance(v, bool) else str(v)
        setting = db.query(SystemSetting).filter(SystemSetting.key == k).first()
        if setting:
            setting.value = val_str
        else:
            setting = SystemSetting(key=k, value=val_str)
            db.add(setting)

    db.commit()

    log_audit_event(
        db,
        action="SETTINGS_UPDATE",
        user=admin,
        entity_type="SystemSetting",
        details=updates,
        request=request
    )

    return get_system_settings(db=db, admin=admin)
