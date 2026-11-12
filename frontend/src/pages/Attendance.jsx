
import { useEffect, useState } from "react";
import { getAttendanceEvents } from "../services/api";


function parseMySQLDateTime(value) {
  if (!value) return null;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  // Preserve the database's original clock time.
  return new Date(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
    parsed.getUTCHours(),
    parsed.getUTCMinutes(),
    parsed.getUTCSeconds()
  );
}


function formatTime(value) {
  const date = parseMySQLDateTime(value);

  if (!date || Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function calculateDuration(entry, exit) {
  if (!entry || !exit) return "-";

  const start = parseMySQLDateTime(entry);
  const end = parseMySQLDateTime(exit);

  if (!start || !end || end < start) return "-";

  const totalMinutes = Math.floor((end - start) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  return `${hours} hr ${minutes} min`;
}

function buildAttendanceSummary(events) {
  const groups = {};

  events.forEach((event) => {
    const key = `${event.student_id}-${event.session_id}`;

    if (!groups[key]) {
      groups[key] = {
        student_id: event.student_id,
        student_code: event.student_code,
        student_name: event.student_name,
        session_id: event.session_id,
        entry: null,
        exit: null,
        verification_method: event.verification_method,
        statuses: []
      };
    }

    const group = groups[key];

    if (event.event_type === "ENTRY") {
      if (
        !group.entry ||
        parseMySQLDateTime(event.event_time) <
          parseMySQLDateTime(group.entry)
      ) {
        group.entry = event.event_time;
      }
    }

    if (event.event_type === "EXIT") {
      if (
        !group.exit ||
        parseMySQLDateTime(event.event_time) >
          parseMySQLDateTime(group.exit)
      ) {
        group.exit = event.event_time;
      }
    }

    group.statuses.push(event.verification_status);
  });

  return Object.values(groups).map((group) => ({
    ...group,
    status: group.statuses.includes("review")
      ? "Review"
      : "Verified"
  }));
}

export default function Attendance() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAttendanceEvents();
      setEvents(response.data);
    } catch (err) {
      console.error(err);
      setError("Unable to load attendance records. Check your backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const attendance = buildAttendanceSummary(events);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance Management</h1>
          <p className="text-gray-500 mt-1">
            Student-wise entry, exit and classroom duration.
          </p>
        </div>

        <button
          onClick={loadAttendance}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-gray-500">Total Attendance Events</p>
          <h2 className="text-3xl font-bold mt-2">{events.length}</h2>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-gray-500">Students / Sessions</p>
          <h2 className="text-3xl font-bold mt-2">
            {attendance.length}
          </h2>
        </div>
      </div>

      {error && (
        <p className="text-red-600 mb-4">{error}</p>
      )}

      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-4">Student ID</th>
              <th className="p-4">Student Name</th>
              <th className="p-4">Session ID</th>
              <th className="p-4">Entry Time</th>
              <th className="p-4">Exit Time</th>
              <th className="p-4">Duration</th>
              <th className="p-4">Verification</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {attendance.map((record) => (
              <tr
                key={`${record.student_id}-${record.session_id}`}
                className="border-t hover:bg-gray-50"
              >
                <td className="p-4">{record.student_code}</td>
                <td className="p-4">{record.student_name}</td>
                <td className="p-4">{record.session_id}</td>
                <td className="p-4">
                  {formatTime(record.entry)}
                </td>
                <td className="p-4">
                  {formatTime(record.exit)}
                </td>
                <td className="p-4 font-medium">
                  {calculateDuration(record.entry, record.exit)}
                </td>
                <td className="p-4">
                  {record.verification_method}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      record.status === "Review"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}

            {!loading && attendance.length === 0 && (
              <tr>
                <td
                  colSpan="8"
                  className="p-6 text-center text-gray-500"
                >
                  No attendance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
