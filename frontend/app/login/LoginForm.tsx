'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/services/auth';
import { useStore } from '@/lib/store';
import { IconEye, IconEyeOff, IconLock, IconMail } from '@/components/Icons';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (e.key === 'Enter') submit();
  };

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 0",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--card)",
          backdropFilter: "var(--blur)",
          WebkitBackdropFilter: "var(--blur)",
          border: "1px solid rgba(255,255,255,0.85)",
          borderRadius: "var(--radius-xl)",
          padding: "36px 36px 32px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "16px",
              background: "var(--brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 24px var(--brand-glow)",
            }}
          >
            <IconLock size={24} color="#fff" strokeWidth={2} />
          </div>
          <h1 className="h2" style={{ marginBottom: 6 }}>Добро пожаловать</h1>
          <div className="muted" style={{ fontSize: 14 }}>Войдите в свой аккаунт</div>
        </div>

        {error && (
          <div className="alert error" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div className="field-label">Email</div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                className="input"
                placeholder="your@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ paddingLeft: 42 }}
              />
              <div style={{ position: "absolute", left: 14, color: "var(--muted-light)", pointerEvents: "none" }}>
                <IconMail size={16} strokeWidth={1.6} />
              </div>
            </div>
          </div>

          <div>
            <div className="field-label">Пароль</div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                className="input"
                placeholder="Ваш пароль"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ paddingLeft: 42, paddingRight: 44 }}
              />
              <div style={{ position: "absolute", left: 14, color: "var(--muted-light)", pointerEvents: "none" }}>
                <IconLock size={16} strokeWidth={1.6} />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                tabIndex={-1}
              >
                {showPassword ? <IconEyeOff size={16} strokeWidth={1.6} /> : <IconEye size={16} strokeWidth={1.6} />}
              </button>
            </div>
          </div>

          <button
            className="btn primary"
            onClick={submit}
            disabled={loading}
            style={{
              marginTop: 6,
              padding: "13px 20px",
              fontSize: 15,
              borderRadius: "var(--radius-sm)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <span className="muted" style={{ fontSize: 14 }}>Нет аккаунта? </span>
          <Link
            href="/register"
            style={{ color: 'var(--brand)', fontWeight: 600, fontSize: 14 }}
          >
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
}
