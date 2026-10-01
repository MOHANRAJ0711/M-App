import { Link } from "react-router-dom";
import type { Meeting } from "../../types";
import { formatDate, formatDuration } from "../../utils/format";
import { cardClass } from "../../utils/styles";

export function MeetingLists({ upcoming, recent }: { upcoming: Meeting[]; recent: Meeting[] }) {
  return (
    <div className="grid items-stretch gap-3 sm:grid-cols-2">
      <section className={`${cardClass} h-full`}>
        <h2 className="text-sm font-medium text-gray-500">Upcoming Meetings</h2>
        <div className="mt-3 space-y-2">
          {upcoming.length === 0 && <p className="text-sm text-gray-500">No upcoming meetings.</p>}
          {upcoming.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} action="Join" />
          ))}
        </div>
      </section>
      <section className={`${cardClass} h-full`}>
        <h2 className="text-sm font-medium text-gray-500">Recent Meetings</h2>
        <div className="mt-3 space-y-2">
          {recent.length === 0 && <p className="text-sm text-gray-500">No recent meetings.</p>}
          {recent.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} action={meeting.status === "LIVE" ? "Rejoin" : null} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MeetingRow({ meeting, action }: { meeting: Meeting; action: "Join" | "Rejoin" | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{meeting.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span className="font-medium tracking-wide text-gray-700">{meeting.meetingCode}</span>
          {meeting.status === "LIVE" ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Live</span>
          ) : (
            <span>
              {formatDate(meeting.endedAt ?? meeting.createdAt)}
              {meeting.status === "COMPLETED" ? ` · ${formatDuration(meeting.durationSeconds)}` : ""}
            </span>
          )}
        </p>
      </div>
      {action && (
        <Link to={`/meeting/${meeting.meetingCode}`} className="shrink-0 text-sm font-medium text-blue-700">
          {action}
        </Link>
      )}
    </div>
  );
}
