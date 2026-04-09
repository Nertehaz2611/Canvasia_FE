import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
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
      <Route
        path="/home"
        element={(
          <RequireAuth>
            <Home />
          </RequireAuth>
        )}
      />
    </Routes>
  );
}

export default App;