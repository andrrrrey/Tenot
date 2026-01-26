import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  getUsers() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  setUserRole(id: number, role: 'BUYER' | 'SUPPLIER' | 'ADMIN') {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true, createdAt: true },
    });
  }

  getListings() {
    return this.prisma.listing.findMany({
      include: {
        category: true,
        supplier: { select: { id: true, name: true, phone: true, userId: true } },
        images: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  toggleListing(id: number, isActive: boolean) {
    return this.prisma.listing.update({
      where: { id },
      data: { isActive },
      include: { category: true, supplier: true, images: true },
    });
  }

  async getStats() {
    const [users, listings, chats, messages] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.chat.count(),
      this.prisma.message.count(),
    ]);
    return { users, listings, chats, messages };
  }

  async getDashboardStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Basic counts
    const [
      totalUsers,
      totalListings,
      totalChats,
      totalMessages,
      activeListings,
      inactiveListings,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.chat.count(),
      this.prisma.message.count(),
      this.prisma.listing.count({ where: { isActive: true } }),
      this.prisma.listing.count({ where: { isActive: false } }),
    ]);

    // Users by role
    const [buyers, suppliers, admins] = await Promise.all([
      this.prisma.user.count({ where: { role: 'BUYER' } }),
      this.prisma.user.count({ where: { role: 'SUPPLIER' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    // New registrations
    const [newUsersToday, newUsersWeek, newUsersMonth] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    ]);

    // New listings
    const [newListingsToday, newListingsWeek, newListingsMonth] = await Promise.all([
      this.prisma.listing.count({ where: { createdAt: { gte: today } } }),
      this.prisma.listing.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.listing.count({ where: { createdAt: { gte: monthAgo } } }),
    ]);

    // Messages activity
    const [messagesToday, messagesWeek] = await Promise.all([
      this.prisma.message.count({ where: { createdAt: { gte: today } } }),
      this.prisma.message.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    // Listings by category
    const listingsByCategory = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { listings: true } },
      },
      orderBy: { listings: { _count: 'desc' } },
    });

    // Recent users (last 10)
    const recentUsers = await this.prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Recent listings (last 10)
    const recentListings = await this.prisma.listing.findMany({
      select: {
        id: true,
        title: true,
        price: true,
        isActive: true,
        createdAt: true,
        category: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Listings pending moderation (inactive)
    const pendingModeration = await this.prisma.listing.findMany({
      where: { isActive: false },
      select: {
        id: true,
        title: true,
        price: true,
        createdAt: true,
        category: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Activity by day (last 7 days)
    const activityByDay = await this.getActivityByDay(7);

    return {
      overview: {
        totalUsers,
        totalListings,
        totalChats,
        totalMessages,
        activeListings,
        inactiveListings,
      },
      usersByRole: {
        buyers,
        suppliers,
        admins,
      },
      newUsers: {
        today: newUsersToday,
        week: newUsersWeek,
        month: newUsersMonth,
      },
      newListings: {
        today: newListingsToday,
        week: newListingsWeek,
        month: newListingsMonth,
      },
      messagesActivity: {
        today: messagesToday,
        week: messagesWeek,
      },
      listingsByCategory: listingsByCategory.map((c) => ({
        id: c.id,
        name: c.name,
        count: c._count.listings,
      })),
      recentUsers,
      recentListings,
      pendingModeration,
      activityByDay,
    };
  }

  private async getActivityByDay(days: number) {
    const result: { date: string; users: number; listings: number; messages: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const [users, listings, messages] = await Promise.all([
        this.prisma.user.count({
          where: { createdAt: { gte: dayStart, lt: dayEnd } },
        }),
        this.prisma.listing.count({
          where: { createdAt: { gte: dayStart, lt: dayEnd } },
        }),
        this.prisma.message.count({
          where: { createdAt: { gte: dayStart, lt: dayEnd } },
        }),
      ]);

      result.push({
        date: dayStart.toISOString().split('T')[0],
        users,
        listings,
        messages,
      });
    }

    return result;
  }
}
