"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { createListing } from "@/services/listings";
import { getCategories, type Category } from "@/services/categories";

export default function AddPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireRole(["SUPPLIER", "ADMIN"]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [article, setArticle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка категорий
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
      article.trim().length >= 1 &&
      Number(price) > 0 &&
      description.trim().length >= 10 &&
      categoryId
    );
  }, [title, article, price, description, categoryId]);

  const handleSubmit = async () => {
    if (!canPublish) return;

    setSubmitting(true);
    setError(null);

    try {
      await createListing({
        title: title.trim(),
        article: article.trim(),
        description: description.trim(),
        price: Number(price),
        categoryId: Number(categoryId),
      });

      router.push("/me/items");
    } catch (e: any) {
      setError(e.message || "Ошибка при создании объявления");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="card">Загрузка...</div>;
  }

  if (!user) {
    return null; // useRequireRole redirects to login
  }

  return (
    <div className="grid">
      <section style={{ gridColumn: "span 8" }}>
        <div className="card">
          <div className="h2">Разместить объявление</div>

          {error && (
            <div style={{ marginTop: 12, color: "red", padding: 10, background: "#fee" }}>
              {error}
            </div>
          )}

          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Категория */}
            <label>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                Категория
              </div>
              <select
                value={categoryId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setCategoryId(e.target.value)
                }
              >
                <option value="">Выберите категорию</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Заголовок */}
            <label>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                Заголовок
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: iPhone 13 Pro, 256GB"
              />
            </label>

            {/* Артикул */}
            <label>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                Артикул / SKU
              </div>
              <input
                value={article}
                onChange={(e) => setArticle(e.target.value)}
                placeholder="Например: IP13P-256-BLK"
              />
            </label>

            {/* Цена */}
            <label>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                Цена (₽)
              </div>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
              />
            </label>

            {/* Описание */}
            <label>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                Описание
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Подробное описание товара..."
              />
            </label>

            {/* Кнопка */}
            <button
              className="btn primary"
              disabled={!canPublish || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Публикация..." : "Опубликовать"}
            </button>
          </div>
        </div>
      </section>

      <aside style={{ gridColumn: "span 4" }}>
        <div className="card" style={{ background: "var(--soft)" }}>
          <div className="h2">Подсказки</div>
          <ul style={{ marginTop: 10, paddingLeft: 20, fontSize: 14 }}>
            <li>Заголовок должен быть не менее 3 символов</li>
            <li>Укажите артикул для удобства поиска</li>
            <li>Описание должно быть не менее 10 символов</li>
            <li>Цена указывается в рублях</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
