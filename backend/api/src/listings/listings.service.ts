import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto.create-listing';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async createByUserId(userId: number, dto: CreateListingDto) {
    return this.prisma.listing.create({
      data: { ...dto, userId },
      include: { images: true, category: true, user: true },
    });
  }

  async findAll(filters: {
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
  }) {
    return this.prisma.listing.findMany({
      where: {
        isActive: true,
        categoryId: filters.categoryId,
        price: {
          gte: filters.minPrice,
          lte: filters.maxPrice,
        },
        OR: filters.search
          ? [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { article: { contains: filters.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        images: true,
        user: { select: { id: true, email: true } },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.listing.findUnique({
      where: { id },
      include: { images: true, user: { select: { id: true, email: true } }, category: true },
    });
  }

  async update(id: number, dto: Partial<CreateListingDto>) {
    const exists = await this.prisma.listing.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException();
    return this.prisma.listing.update({
      where: { id },
      data: dto,
      include: { images: true, category: true },
    });
  }

  toggle(id: number, isActive: boolean) {
    return this.prisma.listing.update({
      where: { id },
      data: { isActive },
      include: { images: true, category: true },
    });
  }

  getMyListings(userId: number) {
    return this.prisma.listing.findMany({
      where: { userId },
      include: { images: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
