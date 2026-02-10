import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto.create-listing';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async createByUserId(userId: number, dto: CreateListingDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found. Please re-login.');

    return this.prisma.listing.create({
      data: { ...dto, userId },
      include: { images: true, category: true, city: true, user: { select: { id: true, email: true, name: true, phone: true, cityId: true, city: true } } },
    });
  }

  async findAll(filters: {
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    cityId?: number;
  }) {
    let categoryFilter: any = undefined;
    if (filters.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: filters.categoryId },
        include: { children: true },
      });
      if (category && category.children && category.children.length > 0) {
        const ids = [category.id, ...category.children.map((c) => c.id)];
        categoryFilter = { in: ids };
      } else {
        categoryFilter = filters.categoryId;
      }
    }

    return this.prisma.listing.findMany({
      where: {
        isActive: true,
        categoryId: categoryFilter,
        cityId: filters.cityId,
        price: {
          gte: filters.minPrice,
          lte: filters.maxPrice,
        },
        OR: filters.search
          ? [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        images: true,
        user: { select: { id: true, email: true, name: true, phone: true, cityId: true, city: true } },
        category: true,
        city: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.listing.findUnique({
      where: { id },
      include: { images: true, user: { select: { id: true, email: true, name: true, phone: true, cityId: true, city: true } }, category: true, city: true },
    });
  }

  async update(id: number, userId: number, dto: Partial<CreateListingDto>) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException();
    if (listing.userId !== userId) throw new UnauthorizedException('Not the owner');
    return this.prisma.listing.update({
      where: { id },
      data: dto,
      include: { images: true, category: true, city: true },
    });
  }

  toggle(id: number, isActive: boolean) {
    return this.prisma.listing.update({
      where: { id },
      data: { isActive },
      include: { images: true, category: true, city: true },
    });
  }

  getMyListings(userId: number) {
    return this.prisma.listing.findMany({
      where: { userId },
      include: { images: true, category: true, city: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteByOwner(id: number, userId: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId !== userId) throw new UnauthorizedException('Not the owner');

    await this.prisma.favorite.deleteMany({ where: { listingId: id } });
    await this.prisma.listingImage.deleteMany({ where: { listingId: id } });
    await this.prisma.message.deleteMany({
      where: { chat: { listingId: id } },
    });
    await this.prisma.chat.deleteMany({ where: { listingId: id } });
    await this.prisma.listing.delete({ where: { id } });

    return { deleted: true };
  }
}
