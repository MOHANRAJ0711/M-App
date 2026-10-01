import type { ParticipantRole } from "../../types";

export type Person = {
  userId: string;
  name: string;
  role: ParticipantRole;
  self?: boolean;
};

export function ParticipantList({
  people,
  isHost,
  onMute,
  onRemove,
}: {
  people: Person[];
  isHost: boolean;
  onMute: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  return (
    <aside className="flex h-full w-full max-w-xs flex-col border-l border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-4 py-3 text-sm font-medium">People ({people.length})</div>
      <ul className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-3">
        {people.map((person) => (
          <li key={person.userId} className="flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="text-white">
                {person.name}
                {person.self ? " (You)" : ""}
              </p>
              <p className="text-xs text-neutral-400">{person.role === "HOST" ? "Host" : "Participant"}</p>
            </div>
            {isHost && !person.self && (
              <div className="flex gap-2">
                <button type="button" className="text-xs text-neutral-300 hover:text-white" onClick={() => onMute(person.userId)}>
                  Mute
                </button>
                <button type="button" className="text-xs text-neutral-300 hover:text-white" onClick={() => onRemove(person.userId)}>
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
