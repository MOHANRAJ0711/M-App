import { Link } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f6f7f9] text-gray-900">
      <header className="shrink-0 border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            FreeMeet
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            {user && (
              <>
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                  Meetings
                </Link>
                <Link to="/recordings" className="text-gray-600 hover:text-gray-900">
                  Recordings
                </Link>
                <span className="text-gray-900">{user.name}</span>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-auto px-4 py-3 sm:px-6 sm:py-4">{children}</main>
    </div>
  );
}
