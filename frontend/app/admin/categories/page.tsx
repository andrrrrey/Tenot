'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import {
  createCategory, createCategoryField, deleteCategory, deleteCategoryField,
  getCategories, getCategoryFields, syncCategoryTemplates, updateCategoryField,
  updateCategoryImage, type Category, type CategoryField,
} from '@/services/categories';
import { findCategory, flattenCategories } from '@/lib/categoryTree';

function filterTree(items: Category[], query: string): Category[] {
  const normalized = query.trim().toLocaleLowerCase('ru-RU');
  if (!normalized) return items;
  return items.flatMap((item) => {
    const children = filterTree(item.children || [], query);
    return item.name.toLocaleLowerCase('ru-RU').includes(normalized) || children.length
      ? [{ ...item, children }]
      : [];
  });
}

function branchSize(category: Category): number {
  return 1 + (category.children || []).reduce((sum, child) => sum + branchSize(child), 0);
}

function CategoryRow({
  category, depth, expanded, searching, onToggle, onFields, onImage, onDelete,
}: {
  category: Category; depth: number; expanded: Set<number>; searching: boolean;
  onToggle: (id: number) => void; onFields: (id: number) => void;
  onImage: (category: Category, file?: File) => void; onDelete: (category: Category) => void;
}) {
  const hasChildren = !!category.children?.length;
  const open = searching || expanded.has(category.id);
  return (
    <>
      <div className="category-tree-row" style={{ paddingLeft: 8 + depth * 22 }}>
        <button className="category-tree-toggle" onClick={() => hasChildren && onToggle(category.id)}
          aria-label={open ? 'Свернуть' : 'Развернуть'} disabled={!hasChildren}>
          {hasChildren ? (open ? '⌄' : '›') : '·'}
        </button>
        <div className="category-tree-name">
          <span>{category.name}</span>
          <span className={`category-kind-badge ${category.templateKey ? 'system' : 'custom'}`}>
            {category.hasCarFilter || category.filterProfile === 'AUTO'
              ? 'Авто'
              : category.templateKey ? 'Системная' : 'Пользовательская'}
          </span>
          {hasChildren && <span className="muted" style={{ fontSize: 11 }}>{category.children!.length} доч.</span>}
        </div>
        <div className="category-tree-actions">
          <button className="btn" onClick={() => onFields(category.id)}>Поля</button>
          <label className="btn">Фото<input hidden type="file" accept="image/*"
            onChange={(event) => onImage(category, event.target.files?.[0])} /></label>
          <button className="btn category-delete" onClick={() => onDelete(category)}>Удалить</button>
        </div>
      </div>
      {open && category.children?.map((child) => (
        <CategoryRow key={child.id} category={child} depth={depth + 1} expanded={expanded}
          searching={searching} onToggle={onToggle} onFields={onFields} onImage={onImage} onDelete={onDelete} />
      ))}
    </>
  );
}

export default function AdminCategories() {
  const { loading } = useRequireRole(['ADMIN']);
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingFieldsId, setEditingFieldsId] = useState<number | null>(null);
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CategoryField['type']>('TEXT');
  const fileRef = useRef<HTMLInputElement>(null);

  const flatItems = useMemo(() => flattenCategories(items), [items]);
  const visibleItems = useMemo(() => filterTree(items, query), [items, query]);
  const selectedCategory = useMemo(
    () => editingFieldsId ? findCategory(items, editingFieldsId) : null,
    [items, editingFieldsId],
  );
  const ownFields = fields.filter((field) => field.categoryId === editingFieldsId);
  const inheritedFields = fields.filter((field) => field.categoryId !== editingFieldsId);

  const reload = async () => setItems(await getCategories());
  const showError = (value: unknown) => setError(value instanceof Error ? value.message : 'Не удалось выполнить действие');
  const loadFields = async (id: number) => {
    setEditingFieldsId(id); setFields(await getCategoryFields(id));
  };

  useEffect(() => { reload().catch(showError); }, []);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await createCategory({ name: name.trim(), image: imageFile || undefined, parentId: parentId ? Number(parentId) : undefined });
      setName(''); setParentId(''); setImageFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setMessage('Категория создана. Дополнительные характеристики можно добавить через «Поля».');
      await reload();
    } catch (value) { showError(value); }
    finally { setBusy(false); }
  };

  const syncTemplates = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await syncCategoryTemplates();
      setMessage(`Системные категории обновлены: добавлено ${result.addedCategories} категорий и ${result.addedFields} полей.`);
      await reload();
    } catch (value) { showError(value); }
    finally { setBusy(false); }
  };

  const changeImage = async (category: Category, file?: File) => {
    if (!file) return;
    setError('');
    try { await updateCategoryImage(category.id, file); await reload(); }
    catch (value) { showError(value); }
  };

  const remove = async (category: Category) => {
    const size = branchSize(category);
    const system = !!category.templateKey;
    const text = system
      ? `«${category.name}» — системная категория. Удалить её и всю ветку (${size} категорий)? Её можно восстановить через обновление системных категорий.`
      : `Удалить «${category.name}»${size > 1 ? ` и всю ветку (${size} категорий)` : ''}?`;
    if (!confirm(text)) return;
    setError(''); setMessage('');
    try {
      const result = await deleteCategory(category.id, system);
      setMessage(`Удалено категорий: ${result.count}.`);
      if (editingFieldsId && findCategory([category], editingFieldsId)) setEditingFieldsId(null);
      await reload();
    } catch (value) { showError(value); }
  };

  const addField = async () => {
    if (!editingFieldsId || !newFieldLabel.trim()) return;
    try {
      await createCategoryField(editingFieldsId, { label: newFieldLabel.trim(), type: newFieldType });
      setNewFieldLabel(''); await loadFields(editingFieldsId);
    } catch (value) { showError(value); }
  };

  const changeLocalField = (id: number, patch: Partial<CategoryField>) => {
    setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  };

  const fieldEditor = (field: CategoryField) => (
    <div key={field.id} className="category-field-row">
      <input className="input" value={field.label} onChange={(e) => changeLocalField(field.id, { label: e.target.value })} />
      <select value={field.type} onChange={(e) => changeLocalField(field.id, { type: e.target.value as CategoryField['type'] })}>
        <option value="TEXT">Текст</option><option value="NUMBER">Число</option><option value="BOOLEAN">Да / нет</option>
        <option value="SELECT">Выбор</option><option value="MULTISELECT">Мультивыбор</option>
      </select>
      <input className="input" disabled={!['SELECT', 'MULTISELECT'].includes(field.type)} placeholder="Варианты через запятую"
        value={(field.options || []).join(', ')} onChange={(e) => changeLocalField(field.id, {
          options: e.target.value.split(',').map((value) => value.trim()).filter(Boolean),
        })} />
      <div className="category-field-flags">
        <label><input type="checkbox" checked={field.required} onChange={(e) => changeLocalField(field.id, { required: e.target.checked })} /> Обязательное</label>
        <label><input type="checkbox" checked={field.showInForm} onChange={(e) => changeLocalField(field.id, { showInForm: e.target.checked })} /> В объявлении</label>
        <label><input type="checkbox" checked={field.filterable} onChange={(e) => changeLocalField(field.id, { filterable: e.target.checked })} /> В каталоге</label>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn" onClick={async () => { await updateCategoryField(field.categoryId, field.id, field); await loadFields(field.categoryId); }}>Сохранить</button>
        <button className="btn category-delete" onClick={async () => { await deleteCategoryField(field.categoryId, field.id); await loadFields(field.categoryId); }}>×</button>
      </div>
    </div>
  );

  if (loading) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        .category-page-head,.category-tree-row,.category-tree-actions,.category-field-flags{display:flex;align-items:center}
        .category-page-head{justify-content:space-between;gap:12px}.category-tree-row{min-height:54px;border-top:1px solid var(--line-solid);gap:8px;padding-right:8px}
        .category-tree-toggle{width:28px;height:28px;border:0;background:transparent;font-size:22px;color:var(--muted);cursor:pointer;flex:0 0 auto}
        .category-tree-toggle:disabled{cursor:default}.category-tree-name{display:flex;align-items:center;gap:8px;min-width:0;flex:1;font-weight:600}
        .category-tree-name>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.category-tree-actions{gap:6px;flex:0 0 auto}
        .category-kind-badge{font-size:10px;padding:3px 7px;border-radius:999px;font-weight:700}.category-kind-badge.system{color:#1d4ed8;background:#dbeafe}
        .category-kind-badge.custom{color:#4b5563;background:#f3f4f6}.category-delete{color:#dc2626;border-color:#fecaca}
        .category-field-row{display:grid;grid-template-columns:minmax(160px,1fr) 130px minmax(180px,1fr) minmax(150px,auto) auto;gap:8px;align-items:center;border-top:1px solid var(--line-solid);padding:9px 0}
        .category-field-flags{gap:8px;flex-wrap:wrap;font-size:11px}.category-sync-menu{position:relative}.category-sync-popover{position:absolute;right:0;top:42px;z-index:20;width:280px;padding:12px;background:var(--card-solid);border:1px solid var(--line-solid);border-radius:12px;box-shadow:var(--shadow)}
        @media(max-width:800px){.category-tree-row{align-items:flex-start;padding-top:9px;padding-bottom:9px}.category-tree-name{flex-wrap:wrap}.category-tree-actions{flex-wrap:wrap;justify-content:flex-end}.category-field-row{grid-template-columns:1fr}.category-page-head{align-items:flex-start}}
      `}</style>

      <div className="card" style={{ padding: 18 }}>
        <div className="category-page-head">
          <div><h1 className="h2" style={{ margin: 0 }}>Категории</h1><div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Системные разделы устанавливаются автоматически</div></div>
          <details className="category-sync-menu">
            <summary className="btn">Настройки</summary>
            <div className="category-sync-popover">
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Системные категории</div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Восстанавливает недостающие разделы и поля из встроенных шаблонов.</div>
              <button className="btn" disabled={busy} onClick={syncTemplates}>{busy ? 'Обновление…' : 'Обновить системные категории'}</button>
            </div>
          </details>
        </div>
        {message && <div className="alert" style={{ marginTop: 12 }}>{message}</div>}
        {error && <div className="alert error" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 className="h2">Новая пользовательская категория</h2>
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название категории" />
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Корневая категория</option>
            {flatItems.map((category) => <option key={category.id} value={category.id}>{'— '.repeat(category.depth)}{category.name}</option>)}
          </select>
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          <button className="btn primary" onClick={create} disabled={busy || !name.trim()}>{busy ? 'Сохранение…' : 'Создать категорию'}</button>
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div className="category-page-head">
          <div><h2 className="h2" style={{ margin: 0 }}>Дерево категорий</h2><div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{flatItems.length} категорий</div></div>
          <input className="input" style={{ maxWidth: 360 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти категорию…" />
        </div>
        <div style={{ marginTop: 12 }}>
          {visibleItems.map((category) => <CategoryRow key={category.id} category={category} depth={0} expanded={expanded}
            searching={!!query.trim()} onToggle={(id) => setExpanded((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; })}
            onFields={loadFields} onImage={changeImage} onDelete={remove} />)}
          {!visibleItems.length && <div className="muted" style={{ padding: 18, textAlign: 'center' }}>Категории не найдены</div>}
        </div>
      </div>

      {editingFieldsId && (
        <div className="card" style={{ padding: 18 }}>
          <div className="category-page-head">
            <div><h2 className="h2" style={{ margin: 0 }}>Поля: {selectedCategory?.name}</h2><div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Собственные поля можно изменять; наследуемые берутся из родительских категорий.</div></div>
            <button className="btn" onClick={() => setEditingFieldsId(null)}>Закрыть</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: 8, margin: '14px 0' }}>
            <input className="input" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="Название нового поля" />
            <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as CategoryField['type'])}>
              <option value="TEXT">Текст</option><option value="NUMBER">Число</option><option value="BOOLEAN">Да / нет</option>
              <option value="SELECT">Один вариант</option><option value="MULTISELECT">Несколько вариантов</option>
            </select>
            <button className="btn primary" onClick={addField}>Добавить</button>
          </div>
          <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Собственные поля ({ownFields.length})</h3>
          {ownFields.map(fieldEditor)}
          {!ownFields.length && <div className="muted" style={{ padding: '10px 0' }}>У этой категории пока нет собственных полей.</div>}
          {!!inheritedFields.length && <>
            <h3 style={{ fontSize: 14, margin: '22px 0 8px' }}>Наследуются от родителей ({inheritedFields.length})</h3>
            <div style={{ display: 'grid', gap: 6 }}>
              {inheritedFields.map((field) => <div key={field.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 12px', borderRadius: 9, background: 'var(--soft-solid)' }}>
                <span>{field.label}{field.unit ? `, ${field.unit}` : ''}</span>
                <span className="muted" style={{ fontSize: 11 }}>{findCategory(items, field.categoryId)?.name || 'Родительская категория'}</span>
              </div>)}
            </div>
          </>}
        </div>
      )}
    </div>
  );
}
