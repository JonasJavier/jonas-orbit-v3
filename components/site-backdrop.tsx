"use client";

/**
 * Nivel `flat` del pivote (docs/plans/sistema-gargantua.md §5): el fondo que ve
 * quien tiene reduced-motion, `?no3d=1`, o un equipo que no puede pagar WebGL.
 * Hereda intacto el starfield 2D de F1A — el plan es explícito en que no se
 * tira código que ya funciona y ya tiene tests.
 *
 * Dos cambios respecto de F1A:
 *
 * 1. **Vive en el layout, no en la home.** Sobrevive a la navegación entre las
 *    12 rutas sin remontarse. Es el mismo hueco donde G2 colgará el canvas
 *    persistente de la escena (§4), y por eso se estrena ya.
 * 2. **Lo mueve el tiempo, no el scroll.** El scroll dejó de ser fuente de
 *    verdad de nada visual (regla 6 reescrita). La deriva es una onda triangular
 *    lentísima, así que no hay salto al cerrar el ciclo.
 */

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLightEffectsMode } from "@/lib/effects-mode";
import {
  createStarPoints,
  drawStarfield,
  type StarPoint,
} from "@/lib/starfield";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { findWorldRoute, type WorldRoute } from "@/lib/world-route";
import { Starfield2D } from "./starfield-2d";

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/** Un ciclo completo de ida y vuelta de la deriva. Deliberadamente enorme. */
const DRIFT_PERIOD_MS = 180_000;
/** ~20 fps. La deriva es tan lenta que 60 fps solo gastaría batería. */
const FRAME_INTERVAL_MS = 50;

export function SiteBackdrop({
  routes,
  fallbackAccent,
}: {
  routes: readonly WorldRoute[];
  fallbackAccent: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const lightEffects = useLightEffectsMode();
  const pathname = usePathname();

  // Los dos vetos duros del plan. El contenido es idéntico en ambos casos:
  // solo cambia si se monta el canvas.
  const starfieldEnabled = !reducedMotion && !lightEffects;
  const accent = findWorldRoute(pathname, routes)?.accent ?? fallbackAccent;

  useEffect(() => {
    // No hace falta revertir `canvasReady` cuando el perfil ligero se enciende:
    // el render exige AMBAS condiciones, así que el canvas se desmonta solo.
    if (!starfieldEnabled) return;

    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(
        () => setCanvasReady(true),
        { timeout: 1_000 },
      );
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    const handle = window.setTimeout(() => setCanvasReady(true), 220);
    return () => window.clearTimeout(handle);
  }, [starfieldEnabled]);

  // Señales observables que F1A ya publicaba y que los tests E2E leen: decir en
  // el DOM qué perfil está activo es también lo que hace auditable la regla 5.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.reducedMotion = String(reducedMotion);
    root.dataset.starfield =
      canvasReady && starfieldEnabled ? "ready" : "static";
  }, [canvasReady, reducedMotion, starfieldEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasReady || !starfieldEnabled) return;

    const context: CanvasRenderingContext2D | null = canvas.getContext("2d");
    if (!context) return;
    const surface = canvas;
    const ctx = context;

    let stars: StarPoint[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastDraw = 0;
    const start = performance.now();

    function measure() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      width = window.innerWidth;
      height = window.innerHeight;
      surface.width = Math.round(width * ratio);
      surface.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      stars = createStarPoints(width, height);
      lastDraw = 0;
    }

    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      if (now - lastDraw < FRAME_INTERVAL_MS) return;
      lastDraw = now;

      // Onda triangular: sube y baja sin discontinuidad. Con una rampa que
      // salta de 1 a 0 el anillo de la escena pegaría un brinco cada ciclo.
      const cycle = ((now - start) % DRIFT_PERIOD_MS) / DRIFT_PERIOD_MS;
      const progress = 1 - Math.abs(1 - 2 * cycle);

      drawStarfield({
        context: ctx,
        width,
        height,
        stars,
        globalProgress: progress,
        worldProgress: 0.5,
        accent,
      });
    }

    // Presupuesto de §8, adelantado: en segundo plano no se dibuja nada.
    function handleVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (!frame) {
        lastDraw = 0;
        frame = requestAnimationFrame(draw);
      }
    }

    measure();
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [accent, canvasReady, starfieldEnabled]);

  return (
    <>
      <div className="space-backdrop" aria-hidden="true">
        <span className="space-backdrop__stars" />
        <span className="space-backdrop__haze" />
        <span className="space-backdrop__grid" />
        {/* Gargantúa dibujado con gradientes para el nivel `flat`: quien no
            puede ejecutar la escena sigue viendo un sistema, no un vacío. El
            CSS lo retira en cuanto la escena real empieza a pintar. */}
        <span className="space-backdrop__gargantua" />
      </div>
      {canvasReady && starfieldEnabled ? <Starfield2D ref={canvasRef} /> : null}
    </>
  );
}
