"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getListing360 } from "@/services/listings";

type Props = {
  listingId: number;
  previewUrl: string;
};

type Phase = "idle" | "loading" | "ready" | "error";

/** Сколько пикселей перетаскивания соответствуют полному обороту (на всю ширину ≈ 1 оборот). */
const FULL_TURN_SHARE = 1;

/**
 * Просмотр 360°-вращения по кадрам.
 * До клика показывается только превью — кадры грузятся после действия пользователя.
 * Мышь/палец: перетаскивание по горизонтали; клавиатура: ← / →.
 */
export function Spin360Viewer({ listingId, previewUrl }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [frames, setFrames] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [index, setIndex] = useState(0);
  const [hint, setHint] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const cache = useRef<HTMLImageElement[]>([]);

  const start = useCallback(async () => {
    setPhase("loading");
    try {
      const { spin } = await getListing360(listingId);
      if (!spin || spin.frames.length === 0) throw new Error("no frames");
      setFrames(spin.frames);
      let done = 0;
      await Promise.all(
        spin.frames.map(
          (src) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.decoding = "async";
              img.onload = img.onerror = () => {
                done += 1;
                setLoaded(done);
                resolve();
              };
              img.src = src;
              cache.current.push(img);
            }),
        ),
      );
      setPhase("ready");
      boxRef.current?.focus({ preventScroll: true });
    } catch {
      setPhase("error");
    }
  }, [listingId]);

  useEffect(() => () => {
    cache.current = [];
  }, []);

  const step = useCallback(
    (delta: number) => {
      if (!frames.length) return;
      setIndex((i) => (((i + delta) % frames.length) + frames.length) % frames.length);
      setHint(false);
    },
    [frames.length],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== "ready") return;
    drag.current = { x: e.clientX, start: index };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !frames.length) return;
    const width = boxRef.current?.clientWidth || 1;
    const pxPerFrame = (width * FULL_TURN_SHARE) / frames.length;
    const shift = Math.round((drag.current.x - e.clientX) / pxPerFrame);
    const n = frames.length;
    setIndex((((drag.current.start + shift) % n) + n) % n);
    if (shift !== 0) setHint(false);
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    }
  };

  const total = frames.length;
  const src = phase === "ready" ? frames[index] : previewUrl;

  return (
    <div
      ref={boxRef}
      className="spin360"
      tabIndex={phase === "ready" ? 0 : -1}
      role={phase === "ready" ? "slider" : undefined}
      aria-label="Обзор 360°"
      aria-valuemin={phase === "ready" ? 1 : undefined}
      aria-valuemax={phase === "ready" ? total : undefined}
      aria-valuenow={phase === "ready" ? index + 1 : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      style={{ cursor: phase === "ready" ? (drag.current ? "grabbing" : "grab") : "default" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Обзор 360°" draggable={false} className="spin360-img" />

      <span className="spin360-badge">360°</span>

      {phase === "idle" && (
        <button type="button" className="spin360-play" onClick={start}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          Смотреть 360°
        </button>
      )}

      {phase === "loading" && (
        <div className="spin360-overlay">
          <div className="spin360-progress">
            <div style={{ width: `${total ? (loaded / total) * 100 : 5}%` }} />
          </div>
          <span>Загружаем 360°… {total ? `${loaded} / ${total}` : ""}</span>
        </div>
      )}

      {phase === "error" && (
        <div className="spin360-overlay">
          <span>Не удалось загрузить 360°</span>
          <button type="button" className="btn" onClick={start}>
            Повторить
          </button>
        </div>
      )}

      {phase === "ready" && hint && (
        <div className="spin360-hint" aria-hidden>
          ⟵ Потяните, чтобы повернуть ⟶
        </div>
      )}
    </div>
  );
}
