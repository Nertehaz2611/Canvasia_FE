import api from "./api";
import type {
  AdminPendingPostFeedResponse,
  AdminReportedPostFeedResponse,
  AdminStats,
  AdminUserFeedResponse,
  AvatarUploadResponse,
  CommentFeedResponse,
  CommentLikeResponse,
  CursorPostFeedResponse,
  CursorThumbnailFeedResponse,
  CreatePostInput,
  ReplacePostMediaInput,
  UpdatePostInput,
  LatestDiscussionFeedResponse,
  LatestHashtagResponse,
  FollowStatusResponse,
  FollowUserFeedResponse,
  MediaListResponse,
  Portfolio,
  Post,
  PostFeedResponse,
  PostLikeResponse,
  PostSaveResponse,
  ReportPostInput,
  Profile,
  AccountSettingsInput,
  ProfileSetupInput,
} from "../types/social";

export async function getDiscoverPosts(limit = 10, cursor?: string | null, tag?: string): Promise<CursorPostFeedResponse> {
  const response = await api.get<CursorPostFeedResponse>("/discover/posts", {
    params: {
      limit,
      cursor: cursor || undefined,
      tag: tag?.trim() || undefined,
    },
  });

  return response.data;
}

export async function getSearchPosts(limit = 10, cursor?: string | null, query = ""): Promise<CursorPostFeedResponse> {
  const response = await api.get<CursorPostFeedResponse>("/posts/search", {
    params: {
      limit,
      cursor: cursor || undefined,
      query: query.trim(),
    },
  });

  return response.data;
}

export async function getPostById(postId: string): Promise<Post> {
  const response = await api.get<Post>(`/posts/${postId}`);
  return response.data;
}

export async function getDiscoverThumbnails(limit = 50, cursor?: string | null): Promise<CursorThumbnailFeedResponse> {
  const response = await api.get<CursorThumbnailFeedResponse>("/discover/thumbnails", {
    params: {
      limit,
      cursor: cursor || undefined,
    },
  });

  return response.data;
}

export async function createPost(input: CreatePostInput): Promise<void> {
  const formData = new FormData();

  const payload = {
    caption: input.caption.trim() || null,
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    thumbnailCrops: [],
    visibility: input.visibility,
    allowedViewerUserIds: input.allowedViewerUserIds,
  };
  formData.append("payload", JSON.stringify(payload));

  for (const mediaFile of input.mediaFiles) {
    formData.append("media", mediaFile);
  }

  await api.post("/posts", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

export async function updatePost(input: UpdatePostInput): Promise<Post> {
  const formData = new FormData();
  const payload = {
    caption: input.caption.trim() || null,
    tags: input.tags,
    deleteMediaIds: input.deleteMediaIds,
    replaceMedia: [] as Array<{ mediaId: string; fileIndex: number }>,
    thumbnailCrops: [],
    visibility: input.visibility,
    allowedViewerUserIds: input.allowedViewerUserIds,
  };

  const files: File[] = [];
  const appendReplacement = (item: ReplacePostMediaInput) => {
    const fileIndex = files.length;
    files.push(item.file);
    payload.replaceMedia.push({ mediaId: item.mediaId, fileIndex });
  };

  input.replaceMedia.forEach(appendReplacement);
  input.newFiles.forEach((file) => files.push(file));

  formData.append("payload", JSON.stringify(payload));
  files.forEach((file) => formData.append("media", file));

  const response = await api.put<Post>(`/posts/${input.postId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}`);
}

export async function likePost(postId: string): Promise<PostLikeResponse> {
  const response = await api.post<PostLikeResponse>(`/posts/${postId}/likes`);
  return response.data;
}

export async function unlikePost(postId: string): Promise<PostLikeResponse> {
  const response = await api.delete<PostLikeResponse>(`/posts/${postId}/likes`);
  return response.data;
}

export async function savePost(postId: string): Promise<PostSaveResponse> {
  const response = await api.post<PostSaveResponse>(`/posts/${postId}/saves`);
  return response.data;
}

export async function unsavePost(postId: string): Promise<PostSaveResponse> {
  const response = await api.delete<PostSaveResponse>(`/posts/${postId}/saves`);
  return response.data;
}

export async function reportPost(input: ReportPostInput): Promise<void> {
  await api.post(`/posts/${input.postId}/reports`, {
    reasons: input.reasons,
    otherReason: input.otherReason ?? null,
  });
}

export async function getSavedPosts(page = 0, size = 10): Promise<PostFeedResponse> {
  const response = await api.get<PostFeedResponse>("/posts/saved", { params: { page, size } });
  return response.data;
}

export async function getComments(postId: string, page = 0, size = 20, maxDepth = 2): Promise<CommentFeedResponse> {
  const response = await api.get<CommentFeedResponse>(`/comments/${postId}`, {
    params: { page, size, maxDepth },
  });
  return response.data;
}

export async function getLatestDiscussions(limit = 5): Promise<LatestDiscussionFeedResponse> {
  const response = await api.get<LatestDiscussionFeedResponse>("/discover/latest-discussions", {
    params: { limit },
  });
  return response.data;
}

export async function getLatestHashtags(limit = 5): Promise<LatestHashtagResponse> {
  const response = await api.get<LatestHashtagResponse>("/discover/latest-hashtags", {
    params: { limit },
  });
  return response.data;
}

export async function createComment(postId: string, content: string): Promise<void> {
  await api.post(`/comments/${postId}`, { content: content.trim() });
}

export async function replyComment(commentId: string, content: string): Promise<void> {
  await api.post(`/comments/${commentId}/replies`, { content: content.trim() });
}

export async function updateComment(commentId: string, content: string): Promise<void> {
  await api.put(`/comments/${commentId}`, { content: content.trim() });
}

export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/comments/${commentId}`);
}

export async function likeComment(commentId: string): Promise<CommentLikeResponse> {
  const response = await api.post<CommentLikeResponse>(`/comments/${commentId}/likes`);
  return response.data;
}

export async function unlikeComment(commentId: string): Promise<CommentLikeResponse> {
  const response = await api.delete<CommentLikeResponse>(`/comments/${commentId}/likes`);
  return response.data;
}

export async function getMyProfile(): Promise<Profile> {
  const response = await api.get<Profile>("/profile/me");
  return response.data;
}

export async function searchProfiles(query: string, limit = 8): Promise<Profile[]> {
  const response = await api.get<Profile[]>("/profile/search", {
    params: {
      query: query.trim(),
      limit,
    },
  });

  return response.data;
}

export async function getUserProfile(username: string): Promise<Profile> {
  const response = await api.get<Profile>(`/profile/users/${username}`);
  return response.data;
}

export async function followUser(username: string): Promise<FollowStatusResponse> {
  const response = await api.post<FollowStatusResponse>(`/follows/${username}`);
  return response.data;
}

export async function unfollowUser(username: string): Promise<FollowStatusResponse> {
  const response = await api.delete<FollowStatusResponse>(`/follows/${username}`);
  return response.data;
}

export async function getFollowers(username: string, page = 0, size = 20): Promise<FollowUserFeedResponse> {
  const response = await api.get<FollowUserFeedResponse>(`/follows/${username}/followers`, {
    params: { page, size },
  });
  return response.data;
}

export async function searchFollowers(username: string, query: string, page = 0, size = 10): Promise<FollowUserFeedResponse> {
  const response = await api.get<FollowUserFeedResponse>(`/follows/${username}/followers/search`, {
    params: {
      query: query.trim(),
      page,
      size,
    },
  });
  return response.data;
}

export async function getFollowing(username: string, page = 0, size = 20): Promise<FollowUserFeedResponse> {
  const response = await api.get<FollowUserFeedResponse>(`/follows/${username}/following`, {
    params: { page, size },
  });
  return response.data;
}

export async function setupProfile(input: ProfileSetupInput): Promise<Profile> {
  const response = await api.put<Profile>("/profile/setup", input);
  return response.data;
}

export async function updateAccountSettings(input: AccountSettingsInput): Promise<Profile> {
  const response = await api.put<Profile>("/profile/account", input);
  return response.data;
}

export async function uploadAvatar(avatarFile: File): Promise<AvatarUploadResponse> {
  const formData = new FormData();
  formData.append("avatar", avatarFile);

  const response = await api.post<AvatarUploadResponse>("/profile/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function getUserPosts(username: string, page = 0, size = 10): Promise<PostFeedResponse> {
  const response = await api.get<PostFeedResponse>(`/posts/users/${username}`, {
    params: { page, size },
  });
  return response.data;
}

export async function getPendingPosts(page = 0, size = 10): Promise<PostFeedResponse> {
  const response = await api.get<PostFeedResponse>("/posts/pending", {
    params: { page, size },
  });
  return response.data;
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

export async function getMyPortfolios(): Promise<Portfolio[]> {
  const response = await api.get<Portfolio[]>("/portfolios/my");
  return response.data;
}

export async function getPortfoliosByUsername(username: string): Promise<Portfolio[]> {
  const response = await api.get<Portfolio[]>(`/portfolios/users/${username}`);
  return response.data;
}

export async function createPortfolio(name: string): Promise<Portfolio> {
  const response = await api.post<Portfolio>("/portfolios", { name });
  return response.data;
}

export async function deletePortfolio(portfolioId: string): Promise<void> {
  await api.delete(`/portfolios/${portfolioId}`);
}

export async function addMediaToPortfolio(portfolioId: string, mediaId: string): Promise<void> {
  await api.post(`/portfolios/${portfolioId}/media/${mediaId}`);
}

export async function removeMediaFromPortfolio(portfolioId: string, mediaId: string): Promise<void> {
  await api.delete(`/portfolios/${portfolioId}/media/${mediaId}`);
}

// ── Media ─────────────────────────────────────────────────────────────────────

export async function getUserMedia(username: string, page = 0, size = 100): Promise<MediaListResponse> {
  const response = await api.get<MediaListResponse>(`/media/users/${username}`, {
    params: { page, size },
  });
  return response.data;
}

export async function getPortfolioMedia(portfolioId: string, page = 0, size = 100): Promise<MediaListResponse> {
  const response = await api.get<MediaListResponse>(`/media/portfolios/${portfolioId}`, {
    params: { page, size },
  });
  return response.data;
}

// Admin API functions
export async function getAdminStats(): Promise<AdminStats> {
  const response = await api.get<AdminStats>("/admin/stats");
  return response.data;
}

export async function getAdminUsers(page = 0, size = 20): Promise<AdminUserFeedResponse> {
  const response = await api.get<AdminUserFeedResponse>("/admin/users", {
    params: { page, size },
  });
  return response.data;
}

export async function getAdminPendingPosts(page = 0, size = 10): Promise<AdminPendingPostFeedResponse> {
  const response = await api.get<AdminPendingPostFeedResponse>("/admin/posts/pending", {
    params: { page, size },
  });
  return response.data;
}

export async function adminApprovePost(postId: string): Promise<void> {
  await api.post(`/admin/posts/${postId}/approve`);
}

export async function adminRejectPost(postId: string): Promise<void> {
  await api.post(`/admin/posts/${postId}/reject`);
}

export async function getAdminReportedPosts(page = 0, size = 10): Promise<AdminReportedPostFeedResponse> {
  const response = await api.get<AdminReportedPostFeedResponse>("/admin/reports", {
    params: { page, size },
  });
  return response.data;
}

export async function adminDeleteReportedPost(postId: string): Promise<void> {
  await api.delete(`/admin/posts/${postId}`);
}
