import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const LISTING_INCLUDE = {
  category: { include: { parent: true } },
  user: { select: { id: true, email: true, name: true } },
  images: true,
} as const;

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
      include: LISTING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  toggleListing(id: number, isActive: boolean) {
    return this.prisma.listing.update({
      where: { id },
      data: { isActive },
      include: LISTING_INCLUDE,
    });
  }

  async changeListingOwner(id: number, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    return this.prisma.listing.update({
      where: { id },
      data: { userId },
      include: LISTING_INCLUDE,
    });
  }

  async bulkChangeOwner(listingIds: number[], userId: number) {
    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      throw new BadRequestException('Не выбрано ни одного объявления');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const result = await this.prisma.listing.updateMany({
      where: { id: { in: listingIds } },
      data: { userId },
    });

    return { count: result.count };
  }

  async getStats() {
    const [users, listings, chats, messages, reviews, pendingReviews] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.chat.count(),
      this.prisma.message.count(),
      this.prisma.review.count(),
      this.prisma.review.count({ where: { status: 'PENDING' } }),
    ]);
    return { users, listings, chats, messages, reviews, pendingReviews };
  }

  getReviews(status?: ReviewStatus) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.review.findMany({
      where,
      include: {
        author: { select: { id: true, email: true, name: true, avatarUrl: true } },
        target: { select: { id: true, email: true, name: true } },
        listing: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  approveReview(id: number) {
    return this.prisma.review.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  rejectReview(id: number) {
    return this.prisma.review.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }
}
