import numpy as np
from database import get_db_connection
from services.face_service import extract_face_embedding


def recognize_face(image_bytes, threshold=0.45):

    # Extract embedding from the submitted image
    unknown_embedding = np.frombuffer(
        extract_face_embedding(image_bytes),
        dtype=np.float32
    )

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                ft.student_id,
                ft.template_data,
                s.student_code,
                s.name,
                s.department
            FROM face_templates ft
            JOIN students s ON s.id = ft.student_id
            WHERE s.status = 'active'
        """)

        templates = cursor.fetchall()

        if not templates:
            return {
                "success": False,
                "message": "No registered face templates found."
            }

        best_match = None
        best_score = -1

        for template in templates:

            known_embedding = np.frombuffer(
                template["template_data"],
                dtype=np.float32
            )

            if known_embedding.shape != unknown_embedding.shape:
                continue

            # Cosine similarity
            score = float(
                np.dot(unknown_embedding, known_embedding) /
                (
                    np.linalg.norm(unknown_embedding) *
                    np.linalg.norm(known_embedding) + 1e-10
                )
            )

            if score > best_score:
                best_score = score
                best_match = template

        if best_match is None or best_score < threshold:
            return {
                "success": False,
                "message": "Unknown face detected.",
                "confidence": round(best_score, 4)
            }

        return {
            "success": True,
            "message": "Face matched successfully.",
            "student": {
                "id": best_match["student_id"],
                "student_code": best_match["student_code"],
                "name": best_match["name"],
                "department": best_match["department"]
            },
            "confidence": round(best_score, 4)
        }

    finally:
        cursor.close()
        connection.close()