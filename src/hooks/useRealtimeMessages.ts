import { useEffect, useRef, useCallback, useState } from "react";
import { wsService } from "../services/websocketService";
import type { ChatMessage, ConversationSummary } from "../types/message";

type UseRealtimeMessagesOptions = {
  onNewMessage?: (msg: ChatMessage) => void;
  onConversationUpdate?: (conv: ConversationSummary) => void;
};

export function useRealtimeMessages({
  onNewMessage,
  onConversationUpdate,
}: UseRealtimeMessagesOptions) {
  const [connected, setConnected] = useState(false);

  const onNewMessageRef = useRef(onNewMessage);
  const onConversationUpdateRef = useRef(onConversationUpdate);
  onNewMessageRef.current = onNewMessage;
  onConversationUpdateRef.current = onConversationUpdate;

  useEffect(() => {
    let active = true;

    const connect = async () => {
      try {
        await wsService.subscribe("/user/queue/messages", (body) => {
          if (active) onNewMessageRef.current?.(body as ChatMessage);
        });
        await wsService.subscribe("/user/queue/conversations", (body) => {
          if (active) onConversationUpdateRef.current?.(body as ConversationSummary);
        });
        if (active) setConnected(true);
      } catch {
        if (active) setConnected(false);
      }
    };

    void connect();

    return () => {
      active = false;
      wsService.unsubscribe("/user/queue/messages");
      wsService.unsubscribe("/user/queue/conversations");
    };
  }, []);

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      wsService.send("/app/message.send", { conversationId, content });
    },
    [],
  );

  return { connected, sendMessage };
}
