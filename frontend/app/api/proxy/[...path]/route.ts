import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://api:3001';

/**
 * Логирование прокси-ошибок
 */
function logProxyError(
  method: string,
  endpoint: string,
  status: number,
  error?: string
) {
  const timestamp = new Date().toISOString();
  console.error(
    `[PROXY ERROR] ${timestamp} | ${method} ${endpoint} | Status: ${status}${error ? ` | ${error}` : ''}`
  );
}

/**
 * Логирование успешных запросов (для отладки)
 */
function logProxyRequest(method: string, endpoint: string, status: number) {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[PROXY] ${timestamp} | ${method} ${endpoint} | Status: ${status}`);
  }
}

/**
 * Получение токена авторизации из cookie или заголовка
 */
function getAuthToken(request: NextRequest): string | null {
  // Сначала пробуем получить токен из cookie (httpOnly)
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Если нет в cookie, проверяем заголовок Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Универсальный обработчик прокси-запросов
 */
async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const params = await context.params;
  const pathSegments = params.path;
  const method = request.method;

  // Собираем URL с query параметрами
  const path = pathSegments.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

  // Собираем заголовки для проксирования
  const headers: HeadersInit = {};

  // Прокидываем Content-Type
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers['content-type'] = contentType;
  }

  // Прокидываем Accept
  const accept = request.headers.get('accept');
  if (accept) {
    headers['accept'] = accept;
  }

  // Прокидываем JWT токен из cookie или заголовка
  const token = getAuthToken(request);
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }

  // Получаем тело запроса (для POST, PATCH, PUT, DELETE)
  let body: string | undefined;
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    try {
      body = await request.text();
    } catch {
      // Нет тела запроса - это нормально для некоторых DELETE
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body || undefined,
      signal: AbortSignal.timeout(30_000),
    });

    const responseData = await response.text();

    // Логируем результат
    if (response.ok) {
      logProxyRequest(method, `/${path}`, response.status);
    } else {
      logProxyError(method, `/${path}`, response.status, responseData.substring(0, 200));
    }

    // Обрабатываем ошибки авторизации единообразно
    if (response.status === 401 || response.status === 403) {
      const errorBody = {
        error: response.status === 401 ? 'Unauthorized' : 'Forbidden',
        message:
          response.status === 401
            ? 'Требуется авторизация'
            : 'Недостаточно прав для выполнения операции',
        statusCode: response.status,
      };
      return NextResponse.json(errorBody, { status: response.status });
    }

    // Пробуем распарсить как JSON
    try {
      const jsonData = JSON.parse(responseData);
      return NextResponse.json(jsonData, { status: response.status });
    } catch {
      // Если не JSON, возвращаем как текст
      return new Response(responseData, {
        status: response.status,
        headers: {
          'content-type': response.headers.get('content-type') || 'text/plain',
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logProxyError(method, `/${path}`, 502, errorMessage);

    return NextResponse.json(
      {
        error: 'Bad Gateway',
        message: 'Не удалось связаться с сервером API',
        statusCode: 502,
      },
      { status: 502 }
    );
  }
}

// Экспортируем обработчики для всех HTTP методов
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}
