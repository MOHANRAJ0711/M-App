import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./components/common/AuthProvider";
import { RequireAuth } from "./components/common/RequireAuth";
import { DashboardPage } from "./pages/Dashboard/DashboardPage";
import { HomePage } from "./pages/Home/HomePage";
import { MeetingPage } from "./pages/Meeting/MeetingPage";
import { RecordingPlayerPage } from "./pages/Recordings/RecordingPlayerPage";
import { RecordingsPage } from "./pages/Recordings/RecordingsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<HomePage />} />
          <Route path="/register" element={<HomePage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route path="/meeting/:meetingCode" element={<MeetingPage />} />
          <Route
            path="/recordings"
            element={
              <RequireAuth>
                <RecordingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/recordings/:id"
            element={
              <RequireAuth>
                <RecordingPlayerPage />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
