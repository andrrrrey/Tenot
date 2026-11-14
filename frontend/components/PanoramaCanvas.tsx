"use client";

import { useEffect, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { GyroscopePlugin } from "@photo-sphere-viewer/gyroscope-plugin";
import "@photo-sphere-viewer/core/index.css";

type Props = {
  src: string;
  onError?: () => void;
};

/**
 * Сам просмотрщик сферической панорамы (Photo Sphere Viewer, MIT).
 * Подключается только через next/dynamic из Panorama360 — в основной бандл не попадает.
 */
export default function PanoramaCanvas({ src, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Колбэк — через ref, чтобы новый onError при перерисовке родителя не пересоздавал просмотрщик.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!ref.current) return;
    const viewer = new Viewer({
      container: ref.current,
      panorama: src,
      defaultZoomLvl: 30,
      // Колесо мыши прокручивает страницу; масштаб — кнопками или Ctrl + колесо
      mousewheel: true,
      mousewheelCtrlKey: true,
      touchmoveTwoFingers: false,
      // Кнопка гироскопа показывается только на устройствах с датчиками;
      // на iOS разрешение запрашивается по нажатию на неё.
      plugins: [[GyroscopePlugin, { touchmove: true }]],
      navbar: ["zoom", "gyroscope", "fullscreen"],
      lang: {
        zoom: "Масштаб",
        zoomOut: "Уменьшить",
        zoomIn: "Увеличить",
        fullscreen: "Во весь экран",
        gyroscope: "Двигать телефоном",
        loadError: "Не удалось загрузить панораму",
        ctrlZoom: "Ctrl + колесо мыши — масштаб",
      },
      loadingTxt: "Загрузка…",
    });
    viewer.addEventListener("panorama-error", () => onErrorRef.current?.());
    return () => viewer.destroy();
  }, [src]);

  return <div ref={ref} className="pano360-canvas" />;
}
