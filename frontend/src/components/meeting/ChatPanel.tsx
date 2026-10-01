import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { socket } from "../../services/socket";
import type { ChatMessage } from "../../types";

export function ChatPanel({
  meetingId,
  onSend,
}: {
  meetingId: string;
  onSend: (message: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .messages(meetingId)
      .then((result) => {
        if (!cancelled) setMessages(result.messages);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load chat history.");
      });

    const onMessage = (message: ChatMessage) => {
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
    };
    const onError = (payload: { error?: string }) => setError(payload.error ?? "Could not send the message.");
    socket.on("receive-message", onMessage);
    socket.on("chat-error", onError);
    return () => {
      cancelled = true;
      socket.off("receive-message", onMessage);
      socket.off("chat-error", onError);
    };
  }, [meetingId]);

  return (
    <aside className="flex h-full w-full max-w-sm flex-col border-l border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-4 py-3 text-sm font-medium">Meeting Chat</div>
      <div className="flex-1 space-y-3 overflow-auto px-4 py-3">
        {messages.map((message) => (
          <div key={message.id}>
            <p className="text-xs text-neutral-400">{message.name}</p>
            <p className="text-sm text-white">{message.message}</p>
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-neutral-500">No messages yet.</p>}
      </div>
      {error && <p className="px-4 text-xs text-red-300">{error}</p>}
      <form
        className="flex gap-2 border-t border-neutral-800 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const message = draft.trim();
          if (!message) return;
          onSend(message);
          setDraft("");
          setError(null);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message..."
          className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">
          Send
        </button>
      </form>
    </aside>
  );
}
