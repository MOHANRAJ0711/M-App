import { useCallback, useRef, useState } from "react";

function errorName(error: unknown) {
  return error instanceof DOMException ? error.name : "";
}

const microphone: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 2,
  sampleRate: 48000,
};

async function permissionIsBlocked() {
  if (!navigator.permissions?.query) return false;
  try {
    const camera = await navigator.permissions.query({ name: "camera" as PermissionName });
    const microphone = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return camera.state === "denied" || microphone.state === "denied";
  } catch {
    return false;
  }
}

async function openAvailableDevices(
  setCameraError: (message: string) => void,
  setMicrophoneError: (message: string) => void,
) {
  try {
    const video = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    setMicrophoneError("No microphone found. You can join without a microphone.");
    return video;
  } catch {
    setCameraError("No camera found. You can continue without video.");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ video: false, audio: microphone });
  } catch {
    setMicrophoneError("No microphone found. You can join without a microphone.");
    return new MediaStream();
  }
}

export function useLocalMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabledState] = useState(false);
  const [videoEnabled, setVideoEnabledState] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(true);
  const [screenNotice, setScreenNotice] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    screenRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    screenRef.current = null;
    setStream(null);
    setScreenStream(null);
  }, []);

  const start = useCallback(async () => {
    setRequesting(true);
    setCameraError(null);
    setMicrophoneError(null);
    setPermissionDenied(false);

    let next = new MediaStream();
    try {
      next = await navigator.mediaDevices.getUserMedia({ video: true, audio: microphone });
    } catch (error) {
      const name = errorName(error);
      if (name === "NotAllowedError" || name === "SecurityError") {
        const blocked = await permissionIsBlocked();
        setPermissionDenied(blocked);
        setNeedsPermission(true);
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        next = await openAvailableDevices(setCameraError, setMicrophoneError);
        setNeedsPermission(next.getTracks().length === 0);
      } else {
        setCameraError("Camera unavailable. You can continue without video.");
        setMicrophoneError("Microphone unavailable. You can join without a microphone.");
        setNeedsPermission(true);
      }
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = next;
    setStream(next);
    const hasAudio = Boolean(next.getAudioTracks()[0]);
    const hasVideo = Boolean(next.getVideoTracks()[0]);
    setAudioEnabledState(hasAudio);
    setVideoEnabledState(hasVideo);
    if (hasAudio || hasVideo) setNeedsPermission(false);
    setRequesting(false);
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) {
      setMicrophoneError("Microphone unavailable. You can join without a microphone.");
      return;
    }
    track.enabled = enabled;
    setAudioEnabledState(enabled);
  }, []);

  const toggleAudio = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) {
      void start();
      return;
    }
    track.enabled = !track.enabled;
    setAudioEnabledState(track.enabled);
  }, [start]);

  const toggleVideo = useCallback(async () => {
    const current = streamRef.current ?? new MediaStream();
    const track = current.getVideoTracks()[0];
    if (track) {
      track.stop();
      current.removeTrack(track);
      const next = new MediaStream(current.getTracks());
      streamRef.current = next;
      setStream(next);
      setVideoEnabledState(false);
      return;
    }

    try {
      const captured = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const videoTrack = captured.getVideoTracks()[0];
      if (!videoTrack) {
        setCameraError("Camera unavailable. You can continue without video.");
        return;
      }
      const next = new MediaStream([...current.getAudioTracks(), videoTrack]);
      streamRef.current = next;
      setStream(next);
      setVideoEnabledState(true);
      setCameraError(null);
      setNeedsPermission(false);
    } catch (error) {
      const name = errorName(error);
      if (name === "NotAllowedError" || name === "SecurityError") {
        setPermissionDenied(await permissionIsBlocked());
        setNeedsPermission(true);
        return;
      }
      setCameraError("Camera unavailable. You can continue without video.");
    }
  }, []);

  const clearScreenNotice = useCallback(() => setScreenNotice(null), []);

  const toggleScreenShare = useCallback(async () => {
    if (screenRef.current) {
      screenRef.current.getTracks().forEach((track) => track.stop());
      screenRef.current = null;
      setScreenStream(null);
      setScreenNotice("Screen sharing stopped.");
      return;
    }

    try {
      const pixelRatio = window.devicePixelRatio || 1;
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: Math.round(window.screen.width * pixelRatio) },
          height: { ideal: Math.round(window.screen.height * pixelRatio) },
          frameRate: { ideal: 30 },
        },
        audio: false,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        monitorTypeSurfaces: "include",
      } as DisplayMediaStreamOptions);
      const [track] = display.getVideoTracks();
      if (track) track.contentHint = "detail";
      track?.addEventListener("ended", () => {
        screenRef.current = null;
        setScreenStream(null);
        setScreenNotice("Screen sharing stopped.");
      });
      screenRef.current = display;
      setScreenStream(display);
      setScreenNotice("You are sharing your screen. Others can see it.");
    } catch (error) {
      if (errorName(error) === "NotAllowedError" || errorName(error) === "AbortError") {
        setScreenNotice("Screen share was cancelled.");
        return;
      }
      setScreenNotice("Screen sharing is unavailable.");
    }
  }, []);

  return {
    stream,
    screenStream,
    audioEnabled,
    videoEnabled,
    screenSharing: Boolean(screenStream),
    cameraError,
    microphoneError,
    permissionDenied,
    needsPermission,
    requesting,
    screenNotice,
    clearScreenNotice,
    start,
    stop,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    setAudioEnabled,
  };
}
