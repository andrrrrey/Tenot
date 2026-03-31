"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import {
  getListing,
  updateListing,
  uploadListingMedia,
  deleteListingMedia,
  setListingCover,
  type ListingImage,
} from "@/services/listings";
import { getCategories, type Category } from "@/services/categories";
import { getCarMakes, getCarModels, type CarMake, type CarModel } from "@/services/car-makes";
import { CitySearchPopup } from "@/components/CitySearchPopup";
import { MediaUpload, type ExistingMedia, type NewMediaFile } from "@/components/MediaUpload";

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireRole(["USER", "ADMIN"]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [cityName, setCityName] = useState<string>("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  // Car fields
  const [carMakes, setCarMakes] = useState<CarMake[]>([]);
  const [carModels, setCarModels] = useState<CarModel[]>([]);
  const [carMakeId, setCarMakeId] = useState<string>("");
  const [carModelId, setCarModelId] = useState<string>("");
  const [carYear, setCarYear] = useState<string>("");
  // Tracks whether the listing was loaded (so we can pre-populate car fields)
  const [listingLoaded, setListingLoaded] = useState(false);

  // Media state
  const [existingMedia, setExistingMedia] = useState<ExistingMedia[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [newFiles, setNewFiles] = useState<NewMediaFile[]>([]);
  const [newCoverIndex, setNewCoverIndex] = useState<number | null>(null);
  // Track if user explicitly changed the cover of an existing item
  const [pendingCoverId, setPendingCoverId] = useState<number | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    getCarMakes().then(setCarMakes).catch(() => setCarMakes([]));
  }, []);

  useEffect(() => {
    if (!user) return;
    getListing(Number(id))
      .then((listing) => {
        if (!listing) {
          setError("Объявление не найдено");
          return;
        }
        if (listing.user.id !== user.id) {
          setError("Вы не являетесь владельцем этого объявления");
          return;
        }
        setTitle(listing.title);
        setPrice(String(listing.price));
        setDescription(listing.description);
        setCategoryId(String(listing.category.id));
        setCityId(listing.cityId ? String(listing.cityId) : "");
        setCityName(listing.city?.name || "");
        if (listing.carMakeId) setCarMakeId(String(listing.carMakeId));
        if (listing.carModelId) setCarModelId(String(listing.carModelId));
        if (listing.carYear) setCarYear(String(listing.carYear));
        setExistingMedia(
          listing.images.map((img: ListingImage) => ({
            id: img.id,
            url: img.url,
            type: img.type,
            isCover: img.isCover,
          }))
        );
        setListingLoaded(true);
      })
      .catch(() => setError("Ошибка загрузки объявления"))
      .finally(() => setInitialLoading(false));
  }, [id, user]);

  // Load models when make changes (skip resetting carModelId on initial load)
  const [initialMakeLoad, setInitialMakeLoad] = useState(true);
  useEffect(() => {
    if (carMakeId) {
      getCarModels(Number(carMakeId))
        .then(setCarModels)
        .catch(() => setCarModels([]));
      if (!initialMakeLoad) {
        setCarModelId("");
      }
    } else {
      setCarModels([]);
      if (!initialMakeLoad) {
        setCarModelId("");
      }
    }
    if (listingLoaded) {
      setInitialMakeLoad(false);
    }
  }, [carMakeId, listingLoaded]);

  // Check if selected category has car filter
  const selectedCategoryHasCarFilter = useMemo(() => {
    if (!categoryId) return false;
    const id = Number(categoryId);
    for (const cat of categories) {
      if (cat.id === id && cat.hasCarFilter) return true;
      if (cat.children) {
        for (const sub of cat.children) {
          if (sub.id === id && sub.hasCarFilter) return true;
        }
      }
    }
    return false;
  }, [categoryId, categories]);

  const canSave = useMemo(() => {
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
      if (newCoverIndex === null && pendingCoverId === null) {
        const hasCover = existingMedia.some((m) => m.isCover && !deletedIds.includes(m.id));
        if (!hasCover) {
          const firstImgIdx = updated.findIndex((f) => f.type === "image");
          if (firstImgIdx !== -1) setNewCoverIndex(firstImgIdx);
        }
      }
      return updated;
    });
  };

  const handleRemoveExisting = (mediaId: number) => {
    setDeletedIds((prev) => [...prev, mediaId]);
    setExistingMedia((prev) =>
      prev.map((m) => (m.id === mediaId ? { ...m, isCover: false } : m))
    );

    // If we removed the cover, reassign
    const removed = existingMedia.find((m) => m.id === mediaId);
    if (removed?.isCover) {
      setPendingCoverId(null);
      const nextImage = existingMedia.find(
        (m) => m.id !== mediaId && m.type === "image" && !deletedIds.includes(m.id)
      );
      if (nextImage) {
        setPendingCoverId(nextImage.id);
        setExistingMedia((prev) =>
          prev.map((m) => ({ ...m, isCover: m.id === nextImage.id }))
        );
      } else {
        const firstNewImg = newFiles.findIndex((f) => f.type === "image");
        setNewCoverIndex(firstNewImg === -1 ? null : firstNewImg);
      }
    }

    if (pendingCoverId === mediaId) setPendingCoverId(null);
  };

  const handleRemoveNew = (index: number) => {
    setNewFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (newCoverIndex === index) {
        const hasCover = existingMedia.some((m) => m.isCover && !deletedIds.includes(m.id));
        if (!hasCover) {
          const firstImgIdx = updated.findIndex((f) => f.type === "image");
          setNewCoverIndex(firstImgIdx === -1 ? null : firstImgIdx);
        } else {
          setNewCoverIndex(null);
        }
      } else if (newCoverIndex !== null && newCoverIndex > index) {
        setNewCoverIndex(newCoverIndex - 1);
      }
      return updated;
    });
  };

  const handleSetCoverExisting = (mediaId: number) => {
    setExistingMedia((prev) =>
      prev.map((m) => ({ ...m, isCover: m.id === mediaId }))
    );
    setPendingCoverId(mediaId);
    setNewCoverIndex(null);
  };

  const handleSetCoverNew = (index: number) => {
    setNewCoverIndex(index);
    setExistingMedia((prev) => prev.map((m) => ({ ...m, isCover: false })));
    setPendingCoverId(null);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSave) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Update listing fields
      await updateListing(Number(id), {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        categoryId: Number(categoryId),
        cityId: cityId ? Number(cityId) : null,
        carMakeId: selectedCategoryHasCarFilter && carMakeId ? Number(carMakeId) : null,
        carModelId: selectedCategoryHasCarFilter && carModelId ? Number(carModelId) : null,
        carYear: selectedCategoryHasCarFilter && carYear ? Number(carYear) : null,
      });

      // 2. Delete removed media
      for (const mediaId of deletedIds) {
        await deleteListingMedia(Number(id), mediaId);
      }

      // 3. Upload new files
      if (newFiles.length > 0) {
        await uploadListingMedia(
          Number(id),
          newFiles.map((f) => f.file),
          newCoverIndex !== null ? newCoverIndex : undefined,
        );
      }

      // 4. Set new cover on existing image if changed
      if (pendingCoverId !== null && !deletedIds.includes(pendingCoverId)) {
        await setListingCover(Number(id), pendingCoverId);
      }

      router.push("/me/items");
    } catch (e: any) {
      setError(e.message || "Ошибка при сохранении объявления");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || initialLoading) {
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

  // Filter out deleted items from view
  const visibleExistingMedia = existingMedia.filter(
    (m) => !deletedIds.includes(m.id)
  );

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="h2" style={{ marginBottom: 4 }}>
          Редактирование объявления
        </h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Измените информацию о товаре
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

          {/* Car fields — shown when category has hasCarFilter */}
          {selectedCategoryHasCarFilter && (
            <div
              style={{
                background: "rgba(94,92,248,0.04)",
                border: "1px solid rgba(94,92,248,0.12)",
                borderRadius: "var(--radius-lg)",
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Параметры автомобиля
              </div>

              <div>
                <div className="field-label">Марка</div>
                <select
                  value={carMakeId}
                  onChange={(e) => setCarMakeId(e.target.value)}
                  style={{ padding: "12px 14px" }}
                >
                  <option value="">Выберите марку</option>
                  {carMakes.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="field-label">Модель</div>
                <select
                  value={carModelId}
                  onChange={(e) => setCarModelId(e.target.value)}
                  disabled={!carMakeId}
                  style={{ padding: "12px 14px" }}
                >
                  <option value="">Выберите модель</option>
                  {carModels.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="field-label">Год выпуска</div>
                <input
                  type="number"
                  placeholder="Например: 2019"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={carYear}
                  onChange={(e) => setCarYear(e.target.value)}
                  style={{ padding: "12px 14px" }}
                />
              </div>
            </div>
          )}

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
              existingMedia={visibleExistingMedia}
              newFiles={newFiles}
              onAddFiles={handleAddFiles}
              onRemoveExisting={handleRemoveExisting}
              onRemoveNew={handleRemoveNew}
              onSetCoverExisting={handleSetCoverExisting}
              onSetCoverNew={handleSetCoverNew}
              newCoverIndex={newCoverIndex}
            />
          </div>

          <hr style={{ margin: 0 }} />

          {/* Submit */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn primary"
              disabled={!canSave || submitting}
              onClick={handleSubmit}
              style={{
                padding: "14px 20px",
                fontSize: 16,
                flex: 1,
                opacity: !canSave || submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Сохранение..." : "Сохранить изменения"}
            </button>
            <button
              className="btn"
              onClick={() => router.push("/me/items")}
              style={{ padding: "14px 20px", fontSize: 16 }}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
