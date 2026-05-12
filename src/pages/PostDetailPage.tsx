import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import { createComment, getComments, getDiscoverPosts, likePost, unlikePost } from "../services/socialService";
import { getErrorMessage } from "../utils/errorMessage";
import type { Comment, MediaItem, Post } from "../types/social";

const placeholderTags = ["visual", "painting", "digital", "study", "palette"];

const postCache = new Map<string, Post>();

type PostDetailState = {
  post?: Post;
  thumbnailUrl?: string;
  mediaId?: string;
  initialMediaIndex?: number;
};

type PostDetailModel = {
  postData: Post | null;
  error: string | null;
  isLoading: boolean;
  commentItems: Comment[];
  commentsLoading: boolean;
  commentsError: string | null;
  commentText: string;
  setCommentText: (value: string) => void;
  activeMedia: MediaItem | undefined;
  hasGallery: boolean;
  activeIndex: number;
  mediaCount: number;
  displayName: string;
  username: string;
  createdAt: string;
  caption: string;
  tags: string[];
  toggleLike: () => Promise<void>;
  submitComment: () => Promise<void>;
  goPrev: () => void;
  goNext: () => void;
};

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
  const [commentItems, setCommentItems] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    setPostData(state?.post ?? null);
    setError(null);
    setCommentItems([]);
    setCommentsError(null);
    setCommentText("");
  }, [postId, state?.post]);

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

  useEffect(() => {
    if (!postData?.postId) {
      return;
    }

    let isMounted = true;

    const loadComments = async () => {
      setCommentsLoading(true);
      setCommentsError(null);

      try {
        const response = await getComments(postData.postId, 0, 20, 2);
        if (isMounted) {
          setCommentItems(response.items);
        }
      } catch (loadError) {
        if (isMounted) {
          setCommentsError(getErrorMessage(loadError, "Cannot load comments"));
        }
      } finally {
        if (isMounted) {
          setCommentsLoading(false);
        }
      }
    };

    void loadComments();

    return () => {
      isMounted = false;
    };
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
  const mediaCount = mediaItems.length;

  useEffect(() => {
    if (mediaItems.length > 0 && activeIndex >= mediaItems.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, mediaItems.length]);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex, postId]);

  const displayName = postData?.displayName || "Unknown creator";
  const username = postData?.username || "unknown";
  const createdAt = postData?.createdAt ? new Date(postData.createdAt).toLocaleString() : "Just now";
  const caption = postData?.caption || "No caption yet.";
  const tags = postData?.tags?.length ? postData.tags : placeholderTags;

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
    } catch {
      setError("Cannot update like right now.");
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
      const response = await getComments(postData.postId, 0, 20, 2);
      setCommentItems(response.items);
      setCommentText("");
    } catch {
      setError("Cannot post comment right now.");
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

  return {
    postData,
    error,
    isLoading,
    commentItems,
    commentsLoading,
    commentsError,
    commentText,
    setCommentText,
    activeMedia,
    hasGallery,
    activeIndex,
    mediaCount,
    displayName,
    username,
    createdAt,
    caption,
    tags,
    toggleLike,
    submitComment,
    goPrev,
    goNext,
  };
}

type PostDetailViewProps = {
  postId?: string;
  model: PostDetailModel;
  onClose: () => void;
};

type PostDetailMediaProps = {
  postId?: string;
  activeMedia: MediaItem | undefined;
  caption: string;
  isLoading: boolean;
  error: string | null;
  hasGallery: boolean;
  activeIndex: number;
  mediaCount: number;
  onPrev: () => void;
  onNext: () => void;
};

function PostDetailMedia({
  postId,
  activeMedia,
  caption,
  isLoading,
  error,
  hasGallery,
  activeIndex,
  mediaCount,
  onPrev,
  onNext,
}: Readonly<PostDetailMediaProps>) {
  return (
    <div className="post-detail__media">
      <div className="post-detail__media-frame">
        {activeMedia?.originalUrl ? (
          <img
            src={activeMedia.originalUrl}
            alt={caption}
          />
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
            <button type="button" onClick={onPrev} aria-label="Previous media">
              Prev
            </button>
            <span>{activeIndex + 1}/{mediaCount}</span>
            <button type="button" onClick={onNext} aria-label="Next media">
              Next
            </button>
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
  commentsLoading: boolean;
  commentsError: string | null;
  commentText: string;
  setCommentText: (value: string) => void;
  error: string | null;
  isLoading: boolean;
  onToggleLike: () => Promise<void>;
  onSubmitComment: () => Promise<void>;
};

function PostDetailInfo({
  postData,
  displayName,
  username,
  createdAt,
  caption,
  tags,
  commentItems,
  commentsLoading,
  commentsError,
  commentText,
  setCommentText,
  error,
  isLoading,
  onToggleLike,
  onSubmitComment,
}: Readonly<PostDetailInfoProps>) {
  return (
    <aside className="post-detail__info">
      {postData ? (
        <>
          <header className="post-detail__author">
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
          </header>

          <div className="post-detail__caption">
            <p>{caption}</p>
          </div>

          <div className="post-detail__tags">
            {tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>

          <div className="post-detail__stats">
            <button type="button" className="post-detail__like" onClick={() => void onToggleLike()}>
              {postData.likedByMe ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
              {postData.likeCount}
            </button>
            <span>{commentItems.length} comments</span>
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
              {commentItems.map((comment) => (
                <li key={comment.commentId}>
                  <div className="post-detail__comment-avatar">
                    {comment.avatarUrl ? (
                      <img src={comment.avatarUrl} alt={comment.displayName || "User"} />
                    ) : (
                      <span>{comment.displayName?.charAt(0).toUpperCase() || "U"}</span>
                    )}
                  </div>
                  <div className="post-detail__comment-body">
                    <strong>{comment.displayName}</strong>
                    <p>{comment.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
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

function PostDetailView({ postId, model, onClose }: Readonly<PostDetailViewProps>) {
  const {
    postData,
    error,
    isLoading,
    commentItems,
    commentsLoading,
    commentsError,
    commentText,
    setCommentText,
    activeMedia,
    hasGallery,
    activeIndex,
    mediaCount,
    displayName,
    username,
    createdAt,
    caption,
    tags,
    toggleLike,
    submitComment,
    goPrev,
    goNext,
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
          caption={caption}
          isLoading={isLoading}
          error={error}
          hasGallery={hasGallery}
          activeIndex={activeIndex}
          mediaCount={mediaCount}
          onPrev={goPrev}
          onNext={goNext}
        />
        <PostDetailInfo
          postData={postData}
          displayName={displayName}
          username={username}
          createdAt={createdAt}
          caption={caption}
          tags={tags}
          commentItems={commentItems}
          commentsLoading={commentsLoading}
          commentsError={commentsError}
          commentText={commentText}
          setCommentText={setCommentText}
          error={error}
          isLoading={isLoading}
          onToggleLike={toggleLike}
          onSubmitComment={submitComment}
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

  return (
    <PostDetailView
      postId={postId}
      model={model}
      onClose={() => navigate(-1)}
    />
  );
}

export default PostDetailPage;
