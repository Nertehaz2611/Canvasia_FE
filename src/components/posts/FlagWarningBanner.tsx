import { Link } from "react-router-dom";
import type { Post } from "../../types/social";

type FlagWarningBannerProps = {
  post: Post;
};

function FlagWarningBanner({ post }: Readonly<FlagWarningBannerProps>) {
  if (!post.isPending || !post.flaggedMatchedAuthorDisplayName) {
    return null;
  }

  return (
    <p className="flag-warning" role="alert">
      <span className="flag-warning__icon" aria-hidden="true">⚠</span>
      {" "}Suspicion arises that this post contains stolen/traced artworks from{" "}
      <strong className="flag-warning__name">{post.flaggedMatchedAuthorDisplayName}</strong>{"'s "}
      {post.flaggedMatchedPostId ? (
        <Link to={`/posts/${post.flaggedMatchedPostId}`} className="flag-warning__link">
          post
        </Link>
      ) : (
        "post"
      )}
      .
    </p>
  );
}

export default FlagWarningBanner;
