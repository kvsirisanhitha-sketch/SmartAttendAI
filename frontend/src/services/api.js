
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
  headers: {
    "Content-Type": "application/json"
  }
});

export const loginAdmin = (email, password) =>
  API.post("/auth/login", { email, password });

export const getDashboard = () =>
  API.get("/analytics/dashboard");

export const getStudents = () =>
  API.get("/students/");

export const addStudent = (studentData) =>
  API.post("/students/", studentData);

export const getAttendanceEvents = () =>
  API.get("/attendance/events");
export const registerFace = (studentId, imageBlob) => {
  const formData = new FormData();

  formData.append("image", imageBlob, "face.jpg");

  return axios.post(
    `http://127.0.0.1:5000/api/faces/register/${studentId}`,
    formData
  );
};
export const recognizeFace = (imageBlob) => {
  const formData = new FormData();
  formData.append("image", imageBlob, "recognition.jpg");

  return axios.post(
    "http://127.0.0.1:5000/api/recognition/identify",
    formData
  );
};
export default API;
