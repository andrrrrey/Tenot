'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRequireRole } from '@/hooks/useRequireRole';
import { adminGetListings, adminToggleListing, adminGetUsers, type AdminUser } from '@/services/admin';
import { getCategories, type Category } from '@/services/categories';
import type { Listing } from '@/services/listings';

export default function AdminListings() {
  const { loading } = useRequireRole(['ADMIN']);
  const [items, setItems] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [userId, setUserId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Build flat list of categories (parent > child)
  const flatCategories: { id: number; name: string; parentName?: string }[] = [];
  categories.forEach((cat) => {
    flatCategories.push({ id: cat.id, name: cat.name });
    if (cat.children) {
      cat.children.forEach((child) => {
        flatCategories.push({ id: child.id, name: child.name, parentName: cat.name });
      });
    }
  });

  const fetchListings = useCallback(async () => {
    setDataLoading(true);
    try {
      const data = await adminGetListings({
        search: search.trim() || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        userId: userId ? Number(userId) : undefined,
        isActive: statusFilter === 'active' ? true : statusFilter === 'hidden' ? false : undefined,
      });
      setItems(data);
    } catch {
      // ignore
    } finally {
      setDataLoading(false);
    }
  }, [search, categoryId, userId, statusFilter]);

  useEffect(() => {
    Promise.all([
      getCategories().catch(() => []),
      adminGetUsers().catch(() => []),
    ]).then(([cats, usrs]) => {
      setCategories(cats);
      setUsers(usrs);
    });
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  if (loading) return null;

  const toggle = async (id: number, isActive: boolean) => {
    const updated = await adminToggleListing(id, !isActive);
    setItems((prev) => prev.map((l) => (l.id === id ? updated : l)));
  };

  const handleReset = () => {
    setSearch('');
    setCategoryId('');
    setUserId('');
    setStatusFilter('');
  };

  const activeCount = items.filter((l) => l.isActive).length;
  const hiddenCount = items.filter((l) => !l.isActive).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="h2" style={{ margin: 0 }}>Модерация объявлений</h1>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Найдено: {items.length} (активных: {activeCount}, скрытых: {hiddenCount})
          </div>
        </div>
        <Link className="btn" href="/admin">Назад в панель</Link>
      </div>

      {/* Filters card */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Фильтры и поиск</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {/* Search */}
          <div>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Поиск по названию</div>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Введите название..."
              style={{ width: '100%' }}
            />
          </div>

          {/* Category filter */}
          <div>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Категория</div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{ padding: '8px 10px', width: '100%', fontSize: 13 }}
            >
              <option value="">Все категории</option>
              {flatCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentName ? `${c.parentName} \u2192 ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* User filter */}
          <div>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Пользователь</div>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ padding: '8px 10px', width: '100%', fontSize: 13 }}
            >
              <option value="">Все пользователи</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ? `${u.name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Статус</div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 10px', width: '100%', fontSize: 13 }}
            >
              <option value="">Все статусы</option>
              <option value="active">Активные</option>
              <option value="hidden">Скрытые</option>
            </select>
          </div>
        </div>

        {/* Reset button */}
        {(search || categoryId || userId || statusFilter) && (
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={handleReset} style={{ fontSize: 13 }}>
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>

      {/* Listings table */}
      {dataLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="muted">Загрузка...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="muted">Объявления не найдены</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((l) => {
            const catInfo = l.category as any;
            const parentCat = catInfo?.parent;
            const categoryDisplay = parentCat
              ? `${parentCat.name} \u2192 ${catInfo.name}`
              : catInfo?.name ?? '-';

            return (
              <div
                key={l.id}
                className="card"
                style={{
                  padding: 14,
                  borderLeft: `4px solid ${l.isActive ? '#22c55e' : '#ef4444'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 15 }}>{l.title}</b>
                      <span
                        className="badge"
                        style={{
                          background: l.isActive ? '#dcfce7' : '#fee2e2',
                          color: l.isActive ? '#166534' : '#991b1b',
                          borderColor: l.isActive ? '#bbf7d0' : '#fecaca',
                          fontSize: 11,
                        }}
                      >
                        {l.isActive ? 'активно' : 'скрыто'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                      <div className="muted" style={{ fontSize: 13 }}>
                        <b>{l.price.toLocaleString('ru-RU')} \u20BD</b>
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {categoryDisplay}
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {l.user?.name || l.user?.email || '-'}
                      </div>
                      {l.city?.name && (
                        <div className="muted" style={{ fontSize: 13 }}>
                          {l.city.name}
                        </div>
                      )}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {new Date(l.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>

                  <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn"
                      onClick={() => toggle(l.id, l.isActive)}
                      style={{
                        fontSize: 13,
                        borderColor: l.isActive ? '#fecaca' : '#bbf7d0',
                        color: l.isActive ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {l.isActive ? 'Скрыть' : 'Активировать'}
                    </button>
                    <Link className="btn" href={`/listing/${l.id}`} style={{ fontSize: 13 }}>
                      Открыть
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
