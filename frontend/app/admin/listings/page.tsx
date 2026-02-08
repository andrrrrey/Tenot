'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireRole } from '@/hooks/useRequireRole';
import { adminGetListings, adminToggleListing } from '@/services/admin';
import type { Listing } from '@/services/listings';

export default function AdminListings() {
  const { loading } = useRequireRole(['ADMIN']);
  const [items, setItems] = useState<Listing[]>([]);

  useEffect(() => {
    adminGetListings().then(setItems).catch(() => {});
  }, []);

  if (loading) return null;

  const toggle = async (id: number, isActive: boolean) => {
    const updated = await adminToggleListing(id, !isActive);
    setItems((prev) => prev.map((l) => (l.id === id ? updated : l)));
  };

  return (
    <div>
      <h1 className="h2">Объявления (модерация)</h1>
      {items.map((l) => (
        <div key={l.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{l.title}</b>
            <span className="muted">{l.isActive ? 'активно' : 'скрыто'}</span>
          </div>
          <div className="muted">Цена: {l.price} ₽</div>
          <div className="muted">Категория: {l.category?.name ?? '-'}</div>
          <div className="muted">Автор: {l.user?.email ?? '-'}</div>

          <div className="row" style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => toggle(l.id, l.isActive)}>
              {l.isActive ? 'Скрыть' : 'Активировать'}
            </button>
            <Link className="btn" href={`/listing/${l.id}`}>Открыть</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
