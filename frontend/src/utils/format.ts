export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, "0")).join(":");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(value: string) {
  const date = new Date(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDuration(durationSeconds: number | null) {
  if (!durationSeconds || durationSeconds < 60) return "Less than a minute";
  const minutes = Math.round(durationSeconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
