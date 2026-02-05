import { api } from '@/lib/api';

export type Message = { id: number; chatId: number; senderId: number; text: string; createdAt: string };
export type Chat = { id: number; initiatorId: number; ownerId: number; listingId: number; messages: Message[] };

export const getMyChats = () => api.get<Chat[]>('/chat/my');
export const getMessages = (chatId: number) => api.get<Message[]>(`/chat/${chatId}/messages`);
export const sendMessage = (payload: { listingId: number; receiverId: number; text: string }) =>
  api.post<Message>('/chat/send', payload);
