import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  getUsers() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  setUserRole(id: number, role: 'USER' | 'ADMIN') {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true, createdAt: true },
    });
  }

  getListings() {
    return this.prisma.listing.findMany({
      include: {
        category: true,
        user: { select: { id: true, email: true } },
        images: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  toggleListing(id: number, isActive: boolean) {
    return this.prisma.listing.update({
      where: { id },
      data: { isActive },
      include: { category: true, user: { select: { id: true, email: true } }, images: true },
    });
  }

  async getStats() {
    const [users, listings, chats, messages] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.chat.count(),
      this.prisma.message.count(),
    ]);
    return { users, listings, chats, messages };
  }
}
