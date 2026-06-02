export type NotificationItem = {
  notificationId: string;
  type: string;
  referenceType: string;
  referenceId: string;
  postId: string | null;
  content: string;
  isRead: boolean;
  actorId: string | null;
  actorUsername: string | null;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  createdAt: string;
};

export type NotificationFeedResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
  page: number;
  size: number;
  hasNext: boolean;
};