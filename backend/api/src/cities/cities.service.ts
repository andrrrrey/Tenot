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

    const conditions: any[] = [{ type: { not: 'REGION' } }];

    if (q) {
      conditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { region: { name: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }

    const cities = await this.prisma.city.findMany({
      where: { AND: conditions },
      include: {
        region: { select: { id: true, name: true } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      take: 30,
    });

    return cities;
  }
}
