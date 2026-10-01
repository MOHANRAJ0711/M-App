function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      {children}
    </svg>
  );
}

function MicIcon({ off }: { off?: boolean }) {
  return (
    <Icon>
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M17 11a1 1 0 1 0-2 0 3 3 0 0 1-6 0 1 1 0 1 0-2 0 5 5 0 0 0 4 4.9V19H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-3.1A5 5 0 0 0 17 11Z" />
      {off && <path d="M4.3 3.3a1 1 0 0 0 0 1.4l15 15a1 1 0 0 0 1.4-1.4l-15-15a1 1 0 0 0-1.4 0Z" />}
    </Icon>
  );
}

function CameraIcon({ off }: { off?: boolean }) {
  return (
    <Icon>
      <path d="M4 7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.2l3.4 2.2A1 1 0 0 0 21 15V9a1 1 0 0 0-1.6-.8L16 10.4V9a2 2 0 0 0-2-2H4Z" />
      {off && <path d="M4.3 3.3a1 1 0 0 0 0 1.4l15 15a1 1 0 0 0 1.4-1.4l-15-15a1 1 0 0 0-1.4 0Z" />}
    </Icon>
  );
}

function ShareIcon() {
  return (
    <Icon>
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-4v2h2a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h2v-2H6a2 2 0 0 1-2-2V5Zm2 0v9h12V5H6Z" />
      <path d="M12 6.5a1 1 0 0 1 1 1V11h1.6a1 1 0 0 1 .7 1.7l-2.6 2.6a1 1 0 0 1-1.4 0l-2.6-2.6A1 1 0 0 1 9.4 11H11V7.5a1 1 0 0 1 1-1Z" />
    </Icon>
  );
}

function ChatIcon() {
  return (
    <Icon>
      <path d="M5 4a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h1v3.2a1 1 0 0 0 1.6.8L12 18h7a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Z" />
    </Icon>
  );
}

function PeopleIcon() {
  return (
    <Icon>
      <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19.2A5.5 5.5 0 0 1 9 14a5.5 5.5 0 0 1 5.5 5.2 1 1 0 0 1-1 1.1H4.5a1 1 0 0 1-1-1.1ZM15 19.3c.1-.4.2-.8.2-1.2A6.5 6.5 0 0 0 13 13.2a3.5 3.5 0 0 1 1.2-.2 4.8 4.8 0 0 1 4.8 4.7 1 1 0 0 1-1 1.1H15.2a1 1 0 0 1-.2-.5Z" />
    </Icon>
  );
}

function RecordIcon({ on }: { on?: boolean }) {
  return (
    <Icon>
      <circle cx="12" cy="12" r={on ? 5 : 4} />
      {!on && <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />}
    </Icon>
  );
}

function EndIcon() {
  return (
    <Icon>
      <path d="M8.2 4.8a1 1 0 0 0-1.6.2L5.2 7.4A2 2 0 0 0 6.6 10l1.6.5a12 12 0 0 0 7.7 0l1.6-.5a2 2 0 0 0 1.4-2.6l-1.4-2.4a1 1 0 0 0-1.6-.2l-1.2 1.2a1 1 0 0 1-1.2.2 8 8 0 0 0-4.1 0 1 1 0 0 1-1.2-.2L8.2 4.8ZM5 14.6a1 1 0 0 1 1.4 0L8 16.2a1 1 0 0 0 1.2.2 8 8 0 0 1 5.6 0 1 1 0 0 0 1.2-.2l1.6-1.6a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 .2 1.2l-1.2 2.2a2 2 0 0 1-2.4 1l-1.5-.4a12 12 0 0 0-7.8 0l-1.5.4a2 2 0 0 1-2.4-1L3.6 17a1 1 0 0 1 .2-1.2L5 14.6Z" />
    </Icon>
  );
}

function LeaveIcon() {
  return (
    <Icon>
      <path d="M3.6 8.2a16.2 16.2 0 0 1 16.8 0 1.6 1.6 0 0 1 .6 2.1l-1.3 2.4a1.6 1.6 0 0 1-2 .8l-2.4-.8a1.6 1.6 0 0 1-1-1.5v-.7a8.2 8.2 0 0 0-5.6 0v.7a1.6 1.6 0 0 1-1 1.5l-2.4.8a1.6 1.6 0 0 1-2-.8L3 10.3a1.6 1.6 0 0 1 .6-2.1Z" />
    </Icon>
  );
}

function ControlButton({
  label,
  pressed,
  tone = "default",
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  tone?: "default" | "active" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-500 bg-red-600 text-white"
      : tone === "active"
        ? "border-blue-500 bg-blue-600 text-white"
        : "border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className={`flex h-12 w-12 items-center justify-center rounded-full border ${toneClass}`}
    >
      {children}
    </button>
  );
}

export function MeetingControls({
  audioEnabled,
  videoEnabled,
  needsPermission = false,
  screenSharing,
  chatOpen,
  peopleOpen,
  isHost,
  recording,
  onToggleAudio,
  onToggleVideo,
  onToggleScreen,
  onToggleChat,
  onTogglePeople,
  onToggleRecording,
  onLeave,
  onEnd,
}: {
  audioEnabled: boolean;
  videoEnabled: boolean;
  needsPermission?: boolean;
  screenSharing: boolean;
  chatOpen: boolean;
  peopleOpen: boolean;
  isHost: boolean;
  recording: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreen: () => void;
  onToggleChat: () => void;
  onTogglePeople: () => void;
  onToggleRecording: () => void;
  onLeave: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-neutral-800 px-4 py-3">
      <ControlButton
        label={needsPermission ? "Allow camera and microphone" : audioEnabled ? "Mute microphone" : "Unmute microphone"}
        pressed={!needsPermission && !audioEnabled}
        tone={needsPermission ? "active" : audioEnabled ? "default" : "danger"}
        onClick={onToggleAudio}
      >
        <MicIcon off={!needsPermission && !audioEnabled} />
      </ControlButton>
      <ControlButton
        label={needsPermission ? "Allow camera and microphone" : videoEnabled ? "Turn camera off" : "Turn camera on"}
        pressed={!needsPermission && !videoEnabled}
        tone={needsPermission ? "active" : videoEnabled ? "default" : "danger"}
        onClick={onToggleVideo}
      >
        <CameraIcon off={!needsPermission && !videoEnabled} />
      </ControlButton>
      <ControlButton
        label={screenSharing ? "Stop sharing" : "Share screen"}
        pressed={screenSharing}
        tone={screenSharing ? "active" : "default"}
        onClick={onToggleScreen}
      >
        <ShareIcon />
      </ControlButton>
      <ControlButton label="Chat" pressed={chatOpen} tone={chatOpen ? "active" : "default"} onClick={onToggleChat}>
        <ChatIcon />
      </ControlButton>
      <ControlButton label="People" pressed={peopleOpen} tone={peopleOpen ? "active" : "default"} onClick={onTogglePeople}>
        <PeopleIcon />
      </ControlButton>
      {isHost && (
        <ControlButton
          label={recording ? "Stop recording" : "Start recording"}
          pressed={recording}
          tone={recording ? "danger" : "default"}
          onClick={onToggleRecording}
        >
          <RecordIcon on={recording} />
        </ControlButton>
      )}
      {isHost && (
        <button
          type="button"
          aria-label="End meeting"
          title="End meeting"
          onClick={onEnd}
          className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-300 hover:bg-neutral-800"
        >
          <EndIcon />
        </button>
      )}
      <button
        type="button"
        aria-label="Leave meeting"
        title="Leave meeting"
        onClick={onLeave}
        className="flex h-12 w-16 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
      >
        <LeaveIcon />
      </button>
    </div>
  );
}
