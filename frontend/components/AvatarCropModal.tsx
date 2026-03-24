"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
};

export function AvatarCropModal({ imageSrc, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  // Crop box as fractions of the displayed image (0..1)
  const [crop, setCrop] = useState({ x: 0.1, y: 0.1, size: 0.8 });
  const dragRef = useRef<{ startX: number; startY: number; startCrop: typeof crop; mode: "move" | "resize" } | null>(null);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setImgSize({ w: img.clientWidth, h: img.clientHeight });
    // Init crop: centered square taking 75% of the smaller dimension
    const minDim = Math.min(img.clientWidth, img.clientHeight);
    const size = (minDim * 0.75) / img.clientWidth;
    const x = (1 - size) / 2;
    const y = ((img.clientHeight - minDim * 0.75) / 2) / img.clientHeight;
    setCrop({ x, y, size });
  };

  // Re-measure if window resizes
  useEffect(() => {
    const handler = () => {
      const img = imgRef.current;
      if (!img) return;
      setImgSize({ w: img.clientWidth, h: img.clientHeight });
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const getPixelCrop = () => {
    const img = imgRef.current;
    if (!img) return null;
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    const px = Math.round(crop.x * img.clientWidth * scaleX);
    const py = Math.round(crop.y * img.clientHeight * scaleY);
    const sizeInClientX = crop.size * img.clientWidth;
    // Keep it square: use the same size for both dimensions scaled separately
    const pw = Math.round(sizeInClientX * scaleX);
    const ph = Math.round(sizeInClientX * scaleY);
    return { px, py, pw, ph };
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    const pixelCrop = getPixelCrop();
    if (!img || !pixelCrop) return;
    const { px, py, pw, ph } = pixelCrop;
    const canvas = document.createElement("canvas");
    const outputSize = Math.min(pw, ph, 512);
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, px, py, pw, ph, 0, 0, outputSize, outputSize);
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  // Mouse drag handlers
  const onMouseDown = (e: React.MouseEvent, mode: "move" | "resize") => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startCrop: { ...crop }, mode };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !imgRef.current) return;
      const { startX, startY, startCrop, mode } = dragRef.current;
      const img = imgRef.current;
      const dx = (e.clientX - startX) / img.clientWidth;
      const dy = (e.clientY - startY) / img.clientHeight;

      if (mode === "move") {
        const newX = Math.max(0, Math.min(1 - startCrop.size, startCrop.x + dx));
        const newY = Math.max(0, Math.min(1 - startCrop.size * (img.clientWidth / img.clientHeight), startCrop.y + dy));
        setCrop((c) => ({ ...c, x: newX, y: newY }));
      } else {
        const delta = Math.max(dx, dy);
        const newSize = Math.max(0.1, Math.min(1 - startCrop.x, Math.min(1, startCrop.size + delta)));
        setCrop((c) => ({ ...c, size: newSize }));
      }
    };
    const onMouseUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const cropPx = {
    left: crop.x * imgSize.w,
    top: crop.y * imgSize.h,
    size: crop.size * imgSize.w,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card, #fff)",
          borderRadius: 16,
          padding: 24,
          maxWidth: "90vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16 }}>Выберите область фото</div>

        <div
          ref={containerRef}
          style={{ position: "relative", userSelect: "none", lineHeight: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="crop"
            onLoad={onImgLoad}
            style={{ maxWidth: "70vw", maxHeight: "60vh", display: "block", borderRadius: 8 }}
            draggable={false}
          />

          {imgSize.w > 0 && (
            <>
              {/* Dark overlay — top */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: cropPx.top, background: "rgba(0,0,0,0.5)", pointerEvents: "none" }} />
              {/* Dark overlay — bottom */}
              <div style={{ position: "absolute", top: cropPx.top + cropPx.size, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", pointerEvents: "none" }} />
              {/* Dark overlay — left */}
              <div style={{ position: "absolute", top: cropPx.top, left: 0, width: cropPx.left, height: cropPx.size, background: "rgba(0,0,0,0.5)", pointerEvents: "none" }} />
              {/* Dark overlay — right */}
              <div style={{ position: "absolute", top: cropPx.top, left: cropPx.left + cropPx.size, right: 0, height: cropPx.size, background: "rgba(0,0,0,0.5)", pointerEvents: "none" }} />

              {/* Crop box */}
              <div
                onMouseDown={(e) => onMouseDown(e, "move")}
                style={{
                  position: "absolute",
                  left: cropPx.left,
                  top: cropPx.top,
                  width: cropPx.size,
                  height: cropPx.size,
                  border: "2px solid #fff",
                  borderRadius: "50%",
                  boxSizing: "border-box",
                  cursor: "move",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
                }}
              >
                {/* Resize handle */}
                <div
                  onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, "resize"); }}
                  style={{
                    position: "absolute",
                    bottom: -6,
                    right: -6,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    cursor: "se-resize",
                    border: "2px solid #666",
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn" type="button" onClick={onCancel}>
            Отмена
          </button>
          <button className="btn primary" type="button" onClick={handleConfirm}>
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
