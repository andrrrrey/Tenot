import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { removeMediaFolder, SPIN_ROOT_DIR } from './media360.paths';
import { InteriorShot, PanoramaStitchService } from './panorama-stitch.service';

export { SPIN_ROOT_DIR } from './media360.paths';
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

/** Снимки салона для склейки панорамы: «быстро» — 12, «полностью» — 28; с запасом на пересъёмку. */
export const INTERIOR_MIN_SHOTS = 8;
export const INTERIOR_MAX_SHOTS = 40;
export const INTERIOR_SHOT_MAX_SIZE = 6 * 1024 * 1024;
export const INTERIOR_BATCH_MAX = 6;

export type Media360Kind = 'spin' | 'interior';
export const MAX_FRAMES: Record<Media360Kind, number> = { spin: SPIN_MAX_FRAMES, interior: INTERIOR_MAX_SHOTS };

const UPLOAD_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
const TMP_TTL_MS = 24 * 60 * 60 * 1000;
const FRAME_RE = /^frame_(\d{3})\.(jpg|png|webp)$/;

export function assertUploadId(uploadId: unknown): string {
  if (typeof uploadId !== 'string' || !UPLOAD_ID_RE.test(uploadId)) {
    throw new BadRequestException('Некорректный uploadId');
  }
  return uploadId;
}

export function spinTmpDir(listingId: number, uploadId: string, kind: Media360Kind = 'spin') {
  return join(SPIN_TMP_DIR, kind === 'spin' ? `${listingId}-${uploadId}` : `${listingId}-${kind}-${uploadId}`);
}

/** Категории, где доступна панорама салона: вся ветка «Транспорт» шаблонов категорий. */
export function isTransportCategory(templateKey: string | null | undefined) {
  return !!templateKey && (templateKey === 'root:TRANSPORT' || templateKey.startsWith('transport:'));
}

function isFiniteAngle(v: unknown, limit: number) {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
}

@Injectable()
export class Media360Service {
  constructor(private prisma: PrismaService, private stitch: PanoramaStitchService) {}

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
    kind: Media360Kind = 'spin',
  ) {
    const max = MAX_FRAMES[kind];
    const cleanup = () => files.forEach((f) => rmSync(f.path, { force: true }));
    try {
      await this.assertOwner(listingId, userId);
    } catch (e) {
      cleanup();
      throw e;
    }
    if (!files.length) throw new BadRequestException('Нет кадров');
    if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex + files.length > max) {
      cleanup();
      throw new BadRequestException(`Максимум ${max} кадров`);
    }
    const received = this.listFrames(spinTmpDir(listingId, uploadId, kind)).length;
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
    if (previous) removeMediaFolder(previous.frames);

    return this.toSpinDto(saved);
  }

  async get360(listingId: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, media360: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    const spin = listing.media360.find((m) => m.kind === 'spin' && m.status === 'ready');
    const interior = listing.media360.find((m) => m.kind === 'interior');
    return {
      spin: spin ? this.toSpinDto(spin) : null,
      interior: interior
        ? {
            // Во время пересъёмки (processing/failed) здесь остаётся предыдущая готовая панорама, если она была.
            url: interior.frames[0] ?? null,
            previewUrl: interior.previewUrl || null,
            status: interior.status,
            error: interior.error,
          }
        : null,
    };
  }

  /**
   * Снимки салона загружены партиями — ставим склейку в очередь.
   * Ответ сразу; клиент опрашивает GET /listings/:id/360 до status=ready|failed.
   */
  async commitInterior(
    listingId: number,
    userId: number,
    uploadId: string,
    shots: unknown,
    hfov: unknown,
  ) {
    await this.assertOwner(listingId, userId);
    this.cleanupStaleTmp();
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { category: { select: { templateKey: true } } },
    });
    if (!isTransportCategory(listing?.category?.templateKey)) {
      throw new BadRequestException('Панорама салона доступна только для объявлений из раздела «Транспорт»');
    }
    if (!Array.isArray(shots) || shots.length < INTERIOR_MIN_SHOTS || shots.length > INTERIOR_MAX_SHOTS) {
      throw new BadRequestException(`Нужно от ${INTERIOR_MIN_SHOTS} до ${INTERIOR_MAX_SHOTS} снимков`);
    }
    const poses: InteriorShot[] = shots.map((s: any, i: number) => {
      if (!s || !isFiniteAngle(s.yaw, 720) || !isFiniteAngle(s.pitch, 90) || !isFiniteAngle(s.roll, 180)) {
        throw new BadRequestException(`Некорректные углы снимка №${i + 1}`);
      }
      return { yaw: s.yaw, pitch: s.pitch, roll: s.roll };
    });
    const fov = hfov === undefined || hfov === null ? undefined : Number(hfov);
    if (fov !== undefined && !(fov >= 20 && fov <= 140)) throw new BadRequestException('Некорректный hfov');

    const existing = await this.prisma.listing360.findUnique({
      where: { listingId_kind: { listingId, kind: 'interior' } },
    });
    if (existing?.status === 'processing') {
      throw new ConflictException('Панорама ещё склеивается, подождите пару минут');
    }

    const tmp = spinTmpDir(listingId, uploadId, 'interior');
    const byIndex = new Map(this.listFrames(tmp).map((f) => [f.index, f.name]));
    for (let i = 0; i < poses.length; i++) {
      if (!byIndex.has(i)) throw new BadRequestException(`Не хватает снимка №${i + 1}`);
    }

    PanoramaStitchService.removeWorkDirs(listingId);
    const work = PanoramaStitchService.newWorkDir(listingId);
    for (let i = 0; i < poses.length; i++) {
      const name = byIndex.get(i)!;
      renameSync(join(tmp, name), join(work, name));
    }
    rmSync(tmp, { recursive: true, force: true });
    writeFileSync(join(work, 'shots.json'), JSON.stringify({ shots: poses, hfov: fov }));

    await this.prisma.listing360.upsert({
      where: { listingId_kind: { listingId, kind: 'interior' } },
      create: { listingId, kind: 'interior', frames: [], previewUrl: '', status: 'processing' },
      update: { status: 'processing', error: null },
    });
    this.stitch.enqueue(listingId, work);
    return { status: 'processing' };
  }

  async deleteInterior(listingId: number, userId: number) {
    await this.assertOwner(listingId, userId);
    const row = await this.prisma.listing360.findUnique({
      where: { listingId_kind: { listingId, kind: 'interior' } },
    });
    await this.prisma.$transaction([
      this.prisma.listing360.deleteMany({ where: { listingId, kind: 'interior' } }),
      this.prisma.listing.update({ where: { id: listingId }, data: { hasInterior: false } }),
    ]);
    if (row) removeMediaFolder(row.frames);
    // Если склейка ещё идёт — её результат будет отброшен (строки уже нет), папку она удалит сама.
    if (!this.stitch.isBusy(listingId)) PanoramaStitchService.removeWorkDirs(listingId);
    return { deleted: true };
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
    if (row) removeMediaFolder(row.frames);
    return { deleted: true };
  }

  /** Удаление всех 360°-файлов объявления (вызывается при удалении объявления). */
  async removeAllFiles(listingId: number) {
    const rows = await this.prisma.listing360.findMany({ where: { listingId } });
    rows.forEach((r) => removeMediaFolder(r.frames));
    PanoramaStitchService.removeWorkDirs(listingId);
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
