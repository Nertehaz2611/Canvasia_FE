import api from "./api";
import type { NotificationFeedResponse } from "../types/notification";

export async function getNotifications(page = 0, size = 20): Promise<NotificationFeedResponse> {
  const response = await api.get<NotificationFeedResponse>("/notifications", {
    params: { page, size },
  });

  return response.data;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await api.post(`/notifications/${notificationId}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}