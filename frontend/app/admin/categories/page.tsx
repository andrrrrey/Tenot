'use client';

import { useEffect, useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '@/services/categories';

export default function AdminCategories() {
  const { loading } = useRequireRole(['ADMIN']);
  const [items, setItems] = useState<Category[]>([]);

  // Create form
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Subcategory form
  const [subName, setSubName] = useState('');
  const [subParentId, setSubParentId] = useState<string>('');

  // Edit image form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editImageUrl, setEditImageUrl] = useState('');

  const reload = async () => setItems(await getCategories());

  useEffect(() => {
    reload();
  }, []);

  const create = async () => {
    const n = name.trim();
    if (!n) return;
    await createCategory({ name: n, imageUrl: imageUrl.trim() || undefined });
    setName('');
    setImageUrl('');
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

  const startEditImage = (cat: Category) => {
    setEditingId(cat.id);
    setEditImageUrl(cat.imageUrl || '');
  };

  const saveImage = async () => {
    if (editingId === null) return;
    await updateCategory(editingId, { imageUrl: editImageUrl.trim() || undefined });
    setEditingId(null);
    setEditImageUrl('');
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
          <input
            className="input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="URL изображения (необязательно)"
          />
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
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder="URL изображения"
                      style={{ flex: 1 }}
                    />
                    <button className="btn primary" onClick={saveImage}>
                      Сохранить
                    </button>
                    <button className="btn" onClick={() => setEditingId(null)}>
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
                      <button
                        className="btn"
                        style={{ color: '#dc2626', borderColor: '#fecaca', fontSize: 12 }}
                        onClick={() => remove(sub.id)}
                      >
                        Удалить
                      </button>
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
