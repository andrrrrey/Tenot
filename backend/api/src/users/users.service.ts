import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true, cityId: true, city: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: number, data: { name?: string; phone?: string; cityId?: number | null }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: data.name, phone: data.phone, cityId: data.cityId },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true, cityId: true, city: true },
    });
  }

  async getPublicProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, createdAt: true, cityId: true, city: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
