'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireRole } from '@/hooks/useRequireRole';
import { adminGetReviews, adminApproveReview, adminRejectReview, type AdminReview } from '@/services/admin';
import { IconStar } from '@/components/Icons';

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar
          key={i}
          size={14}
          color={i <= rating ? '#f59e0b' : 'var(--muted)'}
          style={{ fill: i <= rating ? '#f59e0b' : 'none' }}
        />
      ))}
    </span>
  );
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'На модерации',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён',
};

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  PENDING: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  APPROVED: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  REJECTED: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
};

export default function AdminReviews() {
  const { loading } = useRequireRole(['ADMIN']);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [dataLoading, setDataLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setDataLoading(true);
    adminGetReviews(statusFilter || undefined)
      .then(setReviews)
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [statusFilter]);

  if (loading) return null;

  const handleApprove = async (id: number) => {
    await adminApproveReview(id);
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'APPROVED' as const } : r)));
  };

  const handleReject = async (id: number) => {
    await adminRejectReview(id);
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'REJECTED' as const } : r)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="h2" style={{ margin: 0 }}>Модерация отзывов</h1>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Найдено: {reviews.length}
          </div>
        </div>
        <Link className="btn" href="/admin">Назад в панель</Link>
      </div>

      {/* Filter */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Фильтр по статусу</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { value: '', label: 'Все' },
            { value: 'PENDING', label: 'На модерации' },
            { value: 'APPROVED', label: 'Одобренные' },
            { value: 'REJECTED', label: 'Отклонённые' },
          ].map((opt) => (
            <button
              key={opt.value}
              className="btn"
              onClick={() => setStatusFilter(opt.value)}
              style={{
                fontSize: 13,
                fontWeight: statusFilter === opt.value ? 700 : 400,
                borderColor: statusFilter === opt.value ? 'var(--brand)' : undefined,
                color: statusFilter === opt.value ? 'var(--brand)' : undefined,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      {dataLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="muted">Загрузка...</div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="muted">Отзывы не найдены</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reviews.map((r) => {
            const sc = STATUS_COLORS[r.status];
            const isExpanded = expandedId === r.id;

            return (
              <div
                key={r.id}
                className="card"
                style={{
                  padding: 14,
                  borderLeft: `4px solid ${sc.border}`,
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedId(isExpanded ? null : r.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <Stars rating={r.rating} />
                      <span
                        className="badge"
                        style={{ background: sc.bg, color: sc.color, borderColor: sc.border, fontSize: 11 }}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div className="muted" style={{ fontSize: 13 }}>
                        От: <b>{r.author.name || r.author.email}</b>
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        Кому: <b>{r.target.name || r.target.email}</b>
                      </div>
                      {r.listing && (
                        <div className="muted" style={{ fontSize: 13 }}>
                          Объявление: {r.listing.title}
                        </div>
                      )}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{ marginTop: 12, fontSize: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>Общение: </span>
                          {r.satisfaction}
                        </div>
                        <div style={{ color: '#22c55e' }}>
                          <span style={{ fontWeight: 600 }}>Понравилось: </span>
                          {r.liked}
                        </div>
                        <div style={{ color: '#ef4444' }}>
                          <span style={{ fontWeight: 600 }}>Не понравилось: </span>
                          {r.disliked}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {r.status === 'PENDING' && (
                    <div className="row" style={{ gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn"
                        onClick={() => handleApprove(r.id)}
                        style={{ fontSize: 13, borderColor: '#bbf7d0', color: '#16a34a' }}
                      >
                        Одобрить
                      </button>
                      <button
                        className="btn"
                        onClick={() => handleReject(r.id)}
                        style={{ fontSize: 13, borderColor: '#fecaca', color: '#dc2626' }}
                      >
                        Отклонить
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
