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
    const q = query.trim();

    if (!q) {
      // No query — show all cities (no regions) alphabetically
      return this.prisma.city.findMany({
        where: { type: { not: 'REGION' } },
        include: { region: { select: { id: true, name: true } } },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        take: 30,
      });
    }

    const qLower = q.toLowerCase();

    // 1. Find regions whose name matches the query
    const regions = await this.prisma.city.findMany({
      where: {
        type: 'REGION',
        name: { contains: q, mode: 'insensitive' },
      },
      include: { region: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      take: 5,
    });

    // 2. Find cities/towns/villages whose OWN name matches (not region name)
    const cities = await this.prisma.city.findMany({
      where: {
        type: { not: 'REGION' },
        name: { contains: q, mode: 'insensitive' },
      },
      include: { region: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      take: 25,
    });

    // Smart ranking: items starting with the query come first
    const sortByRelevance = <T extends { name: string }>(items: T[]): T[] => {
      return [...items].sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(qLower);
        const bStarts = b.name.toLowerCase().startsWith(qLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name, 'ru');
      });
    };

    return [...sortByRelevance(regions), ...sortByRelevance(cities)];
  }
}
