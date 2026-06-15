import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type SyntheticEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import PostCardMedia from "../components/posts/PostCardMedia";
import FlagWarningBanner from "../components/posts/FlagWarningBanner";
import PostEditorModal from "../components/posts/PostEditorModal";
import ReportPostDialog from "../components/posts/ReportPostDialog";
import {
  createPost,
  deletePost,
  getLatestDiscussions,
  getLatestHashtags,
  getMyProfile,
  getFollowers,
  searchFollowers,
  getFollowing,
  getPendingPosts,
  getUserProfile,
  getUserPosts,
  followUser,
  likePost,
  unfollowUser,
  updatePost,
  unlikePost,
  savePost,
  unsavePost,
  getSavedPosts,
  getMyPortfolios,
  getPortfoliosByUsername,
  createPortfolio,
  deletePortfolio,
  addMediaToPortfolio,
  removeMediaFromPortfolio,
  getUserMedia,
  getPortfolioMedia,
} from "../services/socialService";
import { getOrCreateConversation } from "../services/messageService";
import { getErrorMessage } from "../utils/errorMessage";
import { compressImageFiles } from "../utils/imageCompression";
import type {
  FollowUserItem,
  LatestDiscussionItem,
  MediaListItem,
  PostVisibility,
  Portfolio,
  Post,
  Profile,
  UpdatePostInput,
} from "../types/social";

type HomeTab = "posts" | "saved" | "media" | "portfolio" | "pending";

const DEFAULT_PAGE_SIZE = 6;

function formatDate(iso: string): string {
  const parsedDate = new Date(iso);
  return Number.isNaN(parsedDate.getTime()) ? iso : parsedDate.toLocaleDateString();
}

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

function getPostVisibilityLabel(post: Post): string {
  switch (post.visibility) {
    case "FOLLOWERS":
      return "Followers only";
    case "SELECTED_USERS":
      return `Selected users (${post.allowedViewers.length})`;
    case "ONLY_ME":
      return "Only me";
    case "PUBLIC":
    default:
      return "All";
  }
}

const POST_AUDIENCE_OPTIONS: Array<{ value: PostVisibility; label: string }> = [
  { value: "PUBLIC", label: "All" },
  { value: "FOLLOWERS", label: "Followers only" },
  { value: "SELECTED_USERS", label: "Selected users" },
  { value: "ONLY_ME", label: "Only me" },
];

// eslint-disable-next-line sonarjs/cognitive-complexity
function HomePage() {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<HomeTab>("posts");
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [viewerLoading, setViewerLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [followListOpen, setFollowListOpen] = useState<"followers" | "following" | null>(null);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followListError, setFollowListError] = useState<string | null>(null);
  const [followListItems, setFollowListItems] = useState<FollowUserItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingHasNext, setPendingHasNext] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const lastPendingIdsRef = useRef<Set<string>>(new Set());
  const pendingKeyRef = useRef<string>("");
  const [latestDiscussions, setLatestDiscussions] = useState<LatestDiscussionItem[]>([]);
  const [latestHashtags, setLatestHashtags] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [postVisibility, setPostVisibility] = useState<PostVisibility>("PUBLIC");
  const [selectedAudienceUsers, setSelectedAudienceUsers] = useState<FollowUserItem[]>([]);
  const [audienceQuery, setAudienceQuery] = useState("");
  const [audienceSearchResults, setAudienceSearchResults] = useState<FollowUserItem[]>([]);
  const [audienceSearchLoading, setAudienceSearchLoading] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [composerSuccess, setComposerSuccess] = useState<string | null>(null);
  const [composerBusy, setComposerBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [messageBusy, setMessageBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<Post | null>(null);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedPage, setSavedPage] = useState(0);
  const [savedHasNext, setSavedHasNext] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; out: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // portfolio state
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(false);
  const [portfoliosError, setPortfoliosError] = useState<string | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [portfolioMedia, setPortfolioMedia] = useState<MediaListItem[]>([]);
  const [portfolioMediaLoading, setPortfolioMediaLoading] = useState(false);
  const [portfolioMediaError, setPortfolioMediaError] = useState<string | null>(null);
  const [createPortfolioOpen, setCreatePortfolioOpen] = useState(false);
  const [createPortfolioName, setCreatePortfolioName] = useState("");
  const [createPortfolioBusy, setCreatePortfolioBusy] = useState(false);
  const [createPortfolioError, setCreatePortfolioError] = useState<string | null>(null);
  const [deletePortfolioTarget, setDeletePortfolioTarget] = useState<Portfolio | null>(null);
  const [deletePortfolioBusy, setDeletePortfolioBusy] = useState(false);
  const [addMediaOpen, setAddMediaOpen] = useState(false);
  const [userMediaForPicker, setUserMediaForPicker] = useState<MediaListItem[]>([]);
  const [userMediaPickerLoading, setUserMediaPickerLoading] = useState(false);
  const [portfolioMediaIds, setPortfolioMediaIds] = useState<Set<string>>(new Set());
  const [mediaToggleBusy, setMediaToggleBusy] = useState<Set<string>>(new Set());

  const displayName = profile?.displayName || profile?.username || "Your profile";
  const initial = displayName.charAt(0).toUpperCase();
  const usernameLabel = profile?.username ? `@${profile.username}` : "@user";
  const websiteLabel = profile?.website?.trim();
  const bio = profile?.bio?.trim() || "Share what you are creating and build your portfolio.";
  const isOwnProfile = !!viewerProfile?.username && profile?.username === viewerProfile.username;
  const followerCount = profile?.followerCount ?? 0;
  const followingCount = profile?.followingCount ?? 0;
  let followLabel = "Follow";
  if (followBusy) {
    followLabel = "Updating...";
  } else if (profile?.isFollowing) {
    followLabel = "Unfollow";
  }

  useEffect(() => {
    let isMounted = true;

    const loadViewerProfile = async () => {
      setViewerLoading(true);
      setProfileError(null);

      try {
        const response = await getMyProfile();
        if (isMounted) {
          setViewerProfile(response);
        }
      } catch (error) {
        if (isMounted) {
          setProfileError(getErrorMessage(error, "Cannot load profile"));
        }
      } finally {
        if (isMounted) {
          setViewerLoading(false);
        }
      }
    };

    void loadViewerProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!viewerProfile?.username) {
      return;
    }

    if (!routeUsername) {
      navigate(`/${viewerProfile.username}`, { replace: true });
    }
  }, [navigate, routeUsername, viewerProfile?.username]);

  useEffect(() => {
    let isMounted = true;

    const loadTargetProfile = async () => {
      if (!viewerProfile?.username) {
        return;
      }

      setProfileLoading(true);
      setProfileError(null);

      try {
        if (!routeUsername || routeUsername === viewerProfile.username) {
          if (isMounted) {
            setProfile(viewerProfile);
          }
        } else {
          const response = await getUserProfile(routeUsername);
          if (isMounted) {
            setProfile(response);
          }
        }
      } catch (error) {
        if (isMounted) {
          setProfileError(getErrorMessage(error, "Cannot load profile"));
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    void loadTargetProfile();

    return () => {
      isMounted = false;
    };
  }, [routeUsername, viewerProfile]);

  const loadPosts = async (targetPage = 0, replace = false) => {
    if (!profile?.username) {
      return;
    }

    setPostsLoading(true);
    setPostsError(null);

    try {
      const response = await getUserPosts(profile.username, targetPage, DEFAULT_PAGE_SIZE);
      setPosts((prev) => (replace ? response.items : [...prev, ...response.items]));
      setPage(response.page);
      setHasNext(response.hasNext);
    } catch (error) {
      setPostsError(getErrorMessage(error, "Cannot load your posts"));
    } finally {
      setPostsLoading(false);
    }
  };

  const loadPendingPosts = async (targetPage = 0, replace = false) => {
    if (!isOwnProfile) {
      return;
    }

    setPendingLoading(true);
    setPendingError(null);

    try {
      const response = await getPendingPosts(targetPage, DEFAULT_PAGE_SIZE);
      setPendingPosts((prev) => (replace ? response.items : [...prev, ...response.items]));
      setPendingPage(response.page);
      setPendingHasNext(response.hasNext);
    } catch (error) {
      setPendingError(getErrorMessage(error, "Cannot load pending posts"));
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.username) {
      return;
    }

    void loadPosts(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.username]);

  useEffect(() => {
    if (!profile?.username || !isOwnProfile || activeTab !== "saved") {
      return;
    }
    void loadSavedPosts(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isOwnProfile, profile?.username]);

  useEffect(() => {
    if (!profile?.username || !isOwnProfile || activeTab !== "pending") {
      return;
    }

    void loadPendingPosts(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isOwnProfile, profile?.username]);

  useEffect(() => {
    if (activeTab === "pending") {
      setPendingNotice(null);
    }
  }, [activeTab]);

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
            .map((tag) => normalizeTag(tag))
            .filter(Boolean)
            .slice(0, 5)
        );
      } catch {
        setLatestDiscussions([]);
        setLatestHashtags([]);
      }
    };

    void loadSidebar();
  }, []);

  useEffect(() => {
    if (mediaFiles.length === 0) {
      setMediaPreviews([]);
      return;
    }

    const nextPreviews = mediaFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setMediaPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [mediaFiles]);

  // load portfolios when portfolio tab becomes active
  useEffect(() => {
    if (activeTab !== "portfolio" || !profile?.username) {
      return;
    }

    let isMounted = true;
    setPortfoliosLoading(true);
    setPortfoliosError(null);

    const load = async () => {
      try {
        const list = isOwnProfile
          ? await getMyPortfolios()
          : await getPortfoliosByUsername(profile.username);
        if (isMounted) {
          setPortfolios(list);
          setSelectedPortfolio((prev) => (prev ? null : prev));
          setPortfolioMedia((prev) => (prev.length === 0 ? prev : []));
        }
      } catch (err) {
        if (isMounted) {
          setPortfoliosError(getErrorMessage(err, "Cannot load portfolios"));
        }
      } finally {
        if (isMounted) {
          setPortfoliosLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, profile?.username, isOwnProfile]);

  // load media for the selected portfolio
  useEffect(() => {
    if (!selectedPortfolio) {
      setPortfolioMedia((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    let isMounted = true;
    setPortfolioMediaLoading(true);
    setPortfolioMediaError(null);

    const load = async () => {
      try {
        const result = await getPortfolioMedia(selectedPortfolio.portfolioId);
        if (isMounted) {
          setPortfolioMedia(result.items);
          setPortfolioMediaIds(new Set(result.items.map((m) => m.mediaId)));
        }
      } catch (err) {
        if (isMounted) {
          setPortfolioMediaError(getErrorMessage(err, "Cannot load portfolio media"));
        }
      } finally {
        if (isMounted) {
          setPortfolioMediaLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [selectedPortfolio]);

  const mediaItems = useMemo(() => (
    posts.flatMap((post) => post.media.map((media) => ({
      postId: post.postId,
      mediaId: media.mediaId,
      url: media.thumbnailUrl || media.originalUrl,
      caption: post.caption,
    })))
  ), [posts]);

  useEffect(() => {
    if (!isOwnProfile && activeTab === "pending") {
      setActiveTab("posts");
    }
  }, [activeTab, isOwnProfile]);

  const refreshPending = useCallback(async () => {
    if (!isOwnProfile) {
      return;
    }

    try {
      const response = await getPendingPosts(0, DEFAULT_PAGE_SIZE);
      const pendingIds = new Set(response.items.map((item) => item.postId));
      const pendingKey = Array.from(pendingIds).sort((a, b) => a.localeCompare(b)).join(",");
      const previousIds = lastPendingIdsRef.current;
      const newPending = response.items.some((item) => !previousIds.has(item.postId));

      let dismissedKey = "";
      try {
        dismissedKey = localStorage.getItem("canvasia.pending.dismissed") ?? "";
      } catch {
        dismissedKey = "";
      }

      if (newPending && pendingKey && pendingKey != dismissedKey) {
        setPendingNotice("Some posts were flagged and moved to Pending.");
      }

      lastPendingIdsRef.current = pendingIds;
      pendingKeyRef.current = pendingKey;
      setPendingPosts(response.items);
      setPendingPage(response.page);
      setPendingHasNext(response.hasNext);
      setPosts((prev) => prev.filter((item) => !pendingIds.has(item.postId)));
    } catch {
      setPendingError("Cannot load pending posts");
    }
  }, [isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile || !profile?.username) {
      setSelectedAudienceUsers((prev) => (prev.length === 0 ? prev : []));
      setAudienceQuery((prev) => (prev === "" ? prev : ""));
      setAudienceSearchResults((prev) => (prev.length === 0 ? prev : []));
      setAudienceSearchLoading((prev) => (prev ? false : prev));
      return;
    }

    if (postVisibility !== "SELECTED_USERS") {
      setAudienceSearchResults((prev) => (prev.length === 0 ? prev : []));
      setAudienceSearchLoading((prev) => (prev ? false : prev));
      return;
    }

    const trimmedQuery = audienceQuery.trim();
    if (!trimmedQuery) {
      setAudienceSearchResults((prev) => (prev.length === 0 ? prev : []));
      setAudienceSearchLoading((prev) => (prev ? false : prev));
      return;
    }

    let active = true;
    const timer = globalThis.setTimeout(async () => {
      setAudienceSearchLoading(true);
      try {
        const response = await searchFollowers(profile.username, trimmedQuery, 0, 12);
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
  }, [audienceQuery, isOwnProfile, postVisibility, profile?.username, selectedAudienceUsers]);

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

  useEffect(() => {
    if (!isOwnProfile) {
      return;
    }

    void refreshPending();
    const intervalId = globalThis.setInterval(() => {
      void refreshPending();
    }, 30000);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [isOwnProfile, refreshPending]);

  const submitPost = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!viewerProfile?.username) {
      return;
    }

    if (mediaFiles.length === 0) {
      setComposerError("Please add at least one image.");
      setComposerSuccess(null);
      return;
    }

    if (postVisibility === "SELECTED_USERS" && selectedAudienceUsers.length === 0) {
      setComposerError("Please select at least one follower for selected audience.");
      setComposerSuccess(null);
      return;
    }

    setComposerBusy(true);
    setComposerError(null);
    setComposerSuccess(null);

    try {
      const optimizedFiles = await compressImageFiles(mediaFiles);
      await createPost({
        caption: caption.trim(),
        tags: parseTags(tagInput),
        mediaFiles: optimizedFiles,
        visibility: postVisibility,
        allowedViewerUserIds: selectedAudienceUsers.map((item) => item.userId),
      });
      setCaption("");
      setTagInput("");
      setMediaFiles([]);
      setMediaPreviews([]);
      setPostVisibility("PUBLIC");
      setSelectedAudienceUsers([]);
      setAudienceQuery("");
      setAudienceSearchResults([]);
      setComposerSuccess("Post published.");
      await loadPosts(0, true);
    } catch (error) {
      setComposerError(getErrorMessage(error, "Cannot create post"));
    } finally {
      setComposerBusy(false);
    }
  };

  const toggleLike = async (post: Post) => {
    try {
      const response = post.likedByMe ? await unlikePost(post.postId) : await likePost(post.postId);
      setPosts((prev) => prev.map((item) => (
        item.postId === post.postId
          ? { ...item, likedByMe: response.likedByMe, likeCount: response.likeCount }
          : item
      )));
    } catch (error) {
      setPostsError(getErrorMessage(error, "Cannot update like right now."));
    }
  };

  const toggleSave = async (post: Post, updateList: "posts" | "saved") => {
    if (saveBusy.has(post.postId)) return;
    setSaveBusy((prev) => new Set(prev).add(post.postId));
    const wasSaved = post.savedByMe;
    const updater = (prev: Post[]) =>
      prev.map((p) => p.postId === post.postId ? { ...p, savedByMe: !wasSaved } : p);
    // Update both lists optimistically so they stay in sync
    setPosts(updater);
    setSavedPosts(updater);
    try {
      if (wasSaved) {
        await unsavePost(post.postId);
        if (updateList === "saved") setSavedPosts((prev) => prev.filter((p) => p.postId !== post.postId));
        showToast("Post removed from Saved");
      } else {
        await savePost(post.postId);
        showToast("Post saved");
      }
    } catch {
      const revert = (prev: Post[]) =>
        prev.map((p) => p.postId === post.postId ? { ...p, savedByMe: wasSaved } : p);
      setPosts(revert);
      setSavedPosts(revert);
    } finally {
      setSaveBusy((prev) => { const next = new Set(prev); next.delete(post.postId); return next; });
    }
  };

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, out: false });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => prev ? { ...prev, out: true } : null);
      toastTimerRef.current = setTimeout(() => setToast(null), 400);
    }, 1800);
  };

  const loadSavedPosts = async (pageNum: number, replace: boolean) => {
    if (!isOwnProfile) return;
    setSavedLoading(true);
    setSavedError(null);
    try {
      const response = await getSavedPosts(pageNum, DEFAULT_PAGE_SIZE);
      setSavedPosts((prev) => replace ? response.items : [...prev, ...response.items]);
      setSavedPage(pageNum);
      setSavedHasNext(response.hasNext);
    } catch (error) {
      setSavedError(getErrorMessage(error, "Cannot load saved posts"));
    } finally {
      setSavedLoading(false);
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

  const removeMediaFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setMediaFiles((prev) => [...prev, ...files]);
    event.target.value = "";
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
    } catch (error) {
      setEditError(getErrorMessage(error, "Cannot update post"));
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
      setPendingPosts((prev) => prev.filter((item) => item.postId !== deleteTarget.postId));
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(getErrorMessage(error, "Cannot delete post"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile?.username || isOwnProfile) {
      return;
    }

    setFollowBusy(true);
    setFollowError(null);

    try {
      const response = profile.isFollowing
        ? await unfollowUser(profile.username)
        : await followUser(profile.username);
      setProfile((prev) => (prev
        ? {
          ...prev,
          followerCount: response.followerCount,
          followingCount: response.followingCount,
          isFollowing: response.isFollowing,
        }
        : prev
      ));
    } catch (error) {
      setFollowError(getErrorMessage(error, "Cannot update follow"));
    } finally {
      setFollowBusy(false);
    }
  };

  const openFollowList = async (mode: "followers" | "following") => {
    if (!profile?.username) {
      return;
    }

    setFollowListOpen(mode);
    setFollowListLoading(true);
    setFollowListError(null);
    setFollowListItems([]);

    try {
      const response = mode === "followers"
        ? await getFollowers(profile.username, 0, 20)
        : await getFollowing(profile.username, 0, 20);
      setFollowListItems(response.items);
    } catch (error) {
      setFollowListError(getErrorMessage(error, "Cannot load list"));
    } finally {
      setFollowListLoading(false);
    }
  };

  const closeFollowList = () => {
    setFollowListOpen(null);
  };

  const handleCreatePortfolio = async () => {
    const trimmed = createPortfolioName.trim();
    if (!trimmed) {
      setCreatePortfolioError("Portfolio name is required.");
      return;
    }

    setCreatePortfolioBusy(true);
    setCreatePortfolioError(null);

    try {
      const newPortfolio = await createPortfolio(trimmed);
      setPortfolios((prev) => [...prev, newPortfolio]);
      setCreatePortfolioName("");
      setCreatePortfolioOpen(false);
    } catch (err) {
      setCreatePortfolioError(getErrorMessage(err, "Cannot create portfolio"));
    } finally {
      setCreatePortfolioBusy(false);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!deletePortfolioTarget) return;

    setDeletePortfolioBusy(true);
    try {
      await deletePortfolio(deletePortfolioTarget.portfolioId);
      setPortfolios((prev) => prev.filter((p) => p.portfolioId !== deletePortfolioTarget.portfolioId));
      if (selectedPortfolio?.portfolioId === deletePortfolioTarget.portfolioId) {
        setSelectedPortfolio(null);
      }
      setDeletePortfolioTarget(null);
    } catch (err) {
      setPortfoliosError(getErrorMessage(err, "Cannot delete portfolio"));
      setDeletePortfolioTarget(null);
    } finally {
      setDeletePortfolioBusy(false);
    }
  };

  const openAddMediaDialog = async () => {
    if (!profile?.username || !selectedPortfolio) return;

    setAddMediaOpen(true);
    setUserMediaPickerLoading(true);

    try {
      const result = await getUserMedia(profile.username);
      setUserMediaForPicker(result.items);
    } catch {
      setUserMediaForPicker([]);
    } finally {
      setUserMediaPickerLoading(false);
    }
  };

  const toggleMediaInPortfolio = async (mediaId: string) => {
    if (!selectedPortfolio || mediaToggleBusy.has(mediaId)) return;

    setMediaToggleBusy((prev) => new Set(prev).add(mediaId));

    try {
      if (portfolioMediaIds.has(mediaId)) {
        await removeMediaFromPortfolio(selectedPortfolio.portfolioId, mediaId);
        setPortfolioMediaIds((prev) => {
          const next = new Set(prev);
          next.delete(mediaId);
          return next;
        });
        setPortfolioMedia((prev) => prev.filter((m) => m.mediaId !== mediaId));
        setPortfolios((prev) => prev.map((p) =>
          p.portfolioId === selectedPortfolio.portfolioId
            ? { ...p, mediaCount: Math.max(0, p.mediaCount - 1) }
            : p
        ));
      } else {
        await addMediaToPortfolio(selectedPortfolio.portfolioId, mediaId);
        setPortfolioMediaIds((prev) => new Set(prev).add(mediaId));
        const added = userMediaForPicker.find((m) => m.mediaId === mediaId);
        if (added) {
          setPortfolioMedia((prev) => [...prev, added]);
        }
        setPortfolios((prev) => prev.map((p) =>
          p.portfolioId === selectedPortfolio.portfolioId
            ? { ...p, mediaCount: p.mediaCount + 1 }
            : p
        ));
      }
    } catch {
      // silent – state stays consistent from server perspective
    } finally {
      setMediaToggleBusy((prev) => {
        const next = new Set(prev);
        next.delete(mediaId);
        return next;
      });
    }
  };

  return (
    <section className="profile-home">
      {profileError ? <div className="discover-alert discover-alert--error">{profileError}</div> : null}

      <div className="profile-home__hero" aria-busy={profileLoading}>
        <div className="profile-hero__avatar">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={displayName} />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="profile-hero__content">
          <div className="profile-hero__title">
            <div>
              <h2>{displayName}</h2>
              <p>{usernameLabel}</p>
            </div>
            {isOwnProfile ? (
              <button
                type="button"
                className="profile-hero__edit"
                onClick={() => navigate("/profile")}
              >
                Edit profile
              </button>
            ) : (
              <div className="profile-hero__actions">
                <button
                  type="button"
                  className="profile-hero__action"
                  onClick={() => void handleFollowToggle()}
                  disabled={followBusy}
                >
                  {followLabel}
                </button>
                <button
                  type="button"
                  className="profile-hero__action"
                  disabled={messageBusy}
                  onClick={() => {
                    if (!profile?.username) return;
                    setMessageBusy(true);
                    getOrCreateConversation(profile.username)
                      .then((conv) => navigate(`/messages/${conv.conversationId}`))
                      .catch(() => setMessageBusy(false))
                      .finally(() => setMessageBusy(false));
                  }}
                >
                  Message
                </button>
              </div>
            )}
          </div>
          {followError ? <div className="profile-hero__error">{followError}</div> : null}
          <p className="profile-hero__bio">{bio}</p>
          {websiteLabel ? (
            <a className="profile-hero__website" href={websiteLabel} target="_blank" rel="noreferrer">
              {websiteLabel}
            </a>
          ) : null}
          <div className="profile-hero__stats">
            <div>
              <strong>{posts.length}</strong>
              <span>Posts</span>
            </div>
            <button
              type="button"
              className="profile-hero__stat"
              onClick={() => void openFollowList("following")}
            >
              <strong>{followingCount}</strong>
              <span>Following</span>
            </button>
            <button
              type="button"
              className="profile-hero__stat"
              onClick={() => void openFollowList("followers")}
            >
              <strong>{followerCount}</strong>
              <span>Followers</span>
            </button>
          </div>
        </div>
      </div>

      <div className="profile-tabs" role="tablist" aria-label="Profile sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "posts"}
          className={activeTab === "posts" ? "profile-tab profile-tab--active" : "profile-tab"}
          onClick={() => setActiveTab("posts")}
        >
          Posts
        </button>
        {isOwnProfile ? (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "saved"}
            className={activeTab === "saved" ? "profile-tab profile-tab--active" : "profile-tab"}
            onClick={() => setActiveTab("saved")}
          >
            Saved
          </button>
        ) : null}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "media"}
          className={activeTab === "media" ? "profile-tab profile-tab--active" : "profile-tab"}
          onClick={() => setActiveTab("media")}
        >
          Media
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "portfolio"}
          className={activeTab === "portfolio" ? "profile-tab profile-tab--active" : "profile-tab"}
          onClick={() => setActiveTab("portfolio")}
        >
          Portfolio
        </button>
        {isOwnProfile ? (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pending"}
            className={activeTab === "pending" ? "profile-tab profile-tab--active" : "profile-tab"}
            onClick={() => setActiveTab("pending")}
          >
            Pending
          </button>
        ) : null}
      </div>

      {activeTab === "posts" ? (
        <div className="profile-posts">
          <div className="profile-posts__main">
            {pendingNotice ? (
              <div className="discover-alert discover-alert--error">
                {pendingNotice}
                <button
                  type="button"
                  onClick={() => {
                    setPendingNotice(null);
                    try {
                      if (pendingKeyRef.current) {
                        localStorage.setItem("canvasia.pending.dismissed", pendingKeyRef.current);
                      }
                    } catch {
                      return;
                    }
                  }}
                >
                  Dismiss
                </button>
              </div>
            ) : null}
            {isOwnProfile ? (
              <form className="profile-composer" onSubmit={(event) => void submitPost(event)}>
                <div className="profile-composer__header">
                  <div>
                    <h3>Share your latest work</h3>
                    <p>Post artwork, sketches, or concepts to your feed.</p>
                  </div>
                  <button type="submit" disabled={composerBusy || viewerLoading}>
                    {composerBusy ? "Posting..." : "Post"}
                  </button>
                </div>

                {composerError ? <div className="profile-composer__alert">{composerError}</div> : null}
                {composerSuccess ? <div className="profile-composer__success">{composerSuccess}</div> : null}

                <textarea
                  rows={3}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Write a caption or tell the story behind the work"
                />

                <div className="profile-composer__controls">
                  <input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    placeholder="Tags (comma separated)"
                  />
                  <label className="profile-composer__upload">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMediaSelect}
                    />
                    <span>{mediaFiles.length ? `${mediaFiles.length} files` : "Add media"}</span>
                  </label>
                </div>

                <div className="profile-composer__audience">
                  <label htmlFor="post-visibility" className="profile-composer__audience-label">
                    Who can view this post?
                  </label>
                  <select
                    id="post-visibility"
                    value={postVisibility}
                    onChange={(event) => setPostVisibility(event.target.value as PostVisibility)}
                  >
                    {POST_AUDIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  {postVisibility === "SELECTED_USERS" ? (
                    <div className="profile-composer__audience-list">
                      <div className="profile-composer__audience-selected">
                        {selectedAudienceUsers.map((item) => (
                          <div key={item.userId} className="profile-composer__audience-chip">
                            <div className="profile-composer__audience-avatar" aria-hidden="true">
                              {item.avatarUrl ? (
                                <img src={item.avatarUrl} alt={item.displayName || item.username} />
                              ) : (
                                <span>{(item.displayName || item.username || "U").charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <span>{item.displayName || item.username}</span>
                            <button
                              type="button"
                              className="profile-composer__audience-remove"
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
                        className="profile-composer__audience-search"
                      />

                      {audienceSearchLoading ? <p>Searching followers...</p> : null}
                      {!audienceSearchLoading && audienceQuery.trim() && audienceSearchResults.length === 0 ? (
                        <p>No matching followers found.</p>
                      ) : null}
                      {audienceSearchLoading ? null : audienceSearchResults.map((item) => (
                        <button
                          key={item.userId}
                          type="button"
                          className="profile-composer__audience-result"
                          onClick={() => addSelectedAudienceUser(item)}
                        >
                          <div className="profile-composer__audience-avatar" aria-hidden="true">
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
                </div>
                {mediaPreviews.length ? (
                  <div className="profile-composer__preview">
                    {mediaPreviews.map((preview, index) => (
                      <div key={`${preview.file.name}-${index}`} className="profile-composer__preview-item">
                        <button
                          type="button"
                          className="profile-composer__preview-remove"
                          aria-label={`Remove ${preview.file.name}`}
                          onClick={() => removeMediaFile(index)}
                        >
                          x
                        </button>
                        <img src={preview.url} alt={`Selected ${preview.file.name}`} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </form>
            ) : null}

            {postsError ? <div className="discover-alert discover-alert--error">{postsError}</div> : null}

            <div className="post-feed">
              {posts.length === 0 && !postsLoading ? (
                <div className="profile-empty">
                  {isOwnProfile ? "Nothing here yet. Make your first post." : "No posts yet."}
                </div>
              ) : null}

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
                        <p>
                          <span>@{post.username} • {formatDate(post.createdAt)}</span>
                          {viewerProfile?.username === post.username ? (
                            <span className="post-visibility-badge">{getPostVisibilityLabel(post)}</span>
                          ) : null}
                        </p>
                      </div>
                    </Link>
                    {viewerProfile?.username ? (
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
                                void toggleSave(post, "posts");
                              }}
                            >
                              {post.savedByMe ? "Unsave" : "Save"}
                            </button>
                            {isOwnProfile ? (
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
                            ) : (
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

                  {post.tags.length ? (
                    <div className="post-card__tags">
                      {post.tags.map((tag) => (
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
            </div>

            <div className="discover-actions">
              {postsLoading ? <span>Loading...</span> : null}
              {!postsLoading && hasNext ? (
                <button type="button" onClick={() => void loadPosts(page + 1, false)}>
                  Load more
                </button>
              ) : null}
            </div>
          </div>

          <aside className="profile-posts__sidebar">
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
        </div>
      ) : null}

      {activeTab === "saved" ? (
        <div className="profile-posts">
          <div className="profile-posts__main">
            {savedError ? (
              <div className="discover-alert discover-alert--error">{savedError}</div>
            ) : null}
            <div className="post-feed">
              {savedPosts.length === 0 && !savedLoading ? (
                <div className="profile-empty">No saved posts yet.</div>
              ) : null}
              {savedPosts.map((post) => (
                <article key={post.postId} className="post-card">
                  <div className="post-card__head">
                    <Link
                      className="post-card__author-link"
                      to={`/${post.username}`}
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
                        <p>
                          <span>@{post.username} • {formatDate(post.createdAt)}</span>
                          {viewerProfile?.username === post.username ? (
                            <span className="post-visibility-badge">{getPostVisibilityLabel(post)}</span>
                          ) : null}
                        </p>
                      </div>
                    </Link>
                    {viewerProfile?.username ? (
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
                                void toggleSave(post, "saved");
                              }}
                            >
                              {post.savedByMe ? "Unsave" : "Save"}
                            </button>
                            {post.username === viewerProfile.username ? (
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
                            ) : (
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

                  {post.tags.length ? (
                    <div className="post-card__tags">
                      {post.tags.map((tag) => (
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
            </div>

            <div className="discover-actions">
              {savedLoading ? <span>Loading...</span> : null}
              {!savedLoading && savedHasNext ? (
                <button type="button" onClick={() => void loadSavedPosts(savedPage + 1, false)}>
                  Load more
                </button>
              ) : null}
            </div>
          </div>

          <aside className="profile-posts__sidebar">
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
        </div>
      ) : null}

      {activeTab === "media" ? (
        <div className="profile-media">
          {mediaItems.length === 0 ? (
            <div className="profile-empty">No media yet.</div>
          ) : (
            <div className="profile-media-grid">
              {mediaItems.map((item) => (
                <Link
                  key={`${item.postId}-${item.mediaId}`}
                  to={`/posts/${item.postId}`}
                  state={{ mediaId: item.mediaId }}
                  className="profile-media-grid__item"
                  title="Open post detail"
                >
                  <img src={item.url} alt={item.caption || "Artwork"} loading="lazy" />
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "portfolio" ? (
        <div className="profile-portfolio-tab">
          {portfoliosError ? <div className="discover-alert discover-alert--error">{portfoliosError}</div> : null}

          {selectedPortfolio ? (
            // ── Portfolio detail view ────────────────────────────────────────
            <div className="portfolio-detail">
              <div className="portfolio-detail__header">
                <button
                  type="button"
                  className="portfolio-back-btn"
                  onClick={() => setSelectedPortfolio(null)}
                >
                  ← Back
                </button>
                <h3 className="portfolio-detail__name">{selectedPortfolio.name}</h3>
                {isOwnProfile ? (
                  <div className="portfolio-detail__actions">
                    <button
                      type="button"
                      className="portfolio-action-btn"
                      onClick={() => void openAddMediaDialog()}
                    >
                      Add media
                    </button>
                    <button
                      type="button"
                      className="portfolio-action-btn portfolio-action-btn--danger"
                      onClick={() => setDeletePortfolioTarget(selectedPortfolio)}
                    >
                      Delete portfolio
                    </button>
                  </div>
                ) : null}
              </div>

              {portfolioMediaError ? <div className="discover-alert discover-alert--error">{portfolioMediaError}</div> : null}

              {portfolioMediaLoading ? <div className="portfolio-loading">Loading...</div> : null}

              {!portfolioMediaLoading && portfolioMedia.length === 0 ? (
                <div className="profile-empty">
                  {isOwnProfile ? "No media in this portfolio yet. Use \"Add media\" to curate items." : "No media in this portfolio."}
                </div>
              ) : null}

              <div className="profile-media-grid">
                {portfolioMedia.map((item) => (
                  <div key={item.mediaId} className="profile-media-grid__item portfolio-media-item">
                    <Link
                      to={`/posts/${item.postId}`}
                      state={{ mediaId: item.mediaId }}
                      className="portfolio-media-item__link"
                      title="Open post detail"
                    >
                      <img
                        src={item.thumbnailUrl || item.originalUrl}
                        alt="Portfolio item"
                        loading="lazy"
                      />
                    </Link>
                    {isOwnProfile ? (
                      <button
                        type="button"
                        className="portfolio-media-item__remove"
                        aria-label="Remove from portfolio"
                        onClick={() => void toggleMediaInPortfolio(item.mediaId)}
                        disabled={mediaToggleBusy.has(item.mediaId)}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // ── Portfolio list view ──────────────────────────────────────────
            <div className="portfolio-list">
              {isOwnProfile ? (
                <div className="portfolio-list__header">
                  <h3>Your portfolios</h3>
                  <button
                    type="button"
                    className="portfolio-action-btn"
                    onClick={() => {
                      setCreatePortfolioName("");
                      setCreatePortfolioError(null);
                      setCreatePortfolioOpen(true);
                    }}
                  >
                    + New portfolio
                  </button>
                </div>
              ) : null}

              {portfoliosLoading ? <div className="portfolio-loading">Loading...</div> : null}

              {!portfoliosLoading && portfolios.length === 0 ? (
                <div className="profile-empty">
                  {isOwnProfile ? "No portfolios yet. Create one to curate your best work." : "No portfolios yet."}
                </div>
              ) : null}

              <div className="portfolio-cards">
                {portfolios.map((portfolio) => (
                  <button
                    key={portfolio.portfolioId}
                    type="button"
                    className="portfolio-card"
                    onClick={() => setSelectedPortfolio(portfolio)}
                  >
                    <div className="portfolio-card__name">{portfolio.name}</div>
                    <div className="portfolio-card__count">{portfolio.mediaCount} {portfolio.mediaCount === 1 ? "item" : "items"}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create portfolio dialog */}
          {createPortfolioOpen ? (
            <dialog className="portfolio-dialog" open>
              <button
                type="button"
                className="portfolio-dialog__backdrop"
                aria-label="Close"
                onClick={() => setCreatePortfolioOpen(false)}
              />
              <div className="portfolio-dialog__card">
                <h3>New portfolio</h3>
                {createPortfolioError ? <div className="portfolio-dialog__error">{createPortfolioError}</div> : null}
                <label className="portfolio-dialog__field">
                  <span>Name</span>
                  <input
                    value={createPortfolioName}
                    onChange={(e) => setCreatePortfolioName(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Character Design"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleCreatePortfolio();
                    }}
                  />
                </label>
                <div className="portfolio-dialog__footer">
                  <button type="button" onClick={() => setCreatePortfolioOpen(false)} disabled={createPortfolioBusy}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="portfolio-action-btn"
                    onClick={() => void handleCreatePortfolio()}
                    disabled={createPortfolioBusy}
                  >
                    {createPortfolioBusy ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </dialog>
          ) : null}

          {/* Delete portfolio confirm dialog */}
          {deletePortfolioTarget ? (
            <dialog className="post-detail__confirm" open>
              <button
                type="button"
                className="post-detail__confirm-backdrop"
                aria-label="Close"
                onClick={() => setDeletePortfolioTarget(null)}
              />
              <div className="post-detail__confirm-card">
                <h3>Delete "{deletePortfolioTarget.name}"?</h3>
                <p>This will remove the portfolio and all its curation. Original posts won't be affected.</p>
                <div className="post-detail__confirm-actions">
                  <button type="button" onClick={() => setDeletePortfolioTarget(null)} disabled={deletePortfolioBusy}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="post-detail__confirm-danger"
                    onClick={() => void handleDeletePortfolio()}
                    disabled={deletePortfolioBusy}
                  >
                    {deletePortfolioBusy ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </dialog>
          ) : null}

          {/* Add media picker dialog */}
          {addMediaOpen ? (
            <dialog className="portfolio-picker" open>
              <button
                type="button"
                className="portfolio-picker__backdrop"
                aria-label="Close"
                onClick={() => setAddMediaOpen(false)}
              />
              <div className="portfolio-picker__card">
                <div className="portfolio-picker__header">
                  <h3>Add to "{selectedPortfolio?.name}"</h3>
                  <button type="button" onClick={() => setAddMediaOpen(false)}>
                    Close
                  </button>
                </div>
                <p className="portfolio-picker__hint">Tap an image to add or remove it from this portfolio.</p>
                {userMediaPickerLoading ? <div className="portfolio-loading">Loading your media...</div> : null}
                {!userMediaPickerLoading && userMediaForPicker.length === 0 ? (
                  <div className="profile-empty">No media found. Post some artwork first.</div>
                ) : null}
                <div className="portfolio-picker__grid">
                  {userMediaForPicker.map((item) => {
                    const inPortfolio = portfolioMediaIds.has(item.mediaId);
                    const busy = mediaToggleBusy.has(item.mediaId);
                    return (
                      <button
                        key={item.mediaId}
                        type="button"
                        className={`portfolio-picker__item${inPortfolio ? " portfolio-picker__item--selected" : ""}`}
                        onClick={() => void toggleMediaInPortfolio(item.mediaId)}
                        disabled={busy}
                        aria-pressed={inPortfolio}
                        title={inPortfolio ? "Remove from portfolio" : "Add to portfolio"}
                      >
                        <img
                          src={item.thumbnailUrl || item.originalUrl}
                          alt="Media item"
                          loading="lazy"
                        />
                        {inPortfolio ? <span className="portfolio-picker__check" aria-hidden="true">✓</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </dialog>
          ) : null}
        </div>
      ) : null}
      {activeTab === "pending" && isOwnProfile ? (
        <div className="profile-posts">
          <div className="profile-posts__main">
            {pendingError ? <div className="discover-alert discover-alert--error">{pendingError}</div> : null}

            <div className="post-feed">
              {pendingPosts.length === 0 && !pendingLoading ? (
                <div className="profile-empty">No pending posts right now.</div>
              ) : null}

              {pendingPosts.map((post) => (
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
                        <p>
                          <span>@{post.username} • {formatDate(post.createdAt)}</span>
                          {viewerProfile?.username === post.username ? (
                            <span className="post-visibility-badge">{getPostVisibilityLabel(post)}</span>
                          ) : null}
                        </p>
                      </div>
                    </Link>
                    <div className="post-card__menu">
                      <details className="post-action-menu">
                        <summary aria-label="Post options">
                          <span aria-hidden="true">...</span>
                        </summary>
                        <div className="post-action-menu__list" role="menu">
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
                        </div>
                      </details>
                    </div>
                  </div>

                  {post.caption ? <p className="post-card__caption">{post.caption}</p> : null}

                  {post.isRejected ? (
                    <div className="pending-rejected-banner">
                      <span className="pending-rejected-banner__icon" aria-hidden="true">x</span>{" "}
                      Rejected by Admin - this post will not be published.
                    </div>
                  ) : null}

                  <FlagWarningBanner post={post} />

                  <Link
                    to={`/posts/${post.postId}`}
                    state={{ post, initialMediaIndex: 0 }}
                    className="post-card__media-link"
                    aria-label="Open post detail"
                  >
                    <PostCardMedia
                      postId={post.postId}
                      caption={post.caption}
                      media={post.media}
                    />
                  </Link>

                  {post.tags.length ? (
                    <div className="post-card__tags">
                      {post.tags.map((tag) => (
                        <span key={`${post.postId}-${tag}`}>#{normalizeTag(tag)}</span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="discover-actions">
              {pendingLoading ? <span>Loading...</span> : null}
              {!pendingLoading && pendingHasNext ? (
                <button type="button" onClick={() => void loadPendingPosts(pendingPage + 1, false)}>
                  Load more
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
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
      {followListOpen ? (
        <dialog className="follow-list" open>
          <button
            type="button"
            className="follow-list__backdrop"
            aria-label="Close follow list"
            onClick={closeFollowList}
          />
          <div className="follow-list__card">
            <div className="follow-list__header">
              <h3>{followListOpen === "followers" ? "Followers" : "Following"}</h3>
              <button type="button" onClick={closeFollowList}>
                Close
              </button>
            </div>
            {followListLoading ? <p>Loading...</p> : null}
            {followListError ? <p className="follow-list__error">{followListError}</p> : null}
            {!followListLoading && followListItems.length === 0 ? (
              <p className="follow-list__empty">No users yet.</p>
            ) : null}
            <ul className="follow-list__items">
              {followListItems.map((item) => (
                <li key={item.userId}>
                  <Link
                    to={`/${item.username}`}
                    className="follow-list__item"
                    onClick={closeFollowList}
                  >
                    <div className="follow-list__avatar">
                      {item.avatarUrl ? (
                        <img src={item.avatarUrl} alt={item.displayName || "User"} />
                      ) : (
                        <span>{(item.displayName || "U").charAt(0)}</span>
                      )}
                    </div>
                    <div className="follow-list__meta">
                      <strong>{item.displayName}</strong>
                      <span>@{item.username}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </dialog>
      ) : null}

      {reportTarget ? (
        <ReportPostDialog
          postId={reportTarget.postId}
          onClose={() => setReportTarget(null)}
        />
      ) : null}

      {toast ? (
        <div className={toast.out ? "save-toast save-toast--out" : "save-toast"}>
          {toast.message}
        </div>
      ) : null}
    </section>
  );
}

export default HomePage;
