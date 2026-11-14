import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { execFile } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import sharp = require('sharp');
import { PrismaService } from '../prisma/prisma.service';
import { removeMediaFolder, SPIN_ROOT_DIR } from './media360.paths';

const run = promisify(execFile);

/**
 * Рабочие папки склейки: uploads/.work360/<listingId>-<ts>/ — снимки салона и shots.json.
 * Папка с точкой — статика её не отдаёт (dotfiles: 'deny' в main.ts).
 */
export const WORK_DIR = join(process.cwd(), 'uploads', '.work360');

export type InteriorShot = { yaw: number; pitch: number; roll: number };
export type InteriorJob = { shots: InteriorShot[]; hfov?: number };

const PANO_W = 4096; // ширина equirect-панорамы (2:1); 4096 — безопасный предел текстур на телефонах
const PANO_H = 2048;
const INPUT_MAX_SIDE = 1600; // снимки ужимаются перед склейкой — быстрее и меньше памяти
const STEP_TIMEOUT_MS = 6 * 60 * 1000;
/**
 * Насколько результат оптимизации может отойти от углов телефона, прежде чем кадр считается «улетевшим».
 * С запасом на шум и дрейф гироскопа за время съёмки; реальные сбои — это десятки градусов.
 */
const OUTLIER_DEG = 25;
/** Минимум контрольных точек на снимок, чтобы доверять оптимизации. */
const MIN_CP_PER_IMAGE = 3;

type Pose = { y: number; p: number; r: number };

const wrap180 = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

/**
 * Склейка панорамы салона из снимков с телефона готовым open-source движком Hugin.
 * Углы телефона (гироскоп/акселерометр) задают стартовое положение каждого снимка,
 * Hugin уточняет их по совпадающим точкам и сшивает в equirectangular 2:1.
 *
 * Очередь — в процессе API, по одной склейке за раз (склейка нагружает CPU).
 */
@Injectable()
export class PanoramaStitchService implements OnModuleInit {
  private readonly log = new Logger(PanoramaStitchService.name);
  private readonly queue: { listingId: number; dir: string }[] = [];
  private running = false;
  /** Объявление, которое склеивается прямо сейчас. */
  private current: number | null = null;

  constructor(private prisma: PrismaService) {}

  /** После рестарта: незавершённые склейки — снова в очередь (или в failed, если снимков уже нет). */
  async onModuleInit() {
    const rows = await this.prisma.listing360.findMany({
      where: { kind: 'interior', status: 'processing' },
      select: { listingId: true },
    });
    for (const { listingId } of rows) {
      const dir = this.latestWorkDir(listingId);
      if (dir) this.enqueue(listingId, dir);
      else await this.markFailed(listingId, 'Склейка прервана, переснимите салон');
    }
  }

  enqueue(listingId: number, dir: string) {
    this.queue.push({ listingId, dir });
    void this.drain();
  }

  /** Склейка этого объявления ждёт в очереди или идёт сейчас. */
  isBusy(listingId: number) {
    return this.current === listingId || this.queue.some((j) => j.listingId === listingId);
  }

  /** Рабочая папка для нового задания. */
  static newWorkDir(listingId: number) {
    const dir = join(WORK_DIR, `${listingId}-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  /** Удалить все рабочие папки объявления (при удалении объявления/панорамы). */
  static removeWorkDirs(listingId: number) {
    if (!existsSync(WORK_DIR)) return;
    for (const name of readdirSync(WORK_DIR)) {
      if (name.startsWith(`${listingId}-`)) rmSync(join(WORK_DIR, name), { recursive: true, force: true });
    }
  }

  private latestWorkDir(listingId: number) {
    if (!existsSync(WORK_DIR)) return null;
    const names = readdirSync(WORK_DIR).filter((n) => n.startsWith(`${listingId}-`)).sort();
    const last = names[names.length - 1];
    return last && existsSync(join(WORK_DIR, last, 'shots.json')) ? join(WORK_DIR, last) : null;
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        const job = this.queue.shift()!;
        this.current = job.listingId;
        const started = Date.now();
        try {
          await this.process(job.listingId, job.dir);
          this.log.log(`Listing ${job.listingId}: panorama ready in ${Math.round((Date.now() - started) / 1000)}s`);
        } catch (e) {
          this.log.warn(`Listing ${job.listingId}: stitching failed: ${(e as Error).message}`);
          await this.markFailed(job.listingId, 'Не удалось склеить панораму. Переснимите салон медленнее, без пропусков.');
        } finally {
          this.current = null;
          rmSync(job.dir, { recursive: true, force: true });
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async markFailed(listingId: number, error: string) {
    await this.prisma.listing360.updateMany({
      where: { listingId, kind: 'interior' },
      data: { status: 'failed', error },
    });
  }

  private async process(listingId: number, dir: string) {
    const job = JSON.parse(readFileSync(join(dir, 'shots.json'), 'utf8')) as InteriorJob;
    const sources = readdirSync(dir)
      .filter((n) => /^frame_\d{3}\.(jpg|png|webp)$/.test(n))
      .sort();
    if (sources.length !== job.shots.length) throw new Error('shots/frames mismatch');

    // 1. EXIF-поворот применяем к пикселям и уменьшаем; метаданные (фокусное) сохраняем для pto_gen.
    const images: string[] = [];
    for (let i = 0; i < sources.length; i++) {
      const name = `img_${String(i).padStart(3, '0')}.jpg`;
      await sharp(join(dir, sources[i]))
        .rotate()
        .resize(INPUT_MAX_SIDE, INPUT_MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
        .withMetadata()
        .jpeg({ quality: 92 })
        .toFile(join(dir, name));
      images.push(name);
    }

    const pto = 'p.pto';
    const hugin = (cmd: string, args: string[]) => run(cmd, args, { cwd: dir, timeout: STEP_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 });

    // 2. Проект: FOV — из EXIF; без EXIF pto_gen ставит 50° (≈ основная камера в портрете),
    //    дальше FOV уточняется оптимизацией.
    await hugin('pto_gen', ['-o', pto, ...(job.hfov ? ['-f', String(job.hfov)] : []), ...images]);

    // 3. Стартовые углы — с датчиков телефона.
    const sensors: Pose[] = job.shots.map((s) => ({ y: s.yaw, p: s.pitch, r: s.roll }));
    await this.setPoses(hugin, pto, sensors.map((pose, i) => ({ i, pose })));

    // 4. Контрольные точки только между соседними (по углам) снимками, чистка выбросов.
    // --ncores=2: память cpfind растёт с числом потоков (~0,6 ГБ на всех ядрах против ~0,5 ГБ на двух).
    await hugin('cpfind', ['--prealigned', '--ncores=2', '-o', pto, pto]);
    await hugin('cpclean', ['-o', pto, pto]);

    const cpCount = this.controlPoints(join(dir, pto)).length;
    if (cpCount >= MIN_CP_PER_IMAGE * images.length) {
      await this.optimise(hugin, pto, []);
      // 5. Кадры, которые оптимизация увела далеко от углов телефона, возвращаем на место
      //    датчиков и исключаем из оптимизации (ложные совпадения на однотонной обивке и т.п.).
      const outliers = this.findOutliers(this.readPoses(join(dir, pto)), sensors);
      if (outliers.length) {
        this.log.warn(`Listing ${listingId}: ${outliers.length} shot(s) reset to sensor pose: ${outliers.join(',')}`);
        await this.resetToSensors(dir, hugin, pto, sensors, outliers);
        await this.optimise(hugin, pto, outliers);
      }
    } else {
      this.log.warn(`Listing ${listingId}: only ${cpCount} control points, stitching by sensor angles`);
    }

    // 6. Полная сфера 360×180 в equirect-проекции, ремап и бесшовное смешивание.
    await hugin('pano_modify', [
      '--projection=2',
      '--fov=360x180',
      `--canvas=${PANO_W}x${PANO_H}`,
      `--crop=0,${PANO_W},0,${PANO_H}`,
      '-o',
      pto,
      pto,
    ]);
    await hugin('nona', ['-m', 'TIFF_m', '-o', 'part', pto]);
    const parts = readdirSync(dir).filter((n) => /^part\d+\.tif$/.test(n)).sort();
    if (!parts.length) throw new Error('nona produced no images');
    // verdandi (блендер Hugin) с --wrap: шов на стыке -180/+180 не виден. enblend на тех же
    // данных оставлял тёмные полосы в местах перекрытия.
    await hugin('verdandi', ['--wrap', '-o', 'pano.tif', ...parts]);

    // 7. Результат обрезан по покрытой области; ставим его на полный холст 2:1 по смещению из TIFF.
    //    Непокрытые области (потолок/пол при «быстрой» съёмке) — тёмный фон.
    const offset = readTiffOffset(join(dir, 'pano.tif'));
    const canvas = await sharp({
      create: { width: PANO_W, height: PANO_H, channels: 3, background: '#111827' },
    })
      .composite([{ input: join(dir, 'pano.tif'), left: offset.x, top: offset.y }])
      .png()
      .toBuffer();
    const folder = `${listingId}/${Date.now()}`;
    const dest = join(SPIN_ROOT_DIR, folder);
    mkdirSync(dest, { recursive: true });
    const base = sharp(canvas);
    await base.clone().jpeg({ quality: 82, progressive: true }).toFile(join(dest, 'interior.jpg'));
    // Превью — передняя половина панорамы по горизонту (180° × 90°), 2:1
    await base
      .clone()
      .extract({ left: PANO_W / 4, top: PANO_H / 4, width: PANO_W / 2, height: PANO_H / 2 })
      .resize(1200, 600)
      .jpeg({ quality: 78 })
      .toFile(join(dest, 'interior_preview.jpg'));

    const url = `/uploads/listings/360/${folder}/interior.jpg`;
    const previewUrl = `/uploads/listings/360/${folder}/interior_preview.jpg`;
    const previous = await this.prisma.listing360.findUnique({
      where: { listingId_kind: { listingId, kind: 'interior' } },
    });
    if (!previous) {
      // Панораму удалили, пока шла склейка — результат не нужен.
      removeMediaFolder([url]);
      return;
    }
    await this.prisma.$transaction([
      this.prisma.listing360.update({
        where: { id: previous.id },
        data: { frames: [url], previewUrl, width: PANO_W, height: PANO_H, status: 'ready', error: null },
      }),
      this.prisma.listing.update({ where: { id: listingId }, data: { hasInterior: true } }),
    ]);
    if (previous.frames.length) removeMediaFolder(previous.frames);
  }

  private async optimise(hugin: (c: string, a: string[]) => Promise<unknown>, pto: string, fixed: number[]) {
    // Первый снимок — опорный; v (поле зрения) уточняем — точный FOV камеры заранее неизвестен.
    const exclude = [0, ...fixed].flatMap((i) => [`!y${i}`, `!p${i}`, `!r${i}`]);
    await hugin('pto_var', ['--opt', ['y', 'p', 'r', 'v', ...exclude].join(','), '-o', pto, pto]);
    // -n: оптимизировать только заданные переменные, -l: выровнять горизонт.
    await hugin('autooptimiser', ['-n', '-l', '-o', pto, pto]);
  }

  private async setPoses(
    hugin: (c: string, a: string[]) => Promise<unknown>,
    pto: string,
    poses: { i: number; pose: Pose }[],
  ) {
    const set = poses
      .map(({ i, pose }) => `y${i}=${pose.y.toFixed(3)},p${i}=${pose.p.toFixed(3)},r${i}=${pose.r.toFixed(3)}`)
      .join(',');
    await hugin('pto_var', ['--set', set, '-o', pto, pto]);
  }

  /**
   * Общий сдвиг между результатом и датчиками (поворот всей панорамы, выравнивание горизонта) —
   * по медиане, чтобы шум отдельного снимка (в т.ч. опорного) на него не влиял.
   */
  private shift(optimised: Pose[], sensors: Pose[]) {
    return {
      y: median(optimised.map((o, i) => wrap180(o.y - sensors[i].y))),
      p: median(optimised.map((o, i) => o.p - sensors[i].p)),
    };
  }

  private findOutliers(optimised: Pose[], sensors: Pose[]) {
    const shift = this.shift(optimised, sensors);
    const out: number[] = [];
    for (let i = 1; i < optimised.length; i++) {
      const o = optimised[i];
      const s = sensors[i];
      const d = [wrap180(o.y - shift.y - s.y), o.p - shift.p - s.p, wrap180(o.r - s.r)];
      if (d.some((v) => Math.abs(v) > OUTLIER_DEG)) {
        this.log.warn(`shot ${i}: off sensors by y=${d[0].toFixed(1)} p=${d[1].toFixed(1)} r=${d[2].toFixed(1)}`);
        out.push(i);
      }
    }
    return out;
  }

  private async resetToSensors(
    dir: string,
    hugin: (c: string, a: string[]) => Promise<unknown>,
    pto: string,
    sensors: Pose[],
    outliers: number[],
  ) {
    const shift = this.shift(this.readPoses(join(dir, pto)), sensors);
    // Контрольные точки «улетевших» кадров ложные — убираем.
    const path = join(dir, pto);
    const bad = new Set(outliers);
    const lines = readFileSync(path, 'utf8')
      .split('\n')
      .filter((line) => {
        if (!line.startsWith('c ')) return true;
        const n = Number(/ n(\d+)/.exec(line)?.[1]);
        const N = Number(/ N(\d+)/.exec(line)?.[1]);
        return !bad.has(n) && !bad.has(N);
      });
    writeFileSync(path, lines.join('\n'));
    await this.setPoses(
      hugin,
      pto,
      outliers.map((i) => ({ i, pose: { y: sensors[i].y + shift.y, p: sensors[i].p + shift.p, r: sensors[i].r } })),
    );
  }

  private readPoses(path: string): Pose[] {
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('i '))
      .map((l) => ({
        y: Number(/ y(-?[\d.e+-]+)/.exec(l)?.[1] ?? 0),
        p: Number(/ p(-?[\d.e+-]+)/.exec(l)?.[1] ?? 0),
        r: Number(/ r(-?[\d.e+-]+)/.exec(l)?.[1] ?? 0),
      }));
  }

  private controlPoints(path: string) {
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('c '));
  }
}

/**
 * Смещение слоя на холсте панорамы из тегов TIFF (XPosition/YPosition в дюймах × разрешение),
 * которые пишут nona/verdandi. sharp эти теги не отдаёт, поэтому читаем первый IFD вручную.
 */
export function readTiffOffset(path: string): { x: number; y: number } {
  const buf = readFileSync(path);
  const le = buf.toString('ascii', 0, 2) === 'II';
  const u16 = (o: number) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o: number) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  if (u16(2) !== 42) throw new Error('not a classic TIFF');
  const ifd = u32(4);
  const tags = new Map<number, number>();
  for (let i = 0, n = u16(ifd); i < n; i++) {
    const e = ifd + 2 + i * 12;
    const tag = u16(e);
    const type = u16(e + 2);
    if (type === 5) {
      // RATIONAL: смещение на пару uint32 числитель/знаменатель
      const off = u32(e + 8);
      const den = u32(off + 4);
      tags.set(tag, den ? u32(off) / den : 0);
    } else if (type === 3) {
      tags.set(tag, u16(e + 8));
    }
  }
  const xRes = tags.get(282) || 1;
  const yRes = tags.get(283) || xRes;
  return { x: Math.round((tags.get(286) ?? 0) * xRes), y: Math.round((tags.get(287) ?? 0) * yRes) };
}
