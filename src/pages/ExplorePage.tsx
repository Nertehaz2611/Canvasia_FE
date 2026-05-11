import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDiscoverThumbnails } from "../services/socialService";
import { getErrorMessage } from "../utils/errorMessage";
import type { ThumbnailItem } from "../types/social";

function ExplorePage() {
  const [items, setItems] = useState<ThumbnailItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThumbnails = async (replace = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getDiscoverThumbnails(60, replace ? undefined : cursor);
      setItems((prev) => (replace ? response.items : [...prev, ...response.items]));
      setCursor(response.nextCursor);
      setHasNext(response.hasNext);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Cannot load explore thumbnails"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadThumbnails(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="discover-page">
      {error ? <div className="discover-alert discover-alert--error">{error}</div> : null}

      <div className="discover-grid">
        {items.map((item) => (
          <Link
            key={`${item.postId}-${item.mediaId}`}
            to={`/posts/${item.postId}`}
            state={{ thumbnailUrl: item.thumbnailUrl, mediaId: item.mediaId }}
            className="discover-grid__item"
            title="Open post detail"
          >
            <img src={item.thumbnailUrl} alt="Artwork thumbnail" loading="lazy" />
          </Link>
        ))}
      </div>

      <div className="discover-actions">
        {isLoading ? <span>Loading...</span> : null}
        {!isLoading && hasNext ? (
          <button type="button" onClick={() => void loadThumbnails(false)}>
            Load more
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default ExplorePage;
