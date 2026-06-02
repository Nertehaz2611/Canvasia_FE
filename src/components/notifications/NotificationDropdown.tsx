import type { NotificationItem } from "../../types/notification";
import canvasiaLogo from "../../assets/logo/logo.webp";

type NotificationDropdownProps = Readonly<{
  isOpen: boolean;
  unreadCount: number;
  notifications: NotificationItem[];
  loading: boolean;
  error: string | null;
  onToggle: () => void;
  onMarkAllRead: () => void;
  onNotificationClick: (notification: NotificationItem) => void;
  formatNotificationTime: (value: string) => string;
}>;

function NotificationDropdown({
  isOpen,
  unreadCount,
  notifications,
  loading,
  error,
  onToggle,
  onMarkAllRead,
  onNotificationClick,
  formatNotificationTime,
}: NotificationDropdownProps) {
  return (
    <div className="topbar-notifications__wrap">
      <button
        type="button"
        className="topbar-link"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="topbar-notifications__icon">
          <span className="topbar-notifications__icon-spacer" aria-hidden="true" />
        </span>
        <span>Notifications</span>
        {unreadCount > 0 ? <span className="topbar-badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {isOpen ? (
        <div className="topbar-notifications__menu" role="menu" aria-label="Notifications">
          <div className="topbar-notifications__header">
            <strong>Notifications</strong>
            {unreadCount > 0 ? (
              <button type="button" onClick={onMarkAllRead}>
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="topbar-notifications__body">
            {loading ? <div className="topbar-notifications__status">Loading...</div> : null}
            {error ? <div className="topbar-notifications__status topbar-notifications__status--error">{error}</div> : null}
            {!loading && !error && notifications.length === 0 ? (
              <div className="topbar-notifications__status">No notifications yet.</div>
            ) : null}

            {notifications.map((notification) => {
              const isSystemNotification = !notification.actorAvatarUrl
                && !notification.actorDisplayName
                && !notification.actorUsername;
              let avatarNode;

              if (notification.actorAvatarUrl) {
                avatarNode = <img src={notification.actorAvatarUrl} alt={notification.actorDisplayName || notification.actorUsername || "Actor"} />;
              } else if (isSystemNotification) {
                avatarNode = <img src={canvasiaLogo} alt="Canvasia" />;
              } else {
                avatarNode = <span>{(notification.actorDisplayName || notification.actorUsername || "C").charAt(0).toUpperCase()}</span>;
              }

              return (
                <button
                  key={notification.notificationId}
                  type="button"
                  className={`topbar-notifications__item${notification.isRead ? "" : " topbar-notifications__item--unread"}`}
                  onClick={() => onNotificationClick(notification)}
                >
                  <div className="topbar-notifications__avatar">
                    {avatarNode}
                  </div>
                  <div className="topbar-notifications__content">
                    <strong>{notification.actorDisplayName || notification.actorUsername || "Canvasia"}</strong>
                    <span>{notification.content}</span>
                    <time dateTime={notification.createdAt}>{formatNotificationTime(notification.createdAt)}</time>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationDropdown;