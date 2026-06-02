import { useEffect, useState } from "react";
import { getMyProfile } from "../services/socialService";
import type { Profile } from "../types/social";

export function useTopbarProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const currentProfile = await getMyProfile();
        if (isMounted) {
          setProfile(currentProfile);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = profile?.displayName || profile?.username || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const homePath = profile?.username ? `/${profile.username}` : "/home";

  return { profile, displayName, initial, homePath };
}