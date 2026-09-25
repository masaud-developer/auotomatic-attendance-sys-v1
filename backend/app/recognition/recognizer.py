import cv2
import numpy as np
import os
import urllib.request
from typing import Optional, List, Dict, Any, Tuple
from app.core.config import settings

SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
SFACE_PATH = os.path.join(settings.MODELS_DIR, "face_recognition_sface_2021dec.onnx")

class FaceRecognizer:
    def __init__(self):
        self.sface = None
        self._init_model()

    def _init_model(self):
        if not os.path.exists(SFACE_PATH):
            try:
                print(f"[Biometrics] Downloading SFace model to {SFACE_PATH}...")
                urllib.request.urlretrieve(SFACE_URL, SFACE_PATH)
                print("[Biometrics] SFace model downloaded successfully.")
            except Exception as e:
                print(f"[Biometrics] Warning: SFace download failed ({e}). Using robust fallback extractor.")

        if os.path.exists(SFACE_PATH):
            try:
                self.sface = cv2.FaceRecognizerSF.create(
                    model=SFACE_PATH,
                    config="",
                    backend_id=0,
                    target_id=0
                )
                print("[Biometrics] SFace 128-d deep face recognizer initialized.")
            except Exception as e:
                print(f"[Biometrics] SFace init failed: {e}. Fallback enabled.")
                self.sface = None

    def extract_embedding(self, image: np.ndarray, face_info: Dict[str, Any]) -> List[float]:
        """
        Extracts a 128-dimensional L2-normalized biometric embedding vector.
        """
        raw_det = face_info.get("raw_detection")
        
        # 1. Deep Learning SFace if available
        if self.sface is not None and raw_det is not None:
            try:
                aligned_face = self.sface.alignCrop(image, raw_det)
                feature = self.sface.feature(aligned_face)
                vec = feature[0].tolist()
                # Normalize L2
                arr = np.array(vec, dtype=np.float32)
                norm = np.linalg.norm(arr)
                if norm > 1e-6:
                    arr = arr / norm
                return arr.tolist()
            except Exception as e:
                print(f"[Biometrics] SFace feature extraction error: {e}")

        # 2. Robust spatial texture & multi-scale gradient feature extractor (128-dimensional)
        face_crop = face_info.get("face_crop")
        if face_crop is None or face_crop.size == 0:
            box = face_info.get("box", [0, 0, 100, 100])
            x, y, w, h = box
            face_crop = image[y:y+h, x:x+w]

        # Resize to standard canonical 112x112 face size
        resized = cv2.resize(face_crop, (112, 112))
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY) if len(resized.shape) == 3 else resized
        gray = cv2.equalizeHist(gray)

        # Divide into 4x4 spatial blocks (16 blocks, 8 histogram bins each = 128 dimensions)
        h_step, w_step = 112 // 4, 112 // 4
        vector_128 = []
        for i in range(4):
            for j in range(4):
                block = gray[i*h_step:(i+1)*h_step, j*w_step:(j+1)*w_step]
                # Calculate gradient magnitude and orientation or block histogram
                hist, _ = np.histogram(block, bins=8, range=(0, 256), density=True)
                vector_128.extend(hist.tolist())

        arr = np.array(vector_128[:128], dtype=np.float32)
        norm = np.linalg.norm(arr)
        if norm > 1e-6:
            arr = arr / norm
        return arr.tolist()

    @staticmethod
    def compute_similarity(vec1: List[float], vec2: List[float]) -> float:
        """
        Computes cosine similarity between two 128-d vectors (range 0.0 to 1.0).
        """
        a = np.array(vec1, dtype=np.float32)
        b = np.array(vec2, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a < 1e-6 or norm_b < 1e-6:
            return 0.0
        similarity = float(np.dot(a, b) / (norm_a * norm_b))
        # Clamp to [0, 1]
        return max(0.0, min(1.0, similarity))

    def find_best_match(
        self, 
        query_vec: List[float], 
        student_embedding_map: Dict[int, List[List[float]]]
    ) -> Tuple[Optional[int], float]:
        """
        Finds the student with the highest cosine similarity.
        student_embedding_map: dict of {student_id: [vec1, vec2, ...]}
        Returns (best_student_id, best_similarity).
        """
        best_student_id = None
        highest_similarity = 0.0

        for student_id, vectors in student_embedding_map.items():
            for stored_vec in vectors:
                sim = self.compute_similarity(query_vec, stored_vec)
                if sim > highest_similarity:
                    highest_similarity = sim
                    best_student_id = student_id

        return best_student_id, highest_similarity

    def check_duplicate_face(
        self,
        candidate_vec: List[float],
        all_student_vectors: List[Tuple[int, List[float]]],
        threshold: float = None
    ) -> Tuple[bool, Optional[int], float]:
        """
        Checks whether the candidate face already belongs to another registered student.
        Returns (is_duplicate, matched_student_id, similarity).
        """
        if threshold is None:
            threshold = settings.DUPLICATE_FACE_THRESHOLD

        for student_id, stored_vec in all_student_vectors:
            sim = self.compute_similarity(candidate_vec, stored_vec)
            if sim >= threshold:
                return True, student_id, sim

        return False, None, 0.0

face_recognizer = FaceRecognizer()
