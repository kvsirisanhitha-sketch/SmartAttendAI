
from flask import Blueprint, jsonify
from database import get_db_connection
from services.summary_service import generate_session_summaries

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/dashboard", methods=["GET"])
def dashboard():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM students
            WHERE status = 'active'
        """)
        students = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM class_sessions
        """)
        sessions = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM attendance_events
            WHERE DATE(event_time) = CURDATE()
              AND event_type = 'ENTRY'
        """)
        entries = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM attendance_events
            WHERE DATE(event_time) = CURDATE()
              AND event_type = 'ENTRY'
              AND verification_status = 'verified'
        """)
        verified_entries = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM attendance_events
            WHERE DATE(event_time) = CURDATE()
              AND verification_status = 'review'
        """)
        review_events = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM attendance_events
            WHERE DATE(event_time) = CURDATE()
              AND event_type = 'EXIT'
        """)
        exits = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM alerts
            WHERE status = 'pending'
        """)
        alerts = cursor.fetchone()["total"]

        return jsonify({
            "total_students": students,
            "total_sessions": sessions,
            "today_entries": entries,
            "verified_entries": verified_entries,
            "review_events": review_events,
            "today_exits": exits,
            "pending_alerts": alerts
        })

    finally:
        cursor.close()
        connection.close()



@analytics_bp.route(
    "/sessions/<int:session_id>/complete",
    methods=["POST"]
)
def complete_session(session_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT id, status
            FROM class_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()

        if not session:
            return jsonify({
                "success": False,
                "message": "Session not found"
            }), 404

        if session["status"] == "active":
            cursor.execute("""
                UPDATE class_sessions
                SET status = 'completed'
                WHERE id = %s
            """, (session_id,))
            connection.commit()

        elif session["status"] != "completed":
            return jsonify({
                "success": False,
                "message": "Session is not active or completed"
            }), 400

    except Exception as error:
        connection.rollback()
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:
        cursor.close()
        connection.close()

    try:
        result = generate_session_summaries(session_id)
        return jsonify(result), 200

    except Exception as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


    finally:
        cursor.close()
        connection.close()

    try:
        result = generate_session_summaries(session_id)
        return jsonify(result), 200

    except Exception as error:
        return jsonify({
            "success": False,
            "message": str(error),
            "note": "Session was completed, but summary generation failed."
        }), 500
@analytics_bp.route("/reports/attendance", methods=["GET"])
def attendance_report():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                s.student_code,
                s.name AS student_name,
                s.department,
                sub.subject_code,
                sub.subject_name,
                c.class_name,
                cs.session_date,
                cs.start_time,
                cs.end_time,
                a.total_minutes,
                a.late_minutes,
                a.early_exit_minutes,
                a.attendance_percentage,
                a.status

            FROM attendance_summaries a

            JOIN students s
                ON s.id = a.student_id

            JOIN class_sessions cs
                ON cs.id = a.session_id

            JOIN subjects sub
                ON sub.id = cs.subject_id

            JOIN classes c
                ON c.id = cs.class_id

            ORDER BY cs.session_date DESC, s.name ASC
        """)

        reports = cursor.fetchall()
        return jsonify(reports), 200

    except Exception as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:
        cursor.close()
        connection.close()