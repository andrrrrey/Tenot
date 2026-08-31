import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto, ListingAttributeInput } from './dto.create-listing';
import { CategoriesService } from '../categories/categories.service';
import { CategoryField, CategoryFieldType, Prisma } from '@prisma/client';
import { unlinkSync } from 'fs';
import { join } from 'path';

const IMAGE_MAX_SIZE = 5 * 1024 * 1024;

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService, private categories: CategoriesService) {}

  async createByUserId(userId: number, dto: CreateListingDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found. Please re-login.');

    const { attributes, ...listingData } = dto;
    const attributeData = await this.normalizeAttributes(dto.categoryId, attributes || {}, dto.status !== 'DRAFT');
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({ data: { ...listingData, userId } });
      if (attributeData.length) {
        await tx.listingAttribute.createMany({
          data: attributeData.map((item) => ({ ...item, listingId: listing.id })),
        });
      }
      return tx.listing.findUnique({ where: { id: listing.id }, include: this.detailInclude() });
    });
  }

  async getAveragePrice(categoryId: number): Promise<{ avg: number | null }> {
    const result = await this.prisma.listing.aggregate({
      where: { categoryId, isActive: true, status: 'PUBLISHED' },
      _avg: { price: true },
    });
    return { avg: result._avg.price };
  }

  async getSearchSuggestions(q: string): Promise<string[]> {
    if (!q.trim()) return [];
    const results = await this.prisma.listing.findMany({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        title: { contains: q.trim(), mode: 'insensitive' },
      },
      select: { title: true },
      distinct: ['title'],
      take: 8,
      orderBy: { createdAt: 'desc' },
    });
    return results.map((r) => r.title);
  }

  async getFuzzyCorrection(q: string): Promise<{ correction: string | null; suggestions: string[] }> {
    const trimmed = q.trim();
    if (!trimmed) return { correction: null, suggestions: [] };

    // 1. Try exact contains first — if results exist, no correction needed
    const exactCount = await this.prisma.listing.count({
      where: { isActive: true, status: 'PUBLISHED', title: { contains: trimmed, mode: 'insensitive' } },
    });
    if (exactCount > 0) return { correction: null, suggestions: [] };

    // 2. Fetch recent distinct titles to build a word vocabulary
    const recentListings = await this.prisma.listing.findMany({
      where: { isActive: true, status: 'PUBLISHED' },
      select: { title: true },
      take: 300,
      orderBy: { createdAt: 'desc' },
    });

    // Build word frequency map
    const wordFreq = new Map<string, number>();
    for (const { title } of recentListings) {
      for (const raw of title.split(/\s+/)) {
        const w = raw.toLowerCase().replace(/[^а-яёa-z0-9]/gi, '');
        if (w.length > 1) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
      }
    }

    // For each query word, find the closest vocabulary word
    const queryWords = trimmed.toLowerCase().split(/\s+/);
    const correctedWords = queryWords.map((qw) => {
      const maxDist = Math.min(3, Math.floor(qw.length / 3) + 1);
      let bestWord = qw;
      let bestScore = Infinity; // lower = better (dist first, then freq desc)
      for (const [vw, freq] of wordFreq) {
        if (Math.abs(vw.length - qw.length) > maxDist) continue; // quick reject
        const dist = levenshtein(qw, vw);
        if (dist === 0) return qw; // exact match for this word
        if (dist <= maxDist) {
          const score = dist * 1000 - freq; // prefer smaller dist, higher freq
          if (score < bestScore) {
            bestScore = score;
            bestWord = vw;
          }
        }
      }
      return bestWord;
    });

    const correctedQuery = correctedWords.join(' ');
    if (correctedQuery === trimmed.toLowerCase()) return { correction: null, suggestions: [] };

    // 3. Verify correction actually returns results
    const correctedCount = await this.prisma.listing.count({
      where: { isActive: true, status: 'PUBLISHED', title: { contains: correctedQuery, mode: 'insensitive' } },
    });

    if (correctedCount === 0) return { correction: null, suggestions: [] };
    return { correction: correctedQuery, suggestions: [] };
  }

  async findAll(filters: {
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    cityId?: number;
    carMakeId?: number;
    carModelId?: number;
    carYearFrom?: number;
    carYearTo?: number;
    attributeFilters?: Record<string, { value?: string | number | boolean; min?: number; max?: number }>;
  }) {
    let categoryFilter: any = undefined;
    if (filters.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: filters.categoryId },
        include: { children: true },
      });
      if (category) {
        const ids = await this.getDescendantCategoryIds(category.id);
        categoryFilter = { in: ids };
      } else {
        categoryFilter = filters.categoryId;
      }
    }

    // If the selected cityId is a region, match all cities within that region
    let cityFilter: any = undefined;
    if (filters.cityId) {
      const selectedCity = await this.prisma.city.findUnique({
        where: { id: filters.cityId },
      });
      if (selectedCity?.type === 'REGION') {
        // Find all cities belonging to this region
        const childCities = await this.prisma.city.findMany({
          where: { regionId: filters.cityId },
          select: { id: true },
        });
        const ids = childCities.map((c) => c.id);
        cityFilter = { in: ids };
      } else {
        cityFilter = filters.cityId;
      }
    }

    const attributeConditions = this.attributeWhere(filters.attributeFilters);
    return this.prisma.listing.findMany({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        categoryId: categoryFilter,
        cityId: cityFilter,
        price: {
          gte: filters.minPrice,
          lte: filters.maxPrice,
        },
        ...(filters.carMakeId ? { carMakeId: filters.carMakeId } : {}),
        ...(filters.carModelId ? { carModelId: filters.carModelId } : {}),
        ...(filters.carYearFrom || filters.carYearTo
          ? { carYear: { gte: filters.carYearFrom, lte: filters.carYearTo } }
          : {}),
        ...(attributeConditions.length ? { AND: attributeConditions } : {}),
        OR: filters.search
          ? [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        images: { orderBy: [{ order: 'asc' }, { id: 'asc' }] },
        user: { select: { id: true, email: true, name: true, phone: true, avatarUrl: true, cityId: true, city: true } },
        category: true,
        city: true,
        carMake: { select: { id: true, name: true } },
        carModel: { select: { id: true, name: true, yearFrom: true, yearTo: true } },
        attributes: { include: { field: true }, orderBy: { field: { sortOrder: 'asc' } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: [{ order: 'asc' }, { id: 'asc' }] },
        user: { select: { id: true, email: true, name: true, phone: true, avatarUrl: true, cityId: true, city: true } },
        category: true,
        city: true,
        carMake: { select: { id: true, name: true } },
        carModel: { select: { id: true, name: true, yearFrom: true, yearTo: true } },
        attributes: { include: { field: true }, orderBy: { field: { sortOrder: 'asc' } } },
      },
    });
  }

  async update(id: number, userId: number, dto: Partial<CreateListingDto>) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException();
    if (listing.userId !== userId) throw new UnauthorizedException('Not the owner');
    const { attributes, ...listingData } = dto;
    const categoryId = dto.categoryId || listing.categoryId;
    const attributeData = attributes !== undefined
      ? await this.normalizeAttributes(categoryId, attributes, (dto.status || listing.status) !== 'DRAFT')
      : null;
    return this.prisma.$transaction(async (tx) => {
      await tx.listing.update({ where: { id }, data: listingData });
      if (attributeData !== null) {
        await tx.listingAttribute.deleteMany({ where: { listingId: id } });
        if (attributeData.length) {
          await tx.listingAttribute.createMany({
            data: attributeData.map((item) => ({ ...item, listingId: id })),
          });
        }
      } else if (dto.categoryId && dto.categoryId !== listing.categoryId) {
        await tx.listingAttribute.deleteMany({ where: { listingId: id } });
      }
      return tx.listing.findUnique({ where: { id }, include: this.detailInclude() });
    });
  }

  toggle(id: number, isActive: boolean) {
    return this.prisma.listing.update({
      where: { id },
      data: { isActive },
      include: this.detailInclude(),
    });
  }

  findByUserId(userId: number) {
    return this.prisma.listing.findMany({
      where: { userId, isActive: true },
      include: {
        images: { orderBy: [{ order: 'asc' }, { id: 'asc' }] },
        user: { select: { id: true, email: true, name: true, phone: true, avatarUrl: true, cityId: true, city: true } },
        category: true,
        city: true,
        carMake: { select: { id: true, name: true } },
        carModel: { select: { id: true, name: true, yearFrom: true, yearTo: true } },
        attributes: { include: { field: true }, orderBy: { field: { sortOrder: 'asc' } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getMyListings(userId: number) {
    return this.prisma.listing.findMany({
      where: { userId },
      include: this.detailInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteByOwner(id: number, userId: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId !== userId) throw new UnauthorizedException('Not the owner');

    // Delete physical files
    for (const img of listing.images) {
      this.deleteFile(img.url);
    }

    await this.prisma.favorite.deleteMany({ where: { listingId: id } });
    await this.prisma.listingImage.deleteMany({ where: { listingId: id } });
    await this.prisma.message.deleteMany({
      where: { chat: { listingId: id } },
    });
    await this.prisma.chat.deleteMany({ where: { listingId: id } });
    await this.prisma.listing.delete({ where: { id } });

    return { deleted: true };
  }

  // ── Media methods ─────────────────────────────────────────────────────────

  async uploadMedia(
    listingId: number,
    userId: number,
    files: Express.Multer.File[],
    coverIndex?: number,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { images: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId !== userId) throw new UnauthorizedException('Not the owner');

    const existingImages = listing.images.filter((i) => i.type === 'image');
    const existingVideos = listing.images.filter((i) => i.type === 'video');

    const newImages = files.filter((f) => f.mimetype.startsWith('image/'));
    const newVideos = files.filter((f) => f.mimetype.startsWith('video/'));

    // Validate counts
    if (existingImages.length + newImages.length > 10) {
      // Delete uploaded files and throw
      files.forEach((f) => this.deleteFile(`/uploads/listings/${f.filename}`));
      throw new BadRequestException('Максимум 10 изображений');
    }
    if (existingVideos.length + newVideos.length > 1) {
      files.forEach((f) => this.deleteFile(`/uploads/listings/${f.filename}`));
      throw new BadRequestException('Максимум 1 видео');
    }

    // Validate image sizes (max 5 MB)
    for (const f of newImages) {
      if (f.size > IMAGE_MAX_SIZE) {
        files.forEach((file) => this.deleteFile(`/uploads/listings/${file.filename}`));
        throw new BadRequestException(`Изображение ${f.originalname} превышает 5 МБ`);
      }
    }

    // Determine if any existing image is already a cover
    const hasCover = listing.images.some((i) => i.isCover && i.type === 'image');

    const nextOrder = listing.images.length;

    const createData = files.map((f, idx) => {
      const type = f.mimetype.startsWith('video/') ? 'video' : 'image';
      const isCover =
        type === 'image' &&
        (coverIndex !== undefined
          ? files.indexOf(f) === coverIndex
          : !hasCover && idx === newImages.indexOf(f) && idx === 0);

      return {
        listingId,
        url: `/uploads/listings/${f.filename}`,
        type,
        isCover: isCover || false,
        order: nextOrder + idx,
      };
    });

    // If a new cover is being set among the uploaded files, unset all existing covers
    const newCoverExists = createData.some((d) => d.isCover);
    if (newCoverExists) {
      await this.prisma.listingImage.updateMany({
        where: { listingId, isCover: true },
        data: { isCover: false },
      });
    }

    // If no cover at all after upload, set first image as cover
    const allImages = [...existingImages, ...newImages];
    const willHaveCover = hasCover || newCoverExists;

    await this.prisma.listingImage.createMany({ data: createData });

    if (!willHaveCover && allImages.length > 0) {
      // Set first existing image as cover
      if (existingImages.length > 0) {
        await this.prisma.listingImage.update({
          where: { id: existingImages[0].id },
          data: { isCover: true },
        });
      } else {
        // Set first newly created image as cover
        const firstNewImage = await this.prisma.listingImage.findFirst({
          where: { listingId, type: 'image' },
          orderBy: { id: 'asc' },
        });
        if (firstNewImage) {
          await this.prisma.listingImage.update({
            where: { id: firstNewImage.id },
            data: { isCover: true },
          });
        }
      }
    }

    return this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { images: { orderBy: [{ order: 'asc' }, { id: 'asc' }] } },
    });
  }

  async deleteMedia(listingId: number, userId: number, mediaId: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId !== userId) throw new UnauthorizedException('Not the owner');

    const media = await this.prisma.listingImage.findUnique({ where: { id: mediaId } });
    if (!media || media.listingId !== listingId) throw new NotFoundException('Media not found');

    this.deleteFile(media.url);
    await this.prisma.listingImage.delete({ where: { id: mediaId } });

    // If deleted item was cover, assign cover to next image
    if (media.isCover && media.type === 'image') {
      const nextImage = await this.prisma.listingImage.findFirst({
        where: { listingId, type: 'image' },
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
      });
      if (nextImage) {
        await this.prisma.listingImage.update({
          where: { id: nextImage.id },
          data: { isCover: true },
        });
      }
    }

    return { deleted: true };
  }

  async setCover(listingId: number, userId: number, mediaId: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId !== userId) throw new UnauthorizedException('Not the owner');

    const media = await this.prisma.listingImage.findUnique({ where: { id: mediaId } });
    if (!media || media.listingId !== listingId) throw new NotFoundException('Media not found');
    if (media.type !== 'image') throw new BadRequestException('Only images can be set as cover');

    // Unset all covers for this listing, then set new one
    await this.prisma.listingImage.updateMany({
      where: { listingId, isCover: true },
      data: { isCover: false },
    });
    return this.prisma.listingImage.update({
      where: { id: mediaId },
      data: { isCover: true },
    });
  }

  private async getDescendantCategoryIds(rootId: number) {
    const categories = await this.prisma.category.findMany({ select: { id: true, parentId: true } });
    const ids = new Set<number>([rootId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of categories) {
        if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
          ids.add(category.id);
          changed = true;
        }
      }
    }
    return [...ids];
  }

  private attributeWhere(filters?: Record<string, { value?: string | number | boolean; min?: number; max?: number }>) {
    if (!filters) return [];
    const result: Prisma.ListingWhereInput[] = [];
    for (const [fieldIdValue, filter] of Object.entries(filters)) {
      const fieldId = Number(fieldIdValue);
      if (!Number.isInteger(fieldId) || !filter) continue;
      if (filter.min !== undefined || filter.max !== undefined) {
        result.push({ attributes: { some: {
          categoryFieldId: fieldId,
          numberValue: { gte: filter.min, lte: filter.max },
        } } });
      } else if (typeof filter.value === 'number') {
        result.push({ attributes: { some: { categoryFieldId: fieldId, numberValue: filter.value } } });
      } else if (typeof filter.value === 'boolean') {
        result.push({ attributes: { some: { categoryFieldId: fieldId, booleanValue: filter.value } } });
      } else if (typeof filter.value === 'string' && filter.value.trim()) {
        result.push({ attributes: { some: {
          categoryFieldId: fieldId,
          textValue: { equals: filter.value.trim(), mode: 'insensitive' },
        } } });
      }
    }
    return result;
  }

  private async normalizeAttributes(
    categoryId: number,
    values: Record<string, ListingAttributeInput>,
    validateRequired: boolean,
  ): Promise<Array<Omit<Prisma.ListingAttributeCreateManyInput, 'listingId'>>> {
    const fields = await this.categories.getEffectiveFields(categoryId);
    const fieldsById = new Map(fields.map((field) => [field.id, field]));
    const result: Array<Omit<Prisma.ListingAttributeCreateManyInput, 'listingId'>> = [];

    for (const [fieldIdValue, rawValue] of Object.entries(values)) {
      const fieldId = Number(fieldIdValue);
      const field = fieldsById.get(fieldId);
      if (!field) throw new BadRequestException(`Field ${fieldIdValue} is not available for this category`);
      if (rawValue === null || rawValue === '' || (Array.isArray(rawValue) && !rawValue.length)) continue;
      result.push(this.normalizeAttributeValue(field, rawValue));
    }

    if (validateRequired) {
      for (const field of fields.filter((item) => item.required && item.showInForm)) {
        if (!result.some((item) => item.categoryFieldId === field.id)) {
          throw new BadRequestException(`Field «${field.label}» is required`);
        }
      }
    }
    return result;
  }

  private normalizeAttributeValue(
    field: CategoryField,
    rawValue: Exclude<ListingAttributeInput, null>,
  ): Omit<Prisma.ListingAttributeCreateManyInput, 'listingId'> {
    const base = { categoryFieldId: field.id };
    if (field.type === CategoryFieldType.NUMBER) {
      const numberValue = Number(rawValue);
      if (!Number.isFinite(numberValue)) throw new BadRequestException(`Invalid value for «${field.label}»`);
      return { ...base, numberValue };
    }
    if (field.type === CategoryFieldType.BOOLEAN) {
      const booleanValue = typeof rawValue === 'boolean' ? rawValue : String(rawValue) === 'true';
      return { ...base, booleanValue };
    }
    if (field.type === CategoryFieldType.MULTISELECT) {
      const jsonValue = Array.isArray(rawValue) ? rawValue.map(String) : [String(rawValue)];
      const options = Array.isArray(field.options) ? field.options.map(String) : [];
      if (options.length && jsonValue.some((value) => !options.includes(value))) {
        throw new BadRequestException(`Invalid option for «${field.label}»`);
      }
      return { ...base, jsonValue };
    }
    if (field.type === CategoryFieldType.SELECT) {
      const textValue = String(rawValue);
      const options = Array.isArray(field.options) ? field.options.map(String) : [];
      if (options.length && !options.includes(textValue)) {
        throw new BadRequestException(`Invalid option for «${field.label}»`);
      }
      return { ...base, textValue };
    }
    return { ...base, textValue: String(rawValue) };
  }

  private detailInclude(): Prisma.ListingInclude {
    return {
      images: { orderBy: [{ order: 'asc' }, { id: 'asc' }] },
      category: true,
      city: true,
      carMake: { select: { id: true, name: true } },
      carModel: { select: { id: true, name: true, yearFrom: true, yearTo: true } },
      attributes: { include: { field: true }, orderBy: { field: { sortOrder: 'asc' } } },
      user: { select: { id: true, email: true, name: true, phone: true, avatarUrl: true, cityId: true, city: true } },
    };
  }

  private deleteFile(url: string) {
    try {
      // url looks like /uploads/listings/filename.jpg
      const relativePath = url.startsWith('/') ? url.slice(1) : url;
      unlinkSync(join(process.cwd(), relativePath));
    } catch {
      // File may not exist — ignore
    }
  }
}
