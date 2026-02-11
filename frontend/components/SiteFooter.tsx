import Link from "next/link";

export function SiteFooter() {
  return (
    <footer style={{ borderTop:"1px solid var(--line)", background:"#fff" }}>
      <div className="container" style={{ padding:"18px 16px" }}>
        <div className="row" style={{ justifyContent:"space-between", flexWrap:"wrap" }}>
          <div className="muted">© TENOT — объявления без лишнего</div>
          <div className="row" style={{ gap: 12, flexWrap:"wrap" }}>
            <Link href="/docs/terms" className="muted">Соглашение</Link>
            <Link href="/docs/privacy" className="muted">Конфиденциальность</Link>
            <Link href="/docs/rules" className="muted">Правила</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
