import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CarMakesService {
  constructor(private prisma: PrismaService) {}

  findAllMakes() {
    return this.prisma.carMake.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  findModelsByMake(makeId: number) {
    return this.prisma.carModel.findMany({
      where: { makeId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, generation: true, yearFrom: true, yearTo: true },
    });
  }
}
