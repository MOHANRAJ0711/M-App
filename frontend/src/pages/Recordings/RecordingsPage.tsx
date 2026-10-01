import { useEffect, useState } from "react";
import { AppShell } from "../../components/common/AppShell";
import { RecordingCard } from "../../components/recordings/RecordingCard";
import { ApiError, api } from "../../services/api";
import type { Meeting, Recording } from "../../types";
import { inputClass, secondaryButtonClass } from "../../utils/styles";

export function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [search, setSearch] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function query(nextCursor?: string) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (meetingId) params.set("meetingId", meetingId);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    params.set("sort", sort);
    if (nextCursor) params.set("cursor", nextCursor);
    return params;
  }

  async function load(append = false, nextCursor?: string) {
    try {
      const result = await api.recordings(query(nextCursor));
      setRecordings((current) => (append ? [...current, ...result.recordings] : result.recordings));
      setCursor(result.nextCursor);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Could not load recordings.");
    }
  }

  useEffect(() => {
    api
      .listMeetings()
      .then((result) => setMeetings([...result.upcoming, ...result.recent]))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void load(false);
  }, [sort]);

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Recordings</h1>
      <form
        className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          void load(false);
        }}
      >
        <input className={inputClass} placeholder="Search meetings" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className={inputClass} value={meetingId} onChange={(event) => setMeetingId(event.target.value)}>
          <option value="">All meetings</option>
          {meetings.map((meeting) => (
            <option key={meeting.id} value={meeting.id}>
              {meeting.title}
            </option>
          ))}
        </select>
        <input className={inputClass} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input className={inputClass} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <button className={secondaryButtonClass} type="submit">
          Apply
        </button>
      </form>
      <label className="mt-4 block text-sm text-gray-600">
        Sort
        <select className={`${inputClass} mt-1 max-w-xs`} value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </label>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-6 space-y-3">
        {recordings.length === 0 && <p className="text-sm text-gray-500">No recordings yet.</p>}
        {recordings.map((recording) => (
          <RecordingCard
            key={recording.id}
            recording={recording}
            confirming={confirmId === recording.id}
            onConfirm={() => setConfirmId(recording.id)}
            onCancel={() => setConfirmId(null)}
            onDelete={() => {
              void api.deleteRecording(recording.id).then(() => {
                setRecordings((current) => current.filter((item) => item.id !== recording.id));
                setConfirmId(null);
              }).catch((deleteError: unknown) => {
                setError(deleteError instanceof ApiError ? deleteError.message : "Could not delete the recording.");
              });
            }}
          />
        ))}
      </div>
      {cursor && (
        <button type="button" className={`${secondaryButtonClass} mt-4`} onClick={() => void load(true, cursor)}>
          Load more
        </button>
      )}
    </AppShell>
  );
}
