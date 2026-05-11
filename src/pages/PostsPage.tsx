import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import { getDiscoverPosts, getLatestDiscussions, getLatestHashtags, likePost, unlikePost } from "../services/socialService";
import { getErrorMessage } from "../utils/errorMessage";
import type { LatestDiscussionItem, Post } from "../types/social";

function formatDate(iso: string): string {
  const parsedDate = new Date(iso);
  return Number.isNaN(parsedDate.getTime()) ? iso : parsedDate.toLocaleDateString();
}

function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestDiscussions, setLatestDiscussions] = useState<LatestDiscussionItem[]>([]);
  const [latestHashtags, setLatestHashtags] = useState<string[]>([]);

  const loadPosts = async (replace = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getDiscoverPosts(10, replace ? undefined : cursor);
      setPosts((prev) => (replace ? response.items : [...prev, ...response.items]));
      setCursor(response.nextCursor);
      setHasNext(response.hasNext);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Cannot load posts"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadSidebar = async () => {
      try {
        const [discussionResponse, hashtagResponse] = await Promise.all([
          getLatestDiscussions(5),
          getLatestHashtags(5),
        ]);
        setLatestDiscussions(discussionResponse.items);
        setLatestHashtags(hashtagResponse.items);
      } catch {
        setLatestDiscussions([]);
        setLatestHashtags([]);
      }
    };

    void loadSidebar();
  }, []);

  const toggleLike = async (post: Post) => {
    try {
      const response = post.likedByMe ? await unlikePost(post.postId) : await likePost(post.postId);
      setPosts((prev) => prev.map((item) => (
        item.postId === post.postId
          ? { ...item, likedByMe: response.likedByMe, likeCount: response.likeCount }
          : item
      )));
    } catch {
      setError("Cannot update like right now.");
    }
  };

  return (
    <section className="discover-page discover-page--posts">
      {error ? <div className="discover-alert discover-alert--error">{error}</div> : null}
      <div className="posts-layout">
        <div className="posts-layout__spacer" aria-hidden="true" />

        <div className="posts-layout__main">
          <div className="post-feed">
            {posts.map((post) => (
              <article key={post.postId} className="post-card">
                <div className="post-card__head">
                  <div className="post-card__author-avatar">{(post.displayName || "U").charAt(0)}</div>
                  <div>
                    <h3>{post.displayName}</h3>
                    <p>@{post.username} • {formatDate(post.createdAt)}</p>
                  </div>
                </div>

                {post.caption ? <p className="post-card__caption">{post.caption}</p> : null}

                {post.media[0]?.originalUrl ? (
                  <Link
                    to={`/posts/${post.postId}`}
                    state={{ post, initialMediaIndex: 0 }}
                    className="post-card__media-link"
                    aria-label="Open post detail"
                  >
                    <img
                      className="post-card__image"
                      src={post.media[0].originalUrl}
                      alt={post.caption || "Artwork"}
                      loading="lazy"
                    />
                  </Link>
                ) : null}

                {post.tags.length > 0 ? (
                  <div className="post-card__tags">
                    {post.tags.map((tag) => <span key={`${post.postId}-${tag}`}>#{tag}</span>)}
                  </div>
                ) : null}

                <div className="post-card__actions">
                  <button type="button" className="post-card__like" onClick={() => void toggleLike(post)}>
                    {post.likedByMe ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />} {post.likeCount}
                  </button>
                  <Link
                    to={`/posts/${post.postId}`}
                    state={{ post, initialMediaIndex: 0 }}
                    className="post-card__comment-link"
                    aria-label="Open post detail"
                  >
                    <ChatBubbleOutlineRoundedIcon /> {post.commentCount}
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="discover-actions">
            {isLoading ? <span>Loading...</span> : null}
            {!isLoading && hasNext ? (
              <button type="button" onClick={() => void loadPosts(false)}>
                Load more
              </button>
            ) : null}
          </div>
        </div>

        <aside className="posts-layout__sidebar">
          <div className="posts-sidebar__card">
            <div className="posts-sidebar__head">
              <h3>Latest discussions</h3>
              <span>Top 5</span>
            </div>
            <ul className="posts-sidebar__list">
              {latestDiscussions.map((item) => (
                <li key={item.commentId}>
                  <div className="posts-sidebar__avatar">{(item.displayName || "U").charAt(0)}</div>
                  <div className="posts-sidebar__content">
                    <p className="posts-sidebar__title">{item.displayName}</p>
                    <p className="posts-sidebar__subtitle">{item.content}</p>
                  </div>
                  <span className="posts-sidebar__time">{formatDate(item.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="posts-sidebar__card">
            <div className="posts-sidebar__head">
              <h3>Latest hashtags</h3>
              <span>Top 5</span>
            </div>
            <div className="posts-sidebar__tags">
              {latestHashtags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </div>
        </aside>

        <div className="posts-layout__spacer" aria-hidden="true" />
      </div>
    </section>
  );
}

export default PostsPage;
