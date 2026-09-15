"use client";

/**
 * Cielo persistente del layout. Es la profundidad completa detrás de WebGL y
 * pasa a ser el primer plano espacial en `flat`; reduced-motion conserva las
 * tres capas pero las dibuja una sola vez.
 *
 * Dos cambios respecto de F1A:
 *
 * 1. **Vive en el layout, no en la home.** Sobrevive a la navegación entre las
 *    todas las rutas sin remontarse. Es el mismo hueco donde G2 colgará el canvas
 *    persistente de la escena (§4), y por eso se estrena ya.
 * 2. **Lo mueve el tiempo, no el scroll.** FAR es estático; MID/NEAR usan una
 *    onda triangular lentísima y paralaje acotado sólo en puntero fino.
 */

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  pointerLifeEnabled,
  useForcedEffects,
  useLightEffectsMode,
} from "@/lib/effects-mode";
import {
  createStarPoints,
  drawStarfield,
  STARFIELD_FRAME_INTERVAL_MS,
  type StarPoint,
} from "@/lib/starfield";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { findWorldRoute, type WorldRoute } from "@/lib/world-route";
import { PointerLife } from "./pointer-life";
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
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

export function SiteBackdrop({
  routes,
  fallbackAccent,
}: {
  routes: readonly WorldRoute[];
  fallbackAccent: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [sceneLive, setSceneLive] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const lightEffects = useLightEffectsMode();
  const forcedEffects = useForcedEffects();
  const pathname = usePathname();

  // Reduced motion y el perfil ligero conservan el cielo, pero lo congelan.
  // La reducción afecta al movimiento, no a la profundidad del primer frame.
  //
  // Una activación explícita recupera el conjunto entero —escena, cursor,
  // polvo, paralaje y deriva—. Sin esa acción, reduced-motion conserva el cielo
  // congelado como primer frame deliberado.
  const route = findWorldRoute(pathname, routes);
  // The personal album has an opaque landscape and its own tiny CSS stars.
  // Do not run the hidden starfield or pointer trail beneath it.
  const pointerLifeDisabled = route?.id === "gargantua" || !pointerLifeEnabled({
    reducedMotion,
    lightEffects,
    forcedEffects,
  });
  const accent = route?.accent ?? fallbackAccent;

  useEffect(() => {
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
  }, []);

  // La escena WebGL ya dibuja sus tres estratos de estrellas dentro del shader
  // (donde el lente puede curvarlas). El canvas 2D permanece como fallback pero
  // deja de solicitar frames cuando la escena publica su primer fotograma.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setSceneLive(root.dataset.sceneLive === "true");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-scene-live"],
    });
    return () => observer.disconnect();
  }, []);

  // Señales observables que F1A ya publicaba y que los tests E2E leen: decir en
  // el DOM qué perfil está activo es también lo que hace auditable la regla 5.
  useEffect(() => {
    const root = document.documentElement;
    const finePointer = window.matchMedia?.(FINE_POINTER_QUERY).matches ?? false;
    root.dataset.reducedMotion = String(reducedMotion);
    root.dataset.effectsForced = String(forcedEffects);
    root.dataset.starfield = canvasReady ? "ready" : "static";
    root.dataset.starfieldMotion =
      canvasReady && !pointerLifeDisabled && !sceneLive && finePointer
        ? "animated"
        : "static";
  }, [canvasReady, forcedEffects, pointerLifeDisabled, reducedMotion, sceneLive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasReady) return;

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
    const animated =
      !pointerLifeDisabled &&
      !sceneLive &&
      (window.matchMedia?.(FINE_POINTER_QUERY).matches ?? false);
    let parallaxX = 0;
    let parallaxY = 0;
    let targetParallaxX = 0;
    let targetParallaxY = 0;

    function measure() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      width = window.innerWidth;
      height = window.innerHeight;
      surface.width = Math.round(width * ratio);
      surface.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      stars = createStarPoints(width, height);
      let farCount = 0;
      let midCount = 0;
      for (const star of stars) {
        if (star.layer === "far") farCount += 1;
        else if (star.layer === "mid") midCount += 1;
      }
      const nearCount = stars.length - farCount - midCount;
      surface.dataset.starCount = String(stars.length);
      surface.dataset.starBudget = `${farCount}/${midCount}/${nearCount}`;
      surface.dataset.motion = animated ? "mid-near" : "static";
      lastDraw = 0;

      if (!animated) {
        drawStarfield({
          context: ctx,
          width,
          height,
          stars,
          globalProgress: 0,
          accent,
        });
      }
    }

    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      if (now - lastDraw < STARFIELD_FRAME_INTERVAL_MS) return;
      lastDraw = now;

      // Onda triangular: sube y baja sin discontinuidad. Una rampa 1→0 haría
      // saltar MID/NEAR al cerrar cada ciclo de tres minutos.
      const cycle = ((now - start) % DRIFT_PERIOD_MS) / DRIFT_PERIOD_MS;
      const progress = 1 - Math.abs(1 - 2 * cycle);
      parallaxX += (targetParallaxX - parallaxX) * 0.085;
      parallaxY += (targetParallaxY - parallaxY) * 0.085;

      drawStarfield({
        context: ctx,
        width,
        height,
        stars,
        globalProgress: progress,
        parallaxX,
        parallaxY,
        accent,
      });
    }

    function handlePointerMove(event: PointerEvent) {
      targetParallaxX = (event.clientX / Math.max(1, width) - 0.5) * 2;
      targetParallaxY = (event.clientY / Math.max(1, height) - 0.5) * 2;
    }

    // Presupuesto de §8, adelantado: en segundo plano no se dibuja nada.
    function handleVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (animated && !frame) {
        lastDraw = 0;
        frame = requestAnimationFrame(draw);
      }
    }

    measure();
    if (animated) frame = requestAnimationFrame(draw);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    if (animated) {
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [accent, canvasReady, pointerLifeDisabled, sceneLive]);

  return (
    <>
      <div className="space-backdrop" aria-hidden="true">
        <span className="space-backdrop__stars" />
        <span className="space-backdrop__haze" />
        <span className="space-backdrop__grid" />
        {/* Gargantúa dibujado con gradientes para el nivel `flat`: quien no
            puede ejecutar la escena sigue viendo un sistema, no un vacío. El
            CSS lo retira en cuanto la escena real empieza a pintar. */}
        <span className="space-backdrop__gargantua">
          <span className="space-backdrop__gargantua-lensing" />
          <span className="space-backdrop__gargantua-disk" />
          <span className="space-backdrop__gargantua-shadow" />
        </span>
      </div>
      {canvasReady ? (
        <>
          <Starfield2D ref={canvasRef} />
          <PointerLife
            disabled={pointerLifeDisabled}
            profile={sceneLive ? "webgl" : "flat"}
            scopeKey={pathname}
          />
        </>
      ) : null}
    </>
  );
}
