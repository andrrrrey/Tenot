import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto.create-review';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(authorId: number, dto: CreateReviewDto) {
    if (authorId === dto.targetId) {
      throw new BadRequestException('Нельзя оставить отзыв самому себе');
    }

    const target = await this.prisma.user.findUnique({ where: { id: dto.targetId } });
    if (!target) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (dto.listingId) {
      const listing = await this.prisma.listing.findUnique({ where: { id: dto.listingId } });
      if (!listing || listing.userId !== dto.targetId || !listing.isActive) {
        throw new BadRequestException('Объявление не найдено или не принадлежит этому пользователю');
      }
    }

    const existing = await this.prisma.review.findUnique({
      where: { authorId_targetId: { authorId, targetId: dto.targetId } },
    });
    if (existing) {
      throw new ConflictException('Вы уже оставили отзыв этому пользователю');
    }

    return this.prisma.review.create({
      data: {
        authorId,
        targetId: dto.targetId,
        rating: dto.rating,
        satisfaction: dto.satisfaction,
        liked: dto.liked,
        disliked: dto.disliked,
        listingId: dto.listingId || null,
      },
    });
  }

  async getApprovedByUser(targetId: number) {
    return this.prisma.review.findMany({
      where: { targetId, status: 'APPROVED' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        listing: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserStats(targetId: number) {
    const result = await this.prisma.review.aggregate({
      where: { targetId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { id: true },
    });
    return {
      average: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : 0,
      count: result._count.id,
    };
  }

  async getMyReviews(authorId: number) {
    return this.prisma.review.findMany({
      where: { authorId },
      include: {
        target: { select: { id: true, name: true, avatarUrl: true } },
        listing: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
