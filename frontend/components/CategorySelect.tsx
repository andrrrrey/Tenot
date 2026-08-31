'use client';

import type { Category } from '@/services/categories';
import { flattenCategories } from '@/lib/categoryTree';

export function CategorySelect({
  categories,
  value,
  onChange,
  emptyLabel = 'Выберите категорию',
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{emptyLabel}</option>
      {flattenCategories(categories).map((category) => (
        <option key={category.id} value={category.id}>
          {'— '.repeat(category.depth)}{category.name}
        </option>
      ))}
    </select>
  );
}
