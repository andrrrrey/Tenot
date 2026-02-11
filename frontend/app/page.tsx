import Link from "next/link";
import { CategoriesGrid } from "@/components/CategoriesGrid";
import { FreshList } from "@/components/FreshList";
import { SearchBar } from "@/components/SearchBar";

export default function HomePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <section className="card" style={{ padding: 18 }}>
        <div className="grid" style={{ alignItems: "center" }}>
          <div style={{ gridColumn: "span 7" }}>
            <div className="badge">TENOT</div>
            <h1 className="h1" style={{ marginTop: 10 }}>
              объявления<br />без лишнего
            </h1>
            <p className="muted" style={{ marginTop: 10, marginBottom: 16 }}>
              Быстро размести объявление или найди нужное — без перегруза и лишних шагов.
            </p>
            <SearchBar />
            <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
              <Link className="btn primary" href="/add">Разместить объявление</Link>
              <Link className="btn" href="/search">Смотреть все объявления</Link>
            </div>
          </div>
          <div className="card" style={{ gridColumn: "span 5", background: "var(--soft)" }}>
            <div className="h2">Как это работает</div>
            <ol className="muted" style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18 }}>
              <li>Выбираешь категорию</li>
              <li>Добавляешь фото и цену</li>
              <li>Публикуешь — готово</li>
            </ol>
          </div>
        </div>
      </section>

      <section>
        <h2 className="h2" style={{ marginBottom: 10 }}>Категории</h2>
        <CategoriesGrid />
      </section>

      <section>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 className="h2">Свежее</h2>
          <Link className="btn" href="/search">Открыть поиск</Link>
        </div>
        <div style={{ marginTop: 10 }}>
          <FreshList />
        </div>
      </section>
    </div>
  );
}
