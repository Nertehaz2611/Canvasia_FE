import type { ConversationSummary } from "../../types/message";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";

type Props = {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (conv: ConversationSummary) => void;
  onNewConversation: () => void;
};

function ConversationAvatar({
  name,
  url,
}: {
  name: string;
  url: string | null;
}) {
  if (url) {
    return (
      <img className="conv-item__avatar" src={url} alt={name} />
    );
  }
  return (
    <div className="conv-item__avatar-placeholder" aria-hidden>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNewConversation,
}: Readonly<Props>) {
  return (
    <aside className="conv-list">
      <div className="conv-list__header">
        <span>Messages</span>
        <button
          type="button"
          className="conv-list__new-btn"
          onClick={onNewConversation}
          aria-label="New conversation"
        >
          <EditNoteRoundedIcon fontSize="small" />
        </button>
      </div>

      <div className="conv-list__items">
        {conversations.length === 0 && (
          <p className="conv-list__empty">No conversations yet.</p>
        )}
        {conversations.map((conv) => (
          <button
            key={conv.conversationId}
            type="button"
            className={`conv-item${activeId === conv.conversationId ? " conv-item--active" : ""}`}
            onClick={() => onSelect(conv)}
          >
            <ConversationAvatar
              name={conv.otherDisplayName}
              url={conv.otherAvatarUrl}
            />
            <div className="conv-item__body">
              <div className="conv-item__name">{conv.otherDisplayName}</div>
              <div
                className={`conv-item__preview${conv.unreadCount > 0 ? " conv-item__preview--unread" : ""}`}
              >
                {conv.lastMessagePreview ?? "Say hello!"}
              </div>
            </div>
            {conv.unreadCount > 0 && (
              <span className="conv-item__badge">{conv.unreadCount}</span>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}
