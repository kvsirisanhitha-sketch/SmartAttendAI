import { useEffect, useRef, useState } from "react";
import { getStudents, registerFace } from "../services/api";

function FaceRegistration() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [imageBlob, setImageBlob] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

useEffect(() => {
  loadStudents();

  return () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };
}, []);

useEffect(() => {
  if (!capturedImage && streamRef.current && videoRef.current) {
    videoRef.current.srcObject = streamRef.current;

    videoRef.current.play()
      .then(() => setCameraReady(true))
      .catch(() => setMessage("Unable to restart camera preview."));
  }
}, [capturedImage]);

  const loadStudents = async () => {
    try {
      const response = await getStudents();
      setStudents(response.data);
    } catch (error) {
      setMessage("Unable to load students.");
    }
  };

  const startCamera = async () => {
    try {
      setMessage("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraReady(true);
    } catch (error) {
      setMessage("Camera access failed. Please allow camera permission.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setCameraReady(false);
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !video.videoWidth) {
      setMessage("Camera is not ready.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) {
        setMessage("Unable to capture image.");
        return;
      }

      setImageBlob(blob);
      setCapturedImage(URL.createObjectURL(blob));
      setMessage("Image captured. Review it before registration.");
    }, "image/jpeg", 0.9);
  };

const retakeImage = () => {
  if (capturedImage) {
    URL.revokeObjectURL(capturedImage);
  }

  setCapturedImage("");
  setImageBlob(null);
  setMessage("You can capture another image now.");
};
const handleRegister = async () => {
  if (!studentId) {
    setMessage("Please select a student.");
    return;
  }

  if (!imageBlob) {
    setMessage("Please capture a face image first.");
    return;
  }

  try {
    setLoading(true);
    setMessage("");

    const response = await registerFace(studentId, imageBlob);

    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }

    setCapturedImage("");
    setImageBlob(null);

    // Display success message after clearing the captured image
    setMessage(response.data.message);

  } catch (error) {
    setMessage(
      error.response?.data?.message || "Face registration failed."
    );
  } finally {
    setLoading(false);
  }
}; 
  return (
    <div className="face-registration-page">
      <h2>Student Face Registration</h2>

      <p>
        Select a student, capture one clear face image, and register
        the face template.
      </p>

      <div className="form-field">
        <label>Select Student</label>

        <select
          value={studentId}
          onChange={e => setStudentId(e.target.value)}
        >
          <option value="">Choose a student</option>

          {students.map(student => (
            <option key={student.id} value={student.id}>
              {student.student_code} - {student.name}
            </option>
          ))}
        </select>
      </div>

      <div className="camera-container">
        {!capturedImage ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="camera-preview"
          />
        ) : (
          <img
            src={capturedImage}
            alt="Captured student face"
            className="camera-preview"
          />
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="camera-actions">
        {!cameraReady && !capturedImage && (
          <button onClick={startCamera}>
            Start Camera
          </button>
        )}

        {cameraReady && !capturedImage && (
          <button onClick={captureImage}>
            Capture Image
          </button>
        )}

        {capturedImage && (
          <>
            <button onClick={retakeImage}>
              Retake Image
            </button>

            <button onClick={handleRegister} disabled={loading}>
              {loading ? "Registering..." : "Register Face"}
            </button>
          </>
        )}

        {cameraReady && (
          <button onClick={stopCamera}>
            Stop Camera
          </button>
        )}
      </div>

      {message && <p className="face-message">{message}</p>}

      <p className="privacy-note">
        Obtain the student's informed consent before collecting biometric
        data. Only use this system for authorized attendance purposes.
      </p>
    </div>
  );
}

export default FaceRegistration;