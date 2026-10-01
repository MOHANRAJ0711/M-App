import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../../components/common/AppShell";
import { ApiError, api } from "../../services/api";
import type { Recording } from "../../types";
import { formatDate, formatDuration } from "../../utils/format";
import { secondaryButtonClass } from "../../utils/styles";

export function RecordingPlayerPage() {
  const { id = "" } = useParams();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .recording(id)
      .then((result) => setRecording(result.recording))
      .catch((loadError: unknown) => {
        setError(loadError instanceof ApiError ? loadError.message : "Could not open this recording.");
      });
  }, [id]);

  return (
    <AppShell>
      <Link to="/recordings" className="text-sm text-blue-700">
        Back to recordings
      </Link>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {recording && (
        <div className="mt-4">
          <h1 className="text-2xl font-semibold">{recording.meetingTitle ?? "Recording"}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(recording.createdAt)} · {formatDuration(recording.duration)}
          </p>
          <video
            className="mt-4 max-h-[80vh] w-full rounded-xl bg-black"
            controls
            src={`/api/recordings/${recording.id}/stream`}
          />
          <a className={`${secondaryButtonClass} mt-4`} href={`/api/recordings/${recording.id}/download`}>
            Download
          </a>
        </div>
      )}
    </AppShell>
  );
}
