"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Плейсхолдер до появления блока рядом с экраном (держит место, чтобы вёрстка не прыгала). */
  placeholder?: ReactNode;
  /** Насколько заранее монтировать блок до попадания в экран. */
  rootMargin?: string;
};

/**
 * Монтирует тяжёлый блок (360°-модули) только когда он приближается к области видимости.
 * Пока блок вне экрана, его JS-чанк и превью не загружаются.
 */
export function LazyMount({ children, placeholder = null, rootMargin = "300px 0px" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return <div ref={ref}>{visible ? children : placeholder}</div>;
}
