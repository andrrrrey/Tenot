import { api } from '@/lib/api';

export type Message = {
  id: number;
  chatId: number;
  senderId: number;
  text: string;
  isRead: boolean;
  createdAt: string;
};

export type ChatUser = { id: number; name?: string | null; avatarUrl?: string | null };

export type Chat = {
  id: number;
  initiatorId: number;
  ownerId: number;
  listingId: number;
  messages: Message[];
  initiator?: ChatUser;
  owner?: ChatUser;
  listing?: { id: number; title: string };
  _count?: { messages: number };
};

export const getMyChats = () => api.get<Chat[]>('/chat/my');
export const getMessages = (chatId: number) => api.get<Message[]>(`/chat/${chatId}/messages`);
export const sendMessage = (payload: { listingId: number; receiverId: number; text: string }) =>
  api.post<Message>('/chat/send', payload);
export const markChatRead = (chatId: number) =>
  api.patch<{ ok: boolean }>(`/chat/${chatId}/read`);
