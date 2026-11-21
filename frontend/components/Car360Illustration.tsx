'use client';

import { useEffect, useState } from 'react';

/**
 * Иллюстрация «панорама 360°»: автомобиль и камера, которая облетает его по кругу.
 * Камера за машиной рисуется под ней, перед машиной — поверх; пройденные точки
 * съёмки на орбите подсвечиваются.
 */
const CX = 220;
const CY = 150;
const RX = 185;
const RY = 64;
const PERIOD = 6000;
const SHOTS = 24;

function point(t: number) {
  return { x: CX + RX * Math.cos(t), y: CY + RY * Math.sin(t) };
}

function Camera({ t }: { t: number }) {
  const { x, y } = point(t);
  // ближе к зрителю (низ орбиты) — крупнее
  const s = 0.82 + 0.28 * ((Math.sin(t) + 1) / 2);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="20" rx="18" ry="4" fill="rgba(17,24,39,0.12)" />
      <rect x="-9" y="-19" width="12" height="7" rx="2" fill="#1d4ed8" />
      <rect x="-19" y="-14" width="38" height="27" rx="7" fill="#2563EB" />
      <circle cx="0" cy="0" r="9.5" fill="#fff" />
      <circle cx="0" cy="0" r="6.5" fill="#1e3a8a" />
      <circle cx="-2" cy="-2" r="2" fill="#93c5fd" />
      <circle cx="13" cy="-9" r="2" fill="#bfdbfe" />
    </g>
  );
}

function Car() {
  return (
    <g>
      <ellipse cx="222" cy="194" rx="142" ry="11" fill="rgba(17,24,39,0.10)" />
      {/* кузов */}
      <path
        d="M92 170 L92 144 Q94 129 112 125 L150 119 L182 93 Q190 86 204 86 L262 86 Q276 86 286 96 L312 120 L338 126 Q354 130 355 146 L355 170 Q355 176 349 176 L92 176 Z"
        fill="#111827"
      />
      <path
        d="M96 150 L351 150"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="2"
      />
      {/* стёкла */}
      <path d="M160 120 L186 99 Q192 94 200 94 L230 94 L230 120 Z" fill="#93c5fd" />
      <path d="M238 94 L262 94 Q272 94 280 102 L298 120 L238 120 Z" fill="#bfdbfe" />
      {/* фары */}
      <rect x="341" y="134" width="12" height="7" rx="3" fill="#fde68a" />
      <rect x="92" y="136" width="8" height="8" rx="2" fill="#ef4444" />
      {/* ручки */}
      <rect x="208" y="130" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      <rect x="262" y="130" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      {/* колёса */}
      {[136, 308].map((wx) => (
        <g key={wx}>
          <circle cx={wx} cy="174" r="24" fill="#f8f9fb" />
          <circle cx={wx} cy="174" r="20" fill="#1f2937" />
          <circle cx={wx} cy="174" r="9" fill="#cbd5e1" />
          <circle cx={wx} cy="174" r="3" fill="#475569" />
        </g>
      ))}
    </g>
  );
}

export function Car360Illustration({ className }: { className?: string }) {
  const [t, setT] = useState(Math.PI * 0.35);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const start = performance.now() - (Math.PI * 0.35 / (Math.PI * 2)) * PERIOD;
    const tick = (now: number) => {
      setT((((now - start) % PERIOD) / PERIOD) * Math.PI * 2);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const behind = Math.sin(t) < 0;
  const cam = point(t);
  // луч обзора камеры к центру автомобиля
  const dx = CX - cam.x;
  const dy = 138 - cam.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const spread = 70;
  const cone = `${cam.x},${cam.y} ${CX + nx * spread},${138 + ny * spread * 0.6} ${CX - nx * spread},${138 - ny * spread * 0.6}`;

  const shots = Array.from({ length: SHOTS }, (_, i) => {
    const a = (i / SHOTS) * Math.PI * 2;
    return { a, ...point(a), done: a <= t };
  });

  const orbitBack = `M ${CX + RX} ${CY} A ${RX} ${RY} 0 0 0 ${CX - RX} ${CY}`;
  const orbitFront = `M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 0 ${CX + RX} ${CY}`;

  return (
    <svg
      className={className}
      viewBox="0 0 440 260"
      role="img"
      aria-label="Камера снимает автомобиль по кругу — панорама 360°"
    >
      <defs>
        <radialGradient id="c360-glow" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="rgba(37,99,235,0.16)" />
          <stop offset="100%" stopColor="rgba(37,99,235,0)" />
        </radialGradient>
      </defs>
      <ellipse cx={CX} cy={CY} rx="215" ry="120" fill="url(#c360-glow)" />

      {/* задняя половина орбиты */}
      <path d={orbitBack} fill="none" stroke="rgba(37,99,235,0.35)" strokeWidth="2" strokeDasharray="5 7" />
      {shots.filter((p) => p.y < CY).map((p) => (
        <circle key={p.a} cx={p.x} cy={p.y} r={p.done ? 3 : 2.2} fill={p.done ? '#2563EB' : 'rgba(37,99,235,0.25)'} />
      ))}
      <polygon points={cone} fill="rgba(37,99,235,0.10)" />
      {behind && <Camera t={t} />}

      <Car />

      {/* передняя половина орбиты */}
      <path d={orbitFront} fill="none" stroke="rgba(37,99,235,0.55)" strokeWidth="2.5" strokeDasharray="5 7" />
      {shots.filter((p) => p.y >= CY).map((p) => (
        <circle key={p.a} cx={p.x} cy={p.y} r={p.done ? 3.4 : 2.4} fill={p.done ? '#2563EB' : 'rgba(37,99,235,0.3)'} />
      ))}
      {!behind && <Camera t={t} />}

      {/* значок 360° */}
      <g transform="translate(372 30)">
        <rect x="-34" y="-17" width="68" height="34" rx="17" fill="#2563EB" />
        <text x="0" y="6" textAnchor="middle" fontSize="17" fontWeight="800" fill="#fff" fontFamily="inherit">
          360°
        </text>
      </g>
    </svg>
  );
}
