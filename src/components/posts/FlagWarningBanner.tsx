import { Link } from "react-router-dom";
import type { Post } from "../../types/social";

type FlagWarningBannerProps = {
  post: Post;
};

function FlagWarningBanner({ post }: Readonly<FlagWarningBannerProps>) {
  if (!post.isPending) {
    return null;
  }

  const hasMatchedAuthor = Boolean(post.flaggedMatchedAuthorDisplayName);

  return (
    <p className="flag-warning" role="alert">
      <span className="flag-warning__icon" aria-hidden="true">⚠</span>
      {" "}
      {hasMatchedAuthor ? (
        <>
          Flagged: may contain stolen/traced artwork from{" "}
          <span className="flag-warning__name">{post.flaggedMatchedAuthorDisplayName}</span>
          {"'s "}
          {post.flaggedMatchedPostId ? (
            <Link to={`/posts/${post.flaggedMatchedPostId}`} className="flag-warning__link">
              post
            </Link>
          ) : (
            "registered artwork"
          )}
          .
        </>
      ) : (
        <>This post is suspected of copyright infringement.</>
      )}
    </p>
  );
}

export default FlagWarningBanner;
