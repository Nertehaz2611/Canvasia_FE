import { useEffect, useRef, useState } from "react";
import { getMyProfile, updateAccountSettings, uploadAvatar } from "../services/socialService";
import { getErrorMessage } from "../utils/errorMessage";
import type { Profile } from "../types/social";

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
      </div>
    </section>
  );
}

export default ProfilePage;
