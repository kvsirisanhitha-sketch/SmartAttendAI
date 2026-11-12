
from flask import Blueprint, request, jsonify
from database import get_db_connection
from services.face_service import extract_face_embedding

faces_bp = Blueprint("faces", __name__)


@faces_bp.route("/register/<int:student_id>", methods=["POST"])
def register_face(student_id):

    if "image" not in request.files:
        return jsonify({
            "message": "Please upload a face image."
        }), 400

    image_file = request.files["image"]

    if not image_file.filename:
        return jsonify({
            "message": "No image selected."
        }), 400

    if image_file.mimetype not in ("image/jpeg", "image/png"):
        return jsonify({
            "message": "Only JPG and PNG images are allowed."
        }), 400

    image_bytes = image_file.read()

    if not image_bytes or len(image_bytes) > 5 * 1024 * 1024:
        return jsonify({
            "message": "Image must be smaller than 5 MB."
        }), 400

    connection = None
    cursor = None

    try:
        embedding = extract_face_embedding(image_bytes)

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT id FROM students WHERE id=%s AND status='active'",
            (student_id,)
        )

        student = cursor.fetchone()

        if not student:
            return jsonify({
                "message": "Active student not found."
            }), 404

        cursor.execute(
            "DELETE FROM face_templates WHERE student_id=%s",
            (student_id,)
        )

        cursor.execute("""
            INSERT INTO face_templates
            (student_id, template_data, model_version)
            VALUES (%s, %s, %s)
        """, (
            student_id,
            embedding,
            "OpenCV-YuNet-SFace-2021dec"
        ))

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Face registered successfully!",
            "student_id": student_id
        }), 201

    except ValueError as error:
        return jsonify({"message": str(error)}), 400

    except FileNotFoundError as error:
        return jsonify({"message": str(error)}), 500

    except Exception as error:
        if connection:
            connection.rollback()

        return jsonify({
            "message": "Face registration failed: " + str(error)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()
