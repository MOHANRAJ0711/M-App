export function VideoGrid({ count, children }: { count: number; children: React.ReactNode }) {
  const columns = count <= 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";
  const rows = count <= 2 ? "grid-rows-1" : "grid-rows-2";

  return (
    <div className={`grid h-full min-h-0 w-full gap-3 overflow-hidden p-3 ${columns} ${rows}`}>{children}</div>
  );
}
