import api from "./api";
import type {
  ChatMessage,
  ConversationSummary,
  MessagePageResponse,
} from "../types/message";

export async function getConversations(): Promise<ConversationSummary[]> {
  const res = await api.get<ConversationSummary[]>("/messages/conversations");
  return res.data;
}

export async function getOrCreateConversation(username: string): Promise<ConversationSummary> {
  const res = await api.post<ConversationSummary>("/messages/conversations", null, {
    params: { username },
  });
  return res.data;
}

export async function getMessages(
  conversationId: string,
  cursor?: string | null,
  limit = 30,
): Promise<MessagePageResponse> {
  const res = await api.get<MessagePageResponse>(`/messages/conversations/${conversationId}`, {
    params: {
      cursor: cursor || undefined,
      limit,
    },
  });
  return res.data;
}

export async function sendMessageHttp(
  conversationId: string,
  content: string,
): Promise<ChatMessage> {
  const res = await api.post<ChatMessage>("/messages/send", { conversationId, content });
  return res.data;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await api.post(`/messages/conversations/${conversationId}/read`);
}
