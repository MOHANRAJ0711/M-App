import type { ChatMessage, Meeting, Participant, ParticipantRole, PublicUser, Recording } from "../types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: "include" });
  } catch {
    throw new ApiError("FreeMeet is unavailable. Check that the server is running.", 0);
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(data.error || "Request failed.", response.status);
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  me: () => request<{ user: PublicUser }>("/api/auth/me"),
  guest: (name: string) =>
    request<{ user: PublicUser }>("/api/auth/guest", { method: "POST", body: JSON.stringify({ name }) }),
  register: (body: { name: string; email: string; password: string }) =>
    request<{ user: PublicUser }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ user: PublicUser }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  createMeeting: (title: string) =>
    request<{ meetingId: string; meetingCode: string; meeting: Meeting }>("/api/meetings", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  listMeetings: () => request<{ upcoming: Meeting[]; recent: Meeting[] }>("/api/meetings"),
  previewMeeting: (meetingCode: string) =>
    request<{ meeting: Meeting }>(`/api/meetings/code/${encodeURIComponent(meetingCode)}`),
  joinMeeting: (meetingCode: string) =>
    request<{ meeting: Meeting; participants: Participant[]; role: ParticipantRole }>(
      `/api/meetings/${encodeURIComponent(meetingCode)}/join`,
      { method: "POST" },
    ),
  leaveMeeting: (meetingCode: string) =>
    request<{ ok: boolean }>(`/api/meetings/${encodeURIComponent(meetingCode)}/leave`, { method: "POST" }),
  messages: (meetingId: string) =>
    request<{ messages: ChatMessage[]; nextCursor: string | null }>(`/api/meetings/${meetingId}/messages`),
  recordings: (params: URLSearchParams) =>
    request<{ recordings: Recording[]; nextCursor: string | null }>(`/api/recordings?${params.toString()}`),
  recording: (id: string) => request<{ recording: Recording }>(`/api/recordings/${id}`),
  deleteRecording: (id: string) => request<{ ok: boolean }>(`/api/recordings/${id}`, { method: "DELETE" }),
  uploadRecording: (
    meetingId: string,
    blob: Blob,
    meta: { duration: number; startedAt: string; endedAt: string },
  ) => {
    const form = new FormData();
    const file = blob instanceof File ? blob : new File([blob], "recording.webm", { type: "video/webm" });
    form.append("recording", file, "recording.webm");
    form.append("duration", String(meta.duration));
    form.append("startedAt", meta.startedAt);
    form.append("endedAt", meta.endedAt);
    return request<{ recording: Recording }>(`/api/meetings/${meetingId}/recordings`, {
      method: "POST",
      body: form,
    });
  },
};
