"use client";

import { useEffect, useState } from "react";

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

  // Sort: videos first, then images
  const sorted = [...media].sort((a, b) => {
    if (a.type === "video" && b.type !== "video") return -1;
    if (a.type !== "video" && b.type === "video") return 1;
    return 0;
  });

  const images = sorted.filter((m) => m.type === "image");

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

  // Single item — full width
  if (sorted.length === 1) {
    const item = sorted[0];
    return (
      <>
        <div
          style={{ borderRadius: 12, overflow: "hidden", cursor: "pointer" }}
          onClick={() => setActiveIndex(0)}
        >
          {item.type === "video" ? (
            <VideoThumb url={item.url} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt=""
              style={{ width: "100%", maxHeight: 400, objectFit: "cover", display: "block" }}
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

  // Multiple items: main (first) + thumbnails row
  const main = sorted[0];
  const thumbs = sorted.slice(1);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Main item */}
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            cursor: "pointer",
            position: "relative",
          }}
          onClick={() => setActiveIndex(0)}
        >
          {main.type === "video" ? (
            <VideoThumb url={main.url} large />
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
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0)",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLDivElement).style.background =
                "rgba(0,0,0,0.08)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLDivElement).style.background =
                "rgba(0,0,0,0)")
            }
          />
        </div>

        {/* Thumbnails row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(thumbs.length, 5)}, 1fr)`,
            gap: 6,
          }}
        >
          {thumbs.map((item, i) => {
            const realIndex = i + 1;
            const isLast = i === 4 && sorted.length > 6;
            return (
              <div
                key={item.id}
                onClick={() => setActiveIndex(realIndex)}
                style={{
                  position: "relative",
                  paddingTop: "75%",
                  borderRadius: 8,
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                {item.type === "video" ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "#1a1a2e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 24, color: "#fff" }}>▶</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
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

                {/* "More" overlay on last thumbnail */}
                {isLast && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.55)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    +{sorted.length - 5}
                  </div>
                )}

                {/* Hover overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0)",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background =
                      "rgba(0,0,0,0.12)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background =
                      "rgba(0,0,0,0)")
                  }
                />
              </div>
            );
          })}
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

// ── Video thumbnail ───────────────────────────────────────────────────────────

function VideoThumb({ url, large }: { url: string; large?: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: large ? 340 : 140,
        background: "#0f0f23",
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
          width: large ? 64 : 44,
          height: large ? 64 : 44,
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: large ? 26 : 18,
        }}
      >
        ▶
      </div>
      <span style={{ fontSize: large ? 14 : 12, opacity: 0.7 }}>
        Нажмите для просмотра видео
      </span>
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
          }}
        >
          {items.map((it, i) => (
            <div
              key={it.id}
              onClick={() => onChange(i)}
              style={{
                width: 48,
                height: 36,
                borderRadius: 6,
                overflow: "hidden",
                cursor: "pointer",
                border: i === index ? "2px solid #fff" : "2px solid transparent",
                opacity: i === index ? 1 : 0.55,
                background: it.type === "video" ? "#1a1a2e" : undefined,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {it.type === "video" ? (
                <span style={{ color: "#fff", fontSize: 14 }}>▶</span>
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
