import { useEffect, useRef, useState } from "react";
import { wsService } from "../services/websocketService";
import type { NotificationItem } from "../types/notification";

type UseRealtimeNotificationsOptions = {
  onNotification?: (notification: NotificationItem) => void;
};

export function useRealtimeNotifications({ onNotification }: UseRealtimeNotificationsOptions) {
  const [connected, setConnected] = useState(false);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  useEffect(() => {
    let active = true;

    const connect = async () => {
      try {
        await wsService.subscribe("/user/queue/notifications", (body) => {
          if (active) {
            onNotificationRef.current?.(body as NotificationItem);
          }
        });
        if (active) {
          setConnected(true);
        }
      } catch {
        if (active) {
          setConnected(false);
        }
      }
    };

    void connect();

    return () => {
      active = false;
      wsService.unsubscribe("/user/queue/notifications");
    };
  }, []);

  return { connected };
}