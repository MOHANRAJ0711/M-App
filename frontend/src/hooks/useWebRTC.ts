import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../services/socket";
import { ICE_SERVERS } from "../services/webrtc";
import type { ParticipantRole, RemotePeer } from "../types";

type PeerMeta = {
  socketId: string;
  userId: string;
  name: string;
  role: ParticipantRole;
};

type PeerRecord = PeerMeta & {
  pc: RTCPeerConnection;
  stream: MediaStream;
  makingOffer: boolean;
  candidates: RTCIceCandidateInit[];
  videoSender: RTCRtpSender;
  audioSender: RTCRtpSender;
};

type SignalPayload = {
  from?: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  userId?: string;
  name?: string;
  role?: ParticipantRole;
};

type JoinResponse = {
  error?: string;
  participants?: PeerMeta[];
};

function raiseOpusBitrate(description: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
  if (!description.sdp) return description;
  const payload = description.sdp.match(/a=rtpmap:(\d+) opus\/48000/i)?.[1];
  if (!payload) return description;
  const extra = "stereo=1;sprop-stereo=1;maxaveragebitrate=510000;usedtx=0;useinbandfec=1";
  const fmtp = new RegExp(`a=fmtp:${payload} ([^\\r\\n]*)`);
  const sdp = fmtp.test(description.sdp)
    ? description.sdp.replace(fmtp, `a=fmtp:${payload} $1;${extra}`)
    : description.sdp.replace(
        new RegExp(`a=rtpmap:${payload} opus/48000/2`, "i"),
        `a=rtpmap:${payload} opus/48000/2\r\na=fmtp:${payload} ${extra}`,
      );
  return { type: description.type, sdp };
}

function toView(peer: PeerRecord): RemotePeer {
  return {
    socketId: peer.socketId,
    userId: peer.userId,
    name: peer.name,
    role: peer.role,
    stream: peer.stream,
  };
}

export function useWebRTC({
  meetingCode,
  localStream,
  screenTrack,
  active,
  localUserId,
  onForceMute,
}: {
  meetingCode: string;
  localStream: MediaStream | null;
  screenTrack: MediaStreamTrack | null;
  active: boolean;
  localUserId: string;
  onForceMute: () => void;
}) {
  const [remotes, setRemotes] = useState<RemotePeer[]>([]);
  const [connection, setConnection] = useState<"idle" | "connected" | "reconnecting">("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [removedMessage, setRemovedMessage] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [recording, setRecording] = useState<{ active: boolean; startedAt: string | null }>({
    active: false,
    startedAt: null,
  });
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [presenterUserId, setPresenterUserId] = useState<string | null>(null);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const peersRef = useRef<Map<string, PeerRecord>>(new Map());
  const remotesRef = useRef<RemotePeer[]>([]);
  const localStreamRef = useRef(localStream);
  const screenTrackRef = useRef(screenTrack);
  const onForceMuteRef = useRef(onForceMute);
  localStreamRef.current = localStream;
  screenTrackRef.current = screenTrack;
  onForceMuteRef.current = onForceMute;
  remotesRef.current = remotes;

  const publish = useCallback((peers: Map<string, PeerRecord>) => {
    const next = Array.from(peers.values()).map(toView);
    remotesRef.current = next;
    setRemotes(next);
  }, []);

  useEffect(() => {
    if (!active) return;
    socket.emit("screen-share", { active: Boolean(screenTrack) });
  }, [active, screenTrack]);

  useEffect(() => {
    const video = screenTrack ?? localStream?.getVideoTracks()[0] ?? null;
    const audio = localStream?.getAudioTracks()[0] ?? null;
    for (const peer of peersRef.current.values()) {
      void peer.videoSender.replaceTrack(video);
      void peer.audioSender.replaceTrack(audio);
    }
  }, [localStream, screenTrack]);

  useEffect(() => {
    if (!active) return;

    const peers = new Map<string, PeerRecord>();
    peersRef.current = peers;
    let cancelled = false;
    let finished = false;

    const videoTrack = () => screenTrackRef.current ?? localStreamRef.current?.getVideoTracks()[0] ?? null;
    const audioTrack = () => localStreamRef.current?.getAudioTracks()[0] ?? null;

    const closeAll = () => {
      for (const peer of peers.values()) peer.pc.close();
      peers.clear();
      publish(peers);
    };

    const flush = async (peer: PeerRecord) => {
      const queued = peer.candidates.splice(0);
      for (const candidate of queued) {
        await peer.pc.addIceCandidate(candidate).catch(() => undefined);
      }
    };

    const createPeer = (meta: PeerMeta) => {
      const existing = peers.get(meta.socketId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const stream = new MediaStream();
      const videoSender = pc.addTransceiver("video", { direction: "sendrecv" }).sender;
      const audioSender = pc.addTransceiver("audio", { direction: "sendrecv" }).sender;
      const currentVideo = videoTrack();
      const currentAudio = audioTrack();
      if (currentVideo) void videoSender.replaceTrack(currentVideo);
      if (currentAudio) void audioSender.replaceTrack(currentAudio);

      const peer: PeerRecord = {
        ...meta,
        pc,
        stream,
        makingOffer: false,
        candidates: [],
        videoSender,
        audioSender,
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        socket.emit("ice-candidate", { to: meta.socketId, candidate: event.candidate });
      };
      pc.ontrack = (event) => {
        if (!stream.getTracks().includes(event.track)) stream.addTrack(event.track);
        publish(peers);
        event.track.onended = () => {
          stream.removeTrack(event.track);
          publish(peers);
        };
      };
      pc.onnegotiationneeded = () => {
        void (async () => {
          try {
            peer.makingOffer = true;
            const offer = await pc.createOffer();
            if (pc.signalingState !== "stable") return;
            await pc.setLocalDescription(raiseOpusBitrate(offer));
            socket.emit("offer", { to: meta.socketId, description: pc.localDescription });
          } catch (error) {
            console.error(error);
          } finally {
            peer.makingOffer = false;
          }
        })();
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") void pc.restartIce();
        if (pc.connectionState === "disconnected") setConnection("reconnecting");
        if (pc.connectionState === "connected") setConnection("connected");
      };

      peers.set(meta.socketId, peer);
      publish(peers);
      return peer;
    };

    const closeMatching = (payload: { socketId?: string; userId?: string }) => {
      for (const [socketId, peer] of [...peers]) {
        const match = payload.socketId ? socketId === payload.socketId : peer.userId === payload.userId;
        if (!match) continue;
        peer.pc.close();
        peers.delete(socketId);
      }
      publish(peers);
    };

    const onUserJoined = (peer: PeerMeta) => {
      if (!peer?.socketId || peer.socketId === socket.id) return;
      createPeer(peer);
    };
    const onUserLeft = (payload: { socketId?: string; userId?: string }) => closeMatching(payload);
    const onOffer = (payload: SignalPayload) => {
      if (!payload.from || !payload.description) return;
      void (async () => {
        const peer = createPeer({
          socketId: payload.from!,
          userId: payload.userId ?? payload.from!,
          name: payload.name ?? "Guest",
          role: payload.role ?? "PARTICIPANT",
        });
        const polite = (socket.id ?? "") < payload.from!;
        const collision = peer.makingOffer || peer.pc.signalingState !== "stable";
        if (collision && !polite) return;
        if (collision) await peer.pc.setLocalDescription({ type: "rollback" });
        await peer.pc.setRemoteDescription(payload.description!);
        await flush(peer);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(raiseOpusBitrate(answer));
        socket.emit("answer", { to: payload.from, description: peer.pc.localDescription });
      })().catch((error) => console.error(error));
    };
    const onAnswer = (payload: SignalPayload) => {
      if (!payload.from || !payload.description) return;
      const peer = peers.get(payload.from);
      if (!peer) return;
      void peer.pc.setRemoteDescription(payload.description).then(() => flush(peer));
    };
    const onIce = (payload: SignalPayload) => {
      if (!payload.from || !payload.candidate) return;
      const peer = peers.get(payload.from);
      if (!peer || !peer.pc.remoteDescription) {
        peer?.candidates.push(payload.candidate);
        return;
      }
      void peer.pc.addIceCandidate(payload.candidate).catch(() => undefined);
    };
    const onRecording = (state: { active: boolean; startedAt: string | null }) => setRecording(state);
    const onForceMuteEvent = () => onForceMuteRef.current();
    const onRemoved = (payload: { message?: string }) => {
      finished = true;
      setRemovedMessage(payload.message ?? "The host removed you from the meeting.");
      closeAll();
      socket.disconnect();
    };
    const onEnded = () => {
      finished = true;
      setEnded(true);
      closeAll();
    };
    const onReplaced = (payload: { message?: string }) => {
      finished = true;
      setRemovedMessage(payload.message ?? "You joined this meeting from another tab.");
      closeAll();
    };
    const onScreenShare = (payload: { userId?: string; active?: boolean }) => {
      setPresenterUserId((current) => {
        if (payload.active && payload.userId) return payload.userId;
        if (!payload.active && (!payload.userId || current === payload.userId)) return null;
        return current;
      });
    };
    const onMeetingError = (payload: { error?: string }) => {
      setMeetingError(payload.error ?? "Request failed.");
    };
    const onDisconnect = (reason: string) => {
      if (finished || reason === "io client disconnect") return;
      setConnection("reconnecting");
      closeAll();
    };
    const onConnect = () => {
      if (cancelled || finished) return;
      setConnection("connected");
      socket.emit("join-meeting", { meetingCode }, (response: JoinResponse) => {
        if (response?.error) setJoinError(response.error);
        else setJoinError(null);
      });
    };

    socket.on("user-joined", onUserJoined);
    socket.on("user-left", onUserLeft);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIce);
    socket.on("recording-state", onRecording);
    socket.on("force-mute", onForceMuteEvent);
    socket.on("removed", onRemoved);
    socket.on("meeting-ended", onEnded);
    socket.on("session-replaced", onReplaced);
    socket.on("screen-share", onScreenShare);
    socket.on("meeting-error", onMeetingError);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);

    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      cancelled = true;
      finished = true;
      socket.emit("leave-meeting", { meetingCode });
      socket.off("user-joined", onUserJoined);
      socket.off("user-left", onUserLeft);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIce);
      socket.off("recording-state", onRecording);
      socket.off("force-mute", onForceMuteEvent);
      socket.off("removed", onRemoved);
      socket.off("meeting-ended", onEnded);
      socket.off("session-replaced", onReplaced);
      socket.off("screen-share", onScreenShare);
      socket.off("meeting-error", onMeetingError);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
      closeAll();
      socket.disconnect();
    };
  }, [active, meetingCode, publish]);

  useEffect(() => {
    if (!active) return;
    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
    } catch {
      return;
    }
    const nodes = new Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>();
    const timer = window.setInterval(() => {
      if (!context) return;
      const samples: { id: string; level: number }[] = [];
      const measure = (id: string, media: MediaStream | null) => {
        const track = media?.getAudioTracks().find((item) => item.enabled && item.readyState === "live");
        if (!track) return;
        let node = nodes.get(id);
        if (!node) {
          const source = context.createMediaStreamSource(new MediaStream([track]));
          const analyser = context.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          node = { analyser, source };
          nodes.set(id, node);
        }
        const data = new Uint8Array(node.analyser.fftSize);
        node.analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) {
          const centered = (value - 128) / 128;
          sum += centered * centered;
        }
        samples.push({ id, level: Math.sqrt(sum / data.length) });
      };
      measure(localUserId, localStreamRef.current);
      for (const remote of remotesRef.current) measure(remote.userId, remote.stream);
      const loudest = samples.sort((left, right) => right.level - left.level)[0];
      setActiveSpeakerId(loudest && loudest.level > 0.05 ? loudest.id : null);
    }, 400);

    return () => {
      window.clearInterval(timer);
      nodes.forEach((node) => node.source.disconnect());
      void context?.close();
    };
  }, [active, localUserId]);

  const leave = useCallback(() => {
    socket.emit("leave-meeting", { meetingCode });
    for (const peer of peersRef.current.values()) peer.pc.close();
    peersRef.current.clear();
    setRemotes([]);
    socket.disconnect();
  }, [meetingCode]);

  const endMeeting = useCallback(() => {
    socket.emit("end-meeting");
  }, []);

  const sendMessage = useCallback(
    (message: string) => {
      socket.emit("send-message", { meetingCode, message });
    },
    [meetingCode],
  );

  const muteParticipant = useCallback((userId: string) => {
    socket.emit("mute-participant", { userId });
  }, []);

  const removeParticipant = useCallback((userId: string) => {
    socket.emit("remove-participant", { userId });
  }, []);

  const broadcastRecording = useCallback((next: boolean) => {
    socket.emit(next ? "start-recording" : "stop-recording");
  }, []);

  return {
    remotes,
    connection,
    joinError,
    removedMessage,
    ended,
    recording,
    activeSpeakerId,
    presenterUserId,
    meetingError,
    leave,
    endMeeting,
    sendMessage,
    muteParticipant,
    removeParticipant,
    broadcastRecording,
  };
}
