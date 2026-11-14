"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { getListing360 } from "@/services/listings";

// Photo Sphere Viewer + three.js (~600 КБ) — отдельным чанком, только после нажатия.
const PanoramaCanvas = dynamic(() => import("./PanoramaCanvas"), {
  ssr: false,
  loading: () => <div className="pano360-overlay">Загружаем просмотр…</div>,
});

type Props = {
  listingId: number;
  previewUrl: string;
};

type Phase = "idle" | "loading" | "ready" | "error";

/** Панорама салона 360°: превью → по нажатию полноценный просмотр (мышь, палец, гироскоп). */
export function Panorama360({ listingId, previewUrl }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [url, setUrl] = useState<string | null>(null);

  const open = async () => {
    setPhase("loading");
    try {
      const { interior } = await getListing360(listingId);
      if (!interior?.url) throw new Error("no panorama");
      setUrl(interior.url);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  };

  return (
    <div className="pano360">
      {phase === "ready" && url ? (
        <PanoramaCanvas src={url} onError={() => setPhase("error")} />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Салон 360°" className="pano360-preview" draggable={false} />
          <span className="spin360-badge">Салон 360°</span>
          {phase === "idle" && (
            <button type="button" className="spin360-play" onClick={open}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <ellipse cx="12" cy="12" rx="9" ry="3.5" />
              </svg>
              Осмотреть салон 360°
            </button>
          )}
          {phase === "loading" && <div className="pano360-overlay">Загружаем панораму…</div>}
          {phase === "error" && (
            <div className="pano360-overlay">
              <span>Не удалось загрузить панораму</span>
              <button type="button" className="btn" onClick={open}>
                Повторить
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
