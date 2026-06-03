import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import projectLogoImage from "../../assets/logo/logo.webp";
import TopbarNotifications from "./TopbarNotifications";
import TopbarSearch from "./TopbarSearch";
import TopbarUserMenu from "./TopbarUserMenu";
import { useTopbarProfile } from "../../hooks/useTopbarProfile";
import { getConversations } from "../../services/messageService";
import type { ConversationSummary } from "../../types/message";

function AppShellTopbar() {
  const { profile, displayName, initial, homePath } = useTopbarProfile();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    let active = true;

    const loadUnreadMessages = async () => {
      try {
        const list = await getConversations();
        if (active) {
          setConversations(list);
        }
      } catch {
        if (active) {
          setConversations([]);
        }
      }
    };

    void loadUnreadMessages();
    const intervalId = globalThis.setInterval(() => {
      void loadUnreadMessages();
    }, 30000);

    const handleFocus = () => {
      void loadUnreadMessages();
    };

    const handleMessagesRead = () => {
      void loadUnreadMessages();
    };

    globalThis.addEventListener("focus", handleFocus);
    globalThis.addEventListener("canvasia:messages-read", handleMessagesRead);

    return () => {
      active = false;
      globalThis.clearInterval(intervalId);
      globalThis.removeEventListener("focus", handleFocus);
      globalThis.removeEventListener("canvasia:messages-read", handleMessagesRead);
    };
  }, []);

  const messageUnreadCount = useMemo(
    () => conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    [conversations],
  );

  return (
    <nav className="app-shell__topbar">
      <div className="topbar-left">
        <NavLink to="/explore" className="topbar-brand" aria-label="Canvasia home">
          <img src={projectLogoImage} alt="Canvasia" />
        </NavLink>
        <div className="topbar-tabs">
          <NavLink to={homePath} className="topbar-link topbar-link--activeable" aria-label="Home">
            <HomeRoundedIcon fontSize="small" />
            <span>Home</span>
          </NavLink>
          <NavLink to="/posts" className="topbar-link topbar-link--activeable" aria-label="Posts">
            <ArticleOutlinedIcon fontSize="small" />
            <span>Post</span>
          </NavLink>
          <NavLink to="/explore" className="topbar-link topbar-link--activeable" aria-label="Explore">
            <ExploreRoundedIcon fontSize="small" />
            <span>Explore</span>
          </NavLink>
        </div>
      </div>

      <TopbarSearch />

      <div className="topbar-right">
        {profile?.role === "ADMIN" ? (
          <NavLink to="/admin-panel" className="topbar-link topbar-link--activeable topbar-link--admin" aria-label="Admin Panel">
            <AdminPanelSettingsOutlinedIcon fontSize="small" />
            <span>Admin</span>
          </NavLink>
        ) : null}
        <NavLink to="/messages" className="topbar-link topbar-link--activeable" aria-label="Messages">
          <MailOutlineRoundedIcon fontSize="small" />
          <span>Messages</span>
          {messageUnreadCount > 0 ? (
            <span className="topbar-badge">{messageUnreadCount > 9 ? "9+" : messageUnreadCount}</span>
          ) : null}
        </NavLink>
        <TopbarNotifications />
        <TopbarUserMenu profile={profile} displayName={displayName} initial={initial} />
      </div>
    </nav>
  );
}

export default AppShellTopbar;