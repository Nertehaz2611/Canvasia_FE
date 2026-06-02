import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConversationList from "../components/messages/ConversationList";
import MessageThread from "../components/messages/MessageThread";
import NewConversationDialog from "../components/messages/NewConversationDialog";
import { useRealtimeMessages } from "../hooks/useRealtimeMessages";
import { getConversations, markConversationRead, sendMessageHttp } from "../services/messageService";
import { getMyProfile } from "../services/socialService";
import type { ChatMessage, ConversationSummary } from "../types/message";
import type { Profile } from "../types/social";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import "../styles/messages.css";

export default function MessagesPage() {
  const { conversationId: urlConvId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationSummary | null>(null);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const activeConversationId = activeConv?.conversationId;

  const notifyMessagesRead = () => {
    globalThis.dispatchEvent(new Event("canvasia:messages-read"));
  };

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    setConversations((prev) => prev.map((conversation) => (
      conversation.conversationId === conversationId
        ? { ...conversation, unreadCount: 0 }
        : conversation
    )));
    setActiveConv((prev) => (prev?.conversationId === conversationId ? { ...prev, unreadCount: 0 } : prev));
    await markConversationRead(conversationId).catch(() => null);
    notifyMessagesRead();
  }, []);

  // Load profile and conversations on mount.
  // After load, auto-select the conversation from URL (survives F5).
  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => null);
    getConversations()
      .then((list) => {
        setConversations(list);
        if (urlConvId) {
          const found = list.find((c) => c.conversationId === urlConvId);
          if (found) {
            setActiveConv({ ...found, unreadCount: 0 });
            void markConversationAsRead(found.conversationId);
          }
        }
      })
      .catch(() => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  // Handle an incoming live message — deduplicate in case of WS echo
  const onNewMessage = useCallback((msg: ChatMessage) => {
    setLiveMessages((prev) => {
      if (prev.some((m) => m.messageId === msg.messageId)) return prev;
      return [...prev, msg];
    });

    if (msg.conversationId === activeConversationId) {
      void markConversationAsRead(msg.conversationId);
    }
  }, [activeConversationId, markConversationAsRead]);

  // Handle a conversation list update (unread count, preview, etc.)
  // We only update mutable preview fields — never identity fields (name, avatar)
  // so a stale/buggy WS push can't overwrite the correct name/avatar.
  const onConversationUpdate = useCallback((updated: ConversationSummary) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c.conversationId === updated.conversationId);
      if (!exists) {
        // New conversation: safe to add the full object
        return [updated, ...prev];
      }
      // Existing: only refresh preview fields, keep identity intact
      return prev.map((c) => {
        if (c.conversationId !== updated.conversationId) return c;
        return {
          ...c,
          lastMessagePreview: updated.lastMessagePreview,
          lastMessageAt: updated.lastMessageAt,
          lastSenderId: updated.lastSenderId,
          unreadCount: c.conversationId === activeConversationId ? 0 : updated.unreadCount,
        };
      });
    });

    // If this conversation is active, also update its preview fields
    setActiveConv((prev) => {
      if (prev?.conversationId !== updated.conversationId) return prev;
      return {
        ...prev,
        lastMessagePreview: updated.lastMessagePreview,
        lastMessageAt: updated.lastMessageAt,
        lastSenderId: updated.lastSenderId,
        unreadCount: 0, // we're looking at it
      };
    });
  }, [activeConversationId]);

  const { sendMessage: wsSendMessage } = useRealtimeMessages({ onNewMessage, onConversationUpdate });

  const handleSelectConversation = (conv: ConversationSummary) => {
    // Do nothing if this conversation is already open
    if (activeConv?.conversationId === conv.conversationId) return;

    // Push conversationId into URL so F5 restores the open thread
    navigate(`/messages/${conv.conversationId}`, { replace: false });

    setActiveConv({ ...conv, unreadCount: 0 });
    void markConversationAsRead(conv.conversationId);
    // Clear live messages that belonged to the previous conversation
    setLiveMessages((prev) => prev.filter((m) => m.conversationId !== conv.conversationId));
  };

  const handleNewConversationCreated = (conv: ConversationSummary) => {
    setConversations((prev) => {
      if (prev.some((c) => c.conversationId === conv.conversationId)) return prev;
      return [conv, ...prev];
    });
    navigate(`/messages/${conv.conversationId}`, { replace: false });
    setActiveConv(conv);
    notifyMessagesRead();
    setShowNewDialog(false);
  };

  const handleSend = async (content: string) => {
    if (!activeConv) return;
    try {
      // HTTP saves message, pushes WS to recipient, and returns the saved message.
      // We add it to liveMessages immediately — no need for a separate WS send
      // (that would create a duplicate message in DB).
      const msg = await sendMessageHttp(activeConv.conversationId, content);
      setLiveMessages((prev) => {
        if (prev.some((m) => m.messageId === msg.messageId)) return prev;
        return [...prev, msg];
      });
    } catch {
      // HTTP failed: fall back to WS
      wsSendMessage(activeConv.conversationId, content);
    }
  };

  const myUsername = profile?.username ?? "";

  return (
    <>
      <div className="messages-page">
        <ConversationList
          conversations={conversations}
          activeId={activeConv?.conversationId ?? null}
          onSelect={handleSelectConversation}
          onNewConversation={() => setShowNewDialog(true)}
        />

        {activeConv ? (
          <MessageThread
            key={activeConv.conversationId}
            conversation={activeConv}
            myUsername={myUsername}
            liveMessages={liveMessages}
            onSend={handleSend}
          />
        ) : (
          <div className="msg-placeholder">
            <MailOutlineRoundedIcon
              className="msg-placeholder__icon"
              style={{ fontSize: "4rem", opacity: 0.25 }}
            />
            <span>Select a conversation or start a new one</span>
          </div>
        )}
      </div>

      {showNewDialog && (
        <NewConversationDialog
          onCreated={handleNewConversationCreated}
          onClose={() => setShowNewDialog(false)}
        />
      )}
    </>
  );
}
