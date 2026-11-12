
from datetime import datetime
from database import get_db_connection


def generate_session_summaries(session_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        # Get session information
        cursor.execute("""
            SELECT id, subject_id, start_time, end_time,
                   late_after, status
            FROM class_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()

        if not session:
            raise ValueError("Class session not found")

        if session["status"] != "completed":
            raise ValueError(
                "Only completed sessions can generate summaries"
            )

        scheduled_minutes = max(
            1,
            int(
                (session["end_time"] - session["start_time"])
                .total_seconds() / 60
            )
        )

        # Get students enrolled in this subject
        cursor.execute("""
            SELECT s.id AS student_id
            FROM enrollments e
            JOIN students s ON s.id = e.student_id
            WHERE e.subject_id = %s
              AND s.status = 'active'
        """, (session["subject_id"],))

        students = cursor.fetchall()

        connection.commit()
        connection.start_transaction()

        for student in students:
            student_id = student["student_id"]

            cursor.execute("""
                SELECT event_type, event_time, verification_status
                FROM attendance_events
                WHERE student_id = %s
                  AND session_id = %s
                ORDER BY event_time, id
            """, (student_id, session_id))

            events = cursor.fetchall()

            total_minutes = 0
            late_minutes = 0
            early_exit_minutes = 0
            attendance_percentage = 0
            summary_status = "absent"

            # Events needing review must not count as verified attendance
            has_review = any(
                event["verification_status"] == "review"
                for event in events
            )

            verified_events = [
                event for event in events
                if event["verification_status"] == "verified"
            ]

            if has_review:
                summary_status = "review"

            else:
                # Pair verified ENTRY and EXIT events
                entry_time = None

                for event in verified_events:
                    if event["event_type"] == "ENTRY":
                        entry_time = event["event_time"]

                    elif (
                        event["event_type"] == "EXIT"
                        and entry_time is not None
                    ):
                        start = max(
                            entry_time, session["start_time"]
                        )
                        end = min(
                            event["event_time"], session["end_time"]
                        )

                        if end > start:
                            total_minutes += int(
                                (end - start).total_seconds() / 60
                            )

                            if entry_time > session["late_after"]:
                                late_minutes += int(
                                    (
                                        entry_time - session["late_after"]
                                    ).total_seconds() / 60
                                )

                            if event["event_time"] < session["end_time"]:
                                early_exit_minutes += int(
                                    (
                                        session["end_time"]
                                        - event["event_time"]
                                    ).total_seconds() / 60
                                )

                        entry_time = None

                attendance_percentage = round(
                    min(100, total_minutes / scheduled_minutes * 100),
                    2
                )

                if total_minutes == 0:
                    summary_status = "absent"
                elif attendance_percentage < 75:
                    summary_status = "partial"
                elif late_minutes > 0:
                    summary_status = "late"
                else:
                    summary_status = "present"

            # Check whether a summary already exists
            cursor.execute("""
                SELECT id
                FROM attendance_summaries
                WHERE student_id = %s AND session_id = %s
            """, (student_id, session_id))

            existing = cursor.fetchone()

            values = (
                total_minutes,
                late_minutes,
                early_exit_minutes,
                attendance_percentage,
                summary_status
            )

            if existing:
                cursor.execute("""
                    UPDATE attendance_summaries
                    SET total_minutes = %s,
                        late_minutes = %s,
                        early_exit_minutes = %s,
                        attendance_percentage = %s,
                        status = %s
                    WHERE id = %s
                """, values + (existing["id"],))

            else:
                cursor.execute("""
                    INSERT INTO attendance_summaries
                    (student_id, session_id, total_minutes,
                     late_minutes, early_exit_minutes,
                     attendance_percentage, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (student_id, session_id) + values)

        connection.commit()

        return {
            "success": True,
            "message": "Attendance summaries generated",
            "students_processed": len(students)
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()
