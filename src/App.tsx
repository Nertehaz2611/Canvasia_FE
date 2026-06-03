import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import AppShell from "./pages/AppShell";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import PostsPage from "./pages/PostsPage";
import PostDetailPage from "./pages/PostDetailPage";
import ProfilePage from "./pages/ProfilePage";
import MessagesPage from "./pages/MessagesPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import { hasAccessToken } from "./utils/tokenStorage";

type RequireAuthProps = {
  children: ReactNode;
};

function RequireAuth({ children }: Readonly<RequireAuthProps>) {
  if (!hasAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route path="/welcome" element={<AuthPage mode="welcome" />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />

      <Route path="/home/discover/grid" element={<Navigate to="/explore" replace />} />
      <Route path="/home/discover/posts" element={<Navigate to="/posts" replace />} />
      <Route path="/app" element={<Navigate to="/explore" replace />} />
      <Route path="/app/home" element={<Navigate to="/home" replace />} />
      <Route path="/app/explore" element={<Navigate to="/explore" replace />} />
      <Route path="/app/posts" element={<Navigate to="/posts" replace />} />

      <Route
        element={(
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        )}
      >
        <Route path="/home" element={<HomePage />} />
        <Route path="/:username" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/posts/:postId" element={<PostDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:conversationId" element={<MessagesPage />} />
        <Route path="/admin-panel" element={<AdminPanelPage />} />
      </Route>
    </Routes>
  );
}

export default App;