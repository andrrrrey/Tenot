'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireRole } from '@/hooks/useRequireRole';
import { adminGetDashboard, adminToggleListing, type DashboardStats } from '@/services/admin';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const StatCard = ({
  title,
  value,
  subtitle,
  color = 'var(--brand)',
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: string;
}) => (
  <div
    className="card"
    style={{
      padding: 16,
      textAlign: 'center',
      borderTop: `3px solid ${color}`,
    }}
  >
    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
      {title}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    {subtitle && (
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
        {subtitle}
      </div>
    )}
  </div>
);

const MiniBarChart = ({
  data,
  dataKey,
  color = 'var(--brand)',
  label,
}: {
  data: { date: string; [key: string]: string | number }[];
  dataKey: string;
  color?: string;
  label: string;
}) => {
  const maxVal = Math.max(...data.map((d) => Number(d[dataKey]) || 0), 1);

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 60 }}>
        {data.map((d, i) => {
          const val = Number(d[dataKey]) || 0;
          const height = Math.max((val / maxVal) * 50, 2);
          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 30,
                  height,
                  backgroundColor: color,
                  borderRadius: 2,
                }}
                title={`${d.date}: ${val}`}
              />
              <div className="muted" style={{ fontSize: 9, marginTop: 4 }}>
                {d.date.slice(5)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const { loading } = useRequireRole(['ADMIN']);
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGetDashboard()
      .then(setData)
      .catch(() => setError('Ошибка загрузки данных'));
  }, []);

  const handleModerate = async (id: number, isActive: boolean) => {
    await adminToggleListing(id, !isActive);
    // Refresh data
    adminGetDashboard().then(setData).catch(() => {});
  };

  if (loading) return null;

  if (error) {
    return (
      <div className="card" style={{ padding: 18 }}>
        <div style={{ color: 'var(--danger)' }}>{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ padding: 18 }}>
        <div className="muted">Загрузка дашборда...</div>
      </div>
    );
  }

  const { overview, usersByRole, newUsers, newListings, messagesActivity, listingsByCategory, recentUsers, recentListings, pendingModeration, activityByDay } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="h2" style={{ margin: 0 }}>Панель администратора</h1>
          <div className="row" style={{ gap: 10 }}>
            <Link className="btn" href="/admin/users">Пользователи</Link>
            <Link className="btn" href="/admin/listings">Объявления</Link>
            <Link className="btn" href="/admin/categories">Категории</Link>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <StatCard title="Пользователей" value={overview.totalUsers} color="#3b82f6" />
        <StatCard title="Объявлений" value={overview.totalListings} subtitle={`${overview.activeListings} активных`} color="#10b981" />
        <StatCard title="Чатов" value={overview.totalChats} color="#8b5cf6" />
        <StatCard title="Сообщений" value={overview.totalMessages} subtitle={`${messagesActivity.today} сегодня`} color="#f59e0b" />
        <StatCard title="На модерации" value={overview.inactiveListings} color={overview.inactiveListings > 0 ? '#ef4444' : '#6b7280'} />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Users by Role */}
          <div className="card" style={{ padding: 16 }}>
            <div className="h2" style={{ fontSize: 16, marginBottom: 12 }}>Пользователи по ролям</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{usersByRole.buyers}</div>
                <div className="muted" style={{ fontSize: 12 }}>Покупатели</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{usersByRole.suppliers}</div>
                <div className="muted" style={{ fontSize: 12 }}>Поставщики</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{usersByRole.admins}</div>
                <div className="muted" style={{ fontSize: 12 }}>Админы</div>
              </div>
            </div>
          </div>

          {/* New Registrations */}
          <div className="card" style={{ padding: 16 }}>
            <div className="h2" style={{ fontSize: 16, marginBottom: 12 }}>Новые регистрации</div>
            <table style={{ width: '100%', fontSize: 14 }}>
              <tbody>
                <tr>
                  <td className="muted">Сегодня</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{newUsers.today}</td>
                </tr>
                <tr>
                  <td className="muted">За неделю</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{newUsers.week}</td>
                </tr>
                <tr>
                  <td className="muted">За месяц</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{newUsers.month}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* New Listings */}
          <div className="card" style={{ padding: 16 }}>
            <div className="h2" style={{ fontSize: 16, marginBottom: 12 }}>Новые объявления</div>
            <table style={{ width: '100%', fontSize: 14 }}>
              <tbody>
                <tr>
                  <td className="muted">Сегодня</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{newListings.today}</td>
                </tr>
                <tr>
                  <td className="muted">За неделю</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{newListings.week}</td>
                </tr>
                <tr>
                  <td className="muted">За месяц</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{newListings.month}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Listings by Category */}
          <div className="card" style={{ padding: 16 }}>
            <div className="h2" style={{ fontSize: 16, marginBottom: 12 }}>Объявления по категориям</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {listingsByCategory.map((cat) => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, fontSize: 14 }}>{cat.name}</div>
                  <div
                    style={{
                      width: `${Math.max((cat.count / Math.max(...listingsByCategory.map((c) => c.count), 1)) * 100, 10)}%`,
                      maxWidth: 100,
                      height: 20,
                      backgroundColor: '#3b82f6',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {cat.count}
                  </div>
                </div>
              ))}
              {listingsByCategory.length === 0 && <div className="muted">Нет категорий</div>}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Activity Chart */}
          <div className="card" style={{ padding: 16 }}>
            <div className="h2" style={{ fontSize: 16, marginBottom: 12 }}>Активность за 7 дней</div>
            <MiniBarChart data={activityByDay} dataKey="users" color="#3b82f6" label="Регистрации" />
            <MiniBarChart data={activityByDay} dataKey="listings" color="#10b981" label="Объявления" />
            <MiniBarChart data={activityByDay} dataKey="messages" color="#f59e0b" label="Сообщения" />
          </div>

          {/* Pending Moderation */}
          {pendingModeration.length > 0 && (
            <div className="card" style={{ padding: 16, borderLeft: '4px solid #ef4444' }}>
              <div className="h2" style={{ fontSize: 16, marginBottom: 12, color: '#ef4444' }}>
                Требуют модерации ({pendingModeration.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingModeration.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 8,
                      background: 'var(--soft)',
                      borderRadius: 6,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {item.category?.name ?? 'Без категории'} • {item.price.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                    <button
                      className="btn primary"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => handleModerate(item.id, false)}
                    >
                      Одобрить
                    </button>
                  </div>
                ))}
              </div>
              {pendingModeration.length > 5 && (
                <Link href="/admin/listings" className="muted" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                  Показать все...
                </Link>
              )}
            </div>
          )}

          {/* Recent Listings */}
          <div className="card" style={{ padding: 16 }}>
            <div className="h2" style={{ fontSize: 16, marginBottom: 12 }}>Последние объявления</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentListings.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 8,
                    background: 'var(--soft)',
                    borderRadius: 6,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      <Link href={`/listing/${item.id}`} style={{ color: 'inherit' }}>
                        {item.title}
                      </Link>
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {item.supplier?.name ?? 'Неизвестно'} • {formatDateTime(item.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{item.price.toLocaleString('ru-RU')} ₽</span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: item.isActive ? '#10b981' : '#ef4444',
                        color: 'white',
                      }}
                    >
                      {item.isActive ? 'Активно' : 'Скрыто'}
                    </span>
                  </div>
                </div>
              ))}
              {recentListings.length === 0 && <div className="muted">Нет объявлений</div>}
            </div>
          </div>

          {/* Recent Users */}
          <div className="card" style={{ padding: 16 }}>
            <div className="h2" style={{ fontSize: 16, marginBottom: 12 }}>Последние регистрации</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentUsers.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    background: 'var(--soft)',
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                >
                  <span>{user.email}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor:
                          user.role === 'ADMIN' ? '#ef4444' : user.role === 'SUPPLIER' ? '#10b981' : '#3b82f6',
                        color: 'white',
                      }}
                    >
                      {user.role}
                    </span>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              {recentUsers.length === 0 && <div className="muted">Нет пользователей</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="card" style={{ padding: 12, textAlign: 'center' }}>
        <div className="muted" style={{ fontSize: 12 }}>
          Последнее обновление: {new Date().toLocaleString('ru-RU')}
          {' • '}
          <button
            onClick={() => adminGetDashboard().then(setData).catch(() => {})}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brand)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Обновить
          </button>
        </div>
      </div>
    </div>
  );
}
