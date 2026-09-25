from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import time

from app.database.session import get_db
from app.database.models import AttendanceSession
from app.recognition.detector import face_detector
from app.recognition.recognizer import face_recognizer

router = APIRouter(prefix="/health", tags=["System Diagnostics"])

@router.get("")
def get_system_health(db: Session = Depends(get_db)):
    """
    Returns live diagnostics for Camera station, Recognition engine, Database, API, and Sessions.
    """
    # 1. Database check
    db_status = "Connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"Error: {str(e)}"

    # 2. Recognition engine check
    engine_status = "Online"
    if face_detector.yunet is None and face_detector.haar_face is None:
        engine_status = "Degraded (No Detector Available)"

    # 3. Active sessions check
    active_sess_count = db.query(AttendanceSession).filter(AttendanceSession.status == "ACTIVE").count()

    return {
        "status": "Healthy" if db_status == "Connected" else "Degraded",
        "timestamp": time.time(),
        "diagnostics": {
            "api": "Online",
            "database": db_status,
            "recognition_engine": engine_status,
            "face_detector": "YuNet (Deep Learning)" if face_detector.yunet is not None else "Haar Cascade (Fallback)",
            "face_recognizer": "SFace 128-d (Deep Learning)" if face_recognizer.sface is not None else "Spatial Descriptor 128-d (Fallback)",
            "camera": "Ready (Client WebRTC)",
            "active_sessions": active_sess_count
        }
    }
