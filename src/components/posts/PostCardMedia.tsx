import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { MediaItem } from "../../types/social";

type PostCardMediaProps = {
  postId: string;
  caption: string;
  media: MediaItem[];
};

function PostCardMedia({ postId, caption, media }: Readonly<PostCardMediaProps>) {
  const mediaItems = useMemo(() => media ?? [], [media]);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!mediaItems.length || !mediaItems[0]?.originalUrl) {
    return null;
  }

  if (mediaItems.length === 1) {
    return (
      <Link
        to={`/posts/${postId}`}
        state={{ initialMediaIndex: 0 }}
        className="post-card__media-link"
        aria-label="Open post detail"
      >
        <img
          className="post-card__image"
          src={mediaItems[0].originalUrl}
          alt={caption || "Artwork"}
          loading="lazy"
        />
      </Link>
    );
  }

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % mediaItems.length);
  };

  return (
    <div className="post-card__media" aria-label="Post media carousel">
      <div className="post-card__carousel">
        <div
          className="post-card__track"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {mediaItems.map((item, index) => (
            <Link
              key={item.mediaId}
              to={`/posts/${postId}`}
              state={{ initialMediaIndex: index }}
              className="post-card__slide"
              aria-label={`Open post detail at media ${index + 1}`}
            >
              <img
                className="post-card__image"
                src={item.originalUrl}
                alt={caption || "Artwork"}
                loading="lazy"
              />
            </Link>
          ))}
        </div>
        <button
          type="button"
          className="post-card__arrow post-card__arrow--prev"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            goPrev();
          }}
          aria-label="Previous media"
        >
          <span aria-hidden="true">&lt;</span>
        </button>
        <button
          type="button"
          className="post-card__arrow post-card__arrow--next"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            goNext();
          }}
          aria-label="Next media"
        >
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>
      <div className="post-card__dots" role="tablist" aria-label="Media navigation">
        {mediaItems.map((item, index) => (
          <button
            key={item.mediaId}
            type="button"
            className={index === activeIndex ? "post-card__dot post-card__dot--active" : "post-card__dot"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setActiveIndex(index);
            }}
            aria-label={`Go to media ${index + 1}`}
            aria-pressed={index === activeIndex}
          />
        ))}
      </div>
    </div>
  );
}

export default PostCardMedia;
