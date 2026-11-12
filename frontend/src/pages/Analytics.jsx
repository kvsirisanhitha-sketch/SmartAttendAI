
import React, { useEffect, useState } from "react";
import { getAttendanceEvents } from "../services/api";

import {
  CalendarDays,
  Users,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

function Analytics() {
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [reports, setReports] = useState([]);
  const [period, setPeriod] = useState("daily");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load analytics data
  async function loadAnalytics() {
    try {
      setLoading(true);
      setError("");

      const [
        eventsResponse,
        reportsResponse,
        studentsResponse
      ] = await Promise.all([
        getAttendanceEvents(),
        fetch("http://127.0.0.1:5000/api/analytics/reports/attendance"),
        fetch("http://127.0.0.1:5000/api/students/")
      ]);

      if (!reportsResponse.ok || !studentsResponse.ok) {
        throw new Error("Unable to load analytics data");
      }

      const reportsData = await reportsResponse.json();
      const studentsData = await studentsResponse.json();

      setEvents(eventsResponse.data);
      setReports(reportsData);
      setStudents(studentsData);

    } catch (err) {
      console.error(err);
      setError("Unable to load analytics. Check Flask server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Get event date
  function getEventDate(value) {
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return {
      year: parsed.getUTCFullYear(),
      month: parsed.getUTCMonth() + 1,
      day: parsed.getUTCDate()
    };
  }

  const entries = events.filter(
    event => event.event_type === "ENTRY"
  );

  const exits = events.filter(
    event => event.event_type === "EXIT"
  );

  const verified = events.filter(
    event => event.verification_status === "verified"
  );

  const review = events.filter(
    event => event.verification_status === "review"
  );

  // Daily, weekly and monthly chart grouping
  function getGroupLabel(event) {
    const date = getEventDate(event.event_time);
    if (!date) return "Unknown";

    if (period === "daily") {
      return `${date.day}/${date.month}/${date.year}`;
    }

    if (period === "monthly") {
      return `${date.year}-${String(date.month).padStart(2, "0")}`;
    }

    const utcDate = new Date(Date.UTC(
      date.year,
      date.month - 1,
      date.day
    ));

    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);

    return `Week of ${utcDate.getUTCDate()}/${utcDate.getUTCMonth() + 1}/${utcDate.getUTCFullYear()}`;
  }

  const grouped = {};

  events.forEach(event => {
    const label = getGroupLabel(event);

    if (!grouped[label]) {
      grouped[label] = { ENTRY: 0, EXIT: 0 };
    }

    if (event.event_type === "ENTRY") {
      grouped[label].ENTRY++;
    }

    if (event.event_type === "EXIT") {
      grouped[label].EXIT++;
    }
  });

  const chartData = Object.entries(grouped).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  const maxValue = Math.max(
    1,
    ...chartData.map(([, value]) =>
      Math.max(value.ENTRY, value.EXIT)
    )
  );

  // Monthly attendance trend data
  const monthlyGrouped = {};

  events.forEach(event => {
    const date = getEventDate(event.event_time);

    if (!date) return;

    const monthKey =
      `${date.year}-${String(date.month).padStart(2, "0")}`;

    if (!monthlyGrouped[monthKey]) {
      monthlyGrouped[monthKey] = {
        month: monthKey,
        entries: 0,
        exits: 0
      };
    }

    if (event.event_type === "ENTRY") {
      monthlyGrouped[monthKey].entries++;
    }

    if (event.event_type === "EXIT") {
      monthlyGrouped[monthKey].exits++;
    }
  });

  const monthlyTrendData = Object.values(monthlyGrouped).sort(
    (a, b) => a.month.localeCompare(b.month)
  );

  // Department-wise attendance comparison
  const departmentGrouped = {};

  reports.forEach(report => {
    const department = report.department || "Unknown";
    const percentage = Number(report.attendance_percentage) || 0;

    if (!departmentGrouped[department]) {
      departmentGrouped[department] = {
        department,
        totalPercentage: 0,
        totalRecords: 0
      };
    }

    departmentGrouped[department].totalPercentage += percentage;
    departmentGrouped[department].totalRecords++;
  });

  const departmentChartData = Object.values(departmentGrouped).map(
    item => ({
      department: item.department.toUpperCase(),
      averageAttendance: Number(
        (item.totalPercentage / item.totalRecords).toFixed(2)
      )
    })
  );

  // Attendance percentage trends
  const attendanceTrendData = [...reports]
    .sort(
      (a, b) =>
        new Date(a.session_date) - new Date(b.session_date)
    )
    .map(report => ({
      date: new Date(report.session_date).toLocaleDateString("en-IN"),
      attendance: Number(report.attendance_percentage) || 0,
      subject: report.subject_name || "Unknown Subject"
    }));

  // Students who have at least one completed session
  const rankedStudents = students
    .filter(student => Number(student.total_sessions) > 0)
    .map(student => ({
      ...student,
      attendance_percentage:
        Number(student.attendance_percentage) || 0
    }));

  // Top 5 students
  const topStudents = [...rankedStudents]
    .sort(
      (a, b) =>
        b.attendance_percentage - a.attendance_percentage
    )
    .slice(0, 5);

  // Bottom 5 students
  const bottomStudents = [...rankedStudents]
    .sort(
      (a, b) =>
        a.attendance_percentage - b.attendance_percentage
    )
    .slice(0, 5);

  // Dashboard summary cards
  const cards = [
    {
      title: "Total Events",
      value: events.length,
      icon: CalendarDays
    },
    {
      title: "Entry Events",
      value: entries.length,
      icon: LogIn
    },
    {
      title: "Exit Events",
      value: exits.length,
      icon: LogOut
    },
    {
      title: "Verified Events",
      value: verified.length,
      icon: ShieldCheck
    },
    {
      title: "Review Events",
      value: review.length,
      icon: AlertTriangle
    },
    {
      title: "Unique Students",
      value: new Set(events.map(e => e.student_id)).size,
      icon: Users
    }
  ];

  return (
    <div className="analytics-page">

      {/* Page Header */}
      <div className="welcome-section">
        <div>
          <h1>Attendance Analytics</h1>
          <p>Analyze classroom attendance and student activity.</p>
        </div>

        <button
          className="refresh-button"
          onClick={loadAnalytics}
        >
          <RefreshCw size={17} />
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid">
        {cards.map(card => {
          const Icon = card.icon;

          return (
            <div className="stat-card" key={card.title}>
              <div className="stat-icon blue">
                <Icon size={23} />
              </div>

              <div className="stat-details">
                <p>{card.title}</p>
                <h2>{loading ? "..." : card.value}</h2>
              </div>
            </div>
          );
        })}
      </div>

      {/* Entry and Exit Trends */}
      <div className="panel analytics-chart-panel">
        <div className="panel-heading">
          <div>
            <h3>Entry & Exit Trends</h3>
            <p>Recorded attendance events by time period</p>
          </div>
        </div>

        <div className="analytics-periods">
          {["daily", "weekly", "monthly"].map(item => (
            <button
              key={item}
              className={period === item ? "active-period" : ""}
              onClick={() => setPeriod(item)}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        <div className="analytics-legend">
          <span>🟢 Entries</span>
          <span>🟠 Exits</span>
        </div>

        {chartData.length === 0 ? (
          <p>No attendance events available yet.</p>
        ) : (
          <div className="analytics-bars">
            {chartData.map(([label, value]) => (
              <div className="analytics-bar-row" key={label}>
                <div className="analytics-bar-label">
                  {label}
                </div>

                <div className="analytics-bar-group">
                  <div className="analytics-bar-track">
                    <div
                      className="analytics-bar entry-bar"
                      style={{
                        width: `${value.ENTRY / maxValue * 100}%`
                      }}
                    />
                  </div>

                  <div className="analytics-bar-track">
                    <div
                      className="analytics-bar exit-bar"
                      style={{
                        width: `${value.EXIT / maxValue * 100}%`
                      }}
                    />
                  </div>
                </div>

                <div className="analytics-bar-values">
                  {value.ENTRY} / {value.EXIT}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Attendance Trends */}
      <div className="panel analytics-monthly-panel">
        <div className="panel-heading">
          <div>
            <h3>Monthly Attendance Trends</h3>
            <p>Monthly comparison of student entry and exit events</p>
          </div>
        </div>

        {monthlyTrendData.length === 0 ? (
          <p>No monthly attendance data available yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />

              <Bar
                dataKey="entries"
                name="Entries"
                fill="#16a34a"
                radius={[5, 5, 0, 0]}
              />

              <Bar
                dataKey="exits"
                name="Exits"
                fill="#f97316"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Department-wise Attendance Comparison */}
      <div className="panel analytics-monthly-panel">
        <div className="panel-heading">
          <div>
            <h3>Department-wise Attendance</h3>
            <p>Average recorded attendance percentage by department</p>
          </div>
        </div>

        {departmentChartData.length === 0 ? (
          <p>No department attendance data available yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={departmentChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />

              <YAxis
                domain={[0, 100]}
                tickFormatter={value => `${value}%`}
              />

              <Tooltip
                formatter={value => [
                  `${value}%`,
                  "Average Attendance"
                ]}
              />

              <Legend />

              <Bar
                dataKey="averageAttendance"
                name="Average Attendance"
                fill="#8b5cf6"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Attendance Percentage Trends */}
      <div className="panel analytics-monthly-panel">
        <div className="panel-heading">
          <div>
            <h3>Attendance Percentage Trends</h3>
            <p>Attendance percentage across recorded sessions</p>
          </div>
        </div>

        {attendanceTrendData.length === 0 ? (
          <p>No attendance trend data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={attendanceTrendData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="date" />

              <YAxis
                domain={[0, 100]}
                tickFormatter={value => `${value}%`}
              />

              <Tooltip
                formatter={value => [`${value}%`, "Attendance"]}
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.subject || label
                }
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="attendance"
                name="Attendance %"
                stroke="#2563eb"
                strokeWidth={3}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Student Attendance Rankings */}
      <div className="student-ranking-grid">

        {/* Top 5 Students */}
        <div className="panel ranking-panel">
          <h3>Top 5 Students</h3>
          <p>Students with the highest attendance</p>

          {topStudents.length === 0 ? (
            <p>No completed attendance records available.</p>
          ) : (
            <div className="ranking-list">
              {topStudents.map((student, index) => (
                <div className="ranking-item" key={student.id}>
                  <div className="ranking-position">
                    {index + 1}
                  </div>

                  <div className="ranking-student-details">
                    <strong>{student.name}</strong>
                    <span>
                      {student.student_code} |{" "}
                      {student.department?.toUpperCase()}
                    </span>
                  </div>

                  <div className="ranking-percentage">
                    {student.attendance_percentage.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom 5 Students */}
        <div className="panel ranking-panel">
          <h3>Bottom 5 Students</h3>
          <p>Students who need attendance improvement</p>

          {bottomStudents.length === 0 ? (
            <p>No completed attendance records available.</p>
          ) : (
            <div className="ranking-list">
              {bottomStudents.map((student, index) => (
                <div className="ranking-item" key={student.id}>
                  <div className="ranking-position bottom-position">
                    {index + 1}
                  </div>

                  <div className="ranking-student-details">
                    <strong>{student.name}</strong>
                    <span>
                      {student.student_code} |{" "}
                      {student.department?.toUpperCase()}
                    </span>
                  </div>

                  <div className="ranking-percentage bottom-percentage">
                    {student.attendance_percentage.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default Analytics;
