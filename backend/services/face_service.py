
import os
import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DETECTOR_PATH = os.path.join(
    BASE_DIR, "models", "face_detection_yunet_2023mar.onnx"
)

RECOGNIZER_PATH = os.path.join(
    BASE_DIR, "models", "face_recognition_sface_2021dec.onnx"
)


def extract_face_embedding(image_bytes):
    if not os.path.exists(DETECTOR_PATH):
        raise FileNotFoundError("YuNet model is missing.")

    if not os.path.exists(RECOGNIZER_PATH):
        raise FileNotFoundError("SFace model is missing.")

    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Invalid image file.")

    height, width = image.shape[:2]

    detector = cv2.FaceDetectorYN_create(
        DETECTOR_PATH,
        "",
        (width, height),
        0.85,
        0.3,
        5000
    )

    _, faces = detector.detect(image)

    if faces is None or len(faces) == 0:
        raise ValueError("No face detected. Please capture again.")

    if len(faces) > 1:
        raise ValueError("Multiple faces detected. Only one student should be visible.")

    recognizer = cv2.FaceRecognizerSF_create(
        RECOGNIZER_PATH,
        ""
    )

    aligned_face = recognizer.alignCrop(image, faces[0])
    feature = recognizer.feature(aligned_face)

    embedding = np.asarray(feature, dtype=np.float32).reshape(-1)

    return embedding.tobytes()
