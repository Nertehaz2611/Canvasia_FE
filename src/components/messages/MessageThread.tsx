import { useRef, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import type { ChatMessage, ConversationSummary } from "../../types/message";
import { getMessages, markConversationRead } from "../../services/messageService";

type Props = {
  conversation: ConversationSummary;
  myUsername: string;
  liveMessages: ChatMessage[];
  onSend: (content: string) => void | Promise<void>;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageAvatar({
  name,
  url,
  size,
}: Readonly<{
  name: string;
  url: string | null;
  size: "sm";
}>) {
  const cls =
    size === "sm"
      ? { img: "msg-bubble-row__avatar", placeholder: "msg-bubble-row__avatar-placeholder" }
      : { img: "msg-thread__header-avatar", placeholder: "msg-thread__header-avatar-placeholder" };

  if (url) return <img className={cls.img} src={url} alt={name} />;
  return (
    <div className={cls.placeholder} aria-hidden>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function MessageThread({
  conversation,
  myUsername,
  liveMessages,
  onSend,
}: Readonly<Props>) {
  const [historicalMessages, setHistoricalMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load initial messages when conversation changes
  useEffect(() => {
    setHistoricalMessages([]);
    setCursor(null);
    setHasMore(false);

    let active = true;
    setLoadingHistory(true);

    getMessages(conversation.conversationId).then((page) => {
      if (!active) return;
      // API returns newest-first; reverse to display oldest-first
      setHistoricalMessages([...page.messages].reverse());
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setLoadingHistory(false);
      // Scroll to bottom after React renders the messages
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
      });
    }).catch((err) => {
      if (active) {
        console.error("[MessageThread] getMessages failed:", err?.response?.status, err?.message);
        setLoadingHistory(false);
      }
    });

    markConversationRead(conversation.conversationId)
      .then(() => {
        globalThis.dispatchEvent(new Event("canvasia:messages-read"));
      })
      .catch(() => null);

    return () => { active = false; };
  }, [conversation.conversationId]);

  // Scroll to bottom when new live messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingHistory) return;
    const prevHeight = listRef.current?.scrollHeight ?? 0;
    setLoadingHistory(true);
    try {
      const page = await getMessages(conversation.conversationId, cursor);
      setHistoricalMessages((prev) => [...[...page.messages].reverse(), ...prev]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      // preserve scroll position after prepend
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight - prevHeight;
        }
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [conversation.conversationId, cursor, hasMore, loadingHistory]);

  // Deduplicate live messages already in history
  const historicalIds = new Set(historicalMessages.map((m) => m.messageId));
  const filteredLive = liveMessages.filter(
    (m) => m.conversationId === conversation.conversationId && !historicalIds.has(m.messageId),
  );

  const allMessages = [...historicalMessages, ...filteredLive];

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="msg-thread">
      {/* Header */}
      <div className="msg-thread__header">
        <Link to={`/${conversation.otherUsername}`} className="msg-thread__header-profile-link">
          {conversation.otherAvatarUrl ? (
            <img
              className="msg-thread__header-avatar"
              src={conversation.otherAvatarUrl}
              alt={conversation.otherDisplayName}
            />
          ) : (
            <div className="msg-thread__header-avatar-placeholder" aria-hidden>
              {conversation.otherDisplayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="msg-thread__header-name">{conversation.otherDisplayName}</span>
          <span className="msg-thread__header-username">
            @{conversation.otherUsername}
          </span>
        </Link>
      </div>

      {/* Messages */}
      <div className="msg-thread__messages" ref={listRef}>
        {hasMore && (
          <button
            type="button"
            className="msg-thread__load-more"
            onClick={() => void loadMore()}
            disabled={loadingHistory}
          >
            {loadingHistory ? "Loading…" : "Load older messages"}
          </button>
        )}

        {allMessages.length === 0 && !loadingHistory && (
          <div className="msg-thread__empty">
            <span>No messages yet. Say hi! 👋</span>
          </div>
        )}

        {allMessages.map((msg) => {
          const isMine = msg.senderUsername === myUsername;
          return (
            <div
              key={msg.messageId}
              className={`msg-bubble-row${isMine ? " msg-bubble-row--mine" : ""}`}
            >
              {!isMine && (
                <MessageAvatar
                  name={msg.senderDisplayName}
                  url={msg.senderAvatarUrl}
                  size="sm"
                />
              )}
              <div className={`msg-bubble${isMine ? " msg-bubble--mine" : " msg-bubble--theirs"}`}>
                {msg.content}
                <time className="msg-bubble__time" dateTime={msg.createdAt}>
                  {formatTime(msg.createdAt)}
                </time>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="msg-input">
        <textarea
          className="msg-input__field"
          placeholder="Type a message…"
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Message input"
        />
        <button
          type="button"
          className="msg-input__send"
          onClick={handleSend}
          disabled={!input.trim()}
          aria-label="Send message"
        >
          <SendRoundedIcon fontSize="small" />
        </button>
      </div>
    </div>
  );
}
