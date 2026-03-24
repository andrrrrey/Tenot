"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryMedia = {
  id: number;
  url: string;
  type: string;
  isCover: boolean;
};

type Props = {
  media: GalleryMedia[];
};

export function MediaGallery({ media }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sort: cover first, then images, then videos at end
  const sorted = [...media].sort((a, b) => {
    if (a.isCover && !b.isCover) return -1;
    if (!a.isCover && b.isCover) return 1;
    if (a.type === "video" && b.type !== "video") return 1;
    if (a.type !== "video" && b.type === "video") return -1;
    return 0;
  });

  const startAutoplay = useCallback(() => {
    if (sorted.length <= 1) return;
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sorted.length);
    }, 4000);
  }, [sorted.length]);

  useEffect(() => {
    startAutoplay();
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [startAutoplay]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    startAutoplay();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (activeIndex === null) return;
      if (e.key === "Escape") setActiveIndex(null);
      if (e.key === "ArrowRight") {
        setActiveIndex((prev) =>
          prev !== null ? Math.min(prev + 1, sorted.length - 1) : null
        );
      }
      if (e.key === "ArrowLeft") {
        setActiveIndex((prev) =>
          prev !== null ? Math.max(prev - 1, 0) : null
        );
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, sorted.length]);

  // Scroll active thumbnail into view
  useEffect(() => {
    const strip = thumbStripRef.current;
    const thumb = thumbRefs.current[currentSlide];
    if (!strip || !thumb) return;
    const stripLeft = strip.scrollLeft;
    const stripRight = stripLeft + strip.clientWidth;
    const thumbLeft = thumb.offsetLeft;
    const thumbRight = thumbLeft + thumb.offsetWidth;
    if (thumbLeft < stripLeft) {
      strip.scrollTo({ left: thumbLeft - 6, behavior: "smooth" });
    } else if (thumbRight > stripRight) {
      strip.scrollTo({ left: thumbRight - strip.clientWidth + 6, behavior: "smooth" });
    }
  }, [currentSlide]);

  if (sorted.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: 200,
          background: "var(--soft)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="muted">Нет фото</span>
      </div>
    );
  }

  // Single item — full width, no slider needed
  if (sorted.length === 1) {
    const item = sorted[0];
    return (
      <>
        <div
          style={{ borderRadius: 12, overflow: "hidden", cursor: "pointer" }}
          onClick={() => setActiveIndex(0)}
        >
          {item.type === "video" ? (
            <VideoThumb url={item.url} height={340} showLabel />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt=""
              style={{ width: "100%", height: 340, objectFit: "cover", display: "block" }}
            />
          )}
        </div>
        {activeIndex !== null && (
          <Lightbox
            items={sorted}
            index={activeIndex}
            onClose={() => setActiveIndex(null)}
            onChange={setActiveIndex}
          />
        )}
      </>
    );
  }

  // Multiple items: slider + thumbnails strip
  const main = sorted[currentSlide];

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Slider main item */}
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            cursor: "pointer",
            position: "relative",
            userSelect: "none",
          }}
          onClick={() => setActiveIndex(currentSlide)}
        >
          {main.type === "video" ? (
            <VideoThumb url={main.url} height={340} showLabel />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={main.url}
              alt=""
              style={{
                width: "100%",
                height: 340,
                objectFit: "cover",
                display: "block",
              }}
            />
          )}

          {/* Hover overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0)",
              transition: "background 0.15s",
              pointerEvents: "none",
            }}
          />

          {/* Prev arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToSlide((currentSlide - 1 + sorted.length) % sorted.length);
            }}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.45)",
              border: "none",
              color: "#fff",
              fontSize: 22,
              width: 38,
              height: 38,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
              lineHeight: 1,
            }}
          >
            ‹
          </button>

          {/* Next arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToSlide((currentSlide + 1) % sorted.length);
            }}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.45)",
              border: "none",
              color: "#fff",
              fontSize: 22,
              width: 38,
              height: 38,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
              lineHeight: 1,
            }}
          >
            ›
          </button>

          {/* Dots */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 6,
              zIndex: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {sorted.map((_, i) => (
              <div
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(i);
                }}
                style={{
                  width: i === currentSlide ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  background:
                    i === currentSlide
                      ? "#fff"
                      : "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                }}
              />
            ))}
          </div>

          {/* Counter badge */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 12,
              background: "rgba(0,0,0,0.5)",
              color: "#fff",
              fontSize: 12,
              padding: "2px 8px",
              borderRadius: 12,
              zIndex: 2,
            }}
          >
            {currentSlide + 1} / {sorted.length}
          </div>
        </div>

        {/* Thumbnails row — fixed height, horizontal scroll */}
        <div
          ref={thumbStripRef}
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            paddingBottom: 2,
          }}
        >
          {sorted.map((item, i) => (
            <div
              key={item.id}
              ref={(el) => { thumbRefs.current[i] = el; }}
              onClick={() => goToSlide(i)}
              style={{
                flexShrink: 0,
                width: 80,
                height: 60,
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
                border:
                  i === currentSlide
                    ? "2px solid var(--accent, #3b82f6)"
                    : "2px solid transparent",
                opacity: i === currentSlide ? 1 : 0.55,
                transition: "all 0.15s",
              }}
            >
              {item.type === "video" ? (
                <VideoThumb url={item.url} height={60} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {activeIndex !== null && (
        <Lightbox
          items={sorted}
          index={activeIndex}
          onClose={() => setActiveIndex(null)}
          onChange={setActiveIndex}
        />
      )}
    </>
  );
}

// ── Video thumbnail with canvas preview ───────────────────────────────────────

function VideoThumb({
  url,
  height,
  showLabel,
}: {
  url: string;
  height: number;
  showLabel?: boolean;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = url;
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const onSeeked = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 180;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        try {
          ctx.drawImage(video, 0, 0);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setThumbUrl(dataUrl);
        } catch {
          // CORS-tainted canvas — keep dark fallback
        }
      }
    };

    const onMetadata = () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("seeked", onSeeked);

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("seeked", onSeeked);
      video.src = "";
    };
  }, [url]);

  const iconSize = height >= 200 ? 60 : height >= 100 ? 40 : 22;
  const fontSize = height >= 200 ? 24 : height >= 100 ? 16 : 10;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        background: "#0f0f23",
        overflow: "hidden",
      }}
    >
      {thumbUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: thumbUrl ? "rgba(0,0,0,0.32)" : "transparent",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          gap: 8,
        }}
      >
        <div
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: "50%",
            border: `${height >= 200 ? 3 : 2}px solid rgba(255,255,255,0.85)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize,
          }}
        >
          ▶
        </div>
        {showLabel && (
          <span style={{ fontSize: 14, opacity: 0.75 }}>
            Нажмите для просмотра видео
          </span>
        )}
      </div>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

type LightboxProps = {
  items: GalleryMedia[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
};

function Lightbox({ items, index, onClose, onChange }: LightboxProps) {
  const item = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          top: 16,
          right: 20,
          background: "rgba(255,255,255,0.15)",
          border: "none",
          color: "#fff",
          fontSize: 22,
          width: 40,
          height: 40,
          borderRadius: "50%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
        }}
      >
        ✕
      </button>

      {/* Counter */}
      {items.length > 1 && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 14,
            zIndex: 10000,
          }}
        >
          {index + 1} / {items.length}
        </div>
      )}

      {/* Prev arrow */}
      {hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange(index - 1);
          }}
          style={{
            position: "fixed",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.15)",
            border: "none",
            color: "#fff",
            fontSize: 20,
            width: 44,
            height: 44,
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          ‹
        </button>
      )}

      {/* Next arrow */}
      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange(index + 1);
          }}
          style={{
            position: "fixed",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.15)",
            border: "none",
            color: "#fff",
            fontSize: 20,
            width: 44,
            height: 44,
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          ›
        </button>
      )}

      {/* Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {item.type === "video" ? (
          <video
            src={item.url}
            controls
            autoPlay
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              borderRadius: 8,
              outline: "none",
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt=""
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              borderRadius: 8,
              objectFit: "contain",
            }}
          />
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 6,
            zIndex: 10000,
            maxWidth: "90vw",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {items.map((it, i) => (
            <div
              key={it.id}
              onClick={() => onChange(i)}
              style={{
                flexShrink: 0,
                width: 48,
                height: 36,
                borderRadius: 6,
                overflow: "hidden",
                cursor: "pointer",
                border: i === index ? "2px solid #fff" : "2px solid transparent",
                opacity: i === index ? 1 : 0.55,
              }}
            >
              {it.type === "video" ? (
                <VideoThumb url={it.url} height={36} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
