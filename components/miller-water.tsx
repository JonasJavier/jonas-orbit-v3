"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useMotionEnabled } from "@/lib/effects-mode";
import { startOcean } from "@/lib/ocean-ambience";

type WaterMotion = { running: boolean };
const WaterContext = createContext<WaterMotion | null>(null);

/**
 * The ocean and its currents follow the site's single motion switch (the
 * tray icon, bottom right). No consent or pause control of their own.
 */
export function MillerWater({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);
  const running = useMotionEnabled();

  /*
    El mar, mientras dure la página.

    NO depende de `running`: el interruptor de movimiento gobierna lo que se
    MUEVE y un sonido no se mueve — quien lo apaga suele estar evitando mareo,
    no ruido. De encenderlo y apagarlo se ocupa el control de AUDIO, a través
    del bus. Y se retira al desmontar, porque un ambiente que sobrevive a su
    habitación es un fallo y no una función.
  */
  useEffect(() => startOcean(), []);

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

  return (
    <WaterContext.Provider value={{ running }}>
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
