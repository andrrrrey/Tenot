import { NextRequest } from 'next/server';

/**
 * Заголовки, по которым backend считает лимиты (IP и устройство клиента).
 * Next ходит в API сам, поэтому без них все пользователи сайта выглядели бы
 * для API как один IP. X-Real-IP выставляет nginx.
 */
export function clientHeaders(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
  if (ip) out['x-real-ip'] = ip;
  const deviceId = req.headers.get('x-device-id');
  if (deviceId) out['x-device-id'] = deviceId;
  return out;
}
