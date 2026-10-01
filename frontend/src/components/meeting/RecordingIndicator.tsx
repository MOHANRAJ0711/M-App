import { formatClock } from "../../utils/format";

export function RecordingIndicator({ active, elapsed }: { active: boolean; elapsed: number }) {
  if (!active) return <span className="text-sm text-neutral-400">Not recording</span>;

  return (
    <span className="inline-flex items-center gap-2 text-sm text-white">
      <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
      Recording {formatClock(elapsed)}
    </span>
  );
}
