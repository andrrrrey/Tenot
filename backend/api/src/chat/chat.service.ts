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

  getChats(userId: number) {
    return this.prisma.chat.findMany({
      where: { OR: [{ initiatorId: userId }, { ownerId: userId }] },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
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
