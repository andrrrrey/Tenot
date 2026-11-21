'use client';

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const INTERVAL = 7000;

/**
 * Слайдер героя с автопрокруткой. Слайды лежат в одной ячейке сетки,
 * поэтому высота блока равна самому высокому слайду и не прыгает.
 * Пауза при наведении, свайп на тач-экранах, точки-переключатели.
 */
export function HeroSlider({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const id = window.setTimeout(() => go(index + 1), INTERVAL);
    return () => window.clearTimeout(id);
  }, [index, paused, count, go]);

  return (
    <section
      className="hero-slider"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="hero-slides">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`hero-slide${i === index ? ' is-active' : ''}`}
            aria-hidden={i !== index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} из ${count}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="hero-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`hero-dot${i === index ? ' is-active' : ''}`}
              aria-label={`Слайд ${i + 1}`}
              aria-current={i === index}
              onClick={() => go(i)}
            >
              {i === index && !paused && <span style={{ animationDuration: `${INTERVAL}ms` }} />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
