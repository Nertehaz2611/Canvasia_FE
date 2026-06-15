export type MediaItem = {
  mediaId: string;
  orderIndex: number | null;
  originalPublicId: string;
  originalUrl: string;
  thumbnailPublicId?: string | null;
  thumbnailUrl?: string | null;
};

export type Post = {
  postId: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  caption: string;
  createdAt: string;
  media: MediaItem[];
  tags: string[];
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  isPending: boolean;
  isRejected: boolean;
  flaggedMatchedPostId?: string | null;
  flaggedMatchedAuthorDisplayName?: string | null;
  visibility: PostVisibility;
  allowedViewers: PostAllowedViewer[];
};

export type PostVisibility = "PUBLIC" | "FOLLOWERS" | "SELECTED_USERS" | "ONLY_ME";

export type PostAllowedViewer = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type CursorPostFeedResponse = {
  items: Post[];
  limit: number;
  nextCursor: string | null;
  hasNext: boolean;
};

export type ThumbnailItem = {
  mediaId: string;
  postId: string;
  userId: string;
  orderIndex: number | null;
  thumbnailPublicId: string;
  thumbnailUrl: string;
};

export type CursorThumbnailFeedResponse = {
  items: ThumbnailItem[];
  limit: number;
  nextCursor: string | null;
  hasNext: boolean;
};

export type PostFeedResponse = {
  items: Post[];
  page: number;
  size: number;
  hasNext: boolean;
};

export type PostLikeResponse = {
  postId: string;
  likeCount: number;
  likedByMe: boolean;
};

export type PostSaveResponse = {
  postId: string;
  savedByMe: boolean;
};

export type ReportPostInput = {
  postId: string;
  reasons: string[];
  otherReason?: string;
};

export type Comment = {
  commentId: string;
  postId: string;
  parentId: string | null;
  rootId: string | null;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
  replies: Comment[];
};

export type CommentLikeResponse = {
  commentId: string;
  likeCount: number;
  likedByMe: boolean;
};

export type CommentFeedResponse = {
  items: Comment[];
  page: number;
  size: number;
  hasNext: boolean;
  maxDepth: number;
};

export type LatestDiscussionItem = {
  commentId: string;
  postId: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
};

export type LatestDiscussionFeedResponse = {
  items: LatestDiscussionItem[];
};

export type LatestHashtagResponse = {
  items: string[];
};

export type Profile = {
  userId: string;
  username: string;
  email: string | null;
  displayName: string;
  bio: string | null;
  avatarPublicId: string | null;
  avatarUrl: string | null;
  website: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  role: string | null;
};

export type FollowUserItem = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type FollowUserFeedResponse = {
  items: FollowUserItem[];
  page: number;
  size: number;
  hasNext: boolean;
};

export type FollowStatusResponse = {
  username: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

export type AvatarUploadResponse = {
  avatarPublicId: string;
  avatarUrl: string;
};

export type CreatePostInput = {
  caption: string;
  tags: string[];
  mediaFiles: File[];
  visibility: PostVisibility;
  allowedViewerUserIds: string[];
};

export type ReplacePostMediaInput = {
  mediaId: string;
  file: File;
};

export type UpdatePostInput = {
  postId: string;
  caption: string;
  tags: string[];
  deleteMediaIds: string[];
  replaceMedia: ReplacePostMediaInput[];
  newFiles: File[];
  visibility?: PostVisibility;
  allowedViewerUserIds?: string[];
};

export type ProfileSetupInput = {
  displayName: string;
  bio: string;
  website: string;
};

export type AccountSettingsInput = {
  displayName: string;
  email: string;
  bio: string;
  website: string;
};

export type Portfolio = {
  portfolioId: string;
  name: string;
  mediaCount: number;
};

export type MediaListItem = {
  mediaId: string;
  postId: string;
  userId: string;
  orderIndex: number | null;
  originalPublicId: string;
  originalUrl: string;
  thumbnailPublicId: string | null;
  thumbnailUrl: string | null;
};

export type MediaListResponse = {
  items: MediaListItem[];
  page: number;
  size: number;
  hasNext: boolean;
};

// Admin types
export type AdminStats = {
  totalUsers: number;
  newUsersLast7Days: number;
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  totalReports: number;
};

export type AdminUserItem = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string | null;
  status: string | null;
  createdAt: string;
};

export type AdminUserFeedResponse = {
  items: AdminUserItem[];
  page: number;
  size: number;
  hasNext: boolean;
};

export type AdminPendingPostItem = {
  postId: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  caption: string;
  createdAt: string;
  media: MediaItem[];
  tags: string[];
  commentCount: number;
  likeCount: number;
  flaggedMatchedPostId: string | null;
  flaggedMatchedAuthorDisplayName: string | null;
};

export type AdminPendingPostFeedResponse = {
  items: AdminPendingPostItem[];
  page: number;
  size: number;
  hasNext: boolean;
};

export type AdminReportItem = {
  reportId: string;
  reporterId: string | null;
  reporterUsername: string | null;
  reporterDisplayName: string | null;
  reporterAvatarUrl: string | null;
  reasons: string[];
  otherReason: string | null;
  reportedAt: string;
};

export type AdminReportedPostItem = {
  postId: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  caption: string;
  createdAt: string;
  media: MediaItem[];
  tags: string[];
  commentCount: number;
  likeCount: number;
  reportCount: number;
  reports: AdminReportItem[];
};

export type AdminReportedPostFeedResponse = {
  items: AdminReportedPostItem[];
  page: number;
  size: number;
  hasNext: boolean;
};
