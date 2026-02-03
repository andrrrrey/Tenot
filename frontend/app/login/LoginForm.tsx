'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/services/auth';
import { useStore } from '@/lib/store';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Показываем сообщения об ошибках из URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'session_expired') {
      setError('Сессия истекла. Пожалуйста, войдите снова.');
    } else if (errorParam === 'unauthorized') {
      setError('Требуется авторизация для доступа к этой странице.');
    }
  }, [searchParams]);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Введите email и пароль');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await login(email, password);
      // Обновляем store
      if (data.user) {
        setUser({
          id: String(data.user.id),
          name: data.user.email || '',
          role: data.user.role,
        });
      }
      router.push('/me');
    } catch (e: any) {
      setError(e.message || 'Не удалось войти. Проверьте email и пароль.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submit();
    }
  };

  return (
    <div className="card" style={{ padding: 18, maxWidth: 520 }}>
      <h1 className="h2">Вход</h1>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}

      <div
        className="grid"
        style={{ gridTemplateColumns: '1fr', gap: 10, marginTop: 12 }}
      >
        <input
          className="input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          className="input"
          placeholder="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="btn primary"
          onClick={submit}
          disabled={loading}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <span className="muted">Нет аккаунта? </span>
        <Link href="/register" style={{ color: 'var(--brand)', fontWeight: 600 }}>
          Зарегистрироваться
        </Link>
      </div>
    </div>
  );
}
