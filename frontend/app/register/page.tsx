'use client';

import { useState } from 'react';
import { register } from '@/services/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconMail, IconLock } from '@/components/Icons';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Введите email и пароль');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({ email, password });
      router.push('/');
    } catch {
      setError('Не удалось зарегистрироваться. Попробуйте другой email.');
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
            <IconMail size={24} color="#fff" strokeWidth={2} />
          </div>
          <h1 className="h2" style={{ marginBottom: 6 }}>Создать аккаунт</h1>
          <div className="muted" style={{ fontSize: 14 }}>Зарегистрируйтесь бесплатно</div>
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
                placeholder="Минимум 6 символов"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ paddingLeft: 42 }}
              />
              <div style={{ position: "absolute", left: 14, color: "var(--muted-light)", pointerEvents: "none" }}>
                <IconLock size={16} strokeWidth={1.6} />
              </div>
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
            {loading ? 'Создание...' : 'Создать аккаунт'}
          </button>
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <span className="muted" style={{ fontSize: 14 }}>Уже есть аккаунт? </span>
          <Link href="/login" style={{ color: 'var(--brand)', fontWeight: 600, fontSize: 14 }}>
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
