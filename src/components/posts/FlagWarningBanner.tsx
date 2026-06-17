import type { Post } from "../../types/social";

type FlagWarningBannerProps = {
  post: Post;
};

function FlagWarningBanner({ post }: Readonly<FlagWarningBannerProps>) {
  if (!post.isPending) {
    return null;
  }

  return (
    <p className="flag-warning" role="alert">
      <span className="flag-warning__icon" aria-hidden="true">⚠</span>
      {" "}This post is suspected of copyright infringement.
    </p>
  );
}

export default FlagWarningBanner;
