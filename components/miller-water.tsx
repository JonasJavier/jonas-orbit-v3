"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLightEffectsMode } from "@/lib/effects-mode";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type WaterMotion = { running: boolean; preferenceBlocked: boolean; paused: boolean; toggle: () => void };
const WaterContext = createContext<WaterMotion | null>(null);

/** One consent and pause control for the ocean and its currents throughout Miller. */
export function MillerWater({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const lightEffects = useLightEffectsMode();
  const [paused, setPaused] = useState(false);
  const [activated, setActivated] = useState(false);
  const preferenceBlocked = !activated && (reducedMotion || lightEffects);
  const running = !paused && !preferenceBlocked;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const syncVisibility = () => { root.dataset.pageVisible = String(!document.hidden); };
    syncVisibility();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) (entry.target as HTMLElement).dataset.inView = String(entry.isIntersecting);
    });
    root.querySelectorAll("[data-water-section]").forEach((section) => observer.observe(section));
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  const toggle = () => {
    if (preferenceBlocked) { setActivated(true); setPaused(false); }
    else setPaused(!paused);
  };

  return (
    <WaterContext.Provider value={{ running, preferenceBlocked, paused, toggle }}>
      <article ref={rootRef} className="miller-page" data-world="miller" data-water-motion={running ? "flowing" : "still"} data-page-visible="false">
        {children}
      </article>
    </WaterContext.Provider>
  );
}

export function useMillerWater() {
  const water = useContext(WaterContext);
  if (!water) throw new Error("Miller water controls need the MillerWater provider");
  return water;
}
