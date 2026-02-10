"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { getListing, updateListing } from "@/services/listings";
import { getCategories, type Category } from "@/services/categories";
import { getCities, type City } from "@/services/cities";

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireRole(["USER", "ADMIN"]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));

    getCities()
      .then(setCities)
      .catch(() => setCities([]));
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
      })
      .catch(() => setError("Ошибка загрузки объявления"))
      .finally(() => setInitialLoading(false));
  }, [id, user]);

  const canSave = useMemo(() => {
    return (
      title.trim().length >= 3 &&
      Number(price) > 0 &&
      description.trim().length >= 10 &&
      categoryId
    );
  }, [title, price, description, categoryId]);

  const handleSubmit = async () => {
    if (!canSave) return;

    setSubmitting(true);
    setError(null);

    try {
      await updateListing(Number(id), {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        categoryId: Number(categoryId),
        cityId: cityId ? Number(cityId) : null,
      });

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
            <select
              value={cityId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setCityId(e.target.value)
              }
              style={{ padding: "12px 14px" }}
            >
              <option value="">Выберите город</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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
