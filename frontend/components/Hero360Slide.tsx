import Link from 'next/link';
import { Car360Illustration } from '@/components/Car360Illustration';

const BENEFITS = [
  {
    title: 'Продаются быстрее',
    text: 'Покупатель осматривает авто со всех сторон ещё до звонка — меньше сомнений и лишних вопросов.',
  },
  {
    title: 'Больше доверия',
    text: 'Честный обзор без «удачных ракурсов» выделяет объявление среди обычных фото.',
  },
  {
    title: 'Снять — пара минут',
    text: 'В мобильном приложении TENOT просто обойдите машину с камерой — панорама соберётся сама.',
  },
];

/** Второй слайд героя: реклама объявлений с панорамой 360°. */
export function Hero360Slide() {
  return (
    <div className="grid hero-360" style={{ alignItems: 'center', position: 'relative' }}>
      <div className="hero-main" style={{ gridColumn: 'span 6' }}>
        <div className="badge" style={{ marginBottom: 16 }}>новинка · обзор 360°</div>
        <h2 className="h1">
          Объявления с <span style={{ color: 'var(--brand)' }}>360°</span>
          <br />
          продаются быстрее
        </h2>
        <ul className="hero-360-list">
          {BENEFITS.map((b) => (
            <li key={b.title}>
              <span className="hero-360-check" aria-hidden>✓</span>
              <span>
                <b>{b.title}.</b> <span className="hero-360-desc">{b.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <Link href="/add" className="btn primary" style={{ marginTop: 18, display: 'inline-flex' }}>
          Разместить объявление
        </Link>
      </div>
      <div className="hero-how hero-360-art" style={{ gridColumn: 'span 6' }}>
        <Car360Illustration className="hero-360-svg" />
      </div>
    </div>
  );
}
