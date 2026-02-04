import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto.create-message';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(sender: { userId: number; role: string }, dto: CreateMessageDto) {
    const listing = await this.prisma.listing.findUnique({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    // Determine buyer (inquirer) and supplier (listing owner) based on listing ownership
    let buyerId: number;
    let supplierId: number;

    if (sender.userId === listing.userId) {
      // Sender is the listing owner (supplier side)
      supplierId = sender.userId;
      buyerId = dto.receiverId;
    } else {
      // Sender is the inquirer (buyer side)
      buyerId = sender.userId;
      supplierId = dto.receiverId;
      // Verify receiver is the listing owner
      if (listing.userId !== supplierId) {
        throw new BadRequestException('Receiver must be the listing owner');
      }
    }

    let chat = await this.prisma.chat.findFirst({
      where: { listingId: dto.listingId, buyerId, supplierId },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: { listingId: dto.listingId, buyerId, supplierId },
      });
    }

    return this.prisma.message.create({
      data: { chatId: chat.id, senderId: sender.userId, text: dto.text },
    });
  }

  getChats(userId: number) {
    return this.prisma.chat.findMany({
      where: { OR: [{ buyerId: userId }, { supplierId: userId }] },
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
        chat: { OR: [{ buyerId: userId }, { supplierId: userId }] },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
