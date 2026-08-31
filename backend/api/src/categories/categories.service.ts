import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { CategoryFieldType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FILTER_PROFILES, FILTER_TEMPLATES, FilterTemplateNode } from './filter-templates';

const FILTER_TEMPLATE_VERSION = 1;

export type CategoryTreeItem = {
  id: number; name: string; imageUrl: string | null; parentId: number | null;
  hasCarFilter: boolean; filterProfile: string | null; templateKey: string | null;
  children: CategoryTreeItem[];
};

export type CategoryFieldInput = {
  key?: string; label: string; type?: CategoryFieldType; unit?: string | null;
  options?: string[] | null; required?: boolean; filterable?: boolean;
  showInForm?: boolean; sortOrder?: number;
};

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const result = await this.syncTemplates(false);
    this.logger.log(
      result.skipped
        ? `Category templates are up to date (${result.categories} categories)`
        : `Category templates synchronized: +${result.addedCategories} categories, +${result.addedFields} fields`,
    );
  }

  getFilterProfiles() { return FILTER_PROFILES; }

  async create(data: { name: string; imageUrl?: string; parentId?: number; filterProfile?: string }) {
    const profile = this.normalizeProfile(data.filterProfile);
    const category = await this.prisma.category.create({
      data: {
        name: data.name, imageUrl: data.imageUrl || null, parentId: data.parentId || null,
        filterProfile: profile, hasCarFilter: profile === 'AUTO',
      },
    });
    if (profile && profile !== 'AUTO') await this.applyTemplate(profile, category.id);
    return this.findOneTree(category.id);
  }

  async findAll(): Promise<CategoryTreeItem[]> {
    const categories = await this.prisma.category.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] });
    return this.buildTree(categories);
  }

  async findOneTree(id: number) {
    const find = (items: CategoryTreeItem[]): CategoryTreeItem | null => {
      for (const item of items) {
        if (item.id === id) return item;
        const child = find(item.children);
        if (child) return child;
      }
      return null;
    };
    return find(await this.findAll());
  }

  async getEffectiveFields(categoryId: number) {
    const chain: number[] = [];
    let currentId: number | null = categoryId;
    while (currentId) {
      const category: { id: number; parentId: number | null } | null = await this.prisma.category.findUnique({
        where: { id: currentId }, select: { id: true, parentId: true },
      });
      if (!category) throw new NotFoundException('Category not found');
      chain.unshift(category.id);
      currentId = category.parentId;
    }
    const fields = await this.prisma.categoryField.findMany({
      where: { categoryId: { in: chain } }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const byKey = new Map<string, (typeof fields)[number]>();
    for (const chainId of chain) {
      for (const field of fields.filter((item) => item.categoryId === chainId)) byKey.set(field.key, field);
    }
    return [...byKey.values()];
  }

  async createField(categoryId: number, input: CategoryFieldInput) {
    await this.ensureCategory(categoryId);
    const key = input.key?.trim() || this.toFieldKey(input.label);
    return this.prisma.categoryField.create({ data: this.fieldData(categoryId, key, input) });
  }

  async updateField(categoryId: number, fieldId: number, input: Partial<CategoryFieldInput>) {
    const field = await this.prisma.categoryField.findFirst({ where: { id: fieldId, categoryId } });
    if (!field) throw new NotFoundException('Category field not found');
    return this.prisma.categoryField.update({
      where: { id: fieldId },
      data: {
        ...(input.key !== undefined ? { key: input.key.trim() } : {}),
        ...(input.label !== undefined ? { label: input.label.trim() } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.unit !== undefined ? { unit: input.unit || null } : {}),
        ...(input.options !== undefined ? { options: input.options as Prisma.InputJsonValue } : {}),
        ...(input.required !== undefined ? { required: input.required } : {}),
        ...(input.filterable !== undefined ? { filterable: input.filterable } : {}),
        ...(input.showInForm !== undefined ? { showInForm: input.showInForm } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });
  }

  async removeField(categoryId: number, fieldId: number) {
    const field = await this.prisma.categoryField.findFirst({ where: { id: fieldId, categoryId } });
    if (!field) throw new NotFoundException('Category field not found');
    return this.prisma.categoryField.delete({ where: { id: fieldId } });
  }

  async update(id: number, data: { name?: string; imageUrl?: string; hasCarFilter?: boolean; filterProfile?: string }) {
    await this.ensureCategory(id);
    const profile = data.filterProfile !== undefined
      ? this.normalizeProfile(data.filterProfile)
      : data.hasCarFilter !== undefined ? (data.hasCarFilter ? 'AUTO' : null) : undefined;
    await this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(profile !== undefined ? { filterProfile: profile, hasCarFilter: profile === 'AUTO' } : {}),
      },
    });
    if (profile && profile !== 'AUTO') await this.applyTemplate(profile, id);
    return this.findOneTree(id);
  }

  async remove(id: number, force = false) {
    const category = await this.ensureCategory(id);
    if (category.templateKey && !force) {
      throw new BadRequestException('System category deletion requires explicit confirmation');
    }
    const ids = await this.getDescendantIds(id);
    const listings = await this.prisma.listing.count({ where: { categoryId: { in: ids } } });
    if (listings > 0) {
      throw new BadRequestException(`Category tree contains ${listings} listings and cannot be deleted`);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.category.deleteMany({ where: { id: { in: ids } } });
      if (category.templateKey && category.filterProfile) {
        await tx.filterTemplateState.deleteMany({ where: { profile: category.filterProfile } });
      }
    });
    return { deleted: true, count: ids.length };
  }

  async importProfile(profileValue: string) {
    const profile = this.normalizeProfile(profileValue);
    if (!profile || profile === 'AUTO') throw new BadRequestException('Profile has no importable tree');
    const template = FILTER_TEMPLATES.find((item) => item.profile === profile)!;
    let root = await this.prisma.category.findUnique({ where: { templateKey: template.root.templateKey } });
    if (!root) root = await this.prisma.category.findFirst({ where: { name: template.name, parentId: null } });
    if (!root) {
      root = await this.prisma.category.create({
        data: { name: template.name, filterProfile: profile, templateKey: template.root.templateKey },
      });
    }
    await this.applyTemplate(profile, root.id);
    await this.prisma.filterTemplateState.upsert({
      where: { profile },
      create: { profile, version: FILTER_TEMPLATE_VERSION },
      update: { version: FILTER_TEMPLATE_VERSION },
    });
    return this.findOneTree(root.id);
  }

  async syncTemplates(force = false) {
    const beforeCategories = await this.prisma.category.count({ where: { templateKey: { not: null } } });
    const beforeFields = await this.prisma.categoryField.count({
      where: { category: { templateKey: { not: null } } },
    });
    let synchronized = false;

    for (const template of FILTER_TEMPLATES) {
      const [state, root] = await Promise.all([
        this.prisma.filterTemplateState.findUnique({ where: { profile: template.profile } }),
        this.prisma.category.findUnique({ where: { templateKey: template.root.templateKey } }),
      ]);
      if (!force && state?.version === FILTER_TEMPLATE_VERSION && root) continue;
      await this.importProfile(template.profile);
      synchronized = true;
    }

    const [categories, fields] = await Promise.all([
      this.prisma.category.count({ where: { templateKey: { not: null } } }),
      this.prisma.categoryField.count({ where: { category: { templateKey: { not: null } } } }),
    ]);
    return {
      skipped: !synchronized,
      version: FILTER_TEMPLATE_VERSION,
      categories,
      fields,
      addedCategories: categories - beforeCategories,
      addedFields: fields - beforeFields,
    };
  }

  private async applyTemplate(profile: string, rootCategoryId: number) {
    const template = FILTER_TEMPLATES.find((item) => item.profile === profile);
    if (!template) throw new BadRequestException('Unknown filter profile');
    await this.prisma.category.update({
      where: { id: rootCategoryId },
      data: { filterProfile: profile, hasCarFilter: false, templateKey: template.root.templateKey },
    });
    await this.upsertFields(rootCategoryId, template.root);
    for (const child of template.root.children) await this.upsertTemplateNode(child, rootCategoryId, profile);
  }

  private async upsertTemplateNode(node: FilterTemplateNode, parentId: number, profile: string) {
    const category = await this.prisma.category.upsert({
      where: { templateKey: node.templateKey },
      create: { name: node.name, parentId, filterProfile: profile, templateKey: node.templateKey },
      update: { name: node.name, parentId, filterProfile: profile },
    });
    await this.upsertFields(category.id, node);
    for (const child of node.children) await this.upsertTemplateNode(child, category.id, profile);
  }

  private async upsertFields(categoryId: number, node: FilterTemplateNode) {
    if (!node.fields.length) return;
    await this.prisma.categoryField.createMany({
      data: node.fields.map((field) => ({
        ...field, categoryId, type: field.type, options: field.options ?? Prisma.JsonNull,
      })),
      skipDuplicates: true,
    });
  }

  private buildTree(categories: Array<Omit<CategoryTreeItem, 'children'>>) {
    const map = new Map<number, CategoryTreeItem>();
    for (const category of categories) map.set(category.id, { ...category, children: [] });
    const roots: CategoryTreeItem[] = [];
    for (const category of map.values()) {
      if (category.parentId && map.has(category.parentId)) map.get(category.parentId)!.children.push(category);
      else roots.push(category);
    }
    return roots;
  }

  private normalizeProfile(profile?: string | null) {
    if (!profile || profile === 'NONE') return null;
    if (!FILTER_PROFILES.some((item) => item.value === profile)) throw new BadRequestException('Unknown filter profile');
    return profile;
  }

  private fieldData(categoryId: number, key: string, input: CategoryFieldInput) {
    return {
      categoryId, key, label: input.label.trim(), type: input.type || CategoryFieldType.TEXT,
      unit: input.unit || null, options: (input.options || Prisma.JsonNull) as Prisma.InputJsonValue,
      required: input.required ?? false, filterable: input.filterable ?? true,
      showInForm: input.showInForm ?? true, sortOrder: input.sortOrder ?? 0,
    };
  }

  private toFieldKey(label: string) {
    return label.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]+/gi, '_').replace(/^_+|_+$/g, '');
  }

  private async ensureCategory(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async getDescendantIds(rootId: number) {
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
}
