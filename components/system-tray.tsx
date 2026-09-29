"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Cuánto hay que bajar seguido antes de retirar la bandeja, en px. */
const HIDE_AFTER = 48;
/** Por encima de esto la bandeja siempre se ve: es el sitio donde se la busca. */
const TOP_ZONE = 120;
/** Y al final de la página también: el pie le reserva hueco. */
const BOTTOM_ZONE = 96;

/**
 * La bandeja fija de MOVIMIENTO y AUDIO.
 *
 * En un móvil son dos círculos de 44 px en la esquina inferior derecha, justo
 * donde el pulgar lee y donde terminan los párrafos, los botones y la
 * navegación entre destinos: en la auditoría del 2026-09-29 tapaba texto en
 * todas las páginas. Se retira mientras se baja leyendo y vuelve en cuanto se
 * sube, arriba del todo y al final; es el patrón de las barras del navegador,
 * así que no hay que aprenderlo.
 *
 * Sólo se esconde en pantallas táctiles estrechas (CSS; con ratón siempre
 * está a mano), nunca con el foco o el panel de audio abierto dentro, y la
 * home no hace scroll, así que allí no cambia.
 */
export function SystemTray({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const anchor = useRef(0);

  useEffect(() => {
    let frame = 0;
    anchor.current = window.scrollY;

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const end =
        document.documentElement.scrollHeight - window.innerHeight - BOTTOM_ZONE;
      if (y < TOP_ZONE || y > end) {
        anchor.current = y;
        setHidden(false);
        return;
      }
      if (y < anchor.current) {
        // Cualquier subida la devuelve, y el ancla la sigue.
        anchor.current = y;
        setHidden(false);
      } else if (y - anchor.current > HIDE_AFTER) {
        anchor.current = y;
        setHidden(true);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="system-tray" data-retired={hidden ? "true" : undefined}>
      {children}
    </div>
  );
}
