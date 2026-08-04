"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/content/site.data";
import { useNarrativeStore } from "@/lib/narrative-store";
import type { NarrativeWorldSummary } from "@/lib/narrative-types";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export function MissionNavigation({
  locale,
  worlds,
}: {
  locale: Locale;
  worlds: readonly NarrativeWorldSummary[];
}) {
  const worldIndex = useNarrativeStore((state) => state.worldIndex);
  const phase = useNarrativeStore((state) => state.phase);
  const navRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (phase !== "world") return;
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('a[data-active="true"]');
    if (!nav || !active) return;

    const targetLeft =
      active.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2;
    nav.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [phase, reducedMotion, worldIndex]);

  return (
    <nav
      aria-label="Navegación de mundos"
      className="mission-nav"
      data-active-world={phase === "world" ? worlds[worldIndex].id : "hero"}
      ref={navRef}
    >
      <ol>
        {worlds.map((world, index) => {
          const active = phase === "world" && index === worldIndex;
          return (
            <li key={world.id}>
              <a
                aria-current={active ? "location" : undefined}
                data-active={active ? "true" : undefined}
                href={`/${locale}#${world.slug}`}
                style={{ "--nav-accent": world.accent } as React.CSSProperties}
              >
                <span aria-hidden="true">
                  {String(world.order).padStart(2, "0")}
                </span>
                {world.shortLabel}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
