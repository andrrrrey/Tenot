'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 16px' }}>
      <h2 style={{ marginBottom: 8 }}>Что-то пошло не так</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
        Попробуйте обновить страницу
      </p>
      <button
        className="btn primary"
        onClick={() => {
          reset();
          window.location.reload();
        }}
      >
        Обновить страницу
      </button>
    </div>
  );
}
