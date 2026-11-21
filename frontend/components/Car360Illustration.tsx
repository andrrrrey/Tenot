'use client';

import { useEffect, useState } from 'react';
import { getCategories, type Category } from '@/services/categories';

/**
 * Иллюстрация «панорама 360°»: фото автомобиля (картинка категории «Транспорт»)
 * и камера, которая облетает его по орбите. За машиной камера уходит под фото
 * и уменьшается, перед машиной — поверх и крупнее; пройденные точки съёмки
 * подсвечиваются.
 */
const W = 440;
const H = 260;
const CX = 220;
const CY = 170;
const RX = 195;
const RY = 58;
const CAR = { x: 92, y: 32, w: 256, h: 190 };
const CAR_CENTER = { x: CX, y: 140 };
const PERIOD = 7000;
const SHOTS = 24;
const CAMERA_SRC = '/hero/camera-360.webp';
const CAMERA_RATIO = 211 / 240;

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();

/** Картинка категории «Транспорт» (или корневой авто-категории). */
export function findTransportImage(categories: Category[]): string | null {
  const byName = categories.find((c) => norm(c.name) === 'транспорт' && c.imageUrl);
  if (byName) return byName.imageUrl!;
  const auto = categories.find((c) => (c.filterProfile === 'AUTO' || c.hasCarFilter) && c.imageUrl);
  return auto?.imageUrl ?? null;
}

function point(t: number) {
  return { x: CX + RX * Math.cos(t), y: CY + RY * Math.sin(t) };
}

function Camera({ t }: { t: number }) {
  const { x, y } = point(t);
  const depth = (Math.sin(t) + 1) / 2; // 0 — дальняя точка, 1 — ближняя
  const s = 0.62 + 0.5 * depth;
  // объектив на картинке смотрит влево: справа от машины — как есть,
  // слева — зеркально; у переднего/заднего края камера «поворачивается»
  const c = Math.cos(t);
  const flip = (c >= 0 ? 1 : -1) * Math.max(0.35, Math.min(1, Math.abs(c) * 2.4));
  const w = 64;
  const h = w * CAMERA_RATIO;
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="2" rx={20 * s} ry={5 * s} fill="rgba(17,24,39,0.14)" />
      <g transform={`translate(0 ${-22 * s}) scale(${s * flip} ${s})`}>
        <image href={CAMERA_SRC} x={-w / 2} y={-h / 2} width={w} height={h} />
      </g>
    </g>
  );
}

export function Car360Illustration({ className, carSrc }: { className?: string; carSrc?: string | null }) {
  const [t, setT] = useState(Math.PI * 0.3);
  const [car, setCar] = useState<string | null>(carSrc ?? null);

  useEffect(() => {
    if (carSrc !== undefined) return;
    getCategories()
      .then((cats) => setCar(findTransportImage(cats)))
      .catch(() => setCar(null));
  }, [carSrc]);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const start = performance.now() - (0.3 / 2) * PERIOD;
    const tick = (now: number) => {
      setT((((now - start) % PERIOD) / PERIOD) * Math.PI * 2);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const behind = Math.sin(t) < 0;
  const cam = point(t);
  const camY = cam.y - 22 * (0.62 + 0.5 * ((Math.sin(t) + 1) / 2));
  // луч обзора камеры к автомобилю
  const dx = CAR_CENTER.x - cam.x;
  const dy = CAR_CENTER.y - camY;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const spread = 78;
  const cone = `${cam.x},${camY} ${CAR_CENTER.x + nx * spread},${CAR_CENTER.y + ny * spread * 0.55} ${CAR_CENTER.x - nx * spread},${CAR_CENTER.y - ny * spread * 0.55}`;

  const shots = Array.from({ length: SHOTS }, (_, i) => {
    const a = (i / SHOTS) * Math.PI * 2;
    return { a, ...point(a), done: a <= t };
  });

  const orbitBack = `M ${CX + RX} ${CY} A ${RX} ${RY} 0 0 0 ${CX - RX} ${CY}`;
  const orbitFront = `M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 0 ${CX + RX} ${CY}`;

  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Камера снимает автомобиль по кругу — панорама 360°">
      <defs>
        <radialGradient id="c360-glow" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="rgba(37,99,235,0.16)" />
          <stop offset="100%" stopColor="rgba(37,99,235,0)" />
        </radialGradient>
      </defs>
      <ellipse cx={CX} cy={CY - 20} rx="215" ry="125" fill="url(#c360-glow)" />

      {/* задняя половина орбиты */}
      <path d={orbitBack} fill="none" stroke="rgba(37,99,235,0.35)" strokeWidth="2" strokeDasharray="5 7" />
      {shots.filter((p) => p.y < CY).map((p) => (
        <circle key={p.a} cx={p.x} cy={p.y} r={p.done ? 3 : 2.2} fill={p.done ? '#2563EB' : 'rgba(37,99,235,0.25)'} />
      ))}
      <polygon points={cone} fill="rgba(37,99,235,0.10)" />
      {behind && <Camera t={t} />}

      {/* автомобиль */}
      <ellipse cx={CX} cy={CAR.y + CAR.h - 6} rx="112" ry="9" fill="rgba(17,24,39,0.10)" />
      {car && (
        <image href={car} x={CAR.x} y={CAR.y} width={CAR.w} height={CAR.h} preserveAspectRatio="xMidYMid meet" />
      )}

      {/* передняя половина орбиты */}
      <path d={orbitFront} fill="none" stroke="rgba(37,99,235,0.55)" strokeWidth="2.5" strokeDasharray="5 7" />
      {shots.filter((p) => p.y >= CY).map((p) => (
        <circle key={p.a} cx={p.x} cy={p.y} r={p.done ? 3.4 : 2.4} fill={p.done ? '#2563EB' : 'rgba(37,99,235,0.3)'} />
      ))}
      {!behind && <Camera t={t} />}

      {/* значок 360° */}
      <g transform="translate(392 26)">
        <rect x="-32" y="-16" width="64" height="32" rx="16" fill="#2563EB" />
        <text x="0" y="6" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="inherit">
          360°
        </text>
      </g>
    </svg>
  );
}
