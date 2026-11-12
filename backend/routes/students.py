
from flask import Blueprint, request, jsonify
from database import get_db_connection

students_bp = Blueprint("students", __name__)


@students_bp.route("/", methods=["GET"])
def get_students():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                s.id,
                s.student_code,
                s.name,
                s.department,
                s.year_of_study,
                s.email,
                s.status,

                COUNT(DISTINCT cs.id) AS total_sessions,

                COUNT(DISTINCT CASE
                    WHEN a.status IN ('present', 'late', 'partial')
                    THEN cs.id
                END) AS attended_sessions,

                COUNT(DISTINCT CASE
                    WHEN a.status = 'review'
                    THEN cs.id
                END) AS review_sessions,

                COALESCE(
                    ROUND(
                        100.0 *
                        COUNT(DISTINCT CASE
                            WHEN a.status IN ('present', 'late', 'partial')
                            THEN cs.id
                        END)
                        /
                        NULLIF(COUNT(DISTINCT cs.id), 0),
                        2
                    ),
                    0
                ) AS attendance_percentage

            FROM students s

            LEFT JOIN enrollments e
                ON e.student_id = s.id

            LEFT JOIN class_sessions cs
                ON cs.subject_id = e.subject_id
                AND cs.status = 'completed'

            LEFT JOIN attendance_summaries a
                ON a.student_id = s.id
                AND a.session_id = cs.id

            GROUP BY
                s.id,
                s.student_code,
                s.name,
                s.department,
                s.year_of_study,
                s.email,
                s.status

            ORDER BY s.id DESC
        """)

        students = cursor.fetchall()

        for student in students:
            student["eligibility"] = (
                "Eligible"
                if student["attendance_percentage"] >= 75
                and student["total_sessions"] > 0
                else "Not eligible"
            )

        return jsonify(students)

    finally:
        cursor.close()
        connection.close()


@students_bp.route("/", methods=["POST"])
def add_student():
    data = request.get_json(silent=True) or {}

    code = data.get("student_code", "").strip()
    name = data.get("name", "").strip()

    if not code or not name:
        return jsonify({
            "message": "Student code and name are required"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            INSERT INTO students
            (student_code, name, department, year_of_study, email)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            code,
            name,
            data.get("department"),
            data.get("year_of_study"),
            data.get("email")
        ))

        connection.commit()

        return jsonify({
            "message": "Student registered successfully",
            "student_id": cursor.lastrowid
        }), 201

    except Exception as error:
        connection.rollback()
        return jsonify({"message": str(error)}), 400

    finally:
        cursor.close()
        connection.close()


@students_bp.route("/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            "DELETE FROM students WHERE id=%s",
            (student_id,)
        )

        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Student not found"}), 404

        return jsonify({
            "message": "Student deleted successfully"
        })

    except Exception as error:
        connection.rollback()
        return jsonify({"message": str(error)}), 400

    finally:
        cursor.close()
        connection.close()
