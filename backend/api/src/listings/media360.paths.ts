import { readdirSync, rmSync } from 'fs';
import { join } from 'path';

/** Корень 360°-медиа на диске (отдаётся статикой как /uploads/listings/360/...). */
export const SPIN_ROOT_DIR = join(process.cwd(), 'uploads', 'listings', '360');

/**
 * Удалить папку набора 360°-медиа: все файлы набора (кадры вращения или панорама с превью)
 * лежат в одной папке uploads/listings/360/<listingId>/<ts>/.
 */
export function removeMediaFolder(urls: string[]) {
  const first = urls[0];
  if (!first?.startsWith('/uploads/listings/360/')) return;
  const folder = first.slice(1).split('/').slice(0, -1).join('/');
  const abs = join(process.cwd(), folder);
  if (!abs.startsWith(SPIN_ROOT_DIR + '/')) return;
  rmSync(abs, { recursive: true, force: true });
  // Пустая папка объявления uploads/listings/360/<id>/ больше не нужна
  const parent = join(abs, '..');
  try {
    if (readdirSync(parent).length === 0) rmSync(parent, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
