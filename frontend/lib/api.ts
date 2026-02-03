export const API_BASE = '/api/proxy';

/**
 * Типы ошибок API
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized() {
    return this.statusCode === 401;
  }

  get isForbidden() {
    return this.statusCode === 403;
  }

  get isAuthError() {
    return this.statusCode === 401 || this.statusCode === 403;
  }
}

/**
 * Обработчик ошибок авторизации (можно переопределить в компоненте)
 */
let authErrorHandler: ((error: ApiError) => void) | null = null;

export function setAuthErrorHandler(handler: (error: ApiError) => void) {
  authErrorHandler = handler;
}

export function clearAuthErrorHandler() {
  authErrorHandler = null;
}

/**
 * Базовая функция для API-запросов с единообразной обработкой ошибок
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      'content-type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    let errorCode: string | undefined;

    try {
      const errData = await res.json();
      errorMessage = errData.message || errData.error || errorMessage;
      errorCode = errData.error;
    } catch {
      const errText = await res.text().catch(() => '');
      if (errText) errorMessage = errText;
    }

    const apiError = new ApiError(res.status, errorMessage, errorCode);

    // Вызываем глобальный обработчик для ошибок авторизации
    if (apiError.isAuthError && authErrorHandler) {
      authErrorHandler(apiError);
    }

    throw apiError;
  }

  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
