import LiveRecognition from "./pages/LiveRecognition";
import FaceRegistration from "./pages/FaceRegistration";
import Attendance from "./pages/Attendance";
import EntryExit from "./pages/EntryExit";
import Analytics from "./pages/Analytics";
import AttendanceReports from "./pages/AttendanceReports";
import React, { useEffect, useState } from "react";

import {
  LayoutDashboard, Users, Camera, ClipboardCheck,
  LogIn, LogOut, Bell, BarChart3, Settings,
  Search, CalendarDays, GraduationCap, ShieldCheck,
  Plus, RefreshCw, ScanFace, FileSpreadsheet
} from "lucide-react";

import {
  loginAdmin,
  getDashboard,
  getStudents,
  addStudent,
  getAttendanceEvents
} from "./services/api";

import "./App.css";

function App() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem("smartattend_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [activePage, setActivePage] = useState("Dashboard");
const [dashboard, setDashboard] = useState({
  total_students: 0,
  total_sessions: 0,
  today_entries: 0,
  today_exits: 0,
  verified_entries: 0,
  review_events: 0,
  pending_alerts: 0
});

  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [studentForm, setStudentForm] = useState({
    student_code: "",
    name: "",
    department: "",
    year_of_study: "",
    email: ""
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [dashboardRes, studentsRes, eventsRes] =
        await Promise.all([
          getDashboard(),
          getStudents(),
          getAttendanceEvents()
        ]);

      setDashboard(dashboardRes.data);
      setStudents(studentsRes.data);
      setEvents(eventsRes.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load data. Check whether Flask is running."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoginLoading(true);

    try {
      const response = await loginAdmin(email, password);

      if (response.data.user.role !== "admin") {
        setError("This account is not an administrator account.");
        return;
      }

      sessionStorage.setItem(
        "smartattend_user",
        JSON.stringify(response.data.user)
      );

      setUser(response.data.user);
      setActivePage("Dashboard");
      setPassword("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Check your details."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("smartattend_user");
    setUser(null);
    setEmail("");
    setPassword("");
    setMessage("");
    setError("");
  }

  function updateStudentForm(e) {
    setStudentForm({
      ...studentForm,
      [e.target.name]: e.target.value
    });
  }

  async function handleAddStudent(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const data = {
        ...studentForm,
        year_of_study: studentForm.year_of_study
          ? Number(studentForm.year_of_study)
          : null
      };

      const response = await addStudent(data);

      setMessage(response.data.message);

      setStudentForm({
        student_code: "",
        name: "",
        department: "",
        year_of_study: "",
        email: ""
      });

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to register student."
      );
    }
  }

  if (!user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <ShieldCheck size={35} />
          </div>

          <h1>SmartAttend AI</h1>
          <p className="login-subtitle">
            Intelligent Attendance Management System
          </p>

          <h2>Administrator Login</h2>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin}>
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              className="login-submit"
              type="submit"
              disabled={loginLoading}
            >
              {loginLoading ? "Signing in..." : "Login to Dashboard"}
            </button>
          </form>

          <p className="login-footer">
            Secure Administration Portal
          </p>
        </div>
      </div>
    );
  }

  
const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Students", icon: Users },
  { name: "Face Recognition", icon: Camera },
  { name: "Live Recognition", icon: ScanFace },
  { name: "Attendance", icon: ClipboardCheck },
  { name: "Entry & Exit", icon: LogIn },
  { name: "Analytics", icon: BarChart3 },
  { name: "Attendance Reports", icon: FileSpreadsheet },
  { name: "Alerts", icon: Bell },
  { name: "Settings", icon: Settings }
];


const stats = [
  {
    title: "Total Students",
    value: dashboard.total_students,
    icon: Users,
    color: "blue"
  },
  {
    title: "Total Sessions",
    value: dashboard.total_sessions,
    icon: CalendarDays,
    color: "purple"
  },
  {
    title: "Today's Entries",
    value: dashboard.today_entries,
    icon: ClipboardCheck,
    color: "green"
  },
  {
    title: "Today's Exits",
    value: dashboard.today_exits,
    icon: LogIn,
    color: "orange"
  },
  {
    title: "Verified Entries",
    value: dashboard.verified_entries,
    icon: ShieldCheck,
    color: "blue"
  },
  {
    title: "Review Events",
    value: dashboard.review_events,
    icon: Bell,
    color: "purple"
  },
  {
    title: "Pending Alerts",
    value: dashboard.pending_alerts,
    icon: Bell,
    color: "orange"
  }
];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={27} />
          </div>
          <div>
            <h2>SmartAttend</h2>
            <span>AI ATTENDANCE SYSTEM</span>
          </div>
        </div>

        <div className="menu-label">MAIN MENU</div>

        <nav>
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={
                  activePage === item.name
                    ? "menu-item active"
                    : "menu-item"
                }
                onClick={() => {
                  setActivePage(item.name);
                  setMessage("");
                  setError("");
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot"></span>
            System Online
          </div>
          <p>SmartAttend AI v1.0</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>{activePage}</h2>
            <p>Welcome to SmartAttend AI administration</p>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input placeholder="Search..." />
            </div>

            <button className="notification-button">
              <Bell size={20} />
            </button>

            <div className="profile">
              <div className="profile-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{user.name}</strong>
                <span>Administrator</span>
              </div>
            </div>

            <button
              className="logout-button"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>

        <section className="content-area">
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          {activePage === "Dashboard" && (
            <>
              <div className="welcome-section">
                <div>
                  <h1>Dashboard Overview</h1>
                  <p>
                    Monitor student attendance and classroom activity.
                  </p>
                </div>

                <button className="refresh-button" onClick={loadData}>
                  <RefreshCw size={17} />
                  Refresh Data
                </button>
              </div>

              <div className="stats-grid">
                {stats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div className="stat-card" key={stat.title}>
                      <div className={`stat-icon ${stat.color}`}>
                        <Icon size={23} />
                      </div>
                      <div className="stat-details">
                        <p>{stat.title}</p>
                        <h2>{loading ? "..." : stat.value}</h2>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="dashboard-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Recent Attendance Events</h3>
                      <p>Latest recorded classroom activity</p>
                    </div>
                    <ClipboardCheck size={21} />
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Student ID</th>
                          <th>Event</th>
                          <th>Verification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.slice(0, 7).map((event) => (
                          <tr key={event.id}>
                            <td>{event.student_name}</td>
                            <td>{event.student_code}</td>
                            <td>
                              <span className={`event-badge ${event.event_type.toLowerCase()}`}>
                                {event.event_type}
                              </span>
                            </td>
                            <td>{event.verification_method}</td>
                          </tr>
                        ))}

                        {!loading && events.length === 0 && (
                          <tr>
                            <td colSpan="4" className="empty-state">
                              No attendance events recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="panel quick-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>System Overview</h3>
                      <p>SmartAttend AI modules</p>
                    </div>
                  </div>

                  {[
                    ["Face Recognition", "Recognition module", Camera],
                    ["Entry Tracking", "Classroom entry monitoring", LogIn],
                    ["Exit Tracking", "Classroom exit monitoring", LogOut],
                    ["Student Management", "Student records", GraduationCap]
                  ].map(([title, subtitle, Icon]) => (
                    <div className="module-item" key={title}>
                      <Icon size={21} />
                      <div>
                        <strong>{title}</strong>
                        <span>{subtitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activePage === "Students" && (
            <>
              <div className="welcome-section">
                <div>
                  <h1>Student Management</h1>
                  <p>Register and manage student information.</p>
                </div>
              </div>

              <div className="panel registration-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Register New Student</h3>
                    <p>Enter the student's academic details below.</p>
                  </div>
                  <Plus size={23} />
                </div>

                <form onSubmit={handleAddStudent}>
                  <div className="student-form-grid">
                    <div className="form-field">
                      <label>Student ID *</label>
                      <input
                        name="student_code"
                        placeholder="Example: STU001"
                        value={studentForm.student_code}
                        onChange={updateStudentForm}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label>Student Name *</label>
                      <input
                        name="name"
                        placeholder="Enter full name"
                        value={studentForm.name}
                        onChange={updateStudentForm}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label>Department</label>
                      <input
                        name="department"
                        placeholder="Example: CSE"
                        value={studentForm.department}
                        onChange={updateStudentForm}
                      />
                    </div>

                    <div className="form-field">
                      <label>Year of Study</label>
                      <select
                        name="year_of_study"
                        value={studentForm.year_of_study}
                        onChange={updateStudentForm}
                      >
                        <option value="">Select year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>

                    <div className="form-field full-field">
                      <label>Email Address</label>
                      <input
                        type="email"
                        name="email"
                        placeholder="student@example.com"
                        value={studentForm.email}
                        onChange={updateStudentForm}
                      />
                    </div>
                  </div>

                  <button className="refresh-button" type="submit">
                    <Plus size={17} />
                    Register Student
                  </button>
                </form>
              </div>

 
<div className="panel student-list-panel">
  <div className="panel-heading">
    <div>
      <h3>Registered Students</h3>
      <p>{students.length} students in the database</p>
    </div>
    <Users size={22} />
  </div>

  <div className="table-container">
    <table>
      <thead>
        <tr>
          <th>Student ID</th>
          <th>Name</th>
          <th>Department</th>
          <th>Year</th>
          <th>Email</th>
          <th>Total Sessions</th>
          <th>Attended</th>
          <th>Attendance %</th>
          <th>Eligibility</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        {students.map((student) => (
          <tr key={student.id}>
            <td>{student.student_code}</td>
            <td>{student.name}</td>
            <td>{student.department || "-"}</td>
            <td>{student.year_of_study || "-"}</td>
            <td>{student.email || "-"}</td>
            <td>{student.total_sessions ?? 0}</td>
            <td>{student.attended_sessions ?? 0}</td>
            <td>{student.attendance_percentage ?? "0.00"}%</td>
            <td>{student.eligibility || "Not eligible"}</td>
            <td>{student.status}</td>
          </tr>
        ))}

        {!loading && students.length === 0 && (
          <tr>
            <td colSpan="10" className="empty-state">
              No students registered yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>

            </>
          )}

{activePage === "Face Recognition" && (
  <FaceRegistration />
)}

{activePage === "Live Recognition" && (
  <LiveRecognition />
)}
{activePage === "Attendance" && (
  <Attendance />
)}

{activePage === "Entry & Exit" && <EntryExit />}
{activePage === "Analytics" && <Analytics />}
{activePage === "Attendance Reports" && <AttendanceReports />}
{/* OTHER MODULES */}
{![
  "Dashboard",
  "Students",
  "Face Recognition",
  "Live Recognition",
  "Attendance",
  "Entry & Exit",
  "Analytics",
  "Attendance Reports"
].includes(activePage) && (
  <div className="panel coming-soon">
    <h2>{activePage}</h2>
    <p>This module will be implemented in the next development phase.</p>
  </div>
)}
        </section>
      </main>
    </div>
  );
}

export default App;
