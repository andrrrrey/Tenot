import type { Category } from '@/services/categories';

export type FlatCategory = Category & { depth: number };

export function flattenCategories(categories: Category[], depth = 0): FlatCategory[] {
  return categories.flatMap((category) => [
    { ...category, depth },
    ...flattenCategories(category.children || [], depth + 1),
  ]);
}

export function findCategory(categories: Category[], id: number): Category | null {
  for (const category of categories) {
    if (category.id === id) return category;
    const child = findCategory(category.children || [], id);
    if (child) return child;
  }
  return null;
}

export function categoryHasAutoProfile(categories: Category[], id: number) {
  const category = findCategory(categories, id);
  return category?.filterProfile === 'AUTO' || !!category?.hasCarFilter;
}
