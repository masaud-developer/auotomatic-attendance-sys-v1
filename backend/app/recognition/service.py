import base64
import io
import cv2
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.database.models import Student, FaceEmbedding
from app.recognition.detector import face_detector
from app.recognition.recognizer import face_recognizer
from app.recognition.liveness import passive_liveness, active_liveness
from app.core.config import settings

class BiometricService:
    @staticmethod
    def decode_base64_image(base64_str: str) -> np.ndarray:
        """
        Decodes a base64 string (with or without data:image/jpeg;base64 header) into a BGR OpenCV image.
        """
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        
        image_bytes = base64.b64decode(base64_str)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Failed to decode image from base64 string.")
        return image

    def process_registration_samples(
        self,
        db: Session,
        samples: List[Dict[str, Any]],  # [{"sample_type": "FRONT", "image_base64": "..."}]
        student_id: int,
        liveness_session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes multi-sample face registration:
        1. Validates each image (exactly 1 face, quality, lighting, blur).
        2. Verifies active liveness completion if required.
        3. Extracts 128-d embeddings for each sample.
        4. Performs Duplicate Face Detection against all other students in the database.
        5. Saves verified embeddings and updates Student.face_registered.
        """
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return {"success": False, "error": "Student record not found."}

        # 1. Active Liveness verification check
        if settings.LIVENESS_ENABLED and liveness_session_id:
            if not active_liveness.is_session_verified(liveness_session_id):
                return {
                    "success": False,
                    "error": "Liveness verification was not completed. Please complete all challenges."
                }

        processed_embeddings = []
        total_quality = 0.0

        for idx, sample in enumerate(samples):
            stype = sample.get("sample_type", f"SAMPLE_{idx+1}")
            b64_data = sample.get("image_base64")
            if not b64_data:
                continue

            try:
                img = self.decode_base64_image(b64_data)
            except Exception as e:
                return {"success": False, "error": f"Invalid image format in sample {idx+1}: {str(e)}"}

            # Face Detection
            faces = face_detector.detect_faces(img)
            if len(faces) == 0:
                return {
                    "success": False,
                    "error": f"No face detected in sample '{stype}'. Position your face clearly inside the frame."
                }
            if len(faces) > 1:
                return {
                    "success": False,
                    "error": f"Multiple faces detected in sample '{stype}'. Exactly one person must be in view."
                }

            face = faces[0]
            # Passive Liveness / Quality Check
            liveness_res = passive_liveness.evaluate(img, face)
            if not liveness_res["is_live"]:
                return {
                    "success": False,
                    "error": f"Quality issue in '{stype}': {liveness_res['reason']}"
                }

            # Extract 128-d embedding
            embedding_vec = face_recognizer.extract_embedding(img, face)
            processed_embeddings.append({
                "sample_type": stype,
                "vector": embedding_vec,
                "quality": liveness_res["quality_score"]
            })
            total_quality += liveness_res["quality_score"]

        if len(processed_embeddings) == 0:
            return {"success": False, "error": "No valid face samples were provided."}

        # 2. Duplicate Face Detection: Compare against all existing registered students
        all_embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.student_id != student_id).all()
        all_vectors = []
        for emb in all_embeddings:
            all_vectors.append((emb.student_id, emb.get_vector()))

        # Check each new sample embedding against the database
        for item in processed_embeddings:
            is_duplicate, matched_student_id, sim = face_recognizer.check_duplicate_face(
                item["vector"], all_vectors, threshold=settings.DUPLICATE_FACE_THRESHOLD
            )
            if is_duplicate:
                return {
                    "success": False,
                    "error": "This face appears to already be registered to an existing student in the system."
                }

        # 3. Save the new embeddings to DB
        # Delete old embeddings if re-registering
        db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student_id).delete()

        for item in processed_embeddings:
            new_emb = FaceEmbedding(
                student_id=student_id,
                sample_type=item["sample_type"],
                quality_score=item["quality"],
            )
            new_emb.set_vector(item["vector"])
            db.add(new_emb)

        student.face_registered = True
        db.commit()

        avg_quality = round(total_quality / len(processed_embeddings), 2)
        return {
            "success": True,
            "samples_registered": len(processed_embeddings),
            "average_quality": avg_quality,
            "message": "Biometric face registration completed successfully."
        }

    def verify_live_frame(
        self,
        image_b64: str,
        active_student_embeddings: Dict[int, List[List[float]]]
    ) -> Dict[str, Any]:
        """
        Evaluates a frame from the live attendance scanner:
        1. Detects face(s).
        2. Evaluates passive liveness.
        3. Extracts embedding and compares with active student embeddings.
        4. Returns detection box, student_id, confidence, and status.
        """
        try:
            img = self.decode_base64_image(image_b64)
        except Exception as e:
            return {"status": "ERROR", "message": f"Invalid frame data: {str(e)}"}

        faces = face_detector.detect_faces(img)
        if len(faces) == 0:
            return {"status": "NO_FACE", "message": "No face detected in frame."}
        if len(faces) > 1:
            return {"status": "MULTIPLE_FACES", "message": "Multiple faces detected. Please scan one by one."}

        face = faces[0]
        box = face["box"]

        # Passive liveness
        liveness_res = passive_liveness.evaluate(img, face)
        if not liveness_res["is_live"]:
            return {
                "status": "POOR_QUALITY",
                "message": liveness_res["reason"],
                "box": box,
                "quality": liveness_res["quality_score"]
            }

        # Extract 128-d vector
        query_vector = face_recognizer.extract_embedding(img, face)

        # Match against active student vectors
        best_student_id, highest_sim = face_recognizer.find_best_match(
            query_vector, active_student_embeddings
        )

        if best_student_id is not None and highest_sim >= settings.RECOGNITION_SIMILARITY_THRESHOLD:
            return {
                "status": "RECOGNIZED",
                "student_id": best_student_id,
                "confidence": round(highest_sim, 3),
                "box": box,
                "landmarks": face.get("landmarks", []),
                "quality": liveness_res["quality_score"],
                "message": f"Student identified ({round(highest_sim * 100, 1)}% match)"
            }
        else:
            return {
                "status": "UNKNOWN",
                "student_id": None,
                "confidence": round(highest_sim, 3),
                "box": box,
                "landmarks": face.get("landmarks", []),
                "quality": liveness_res["quality_score"],
                "message": "Identity not recognized in institution database."
            }

biometric_service = BiometricService()
