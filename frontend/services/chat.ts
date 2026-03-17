import { api } from '@/lib/api';

export type Message = {
  id: number;
  chatId: number;
  senderId: number;
  text: string | null;
  audioUrl: string | null;
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

export const sendAudioMessage = (payload: {
  listingId: number;
  receiverId: number;
  audioBlob: Blob;
}) => {
  const formData = new FormData();
  formData.append('listingId', String(payload.listingId));
  formData.append('receiverId', String(payload.receiverId));
  formData.append('audio', payload.audioBlob, 'voice.webm');
  return api.upload<Message>('/chat/send/audio', formData);
};
