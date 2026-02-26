import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto.create-message';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(sender: { userId: number; role: string }, dto: CreateMessageDto) {
    const listing = await this.prisma.listing.findUnique({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    const listingOwnerId = listing.userId;

    let initiatorId: number;
    let ownerId: number;

    if (sender.userId === listingOwnerId) {
      // Sender is the listing owner, receiver is the initiator
      ownerId = sender.userId;
      initiatorId = dto.receiverId;
    } else {
      // Sender is someone contacting the listing owner
      initiatorId = sender.userId;
      ownerId = listingOwnerId;
      if (dto.receiverId !== listingOwnerId) {
        throw new BadRequestException('Receiver must be the listing owner');
      }
    }

    let chat = await this.prisma.chat.findFirst({
      where: { listingId: dto.listingId, initiatorId, ownerId },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: { listingId: dto.listingId, initiatorId, ownerId },
      });
    }

    return this.prisma.message.create({
      data: { chatId: chat.id, senderId: sender.userId, text: dto.text },
    });
  }

  async markMessagesAsRead(chatId: number, userId: number) {
    await this.prisma.message.updateMany({
      where: {
        chatId,
        isRead: false,
        senderId: { not: userId },
        chat: { OR: [{ initiatorId: userId }, { ownerId: userId }] },
      },
      data: { isRead: true },
    });
    return { ok: true };
  }

  getChats(userId: number) {
    return this.prisma.chat.findMany({
      where: { OR: [{ initiatorId: userId }, { ownerId: userId }] },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        initiator: { select: { id: true, name: true, avatarUrl: true } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
        listing: { select: { id: true, title: true } },
        _count: {
          select: {
            messages: {
              where: { isRead: false, senderId: { not: userId } },
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  getMessages(chatId: number, userId: number) {
    return this.prisma.message.findMany({
      where: {
        chatId,
        chat: { OR: [{ initiatorId: userId }, { ownerId: userId }] },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
