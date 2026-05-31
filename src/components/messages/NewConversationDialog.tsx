import { useState } from "react";
import { getOrCreateConversation } from "../../services/messageService";
import type { ConversationSummary } from "../../types/message";

type Props = {
  onCreated: (conv: ConversationSummary) => void;
  onClose: () => void;
};

export default function NewConversationDialog({ onCreated, onClose }: Readonly<Props>) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    const target = username.trim().replace(/^@/, "");
    if (!target) return;
    setLoading(true);
    setError("");
    try {
      const conv = await getOrCreateConversation(target);
      onCreated(conv);
    } catch {
      setError("User not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      className="new-conv-dialog"
      open
      aria-label="Start new conversation"
    >
      {/* invisible backdrop to close on outside click */}
      <button
        type="button"
        className="new-conv-dialog__backdrop"
        onClick={onClose}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div className="new-conv-dialog__card">
        <h2 className="new-conv-dialog__title">New Message</h2>
        <input
          className="new-conv-dialog__input"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleStart(); }}
          autoFocus
        />
        {error && (
          <p className="new-conv-dialog__error">{error}</p>
        )}
        <div className="new-conv-dialog__actions">
          <button type="button" className="new-conv-dialog__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="new-conv-dialog__start"
            onClick={() => void handleStart()}
            disabled={!username.trim() || loading}
          >
            {loading ? "Starting…" : "Start Chat"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
