"use client";

import { useEffect, useRef } from "react";
import {
  createStardustPool,
  drawStardust,
  spawnStardust,
  STARDUST_POOL_CAPACITY,
  updateStardust,
} from "@/lib/stardust";

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const CONTROL_SELECTOR =
  ".nav-rail, a, button, input, textarea, select, [role='button']";

export function getNavigationPointerState(target: EventTarget | null) {
  if (!(target instanceof Element)) return "space" as const;
  // Un proxy de mundo sigue siendo target aunque su implementación sea <a>.
  if (target.closest("[data-system-body]")) return "target" as const;
  if (target.closest(CONTROL_SELECTOR)) return "control" as const;
  return "space" as const;
}

export function PointerLife({
  disabled,
  scopeKey,
}: {
  disabled: boolean;
  scopeKey: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const surface = canvasRef.current;
    const cursor = cursorRef.current;
    const scope = document.querySelector<HTMLElement>(".system-map");
    const finePointer = window.matchMedia?.(FINE_POINTER_QUERY).matches ?? false;

    if (disabled || !finePointer || !scope || !surface || !cursor) {
      root.dataset.pointerLife = "off";
      return;
    }

    const context = surface.getContext("2d");
    if (!context) {
      root.dataset.pointerLife = "off";
      return;
    }

    const activeSurface = surface;
    const activeCursor = cursor;
    const activeScope = scope;
    const activeContext = context;
    const pool = createStardustPool();
    let width = 0;
    let height = 0;
    let scopeBounds = activeScope.getBoundingClientRect();
    let frame = 0;
    let lastFrame = 0;
    let lastPointerTime = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let hasPointerSample = false;

    root.dataset.pointerLife = "ready";
    activeScope.dataset.navigationCursor = "active";
    activeSurface.dataset.particleCapacity = String(STARDUST_POOL_CAPACITY);

    function measure() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      activeSurface.width = Math.round(width * ratio);
      activeSurface.height = Math.round(height * ratio);
      activeContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      scopeBounds = activeScope.getBoundingClientRect();
    }

    function animate(now: number) {
      const delta = lastFrame ? now - lastFrame : 16.67;
      lastFrame = now;
      updateStardust(pool, delta);
      drawStardust(activeContext, width, height, pool);
      activeSurface.dataset.activeParticles = String(pool.activeCount);

      if (pool.activeCount > 0 && !document.hidden) {
        frame = requestAnimationFrame(animate);
      } else {
        frame = 0;
        lastFrame = 0;
      }
    }

    function ensureAnimation() {
      if (!frame && !document.hidden) frame = requestAnimationFrame(animate);
    }

    function isInsideScope(event: PointerEvent) {
      return (
        event.clientX >= scopeBounds.left &&
        event.clientX <= scopeBounds.right &&
        event.clientY >= scopeBounds.top &&
        event.clientY <= scopeBounds.bottom
      );
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType === "touch" || !isInsideScope(event)) {
        activeCursor.dataset.state = "hidden";
        activeScope.dataset.pointerState = "outside";
        hasPointerSample = false;
        return;
      }

      activeCursor.style.setProperty(
        "--navigation-cursor-x",
        `${event.clientX}px`,
      );
      activeCursor.style.setProperty(
        "--navigation-cursor-y",
        `${event.clientY}px`,
      );

      const state = getNavigationPointerState(event.target);
      activeCursor.dataset.state = state;
      activeScope.dataset.pointerState = state;

      const now = event.timeStamp;
      if (hasPointerSample && state !== "control") {
        const elapsed = Math.max(8, now - lastPointerTime);
        const velocityX = (event.clientX - lastPointerX) / elapsed;
        const velocityY = (event.clientY - lastPointerY) / elapsed;
        if (
          spawnStardust(
            pool,
            event.clientX,
            event.clientY,
            velocityX,
            velocityY,
            // El mismo `elapsed` con el que se midió la velocidad: juntos
            // reconstruyen el tramo exacto que hay que sembrar.
            elapsed,
          ) > 0
        ) {
          ensureAnimation();
        }
      }

      lastPointerTime = now;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      hasPointerSample = true;
    }

    function handlePointerDown() {
      if (activeScope.dataset.pointerState === "target") {
        activeCursor.dataset.state = "locked";
      }
    }

    function handleWindowBlur() {
      activeCursor.dataset.state = "hidden";
      activeScope.dataset.pointerState = "outside";
      hasPointerSample = false;
    }

    function handleScroll() {
      scopeBounds = activeScope.getBoundingClientRect();
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      cancelAnimationFrame(frame);
      activeContext.clearRect(0, 0, width, height);
      root.dataset.pointerLife = "off";
      delete activeScope.dataset.navigationCursor;
      delete activeScope.dataset.pointerState;
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [disabled, scopeKey]);

  return (
    <>
      <canvas
        aria-hidden="true"
        className="site-stardust"
        data-active-particles="0"
        data-pointer-life-layer="stardust"
        ref={canvasRef}
      />
      <span
        aria-hidden="true"
        className="navigation-cursor"
        data-navigation-cursor="true"
        data-state="hidden"
        ref={cursorRef}
      />
    </>
  );
}
