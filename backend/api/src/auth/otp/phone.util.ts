/**
 * Приводит российский мобильный номер к виду 79XXXXXXXXX.
 * Возвращает null для любых других номеров — отправка на зарубежные
 * и платные направления закрыта (основной вектор SMS-pumping).
 */
export function normalizeRuMobile(raw: string): string | null {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (digits.length === 10 && digits.startsWith('9')) digits = '7' + digits;
  return /^79\d{9}$/.test(digits) ? digits : null;
}
