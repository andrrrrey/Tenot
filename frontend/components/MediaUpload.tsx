"use client";

import { useRef, useState } from "react";

export type ExistingMedia = {
  id: number;
  url: string;
  type: string;
  isCover: boolean;
};

export type NewMediaFile = {
  file: File;
  preview: string;
  type: "image" | "video";
};

type Props = {
  existingMedia: ExistingMedia[];
  newFiles: NewMediaFile[];
  onAddFiles: (files: NewMediaFile[]) => void;
  onRemoveExisting: (id: number) => void;
  onRemoveNew: (index: number) => void;
  onSetCoverExisting: (id: number) => void;
  onSetCoverNew: (index: number) => void;
  newCoverIndex: number | null;
};

const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 20 * 1024 * 1024;

export function MediaUpload({
  existingMedia,
  newFiles,
  onAddFiles,
  onRemoveExisting,
  onRemoveNew,
  onSetCoverExisting,
  onSetCoverNew,
  newCoverIndex,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const existingImages = existingMedia.filter((m) => m.type === "image");
  const existingVideos = existingMedia.filter((m) => m.type === "video");
  const newImages = newFiles.filter((f) => f.type === "image");
  const newVideos = newFiles.filter((f) => f.type === "video");

  const totalImages = existingImages.length + newImages.length;
  const totalVideos = existingVideos.length + newVideos.length;
  const canAddMore = totalImages < 10 || totalVideos < 1;

  const handleFiles = (fileList: FileList) => {
    setError(null);
    const toAdd: NewMediaFile[] = [];

    let imgCount = totalImages;
    let vidCount = totalVideos;

    for (const file of Array.from(fileList)) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        setError("Допустимы только изображения и видео");
        continue;
      }

      if (isImage) {
        if (imgCount >= 10) {
          setError("Максимум 10 изображений");
          continue;
        }
        if (file.size > IMAGE_MAX) {
          setError(`Изображение «${file.name}» превышает 5 МБ`);
          continue;
        }
        imgCount++;
      }

      if (isVideo) {
        if (vidCount >= 1) {
          setError("Максимум 1 видео");
          continue;
        }
        if (file.size > VIDEO_MAX) {
          setError(`Видео «${file.name}» превышает 20 МБ`);
          continue;
        }
        vidCount++;
      }

      toAdd.push({
        file,
        preview: URL.createObjectURL(file),
        type: isImage ? "image" : "video",
      });
    }

    if (toAdd.length > 0) onAddFiles(toAdd);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  // Find cover: existing cover id or new cover index
  const existingCoverId = existingMedia.find((m) => m.isCover)?.id ?? null;

  return (
    <div>
      {error && (
        <div
          style={{
            fontSize: 13,
            color: "#dc2626",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Media grid */}
      {(existingMedia.length > 0 || newFiles.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}
        >
          {/* Existing media */}
          {existingMedia.map((m) => (
            <MediaThumb
              key={`existing-${m.id}`}
              src={m.url}
              type={m.type as "image" | "video"}
              isCover={m.isCover}
              isImage={m.type === "image"}
              onRemove={() => onRemoveExisting(m.id)}
              onSetCover={m.type === "image" ? () => onSetCoverExisting(m.id) : undefined}
            />
          ))}

          {/* New files */}
          {newFiles.map((f, idx) => (
            <MediaThumb
              key={`new-${idx}`}
              src={f.preview}
              type={f.type}
              isCover={
                existingCoverId === null &&
                f.type === "image" &&
                newCoverIndex === idx
              }
              isImage={f.type === "image"}
              onRemove={() => onRemoveNew(idx)}
              onSetCover={
                f.type === "image"
                  ? () => onSetCoverNew(idx)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Upload zone */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{
            border: "2px dashed var(--border)",
            borderRadius: 12,
            padding: "24px 16px",
            textAlign: "center",
            cursor: "pointer",
            background: "var(--soft)",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--brand)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")
          }
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            Добавить фото или видео
          </div>
          <div
            className="muted"
            style={{ fontSize: 12, lineHeight: 1.5 }}
          >
            {totalImages < 10 && (
              <span>Фото: до {10 - totalImages} шт., макс. 5 МБ</span>
            )}
            {totalImages < 10 && totalVideos < 1 && <span> · </span>}
            {totalVideos < 1 && <span>Видео: 1 шт., макс. 20 МБ</span>}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg,video/quicktime"
        style={{ display: "none" }}
        onChange={handleInputChange}
      />

      {(existingMedia.length > 0 || newFiles.length > 0) && (
        <div
          className="muted"
          style={{ fontSize: 12, marginTop: 8 }}
        >
          Нажмите на ★ чтобы выбрать обложку объявления
        </div>
      )}
    </div>
  );
}

// ── Single thumbnail ──────────────────────────────────────────────────────────

type ThumbProps = {
  src: string;
  type: "image" | "video";
  isCover: boolean;
  isImage: boolean;
  onRemove: () => void;
  onSetCover?: () => void;
};

function MediaThumb({ src, type, isCover, isImage, onRemove, onSetCover }: ThumbProps) {
  return (
    <div
      style={{
        position: "relative",
        paddingTop: "100%",
        borderRadius: 10,
        overflow: "hidden",
        border: isCover ? "2px solid var(--brand)" : "2px solid transparent",
        background: "var(--soft)",
      }}
    >
      {type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a1a2e",
            color: "#fff",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 28 }}>🎬</span>
          <span style={{ fontSize: 11 }}>Видео</span>
        </div>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Удалить"
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          padding: 0,
        }}
      >
        ✕
      </button>

      {/* Cover button — only for images */}
      {isImage && onSetCover && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSetCover();
          }}
          title={isCover ? "Обложка" : "Сделать обложкой"}
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: isCover ? "var(--brand)" : "rgba(0,0,0,0.5)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            padding: 0,
          }}
        >
          ★
        </button>
      )}

      {/* Cover badge */}
      {isCover && (
        <div
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            background: "var(--brand)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          Обложка
        </div>
      )}
    </div>
  );
}
