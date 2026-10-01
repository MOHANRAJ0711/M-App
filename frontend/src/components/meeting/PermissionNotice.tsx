import { primaryButtonClass } from "../../utils/styles";

export function PermissionNotice({
  requesting,
  permissionDenied,
  cameraError,
  microphoneError,
  onRetry,
}: {
  requesting: boolean;
  permissionDenied: boolean;
  cameraError: string | null;
  microphoneError: string | null;
  onRetry: () => void;
}) {
  if (!requesting && !permissionDenied && !cameraError && !microphoneError) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-amber-700/40 bg-neutral-900 px-4 py-3 text-sm text-neutral-100">
      {requesting && <p>Requesting camera and microphone...</p>}
      {permissionDenied && (
        <div className="space-y-3">
          <p className="font-medium">Camera and microphone are blocked</p>
          <ol className="list-decimal space-y-1 pl-5 text-neutral-300">
            <li>Click the camera or lock icon in the address bar.</li>
            <li>Set Camera and Microphone to Allow.</li>
            <li>Click Try again. You can stay in the meeting without them.</li>
          </ol>
          <button type="button" className={primaryButtonClass} onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
      {!permissionDenied && cameraError && <p>{cameraError}</p>}
      {!permissionDenied && microphoneError && <p className={cameraError ? "mt-2" : ""}>{microphoneError}</p>}
      {!permissionDenied && (cameraError || microphoneError) && !requesting && (
        <button type="button" className={`${primaryButtonClass} mt-3`} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
