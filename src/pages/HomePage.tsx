import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import {
  createPost,
  getLatestDiscussions,
  getLatestHashtags,
  getMyProfile,
  getUserPosts,
  likePost,
  unlikePost,
} from "../services/socialService";
import { getErrorMessage } from "../utils/errorMessage";
import type { LatestDiscussionItem, Post, Profile } from "../types/social";

type HomeTab = "posts" | "media" | "portfolio";

const DEFAULT_PAGE_SIZE = 6;

function formatDate(iso: string): string {
  const parsedDate = new Date(iso);
  return Number.isNaN(parsedDate.getTime()) ? iso : parsedDate.toLocaleDateString();
}

function normalizeTag(tag: string): string {
  const trimmed = tag.trim();
  return trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => normalizeTag(tag))
    .filter(Boolean);
}

function HomePage() {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<HomeTab>("posts");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [latestDiscussions, setLatestDiscussions] = useState<LatestDiscussionItem[]>([]);
  const [latestHashtags, setLatestHashtags] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [composerSuccess, setComposerSuccess] = useState<string | null>(null);
  const [composerBusy, setComposerBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);

      try {
        const response = await getMyProfile();
        if (isMounted) {
          setProfile(response);
        }
      } catch (error) {
        if (isMounted) {
          setProfileError(getErrorMessage(error, "Cannot load profile"));
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!profile?.username) {
      return;
    }

    if (!routeUsername || routeUsername !== profile.username) {
      navigate(`/${profile.username}`, { replace: true });
    }
  }, [navigate, profile?.username, routeUsername]);

  const loadPosts = async (targetPage = 0, replace = false) => {
    if (!profile?.username) {
      return;
    }

    setPostsLoading(true);
    setPostsError(null);

    try {
      const response = await getUserPosts(profile.username, targetPage, DEFAULT_PAGE_SIZE);
      setPosts((prev) => (replace ? response.items : [...prev, ...response.items]));
      setPage(response.page);
      setHasNext(response.hasNext);
    } catch (error) {
      setPostsError(getErrorMessage(error, "Cannot load your posts"));
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.username) {
      return;
    }

    void loadPosts(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.username]);

  useEffect(() => {
    const loadSidebar = async () => {
      try {
        const [discussionResponse, hashtagResponse] = await Promise.all([
          getLatestDiscussions(5),
          getLatestHashtags(5),
        ]);
        setLatestDiscussions(discussionResponse.items);
        setLatestHashtags(
          hashtagResponse.items
            .map((tag) => normalizeTag(tag))
            .filter(Boolean)
            .slice(0, 5)
        );
      } catch {
        setLatestDiscussions([]);
        setLatestHashtags([]);
      }
    };

    void loadSidebar();
  }, []);

  const mediaItems = useMemo(() => (
    posts.flatMap((post) => post.media.map((media) => ({
      postId: post.postId,
      mediaId: media.mediaId,
      url: media.thumbnailUrl || media.originalUrl,
      caption: post.caption,
    })))
  ), [posts]);

  const displayName = profile?.displayName || profile?.username || "Your profile";
  const initial = displayName.charAt(0).toUpperCase();
  const usernameLabel = profile?.username ? `@${profile.username}` : "@user";
  const websiteLabel = profile?.website?.trim();
  const bio = profile?.bio?.trim() || "Share what you are creating and build your portfolio.";

  const submitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.username) {
      return;
    }

    if (mediaFiles.length === 0) {
      setComposerError("Please add at least one image.");
      setComposerSuccess(null);
      return;
    }

    setComposerBusy(true);
    setComposerError(null);
    setComposerSuccess(null);

    try {
      await createPost({
        caption: caption.trim(),
        tags: parseTags(tagInput),
        mediaFiles,
      });
      setCaption("");
      setTagInput("");
      setMediaFiles([]);
      setComposerSuccess("Post published.");
      await loadPosts(0, true);
    } catch (error) {
      setComposerError(getErrorMessage(error, "Cannot create post"));
    } finally {
      setComposerBusy(false);
    }
  };

  const toggleLike = async (post: Post) => {
    try {
      const response = post.likedByMe ? await unlikePost(post.postId) : await likePost(post.postId);
      setPosts((prev) => prev.map((item) => (
        item.postId === post.postId
          ? { ...item, likedByMe: response.likedByMe, likeCount: response.likeCount }
          : item
      )));
    } catch {
      setPostsError("Cannot update like right now.");
    }
  };

  return (
    <section className="profile-home">
      {profileError ? <div className="discover-alert discover-alert--error">{profileError}</div> : null}

      <div className="profile-home__hero" aria-busy={profileLoading}>
        <div className="profile-hero__avatar">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={displayName} />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="profile-hero__content">
          <div className="profile-hero__title">
            <div>
              <h2>{displayName}</h2>
              <p>{usernameLabel}</p>
            </div>
            <button
              type="button"
              className="profile-hero__edit"
              onClick={() => navigate("/profile")}
            >
              Edit profile
            </button>
          </div>
          <p className="profile-hero__bio">{bio}</p>
          {websiteLabel ? (
            <a className="profile-hero__website" href={websiteLabel} target="_blank" rel="noreferrer">
              {websiteLabel}
            </a>
          ) : null}
          <div className="profile-hero__stats">
            <div>
              <strong>{posts.length}</strong>
              <span>Posts</span>
            </div>
            <div>
              <strong>0</strong>
              <span>Following</span>
            </div>
            <div>
              <strong>0</strong>
              <span>Followers</span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-tabs" role="tablist" aria-label="Profile sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "posts"}
          className={activeTab === "posts" ? "profile-tab profile-tab--active" : "profile-tab"}
          onClick={() => setActiveTab("posts")}
        >
          Posts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "media"}
          className={activeTab === "media" ? "profile-tab profile-tab--active" : "profile-tab"}
          onClick={() => setActiveTab("media")}
        >
          Media
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "portfolio"}
          className={activeTab === "portfolio" ? "profile-tab profile-tab--active" : "profile-tab"}
          onClick={() => setActiveTab("portfolio")}
        >
          Portfolio
        </button>
      </div>

      {activeTab === "posts" ? (
        <div className="profile-posts">
          <div className="profile-posts__main">
            <form className="profile-composer" onSubmit={(event) => void submitPost(event)}>
              <div className="profile-composer__header">
                <div>
                  <h3>Share your latest work</h3>
                  <p>Post artwork, sketches, or concepts to your feed.</p>
                </div>
                <button type="submit" disabled={composerBusy || profileLoading}>
                  {composerBusy ? "Posting..." : "Post"}
                </button>
              </div>

              {composerError ? <div className="profile-composer__alert">{composerError}</div> : null}
              {composerSuccess ? <div className="profile-composer__success">{composerSuccess}</div> : null}

              <textarea
                rows={3}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Write a caption or tell the story behind the work"
              />

              <div className="profile-composer__controls">
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  placeholder="Tags (comma separated)"
                />
                <label className="profile-composer__upload">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => setMediaFiles(Array.from(event.target.files ?? []))}
                  />
                  <span>{mediaFiles.length ? `${mediaFiles.length} files` : "Add media"}</span>
                </label>
              </div>
            </form>

            {postsError ? <div className="discover-alert discover-alert--error">{postsError}</div> : null}

            <div className="post-feed">
              {posts.length === 0 && !postsLoading ? (
                <div className="profile-empty">Nothing here yet. Make your first post.</div>
              ) : null}

              {posts.map((post) => (
                <article key={post.postId} className="post-card">
                  <div className="post-card__head">
                    <div className="post-card__author-avatar">
                      {post.avatarUrl ? (
                        <img src={post.avatarUrl} alt={post.displayName || "User"} />
                      ) : (
                        <span>{(post.displayName || "U").charAt(0)}</span>
                      )}
                    </div>
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

                  {post.tags.length ? (
                    <div className="post-card__tags">
                      {post.tags.map((tag) => (
                        <span key={`${post.postId}-${tag}`}>#{normalizeTag(tag)}</span>
                      ))}
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
              {postsLoading ? <span>Loading...</span> : null}
              {!postsLoading && hasNext ? (
                <button type="button" onClick={() => void loadPosts(page + 1, false)}>
                  Load more
                </button>
              ) : null}
            </div>
          </div>

          <aside className="profile-posts__sidebar">
            <div className="posts-sidebar__card">
              <div className="posts-sidebar__head">
                <h3>Latest discussions</h3>
                <span>Top 5</span>
              </div>
              <ul className="posts-sidebar__list">
                {latestDiscussions.map((item) => (
                  <li key={item.commentId}>
                    <Link
                      className="posts-sidebar__link"
                      to={`/posts/${item.postId}`}
                      state={{ commentId: item.commentId }}
                      aria-label={`Open post detail for ${item.displayName || "comment"}`}
                    >
                      <div className="posts-sidebar__avatar">
                        {item.avatarUrl ? (
                          <img src={item.avatarUrl} alt={item.displayName || "User"} />
                        ) : (
                          <span>{(item.displayName || "U").charAt(0)}</span>
                        )}
                      </div>
                      <div className="posts-sidebar__content">
                        <p className="posts-sidebar__title">{item.displayName}</p>
                        <p className="posts-sidebar__subtitle">{item.content}</p>
                      </div>
                      <span className="posts-sidebar__time">{formatDate(item.createdAt)}</span>
                    </Link>
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
        </div>
      ) : null}

      {activeTab === "media" ? (
        <div className="profile-media">
          {mediaItems.length === 0 ? (
            <div className="profile-empty">No media yet.</div>
          ) : (
            <div className="profile-media-grid">
              {mediaItems.map((item) => (
                <Link
                  key={`${item.postId}-${item.mediaId}`}
                  to={`/posts/${item.postId}`}
                  state={{ mediaId: item.mediaId }}
                  className="profile-media-grid__item"
                  title="Open post detail"
                >
                  <img src={item.url} alt={item.caption || "Artwork"} loading="lazy" />
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "portfolio" ? (
        <div className="profile-portfolio">
          In development
        </div>
      ) : null}
    </section>
  );
}

export default HomePage;
