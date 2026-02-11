import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  getUsers() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
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

  async getListings(filters?: {
    search?: string;
    categoryId?: number;
    userId?: number;
    isActive?: boolean;
  }) {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: filters.categoryId },
        include: { children: true },
      });
      if (category && category.children && category.children.length > 0) {
        where.categoryId = { in: [category.id, ...category.children.map((c) => c.id)] };
      } else {
        where.categoryId = filters.categoryId;
      }
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.listing.findMany({
      where,
      include: {
        category: { include: { parent: true } },
        user: { select: { id: true, email: true, name: true } },
        images: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  toggleListing(id: number, isActive: boolean) {
    return this.prisma.listing.update({
      where: { id },
      data: { isActive },
      include: {
        category: { include: { parent: true } },
        user: { select: { id: true, email: true, name: true } },
        images: true,
      },
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
