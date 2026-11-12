import { Navigate, Route, Routes } from 'react-router-dom';
import { FullScreenMessage } from './components/ui';
import { useAuth } from './hooks/useAuth';
import { firebaseConfigured } from './lib/firebase';
import Landing from './pages/Landing';
import Join from './pages/Join';
import Lobby from './pages/Lobby';
import Play from './pages/Play';
import LeaderboardPage from './pages/Leaderboard';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import QuizEditor from './pages/admin/QuizEditor';
import HostSetup from './pages/admin/HostSetup';
import HostPanel from './pages/admin/HostPanel';
import { RequireAdmin } from './components/RequireAdmin';

export default function App() {
  const { error } = useAuth();
  if (!firebaseConfigured) {
    return (
      <FullScreenMessage emoji="🔧" title="Firebase not configured">
        <p>Set the <code>VITE_FIREBASE_*</code> environment variables (see <code>.env.example</code> and the README).</p>
      </FullScreenMessage>
    );
  }
  if (error) {
    return (
      <FullScreenMessage emoji="⚠️" title="Can't connect">
        <p>{error}</p>
      </FullScreenMessage>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/join/:code" element={<Join />} />
      <Route path="/lobby/:code" element={<Lobby />} />
      <Route path="/play/:code" element={<Play />} />
      <Route path="/leaderboard/:code" element={<LeaderboardPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
      <Route path="/admin/quiz/:quizId" element={<RequireAdmin><QuizEditor /></RequireAdmin>} />
      <Route path="/admin/quiz/:quizId/host" element={<RequireAdmin><HostSetup /></RequireAdmin>} />
      <Route path="/admin/host/:code" element={<RequireAdmin><HostPanel /></RequireAdmin>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
