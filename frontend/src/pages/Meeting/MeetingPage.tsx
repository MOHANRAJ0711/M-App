import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../components/common/AuthProvider";
import { ToastStack, type ToastAction } from "../../components/common/ToastStack";
import { ChatPanel } from "../../components/meeting/ChatPanel";
import { MeetingControls } from "../../components/meeting/MeetingControls";
import { ParticipantList } from "../../components/meeting/ParticipantList";
import { RecordingIndicator } from "../../components/meeting/RecordingIndicator";
import { VideoGrid } from "../../components/meeting/VideoGrid";
import { CaptureVideo, VideoTile } from "../../components/meeting/VideoTile";
import { useLocalMedia } from "../../hooks/useLocalMedia";
import { useMeeting } from "../../hooks/useMeeting";
import { useRecording } from "../../hooks/useRecording";
import { useWebRTC } from "../../hooks/useWebRTC";
import { ApiError, api } from "../../services/api";
import type { ParticipantRole } from "../../types";
import { primaryButtonClass, secondaryButtonClass } from "../../utils/styles";

export function MeetingPage() {
  const { meetingCode = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, enter } = useAuth();
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("freemeet-name") ?? "");
  const { meeting, error, loading } = useMeeting(meetingCode);
  const [role, setRole] = useState<ParticipantRole | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const media = useLocalMedia();
  const [inCall, setInCall] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [remoteElapsed, setRemoteElapsed] = useState(0);
  const [hiddenToasts, setHiddenToasts] = useState<string[]>([]);
  const videoMap = useRef(new Map<string, HTMLVideoElement>());

  useEffect(() => {
    const html = document.documentElement;
    const previous = {
      htmlBackground: html.style.background,
      bodyBackground: document.body.style.background,
      htmlOverflow: html.style.overflow,
      overflow: document.body.style.overflow,
    };
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (inCall) {
      html.style.background = "#0a0a0a";
      document.body.style.background = "#0a0a0a";
    }
    return () => {
      html.style.background = previous.htmlBackground;
      document.body.style.background = previous.bodyBackground;
      html.style.overflow = previous.htmlOverflow;
      document.body.style.overflow = previous.overflow;
    };
  }, [inCall]);

  const onVideo = useCallback((id: string, element: HTMLVideoElement | null) => {
    if (element) videoMap.current.set(id, element);
    else videoMap.current.delete(id);
  }, []);

  const onForceMute = useCallback(() => media.setAudioEnabled(false), [media.setAudioEnabled]);
  const screenTrack = media.screenStream?.getVideoTracks()[0] ?? null;
  const call = useWebRTC({
    meetingCode,
    localStream: media.stream,
    screenTrack,
    active: inCall,
    localUserId: user?.id ?? "local",
    onForceMute,
  });

  const recording = useRecording({
    meetingId: meeting?.id ?? "",
    getVideos: () => Array.from(videoMap.current.values()),
    getAudioStreams: () => [media.stream, ...call.remotes.map((peer) => peer.stream)].filter((stream) => stream !== null),
    onBroadcast: call.broadcastRecording,
  });

  useEffect(() => {
    return () => media.stop();
  }, [media.stop]);

  useEffect(() => {
    if (!call.recording.active || !call.recording.startedAt) return;
    const startedAt = new Date(call.recording.startedAt).getTime();
    const timer = window.setInterval(() => {
      setRemoteElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [call.recording.active, call.recording.startedAt]);

  useEffect(() => {
    if (call.ended || call.removedMessage) media.stop();
  }, [call.ended, call.removedMessage, media.stop]);

  if (loading || authLoading) return <p className="p-8 text-sm text-gray-500">Opening meeting...</p>;
  if (error || !meeting) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <p className="text-sm text-red-700">{error ?? "Could not open this meeting."}</p>
        <Link to="/" className={`${secondaryButtonClass} mt-4`}>
          Back home
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
        <p className="text-sm text-gray-500">{meeting.meetingCode}</p>
        <h1 className="mt-1 text-3xl font-semibold">{meeting.title}</h1>
        <form
          className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void enter(displayName).catch((enterError: unknown) => {
              setEntryError(enterError instanceof ApiError ? enterError.message : "Could not continue.");
            });
          }}
        >
          <label className="block text-sm font-medium">
            Your name
            <input
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Alex"
              required
            />
          </label>
          {entryError && <p className="text-sm text-red-700">{entryError}</p>}
          <button type="submit" className={primaryButtonClass}>
            Continue
          </button>
        </form>
      </div>
    );
  }

  if (call.ended || call.removedMessage) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <h1 className="text-2xl font-semibold">{call.ended ? "The meeting has ended." : call.removedMessage}</h1>
        <button type="button" className={`${primaryButtonClass} mt-4`} onClick={() => navigate("/dashboard")}>
          Back to dashboard
        </button>
      </div>
    );
  }

  const localPreview = media.screenSharing ? null : media.stream;
  const toasts: ToastAction[] = [];
  if (media.requesting && !hiddenToasts.includes("requesting")) {
    toasts.push({
      id: "requesting",
      message: "Allow camera and microphone when the browser asks.",
    });
  }
  if (!media.permissionDenied && media.cameraError && !hiddenToasts.includes("camera")) {
    toasts.push({ id: "camera", message: media.cameraError });
  }
  if (!media.permissionDenied && media.microphoneError && !hiddenToasts.includes("mic")) {
    toasts.push({ id: "mic", message: media.microphoneError });
  }
  if (media.screenNotice) {
    const screenId = `screen:${media.screenNotice}`;
    if (!hiddenToasts.includes(screenId)) {
      toasts.push({
        id: screenId,
        message: media.screenNotice,
        actionLabel: media.screenSharing ? "Stop sharing" : undefined,
        onAction: media.screenSharing
          ? () => {
              void media.toggleScreenShare();
            }
          : undefined,
      });
    }
  }
  if (inCall && call.connection === "reconnecting" && !hiddenToasts.includes("connection")) {
    toasts.push({ id: "connection", message: "Connection lost. Reconnecting..." });
  }
  if (inCall && call.joinError && !hiddenToasts.includes("join")) {
    toasts.push({ id: "join", message: call.joinError });
  }
  if (inCall && call.meetingError && !hiddenToasts.includes("meeting")) {
    toasts.push({ id: "meeting", message: call.meetingError });
  }
  if (recording.error && !hiddenToasts.includes("recording")) {
    toasts.push({ id: "recording", message: recording.error });
  }
  const dismissToast = (id: string) => {
    setHiddenToasts((current) => (current.includes(id) ? current : [...current, id]));
    if (id.startsWith("screen:")) media.clearScreenNotice();
  };
  const tiles = 1 + call.remotes.length;
  const recordingActive = recording.state === "RECORDING" || recording.state === "STOPPING" || call.recording.active;
  const elapsed = recording.state === "RECORDING" || recording.state === "STOPPING" ? recording.elapsed : remoteElapsed;
  const people = [
    { userId: user.id, name: user.name, role: role ?? "PARTICIPANT", self: true },
    ...call.remotes.map((peer) => ({ userId: peer.userId, name: peer.name, role: peer.role })),
  ];
  const remotePresenter = media.screenSharing
    ? undefined
    : call.remotes.find((peer) => peer.userId === call.presenterUserId);
  const presenting = media.screenSharing || Boolean(remotePresenter);
  const sideTiles = [
    <div key="local" className="h-28 w-40 shrink-0 lg:h-36 lg:w-full">
      <VideoTile
        id="local"
        stream={media.stream}
        name={`${user.name} (You)`}
        muted
        speaking={call.activeSpeakerId === user.id}
        onVideo={onVideo}
      />
    </div>,
    ...call.remotes
      .filter((peer) => peer.userId !== remotePresenter?.userId)
      .map((peer) => (
        <div key={peer.socketId} className="h-28 w-40 shrink-0 lg:h-36 lg:w-full">
          <VideoTile
            id={peer.socketId}
            stream={peer.stream}
            name={peer.name}
            speaking={call.activeSpeakerId === peer.userId}
            onVideo={onVideo}
          />
        </div>
      )),
  ];

  if (!inCall) {
    return (
      <div className="relative mx-auto flex h-dvh max-w-3xl flex-col justify-center overflow-hidden px-4">
        <p className="text-sm text-gray-500">{meeting.meetingCode}</p>
        <h1 className="mt-1 text-3xl font-semibold">{meeting.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="min-w-0 break-all text-sm text-gray-600">{`${window.location.origin}/meeting/${meeting.meetingCode}`}</p>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/meeting/${meeting.meetingCode}`)}
          >
            Copy link
          </button>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4">
          <div className="h-56 sm:h-72">
            <VideoTile id="preview" stream={media.stream} name={user.name} muted onVideo={onVideo} />
          </div>
          {entryError && <p className="mt-3 text-sm text-red-700">{entryError}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
          {media.needsPermission && (
            <button type="button" className={primaryButtonClass} onClick={() => void media.start()}>
              {media.requesting ? "Waiting for the browser prompt..." : "Allow camera and microphone"}
            </button>
          )}
          <button
            type="button"
            className={media.needsPermission ? secondaryButtonClass : primaryButtonClass}
            onClick={() => {
              void (async () => {
                if (media.needsPermission) await media.start();
                try {
                  const result = await api.joinMeeting(meetingCode);
                  setRole(result.role);
                  setInCall(true);
                } catch (joinError: unknown) {
                  setEntryError(joinError instanceof ApiError ? joinError.message : "Could not join the meeting.");
                }
              })();
            }}
          >
            Join now
          </button>
          </div>
        </div>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex max-h-full max-w-full flex-col overflow-hidden bg-neutral-950 text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-neutral-400">{meeting.meetingCode}</p>
          <h1 className="truncate text-lg font-medium">{meeting.title}</h1>
          <button
            type="button"
            className="mt-1 text-xs text-blue-300"
            onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/meeting/${meeting.meetingCode}`)}
          >
            Copy link
          </button>
        </div>
        <div className="shrink-0">
          <RecordingIndicator active={recordingActive} elapsed={elapsed} />
        </div>
      </header>
      {(media.needsPermission || media.permissionDenied) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-amber-400 px-4 py-2 text-sm text-neutral-950">
          <p className="min-w-0 flex-1">
            {media.permissionDenied
              ? "Camera and microphone are blocked for this site. Click the lock icon in the address bar, set both to Allow, then try again."
              : "Allow camera and microphone. Your browser will ask before they turn on."}
          </p>
          <button type="button" className="shrink-0 rounded-full bg-neutral-950 px-3 py-1 font-medium text-white" onClick={() => void media.start()}>
            {media.requesting ? "Waiting..." : media.permissionDenied ? "Try again" : "Allow"}
          </button>
        </div>
      )}
      <div className="relative min-h-0 w-full flex-1 overflow-hidden">
        {presenting ? (
          <div className="flex h-full min-h-0 flex-col gap-3 p-3 lg:flex-row">
            <div className="min-h-0 min-w-0 flex-1">
              {media.screenSharing ? (
                <div className="relative flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-neutral-900 px-6 text-center">
                  <p className="text-xl font-medium text-white">You are sharing your screen</p>
                  <p className="mt-2 max-w-lg text-sm text-neutral-300">
                    Others see your screen. This window stays clear so the picture does not repeat.
                  </p>
                  <button
                    type="button"
                    className="mt-5 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                    onClick={() => void media.toggleScreenShare()}
                  >
                    Stop sharing
                  </button>
                  <CaptureVideo id="local-screen" stream={media.screenStream} onVideo={onVideo} />
                </div>
              ) : (
                remotePresenter && (
                  <VideoTile
                    id={remotePresenter.socketId}
                    stream={remotePresenter.stream}
                    name={`${remotePresenter.name} · Screen`}
                    contain
                    speaking={call.activeSpeakerId === remotePresenter.userId}
                    onVideo={onVideo}
                  />
                )
              )}
            </div>
            {sideTiles.length > 0 && (
              <div className="flex h-28 shrink-0 gap-3 overflow-x-auto lg:h-full lg:w-56 lg:flex-col lg:overflow-y-auto">
                {sideTiles}
              </div>
            )}
          </div>
        ) : (
          <VideoGrid count={tiles}>
            <VideoTile
              id="local"
              stream={localPreview}
              name={`${user.name} (You)`}
              muted
              speaking={call.activeSpeakerId === user.id}
              onVideo={onVideo}
            />
            {call.remotes.map((peer) => (
              <VideoTile
                key={peer.socketId}
                id={peer.socketId}
                stream={peer.stream}
                name={peer.name}
                contain
                speaking={call.activeSpeakerId === peer.userId}
                onVideo={onVideo}
              />
            ))}
          </VideoGrid>
        )}
        {chatOpen && (
          <div className="absolute inset-y-0 right-0 z-20 w-full max-w-sm">
            <ChatPanel meetingId={meeting.id} onSend={call.sendMessage} />
          </div>
        )}
        {peopleOpen && (
          <div className="absolute inset-y-0 right-0 z-20 w-full max-w-xs">
            <ParticipantList
              people={people}
              isHost={role === "HOST"}
              onMute={call.muteParticipant}
              onRemove={call.removeParticipant}
            />
          </div>
        )}
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </div>
      <MeetingControls
        audioEnabled={media.audioEnabled}
        videoEnabled={media.videoEnabled}
        needsPermission={media.needsPermission}
        screenSharing={media.screenSharing}
        chatOpen={chatOpen}
        peopleOpen={peopleOpen}
        isHost={role === "HOST"}
        recording={recording.state === "RECORDING" || recording.state === "STOPPING"}
        onToggleAudio={media.toggleAudio}
        onToggleVideo={media.toggleVideo}
        onToggleScreen={() => {
          void media.toggleScreenShare();
        }}
        onToggleChat={() => {
          setChatOpen((open) => !open);
          setPeopleOpen(false);
        }}
        onTogglePeople={() => {
          setPeopleOpen((open) => !open);
          setChatOpen(false);
        }}
        onToggleRecording={() => {
          if (recording.state === "RECORDING") void recording.stop();
          else if (recording.state !== "STOPPING") void recording.start();
        }}
        onLeave={() => {
          void (async () => {
            if (recording.state === "RECORDING") await recording.stop();
            call.leave();
            media.stop();
            await api.leaveMeeting(meetingCode);
            navigate("/dashboard");
          })();
        }}
        onEnd={() => {
          void (async () => {
            if (recording.state === "RECORDING") await recording.stop();
            call.endMeeting();
          })();
        }}
      />
    </div>
  );
}
