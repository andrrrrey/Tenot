"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Props = {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
};

/** Доля области просмотра, которую занимает круг обрезки. */
const CIRCLE_RATIO = 0.84;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const OUTPUT_SIZE = 640;

type Point = { x: number; y: number };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Редактор аватара как в Telegram / Авито: круг обрезки неподвижен по центру,
 * фото двигается под ним (мышь, палец) и масштабируется (колесо, щипок,
 * слайдер, кнопки ±). Фото всегда полностью закрывает круг.
 */
export function AvatarCropModal({ imageSrc, onConfirm, onCancel }: Props) {
  const [src, setSrc] = useState(imageSrc);
  const ownUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const backdropDownRef = useRef(false);

  const [viewport, setViewport] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  // Актуальные значения для обработчиков жестов без пересоздания слушателей.
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  const diameter = viewport * CIRCLE_RATIO;
  const baseScale = natural ? diameter / Math.min(natural.w, natural.h) : 1;

  /** Ограничивает сдвиг так, чтобы фото не открывало края круга. */
  const clampOffset = useCallback(
    (o: Point, z: number): Point => {
      if (!natural) return { x: 0, y: 0 };
      const w = natural.w * baseScale * z;
      const h = natural.h * baseScale * z;
      const mx = Math.max(0, (w - diameter) / 2);
      const my = Math.max(0, (h - diameter) / 2);
      return { x: clamp(o.x, -mx, mx), y: clamp(o.y, -my, my) };
    },
    [natural, baseScale, diameter]
  );

  /** Меняет масштаб, удерживая точку focal (от центра круга) на месте. */
  const zoomTo = useCallback(
    (nextZoom: number, focal: Point = { x: 0, y: 0 }) => {
      const { zoom: z, offset: o } = stateRef.current;
      const nz = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const k = nz / z;
      const next = { x: focal.x - (focal.x - o.x) * k, y: focal.y - (focal.y - o.y) * k };
      setZoom(nz);
      setOffset(clampOffset(next, nz));
    },
    [clampOffset]
  );

  // Размер области просмотра (квадрат, подстраивается под экран).
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setViewport(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // После изменения размеров окна сдвиг мог выйти за допустимые границы.
  useEffect(() => {
    setOffset((o) => clampOffset(o, stateRef.current.zoom));
  }, [clampOffset]);

  // Esc закрывает, прокрутка страницы под модалкой заблокирована.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCancel]);

  // Освобождаем object URL, созданный кнопкой «Загрузить другое».
  useEffect(() => () => {
    if (ownUrlRef.current) URL.revokeObjectURL(ownUrlRef.current);
  }, []);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    setLoadError(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Картинка могла загрузиться раньше, чем React повесил onLoad (кеш, data:/blob: URL).
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) onImgLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // ---- Жесты: перетаскивание одним указателем, щипок двумя ----
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ dist: number; mid: Point } | null>(null);

  const relToCenter = (clientX: number, clientY: number): Point => {
    const r = viewportRef.current!.getBoundingClientRect();
    return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) };
  };

  const pinchInfo = () => {
    const [a, b] = Array.from(pointers.current.values());
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      mid: relToCenter((a.x + b.x) / 2, (a.y + b.y) / 2),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!natural) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = pointers.current.size >= 2 ? pinchInfo() : null;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && gesture.current) {
      const now = pinchInfo();
      const before = gesture.current;
      const { zoom: z, offset: o } = stateRef.current;
      const nz = clamp(z * (now.dist / Math.max(1, before.dist)), MIN_ZOOM, MAX_ZOOM);
      const k = nz / z;
      // Масштаб вокруг середины пальцев + сдвиг вслед за ней.
      const next = {
        x: now.mid.x - (before.mid.x - o.x) * k,
        y: now.mid.y - (before.mid.y - o.y) * k,
      };
      setZoom(nz);
      setOffset(clampOffset(next, nz));
      gesture.current = now;
      return;
    }

    const { zoom: z, offset: o } = stateRef.current;
    setOffset(clampOffset({ x: o.x + (e.clientX - prev.x), y: o.y + (e.clientY - prev.y) }, z));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    gesture.current = pointers.current.size >= 2 ? pinchInfo() : null;
  };

  // Колесо мыши / щипок на тачпаде. Слушатель не passive, чтобы не листалась страница.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      zoomTo(stateRef.current.zoom * factor, relToCenter(e.clientX, e.clientY));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomTo]);

  const handlePickAnother = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (ownUrlRef.current) URL.revokeObjectURL(ownUrlRef.current);
    const url = URL.createObjectURL(file);
    ownUrlRef.current = url;
    setNatural(null);
    setSrc(url);
  };

  const handleSave = () => {
    const img = imgRef.current;
    if (!img || !natural || saving) return;
    const scale = baseScale * zoom;
    // Квадрат, описанный вокруг круга, в координатах исходного фото.
    const size = diameter / scale;
    const sx = (natural.w * scale) / 2 - offset.x - diameter / 2;
    const sy = (natural.h * scale) / 2 - offset.y - diameter / 2;
    const out = Math.round(Math.min(OUTPUT_SIZE, size));
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out, out);
    ctx.drawImage(img, sx / scale, sy / scale, size, size, 0, 0, out, out);
    setSaving(true);
    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92
    );
  };

  const imgW = natural ? natural.w * baseScale * zoom : 0;
  const imgH = natural ? natural.h * baseScale * zoom : 0;

  const roundBtn: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid var(--line-solid, #e5e7eb)",
    background: "#fff",
    fontSize: 20,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text, #111827)",
    flexShrink: 0,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Редактирование фото профиля"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      // Закрываем только по клику, начатому на затемнении: перетаскивание фото,
      // отпущенное за пределами окна, не должно закрывать редактор.
      onPointerDown={(e) => { backdropDownRef.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (backdropDownRef.current && e.target === e.currentTarget) onCancel();
        backdropDownRef.current = false;
      }}
    >
      <div
        style={{
          background: "var(--card, #fff)",
          borderRadius: 20,
          padding: 20,
          width: "min(480px, 100%)",
          maxHeight: "100%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Фото профиля</div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Закрыть"
            style={{ ...roundBtn, border: "none", background: "transparent", fontSize: 24 }}
          >
            ×
          </button>
        </div>

        {/* Область обрезки: фото под неподвижной круглой маской */}
        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1 / 1",
            overflow: "hidden",
            borderRadius: 12,
            background: "#111",
            touchAction: "none",
            userSelect: "none",
            cursor: natural ? "grab" : "default",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={onImgLoad}
            onError={() => setLoadError(true)}
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: imgW || undefined,
              height: imgH || undefined,
              maxWidth: "none",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              visibility: natural ? "visible" : "hidden",
              pointerEvents: "none",
            }}
          />

          {natural && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: diameter,
                height: diameter,
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                border: "2px solid rgba(255,255,255,0.9)",
                pointerEvents: "none",
              }}
            />
          )}

          {!natural && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.8)", fontSize: 14, textAlign: "center", padding: 24 }}>
              {loadError ? "Не удалось открыть это изображение. Выберите другое фото." : "Загрузка..."}
            </div>
          )}
        </div>

        {/* Масштаб */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" style={roundBtn} onClick={() => zoomTo(zoom / 1.2)} disabled={!natural || zoom <= MIN_ZOOM} aria-label="Уменьшить">
            −
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!natural}
            onChange={(e) => zoomTo(Number(e.target.value))}
            aria-label="Масштаб"
            style={{ flex: 1, accentColor: "var(--brand, #2563eb)" }}
          />
          <button type="button" style={roundBtn} onClick={() => zoomTo(zoom * 1.2)} disabled={!natural || zoom >= MAX_ZOOM} aria-label="Увеличить">
            +
          </button>
        </div>

        <div className="muted" style={{ fontSize: 13, textAlign: "center", marginTop: -6 }}>
          Перетащите фото и измените масштаб, чтобы выбрать область
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn primary" type="button" onClick={handleSave} disabled={!natural || saving} style={{ flex: "1 1 140px" }}>
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          <button className="btn" type="button" onClick={() => fileInputRef.current?.click()} style={{ flex: "1 1 140px" }}>
            Загрузить другое
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={handlePickAnother}
        />
      </div>
    </div>
  );
}
