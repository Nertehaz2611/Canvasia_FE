import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRealtimeNotifications } from "../../hooks/useRealtimeNotifications";
import { useTopbarProfile } from "../../hooks/useTopbarProfile";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../../services/notificationService";
import type { NotificationItem } from "../../types/notification";
import NotificationDropdown from "../notifications/NotificationDropdown";

function TopbarNotifications() {
  const navigate = useNavigate();
  const { profile } = useTopbarProfile();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [deletedPostModal, setDeletedPostModal] = useState<NotificationItem | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      setNotificationLoading(true);
      try {
        const feed = await getNotifications(0, 20);
        if (!active) {
          return;
        }

        setNotifications(feed.notifications);
        setNotificationUnreadCount(feed.unreadCount);
        setNotificationError(null);
      } catch {
        if (active) {
          setNotificationError("Cannot load notifications right now.");
        }
      } finally {
        if (active) {
          setNotificationLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  useRealtimeNotifications({
    onNotification: (notification) => {
      setNotifications((current) => {
        const next = current.filter((item) => item.notificationId !== notification.notificationId);
        return [notification, ...next].slice(0, 20);
      });

      if (!notification.isRead) {
        setNotificationUnreadCount((count) => count + 1);
      }
    },
  });

  useEffect(() => {
    if (!isNotificationOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationMenuRef.current?.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isNotificationOpen]);

  const refreshNotifications = async () => {
    try {
      setNotificationLoading(true);
      const feed = await getNotifications(0, 20);
      setNotifications(feed.notifications);
      setNotificationUnreadCount(feed.unreadCount);
      setNotificationError(null);
    } catch {
      setNotificationError("Cannot load notifications right now.");
    } finally {
      setNotificationLoading(false);
    }
  };

  const toggleNotifications = () => {
    setIsNotificationOpen((value) => !value);
    void refreshNotifications();
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    setIsNotificationOpen(false);
    setNotifications((current) =>
      current.map((item) => (item.notificationId === notification.notificationId ? { ...item, isRead: true } : item)),
    );

    if (!notification.isRead) {
      setNotificationUnreadCount((count) => Math.max(0, count - 1));
      await markNotificationAsRead(notification.notificationId).catch(() => null);
    }

    const isCommentNotification = notification.referenceType === "COMMENT";
    const isFollowNotification = notification.referenceType === "USER" || notification.type === "FOLLOW";

    if (isCommentNotification && notification.postId) {
      navigate(`/posts/${notification.postId}`, { state: { commentId: notification.referenceId } });
      return;
    }

    if (isFollowNotification && notification.actorUsername) {
      navigate(`/${notification.actorUsername}`);
      return;
    }

    // Admin action notifications
    if (notification.type === "POST_APPROVED" && profile?.username) {
      navigate(`/${profile.username}`, { state: { tab: "posts", scrollToPostId: notification.postId } });
      return;
    }

    if (notification.type === "POST_REJECTED" && profile?.username) {
      navigate(`/${profile.username}`, { state: { tab: "pending", scrollToPostId: notification.postId } });
      return;
    }

    if (notification.type === "POST_DELETED_REPORTED") {
      setDeletedPostModal(notification);
      return;
    }

    if (notification.postId) {
      navigate(`/posts/${notification.postId}`);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setNotificationUnreadCount(0);
    await markAllNotificationsAsRead().catch(() => null);
  };

  const formatNotificationTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="topbar-notifications" ref={notificationMenuRef}>
      <NotificationDropdown
        isOpen={isNotificationOpen}
        unreadCount={notificationUnreadCount}
        notifications={notifications}
        loading={notificationLoading}
        error={notificationError}
        onToggle={toggleNotifications}
        onMarkAllRead={() => void handleMarkAllNotificationsRead()}
        onNotificationClick={(notification) => void handleNotificationClick(notification)}
        formatNotificationTime={formatNotificationTime}
      />

      {deletedPostModal ? (
        <dialog
          className="admin-dialog-backdrop"
          open
          aria-labelledby="deleted-post-modal-title"
        >
          <div className="admin-dialog">
            <h3 id="deleted-post-modal-title">Post Removed</h3>
            <p>{deletedPostModal.content}</p>
            <div className="admin-dialog__actions">
              <button
                type="button"
                className="admin-btn"
                onClick={() => setDeletedPostModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}

export default TopbarNotifications;