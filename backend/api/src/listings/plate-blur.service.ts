import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import * as ort from 'onnxruntime-node';
import sharp = require('sharp');
import { PrismaService } from '../prisma/prisma.service';

/**
 * Категории, в которых размываются госномера: «Автомобили» (раздел «Транспорт») и все её
 * подкатегории. Ключи — templateKey из шаблонов категорий (filter-templates.generated.json).
 * Чтобы включить, например, «Мотоциклы» или «Грузовики», добавьте их templateKey сюда.
 */
export const PLATE_BLUR_TEMPLATE_KEYS = new Set(['transport:aceb32c9a505067f']);

/** Ниже этой уверенности детектор срабатывает на мусор; номера на тестах — 0,83–0,92. */
const SCORE_THRESHOLD = 0.35;
/** Запас вокруг найденного номера (доля ширины/высоты) — рамка и края тоже скрываются. */
const PAD_X = 0.15;
const PAD_Y = 0.3;
const TIMEOUT_MS = 10_000;
const RETRY_EVERY_MS = 5 * 60 * 1000;
const MAX_TRIES = 5;
const CATEGORY_CACHE_MS = 10 * 60 * 1000;

export type PlateBox = { x1: number; y1: number; x2: number; y2: number; score: number };
export type BlurResult = { plates: number; path: string };

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });

/**
 * Автоматическое размытие госномеров на фото объявлений.
 *
 * Детектор — готовая открытая модель open-image-models (MIT): YOLOv9-tiny, обученная искать
 * номерные знаки, в формате ONNX (~8 МБ, NMS встроен в модель). Работает на CPU через
 * onnxruntime-node; пиксели обрабатывает sharp. Модель скачивается при сборке образа
 * (scripts/fetch-plate-model.sh).
 *
 * Если модель недоступна или обработка не удалась, фото публикуется как есть и помечается
 * `pending` — фоновая задача повторит размытие (до 5 попыток).
 */
@Injectable()
export class PlateBlurService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PlateBlurService.name);
  private readonly modelPath = process.env.PLATE_MODEL_PATH || join(process.cwd(), 'models', 'plate-detector.onnx');
  private session: Promise<ort.InferenceSession> | null = null;
  private inputSize = 640;
  /** Детекция идёт по одной — не нагружаем CPU параллельно. */
  private chain: Promise<unknown> = Promise.resolve();
  private retryTimer: NodeJS.Timeout | null = null;
  private retrying = false;
  private categoryCache = new Map<number, { value: boolean; at: number }>();

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    if (!existsSync(this.modelPath)) {
      this.log.warn(`Plate model not found at ${this.modelPath}: photos will be published unblurred and retried`);
    }
    this.retryTimer = setInterval(() => void this.retryPending(), RETRY_EVERY_MS);
    this.retryTimer.unref();
    // После старта (например, деплоя с моделью) — сразу доделать накопившееся.
    setTimeout(() => void this.retryPending(), 30_000).unref();
  }

  onModuleDestroy() {
    if (this.retryTimer) clearInterval(this.retryTimer);
  }

  // ── Где размываем ─────────────────────────────────────────────────────────

  /** Категория — «Автомобили» или её подкатегория (поиск вверх по дереву, с кэшем). */
  async shouldBlur(categoryId: number): Promise<boolean> {
    const cached = this.categoryCache.get(categoryId);
    if (cached && Date.now() - cached.at < CATEGORY_CACHE_MS) return cached.value;
    let value = false;
    let id: number | null = categoryId;
    for (let depth = 0; id !== null && depth < 20; depth++) {
      const c: { templateKey: string | null; parentId: number | null } | null =
        await this.prisma.category.findUnique({ where: { id }, select: { templateKey: true, parentId: true } });
      if (!c) break;
      if (c.templateKey && PLATE_BLUR_TEMPLATE_KEYS.has(c.templateKey)) {
        value = true;
        break;
      }
      id = c.parentId;
    }
    this.categoryCache.set(categoryId, { value, at: Date.now() });
    return value;
  }

  // ── Обработка файла ───────────────────────────────────────────────────────

  /**
   * Найти номера на фото и размыть их. Результат пишется в НОВЫЙ файл рядом (`<имя>-p.<ext>`),
   * исходный не трогается — вызывающий код сам решает, когда его удалить. Если номеров нет,
   * возвращается исходный путь (файл не перекодируется).
   */
  blurFile(path: string): Promise<BlurResult> {
    const run = this.chain.then(() => withTimeout(this.process(path), TIMEOUT_MS));
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async process(path: string): Promise<BlurResult> {
    const session = await this.getSession();
    // EXIF-поворот применяем к пикселям, чтобы координаты совпадали с тем, что видит пользователь.
    const { data, info } = await sharp(path).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const boxes = await this.detect(session, data, info.width, info.height);
    if (!boxes.length) return { plates: 0, path };

    const overlays: sharp.OverlayOptions[] = [];
    for (const b of boxes) {
      const w = b.x2 - b.x1;
      const h = b.y2 - b.y1;
      const left = Math.max(0, Math.floor(b.x1 - w * PAD_X));
      const top = Math.max(0, Math.floor(b.y1 - h * PAD_Y));
      const right = Math.min(info.width, Math.ceil(b.x2 + w * PAD_X));
      const bottom = Math.min(info.height, Math.ceil(b.y2 + h * PAD_Y));
      const width = right - left;
      const height = bottom - top;
      if (width < 2 || height < 2) continue;
      // Пикселизация (символы не восстановить) + размытие (без «квадратиков»).
      const cells = Math.max(3, Math.round(width / Math.max(4, height / 4)));
      const region = await sharp(data, { raw: info })
        .extract({ left, top, width, height })
        .resize(cells, Math.max(2, Math.round((cells * height) / width)), { kernel: 'cubic' })
        .resize(width, height, { kernel: 'nearest' })
        .blur(Math.max(2, height / 6))
        .raw()
        .toBuffer();
      overlays.push({ input: region, raw: { width, height, channels: info.channels }, left, top });
    }
    if (!overlays.length) return { plates: 0, path };

    const ext = extname(path).toLowerCase();
    const out = path.slice(0, path.length - ext.length) + '-p' + (ext === '.png' || ext === '.webp' ? ext : '.jpg');
    const img = sharp(data, { raw: info }).composite(overlays);
    // Метаданные (в т.ч. GPS) в обработанный файл не переносятся.
    if (ext === '.png') await img.png().toFile(out);
    else if (ext === '.webp') await img.webp({ quality: 90 }).toFile(out);
    else await img.jpeg({ quality: 90, mozjpeg: true }).toFile(out);
    return { plates: overlays.length, path: out };
  }

  private getSession() {
    if (!this.session) {
      if (!existsSync(this.modelPath)) return Promise.reject(new Error('plate model is missing'));
      this.session = ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['cpu'],
        intraOpNumThreads: 2,
        graphOptimizationLevel: 'all',
      }).then((s) => {
        const dims = (s as unknown as { inputMetadata?: { shape?: unknown[] }[] }).inputMetadata?.[0]?.shape;
        if (dims && typeof dims[2] === 'number') this.inputSize = dims[2];
        this.log.log(`Plate model loaded (${this.inputSize}px)`);
        return s;
      });
      this.session.catch(() => (this.session = null));
    }
    return this.session;
  }

  /**
   * Предобработка как в open-image-models (yolo_v9/preprocess.py): letterbox до квадрата
   * со серыми полями 114, RGB, 0..1, NCHW. Выход end2end-модели — строки
   * [batch, x1, y1, x2, y2, class, score] в координатах letterbox.
   */
  async detect(session: ort.InferenceSession, rgb: Buffer, width: number, height: number): Promise<PlateBox[]> {
    const S = this.inputSize;
    const r = Math.min(S / width, S / height);
    const nw = Math.round(width * r);
    const nh = Math.round(height * r);
    const dw = (S - nw) / 2;
    const dh = (S - nh) / 2;
    const left = Math.round(dw - 0.1);
    const top = Math.round(dh - 0.1);
    const lb = await sharp(rgb, { raw: { width, height, channels: 3 } })
      .resize(nw, nh, { fit: 'fill' })
      .extend({ top, bottom: S - nh - top, left, right: S - nw - left, background: { r: 114, g: 114, b: 114 } })
      .raw()
      .toBuffer();
    const plane = S * S;
    const x = new Float32Array(3 * plane);
    for (let i = 0; i < plane; i++) {
      x[i] = lb[i * 3] / 255;
      x[plane + i] = lb[i * 3 + 1] / 255;
      x[2 * plane + i] = lb[i * 3 + 2] / 255;
    }
    const out = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', x, [1, 3, S, S]) });
    const t = out[session.outputNames[0]];
    const data = t.data as Float32Array;
    const cols = t.dims[1] ?? 7;
    const boxes: PlateBox[] = [];
    for (let i = 0; i < (t.dims[0] ?? 0); i++) {
      const o = i * cols;
      const score = data[o + 6];
      if (score < SCORE_THRESHOLD) continue;
      boxes.push({
        x1: Math.max(0, (data[o + 1] - dw) / r),
        y1: Math.max(0, (data[o + 2] - dh) / r),
        x2: Math.min(width, (data[o + 3] - dw) / r),
        y2: Math.min(height, (data[o + 4] - dh) / r),
        score,
      });
    }
    return boxes;
  }

  // ── Фото объявлений в БД ──────────────────────────────────────────────────

  /**
   * Обработать файл, загруженный в объявление (до записи в БД).
   * Возвращает URL для сохранения и статус.
   */
  async processUpload(url: string): Promise<{ url: string; plateBlur: 'done' | 'pending' }> {
    const abs = join(process.cwd(), url.replace(/^\//, ''));
    try {
      const res = await this.blurFile(abs);
      if (res.path === abs) return { url, plateBlur: 'done' };
      unlinkSync(abs);
      return { url: url.slice(0, url.lastIndexOf('/') + 1) + res.path.slice(res.path.lastIndexOf('/') + 1), plateBlur: 'done' };
    } catch (e) {
      this.log.warn(`Plate blur failed for ${url}: ${(e as Error).message} — published as is, will retry`);
      return { url, plateBlur: 'pending' };
    }
  }

  /** Пометить фото объявления на обработку (например, после смены категории) и запустить повтор. */
  async markListingPending(listingId: number) {
    const { count } = await this.prisma.listingImage.updateMany({
      where: { listingId, type: 'image', plateBlur: { in: ['none', 'failed'] } },
      data: { plateBlur: 'pending', plateBlurTries: 0 },
    });
    if (count) void this.retryPending();
  }

  /** Фоновый повтор: результат — в новый файл и новый url (кэш nginx для /uploads — immutable). */
  async retryPending() {
    // Без модели повторять бессмысленно — и попытки не тратим: это сбой инфраструктуры, а не фото.
    if (this.retrying || !existsSync(this.modelPath)) return;
    this.retrying = true;
    try {
      const rows = await this.prisma.listingImage.findMany({
        where: { type: 'image', plateBlur: 'pending' },
        orderBy: { id: 'asc' },
        take: 50,
      });
      for (const row of rows) {
        const abs = join(process.cwd(), row.url.replace(/^\//, ''));
        try {
          if (!existsSync(abs)) {
            await this.prisma.listingImage.update({ where: { id: row.id }, data: { plateBlur: 'failed' } });
            continue;
          }
          const res = await this.blurFile(abs);
          const url =
            res.path === abs ? row.url : row.url.slice(0, row.url.lastIndexOf('/') + 1) + res.path.slice(res.path.lastIndexOf('/') + 1);
          const current = await this.prisma.listingImage.updateMany({
            where: { id: row.id, url: row.url },
            data: { url, plateBlur: 'done' },
          });
          if (res.path !== abs) {
            // Фото удалили или заменили, пока шла обработка, — результат не нужен.
            if (current.count === 0) unlinkSync(res.path);
            else unlinkSync(abs);
          }
        } catch (e) {
          const tries = row.plateBlurTries + 1;
          await this.prisma.listingImage.update({
            where: { id: row.id },
            data: { plateBlurTries: tries, plateBlur: tries >= MAX_TRIES ? 'failed' : 'pending' },
          });
        }
      }
    } catch (e) {
      this.log.warn(`Plate blur retry failed: ${(e as Error).message}`);
    } finally {
      this.retrying = false;
    }
  }
}
