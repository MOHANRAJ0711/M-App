import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/common/AppShell";
import { useAuth } from "../../components/common/AuthProvider";
import { ApiError, api } from "../../services/api";
import { cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from "../../utils/styles";

export function HomePage() {
  const { user, enter } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(() => localStorage.getItem("freemeet-name") ?? "");
  const [title, setTitle] = useState("New meeting");
  const [meetingCode, setMeetingCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<"loading" | "ok" | "down">("loading");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/health")
      .then((response) => setHealth(response.ok ? "ok" : "down"))
      .catch(() => setHealth("down"));
  }, []);

  async function ready(displayName: string) {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("Enter your name.");
      return false;
    }
    if (!user || user.name !== trimmed) await enter(trimmed);
    return true;
  }

  async function createMeeting(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      if (!(await ready(name))) return;
      const meeting = await api.createMeeting(title.trim() || "New meeting");
      navigate(`/meeting/${meeting.meetingCode}`);
    } catch (createError) {
      setError(createError instanceof ApiError ? createError.message : "Could not create the meeting.");
    } finally {
      setCreating(false);
    }
  }

  async function joinMeeting(event: React.FormEvent) {
    event.preventDefault();
    const code = meetingCode.trim().toUpperCase();
    if (!code) return;
    setError(null);
    try {
      if (!(await ready(name))) return;
      navigate(`/meeting/${code}`);
    } catch (joinError) {
      setError(joinError instanceof ApiError ? joinError.message : "Could not join the meeting.");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl">
        <p className="text-sm text-gray-500">No account. Free to use.</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">FreeMeet</h1>
        <p className="mt-3 text-lg text-gray-600">Create a meeting, or join with a room ID or link.</p>
        {health === "down" && (
          <p className={`${cardClass} mt-6 text-sm text-gray-700`}>
            FreeMeet is unavailable. Start the backend on port 3000 and refresh.
          </p>
        )}
        {health === "ok" && <p className="mt-4 text-xs text-gray-400">Server status: ok</p>}
        <label className={`${cardClass} mt-8 block text-sm font-medium`}>
          Your name
          <input
            className={`${inputClass} mt-2`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex"
          />
        </label>
        <form onSubmit={createMeeting} className={`${cardClass} mt-4 space-y-4`}>
          <label className="block text-sm font-medium">
            Meeting name
            <input className={`${inputClass} mt-2`} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <button className={primaryButtonClass} type="submit" disabled={creating}>
            Create Meeting
          </button>
        </form>
        <form onSubmit={joinMeeting} className={`${cardClass} mt-4 space-y-4`}>
          <label className="block text-sm font-medium">
            Meeting ID
            <input
              className={`${inputClass} mt-2 uppercase`}
              value={meetingCode}
              onChange={(event) => setMeetingCode(event.target.value)}
              placeholder="ABC-123-XYZ"
            />
          </label>
          <button className={secondaryButtonClass} type="submit">
            Join Meeting
          </button>
        </form>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      </div>
    </AppShell>
  );
}
