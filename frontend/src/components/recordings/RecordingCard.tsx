import { Link } from "react-router-dom";
import type { Recording } from "../../types";
import { formatDate, formatDuration } from "../../utils/format";
import { secondaryButtonClass } from "../../utils/styles";

export function RecordingCard({
  recording,
  confirming,
  onConfirm,
  onDelete,
  onCancel,
}: {
  recording: Recording;
  confirming: boolean;
  onConfirm: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white px-4 py-4">
      <h2 className="font-medium">{recording.meetingTitle ?? "Recording"}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {formatDate(recording.createdAt)} · {formatDuration(recording.duration)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={`/recordings/${recording.id}`} className={secondaryButtonClass}>
          Play
        </Link>
        <a className={secondaryButtonClass} href={`/api/recordings/${recording.id}/download`}>
          Download
        </a>
        {confirming ? (
          <>
            <button type="button" className={secondaryButtonClass} onClick={onDelete}>
              Confirm delete
            </button>
            <button type="button" className={secondaryButtonClass} onClick={onCancel}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className={secondaryButtonClass} onClick={onConfirm}>
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
