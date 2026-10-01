import { useEffect, useState } from "react";
import { ApiError, api } from "../services/api";
import type { Meeting } from "../types";

export function useMeeting(meetingCode: string) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .previewMeeting(meetingCode)
      .then((result) => {
        if (cancelled) return;
        setMeeting(result.meeting);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setError(error instanceof ApiError ? error.message : "Could not join the meeting.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [meetingCode]);

  return { meeting, error, loading };
}
