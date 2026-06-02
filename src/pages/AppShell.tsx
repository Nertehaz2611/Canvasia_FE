import { Outlet } from "react-router-dom";
import AppShellTopbar from "../components/layout/AppShellTopbar";
import "../styles/discover.css";

function AppShell() {
  return (
    <div className="app-shell">
      <AppShellTopbar />

      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
