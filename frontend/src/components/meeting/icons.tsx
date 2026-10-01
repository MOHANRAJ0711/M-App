export function MicIcon({ off = false }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Z" />
      <path d="M7 11a5 5 0 0 0 10 0M12 16v3M9 19h6" strokeLinecap="round" />
      {off && <path d="M5 5l14 14" strokeLinecap="round" />}
    </svg>
  );
}

export function CamIcon({ off = false }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <path d="M15 11l5-2v6l-5-2" strokeLinejoin="round" />
      {off && <path d="M4 4l16 16" strokeLinecap="round" />}
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 17v3" strokeLinecap="round" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 17l-2 3V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6Z" strokeLinejoin="round" />
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="9" r="3" />
      <path d="M4 18a5 5 0 0 1 10 0" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M16 18a4 4 0 0 1 4-3" strokeLinecap="round" />
    </svg>
  );
}

export function RecordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="6" fill="currentColor" />
    </svg>
  );
}
