import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import PostCardMedia from "../components/posts/PostCardMedia";
import PostEditorModal from "../components/posts/PostEditorModal";
import {
  createPost,
  deletePost,
  getLatestDiscussions,
  getLatestHashtags,
  getMyProfile,
  getFollowers,
  getFollowing,
  getUserProfile,
  getUserPosts,
  followUser,
  likePost,
  unfollowUser,
  updatePost,
  unlikePost,
} from "../services/socialService";
import { getErrorMessage } from "../utils/errorMessage";
import type {
  FollowUserItem,
  LatestDiscussionItem,
  Post,
  Profile,
  UpdatePostInput,
} from "../types/social";

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
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [viewerLoading, setViewerLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [followListOpen, setFollowListOpen] = useState<"followers" | "following" | null>(null);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followListError, setFollowListError] = useState<string | null>(null);
  const [followListItems, setFollowListItems] = useState<FollowUserItem[]>([]);
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
  const [mediaPreviews, setMediaPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [composerSuccess, setComposerSuccess] = useState<string | null>(null);
  const [composerBusy, setComposerBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadViewerProfile = async () => {
      setViewerLoading(true);
      setProfileError(null);

      try {
        const response = await getMyProfile();
        if (isMounted) {
          setViewerProfile(response);
        }
      } catch (error) {
        if (isMounted) {
          setProfileError(getErrorMessage(error, "Cannot load profile"));
        }
      } finally {
        if (isMounted) {
          setViewerLoading(false);
        }
      }
    };

    void loadViewerProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!viewerProfile?.username) {
      return;
    }

    if (!routeUsername) {
      navigate(`/${viewerProfile.username}`, { replace: true });
    }
  }, [navigate, routeUsername, viewerProfile?.username]);

  useEffect(() => {
    let isMounted = true;

    const loadTargetProfile = async () => {
      if (!viewerProfile?.username) {
        return;
      }

      setProfileLoading(true);
      setProfileError(null);

      try {
        if (!routeUsername || routeUsername === viewerProfile.username) {
          if (isMounted) {
            setProfile(viewerProfile);
          }
        } else {
          const response = await getUserProfile(routeUsername);
          if (isMounted) {
            setProfile(response);
          }
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

    void loadTargetProfile();

    return () => {
      isMounted = false;
    };
  }, [routeUsername, viewerProfile]);

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

  useEffect(() => {
    if (mediaFiles.length === 0) {
      setMediaPreviews([]);
      return;
    }

    const nextPreviews = mediaFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setMediaPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [mediaFiles]);

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
  const isOwnProfile = !!viewerProfile?.username && profile?.username === viewerProfile.username;
  const followerCount = profile?.followerCount ?? 0;
  const followingCount = profile?.followingCount ?? 0;

  const submitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!viewerProfile?.username) {
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
      setMediaPreviews([]);
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

  const closeActionMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const details = event.currentTarget.closest("details");
    if (details) {
      details.removeAttribute("open");
    }
  };

  const openEdit = (post: Post) => {
    setEditPost(post);
    setEditError(null);
    setEditOpen(true);
  };

  const openDelete = (post: Post) => {
    setDeleteTarget(post);
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setMediaFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const handleUpdate = async (input: UpdatePostInput) => {
    setEditBusy(true);
    setEditError(null);
    try {
      const updatedPost = await updatePost(input);
      setPosts((prev) => prev.map((item) => (
        item.postId === updatedPost.postId ? updatedPost : item
      )));
      setEditPost(updatedPost);
      setEditOpen(false);
    } catch (error) {
      setEditError(getErrorMessage(error, "Cannot update post"));
    } finally {
      setEditBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deletePost(deleteTarget.postId);
      setPosts((prev) => prev.filter((item) => item.postId !== deleteTarget.postId));
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(getErrorMessage(error, "Cannot delete post"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile?.username || isOwnProfile) {
      return;
    }

    setFollowBusy(true);
    setFollowError(null);

    try {
      const response = profile.isFollowing
        ? await unfollowUser(profile.username)
        : await followUser(profile.username);
      setProfile((prev) => (prev
        ? {
          ...prev,
          followerCount: response.followerCount,
          followingCount: response.followingCount,
          isFollowing: response.isFollowing,
        }
        : prev
      ));
    } catch (error) {
      setFollowError(getErrorMessage(error, "Cannot update follow"));
    } finally {
      setFollowBusy(false);
    }
  };

  const openFollowList = async (mode: "followers" | "following") => {
    if (!profile?.username) {
      return;
    }

    setFollowListOpen(mode);
    setFollowListLoading(true);
    setFollowListError(null);
    setFollowListItems([]);

    try {
      const response = mode === "followers"
        ? await getFollowers(profile.username, 0, 20)
        : await getFollowing(profile.username, 0, 20);
      setFollowListItems(response.items);
    } catch (error) {
      setFollowListError(getErrorMessage(error, "Cannot load list"));
    } finally {
      setFollowListLoading(false);
    }
  };

  const closeFollowList = () => {
    setFollowListOpen(null);
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
            {isOwnProfile ? (
              <button
                type="button"
                className="profile-hero__edit"
                onClick={() => navigate("/profile")}
              >
                Edit profile
              </button>
            ) : (
              <div className="profile-hero__actions">
                <button
                  type="button"
                  className="profile-hero__action"
                  onClick={() => void handleFollowToggle()}
                  disabled={followBusy}
                >
                  {followBusy ? "Updating..." : profile?.isFollowing ? "Unfollow" : "Follow"}
                </button>
                <button type="button" className="profile-hero__action">
                  Message
                </button>
              </div>
            )}
          </div>
          {followError ? <div className="profile-hero__error">{followError}</div> : null}
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
            <button
              type="button"
              className="profile-hero__stat"
              onClick={() => void openFollowList("following")}
            >
              <strong>{followingCount}</strong>
              <span>Following</span>
            </button>
            <button
              type="button"
              className="profile-hero__stat"
              onClick={() => void openFollowList("followers")}
            >
              <strong>{followerCount}</strong>
              <span>Followers</span>
            </button>
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
                <button type="submit" disabled={composerBusy || viewerLoading}>
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
                    onChange={handleMediaSelect}
                  />
                  <span>{mediaFiles.length ? `${mediaFiles.length} files` : "Add media"}</span>
                </label>
              </div>
              {mediaPreviews.length ? (
                <div className="profile-composer__preview">
                  {mediaPreviews.map((preview, index) => (
                    <div key={`${preview.file.name}-${index}`} className="profile-composer__preview-item">
                      <button
                        type="button"
                        className="profile-composer__preview-remove"
                        aria-label={`Remove ${preview.file.name}`}
                        onClick={() => removeMediaFile(index)}
                      >
                        x
                      </button>
                      <img src={preview.url} alt={`Selected ${preview.file.name}`} />
                    </div>
                  ))}
                </div>
              ) : null}
            </form>

            {postsError ? <div className="discover-alert discover-alert--error">{postsError}</div> : null}

            <div className="post-feed">
              {posts.length === 0 && !postsLoading ? (
                <div className="profile-empty">Nothing here yet. Make your first post.</div>
              ) : null}

              {posts.map((post) => (
                <article key={post.postId} className="post-card">
                  <div className="post-card__head">
                    <Link
                      to={`/${post.username}`}
                      className="post-card__author-link"
                      aria-label={`Open profile for ${post.displayName || post.username}`}
                    >
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
                    </Link>
                    {profile?.username && post.username === profile.username ? (
                      <div className="post-card__menu">
                        <details className="post-action-menu">
                          <summary aria-label="Post options">
                            <span aria-hidden="true">...</span>
                          </summary>
                          <div className="post-action-menu__list" role="menu">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={(event) => {
                                closeActionMenu(event);
                                openEdit(post);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="post-action-menu__danger"
                              onClick={(event) => {
                                closeActionMenu(event);
                                openDelete(post);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </details>
                      </div>
                    ) : null}
                  </div>

                  {post.caption ? <p className="post-card__caption">{post.caption}</p> : null}

                  <PostCardMedia
                    postId={post.postId}
                    caption={post.caption}
                    media={post.media}
                  />

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
      {editOpen && editPost ? (
        <PostEditorModal
          isOpen={editOpen}
          post={editPost}
          isBusy={editBusy}
          error={editError}
          onClose={() => setEditOpen(false)}
          onSubmit={handleUpdate}
        />
      ) : null}
      {deleteOpen ? (
        <dialog className="post-detail__confirm" open>
          <button
            type="button"
            className="post-detail__confirm-backdrop"
            aria-label="Close delete confirmation"
            onClick={() => setDeleteOpen(false)}
          />
          <div className="post-detail__confirm-card">
            <h3>Delete this post?</h3>
            <p>This will archive the post and remove it from your feed.</p>
            {deleteError ? <div className="post-detail__confirm-error">{deleteError}</div> : null}
            <div className="post-detail__confirm-actions">
              <button type="button" onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
                Cancel
              </button>
              <button type="button" className="post-detail__confirm-danger" onClick={handleDelete} disabled={deleteBusy}>
                {deleteBusy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
      {followListOpen ? (
        <dialog className="follow-list" open>
          <button
            type="button"
            className="follow-list__backdrop"
            aria-label="Close follow list"
            onClick={closeFollowList}
          />
          <div className="follow-list__card">
            <div className="follow-list__header">
              <h3>{followListOpen === "followers" ? "Followers" : "Following"}</h3>
              <button type="button" onClick={closeFollowList}>
                Close
              </button>
            </div>
            {followListLoading ? <p>Loading...</p> : null}
            {followListError ? <p className="follow-list__error">{followListError}</p> : null}
            {!followListLoading && followListItems.length === 0 ? (
              <p className="follow-list__empty">No users yet.</p>
            ) : null}
            <ul className="follow-list__items">
              {followListItems.map((item) => (
                <li key={item.userId}>
                  <Link
                    to={`/${item.username}`}
                    className="follow-list__item"
                    onClick={closeFollowList}
                  >
                    <div className="follow-list__avatar">
                      {item.avatarUrl ? (
                        <img src={item.avatarUrl} alt={item.displayName || "User"} />
                      ) : (
                        <span>{(item.displayName || "U").charAt(0)}</span>
                      )}
                    </div>
                    <div className="follow-list__meta">
                      <strong>{item.displayName}</strong>
                      <span>@{item.username}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}

export default HomePage;
