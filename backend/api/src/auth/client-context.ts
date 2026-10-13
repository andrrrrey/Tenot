import type { Request } from 'express';

const PRIVATE_ADDR = /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fc|fd|::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.))/i;

/**
 * IP клиента. Заголовку X-Real-IP (его ставит nginx и пробрасывает Next)
 * доверяем только если запрос пришёл из внутренней сети — иначе подделать
 * IP можно было бы, обратившись к API напрямую.
 */
export function clientIp(req: Request): string {
  const socketIp = req.socket?.remoteAddress || 'unknown';
  if (PRIVATE_ADDR.test(socketIp)) {
    const real = req.headers['x-real-ip'];
    const value = Array.isArray(real) ? real[0] : real;
    if (value && value.length <= 64) return value.trim();
  }
  return socketIp;
}

export function clientDeviceId(req: Request, fromBody?: string): string | null {
  const header = req.headers['x-device-id'];
  const value = fromBody || (Array.isArray(header) ? header[0] : header);
  return value && /^[A-Za-z0-9_-]{8,64}$/.test(value) ? value : null;
}
