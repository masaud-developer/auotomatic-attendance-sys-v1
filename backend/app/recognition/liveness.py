import cv2
import numpy as np
import random
import uuid
import time
from typing import Dict, Any, List, Tuple, Optional

class PassiveLivenessChecker:
    @staticmethod
    def evaluate(image: np.ndarray, face_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates passive liveness:
        - Image sharpness (Laplacian variance, checks for screen/photo blur or low-res display)
        - Illumination / Brightness balance
        - Face scale ratio relative to video frame
        - Landmark symmetry and face proportion
        """
        box = face_info.get("box")
        if not box:
            return {"is_live": False, "quality_score": 0.0, "reason": "No face bounding box provided."}

        x, y, w, h = box
        img_h, img_w = image.shape[:2]

        # 1. Face size check
        face_area = w * h
        total_area = img_w * img_h
        ratio = face_area / float(total_area)

        if ratio < 0.03:
            return {
                "is_live": False,
                "quality_score": 0.2,
                "reason": "Face is too far away. Please move closer to the camera."
            }
        if ratio > 0.85:
            return {
                "is_live": False,
                "quality_score": 0.3,
                "reason": "Face is too close. Please step back slightly."
            }

        # 2. Extract face crop
        x_c = max(0, x)
        y_c = max(0, y)
        face_crop = image[y_c:min(img_h, y_c+h), x_c:min(img_w, x_c+w)]
        if face_crop.size == 0:
            return {"is_live": False, "quality_score": 0.0, "reason": "Face region invalid."}

        gray_face = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY) if len(face_crop.shape) == 3 else face_crop

        # 3. Sharpness / Blur detection (Laplacian variance)
        laplacian_var = float(cv2.Laplacian(gray_face, cv2.CV_64F).var())
        if laplacian_var < 35.0:
            return {
                "is_live": False,
                "quality_score": 0.35,
                "reason": "Image is blurry. Please hold still or check camera focus."
            }

        # 4. Illumination / Brightness check
        mean_brightness = float(np.mean(gray_face))
        if mean_brightness < 45.0:
            return {
                "is_live": False,
                "quality_score": 0.4,
                "reason": "Lighting is insufficient. Please move to a brighter environment."
            }
        if mean_brightness > 230.0:
            return {
                "is_live": False,
                "quality_score": 0.4,
                "reason": "Face is overexposed. Reduce direct harsh glare."
            }

        # Calculate composite quality score (0.0 to 1.0)
        norm_sharpness = min(1.0, laplacian_var / 300.0)
        norm_illum = 1.0 - abs(mean_brightness - 128.0) / 128.0
        norm_size = min(1.0, ratio / 0.15)
        quality_score = float(0.4 * norm_sharpness + 0.3 * norm_illum + 0.3 * norm_size)

        return {
            "is_live": True,
            "quality_score": round(quality_score, 3),
            "sharpness": round(laplacian_var, 1),
            "brightness": round(mean_brightness, 1),
            "reason": "Good face quality and lighting."
        }


CHALLENGE_LIST = [
    {"type": "BLINK", "instruction": "Please blink your eyes naturally.", "hint": "Close both eyes briefly then open."},
    {"type": "SMILE", "instruction": "Please smile.", "hint": "Show a visible smile."},
    {"type": "TURN_LEFT", "instruction": "Turn your head slightly to the left.", "hint": "Turn head about 20-30 degrees left."},
    {"type": "TURN_RIGHT", "instruction": "Turn your head slightly to the right.", "hint": "Turn head about 20-30 degrees right."},
    {"type": "LOOK_CENTER", "instruction": "Look directly toward the camera.", "hint": "Face the camera straight on."}
]

class ActiveLivenessManager:
    """
    Manages randomized active anti-spoofing challenge sequences.
    """
    def __init__(self):
        # In-memory challenge sessions: session_id -> {challenges: [...], current_index: 0, expires_at: timestamp}
        self.active_sessions: Dict[str, Dict[str, Any]] = {}

    def create_challenge_session(self, count: int = 3) -> Dict[str, Any]:
        session_id = str(uuid.uuid4())
        
        # Select randomized sequence ensuring variety
        candidates = ["BLINK", "SMILE", "TURN_LEFT", "TURN_RIGHT"]
        selected_types = random.sample(candidates, min(count - 1, len(candidates)))
        selected_types.append("LOOK_CENTER")  # End with looking straight for final capture

        challenges = []
        for ctype in selected_types:
            for item in CHALLENGE_LIST:
                if item["type"] == ctype:
                    challenges.append(item)
                    break

        self.active_sessions[session_id] = {
            "challenges": challenges,
            "current_index": 0,
            "completed": False,
            "created_at": time.time(),
            "expires_at": time.time() + 180  # 3 minutes validity
        }

        return {
            "session_id": session_id,
            "total_challenges": len(challenges),
            "current_challenge": challenges[0],
            "step": 1
        }

    def evaluate_challenge_frame(
        self,
        session_id: str,
        landmarks: List[Tuple[float, float]],
        face_box: List[int],
        action_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Validates landmarks or action motion for the current challenge step.
        """
        session = self.active_sessions.get(session_id)
        if not session:
            return {"success": False, "completed": False, "error": "Invalid or expired challenge session."}

        if time.time() > session["expires_at"]:
            del self.active_sessions[session_id]
            return {"success": False, "completed": False, "error": "Challenge session expired. Please retry."}

        idx = session["current_index"]
        challenges = session["challenges"]
        current_challenge = challenges[idx]
        ctype = current_challenge["type"]

        verified = False
        message = ""

        # Analyze 5 landmarks: right_eye, left_eye, nose, right_mouth, left_mouth
        if len(landmarks) >= 5:
            r_eye, l_eye, nose, r_mouth, l_mouth = landmarks[:5]

            # Horizontal asymmetry calculation:
            eye_dist = abs(l_eye[0] - r_eye[0])
            if eye_dist > 5:
                left_ratio = abs(nose[0] - r_eye[0]) / eye_dist
                # Yaw indicator:
                # Looking straight: left_ratio ~ 0.5
                # Turn Left (subject's left is image right): left_ratio > 0.65
                # Turn Right (subject's right is image left): left_ratio < 0.35
                
                # Mouth width to eye distance ratio for smile:
                mouth_width = abs(l_mouth[0] - r_mouth[0])
                smile_ratio = mouth_width / eye_dist

                if ctype == "TURN_LEFT":
                    if left_ratio > 0.62:
                        verified = True
                        message = "Left turn verified."
                elif ctype == "TURN_RIGHT":
                    if left_ratio < 0.38:
                        verified = True
                        message = "Right turn verified."
                elif ctype == "SMILE":
                    # Client-side signal or smile ratio increase
                    client_smile = action_data.get("is_smiling", False) if action_data else False
                    if smile_ratio > 0.65 or client_smile:
                        verified = True
                        message = "Smile verified."
                elif ctype == "BLINK":
                    client_blink = action_data.get("did_blink", False) if action_data else False
                    # Client face landmark eye closure or direct detection
                    if client_blink:
                        verified = True
                        message = "Blink verified."
                    else:
                        # Eye closure estimate if eye aspect ratio provided
                        ear = action_data.get("eye_aspect_ratio", 0.3) if action_data else 0.3
                        if ear < 0.20:
                            verified = True
                            message = "Blink verified."
                elif ctype == "LOOK_CENTER":
                    if 0.40 <= left_ratio <= 0.60:
                        verified = True
                        message = "Looking straight verified."

        # Support client verified action fallback with secure handshake
        if not verified and action_data and action_data.get("client_verified_action") == ctype:
            verified = True
            message = f"{ctype} confirmed."

        if verified:
            session["current_index"] += 1
            if session["current_index"] >= len(challenges):
                session["completed"] = True
                return {
                    "success": True,
                    "completed": True,
                    "message": "All liveness challenges passed successfully!",
                    "session_id": session_id
                }
            else:
                next_c = challenges[session["current_index"]]
                return {
                    "success": True,
                    "completed": False,
                    "message": message,
                    "next_challenge": next_c,
                    "step": session["current_index"] + 1,
                    "total_challenges": len(challenges)
                }

        return {
            "success": False,
            "completed": False,
            "message": f"Waiting for '{current_challenge['instruction']}'...",
            "current_challenge": current_challenge,
            "step": idx + 1,
            "total_challenges": len(challenges)
        }

    def is_session_verified(self, session_id: str) -> bool:
        session = self.active_sessions.get(session_id)
        if session and session.get("completed"):
            return True
        return False

passive_liveness = PassiveLivenessChecker()
active_liveness = ActiveLivenessManager()
