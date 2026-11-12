
from database import get_db_connection
from werkzeug.security import generate_password_hash

name = "SmartAttend Admin"
email = "admin@smartattend.com"
password = "Admin@123"

connection = get_db_connection()
cursor = connection.cursor()

try:
    cursor.execute("""
        INSERT INTO users (name, email, password_hash, role)
        VALUES (%s, %s, %s, 'admin')
        ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash)
    """, (
        name,
        email,
        generate_password_hash(password)
    ))

    connection.commit()
    print("Admin account created successfully!")

except Exception as error:
    connection.rollback()
    print("Error:", error)

finally:
    cursor.close()
    connection.close()
