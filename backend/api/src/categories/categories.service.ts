import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(data: { name: string; imageUrl?: string; parentId?: number }) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        imageUrl: data.imageUrl || null,
        parentId: data.parentId || null,
      },
      include: { children: true, parent: true },
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
      include: {
        children: {
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  async update(id: number, data: { name?: string; imageUrl?: string; hasCarFilter?: boolean }) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Category not found');
    return this.prisma.category.update({
      where: { id },
      data,
      include: { children: true, parent: true },
    });
  }

  remove(id: number) {
    return this.prisma.category.delete({ where: { id } });
  }
}
