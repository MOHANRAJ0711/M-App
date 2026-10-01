export type ToastAction = {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ToastStack({ toasts, onDismiss }: { toasts: ToastAction[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-xl border border-white/15 bg-neutral-950 px-4 py-3 text-sm text-white shadow-lg"
        >
          <p className="min-w-0 flex-1">{toast.message}</p>
          {toast.actionLabel && toast.onAction && (
            <button type="button" className="shrink-0 font-medium text-blue-300" onClick={toast.onAction}>
              {toast.actionLabel}
            </button>
          )}
          <button type="button" className="shrink-0 text-neutral-400" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
            Close
          </button>
        </div>
      ))}
    </div>
  );
}
