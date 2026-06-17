import { useEffect, useRef, useState } from "react";
import { getMyProfile, updateAccountSettings, uploadAvatar, getPostById } from "../services/socialService";
import { getErrorMessage } from "../utils/errorMessage";
import { OwnershipVerificationDialog } from "../components/ownership/OwnershipVerificationDialog";
import { ownershipVerificationService } from "../services/ownershipVerificationService";
import { Link } from "react-router-dom";
import type { Profile, Post } from "../types/social";
import type {
  OwnershipArtworkItem,
  OwnershipVerificationResponse,
} from "../services/ownershipVerificationService";

const MAX_DISPLAY_NAME = 25;
const MAX_BIO = 300;
const MAX_WEBSITE = 255;
const MAX_EMAIL = 100;

type ProfileFormState = {
  displayName: string;
  email: string;
  bio: string;
  website: string;
};

function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    displayName: "",
    email: "",
    bio: "",
    website: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showOwnershipDialog, setShowOwnershipDialog] = useState(false);
  const [ownershipVerifications, setOwnershipVerifications] = useState<OwnershipVerificationResponse[]>([]);
  const [ownershipLoading, setOwnershipLoading] = useState(false);
  const [verificationPosts, setVerificationPosts] = useState<Record<string, Post>>({});
  const [selectedVerification, setSelectedVerification] = useState<OwnershipVerificationResponse | null>(null);
  const [approvedArtworks, setApprovedArtworks] = useState<OwnershipArtworkItem[]>([]);
  const [selectedApprovedArtwork, setSelectedApprovedArtwork] = useState<OwnershipArtworkItem | null>(null);

  const refreshOwnershipVerifications = async () => {
    setOwnershipLoading(true);
    try {
      const data = await ownershipVerificationService.getUserOwnershipVerifications();
      setOwnershipVerifications(data);

      const artworkItems = await ownershipVerificationService.getApprovedOwnershipArtworksForCurrentUser();
      setApprovedArtworks(artworkItems);

      const postsMap: Record<string, Post> = {};
      for (const verification of data) {
        if (verification.postId) {
          try {
            const post = await getPostById(verification.postId);
            postsMap[verification.id] = post;
          } catch (postErr) {
            console.error(`Cannot load post ${verification.postId}:`, postErr);
          }
        }
      }
      setVerificationPosts(postsMap);
    } catch (err) {
      console.error("Cannot load ownership verifications", err);
    } finally {
      setOwnershipLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await getMyProfile();
        if (isMounted) {
          setProfile(response);
          setForm({
            displayName: response.displayName ?? "",
            email: response.email ?? "",
            bio: response.bio ?? "",
            website: response.website ?? "",
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError, "Cannot load your profile"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load ownership verifications
  useEffect(() => {
    void refreshOwnershipVerifications();
  }, []);

  const handleChange = (field: keyof ProfileFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleReset = () => {
    if (!profile) {
      return;
    }

    setForm({
      displayName: profile.displayName ?? "",
      email: profile.email ?? "",
      bio: profile.bio ?? "",
      website: profile.website ?? "",
    });
    setSuccessMessage(null);
    setError(null);
  };

  const submitForm = async () => {
    if (!form.displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await updateAccountSettings({
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        bio: form.bio.trim(),
        website: form.website.trim(),
      });
      setProfile(response);
      setForm({
        displayName: response.displayName ?? "",
        email: response.email ?? "",
        bio: response.bio ?? "",
        website: response.website ?? "",
      });
      setSuccessMessage("Profile updated.");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Cannot update profile"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await uploadAvatar(file);
      setProfile((prev) => (prev
        ? {
          ...prev,
          avatarUrl: response.avatarUrl,
          avatarPublicId: response.avatarPublicId,
        }
        : prev
      ));
      setSuccessMessage("Avatar updated.");
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, "Cannot upload avatar"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const displayName = profile?.displayName || profile?.username || "Your profile";
  const initial = displayName.charAt(0).toUpperCase();
  const email = profile?.email || "";
  const username = profile?.username || "";
  const sortedOwnershipVerifications = [...ownershipVerifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const selectedVerificationPost = selectedVerification?.postId
    ? verificationPosts[selectedVerification.id]
    : null;
  const metaLine = [username ? `@${username}` : null, email || null]
    .filter(Boolean)
    .join(" • ");

  return (
    <section className="profile-page">
      <div className="profile-page__container">
        <header className="profile-page__header">
          <div>
            <h2>Account settings</h2>
            <p>Update how your profile appears to others.</p>
          </div>
          {successMessage ? <span className="profile-status">{successMessage}</span> : null}
        </header>

        {error ? <div className="profile-alert profile-alert--error">{error}</div> : null}

        <div className="profile-grid">
          <section className="profile-card" aria-busy={isLoading}>
            <div className="profile-card__header">
              <div className="profile-avatar">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={displayName} />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div>
                <h3>{displayName}</h3>
                {metaLine ? <p>{metaLine}</p> : null}
              </div>
            </div>

            <div className="profile-card__actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => void handleAvatarChange(event)}
                className="profile-file-input"
                aria-label="Upload new avatar"
              />
              <button type="button" className="profile-button profile-button--ghost" onClick={handleAvatarClick} disabled={isUploading}>
                {isUploading ? "Uploading..." : "Change avatar"}
              </button>
            </div>

            <div className="profile-card__note">
              <strong>Tip</strong>
              <span>Use a square image at least 400x400 px for best results.</span>
            </div>
          </section>

          <form
            className="profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitForm().catch(() => undefined);
            }}
          >
            <label className="profile-field">
              <span>Display name</span>
              <input
                value={form.displayName}
                onChange={handleChange("displayName")}
                maxLength={MAX_DISPLAY_NAME}
                placeholder="Your name"
                required
                disabled={isLoading}
              />
              <em>{form.displayName.length}/{MAX_DISPLAY_NAME}</em>
            </label>

            <label className="profile-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                maxLength={MAX_EMAIL}
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
              <em>{form.email.length}/{MAX_EMAIL}</em>
            </label>

            <label className="profile-field">
              <span>Bio</span>
              <textarea
                rows={4}
                value={form.bio}
                onChange={handleChange("bio")}
                maxLength={MAX_BIO}
                placeholder="Tell people about your creative focus"
                disabled={isLoading}
              />
              <em>{form.bio.length}/{MAX_BIO}</em>
            </label>

            <label className="profile-field">
              <span>Website</span>
              <input
                value={form.website}
                onChange={handleChange("website")}
                maxLength={MAX_WEBSITE}
                placeholder="https://"
                disabled={isLoading}
              />
              <em>{form.website.length}/{MAX_WEBSITE}</em>
            </label>

            <div className="profile-form__footer">
              <button
                type="button"
                className="profile-button profile-button--ghost"
                onClick={handleReset}
                disabled={isLoading || isSaving}
              >
                Reset
              </button>
              <button
                type="submit"
                className="profile-button"
                disabled={isLoading || isSaving}
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Ownership Verification Section - Featured */}
        <section className="profile-ownership-section">
          <div className="profile-ownership-section__header">
            <div className="profile-ownership-section__icon">🛡️</div>
            <div>
              <h3>Ownership Verification</h3>
              <p className="profile-ownership-section__subtitle">Verify ownership of your artworks to prevent copyright violations</p>
            </div>
          </div>

          {sortedOwnershipVerifications.length > 0 ? (
            <div className="profile-verifications">
              {sortedOwnershipVerifications.map((verification) => {
                const post = verification.postId ? verificationPosts[verification.id] : null;
                return (
                  <button
                    type="button"
                    key={verification.id}
                    className={`verification-item verification-item--${verification.status.toLowerCase()} verification-item--interactive`}
                    onClick={() => setSelectedVerification(verification)}
                    aria-label={`View details for ownership verification ${verification.id}`}
                  >
                    <div className="verification-item__header">
                      <strong>{verification.status}</strong>
                      <span className="verification-item__date">{new Date(verification.createdAt).toLocaleDateString()}</span>
                    </div>

                    <p className="verification-item__hint">Click to view full details</p>

                    {/* Post Details */}
                    {post && (
                      <div className="verification-item__post-link" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="verification-item__post">
                          {post.media && post.media.length > 0 && (
                            <img 
                              src={post.media[0].thumbnailUrl || post.media[0].originalUrl} 
                              alt={post.caption || "Artwork"}
                              className="verification-item__post-thumbnail"
                              style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          )}
                          <div className="verification-item__post-info">
                            <strong>{post.caption || "Untitled Artwork"}</strong>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="verification-item__file-count">
                      Supporting files: {verification.mediaFiles.length}
                    </p>

                    {verification.status === "REJECTED" && verification.rejectionReason && (
                      <p className="verification-item__reason">Reason: {verification.rejectionReason}</p>
                    )}
                    {verification.adminNotes && (
                      <p className="verification-item__notes">Notes: {verification.adminNotes}</p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="profile-card__note">No ownership verifications yet</p>
          )}

          <div className="profile-card__actions">
            <button
              type="button"
              className="profile-button"
              onClick={() => setShowOwnershipDialog(true)}
              disabled={ownershipLoading}
            >
              {ownershipLoading ? "Loading..." : "Submit New Verification"}
            </button>
          </div>

          <div style={{ marginTop: 20 }}>
            <h4 style={{ marginBottom: 8 }}>My Approved Copyright Artworks</h4>
            {approvedArtworks.length === 0 ? (
              <p className="profile-card__note">No approved artworks yet.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 10,
                }}
              >
                {approvedArtworks.map((artwork) => (
                  <button
                    key={artwork.mediaId}
                    type="button"
                    onClick={() => setSelectedApprovedArtwork(artwork)}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#fff",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <img
                      src={artwork.mediaUrl}
                      alt={artwork.fileName || "Approved artwork"}
                      style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Ownership Verification Dialog */}
      <OwnershipVerificationDialog
        open={showOwnershipDialog}
        onClose={() => setShowOwnershipDialog(false)}
        onSuccess={() => {
          setShowOwnershipDialog(false);
          setSuccessMessage("Ownership verification submitted successfully!");
          void refreshOwnershipVerifications();
        }}
      />

      {selectedVerification && (
        <div className="verification-detail-backdrop">
          <div className="verification-detail-modal">
            <div className="verification-detail-modal__header">
              <div>
                <h4>Verification details</h4>
                <p>Submitted on {new Date(selectedVerification.createdAt).toLocaleString()}</p>
              </div>
              <button
                type="button"
                className="verification-detail-modal__close"
                onClick={() => setSelectedVerification(null)}
              >
                Close
              </button>
            </div>

            <div className="verification-detail-modal__status-row">
              <span className={`verification-status-pill verification-status-pill--${selectedVerification.status.toLowerCase()}`}>
                {selectedVerification.status}
              </span>
              {selectedVerification.reviewedAt && (
                <span className="verification-detail-modal__review-time">
                  Reviewed: {new Date(selectedVerification.reviewedAt).toLocaleString()}
                </span>
              )}
            </div>

            <div className="verification-detail-modal__grid">
              <div>
                <h5>Identity</h5>
                <p><strong>Full name:</strong> {selectedVerification.fullName}</p>
                <p><strong>Date of birth:</strong> {new Date(selectedVerification.dateOfBirth).toLocaleDateString()}</p>
                <p><strong>Document:</strong> {selectedVerification.identityDocumentType}</p>
                <p><strong>Document number:</strong> {selectedVerification.identityDocumentNumber}</p>
                <p><strong>Country:</strong> {selectedVerification.countryCode}</p>
              </div>

              <div>
                <h5>Review result</h5>
                {selectedVerification.status === "PENDING" && (
                  <p>This verification is waiting for admin review.</p>
                )}
                {selectedVerification.status === "APPROVED" && (
                  <p>This verification has been approved.</p>
                )}
                {selectedVerification.status === "REJECTED" && (
                  <>
                    <p><strong>Reason:</strong> {selectedVerification.rejectionReason || "Not specified"}</p>
                    <p><strong>Admin notes:</strong> {selectedVerification.adminNotes || "No notes"}</p>
                  </>
                )}
                {selectedVerification.reviewedByAdminName && (
                  <p><strong>Reviewed by:</strong> {selectedVerification.reviewedByAdminName}</p>
                )}
              </div>
            </div>

            {selectedVerificationPost && (
              <div className="verification-detail-modal__post-block">
                <h5>Linked artwork</h5>
                <Link to={`/posts/${selectedVerificationPost.postId}`}>
                  Open related post
                </Link>
              </div>
            )}

            <div className="verification-detail-modal__media">
              <h5>Uploaded proofs ({selectedVerification.mediaFiles.length})</h5>
              {selectedVerification.mediaFiles.length === 0 ? (
                <p>No files uploaded.</p>
              ) : (
                <div className="verification-media-grid">
                  {selectedVerification.mediaFiles
                    .slice()
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((media) => (
                      <a
                        key={media.id}
                        className="verification-media-item"
                        href={media.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {media.mediaType === "IMAGE" ? (
                          <img src={media.mediaUrl} alt={media.fileName} />
                        ) : (
                          <div className="verification-media-item__pdf">PDF</div>
                        )}
                        <span>{media.fileName}</span>
                      </a>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedApprovedArtwork && (
        <div className="verification-detail-backdrop">
          <div className="verification-detail-modal">
            <div className="verification-detail-modal__header">
              <div>
                <h4>Approved artwork details</h4>
                <p>Registered at {new Date(selectedApprovedArtwork.createdAt).toLocaleString()}</p>
              </div>
              <button
                type="button"
                className="verification-detail-modal__close"
                onClick={() => setSelectedApprovedArtwork(null)}
              >
                Close
              </button>
            </div>

            <div className="verification-detail-modal__media">
              <img
                src={selectedApprovedArtwork.mediaUrl}
                alt={selectedApprovedArtwork.fileName || "Approved artwork"}
                style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 10, background: "#f8fafc" }}
              />
              <p><strong>Verification ID:</strong> {selectedApprovedArtwork.verificationId}</p>
              <p><strong>Media ID:</strong> {selectedApprovedArtwork.mediaId}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProfilePage;
