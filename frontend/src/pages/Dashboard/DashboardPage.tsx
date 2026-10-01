import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../../components/common/AppShell";
import { useAuth } from "../../components/common/AuthProvider";
import { MeetingLists } from "../../components/dashboard/MeetingLists";
import { ApiError, api } from "../../services/api";
import type { Meeting, Recording } from "../../types";
import { formatDate, formatDuration } from "../../utils/format";
import { cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from "../../utils/styles";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [title, setTitle] = useState("New meeting");
  const [meetingCode, setMeetingCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listMeetings()
      .then((result) => {
        setUpcoming(result.upcoming);
        setRecent(result.recent);
      })
      .catch((listError: unknown) => {
        setError(listError instanceof ApiError ? listError.message : "Could not load meetings.");
      });
    const params = new URLSearchParams({ sort: "newest" });
    api
      .recordings(params)
      .then((result) => setRecordings(result.recordings.slice(0, 5)))
      .catch(() => undefined);
  }, []);

  async function createMeeting(event: React.FormEvent) {
    event.preventDefault();
    try {
      const meeting = await api.createMeeting(title.trim() || "New meeting");
      navigate(`/meeting/${meeting.meetingCode}`);
    } catch (createError) {
      setError(createError instanceof ApiError ? createError.message : "Could not create the meeting.");
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold sm:text-3xl">Welcome, {user?.name}</h1>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-3 grid items-stretch gap-3 sm:mt-4 sm:grid-cols-2">
        <form onSubmit={createMeeting} className={`${cardClass} flex h-full flex-col gap-3`}>
          <label className="text-sm font-medium text-gray-700" htmlFor="meeting-title">
            Meeting title
          </label>
          <input id="meeting-title" className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} />
          <button className={`${primaryButtonClass} mt-auto w-fit`} type="submit">
            + Create Meeting
          </button>
        </form>
        <form
          className={`${cardClass} flex h-full flex-col gap-3`}
          onSubmit={(event) => {
            event.preventDefault();
            if (meetingCode.trim()) navigate(`/meeting/${meetingCode.trim().toUpperCase()}`);
          }}
        >
          <label className="text-sm font-medium text-gray-700" htmlFor="meeting-code">
            Meeting ID
          </label>
          <input
            id="meeting-code"
            className={inputClass}
            value={meetingCode}
            placeholder="ABC-123-XYZ"
            onChange={(event) => setMeetingCode(event.target.value)}
          />
          <button className={`${secondaryButtonClass} mt-auto w-fit`} type="submit">
            Join Meeting
          </button>
        </form>
      </div>
      <div className="mt-3">
        <MeetingLists upcoming={upcoming} recent={recent} />
      </div>
      <section className={`${cardClass} mt-3`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-gray-500">Recent Recordings</h2>
          <Link to="/recordings" className="text-sm font-medium text-blue-700">
            View all
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {recordings.length === 0 && <p className="text-sm text-gray-500">No recordings yet.</p>}
          {recordings.map((recording) => (
            <Link
              key={recording.id}
              to={`/recordings/${recording.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-3 hover:border-gray-300"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{recording.meetingTitle ?? "Recording"}</span>
                <span className="text-sm text-gray-500">
                  {formatDate(recording.createdAt)} · {formatDuration(recording.duration)}
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium text-blue-700">Play</span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
