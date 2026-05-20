import { useEffect, useMemo, useState } from "react";
import type { MediaItem, Post, UpdatePostInput } from "../../types/social";

const EMPTY_ERROR = "A post must contain at least one image.";

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
    setLocalError(null);
  }, [isOpen, post.caption, post.postId, post.tags]);

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

  const handleSubmit = async () => {
    setLocalError(null);

    const deleteMediaIds = Array.from(removedIds);
    const remainingCount = mediaItems.length - deleteMediaIds.length + newFiles.length;
    if (remainingCount <= 0) {
      setLocalError(EMPTY_ERROR);
      return;
    }

    await onSubmit({
      postId: post.postId,
      caption,
      tags: parseTags(tagInput),
      deleteMediaIds,
      replaceMedia: [],
      newFiles,
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
