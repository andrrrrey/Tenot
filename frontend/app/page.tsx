import Link from "next/link";
import { CategoriesGrid } from "@/components/CategoriesGrid";
import { FreshList } from "@/components/FreshList";
import { SearchBar } from "@/components/SearchBar";

export default function HomePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* Hero section */}
      <section
        style={{
          background: "var(--card-solid)",
          border: "1px solid var(--line-solid)",
          borderRadius: "var(--radius-xl)",
          padding: "40px 40px 36px",
          boxShadow: "var(--shadow)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decoration */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -40,
            left: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(120,100,255,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div className="grid" style={{ alignItems: "center", position: "relative" }}>
          <div className="hero-main" style={{ gridColumn: "span 7" }}>
            <div className="badge" style={{ marginBottom: 16 }}>
              объявления без лишнего
            </div>
            <h1 className="h1">
              Найди или продай<br />
              <span style={{ color: "var(--brand)" }}>быстро</span> и просто
            </h1>
            <p className="muted" style={{ marginTop: 14, marginBottom: 24, fontSize: 15, lineHeight: 1.7, maxWidth: 480 }}>
              Размести объявление за минуту или найди нужное — без перегруза и лишних шагов.
            </p>
            <SearchBar />
            <div className="row" style={{ marginTop: 16, flexWrap: "wrap", gap: 10 }}>
              <Link
                className="btn primary"
                href="/add"
                style={{ padding: "12px 20px", fontSize: 15 }}
              >
                Разместить объявление
              </Link>
              <Link
                className="btn"
                href="/search"
                style={{ padding: "12px 20px", fontSize: 15 }}
              >
                Смотреть все
              </Link>
            </div>
          </div>

          <div
            className="hero-how"
            style={{
              gridColumn: "span 5",
              background: "var(--soft-solid)",
              border: "1px solid var(--line-solid)",
              borderRadius: "var(--radius-lg)",
              padding: "24px 26px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="h2" style={{ marginBottom: 16 }}>Как это работает</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { num: "1", text: "Выбираешь категорию и город" },
                { num: "2", text: "Добавляешь фото и цену" },
                { num: "3", text: "Публикуешь — покупатели видят сразу" },
              ].map((step) => (
                <div key={step.num} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "var(--brand)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 4px 12px var(--brand-glow)",
                    }}
                  >
                    {step.num}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, paddingTop: 6, color: "var(--muted)" }}>
                    {step.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories section */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2 className="h2">Категории</h2>
        </div>
        <CategoriesGrid />
      </section>

      {/* Fresh listings section */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2 className="h2">Свежие объявления</h2>
          <Link
            className="btn"
            href="/search"
            style={{ fontSize: 13, padding: "8px 14px" }}
          >
            Смотреть все
          </Link>
        </div>
        <FreshList />
      </section>
    </div>
  );
}
