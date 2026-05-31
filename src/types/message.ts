export type ConversationSummary = {
  conversationId: string;
  otherUserId: string;
  otherUsername: string;
  otherDisplayName: string;
  otherAvatarUrl: string | null;
  lastMessagePreview: string | null;
  lastSenderId: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type ChatMessage = {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarUrl: string | null;
  content: string;
  createdAt: string;
  readAt: string | null;
};

export type MessagePageResponse = {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};
