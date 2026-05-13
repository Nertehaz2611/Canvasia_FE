import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import { clearAuthTokens } from "../utils/tokenStorage";
import projectLogoImage from "../assets/logo/logo.webp";
import { getMyProfile } from "../services/socialService";
import type { Profile } from "../types/social";
import "../styles/discover.css";

function AppShell() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const currentProfile = await getMyProfile();
        if (isMounted) {
          setProfile(currentProfile);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  const logout = () => {
    clearAuthTokens();
    navigate("/login", { replace: true });
  };

  const goToProfileSettings = () => {
    setIsUserMenuOpen(false);
    navigate("/profile");
  };

  const displayName = profile?.displayName || profile?.username || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const homePath = profile?.username ? `/${profile.username}` : "/home";

  return (
    <div className="app-shell">
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

        <div className="topbar-search" role="search">
          <SearchRoundedIcon fontSize="small" />
          <input placeholder="Search" aria-label="Search" />
        </div>

        <div className="topbar-right">
          <button type="button" className="topbar-link" aria-label="Messages">
            <MailOutlineRoundedIcon fontSize="small" />
            <span>Messages</span>
          </button>
          <button type="button" className="topbar-link" aria-label="Notifications">
            <NotificationsNoneRoundedIcon fontSize="small" />
            <span>Notifications</span>
          </button>
          <div className="topbar-user" ref={userMenuRef}>
            <button
              type="button"
              className="topbar-avatar"
              onClick={() => setIsUserMenuOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              aria-label="Open user menu"
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={displayName} />
              ) : (
                <span>{initial}</span>
              )}
            </button>

            {isUserMenuOpen ? (
              <div className="topbar-user__menu" role="menu" aria-label="User options">
                <div className="topbar-user__meta">
                  <strong>{displayName}</strong>
                  <span>@{profile?.username || "guest"}</span>
                </div>
                <button type="button" role="menuitem" onClick={goToProfileSettings}>
                  Account settings
                </button>
                <button type="button" role="menuitem" onClick={logout}>
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>

      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
