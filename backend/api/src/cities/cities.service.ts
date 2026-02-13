import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.city.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async search(query: string) {
    const where = query.trim()
      ? {
          name: {
            contains: query.trim(),
            mode: 'insensitive' as const,
          },
        }
      : {};

    const cities = await this.prisma.city.findMany({
      where,
      include: {
        region: { select: { id: true, name: true } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      take: 30,
    });

    return cities;
  }
}
