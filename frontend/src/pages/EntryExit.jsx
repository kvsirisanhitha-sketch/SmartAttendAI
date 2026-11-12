
import { useEffect, useState } from "react";
import { getAttendanceEvents } from "../services/api";

function formatEventTime(value) {
  if (!value) return "-";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "-";

  // Flask serializes MySQL DATETIME as a GMT date string.
  // Preserve the original database clock time.
  const localDate = new Date(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
    parsed.getUTCHours(),
    parsed.getUTCMinutes(),
    parsed.getUTCSeconds()
  );

  return localDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export default function EntryExit() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAttendanceEvents();
      setEvents(response.data);
    } catch (err) {
      console.error(err);
      setError("Unable to load Entry & Exit records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const entries = events.filter(
    (event) => event.event_type === "ENTRY"
  ).length;

  const exits = events.filter(
    (event) => event.event_type === "EXIT"
  ).length;

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Entry & Exit Monitoring
          </h1>
          <p className="text-gray-500 mt-1">
            Monitor student classroom entry and exit events.
          </p>
        </div>

        <button
          onClick={loadEvents}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-xl p-5">
          <p className="text-gray-500">Total Events</p>
          <h2 className="text-3xl font-bold mt-2">
            {events.length}
          </h2>
        </div>

        <div className="bg-white shadow rounded-xl p-5">
          <p className="text-gray-500">Entry Events</p>
          <h2 className="text-3xl font-bold text-green-600 mt-2">
            {entries}
          </h2>
        </div>

        <div className="bg-white shadow rounded-xl p-5">
          <p className="text-gray-500">Exit Events</p>
          <h2 className="text-3xl font-bold text-orange-600 mt-2">
            {exits}
          </h2>
        </div>
      </div>

      {error && (
        <p className="text-red-600 mb-4">{error}</p>
      )}

      <div className="bg-white shadow rounded-xl overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-4">Student ID</th>
              <th className="p-4">Student Name</th>
              <th className="p-4">Session ID</th>
              <th className="p-4">Event</th>
              <th className="p-4">Date & Time</th>
              <th className="p-4">Method</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t hover:bg-gray-50">
                <td className="p-4">{event.student_code}</td>
                <td className="p-4">{event.student_name}</td>
                <td className="p-4">{event.session_id}</td>

                <td className="p-4">
                  <span className={
                    event.event_type === "ENTRY"
                      ? "bg-green-100 text-green-700 px-2 py-1 rounded"
                      : "bg-orange-100 text-orange-700 px-2 py-1 rounded"
                  }>
                    {event.event_type}
                  </span>
                </td>

                <td className="p-4">
                  {formatEventTime(event.event_time)}
                </td>

                <td className="p-4">
                  {event.verification_method}
                </td>

                <td className="p-4">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    {event.verification_status}
                  </span>
                </td>
              </tr>
            ))}

            {!loading && events.length === 0 && (
              <tr>
                <td colSpan="7" className="p-6 text-center text-gray-500">
                  No Entry or Exit events found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
