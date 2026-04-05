'use client';

import { useEffect, useRef, useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import {
  getCategories,
  createCategory,
  updateCategoryImage,
  updateCategoryCarFilter,
  deleteCategory,
  type Category,
} from '@/services/categories';

export default function AdminCategories() {
  const { loading } = useRequireRole(['ADMIN']);
  const [items, setItems] = useState<Category[]>([]);

  // Create form
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const createFileRef = useRef<HTMLInputElement>(null);

  // Subcategory form
  const [subName, setSubName] = useState('');
  const [subParentId, setSubParentId] = useState<string>('');

  // Edit image form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const reload = async () => setItems(await getCategories());

  useEffect(() => {
    reload();
  }, []);

  const create = async () => {
    const n = name.trim();
    if (!n) return;
    await createCategory({ name: n, image: imageFile || undefined });
    setName('');
    setImageFile(null);
    if (createFileRef.current) createFileRef.current.value = '';
    await reload();
  };

  const createSub = async () => {
    const n = subName.trim();
    if (!n || !subParentId) return;
    await createCategory({ name: n, parentId: Number(subParentId) });
    setSubName('');
    setSubParentId('');
    await reload();
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить категорию?')) return;
    await deleteCategory(id);
    await reload();
  };

  const toggleCarFilter = async (cat: Category) => {
    await updateCategoryCarFilter(cat.id, !cat.hasCarFilter);
    await reload();
  };

  const startEditImage = (cat: Category) => {
    setEditingId(cat.id);
    setEditImageFile(null);
  };

  const saveImage = async () => {
    if (editingId === null || !editImageFile) return;
    await updateCategoryImage(editingId, editImageFile);
    setEditingId(null);
    setEditImageFile(null);
    if (editFileRef.current) editFileRef.current.value = '';
    await reload();
  };

  if (loading) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Create category */}
      <div className="card" style={{ padding: 18 }}>
        <h1 className="h2">Категории</h1>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название категории"
          />
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Изображение (необязательно)
            </label>
            <input
              ref={createFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </div>
          <button className="btn primary" onClick={create} disabled={!name.trim()}>
            Создать категорию
          </button>
        </div>
      </div>

      {/* Create subcategory */}
      <div className="card" style={{ padding: 18 }}>
        <h2 className="h2">Подкатегории</h2>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select
            value={subParentId}
            onChange={(e) => setSubParentId(e.target.value)}
            style={{ padding: '10px 14px' }}
          >
            <option value="">Выберите родительскую категорию</option>
            {items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            placeholder="Название подкатегории"
          />
          <button
            className="btn primary"
            onClick={createSub}
            disabled={!subName.trim() || !subParentId}
          >
            Создать подкатегорию
          </button>
        </div>
      </div>

      {/* Categories list */}
      <div className="card" style={{ padding: 18 }}>
        <h2 className="h2">Список категорий</h2>

        <div style={{ marginTop: 12 }}>
          {items.map((cat) => (
            <div key={cat.id}>
              {/* Parent category row */}
              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  padding: '12px 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    {cat.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        style={{
                          width: 40,
                          height: 40,
                          objectFit: 'cover',
                          borderRadius: 6,
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          background: 'var(--soft)',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          color: 'var(--muted)',
                          flexShrink: 0,
                        }}
                      >
                        —
                      </div>
                    )}
                    <div style={{ fontWeight: 600 }}>{cat.name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                        color: cat.hasCarFilter ? 'var(--brand)' : 'var(--muted)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: `1px solid ${cat.hasCarFilter ? 'var(--brand)' : 'var(--line-solid)'}`,
                        background: cat.hasCarFilter ? 'rgba(37,99,235,0.06)' : undefined,
                        fontWeight: cat.hasCarFilter ? 600 : 400,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!cat.hasCarFilter}
                        onChange={() => toggleCarFilter(cat)}
                        style={{ accentColor: 'var(--brand)', width: 14, height: 14 }}
                      />
                      Авто
                    </label>
                    <button className="btn" onClick={() => startEditImage(cat)}>
                      Изображение
                    </button>
                    <button className="btn" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => remove(cat.id)}>
                      Удалить
                    </button>
                  </div>
                </div>

                {/* Edit image inline form */}
                {editingId === cat.id && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      ref={editFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                      style={{ flex: 1 }}
                    />
                    <button className="btn primary" onClick={saveImage} disabled={!editImageFile}>
                      Сохранить
                    </button>
                    <button className="btn" onClick={() => { setEditingId(null); setEditImageFile(null); }}>
                      Отмена
                    </button>
                  </div>
                )}
              </div>

              {/* Subcategories */}
              {cat.children && cat.children.length > 0 && (
                <div style={{ paddingLeft: 28 }}>
                  {cat.children.map((sub) => (
                    <div
                      key={sub.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid var(--border)',
                        padding: '8px 0',
                      }}
                    >
                      <div className="muted" style={{ fontSize: 14 }}>
                        ↳ {sub.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            color: sub.hasCarFilter ? 'var(--brand)' : 'var(--muted)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            padding: '3px 7px',
                            borderRadius: 6,
                            border: `1px solid ${sub.hasCarFilter ? 'var(--brand)' : 'var(--line-solid)'}`,
                            background: sub.hasCarFilter ? 'rgba(37,99,235,0.06)' : undefined,
                            fontWeight: sub.hasCarFilter ? 600 : 400,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!sub.hasCarFilter}
                            onChange={() => toggleCarFilter(sub)}
                            style={{ accentColor: 'var(--brand)', width: 13, height: 13 }}
                          />
                          Авто
                        </label>
                        <button
                          className="btn"
                          style={{ color: '#dc2626', borderColor: '#fecaca', fontSize: 12 }}
                          onClick={() => remove(sub.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {items.length === 0 && (
            <div className="muted" style={{ padding: '12px 0' }}>
              Категории не найдены
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
