from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class FaceSampleItem(BaseModel):
    sample_type: str = Field(..., description="FRONT, LEFT, RIGHT, TILT_UP, TILT_DOWN")
    image_base64: str = Field(..., description="Base64 encoded JPEG/PNG frame")

class FaceEnrollmentRequest(BaseModel):
    student_id: int
    samples: List[FaceSampleItem]
    liveness_session_id: Optional[str] = None

class LivenessChallengeVerifyRequest(BaseModel):
    session_id: str
    landmarks: Optional[List[List[float]]] = None
    face_box: Optional[List[int]] = None
    action_data: Optional[Dict[str, Any]] = None

class LiveScanRequest(BaseModel):
    session_id: int
    image_base64: str
    mode: str = "CHECK_IN"  # CHECK_IN or CHECK_OUT

class LiveScanResponse(BaseModel):
    status: str  # SUCCESS, ALREADY_MARKED, UNKNOWN_PERSON, NO_FACE, MULTIPLE_FACES, POOR_QUALITY, INVALID_SESSION
    message: str
    student_id: Optional[int] = None
    student_code: Optional[str] = None
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    session_id: Optional[int] = None
    session_title: Optional[str] = None
    attendance_status: Optional[str] = None  # PRESENT or LATE
    check_in_time: Optional[str] = None
    original_check_in_time: Optional[str] = None
    confidence: Optional[float] = None
    box: Optional[List[int]] = None
    landmarks: Optional[List[List[float]]] = None
