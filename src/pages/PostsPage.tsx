import { useEffect, useState, type MouseEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import { deletePost, getDiscoverPosts, getLatestDiscussions, getLatestHashtags, getMyProfile, getSearchPosts, likePost, updatePost, unlikePost, savePost, unsavePost } from "../services/socialService";
import PostCardMedia from "../components/posts/PostCardMedia";
import PostEditorModal from "../components/posts/PostEditorModal";
import ReportPostDialog from "../components/posts/ReportPostDialog";
import { getErrorMessage } from "../utils/errorMessage";
import type { LatestDiscussionItem, Post, UpdatePostInput } from "../types/social";

function formatDate(iso: string): string {
  const parsedDate = new Date(iso);
  return Number.isNaN(parsedDate.getTime()) ? iso : parsedDate.toLocaleDateString();
}

function PostsPage() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() || "";
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestDiscussions, setLatestDiscussions] = useState<LatestDiscussionItem[]>([]);
  const [latestHashtags, setLatestHashtags] = useState<string[]>([]);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [saveBusy, setSaveBusy] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<Post | null>(null);

  const normalizeTag = (tag: string) => {
    const trimmed = tag.trim();
    return trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  };

  const isHashtagTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    return normalized.length > 0 && !normalized.startsWith("@");
  };

  const toggleSave = async (post: Post) => {
    if (!currentUsername || saveBusy.has(post.postId)) return;
    setSaveBusy((prev) => new Set(prev).add(post.postId));
    const wasSaved = post.savedByMe;
    setPosts((prev) =>
      prev.map((p) => p.postId === post.postId ? { ...p, savedByMe: !wasSaved } : p)
    );
    try {
      if (wasSaved) {
        await unsavePost(post.postId);
      } else {
        await savePost(post.postId);
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) => p.postId === post.postId ? { ...p, savedByMe: wasSaved } : p)
      );
    } finally {
      setSaveBusy((prev) => { const next = new Set(prev); next.delete(post.postId); return next; });
    }
  };

  const loadPosts = async (replace = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = searchQuery
        ? await getSearchPosts(10, replace ? undefined : cursor, searchQuery)
        : await getDiscoverPosts(10, replace ? undefined : cursor);
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
    setPosts([]);
    setCursor(null);
    setHasNext(false);
    void loadPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const profile = await getMyProfile();
        if (isMounted) {
          setCurrentUsername(profile.username);
        }
      } catch {
        if (isMounted) {
          setCurrentUsername(null);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

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
            .filter(isHashtagTag)
            .map(normalizeTag)
            .slice(0, 5)
        );
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
    } catch (error) {
      setError(getErrorMessage(error, "Cannot update like right now."));
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
    } catch (loadError) {
      setEditError(getErrorMessage(loadError, "Cannot update post"));
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
    } catch (loadError) {
      setDeleteError(getErrorMessage(loadError, "Cannot delete post"));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section className="discover-page discover-page--posts">
      {error ? <div className="discover-alert discover-alert--error">{error}</div> : null}
      <div className="posts-layout">
        <div className="posts-layout__spacer" aria-hidden="true" />

        <div className="posts-layout__main">
          {searchQuery ? (
            <div className="posts-search-banner">
              <span>Search results</span>
              <strong>“{searchQuery}”</strong>
            </div>
          ) : null}

          <div className="post-feed">
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
                  {currentUsername ? (
                    <div className="post-card__menu">
                      <details className="post-action-menu">
                        <summary aria-label="Post options">
                          <span aria-hidden="true">...</span>
                        </summary>
                        <div className="post-action-menu__list" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            disabled={saveBusy.has(post.postId)}
                            onClick={(event) => {
                              closeActionMenu(event);
                              void toggleSave(post);
                            }}
                          >
                            {post.savedByMe ? "Unsave" : "Save"}
                          </button>
                          {post.username === currentUsername ? null : (
                            <button
                              type="button"
                              role="menuitem"
                              className="post-action-menu__report"
                              onClick={(event) => {
                                closeActionMenu(event);
                                setReportTarget(post);
                              }}
                            >
                              Report
                            </button>
                          )}
                          {post.username === currentUsername ? (
                            <>
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
                            </>
                          ) : null}
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

                {post.tags.some(isHashtagTag) ? (
                  <div className="post-card__tags">
                    {post.tags.filter(isHashtagTag).map((tag) => (
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

            {!isLoading && posts.length === 0 ? (
              <div className="post-feed__empty">
                <h3>No posts found.</h3>
                <p>{searchQuery ? "Try a different caption keyword." : "There are no posts to show yet."}</p>
              </div>
            ) : null}
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

        <div className="posts-layout__spacer" aria-hidden="true" />
      </div>
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
      {reportTarget ? (
        <ReportPostDialog
          postId={reportTarget.postId}
          onClose={() => setReportTarget(null)}
        />
      ) : null}
    </section>
  );
}

export default PostsPage;
