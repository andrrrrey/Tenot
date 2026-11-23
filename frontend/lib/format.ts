export function formatPrice(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatTime(value: string | number): string {
  const date =
    typeof value === "number" ? new Date(value) : new Date(Date.parse(value));

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ✅ ДОБАВИЛИ (для карточек/списков)
export function formatTimeShort(value: string | number): string {
  const date =
    typeof value === "number" ? new Date(value) : new Date(Date.parse(value));

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

const RU_MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** Ключ календарного дня в локальном времени — для группировки сообщений. */
export function dayKey(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Заголовок дня в чате: «Сегодня», «Вчера», «18 ноября», «18 ноября 2025». */
export function formatChatDay(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return "Сегодня";
  if (dayKey(d) === dayKey(yesterday)) return "Вчера";
  const base = `${d.getDate()} ${RU_MONTHS_GENITIVE[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}
