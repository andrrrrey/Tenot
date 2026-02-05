export async function login(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function register(payload: { email: string; password: string }) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function me(): Promise<{ user: null | { id: number; role: string } }> {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  return res.json();
}
