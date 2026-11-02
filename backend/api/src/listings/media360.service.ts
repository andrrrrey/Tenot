import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

/** Корень 360°-медиа на диске (отдаётся статикой как /uploads/listings/360/...). */
export const SPIN_ROOT_DIR = join(process.cwd(), 'uploads', 'listings', '360');
/**
 * Временные партии кадров до commit. Папка с точкой: статика в main.ts настроена
 * с dotfiles: 'deny', поэтому незавершённые загрузки не публикуются. Лежит внутри
 * того же volume `uploads`, чтобы renameSync работал без копирования.
 */
export const SPIN_TMP_DIR = join(process.cwd(), 'uploads', '.tmp360');

export const SPIN_MIN_FRAMES = 12;
export const SPIN_MAX_FRAMES = 72;
export const SPIN_FRAME_MAX_SIZE = 3 * 1024 * 1024;
export const SPIN_BATCH_MAX = 12;

const UPLOAD_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
const TMP_TTL_MS = 24 * 60 * 60 * 1000;
const FRAME_RE = /^frame_(\d{3})\.(jpg|png|webp)$/;

export function assertUploadId(uploadId: unknown): string {
  if (typeof uploadId !== 'string' || !UPLOAD_ID_RE.test(uploadId)) {
    throw new BadRequestException('Некорректный uploadId');
  }
  return uploadId;
}

export function spinTmpDir(listingId: number, uploadId: string) {
  return join(SPIN_TMP_DIR, `${listingId}-${uploadId}`);
}

@Injectable()
export class Media360Service {
  constructor(private prisma: PrismaService) {}

  /** Проверка, что объявление существует и принадлежит пользователю. */
  async assertOwner(listingId: number, userId: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, userId: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId !== userId) throw new ForbiddenException('Not the owner');
    return listing;
  }

  /**
   * Партия кадров уже сохранена multer'ом во временную папку
   * (см. spinFramesStorage в контроллере) — здесь только проверки.
   */
  async acceptFrames(
    listingId: number,
    userId: number,
    uploadId: string,
    startIndex: number,
    files: Express.Multer.File[],
  ) {
    const cleanup = () => files.forEach((f) => rmSync(f.path, { force: true }));
    try {
      await this.assertOwner(listingId, userId);
    } catch (e) {
      cleanup();
      throw e;
    }
    if (!files.length) throw new BadRequestException('Нет кадров');
    if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex + files.length > SPIN_MAX_FRAMES) {
      cleanup();
      throw new BadRequestException(`Максимум ${SPIN_MAX_FRAMES} кадров`);
    }
    const received = this.listFrames(spinTmpDir(listingId, uploadId)).length;
    return { received };
  }

  /** Финализация: перенос кадров в постоянную папку и запись в БД. */
  async commitSpin(listingId: number, userId: number, uploadId: string, count: number) {
    await this.assertOwner(listingId, userId);
    this.cleanupStaleTmp();

    if (!Number.isInteger(count) || count < SPIN_MIN_FRAMES || count > SPIN_MAX_FRAMES) {
      throw new BadRequestException(`Нужно от ${SPIN_MIN_FRAMES} до ${SPIN_MAX_FRAMES} кадров`);
    }
    const tmp = spinTmpDir(listingId, uploadId);
    const frames = this.listFrames(tmp);
    const byIndex = new Map(frames.map((f) => [f.index, f.name]));
    for (let i = 0; i < count; i++) {
      if (!byIndex.has(i)) throw new BadRequestException(`Не хватает кадра №${i + 1}`);
    }

    const folder = `${listingId}/${Date.now()}`;
    const dest = join(SPIN_ROOT_DIR, folder);
    mkdirSync(dest, { recursive: true });
    const urls: string[] = [];
    for (let i = 0; i < count; i++) {
      const name = byIndex.get(i)!;
      renameSync(join(tmp, name), join(dest, name));
      urls.push(`/uploads/listings/360/${folder}/${name}`);
    }
    rmSync(tmp, { recursive: true, force: true });

    const previous = await this.prisma.listing360.findUnique({
      where: { listingId_kind: { listingId, kind: 'spin' } },
    });
    const data = { frames: urls, previewUrl: urls[0], status: 'ready' };
    const saved = await this.prisma.$transaction(async (tx) => {
      const row = await tx.listing360.upsert({
        where: { listingId_kind: { listingId, kind: 'spin' } },
        create: { listingId, kind: 'spin', ...data },
        update: data,
      });
      await tx.listing.update({ where: { id: listingId }, data: { has360: true } });
      return row;
    });
    if (previous) this.removeFrameFolder(previous.frames);

    return this.toSpinDto(saved);
  }

  async get360(listingId: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, media360: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    const spin = listing.media360.find((m) => m.kind === 'spin' && m.status === 'ready');
    return { spin: spin ? this.toSpinDto(spin) : null };
  }

  async deleteSpin(listingId: number, userId: number) {
    await this.assertOwner(listingId, userId);
    const row = await this.prisma.listing360.findUnique({
      where: { listingId_kind: { listingId, kind: 'spin' } },
    });
    await this.prisma.$transaction([
      this.prisma.listing360.deleteMany({ where: { listingId, kind: 'spin' } }),
      this.prisma.listing.update({ where: { id: listingId }, data: { has360: false } }),
    ]);
    if (row) this.removeFrameFolder(row.frames);
    return { deleted: true };
  }

  /** Удаление всех 360°-файлов объявления (вызывается при удалении объявления). */
  async removeAllFiles(listingId: number) {
    const rows = await this.prisma.listing360.findMany({ where: { listingId } });
    rows.forEach((r) => this.removeFrameFolder(r.frames));
  }

  private toSpinDto(row: { frames: string[]; previewUrl: string }) {
    return { frames: row.frames, previewUrl: row.previewUrl, frameCount: row.frames.length };
  }

  private listFrames(dir: string) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .map((name) => {
        const m = FRAME_RE.exec(name);
        return m ? { name, index: Number(m[1]) } : null;
      })
      .filter((f): f is { name: string; index: number } => f !== null);
  }

  /** Все кадры набора лежат в одной папке uploads/listings/360/<id>/<ts>/. */
  private removeFrameFolder(frames: string[]) {
    const first = frames[0];
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

  /** Брошенные (незавершённые) загрузки старше суток. */
  private cleanupStaleTmp() {
    if (!existsSync(SPIN_TMP_DIR)) return;
    const now = Date.now();
    for (const name of readdirSync(SPIN_TMP_DIR)) {
      const abs = join(SPIN_TMP_DIR, name);
      try {
        if (now - statSync(abs).mtimeMs > TMP_TTL_MS) rmSync(abs, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }
}
