import { Link } from "react-router-dom";
import type { Profile } from "../../types/social";

type SearchSuggestionsPanelProps = Readonly<{
  searchQuery: string;
  searchLoading: boolean;
  searchError: string | null;
  searchResults: Profile[];
  onResultClick: () => void;
}>;

function SearchSuggestionsPanel({
  searchQuery,
  searchLoading,
  searchError,
  searchResults,
  onResultClick,
}: SearchSuggestionsPanelProps) {
  if (!searchQuery.trim()) {
    return null;
  }

  return (
    <div className="topbar-search__panel" aria-label="Search suggestions">
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
          onClick={onResultClick}
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
  );
}

export default SearchSuggestionsPanel;