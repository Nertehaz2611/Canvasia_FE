import { useEffect, useRef, useState, type FormEvent } from "react";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useNavigate } from "react-router-dom";
import { searchProfiles } from "../../services/socialService";
import SearchSuggestionsPanel from "../search/SearchSuggestionsPanel";
import type { Profile } from "../../types/social";

function TopbarSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchMenuRef = useRef<HTMLDivElement | null>(null);

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

    const timeoutId = globalThis.setTimeout(() => {
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
      globalThis.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!searchMenuRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isSearchOpen]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
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

  return (
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
        <SearchSuggestionsPanel
          searchQuery={searchQuery}
          searchLoading={searchLoading}
          searchError={searchError}
          searchResults={searchResults}
          onResultClick={handleSearchResultClick}
        />
      ) : null}
    </div>
  );
}

export default TopbarSearch;