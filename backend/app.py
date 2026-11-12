from routes.recognition import recognition_bp
from routes.faces import faces_bp
from flask import Flask, jsonify
from flask_cors import CORS

from routes.auth import auth_bp
from routes.students import students_bp
from routes.attendance import attendance_bp
from routes.analytics import analytics_bp

app = Flask(__name__)
CORS(app)
app.register_blueprint(faces_bp, url_prefix="/api/faces")
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(students_bp, url_prefix="/api/students")
app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
app.register_blueprint(
    recognition_bp,
    url_prefix="/api/recognition"
)

@app.route("/")
def home():
    return jsonify({
        "message": "SmartAttend AI Backend is running"
    })

@app.route("/api/health")
def health():
    return jsonify({"status": "OK"})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
