import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import {
  createComment,
  deleteComment,
  deletePost,
  getComments,
  getDiscoverPosts,
  getPostById,
  getMyProfile,
  likeComment,
  likePost,
  replyComment,
  updateComment,
  updatePost,
  unlikeComment,
  unlikePost,
} from "../services/socialService";
import { getErrorMessage } from "../utils/errorMessage";
import type { Comment, MediaItem, Post, UpdatePostInput } from "../types/social";
import PostEditorModal from "../components/posts/PostEditorModal";
import FlagWarningBanner from "../components/posts/FlagWarningBanner";

const placeholderTags = ["visual", "painting", "digital", "study", "palette"];

const postCache = new Map<string, Post>();

type PostDetailState = {
  post?: Post;
  thumbnailUrl?: string;
  mediaId?: string;
  initialMediaIndex?: number;
  commentId?: string;
};

type PostDetailModel = {
  postData: Post | null;
  currentUsername: string | null;
  error: string | null;
  isLoading: boolean;
  commentItems: Comment[];
  commentsLoading: boolean;
  commentsError: string | null;
  commentText: string;
  setCommentText: (value: string) => void;
  editingCommentId: string | null;
  commentDrafts: Record<string, string>;
  replyDrafts: Record<string, string>;
  activeReplyId: string | null;
  toggleReplyBox: (commentId: string) => void;
  updateReplyDraft: (commentId: string, value: string) => void;
  startEditComment: (comment: Comment) => void;
  cancelEditComment: () => void;
  updateCommentDraft: (commentId: string, value: string) => void;
  activeMedia: MediaItem | undefined;
  mediaItems: MediaItem[];
  hasGallery: boolean;
  activeIndex: number;
  displayName: string;
  username: string;
  createdAt: string;
  caption: string;
  tags: string[];
  toggleLike: () => Promise<void>;
  toggleCommentLike: (commentId: string, likedByMe: boolean) => Promise<void>;
  submitComment: () => Promise<void>;
  submitReply: (commentId: string) => Promise<void>;
  submitEditComment: (commentId: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  goPrev: () => void;
  goNext: () => void;
  selectMedia: (index: number) => void;
  updatePostData: (post: Post) => void;
};

function updateCommentLikeState(
  comments: Comment[],
  commentId: string,
  likeCount: number,
  likedByMe: boolean
): Comment[] {
  return comments.map((comment) => {
    if (comment.commentId === commentId) {
      return { ...comment, likeCount, likedByMe };
    }

    if (comment.replies.length === 0) {
      return comment;
    }

    return {
      ...comment,
      replies: updateCommentLikeState(comment.replies, commentId, likeCount, likedByMe),
    };
  });
}

function resolveInitialMediaIndex(state: PostDetailState | null, postData: Post | null): number {
  if (typeof state?.initialMediaIndex === "number") {
    return state.initialMediaIndex;
  }

  if (state?.mediaId && postData?.media?.length) {
    const foundIndex = postData.media.findIndex((item) => item.mediaId === state.mediaId);
    return Math.max(0, foundIndex);
  }

  return 0;
}

function usePostDetail(postId: string | undefined, state: PostDetailState | null): PostDetailModel {
  const [postData, setPostData] = useState<Post | null>(state?.post ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [commentItems, setCommentItems] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  useEffect(() => {
    setPostData(state?.post ?? null);
    setError(null);
    setCommentItems([]);
    setCommentsError(null);
    setCommentText("");
    setEditingCommentId(null);
    setCommentDrafts({});
    setReplyDrafts({});
    setActiveReplyId(null);
  }, [postId, state?.post]);

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
    if (postData?.postId) {
      postCache.set(postData.postId, postData);
    }
  }, [postData]);

  useEffect(() => {
    if (postData || !postId) {
      return;
    }

    let isMounted = true;

    const loadPostFromDiscover = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const cachedPost = postCache.get(postId);
        if (cachedPost) {
          if (isMounted) {
            setPostData(cachedPost);
          }
          return;
        }

        let cursor: string | null | undefined;
        let foundPost: Post | null = null;
        let hasNext = true;

        while (hasNext && !foundPost) {
          const response = await getDiscoverPosts(20, cursor);
          foundPost = response.items.find((item) => item.postId === postId) ?? null;
          cursor = response.nextCursor;
          hasNext = response.hasNext;
        }

        if (!foundPost) {
          const directPost = await getPostById(postId);
          foundPost = directPost;
        }

        if (isMounted) {
          setPostData(foundPost);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError, "Cannot load post"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadPostFromDiscover();

    return () => {
      isMounted = false;
    };
  }, [postData, postId]);

  const refreshComments = async () => {
    if (!postData?.postId) {
      return;
    }

    setCommentsLoading(true);
    setCommentsError(null);

    try {
      const response = await getComments(postData.postId, 0, 20, 2);
      setCommentItems(response.items);
    } catch (loadError) {
      setCommentsError(getErrorMessage(loadError, "Cannot load comments"));
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    void refreshComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postData?.postId]);

  const mediaItems = useMemo(() => (
    postData?.media?.length ? postData.media : ([] as MediaItem[])
  ), [postData]);

  const initialIndex = useMemo(
    () => resolveInitialMediaIndex(state, postData),
    [postData, state]
  );

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeMedia = mediaItems[activeIndex];
  const hasGallery = mediaItems.length > 1;

  useEffect(() => {
    if (mediaItems.length > 0 && activeIndex >= mediaItems.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, mediaItems.length]);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex, postId]);

  const normalizeTag = (tag: string) => {
    const trimmed = tag.trim();
    return trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  };

  const isHashtagTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    return normalized.length > 0 && !normalized.startsWith("@");
  };

  const displayName = postData?.displayName || "Unknown creator";
  const username = postData?.username || "unknown";
  const createdAt = postData?.createdAt ? new Date(postData.createdAt).toLocaleString() : "Just now";
  const caption = postData?.caption || "No caption yet.";
  const tags = (postData?.tags?.length ? postData.tags : placeholderTags)
    .filter(isHashtagTag)
    .map(normalizeTag);

  const toggleLike = async () => {
    if (!postData) {
      return;
    }

    try {
      const response = postData.likedByMe
        ? await unlikePost(postData.postId)
        : await likePost(postData.postId);
      setPostData({
        ...postData,
        likedByMe: response.likedByMe,
        likeCount: response.likeCount
      });
    } catch (error) {
      setError(getErrorMessage(error, "Cannot update like right now."));
    }
  };

  const submitComment = async () => {
    if (!postData) {
      return;
    }

    const content = commentText.trim();
    if (!content) {
      return;
    }

    try {
      await createComment(postData.postId, content);
      setCommentText("");
      await refreshComments();
    } catch (error) {
      setError(getErrorMessage(error, "Cannot post comment right now."));
    }
  };

  const toggleCommentLike = async (commentId: string, likedByMe: boolean) => {
    try {
      const response = likedByMe
        ? await unlikeComment(commentId)
        : await likeComment(commentId);
      setCommentItems((prev) => updateCommentLikeState(prev, response.commentId, response.likeCount, response.likedByMe));
    } catch (error) {
      setCommentsError(getErrorMessage(error, "Cannot update comment like right now."));
    }
  };

  const toggleReplyBox = (commentId: string) => {
    setActiveReplyId((prev) => (prev === commentId ? null : commentId));
  };

  const updateReplyDraft = (commentId: string, value: string) => {
    setReplyDrafts((prev) => ({ ...prev, [commentId]: value }));
  };

  const submitReply = async (commentId: string) => {
    if (!postData) {
      return;
    }

    const content = (replyDrafts[commentId] || "").trim();
    if (!content) {
      return;
    }

    try {
      await replyComment(commentId, content);
      setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
      setActiveReplyId(null);
      await refreshComments();
    } catch (error) {
      setCommentsError(getErrorMessage(error, "Cannot post reply right now."));
    }
  };

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.commentId);
    setCommentDrafts((prev) => ({ ...prev, [comment.commentId]: comment.content }));
    setActiveReplyId(null);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
  };

  const updateCommentDraft = (commentId: string, value: string) => {
    setCommentDrafts((prev) => ({ ...prev, [commentId]: value }));
  };

  const submitEditComment = async (commentId: string) => {
    const content = (commentDrafts[commentId] || "").trim();
    if (!content) {
      return;
    }

    try {
      await updateComment(commentId, content);
      setEditingCommentId(null);
      await refreshComments();
    } catch (error) {
      setCommentsError(getErrorMessage(error, "Cannot update comment right now."));
    }
  };

  const deleteCommentById = async (commentId: string) => {
    const shouldDelete = globalThis.confirm(
      "Delete this comment? Root comments will remove all replies."
    );
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteComment(commentId);
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
      }
      await refreshComments();
    } catch (error) {
      setCommentsError(getErrorMessage(error, "Cannot delete comment right now."));
    }
  };

  const goPrev = () => {
    if (!hasGallery) {
      return;
    }

    setActiveIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  const goNext = () => {
    if (!hasGallery) {
      return;
    }

    setActiveIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const selectMedia = (index: number) => {
    if (!hasGallery) {
      return;
    }

    const clamped = Math.min(Math.max(index, 0), mediaItems.length - 1);
    setActiveIndex(clamped);
  };

  const updatePostData = (post: Post) => {
    postCache.set(post.postId, post);
    setPostData(post);
  };

  return {
    postData,
    currentUsername,
    error,
    isLoading,
    commentItems,
    commentsLoading,
    commentsError,
    commentText,
    setCommentText,
    editingCommentId,
    commentDrafts,
    replyDrafts,
    activeReplyId,
    toggleReplyBox,
    updateReplyDraft,
    startEditComment,
    cancelEditComment,
    updateCommentDraft,
    activeMedia,
    mediaItems,
    hasGallery,
    activeIndex,
    displayName,
    username,
    createdAt,
    caption,
    tags,
    toggleLike,
    toggleCommentLike,
    submitComment,
    submitReply,
    submitEditComment,
    deleteComment: deleteCommentById,
    goPrev,
    goNext,
    selectMedia,
    updatePostData,
  };
}

type PostDetailViewProps = {
  postId?: string;
  model: PostDetailModel;
  onClose: () => void;
  highlightCommentId?: string | null;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

type PostDetailMediaProps = {
  postId?: string;
  activeMedia: MediaItem | undefined;
  mediaItems: MediaItem[];
  caption: string;
  isLoading: boolean;
  error: string | null;
  hasGallery: boolean;
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
};

function PostDetailMedia({
  postId,
  activeMedia,
  mediaItems,
  caption,
  isLoading,
  error,
  hasGallery,
  activeIndex,
  onPrev,
  onNext,
  onSelect,
}: Readonly<PostDetailMediaProps>) {
  return (
    <div className="post-detail__media">
      <div className="post-detail__media-frame">
        {activeMedia?.originalUrl ? (
          <div
            className="post-detail__media-track"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {mediaItems.map((item) => (
              <div key={item.mediaId} className="post-detail__media-slide">
                <img
                  src={item.originalUrl}
                  alt={caption}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="post-detail__media-placeholder">
            <p>No media available</p>
            <span>Post ID: {postId || "unknown"}</span>
          </div>
        )}

        {isLoading ? <div className="post-detail__loading">Loading post...</div> : null}
        {error ? <div className="post-detail__error">{error}</div> : null}

        {hasGallery ? (
          <div className="post-detail__media-controls">
            <button
              type="button"
              className="post-detail__media-arrow post-detail__media-arrow--prev"
              onClick={onPrev}
              aria-label="Previous media"
            >
              <span aria-hidden="true">&lt;</span>
            </button>
            <button
              type="button"
              className="post-detail__media-arrow post-detail__media-arrow--next"
              onClick={onNext}
              aria-label="Next media"
            >
              <span aria-hidden="true">&gt;</span>
            </button>
            <div className="post-detail__media-dots" role="tablist" aria-label="Media navigation">
              {mediaItems.map((item, index) => (
                <button
                  key={item.mediaId}
                  type="button"
                  className={index === activeIndex ? "post-detail__media-dot post-detail__media-dot--active" : "post-detail__media-dot"}
                  onClick={() => onSelect(index)}
                  aria-label={`Go to media ${index + 1}`}
                  aria-pressed={index === activeIndex}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type PostDetailInfoProps = {
  postData: Post | null;
  displayName: string;
  username: string;
  createdAt: string;
  caption: string;
  tags: string[];
  commentItems: Comment[];
  highlightCommentId?: string | null;
  commentsLoading: boolean;
  commentsError: string | null;
  commentText: string;
  setCommentText: (value: string) => void;
  replyDrafts: Record<string, string>;
  activeReplyId: string | null;
  toggleReplyBox: (commentId: string) => void;
  updateReplyDraft: (commentId: string, value: string) => void;
  editingCommentId: string | null;
  commentDrafts: Record<string, string>;
  currentUsername: string | null;
  postOwnerUsername: string | null;
  onStartEdit: (comment: Comment) => void;
  onCancelEdit: () => void;
  onUpdateCommentDraft: (commentId: string, value: string) => void;
  error: string | null;
  isLoading: boolean;
  onToggleLike: () => Promise<void>;
  onToggleCommentLike: (commentId: string, likedByMe: boolean) => Promise<void>;
  onSubmitComment: () => Promise<void>;
  onSubmitReply: (commentId: string) => Promise<void>;
  onSubmitEditComment: (commentId: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

type PostDetailCommentsProps = {
  commentItems: Comment[];
  highlightCommentId?: string | null;
  commentsLoading: boolean;
  commentsError: string | null;
  commentText: string;
  setCommentText: (value: string) => void;
  replyDrafts: Record<string, string>;
  activeReplyId: string | null;
  toggleReplyBox: (commentId: string) => void;
  updateReplyDraft: (commentId: string, value: string) => void;
  editingCommentId: string | null;
  commentDrafts: Record<string, string>;
  currentUsername: string | null;
  postOwnerUsername: string | null;
  onStartEdit: (comment: Comment) => void;
  onCancelEdit: () => void;
  onUpdateCommentDraft: (commentId: string, value: string) => void;
  onToggleCommentLike: (commentId: string, likedByMe: boolean) => Promise<void>;
  onSubmitComment: () => Promise<void>;
  onSubmitReply: (commentId: string) => Promise<void>;
  onSubmitEditComment: (commentId: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
};

function PostDetailComments({
  commentItems,
  highlightCommentId,
  commentsLoading,
  commentsError,
  commentText,
  setCommentText,
  replyDrafts,
  activeReplyId,
  toggleReplyBox,
  updateReplyDraft,
  editingCommentId,
  commentDrafts,
  currentUsername,
  postOwnerUsername,
  onStartEdit,
  onCancelEdit,
  onUpdateCommentDraft,
  onToggleCommentLike,
  onSubmitComment,
  onSubmitReply,
  onSubmitEditComment,
  onDeleteComment,
}: Readonly<PostDetailCommentsProps>) {
  const countAllComments = (comments: Comment[]): number => (
    comments.reduce((total, comment) => total + 1 + countAllComments(comment.replies), 0)
  );

  const totalCommentCount = countAllComments(commentItems);

  useEffect(() => {
    if (!highlightCommentId) {
      return;
    }

    const target = document.getElementById(`comment-${highlightCommentId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [commentItems, highlightCommentId]);

  const renderComment = (comment: Comment) => {
    const isEditing = editingCommentId === comment.commentId;
    const canEdit = !!currentUsername && comment.username === currentUsername;
    const canDelete = !!currentUsername
      && (comment.username === currentUsername || currentUsername === postOwnerUsername);

    return (
      <li key={comment.commentId} id={`comment-${comment.commentId}`} className="post-detail__comment-item">
        <div className="post-detail__comment-root">
          <Link
            to={`/${comment.username}`}
            className="post-detail__comment-avatar-link"
            aria-label={`Open profile for ${comment.displayName || comment.username}`}
          >
            <div className="post-detail__comment-avatar">
              {comment.avatarUrl ? (
                <img src={comment.avatarUrl} alt={comment.displayName || "User"} />
              ) : (
                <span>{comment.displayName?.charAt(0).toUpperCase() || "U"}</span>
              )}
            </div>
          </Link>
          <div className="post-detail__comment-body">
            <Link
              to={`/${comment.username}`}
              className="post-detail__comment-author"
              aria-label={`Open profile for ${comment.displayName || comment.username}`}
            >
              <strong>{comment.displayName}</strong>
            </Link>
            {isEditing ? (
              <div className="post-detail__edit-box">
                <input
                  value={commentDrafts[comment.commentId] ?? ""}
                  onChange={(event) => onUpdateCommentDraft(comment.commentId, event.target.value)}
                  placeholder="Edit your comment"
                />
                <button
                  type="button"
                  className="post-detail__edit-save"
                  onClick={() => void onSubmitEditComment(comment.commentId)}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="post-detail__edit-cancel"
                  onClick={onCancelEdit}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p>{comment.content}</p>
            )}
            <div className="post-detail__comment-actions">
              <button
                type="button"
                className="post-detail__comment-like"
                onClick={() => void onToggleCommentLike(comment.commentId, comment.likedByMe)}
              >
                {comment.likedByMe ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
                {comment.likeCount}
              </button>
              <button
                type="button"
                className="post-detail__comment-reply"
                onClick={() => toggleReplyBox(comment.commentId)}
                disabled={isEditing}
              >
                Reply{comment.replyCount ? ` (${comment.replyCount})` : ""}
              </button>
              {canEdit && !isEditing ? (
                <button
                  type="button"
                  className="post-detail__comment-edit"
                  onClick={() => onStartEdit(comment)}
                >
                  Edit
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  className="post-detail__comment-delete"
                  onClick={() => void onDeleteComment(comment.commentId)}
                >
                  Delete
                </button>
              ) : null}
            </div>
            {activeReplyId === comment.commentId && !isEditing ? (
              <div className="post-detail__reply-box">
                <input
                  value={replyDrafts[comment.commentId] ?? ""}
                  onChange={(event) => updateReplyDraft(comment.commentId, event.target.value)}
                  placeholder="Write a reply"
                />
                <button type="button" onClick={() => void onSubmitReply(comment.commentId)}>
                  Send
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {comment.replies.length > 0 ? (
          <div className="post-detail__comment-replies-wrap">
            <ul className="post-detail__comment-replies">
              {comment.replies.map(renderComment)}
            </ul>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <>
      <div className="post-detail__stats">
        <span>{totalCommentCount} comments</span>
      </div>

      <div className="post-detail__comment-box">
        <input
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Write a comment"
        />
        <button type="button" onClick={() => void onSubmitComment()}>
          Send
        </button>
      </div>

      <div className="post-detail__comments">
        <h4>Comments</h4>
        {commentsLoading ? <p>Loading comments...</p> : null}
        {commentsError ? <p>{commentsError}</p> : null}
        <ul>
          {commentItems.map(renderComment)}
        </ul>
      </div>
    </>
  );
}

function PostDetailInfo({
  postData,
  displayName,
  username,
  createdAt,
  caption,
  tags,
  commentItems,
  highlightCommentId,
  commentsLoading,
  commentsError,
  commentText,
  setCommentText,
  replyDrafts,
  activeReplyId,
  toggleReplyBox,
  updateReplyDraft,
  editingCommentId,
  commentDrafts,
  currentUsername,
  postOwnerUsername,
  onStartEdit,
  onCancelEdit,
  onUpdateCommentDraft,
  error,
  isLoading,
  onToggleLike,
  onToggleCommentLike,
  onSubmitComment,
  onSubmitReply,
  onSubmitEditComment,
  onDeleteComment,
  canEdit,
  onEdit,
  onDelete,
}: Readonly<PostDetailInfoProps>) {
  const closeActionMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const details = event.currentTarget.closest("details");
    if (details) {
      details.removeAttribute("open");
    }
  };

  return (
    <aside className="post-detail__info">
      {postData ? (
        <>
          <header className="post-detail__author">
            <Link
              to={`/${username}`}
              className="post-detail__author-link"
              aria-label={`Open profile for ${displayName}`}
            >
              <div className="post-detail__avatar">
                {postData?.avatarUrl ? (
                  <img src={postData.avatarUrl} alt={displayName} />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h3>{displayName}</h3>
                <p>@{username} • {createdAt}</p>
              </div>
            </Link>
            {canEdit ? (
              <div className="post-detail__menu">
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
                        onEdit();
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
                        onDelete();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </details>
              </div>
            ) : null}
          </header>

          <div className="post-detail__caption">
            <p>{caption}</p>
          </div>

          <FlagWarningBanner post={postData} />

          {tags.length > 0 ? (
            <div className="post-detail__tags">
              {tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          ) : null}

          <div className="post-detail__stats">
            <button type="button" className="post-detail__like" onClick={() => void onToggleLike()}>
              {postData.likedByMe ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
              {postData.likeCount}
            </button>
          </div>
          <PostDetailComments
            commentItems={commentItems}
            highlightCommentId={highlightCommentId}
            commentsLoading={commentsLoading}
            commentsError={commentsError}
            commentText={commentText}
            setCommentText={setCommentText}
            replyDrafts={replyDrafts}
            activeReplyId={activeReplyId}
            toggleReplyBox={toggleReplyBox}
            updateReplyDraft={updateReplyDraft}
            editingCommentId={editingCommentId}
            commentDrafts={commentDrafts}
            currentUsername={currentUsername}
            postOwnerUsername={postOwnerUsername}
            onStartEdit={onStartEdit}
            onCancelEdit={onCancelEdit}
            onUpdateCommentDraft={onUpdateCommentDraft}
            onToggleCommentLike={onToggleCommentLike}
            onSubmitComment={onSubmitComment}
            onSubmitReply={onSubmitReply}
            onSubmitEditComment={onSubmitEditComment}
            onDeleteComment={onDeleteComment}
          />
        </>
      ) : (
        <div className="post-detail__info-loading">
          <p>{isLoading ? "Loading post details..." : "Post details unavailable."}</p>
          {error ? <span>{error}</span> : null}
        </div>
      )}
    </aside>
  );
}

function PostDetailView({ postId, model, onClose, highlightCommentId, canEdit, onEdit, onDelete }: Readonly<PostDetailViewProps>) {
  const {
    postData,
    error,
    isLoading,
    commentItems,
    commentsLoading,
    commentsError,
    commentText,
    setCommentText,
    editingCommentId,
    commentDrafts,
    replyDrafts,
    activeReplyId,
    toggleReplyBox,
    updateReplyDraft,
    startEditComment,
    cancelEditComment,
    updateCommentDraft,
    activeMedia,
    mediaItems,
    hasGallery,
    activeIndex,
    displayName,
    username,
    createdAt,
    caption,
    tags,
    toggleLike,
    toggleCommentLike,
    submitComment,
    submitReply,
    submitEditComment,
    deleteComment,
    goPrev,
    goNext,
    selectMedia,
  } = model;
  return (
    <dialog className="post-detail-overlay" aria-modal="true" open>
      <button
        type="button"
        className="post-detail-overlay__backdrop"
        aria-label="Close post detail"
        onClick={onClose}
      />
      <div className="post-detail__panel">
        <PostDetailMedia
          postId={postId}
          activeMedia={activeMedia}
          mediaItems={mediaItems}
          caption={caption}
          isLoading={isLoading}
          error={error}
          hasGallery={hasGallery}
          activeIndex={activeIndex}
          onPrev={goPrev}
          onNext={goNext}
          onSelect={selectMedia}
        />
        <PostDetailInfo
          postData={postData}
          displayName={displayName}
          username={username}
          createdAt={createdAt}
          caption={caption}
          tags={tags}
          commentItems={commentItems}
          highlightCommentId={highlightCommentId}
          commentsLoading={commentsLoading}
          commentsError={commentsError}
          commentText={commentText}
          setCommentText={setCommentText}
          replyDrafts={replyDrafts}
          activeReplyId={activeReplyId}
          toggleReplyBox={toggleReplyBox}
          updateReplyDraft={updateReplyDraft}
          editingCommentId={editingCommentId}
          commentDrafts={commentDrafts}
          currentUsername={model.currentUsername}
          postOwnerUsername={model.postData?.username ?? null}
          onStartEdit={startEditComment}
          onCancelEdit={cancelEditComment}
          onUpdateCommentDraft={updateCommentDraft}
          error={error}
          isLoading={isLoading}
          onToggleLike={toggleLike}
          onToggleCommentLike={toggleCommentLike}
          onSubmitComment={submitComment}
          onSubmitReply={submitReply}
          onSubmitEditComment={submitEditComment}
          onDeleteComment={deleteComment}
          canEdit={canEdit}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </dialog>
  );
}
function PostDetailPage() {
  const { postId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as PostDetailState | null) ?? null;
  const model = usePostDetail(postId, state);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isOwner = !!model.currentUsername && model.postData?.username === model.currentUsername;
  const canEdit = isOwner && !model.postData?.isPending;

  const handleUpdate = async (input: UpdatePostInput) => {
    setEditBusy(true);
    setEditError(null);
    try {
      const updatedPost = await updatePost(input);
      model.updatePostData(updatedPost);
      setEditOpen(false);
    } catch (error) {
      setEditError(getErrorMessage(error, "Cannot update post"));
    } finally {
      setEditBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!postId) {
      return;
    }

    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deletePost(postId);
      navigate(-1);
    } catch (error) {
      setDeleteError(getErrorMessage(error, "Cannot delete post"));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <PostDetailView
        postId={postId}
        model={model}
        highlightCommentId={state?.commentId ?? null}
        onClose={() => navigate(-1)}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        canEdit={canEdit}
      />
      {model.postData ? (
        <PostEditorModal
          isOpen={editOpen}
          post={model.postData}
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
    </>
  );
}

export default PostDetailPage;
