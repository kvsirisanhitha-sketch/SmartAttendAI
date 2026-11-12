
import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

function AttendanceReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // Load attendance reports
  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://127.0.0.1:5000/api/analytics/reports/attendance"
      );

      if (!response.ok) {
        throw new Error("Failed to load attendance reports");
      }

      const data = await response.json();
      setReports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Format date
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
  };

  // Filter reports
  const filteredReports = reports.filter((report) => {
    const departmentMatch =
      departmentFilter === "All" ||
      report.department === departmentFilter;

    const subjectMatch =
      subjectFilter === "All" ||
      report.subject_name === subjectFilter;

    const statusMatch =
      statusFilter === "All" ||
      report.status === statusFilter;

    const dateMatch =
      !dateFilter ||
      new Date(report.session_date).toISOString().slice(0, 10) === dateFilter;

    return (
      departmentMatch &&
      subjectMatch &&
      statusMatch &&
      dateMatch
    );
  });

  // Chart data
  const statusChartData = [
    {
      name: "Present",
      value: filteredReports.filter((r) => r.status === "present").length
    },
    {
      name: "Absent",
      value: filteredReports.filter((r) => r.status === "absent").length
    },
    {
      name: "Late",
      value: filteredReports.filter((r) => r.status === "late").length
    },
    {
      name: "Partial",
      value: filteredReports.filter((r) => r.status === "partial").length
    },
    {
      name: "Review",
      value: filteredReports.filter((r) => r.status === "review").length
    }
  ];

  const chartColors = [
    "#16a34a",
    "#dc2626",
    "#f97316",
    "#eab308",
    "#2563eb"
  ];

  // Export filtered reports to Excel
  const exportToExcel = () => {
    if (filteredReports.length === 0) {
      alert("No attendance records available to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      filteredReports.map((report) => ({
        "Student ID": report.student_code,
        "Student Name": report.student_name,
        Department: report.department,
        "Subject Code": report.subject_code,
        Subject: report.subject_name,
        Class: report.class_name,
        "Session Date": formatDate(report.session_date),
        "Total Minutes": report.total_minutes,
        "Late Minutes": report.late_minutes,
        "Early Exit Minutes": report.early_exit_minutes,
        "Attendance Percentage": report.attendance_percentage + "%",
        Status: report.status
      }))
    );

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Attendance Reports"
    );

    XLSX.writeFile(
      workbook,
      "SmartAttend_Attendance_Report.xlsx"
    );
  };

  // Reset all filters
  const resetFilters = () => {
    setDepartmentFilter("All");
    setSubjectFilter("All");
    setStatusFilter("All");
    setDateFilter("");
  };

  return (
    <div className="page-container">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Attendance Reports</h2>
          <p>Session-wise student attendance records</p>
        </div>

        <div className="report-actions">
          <button
            onClick={loadReports}
            className="report-refresh-btn"
          >
            Refresh Reports
          </button>

          <button
            onClick={exportToExcel}
            className="report-export-btn"
          >
            Export to Excel
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="report-summary-card">
        <h3>Total Report Records</h3>
        <h2>{filteredReports.length}</h2>
      </div>

      {/* Filters */}
      <div className="report-filter-panel">
        <h3>Filter Attendance Reports</h3>

        <div className="report-filter-grid">

          <div>
            <label>Department</label>
            <select
              value={departmentFilter}
              onChange={(e) =>
                setDepartmentFilter(e.target.value)
              }
            >
              <option value="All">All Departments</option>

              {[...new Set(
                reports.map((r) => r.department).filter(Boolean)
              )].map((department) => (
                <option key={department} value={department}>
                  {department.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Subject</label>
            <select
              value={subjectFilter}
              onChange={(e) =>
                setSubjectFilter(e.target.value)
              }
            >
              <option value="All">All Subjects</option>

              {[...new Set(
                reports.map((r) => r.subject_name).filter(Boolean)
              )].map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Status</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="All">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="partial">Partial</option>
              <option value="review">Review</option>
            </select>
          </div>

          <div>
            <label>Session Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) =>
                setDateFilter(e.target.value)
              }
            />
          </div>

        </div>

        <button
          className="report-refresh-btn"
          onClick={resetFilters}
        >
          Reset Filters
        </button>
      </div>

      {loading && (
        <p>Loading attendance reports...</p>
      )}

      {error && (
        <p className="report-error">{error}</p>
      )}

      {!loading && !error && (
        <>
          {/* Charts */}
          <div className="report-charts-grid">

            <div className="report-chart-card">
              <h3>Attendance Status Distribution</h3>

              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData.filter(
                      (item) => item.value > 0
                    )}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label
                  >
                    {statusChartData
                      .filter((item) => item.value > 0)
                      .map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            chartColors[
                              ["Present", "Absent", "Late", "Partial", "Review"]
                                .indexOf(entry.name)
                            ]
                          }
                        />
                      ))}
                  </Pie>

                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="report-chart-card">
              <h3>Attendance Status Comparison</h3>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />

                  <Bar
                    dataKey="value"
                    name="Number of Records"
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* Attendance Table */}
          <div className="panel student-list-panel">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>Subject Code</th>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Session Date</th>
                    <th>Total Minutes</th>
                    <th>Late Minutes</th>
                    <th>Early Exit</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReports.length > 0 ? (
                    filteredReports.map((report, index) => (
                      <tr
                        key={`${report.student_code}-${report.session_date}-${index}`}
                      >
                        <td>{report.student_code}</td>
                        <td>{report.student_name}</td>
                        <td>{report.department}</td>
                        <td>{report.subject_code}</td>
                        <td>{report.subject_name}</td>
                        <td>{report.class_name}</td>
                        <td>{formatDate(report.session_date)}</td>
                        <td>{report.total_minutes}</td>
                        <td>{report.late_minutes}</td>
                        <td>{report.early_exit_minutes}</td>
                        <td>{report.attendance_percentage}%</td>
                        <td>
                          <span
                            className={`report-status ${report.status}`}
                          >
                            {report.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="12">
                        No attendance reports available for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default AttendanceReports;
