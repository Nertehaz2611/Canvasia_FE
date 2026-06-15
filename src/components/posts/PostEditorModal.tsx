import { useEffect, useMemo, useState } from "react";
import { searchFollowers } from "../../services/socialService";
import type { FollowUserItem, MediaItem, Post, PostVisibility, UpdatePostInput } from "../../types/social";
import { compressImageFiles } from "../../utils/imageCompression";

const EMPTY_ERROR = "A post must contain at least one image.";

const AUDIENCE_OPTIONS: Array<{ value: PostVisibility; label: string }> = [
  { value: "PUBLIC", label: "All" },
  { value: "FOLLOWERS", label: "Followers only" },
  { value: "SELECTED_USERS", label: "Selected users" },
  { value: "ONLY_ME", label: "Only me" },
];

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

type PostEditorModalProps = {
  isOpen: boolean;
  post: Post;
  isBusy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: UpdatePostInput) => Promise<void>;
};

function PostEditorModal({
  isOpen,
  post,
  isBusy,
  error,
  onClose,
  onSubmit,
}: Readonly<PostEditorModalProps>) {
  const [caption, setCaption] = useState(post.caption || "");
  const [tagInput, setTagInput] = useState(post.tags.join(", "));
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [visibility, setVisibility] = useState<PostVisibility>(post.visibility || "PUBLIC");
  const [selectedAudienceUsers, setSelectedAudienceUsers] = useState<FollowUserItem[]>(post.allowedViewers.map((item) => ({
    userId: item.userId,
    username: item.username,
    displayName: item.displayName,
    avatarUrl: item.avatarUrl,
  })));
  const [audienceQuery, setAudienceQuery] = useState("");
  const [audienceSearchResults, setAudienceSearchResults] = useState<FollowUserItem[]>([]);
  const [audienceSearchLoading, setAudienceSearchLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const mediaItems = useMemo(() => post.media ?? [], [post.media]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCaption(post.caption || "");
    setTagInput(post.tags.join(", "));
    setRemovedIds(new Set());
    setNewFiles([]);
    setNewFilePreviews([]);
    setVisibility(post.visibility || "PUBLIC");
    setSelectedAudienceUsers(post.allowedViewers.map((item) => ({
      userId: item.userId,
      username: item.username,
      displayName: item.displayName,
      avatarUrl: item.avatarUrl,
    })));
    setAudienceQuery("");
    setAudienceSearchResults([]);
    setAudienceSearchLoading(false);
    setLocalError(null);
  }, [isOpen, post.allowedViewers, post.caption, post.postId, post.tags, post.visibility]);

  useEffect(() => {
    if (!isOpen || visibility !== "SELECTED_USERS") {
      setAudienceSearchResults([]);
      setAudienceSearchLoading(false);
      return;
    }

    const trimmedQuery = audienceQuery.trim();
    if (!trimmedQuery) {
      setAudienceSearchResults([]);
      setAudienceSearchLoading(false);
      return;
    }

    let active = true;
    const timer = globalThis.setTimeout(async () => {
      setAudienceSearchLoading(true);
      try {
        const response = await searchFollowers(post.username, trimmedQuery, 0, 12);
        if (!active) return;
        const selectedIds = new Set(selectedAudienceUsers.map((item) => item.userId));
        setAudienceSearchResults(response.items.filter((item) => !selectedIds.has(item.userId)));
      } catch {
        if (active) {
          setAudienceSearchResults([]);
        }
      } finally {
        if (active) {
          setAudienceSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      globalThis.clearTimeout(timer);
    };
  }, [audienceQuery, isOpen, post.username, selectedAudienceUsers, visibility]);

  useEffect(() => {
    if (newFiles.length === 0) {
      setNewFilePreviews([]);
      return;
    }

    const nextPreviews = newFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setNewFilePreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [newFiles]);

  if (!isOpen) {
    return null;
  }

  const toggleRemove = (mediaId: string) => {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(mediaId)) {
        next.delete(mediaId);
      } else {
        next.add(mediaId);
      }
      return next;
    });
  };

  const clearNewFiles = () => {
    setNewFiles([]);
  };

  const addSelectedAudienceUser = (user: FollowUserItem) => {
    setSelectedAudienceUsers((prev) => {
      if (prev.some((item) => item.userId === user.userId)) {
        return prev;
      }
      return [...prev, user];
    });
    setAudienceQuery("");
    setAudienceSearchResults([]);
  };

  const removeSelectedAudienceUser = (userId: string) => {
    setSelectedAudienceUsers((prev) => prev.filter((item) => item.userId !== userId));
  };

  const handleSubmit = async () => {
    setLocalError(null);

    const deleteMediaIds = Array.from(removedIds);
    const remainingCount = mediaItems.length - deleteMediaIds.length + newFiles.length;
    if (remainingCount <= 0) {
      setLocalError(EMPTY_ERROR);
      return;
    }

    if (visibility === "SELECTED_USERS" && selectedAudienceUsers.length === 0) {
      setLocalError("Please select at least one follower for selected audience.");
      return;
    }

    const optimizedFiles = await compressImageFiles(newFiles);
    await onSubmit({
      postId: post.postId,
      caption,
      tags: parseTags(tagInput),
      deleteMediaIds,
      replaceMedia: [],
      newFiles: optimizedFiles,
      visibility,
      allowedViewerUserIds: selectedAudienceUsers.map((item) => item.userId),
    });
  };

  const renderMediaPreview = (media: MediaItem) => {
    const isRemoved = removedIds.has(media.mediaId);
    const previewUrl = media.thumbnailUrl || media.originalUrl;
    const removeLabel = isRemoved ? "Undo remove media" : "Remove media";
    const removeClass = isRemoved
      ? "post-editor__media-remove post-editor__media-remove--active"
      : "post-editor__media-remove";

    return (
      <div key={media.mediaId} className={isRemoved ? "post-editor__media post-editor__media--removed" : "post-editor__media"}>
        <button
          type="button"
          className={removeClass}
          aria-label={removeLabel}
          onClick={() => toggleRemove(media.mediaId)}
        >
          x
        </button>
        <img src={previewUrl} alt="Post media" />
      </div>
    );
  };

  const shouldShowFollowerChoices = visibility === "SELECTED_USERS";

  return (
    <dialog className="post-editor" open>
      <button type="button" className="post-editor__backdrop" aria-label="Close editor" onClick={onClose} />
      <div className="post-editor__card">
        <div className="post-editor__header">
          <h3>Edit post</h3>
          <button type="button" className="post-editor__close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="post-editor__body">
          <label className="post-editor__field">
            <span>Caption</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={4}
              placeholder="Update your caption"
            />
          </label>

          <label className="post-editor__field">
            <span>Tags (comma separated)</span>
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="#painting, #study"
            />
          </label>

          <label className="post-editor__field">
            <span>Who can view this post?</span>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as PostVisibility)}
            >
              {AUDIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          {shouldShowFollowerChoices ? (
            <div className="post-editor__audience-list">
              <div className="post-editor__audience-selected">
                {selectedAudienceUsers.map((item) => (
                  <div key={item.userId} className="post-editor__audience-chip">
                    <div className="post-editor__audience-avatar" aria-hidden="true">
                      {item.avatarUrl ? (
                        <img src={item.avatarUrl} alt={item.displayName || item.username} />
                      ) : (
                        <span>{(item.displayName || item.username || "U").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span>{item.displayName || item.username}</span>
                    <button
                      type="button"
                      className="post-editor__audience-remove"
                      aria-label={`Remove ${item.displayName || item.username}`}
                      onClick={() => removeSelectedAudienceUser(item.userId)}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>

              <input
                value={audienceQuery}
                onChange={(event) => setAudienceQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                  }
                }}
                placeholder="Search follower by display name or username"
                className="post-editor__audience-search"
              />

              {audienceSearchLoading ? <p>Searching followers...</p> : null}
              {!audienceSearchLoading && audienceQuery.trim() && audienceSearchResults.length === 0 ? (
                <p>No matching followers found.</p>
              ) : null}
              {audienceSearchLoading ? null : audienceSearchResults.map((item) => (
                <button
                  key={item.userId}
                  type="button"
                  className="post-editor__audience-result"
                  onClick={() => addSelectedAudienceUser(item)}
                >
                  <div className="post-editor__audience-avatar" aria-hidden="true">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt={item.displayName || item.username} />
                    ) : (
                      <span>{(item.displayName || item.username || "U").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <strong>{item.displayName || item.username}</strong>
                    <small>@{item.username}</small>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          <div className="post-editor__section">
            <h4>Current media</h4>
            <div className="post-editor__media-grid">
              {mediaItems.map(renderMediaPreview)}
            </div>
          </div>

          <div className="post-editor__section">
            <h4>Add new media</h4>
            <div className="post-editor__upload">
              <label className="post-editor__upload-button">
                <span>Add files</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setNewFiles(Array.from(event.target.files ?? []))}
                />
              </label>
              {newFiles.length ? (
                <div className="post-editor__upload-meta">
                  <span>{newFiles.length} new files</span>
                  <button type="button" onClick={clearNewFiles}>Clear</button>
                </div>
              ) : (
                <span className="post-editor__upload-hint">No new files selected.</span>
              )}
            </div>
            {newFilePreviews.length ? (
              <div className="post-editor__media-grid">
                {newFilePreviews.map((preview, index) => (
                  <div key={`${preview.file.name}-${index}`} className="post-editor__media">
                    <img src={preview.url} alt={`New upload ${preview.file.name}`} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {localError ? <div className="post-editor__alert">{localError}</div> : null}
          {error ? <div className="post-editor__alert">{error}</div> : null}
        </div>

        <div className="post-editor__footer">
          <button type="button" className="post-editor__ghost" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button type="button" className="post-editor__primary" onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default PostEditorModal;
