'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireRole } from '@/hooks/useRequireRole';
import { adminGetStats, type Stats } from '@/services/admin';

export default function AdminHome() {
  const { loading } = useRequireRole(['ADMIN']);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminGetStats().then(setStats).catch(() => {});
  }, []);

  if (loading) return null;

  return (
    <div className="card" style={{ padding: 18 }}>
      <h1 className="h2">Админ-панель</h1>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <Link className="btn" href="/admin/users">Пользователи</Link>
        <Link className="btn" href="/admin/listings">Объявления</Link>
        <Link className="btn" href="/admin/categories">Категории</Link>
        <Link className="btn" href="/admin/reviews">Отзывы{stats?.pendingReviews ? ` (${stats.pendingReviews})` : ''}</Link>
      </div>

      <hr style={{ margin: '16px 0' }} />

      <div className="h2">Активность</div>
      {!stats ? (
        <div className="muted">Загрузка...</div>
      ) : (
        <ul className="muted">
          <li>Пользователи: {stats.users}</li>
          <li>Объявления: {stats.listings}</li>
          <li>Чаты: {stats.chats}</li>
          <li>Сообщения: {stats.messages}</li>
          <li>Отзывы: {stats.reviews} (на модерации: {stats.pendingReviews})</li>
        </ul>
      )}
    </div>
  );
}
