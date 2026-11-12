import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ScanFace } from "lucide-react";
import { recognizeFace } from "../services/api";

function LiveRecognition() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const startCamera = async () => {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraActive(true);
      setResult(null);
    } catch (err) {
      setError("Unable to access camera. Please allow camera permission.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );

      if (!blob) {
        throw new Error("Unable to capture image.");
      }

      const response = await recognizeFace(blob);
      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Face recognition failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="face-registration-page">
      <h2>Live Face Recognition</h2>

      <p>
        Identify students using their previously registered face templates.
      </p>

      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-preview"
        />

        {!cameraActive && (
          <div className="camera-placeholder">
            <CameraOff size={45} />
            <p>Camera is not active</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="camera-actions">
        {!cameraActive ? (
          <button onClick={startCamera}>
            <Camera size={18} /> Start Camera
          </button>
        ) : (
          <>
            <button onClick={captureAndRecognize} disabled={loading}>
              <ScanFace size={18} />
              {loading ? "Recognizing..." : "Recognize Face"}
            </button>

            <button onClick={stopCamera}>
              <CameraOff size={18} /> Stop Camera
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="face-message error">
          {error}
        </div>
      )}

      {result && (
        <div className="face-message success">
          <h3>{result.success ? "Face Match Found" : "No Match Found"}</h3>

          <p>{result.message}</p>

          {result.student && (
            <>
              <p><strong>Name:</strong> {result.student.name}</p>
              <p><strong>Student ID:</strong> {result.student.student_code}</p>
              <p><strong>Department:</strong> {result.student.department}</p>
              <p><strong>Similarity score:</strong> {result.confidence}</p>
            </>
          )}
        </div>
      )}

      <p className="privacy-note">
        Face matching identifies a possible student identity. It does not
        independently verify liveness or physical attendance.
      </p>
    </div>
  );
}

export default LiveRecognition;