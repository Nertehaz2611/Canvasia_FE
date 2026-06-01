import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import { clearAuthTokens } from "../utils/tokenStorage";
import projectLogoImage from "../assets/logo/logo.webp";
import { getMyProfile, searchProfiles } from "../services/socialService";
import type { Profile } from "../types/social";
import "../styles/discover.css";

function AppShell() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const searchMenuRef = useRef<HTMLDivElement | null>(null);

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
    if (!isUserMenuOpen && !isSearchOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }

      if (!searchMenuRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
    }, [isSearchOpen, isUserMenuOpen]);

    useEffect(() => {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) {
        setSearchResults([]);
        setSearchLoading(false);
        setSearchError(null);
        return;
      }

      let isActive = true;
      setSearchLoading(true);
      setSearchError(null);

      const timeoutId = window.setTimeout(() => {
        void searchProfiles(trimmedQuery, 8)
          .then((results) => {
            if (isActive) {
              setSearchResults(results);
            }
          })
          .catch(() => {
            if (isActive) {
              setSearchResults([]);
              setSearchError("Cannot load user search results");
            }
          })
          .finally(() => {
            if (isActive) {
              setSearchLoading(false);
            }
          });
      }, 220);

      return () => {
        isActive = false;
        window.clearTimeout(timeoutId);
      };
    }, [searchQuery]);

  const logout = () => {
    clearAuthTokens();
    navigate("/login", { replace: true });
  };

  const goToProfileSettings = () => {
    setIsUserMenuOpen(false);
    navigate("/profile");
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    navigate(`/posts?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleSearchResultClick = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
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

        <div className="topbar-search-wrap" ref={searchMenuRef}>
          <form className="topbar-search" role="search" onSubmit={handleSearchSubmit}>
            <SearchRoundedIcon fontSize="small" />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) {
                  setIsSearchOpen(true);
                }
              }}
              placeholder="Search people or posts"
              aria-label="Search users or posts"
            />
          </form>

          {isSearchOpen && searchQuery.trim() ? (
            <div className="topbar-search__panel" role="listbox" aria-label="Search suggestions">
              {searchLoading ? <div className="topbar-search__status">Searching users...</div> : null}
              {searchError ? <div className="topbar-search__status topbar-search__status--error">{searchError}</div> : null}
              {!searchLoading && !searchError && searchResults.length === 0 ? (
                <div className="topbar-search__status">No matching users found.</div>
              ) : null}
              {searchResults.map((result) => (
                <Link
                  key={result.userId}
                  to={`/${result.username}`}
                  className="topbar-search__result"
                  onClick={handleSearchResultClick}
                >
                  <div className="topbar-search__avatar">
                    {result.avatarUrl ? (
                      <img src={result.avatarUrl} alt={result.displayName} />
                    ) : (
                      <span>{(result.displayName || result.username || "U").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="topbar-search__meta">
                    <strong>{result.displayName}</strong>
                    <span>@{result.username}</span>
                  </div>
                </Link>
              ))}
              <div className="topbar-search__hint">Press Enter to search posts with this text.</div>
            </div>
          ) : null}
        </div>

        <div className="topbar-right">
          <NavLink to="/messages" className="topbar-link topbar-link--activeable" aria-label="Messages">
            <MailOutlineRoundedIcon fontSize="small" />
            <span>Messages</span>
          </NavLink>
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
