"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionEnabled } from "@/lib/effects-mode";
import { VoyageSky } from "./voyage-sky";

/** The header's observatory, awake only while this window is in view. */
export function FooterSky() {
  const surface = useRef<HTMLDivElement>(null);
  const motion = useMotionEnabled();
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    const observer = typeof IntersectionObserver === "undefined" ? null
      : new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    if (surface.current) observer?.observe(surface.current);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const running = motion && inView && visible;
  return (
    <div ref={surface} className="site-footer__sky" data-running={running} aria-hidden="true">
      <VoyageSky running={running} className="site-footer__canvas" variant="footer" />
    </div>
  );
}
