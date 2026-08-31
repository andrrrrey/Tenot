'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import {
  createCategory, createCategoryField, deleteCategory, deleteCategoryField,
  getCategories, getCategoryFields, getFilterProfiles, importCategoryProfile,
  updateCategoryField, updateCategoryFilterProfile, updateCategoryImage,
  type Category, type CategoryField, type FilterProfile,
} from '@/services/categories';
import { flattenCategories } from '@/lib/categoryTree';

export default function AdminCategories() {
  const { loading } = useRequireRole(['ADMIN']);
  const [items, setItems] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<FilterProfile[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [profile, setProfile] = useState('NONE');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingFieldsId, setEditingFieldsId] = useState<number | null>(null);
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CategoryField['type']>('TEXT');
  const fileRef = useRef<HTMLInputElement>(null);

  const flatItems = useMemo(() => flattenCategories(items), [items]);
  const reload = async () => setItems(await getCategories());
  const loadFields = async (id: number) => {
    setEditingFieldsId(id);
    setFields(await getCategoryFields(id));
  };

  useEffect(() => {
    Promise.all([getCategories(), getFilterProfiles()]).then(([categories, filterProfiles]) => {
      setItems(categories); setProfiles(filterProfiles);
    });
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createCategory({
        name: name.trim(), image: imageFile || undefined,
        parentId: parentId ? Number(parentId) : undefined, filterProfile: profile,
      });
      setName(''); setParentId(''); setProfile('NONE'); setImageFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await reload();
    } finally { setBusy(false); }
  };

  const importProfile = async (value: string) => {
    setBusy(true);
    try { await importCategoryProfile(value); await reload(); }
    finally { setBusy(false); }
  };

  const changeImage = async (category: Category, file?: File) => {
    if (!file) return;
    await updateCategoryImage(category.id, file); await reload();
  };

  const remove = async (category: Category) => {
    if (!confirm(`Удалить категорию «${category.name}»?`)) return;
    await deleteCategory(category.id); await reload();
  };

  const addField = async () => {
    if (!editingFieldsId || !newFieldLabel.trim()) return;
    await createCategoryField(editingFieldsId, { label: newFieldLabel.trim(), type: newFieldType });
    setNewFieldLabel('');
    await loadFields(editingFieldsId);
  };

  if (loading) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 18 }}>
        <h1 className="h2">Категории</h1>
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название категории" />
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Корневая категория</option>
            {flatItems.map((category) => (
              <option key={category.id} value={category.id}>{'— '.repeat(category.depth)}{category.name}</option>
            ))}
          </select>
          <select value={profile} onChange={(e) => setProfile(e.target.value)}>
            {profiles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          <button className="btn primary" onClick={create} disabled={busy || !name.trim()}>
            {busy ? 'Сохранение…' : 'Создать категорию'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 className="h2">Готовые структуры и фильтры</h2>
        <p className="muted" style={{ fontSize: 13 }}>Импорт можно запускать повторно — существующие записи обновятся без дубликатов.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {profiles.filter((item) => !['NONE', 'AUTO'].includes(item.value)).map((item) => (
            <button key={item.value} className="btn" disabled={busy} onClick={() => importProfile(item.value)}>
              Импортировать «{item.label}»
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 className="h2">Дерево категорий</h2>
        <div style={{ marginTop: 12 }}>
          {flatItems.map((category) => (
            <div key={category.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 220px auto', gap: 8,
              alignItems: 'center', borderTop: '1px solid var(--border)', padding: '8px 0' }}>
              <div style={{ paddingLeft: category.depth * 18, fontWeight: category.depth ? 400 : 700 }}>
                {category.depth ? '↳ ' : ''}{category.name}
              </div>
              <select value={category.filterProfile || (category.hasCarFilter ? 'AUTO' : 'NONE')}
                onChange={async (e) => { await updateCategoryFilterProfile(category.id, e.target.value); await reload(); }}>
                {profiles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => loadFields(category.id)}>Поля</button>
                <label className="btn">Фото<input hidden type="file" accept="image/*" onChange={(e) => changeImage(category, e.target.files?.[0])} /></label>
                <button className="btn" style={{ color: '#dc2626' }} onClick={() => remove(category)}>Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingFieldsId && (
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <h2 className="h2">Поля категории</h2>
            <button className="btn" onClick={() => setEditingFieldsId(null)}>Закрыть</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: 8, margin: '12px 0' }}>
            <input className="input" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="Название нового поля" />
            <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as CategoryField['type'])}>
              <option value="TEXT">Текст</option><option value="NUMBER">Число</option>
              <option value="BOOLEAN">Да / нет</option><option value="SELECT">Один вариант</option>
              <option value="MULTISELECT">Несколько вариантов</option>
            </select>
            <button className="btn primary" onClick={addField}>Добавить</button>
          </div>
          {fields.map((field) => (
            <div key={field.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1fr) 140px minmax(170px, 1fr) auto auto auto', gap: 8,
              alignItems: 'center', borderTop: '1px solid var(--border)', padding: '8px 0', opacity: field.categoryId === editingFieldsId ? 1 : 0.68 }}>
              <input className="input" value={field.label} disabled={field.categoryId !== editingFieldsId}
                onChange={(e) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, label: e.target.value } : item))} />
              <select value={field.type} disabled={field.categoryId !== editingFieldsId}
                onChange={(e) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, type: e.target.value as CategoryField['type'] } : item))}>
                <option value="TEXT">Текст</option><option value="NUMBER">Число</option><option value="BOOLEAN">Да / нет</option>
                <option value="SELECT">Выбор</option><option value="MULTISELECT">Мультивыбор</option>
              </select>
              <input className="input" disabled={field.categoryId !== editingFieldsId || !['SELECT', 'MULTISELECT'].includes(field.type)}
                placeholder="Варианты через запятую" value={(field.options || []).join(', ')}
                onChange={(e) => setFields((current) => current.map((item) => item.id === field.id
                  ? { ...item, options: e.target.value.split(',').map((value) => value.trim()).filter(Boolean) } : item))} />
              <label style={{ fontSize: 12 }}><input type="checkbox" checked={field.required} disabled={field.categoryId !== editingFieldsId}
                onChange={(e) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, required: e.target.checked } : item))} /> Обязательное</label>
              {field.categoryId === editingFieldsId ? <>
                <button className="btn" onClick={async () => { await updateCategoryField(editingFieldsId, field.id, field); await loadFields(editingFieldsId); }}>Сохранить</button>
                <button className="btn" style={{ color: '#dc2626' }} onClick={async () => { await deleteCategoryField(editingFieldsId, field.id); await loadFields(editingFieldsId); }}>×</button>
              </> : <span className="muted" style={{ fontSize: 11, gridColumn: 'span 2' }}>Наследуется</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
