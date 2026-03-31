"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { createListing, uploadListingMedia } from "@/services/listings";
import { getCategories, type Category } from "@/services/categories";
import { getCarMakes, getCarModels, type CarMake, type CarModel } from "@/services/car-makes";
import { CitySearchPopup } from "@/components/CitySearchPopup";
import { MediaUpload, type NewMediaFile } from "@/components/MediaUpload";
import { IconPlus, IconCheck } from "@/components/Icons";

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

  // Car fields
  const [carMakes, setCarMakes] = useState<CarMake[]>([]);
  const [carModels, setCarModels] = useState<CarModel[]>([]);
  const [carMakeId, setCarMakeId] = useState<string>("");
  const [carModelId, setCarModelId] = useState<string>("");
  const [carYear, setCarYear] = useState<string>("");

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
    getCarMakes().then(setCarMakes).catch(() => setCarMakes([]));
  }, []);

  // Load models when make changes
  useEffect(() => {
    if (carMakeId) {
      getCarModels(Number(carMakeId))
        .then(setCarModels)
        .catch(() => setCarModels([]));
    } else {
      setCarModels([]);
    }
    setCarModelId("");
  }, [carMakeId]);

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

  // Reset car fields when switching to non-car category
  useEffect(() => {
    if (!selectedCategoryHasCarFilter) {
      setCarMakeId("");
      setCarModelId("");
      setCarYear("");
    }
  }, [selectedCategoryHasCarFilter]);

  const canPublish = useMemo(() => {
    return (
      title.trim().length >= 3 &&
      Number(price) > 0 &&
      description.trim().length >= 10 &&
      categoryId
    );
  }, [title, price, description, categoryId]);

  const handleAddFiles = (files: NewMediaFile[]) => {
    setNewFiles((prev) => {
      const updated = [...prev, ...files];
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
        ...(selectedCategoryHasCarFilter && carMakeId ? { carMakeId: Number(carMakeId) } : {}),
        ...(selectedCategoryHasCarFilter && carModelId ? { carModelId: Number(carModelId) } : {}),
        ...(selectedCategoryHasCarFilter && carYear ? { carYear: Number(carYear) } : {}),
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
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div className="muted">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "var(--brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 16px var(--brand-glow)",
            }}
          >
            <IconPlus size={20} color="#fff" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="h2" style={{ margin: 0 }}>Новое объявление</h1>
            <p className="muted" style={{ margin: 0, fontSize: 13, marginTop: 2 }}>
              Заполните информацию о товаре
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Form */}
      <div className="card" style={{ padding: "28px 28px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Category */}
          <div>
            <div className="field-label">Категория</div>
            <select
              value={categoryId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value)}
            >
              <option value="">Выберите категорию</option>
              {categories.map((c) =>
                c.children && c.children.length > 0 ? (
                  <optgroup key={c.id} label={c.name}>
                    <option value={c.id}>{c.name} (все)</option>
                    {c.children.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={c.id} value={c.id}>{c.name}</option>
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
                <select value={carMakeId} onChange={(e) => setCarMakeId(e.target.value)}>
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
                  className="input"
                  type="number"
                  placeholder="Например: 2019"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={carYear}
                  onChange={(e) => setCarYear(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* City */}
          <div>
            <div className="field-label">Город</div>
            <CitySearchPopup
              value={cityId}
              selectedName={cityName}
              onChange={(id, name) => { setCityId(id); setCityName(name); }}
              placeholder="Выберите город"
            />
          </div>

          {/* Title */}
          <div>
            <div className="field-label">Заголовок</div>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: iPhone 13 Pro, 256GB"
            />
            {title.length > 0 && title.trim().length < 3 && (
              <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
                Минимум 3 символа
              </div>
            )}
          </div>

          {/* Price */}
          <div>
            <div className="field-label">Цена</div>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                style={{ paddingRight: 48 }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                  fontWeight: 700,
                  fontSize: 16,
                  pointerEvents: "none",
                }}
              >
                ₽
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="field-label">Описание</div>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Подробное описание: состояние, комплектация, особенности..."
            />
            {description.length > 0 && description.trim().length < 10 && (
              <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
                Минимум 10 символов
              </div>
            )}
          </div>

          {/* Media */}
          <div>
            <div className="field-label">Фото и видео</div>
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

          <button
            className="btn primary"
            disabled={!canPublish || submitting}
            onClick={handleSubmit}
            style={{
              padding: "14px 24px",
              fontSize: 15,
              opacity: !canPublish || submitting ? 0.6 : 1,
              gap: 8,
            }}
          >
            {submitting ? (
              "Публикация..."
            ) : (
              <>
                <IconCheck size={17} strokeWidth={2.2} />
                Опубликовать объявление
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tips */}
      <div
        className="card"
        style={{
          marginTop: 16,
          padding: "18px 24px",
          background: "rgba(94,92,248,0.04)",
          border: "1px solid rgba(94,92,248,0.1)",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: "var(--brand)" }}>
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
            lineHeight: 1.5,
          }}
        >
          <li>Добавьте до 10 фотографий и 1 видео</li>
          <li>Укажите город для привлечения местных покупателей</li>
          <li>Напишите подробное и честное описание</li>
          <li>Цена указывается в рублях</li>
        </ul>
      </div>
    </div>
  );
}
