'use client';

import { useEffect, useState } from 'react';
import { getCategoryFields, type CategoryField } from '@/services/categories';
import type { AttributeFilter, ListingAttributeValue } from '@/services/listings';

export function DynamicAttributeFields({
  categoryId,
  values,
  onChange,
}: {
  categoryId: string;
  values: Record<string, ListingAttributeValue>;
  onChange: (values: Record<string, ListingAttributeValue>) => void;
}) {
  const [fields, setFields] = useState<CategoryField[]>([]);

  useEffect(() => {
    if (!categoryId) { setFields([]); return; }
    let active = true;
    getCategoryFields(Number(categoryId)).then((result) => { if (active) setFields(result); }).catch(() => { if (active) setFields([]); });
    return () => { active = false; };
  }, [categoryId]);

  const visible = fields.filter((field) => field.showInForm);
  if (!visible.length) return null;

  const setValue = (field: CategoryField, value: ListingAttributeValue) => {
    onChange({ ...values, [String(field.id)]: value });
  };

  return (
    <div className="dynamic-fields-panel">
      <div className="dynamic-fields-title">Характеристики</div>
      {visible.map((field) => (
        <div key={field.id}>
          <div className="field-label">
            {field.label}{field.unit ? `, ${field.unit}` : ''}{field.required ? ' *' : ''}
          </div>
          {field.type === 'SELECT' ? (
            <select value={String(values[field.id] ?? '')} onChange={(e) => setValue(field, e.target.value)}>
              <option value="">Выберите значение</option>
              {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : field.type === 'BOOLEAN' ? (
            <select value={values[field.id] === true ? 'true' : values[field.id] === false ? 'false' : ''}
              onChange={(e) => setValue(field, e.target.value === '' ? null : e.target.value === 'true')}>
              <option value="">Не указано</option><option value="true">Да</option><option value="false">Нет</option>
            </select>
          ) : field.type === 'MULTISELECT' ? (
            <select multiple value={(values[field.id] as string[]) || []}
              onChange={(e) => setValue(field, Array.from(e.target.selectedOptions, (option) => option.value))}>
              {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : (
            <input className="input" type={field.type === 'NUMBER' ? 'number' : 'text'}
              value={String(values[field.id] ?? '')}
              onChange={(e) => setValue(field, field.type === 'NUMBER' && e.target.value !== '' ? Number(e.target.value) : e.target.value)} />
          )}
        </div>
      ))}
    </div>
  );
}

export function DynamicCatalogFilters({
  categoryId,
  values,
  onChange,
}: {
  categoryId: string;
  values: Record<string, AttributeFilter>;
  onChange: (values: Record<string, AttributeFilter>) => void;
}) {
  const [fields, setFields] = useState<CategoryField[]>([]);
  useEffect(() => {
    if (!categoryId) { setFields([]); return; }
    let active = true;
    getCategoryFields(Number(categoryId)).then((result) => { if (active) setFields(result); }).catch(() => { if (active) setFields([]); });
    return () => { active = false; };
  }, [categoryId]);

  const visible = fields.filter((field) => field.filterable);
  if (!visible.length) return null;
  const setValue = (field: CategoryField, value: AttributeFilter) => onChange({ ...values, [field.id]: value });

  return (
    <div className="dynamic-catalog-fields">
      <div className="dynamic-fields-title">Характеристики</div>
      {visible.map((field) => (
        <div key={field.id}>
          <div className="field-label">{field.label}{field.unit ? `, ${field.unit}` : ''}</div>
          {field.type === 'NUMBER' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" type="number" placeholder="от" value={values[field.id]?.min ?? ''}
                onChange={(e) => setValue(field, { ...values[field.id], min: e.target.value ? Number(e.target.value) : undefined })} />
              <input className="input" type="number" placeholder="до" value={values[field.id]?.max ?? ''}
                onChange={(e) => setValue(field, { ...values[field.id], max: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          ) : field.type === 'SELECT' ? (
            <select value={String(values[field.id]?.value ?? '')}
              onChange={(e) => setValue(field, { value: e.target.value || undefined })}>
              <option value="">Любое</option>
              {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : field.type === 'BOOLEAN' ? (
            <select value={values[field.id]?.value === true ? 'true' : values[field.id]?.value === false ? 'false' : ''}
              onChange={(e) => setValue(field, { value: e.target.value === '' ? undefined : e.target.value === 'true' })}>
              <option value="">Любое</option><option value="true">Да</option><option value="false">Нет</option>
            </select>
          ) : (
            <input className="input" value={String(values[field.id]?.value ?? '')}
              onChange={(e) => setValue(field, { value: e.target.value || undefined })} />
          )}
        </div>
      ))}
    </div>
  );
}
