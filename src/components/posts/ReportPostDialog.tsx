import { useState } from "react";
import { reportPost } from "../../services/socialService";
import { getErrorMessage } from "../../utils/errorMessage";
import type { ReportPostInput } from "../../types/social";

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "TRACED_OR_STOLEN_ARTWORKS", label: "Traced or stolen artworks" },
  { value: "ENGAGING_IN_HARASSMENT", label: "Engaging in harassment" },
  { value: "NUDITY_OR_SEXUAL_CONTENT", label: "Nudity or sexual content" },
  { value: "THREATENING_VIOLENCE", label: "Threatening violence or physical harm" },
  { value: "SUICIDE_OR_SELF_HARM", label: "Encouraging or contemplating suicide or self-harm" },
  { value: "RACISM", label: "Racism" },
];

type ReportPostDialogProps = {
  postId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

function ReportPostDialog({ postId, onClose, onSuccess }: Readonly<ReportPostDialogProps>) {
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set());
  const [otherReason, setOtherReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const toggleReason = (value: string) => {
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const canSubmit = selectedReasons.size > 0 || otherReason.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    const input: ReportPostInput = {
      postId,
      reasons: Array.from(selectedReasons),
      otherReason: otherReason.trim() || undefined,
    };
    try {
      await reportPost(input);
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to submit report. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog className="post-detail__confirm report-dialog" open>
      <button
        type="button"
        className="post-detail__confirm-backdrop"
        aria-label="Close report dialog"
        onClick={onClose}
      />
      <div className="post-detail__confirm-card report-dialog__card">
        {submitted ? (
          <>
            <h3>Report submitted</h3>
            <p>Thank you for your report. We will review it shortly.</p>
            <div className="post-detail__confirm-actions">
              <button type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>Report post</h3>
            <p>Select the reason(s) for reporting this post.</p>
            <div className="report-dialog__reasons">
              {REPORT_REASONS.map((reason) => (
                <label key={reason.value} className="report-dialog__reason-item">
                  <input
                    type="checkbox"
                    checked={selectedReasons.has(reason.value)}
                    onChange={() => toggleReason(reason.value)}
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
              <div className="report-dialog__other">
                <label className="report-dialog__other-label" htmlFor="report-other">
                  Other reason
                </label>
                <textarea
                  id="report-other"
                  className="report-dialog__other-input"
                  placeholder="Describe the issue..."
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
            {error ? <div className="post-detail__confirm-error">{error}</div> : null}
            <div className="post-detail__confirm-actions">
              <button type="button" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className="post-detail__confirm-danger"
                onClick={() => void handleSubmit()}
                disabled={!canSubmit || busy}
              >
                {busy ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

export default ReportPostDialog;
