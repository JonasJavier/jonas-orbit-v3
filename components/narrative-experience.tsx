"use client";

import { animate } from "motion/mini";
import {
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type RefObject,
} from "react";
import {
  calculateNarrativeProgress,
  getAnchorScrollTop,
  type NarrativeSectionMetric,
} from "@/lib/narrative-progress";
import {
  publishNarrativeProgress,
  resetNarrativeProgress,
  useNarrativeStore,
} from "@/lib/narrative-store";
import type { NarrativeWorldSummary } from "@/lib/narrative-types";
import { useLightEffectsMode } from "@/lib/effects-mode";
import { createStarPoints, drawStarfield, type StarPoint } from "@/lib/starfield";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { Starfield2D } from "./starfield-2d";
import styles from "./narrative-experience.module.css";

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const REVEAL_SELECTOR = [
  ".world-section__masthead > *",
  ".fact-grid > *",
  ".panel-grid > li",
  ".project-card",
  ".ranger-offer",
  ".ranger-actions",
  ".contact-channels",
  ".contact-form-shell",
].join(",");

function scrollImmediately(target: HTMLElement) {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  const scrollPaddingTop =
    Number.parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
  const targetTop = target.getBoundingClientRect().top + window.scrollY;
  root.style.scrollBehavior = "auto";
  window.scrollTo({
    top: getAnchorScrollTop(targetTop, scrollPaddingTop),
    behavior: "auto",
  });
  root.style.scrollBehavior = previousBehavior;
}

function revealSection(section: HTMLElement, reducedMotion: boolean) {
  if (section.dataset.revealed === "true") return;
  section.dataset.revealed = "true";
  if (reducedMotion) return;

  const targets = Array.from(
    section.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
  ).slice(0, 12);

  targets.forEach((target, index) => {
    animate(
      target,
      {
        opacity: [0.42, 1],
        transform: ["translateY(24px)", "translateY(0px)"],
      },
      {
        delay: Math.min(index * 0.045, 0.32),
        duration: 0.62,
        ease: [0.22, 1, 0.36, 1],
      },
    );
  });
}

function useNarrativeController({
  worlds,
  canvasRef,
  canvasReadyRef,
  reducedMotion,
  starfieldEnabled,
}: {
  worlds: readonly NarrativeWorldSummary[];
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasReadyRef: RefObject<boolean>;
  /** Preferencia de accesibilidad: gobierna animaciones y saltos de scroll. */
  reducedMotion: boolean;
  /** Slot de fondo: falso con reduced-motion o con el perfil ligero `?no3d=1`. */
  starfieldEnabled: boolean;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const sections = worlds
      .map((world) =>
        document.querySelector<HTMLElement>(`[data-world="${world.id}"]`),
      )
      .filter((section): section is HTMLElement => Boolean(section));
    if (sections.length !== worlds.length) return;

    root.dataset.narrativeReady = "true";
    root.dataset.reducedMotion = String(reducedMotion);
    root.dataset.starfield =
      canvasReadyRef.current && starfieldEnabled ? "ready" : "static";

    let metrics: NarrativeSectionMetric[] = [];
    let documentHeight = document.documentElement.scrollHeight;
    let scrollPaddingTop = 0;
    let animationFrame = 0;
    let needsMeasurement = true;
    let previousWorldIndex = -1;
    let explicitTarget: number | null = (() => {
      const slug = window.location.hash.slice(1);
      const index = worlds.findIndex((world) => world.slug === slug);
      return index >= 0 ? index : null;
    })();
    window.history.replaceState(
      {
        ...window.history.state,
        jonasOrbitPhase: explicitTarget === null ? "hero" : "world",
        jonasOrbitWorld: explicitTarget ?? 0,
      },
      "",
      window.location.href,
    );
    root.dataset.narrativeNavigation =
      explicitTarget === null ? "free" : "targeting";
    let explicitCanRelease = false;
    let explicitSettleAttempts = 0;
    let explicitStablePasses = 0;
    let explicitSettleTimer = 0;
    let stars: StarPoint[] = [];
    let canvasWidth = 0;
    let canvasHeight = 0;

    function measure() {
      const scrollY = window.scrollY;
      metrics = sections.map((section, index) => {
        const bounds = section.getBoundingClientRect();
        return {
          id: worlds[index].id,
          top: bounds.top + scrollY,
          height: Math.max(1, bounds.height),
        };
      });
      documentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );
      scrollPaddingTop =
        Number.parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;

      const canvas = canvasRef.current;
      if (canvas && canvasReadyRef.current && starfieldEnabled) {
        const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        canvas.width = Math.round(canvasWidth * ratio);
        canvas.height = Math.round(canvasHeight * ratio);
        const context = canvas.getContext("2d");
        context?.setTransform(ratio, 0, 0, ratio, 0, 0);
        stars = createStarPoints(canvasWidth, canvasHeight);
      }

      needsMeasurement = false;
    }

    function replaceHash(worldIndex: number, phase: "hero" | "world") {
      const desiredHash =
        phase === "world" ? `#${worlds[worldIndex].slug}` : "";
      if (window.location.hash === desiredHash) return;
      const url = `${window.location.pathname}${window.location.search}${desiredHash}`;
      window.history.replaceState(
        {
          ...window.history.state,
          jonasOrbitPhase: phase,
          jonasOrbitWorld: worldIndex,
        },
        "",
        url,
      );
    }

    function updateFrame() {
      animationFrame = 0;
      if (needsMeasurement || explicitTarget !== null) measure();

      const snapshot = calculateNarrativeProgress({
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
        documentHeight,
        scrollPaddingTop,
        sections: metrics,
      });
      const activeWorld = worlds[snapshot.worldIndex];
      publishNarrativeProgress({
        ...snapshot,
        worldId: activeWorld.id,
      });

      root.style.setProperty(
        "--narrative-global-progress",
        snapshot.globalProgress.toFixed(4),
      );
      root.style.setProperty(
        "--narrative-world-progress",
        snapshot.worldProgress.toFixed(4),
      );

      const activeSection = sections[snapshot.worldIndex];
      activeSection.style.setProperty(
        "--world-shift",
        `${((0.5 - snapshot.worldProgress) * 34).toFixed(2)}px`,
      );

      if (previousWorldIndex !== snapshot.worldIndex) {
        sections.forEach((section, index) => {
          section.dataset.state =
            index === snapshot.worldIndex
              ? "active"
              : index < snapshot.worldIndex
                ? "past"
                : "future";
        });
        previousWorldIndex = snapshot.worldIndex;
      }

      if (explicitTarget !== null) {
        const targetTop = sections[explicitTarget].getBoundingClientRect().top;
        if (
          explicitCanRelease &&
          snapshot.worldIndex === explicitTarget &&
          Math.abs(targetTop - scrollPaddingTop) < 3
        ) {
          explicitTarget = null;
          explicitCanRelease = false;
          explicitSettleAttempts = 0;
          explicitStablePasses = 0;
          root.dataset.narrativeNavigation = "free";
          if (explicitSettleTimer) {
            window.clearTimeout(explicitSettleTimer);
            explicitSettleTimer = 0;
          }
        }
      } else {
        replaceHash(snapshot.worldIndex, snapshot.phase);
      }

      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (
        canvas &&
        context &&
        canvasReadyRef.current &&
        starfieldEnabled &&
        stars.length > 0
      ) {
        drawStarfield({
          context,
          width: canvasWidth,
          height: canvasHeight,
          stars,
          globalProgress: snapshot.globalProgress,
          worldProgress: snapshot.worldProgress,
          accent: activeWorld.accent,
        });
      }
    }

    function scheduleFrame({ measureAgain = false } = {}) {
      if (measureAgain) needsMeasurement = true;
      if (!animationFrame) animationFrame = requestAnimationFrame(updateFrame);
    }

    function queueExplicitSettle(delay = 140) {
      if (explicitTarget === null) return;
      if (explicitSettleTimer) window.clearTimeout(explicitSettleTimer);
      explicitSettleTimer = window.setTimeout(() => {
        explicitSettleTimer = 0;
        if (explicitTarget === null) return;

        measure();
        const target = sections[explicitTarget];
        const targetTop = target.getBoundingClientRect().top;
        const aligned = Math.abs(targetTop - scrollPaddingTop) < 3;

        if (!aligned && explicitSettleAttempts < 6) {
          explicitCanRelease = false;
          explicitSettleAttempts += 1;
          explicitStablePasses = 0;
          scrollImmediately(target);
          scheduleFrame({ measureAgain: true });
          queueExplicitSettle(80);
          return;
        }

        if (aligned && explicitStablePasses < 2) {
          explicitStablePasses += 1;
          scheduleFrame({ measureAgain: true });
          queueExplicitSettle(80);
          return;
        }

        explicitCanRelease = true;
        scheduleFrame({ measureAgain: true });
      }, delay);
    }

    function navigateTo(index: number, pushHistory: boolean) {
      const world = worlds[index];
      const section = sections[index];
      explicitTarget = index;
      explicitCanRelease = false;
      explicitSettleAttempts = 0;
      explicitStablePasses = 0;
      root.dataset.narrativeNavigation = "targeting";
      if (pushHistory && window.location.hash !== `#${world.slug}`) {
        window.history.pushState(
          {
            ...window.history.state,
            jonasOrbitPhase: "world",
            jonasOrbitWorld: index,
          },
          "",
          `${window.location.pathname}${window.location.search}#${world.slug}`,
        );
      }
      if (reducedMotion) {
        scrollImmediately(section);
        measure();
        scrollImmediately(section);
      } else {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      scheduleFrame({ measureAgain: true });
      queueExplicitSettle(reducedMotion ? 0 : 140);
    }

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (!anchor || anchor.hasAttribute("download") || anchor.target === "_blank") {
        return;
      }

      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        !url.hash
      ) {
        return;
      }
      const index = worlds.findIndex(
        (world) => `#${world.slug}` === url.hash,
      );
      if (index < 0) return;

      event.preventDefault();
      navigateTo(index, true);
    }

    function handlePopState(event: PopStateEvent) {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      if (explicitSettleTimer) {
        window.clearTimeout(explicitSettleTimer);
        explicitSettleTimer = 0;
      }

      const slug = window.location.hash.slice(1);
      const hashIndex = worlds.findIndex((world) => world.slug === slug);
      const storedIndex = event.state?.jonasOrbitWorld;
      const hasStoredHero = event.state?.jonasOrbitPhase === "hero";
      const hasStoredWorld =
        event.state?.jonasOrbitPhase === "world" &&
        Number.isInteger(storedIndex) &&
        storedIndex >= 0 &&
        storedIndex < worlds.length;
      const index = hasStoredHero
        ? -1
        : hasStoredWorld
          ? (storedIndex as number)
          : hashIndex;
      if (index >= 0) {
        const expectedHash = `#${worlds[index].slug}`;
        if (window.location.hash !== expectedHash) {
          window.history.replaceState(
            event.state,
            "",
            `${window.location.pathname}${window.location.search}${expectedHash}`,
          );
        }
        explicitTarget = index;
        explicitCanRelease = false;
        explicitSettleAttempts = 0;
        explicitStablePasses = 0;
        root.dataset.narrativeNavigation = "targeting";
        window.setTimeout(() => {
          scrollImmediately(sections[index]);
          scheduleFrame({ measureAgain: true });
          queueExplicitSettle(80);
        }, 0);
      } else {
        if (hasStoredHero && window.location.hash) {
          window.history.replaceState(
            event.state,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
        }
        explicitTarget = null;
        explicitCanRelease = false;
        root.dataset.narrativeNavigation = "free";
        window.scrollTo({ top: 0, behavior: "auto" });
        scheduleFrame();
      }
    }

    function interruptExplicitNavigation() {
      explicitTarget = null;
      explicitCanRelease = false;
      explicitStablePasses = 0;
      root.dataset.narrativeNavigation = "free";
      if (explicitSettleTimer) {
        window.clearTimeout(explicitSettleTimer);
        explicitSettleTimer = 0;
      }
      scheduleFrame();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(
          event.key,
        )
      ) {
        interruptExplicitNavigation();
      }
    }

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = entry.target as HTMLElement;
          section.dataset.inView = String(entry.isIntersecting);
          if (entry.isIntersecting) revealSection(section, reducedMotion);
        }
      },
      { rootMargin: "8% 0px 8% 0px", threshold: [0, 0.08, 0.24] },
    );
    sections.forEach((section) => intersectionObserver.observe(section));

    const resizeObserver = new ResizeObserver(() => {
      if (explicitTarget !== null) {
        explicitStablePasses = 0;
        queueExplicitSettle(80);
      }
      scheduleFrame({ measureAgain: true });
    });
    sections.forEach((section) => resizeObserver.observe(section));

    const handleScroll = () => {
      scheduleFrame({ measureAgain: explicitTarget !== null });
      if (explicitTarget !== null) queueExplicitSettle();
    };
    const handleResize = () => scheduleFrame({ measureAgain: true });

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    window.addEventListener("jonas:starfield-ready", handleResize);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("wheel", interruptExplicitNavigation, { passive: true });
    window.addEventListener("touchstart", interruptExplicitNavigation, {
      passive: true,
    });
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleDocumentClick, true);
    scheduleFrame({ measureAgain: true });
    if (explicitTarget !== null) queueExplicitSettle();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (explicitSettleTimer) window.clearTimeout(explicitSettleTimer);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("jonas:starfield-ready", handleResize);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("wheel", interruptExplicitNavigation);
      window.removeEventListener("touchstart", interruptExplicitNavigation);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleDocumentClick, true);
      root.removeAttribute("data-narrative-ready");
      root.removeAttribute("data-narrative-navigation");
      root.removeAttribute("data-reduced-motion");
      root.removeAttribute("data-starfield");
      root.style.removeProperty("--narrative-global-progress");
      root.style.removeProperty("--narrative-world-progress");
    };
  }, [canvasReadyRef, canvasRef, reducedMotion, starfieldEnabled, worlds]);
}

function NarrativeHud({ worlds }: { worlds: readonly NarrativeWorldSummary[] }) {
  const worldIndex = useNarrativeStore((state) => state.worldIndex);
  const phase = useNarrativeStore((state) => state.phase);
  const percentage = useNarrativeStore((state) =>
    Math.round(state.globalProgress * 100),
  );

  const world = worlds[worldIndex];
  const stateKey = phase === "hero" ? "hero" : world.id;

  return (
    <aside
      aria-label="Estado del recorrido espacial"
      className={styles.hud}
      data-phase={phase}
    >
      <div className={styles.hudSignal} aria-hidden="true">
        <span style={{ transform: `scaleY(${percentage / 100})` }} />
      </div>
      <div className={styles.hudReadout}>
        <span className={styles.hudCoordinate}>
          {phase === "hero" ? "00" : String(world.order).padStart(2, "0")} / 07
        </span>
        <strong key={stateKey}>
          {phase === "hero" ? "ÓRBITA INICIAL" : world.shortLabel}
        </strong>
        <span>{String(percentage).padStart(3, "0")}%</span>
      </div>
      <div
        aria-label="Progreso del recorrido"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        className={styles.srOnly}
        role="progressbar"
      />
    </aside>
  );
}

export function NarrativeExperience({
  worlds,
  children,
}: PropsWithChildren<{ worlds: readonly NarrativeWorldSummary[] }>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasReadyRef = useRef(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const lightEffects = useLightEffectsMode();
  // Los dos vetos del slot de fondo. El contenido es idéntico en ambos casos:
  // solo cambia qué implementación del backdrop se monta.
  const starfieldEnabled = !reducedMotion && !lightEffects;

  useEffect(() => {
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

  useNarrativeController({
    worlds,
    canvasRef,
    canvasReadyRef,
    reducedMotion,
    starfieldEnabled,
  });

  useEffect(() => {
    canvasReadyRef.current = canvasReady;
    document.documentElement.dataset.starfield =
      canvasReady && starfieldEnabled ? "ready" : "static";
    if (canvasReady && starfieldEnabled) {
      window.dispatchEvent(new Event("jonas:starfield-ready"));
    }
  }, [canvasReady, starfieldEnabled]);

  useEffect(() => () => resetNarrativeProgress(), []);

  return (
    <div className={styles.shell}>
      <div className="space-backdrop" aria-hidden="true">
        <span className="space-backdrop__stars" />
        <span className="space-backdrop__haze" />
        <span className="space-backdrop__grid" />
      </div>
      {canvasReady && starfieldEnabled ? <Starfield2D ref={canvasRef} /> : null}
      {children}
      <NarrativeHud worlds={worlds} />
    </div>
  );
}
