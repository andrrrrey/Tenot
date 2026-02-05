import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  add(userId: number, listingId: number) {
    return this.prisma.favorite.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: { userId, listingId },
      update: {},
    });
  }

  remove(userId: number, listingId: number) {
    return this.prisma.favorite.deleteMany({ where: { userId, listingId } });
  }

  getAll(userId: number) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: { listing: { include: { images: true, category: true } } },
      orderBy: { id: 'desc' },
    });
  }
}
