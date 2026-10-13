'use client';

export type AuthMode = 'phone' | 'email';

/** Переключатель «По телефону / По email» для страниц входа и регистрации. */
export default function AuthModeTabs({ mode, onChange }: { mode: AuthMode; onChange: (m: AuthMode) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
      {(['phone', 'email'] as const).map((m) => (
        <button
          key={m}
          type="button"
          className={mode === m ? 'btn primary' : 'btn'}
          onClick={() => onChange(m)}
          style={{ flex: 1, padding: "9px 12px", fontSize: 14, borderRadius: "var(--radius-sm)" }}
        >
          {m === 'phone' ? 'По телефону' : 'По email'}
        </button>
      ))}
    </div>
  );
}
