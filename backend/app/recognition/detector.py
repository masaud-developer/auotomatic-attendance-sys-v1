import cv2
import numpy as np
import os
import urllib.request
from typing import Optional, Tuple, List, Dict, Any
from app.core.config import settings

YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
YUNET_PATH = os.path.join(settings.MODELS_DIR, "face_detection_yunet_2023mar.onnx")

class FaceDetector:
    def __init__(self):
        self.yunet = None
        self.haar_face = None
        self.haar_eye = None
        self._init_models()

    def _download_model_if_needed(self, url: str, target_path: str):
        if not os.path.exists(target_path):
            try:
                print(f"[Biometrics] Downloading YuNet model to {target_path}...")
                urllib.request.urlretrieve(url, target_path)
                print("[Biometrics] YuNet model downloaded successfully.")
            except Exception as e:
                print(f"[Biometrics] Warning: Failed to download YuNet model ({e}). Using Haar Cascade fallback.")

    def _init_models(self):
        # 1. Try YuNet ONNX
        self._download_model_if_needed(YUNET_URL, YUNET_PATH)
        if os.path.exists(YUNET_PATH):
            try:
                # Initial size 320x320, updated per frame
                self.yunet = cv2.FaceDetectorYN.create(
                    model=YUNET_PATH,
                    config="",
                    input_size=(320, 320),
                    score_threshold=0.6,
                    nms_threshold=0.3,
                    top_k=5000
                )
                print("[Biometrics] YuNet deep learning face detector initialized.")
            except Exception as e:
                print(f"[Biometrics] YuNet initialization error: {e}. Falling back to Haar.")
                self.yunet = None

        # 2. Initialize built-in Haar Cascade fallback
        try:
            face_cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            eye_cascade_path = cv2.data.haarcascades + "haarcascade_eye.xml"
            self.haar_face = cv2.CascadeClassifier(face_cascade_path)
            self.haar_eye = cv2.CascadeClassifier(eye_cascade_path)
        except Exception as e:
            print(f"[Biometrics] Error loading Haar cascades: {e}")

    def detect_faces(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detects faces in an RGB/BGR image.
        Returns a list of dicts:
        {
            "box": [x, y, w, h],
            "confidence": float,
            "landmarks": [(x,y), ...], # 5 landmarks: right_eye, left_eye, nose, right_mouth, left_mouth
            "quality": float,
            "face_crop": np.ndarray
        }
        """
        h, w = image.shape[:2]
        faces = []

        if self.yunet is not None:
            try:
                self.yunet.setInputSize((w, h))
                _, detected = self.yunet.detect(image)
                if detected is not None:
                    for d in detected:
                        box = [int(d[0]), int(d[1]), int(d[2]), int(d[3])]
                        conf = float(d[14])
                        # Landmarks in YuNet: right eye, left eye, nose tip, right mouth corner, left mouth corner
                        landmarks = [
                            (float(d[4]), float(d[5])),
                            (float(d[6]), float(d[7])),
                            (float(d[8]), float(d[9])),
                            (float(d[10]), float(d[11])),
                            (float(d[12]), float(d[13]))
                        ]
                        
                        # Clamp box within image bounds
                        x, y, bw, bh = box
                        x = max(0, x)
                        y = max(0, y)
                        bw = min(w - x, bw)
                        bh = min(h - y, bh)

                        if bw > 20 and bh > 20:
                            crop = image[y:y+bh, x:x+bw]
                            faces.append({
                                "box": [x, y, bw, bh],
                                "confidence": conf,
                                "landmarks": landmarks,
                                "raw_detection": d,
                                "face_crop": crop
                            })
                    return faces
            except Exception as e:
                print(f"[Biometrics] YuNet detection error ({e}), trying Haar fallback.")

        # Fallback: Haar cascade
        if self.haar_face is not None:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
            haar_boxes = self.haar_face.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
            )
            for (x, y, bw, bh) in haar_boxes:
                crop = image[y:y+bh, x:x+bw]
                # Synthesize 5 approximate landmarks from bounding box
                right_eye = (float(x + bw * 0.3), float(y + bh * 0.35))
                left_eye = (float(x + bw * 0.7), float(y + bh * 0.35))
                nose = (float(x + bw * 0.5), float(y + bh * 0.55))
                right_mouth = (float(x + bw * 0.35), float(y + bh * 0.75))
                left_mouth = (float(x + bw * 0.65), float(y + bh * 0.75))
                faces.append({
                    "box": [int(x), int(y), int(bw), int(bh)],
                    "confidence": 0.90,
                    "landmarks": [right_eye, left_eye, nose, right_mouth, left_mouth],
                    "raw_detection": None,
                    "face_crop": crop
                })

        return faces

face_detector = FaceDetector()
