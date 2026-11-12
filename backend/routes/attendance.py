
from flask import Blueprint, request, jsonify
from database import get_db_connection
from services.attendance_service import record_event

attendance_bp = Blueprint("attendance", __name__)


@attendance_bp.route("/event", methods=["POST"])
def create_event():
    data = request.get_json(silent=True) or {}

    required = ["student_id", "session_id", "event_type"]

    if any(field not in data for field in required):
        return jsonify({
            "message": "Missing required fields"
        }), 400

    try:
        result = record_event(
            int(data["student_id"]),
            int(data["session_id"]),
            data["event_type"],
            data.get("verification_method", "MANUAL"),
            data.get("confidence"),
            data.get("verification_status", "verified")
        )

        return jsonify(result), 200 if result["success"] else 409

    except Exception as error:
        return jsonify({"message": str(error)}), 500


@attendance_bp.route("/events", methods=["GET"])
def get_events():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT e.id, e.student_id, s.name AS student_name,
                   s.student_code, e.session_id, e.event_type,
                   e.event_time, e.verification_method,
                   e.verification_status
            FROM attendance_events e
            JOIN students s ON s.id = e.student_id
            ORDER BY e.event_time DESC
        """)

        return jsonify(cursor.fetchall())

    finally:
        cursor.close()
        connection.close()
