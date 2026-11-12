from flask import Blueprint, request, jsonify
from services.recognition_service import recognize_face

recognition_bp = Blueprint("recognition", __name__)


@recognition_bp.route("/identify", methods=["POST"])
def identify_face():

    if "image" not in request.files:
        return jsonify({
            "success": False,
            "message": "Please upload a face image."
        }), 400

    image_file = request.files["image"]

    if not image_file.filename:
        return jsonify({
            "success": False,
            "message": "No image selected."
        }), 400

    if image_file.mimetype not in ("image/jpeg", "image/png"):
        return jsonify({
            "success": False,
            "message": "Only JPG and PNG images are allowed."
        }), 400

    image_bytes = image_file.read()

    if not image_bytes or len(image_bytes) > 5 * 1024 * 1024:
        return jsonify({
            "success": False,
            "message": "Image must be smaller than 5 MB."
        }), 400

    try:
        result = recognize_face(image_bytes)

        return jsonify(result), 200

    except ValueError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 400

    except Exception as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500