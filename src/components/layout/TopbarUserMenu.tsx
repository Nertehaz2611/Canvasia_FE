import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthTokens } from "../../utils/tokenStorage";
import type { Profile } from "../../types/social";

type TopbarUserMenuProps = {
  profile: Profile | null;
  displayName: string;
  initial: string;
};

function TopbarUserMenu({ profile, displayName, initial }: Readonly<TopbarUserMenuProps>) {
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div className="topbar-user" ref={userMenuRef}>
      <button
        type="button"
        className="topbar-avatar"
        onClick={() => setIsUserMenuOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={isUserMenuOpen}
        aria-label="Open user menu"
      >
        {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={displayName} /> : <span>{initial}</span>}
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
  );
}

export default TopbarUserMenu;