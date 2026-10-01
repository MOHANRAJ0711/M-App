import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "../services/api";

function even(value: number) {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function waitForVideoSize(getVideos: () => HTMLVideoElement[]) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const started = Date.now();
    const check = () => {
      const videos = getVideos().filter((video) => video.readyState >= 2 && video.videoWidth > 0);
      const screen = videos.find((video) => video.dataset.freemeet === "screen") ?? videos[0];
      if (screen) {
        resolve({ width: even(screen.videoWidth), height: even(screen.videoHeight) });
        return;
      }
      if (Date.now() - started > 1200) {
        resolve({ width: 1920, height: 1080 });
        return;
      }
      window.setTimeout(check, 50);
    };
    check();
  });
}

function pickMimeType(withAudio: boolean) {
  const candidates = withAudio
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm";
}

function drawFitted(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: "contain" | "cover",
) {
  const frameWidth = video.videoWidth || width;
  const frameHeight = video.videoHeight || height;
  const scale =
    fit === "contain"
      ? Math.min(width / frameWidth, height / frameHeight)
      : Math.max(width / frameWidth, height / frameHeight);
  const drawWidth = frameWidth * scale;
  const drawHeight = frameHeight * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
  context.restore();
}

export type RecordingState = "IDLE" | "RECORDING" | "STOPPING" | "COMPLETED" | "ERROR";

type Session = {
  recorder: MediaRecorder;
  chunks: Blob[];
  canvas: HTMLCanvasElement;
  canvasStream: MediaStream;
  audioContext: AudioContext;
  sources: MediaStreamAudioSourceNode[];
  started: number;
};

export function useRecording({
  meetingId,
  getVideos,
  getAudioStreams,
  onBroadcast,
}: {
  meetingId: string;
  getVideos: () => HTMLVideoElement[];
  getAudioStreams: () => MediaStream[];
  onBroadcast: (active: boolean) => void;
}) {
  const [state, setState] = useState<RecordingState>("IDLE");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const frameRef = useRef(0);
  const onBroadcastRef = useRef(onBroadcast);
  const getVideosRef = useRef(getVideos);
  const getAudioStreamsRef = useRef(getAudioStreams);
  onBroadcastRef.current = onBroadcast;
  getVideosRef.current = getVideos;
  getAudioStreamsRef.current = getAudioStreams;

  useEffect(() => {
    if (state !== "RECORDING") return;
    const timer = window.setInterval(() => {
      const started = sessionRef.current?.started;
      if (!started) return;
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [state]);

  function cleanupSession(session: Session) {
    cancelAnimationFrame(frameRef.current);
    session.canvasStream.getTracks().forEach((track) => track.stop());
    session.sources.forEach((source) => source.disconnect());
    void session.audioContext.close();
    session.canvas.remove();
    sessionRef.current = null;
  }

  async function start() {
    if (sessionRef.current) return;
    setError(null);
    try {
      const frame = await waitForVideoSize(getVideosRef.current);
      const canvas = document.createElement("canvas");
      canvas.width = frame.width;
      canvas.height = frame.height;
      canvas.style.position = "fixed";
      canvas.style.left = "-10000px";
      canvas.style.top = "0";
      document.body.appendChild(canvas);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas is unavailable.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.fillStyle = "#111827";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const canvasStream = canvas.captureStream(30);
      const canvasTrack = canvasStream.getVideoTracks()[0];
      if (canvasTrack) canvasTrack.contentHint = "detail";
      const audioContext = new AudioContext({ sampleRate: 48000, latencyHint: "playback" });
      if (audioContext.state === "suspended") await audioContext.resume();
      const destination = audioContext.createMediaStreamDestination();
      const sources: MediaStreamAudioSourceNode[] = [];
      for (const media of getAudioStreamsRef.current()) {
        const tracks = media.getAudioTracks().filter((track) => track.readyState === "live");
        if (!tracks.length) continue;
        const source = audioContext.createMediaStreamSource(new MediaStream(tracks));
        source.connect(destination);
        sources.push(source);
      }

      const mixed = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...(sources.length ? destination.stream.getAudioTracks() : []),
      ]);
      const mimeType = pickMimeType(sources.length > 0);
      const videoBitsPerSecond = Math.min(20_000_000, Math.max(10_000_000, frame.width * frame.height * 5));
      const recorder = new MediaRecorder(mixed, {
        mimeType,
        videoBitsPerSecond,
        audioBitsPerSecond: 510_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      const started = Date.now();
      const session: Session = { recorder, chunks, canvas, canvasStream, audioContext, sources, started };
      sessionRef.current = session;

      const draw = () => {
        context.fillStyle = "#111827";
        context.fillRect(0, 0, canvas.width, canvas.height);
        const videos = getVideosRef.current().filter((video) => video.readyState >= 2 && video.videoWidth > 0);
        const screen = videos.find((video) => video.dataset.freemeet === "screen");
        const cameras = videos.filter((video) => video !== screen);
        if (screen) {
          if (screen.videoWidth === canvas.width && screen.videoHeight === canvas.height) {
            context.drawImage(screen, 0, 0);
          } else {
            drawFitted(context, screen, 0, 0, canvas.width, canvas.height, "cover");
          }
          const thumbWidth = 320;
          const thumbHeight = 180;
          cameras.forEach((video, index) => {
            const x = canvas.width - thumbWidth - 24;
            const y = canvas.height - (thumbHeight + 16) * (index + 1);
            drawFitted(context, video, x, y, thumbWidth, thumbHeight, "cover");
          });
        } else if (cameras.length) {
          const columns = cameras.length <= 1 ? 1 : cameras.length <= 4 ? 2 : 3;
          const rows = Math.ceil(cameras.length / columns);
          cameras.forEach((video, index) => {
            const width = canvas.width / columns;
            const height = canvas.height / rows;
            drawFitted(
              context,
              video,
              (index % columns) * width,
              Math.floor(index / columns) * height,
              width,
              height,
              "cover",
            );
          });
        }
        frameRef.current = requestAnimationFrame(draw);
      };
      draw();
      recorder.start(1000);
      setElapsed(0);
      setState("RECORDING");
      onBroadcastRef.current(true);
    } catch (startError) {
      console.error(startError);
      const session = sessionRef.current;
      if (session) cleanupSession(session);
      setState("ERROR");
      setError("Recording failed, but the meeting is still active.");
      onBroadcastRef.current(false);
    }
  }

  async function stop() {
    const session = sessionRef.current;
    if (!session || session.recorder.state === "inactive") return;
    setState("STOPPING");
    try {
      const blob = await new Promise<File>((resolve) => {
        session.recorder.onstop = () => {
          resolve(new File(session.chunks, "recording.webm", { type: "video/webm" }));
        };
        if (session.recorder.state === "recording") session.recorder.requestData();
        session.recorder.stop();
      });
      if (blob.size === 0) {
        throw new Error("The recording file was empty.");
      }
      const duration = Math.max(0, Math.round((Date.now() - session.started) / 1000));
      const startedAt = new Date(session.started).toISOString();
      const endedAt = new Date().toISOString();
      cleanupSession(session);
      await api.uploadRecording(meetingId, blob, { duration, startedAt, endedAt });
      setState("COMPLETED");
      onBroadcastRef.current(false);
    } catch (stopError) {
      console.error(stopError);
      if (sessionRef.current) cleanupSession(sessionRef.current);
      setState("ERROR");
      setError(
        stopError instanceof ApiError
          ? `${stopError.message} Recording failed, but the meeting is still active.`
          : "Recording failed, but the meeting is still active.",
      );
      onBroadcastRef.current(false);
    }
  }

  return { state, elapsed, error, start, stop };
}
