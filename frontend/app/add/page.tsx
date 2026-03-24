"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { createListing, uploadListingMedia } from "@/services/listings";
import { getCategories, type Category } from "@/services/categories";
import { CitySearchPopup } from "@/components/CitySearchPopup";
import { MediaUpload, type NewMediaFile } from "@/components/MediaUpload";

export default function AddPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireRole(["USER", "ADMIN"]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [cityName, setCityName] = useState<string>("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  // Media state
  const [newFiles, setNewFiles] = useState<NewMediaFile[]>([]);
  const [newCoverIndex, setNewCoverIndex] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0 && !categoryId) {
          setCategoryId(String(cats[0].id));
        }
      })
      .catch(() => setCategories([]));
  }, []);

  const canPublish = useMemo(() => {
    return (
      title.trim().length >= 3 &&
      Number(price) > 0 &&
      description.trim().length >= 10 &&
      categoryId
    );
  }, [title, price, description, categoryId]);

  // ── Media handlers ──────────────────────────────────────────────────────────

  const handleAddFiles = (files: NewMediaFile[]) => {
    setNewFiles((prev) => {
      const updated = [...prev, ...files];
      // Auto-set cover to first new image if none set
      if (newCoverIndex === null) {
        const firstImgIdx = updated.findIndex((f) => f.type === "image");
        if (firstImgIdx !== -1) setNewCoverIndex(firstImgIdx);
      }
      return updated;
    });
  };

  const handleRemoveNew = (index: number) => {
    setNewFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (newCoverIndex === index) {
        const firstImgIdx = updated.findIndex((f) => f.type === "image");
        setNewCoverIndex(firstImgIdx === -1 ? null : firstImgIdx);
      } else if (newCoverIndex !== null && newCoverIndex > index) {
        setNewCoverIndex(newCoverIndex - 1);
      }
      return updated;
    });
  };

  const handleSetCoverNew = (index: number) => {
    setNewCoverIndex(index);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canPublish) return;

    setSubmitting(true);
    setError(null);

    try {
      const listing = await createListing({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        categoryId: Number(categoryId),
        ...(cityId ? { cityId: Number(cityId) } : {}),
      });

      if (newFiles.length > 0) {
        await uploadListingMedia(
          listing.id,
          newFiles.map((f) => f.file),
          newCoverIndex !== null ? newCoverIndex : undefined,
        );
      }

      router.push("/me/items");
    } catch (e: any) {
      setError(e.message || "Ошибка при создании объявления");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          Загрузка...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="h2" style={{ marginBottom: 4 }}>
          Новое объявление
        </h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Заполните информацию о товаре
        </p>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            color: "#dc2626",
            background: "#fef2f2",
            borderColor: "#fecaca",
          }}
        >
          {error}
        </div>
      )}

      {/* Form */}
      <div className="card" style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Category */}
          <div>
            <label
              className="muted"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Категория
            </label>
            <select
              value={categoryId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setCategoryId(e.target.value)
              }
              style={{ padding: "12px 14px" }}
            >
              <option value="">Выберите категорию</option>
              {categories.map((c) =>
                c.children && c.children.length > 0 ? (
                  <optgroup key={c.id} label={c.name}>
                    <option value={c.id}>{c.name} (все)</option>
                    {c.children.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* City */}
          <div>
            <label
              className="muted"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Город
            </label>
            <CitySearchPopup
              value={cityId}
              selectedName={cityName}
              onChange={(id, name) => { setCityId(id); setCityName(name); }}
              placeholder="Выберите город"
            />
          </div>

          {/* Title */}
          <div>
            <label
              className="muted"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Заголовок
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: iPhone 13 Pro, 256GB"
              style={{ padding: "12px 14px" }}
            />
            {title.length > 0 && title.trim().length < 3 && (
              <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
                Минимум 3 символа
              </div>
            )}
          </div>

          {/* Price */}
          <div>
            <label
              className="muted"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Цена
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                style={{ padding: "12px 14px", paddingRight: 40 }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                  fontWeight: 600,
                  pointerEvents: "none",
                }}
              >
                &#8381;
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              className="muted"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Подробное описание товара: состояние, комплектация, особенности..."
              style={{ padding: "12px 14px" }}
            />
            {description.length > 0 && description.trim().length < 10 && (
              <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
                Минимум 10 символов
              </div>
            )}
          </div>

          {/* Media upload */}
          <div>
            <label
              className="muted"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Фото и видео
            </label>
            <MediaUpload
              existingMedia={[]}
              newFiles={newFiles}
              onAddFiles={handleAddFiles}
              onRemoveExisting={() => {}}
              onRemoveNew={handleRemoveNew}
              onSetCoverExisting={() => {}}
              onSetCoverNew={handleSetCoverNew}
              newCoverIndex={newCoverIndex}
            />
          </div>

          <hr style={{ margin: 0 }} />

          {/* Submit */}
          <button
            className="btn primary"
            disabled={!canPublish || submitting}
            onClick={handleSubmit}
            style={{
              padding: "14px 20px",
              fontSize: 16,
              opacity: !canPublish || submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Публикация..." : "Опубликовать объявление"}
          </button>
        </div>
      </div>

      {/* Tips card */}
      <div
        className="card"
        style={{
          marginTop: 16,
          background: "var(--soft)",
          padding: "16px 20px",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
          Советы для быстрой продажи
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 13,
            color: "var(--muted)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <li>Добавьте до 10 фотографий и 1 видео</li>
          <li>Укажите город для привлечения местных покупателей</li>
          <li>Заголовок должен быть не менее 3 символов</li>
          <li>Описание должно быть не менее 10 символов</li>
          <li>Цена указывается в рублях</li>
        </ul>
      </div>
    </div>
  );
}
