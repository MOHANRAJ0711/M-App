import { useEffect, useRef } from "react";

export function VideoTile({
  id,
  stream,
  name,
  muted = false,
  speaking = false,
  contain = false,
  onVideo,
}: {
  id: string;
  stream: MediaStream | null;
  name: string;
  muted?: boolean;
  speaking?: boolean;
  contain?: boolean;
  onVideo?: (id: string, element: HTMLVideoElement | null) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const hasVideo = Boolean(
    stream?.getVideoTracks().some((track) => track.enabled && track.readyState === "live"),
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.srcObject = stream;
    element.dataset.freemeet = "camera";
    onVideo?.(id, element);
    return () => onVideo?.(id, null);
  }, [id, onVideo, stream]);

  return (
    <div
      className={`relative h-full min-h-0 w-full overflow-hidden rounded-xl bg-neutral-800 ${speaking ? "ring-2 ring-blue-500" : ""}`}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full ${contain ? "object-contain" : "object-cover"} ${hasVideo ? "" : "invisible"}`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center text-2xl font-medium text-white">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">{name}</span>
    </div>
  );
}

export function CaptureVideo({
  id,
  stream,
  onVideo,
}: {
  id: string;
  stream: MediaStream | null;
  onVideo?: (id: string, element: HTMLVideoElement | null) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.srcObject = stream;
    element.dataset.freemeet = "screen";
    onVideo?.(id, element);
    return () => onVideo?.(id, null);
  }, [id, onVideo, stream]);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className="pointer-events-none fixed top-0 -left-[4000px] h-[1080px] w-[1920px] opacity-0"
    />
  );
}
