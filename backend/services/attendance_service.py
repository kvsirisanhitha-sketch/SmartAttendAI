
from datetime import datetime
from database import get_db_connection


def record_event(
    student_id,
    session_id,
    event_type,
    verification_method="MANUAL",
    confidence=None,
    verification_status="verified"
):
    event_type = event_type.upper()

    if event_type not in ("ENTRY", "EXIT"):
        return {
            "success": False,
            "message": "Invalid event type"
        }

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        connection.start_transaction()

        # Lock the session row while checking the latest event.
        cursor.execute(
            "SELECT id FROM class_sessions WHERE id=%s FOR UPDATE",
            (session_id,)
        )

        session = cursor.fetchone()

        if not session:
            connection.rollback()
            return {
                "success": False,
                "message": "Class session not found"
            }

        cursor.execute("""
            SELECT id, event_type
            FROM attendance_events
            WHERE student_id=%s AND session_id=%s
            ORDER BY event_time DESC, id DESC
            LIMIT 1
        """, (student_id, session_id))

        previous = cursor.fetchone()

        if previous and previous["event_type"] == event_type:
            connection.rollback()
            return {
                "success": False,
                "message": f"Duplicate {event_type} ignored"
            }

        now = datetime.now()

        cursor.execute("""
            INSERT INTO attendance_events
            (student_id, session_id, event_type, event_time,
             verification_method, confidence, verification_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            student_id,
            session_id,
            event_type,
            now,
            verification_method,
            confidence,
            verification_status
        ))

        connection.commit()

        return {
            "success": True,
            "message": f"{event_type} recorded successfully",
            "event_time": now.isoformat()
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()
