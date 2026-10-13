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

/** Постоянный идентификатор браузера — для лимитов отправки кодов «с устройства». */
function deviceId(): string | undefined {
  try {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('device_id', id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export class AuthApiError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) {
    super(message);
  }
}

async function phoneCall(path: string, payload: object) {
  const id = deviceId();
  const res = await fetch(`/api/auth/phone/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(id ? { 'x-device-id': id } : {}) },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new AuthApiError(msg || 'Ошибка, попробуйте позже', res.status, data.retryAfter);
  }
  return data;
}

export function requestPhoneCode(phone: string): Promise<{ retryAfter: number; codeLength: number }> {
  return phoneCall('request', { phone });
}

export function verifyPhoneCode(phone: string, code: string): Promise<{ user: null | { id: number; role: string } }> {
  return phoneCall('verify', { phone, code });
}
