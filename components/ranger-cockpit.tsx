"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useLightEffectsMode } from "@/lib/effects-mode";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type Signal = "idle" | "sending" | "received";

/** One short, local signal demonstration. No network request, audio or idle loop. */
export function RangerCockpit({ children }: { children: ReactNode }) {
  const deckRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [signal, setSignal] = useState<Signal>("idle");
  const reducedMotion = usePrefersReducedMotion();
  const lightEffects = useLightEffectsMode();
  const motion = !reducedMotion && !lightEffects;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function moveView(event: PointerEvent<HTMLElement>) {
    if (!motion || event.pointerType !== "mouse" || !window.matchMedia("(pointer: fine)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    event.currentTarget.style.setProperty("--ranger-x", `${x * 6}px`);
    event.currentTarget.style.setProperty("--ranger-y", `${y * 4}px`);
  }

  function resetView() {
    deckRef.current?.style.setProperty("--ranger-x", "0px");
    deckRef.current?.style.setProperty("--ranger-y", "0px");
  }

  function testSignal() {
    if (signal === "sending") return;
    clearTimeout(timerRef.current);
    if (!motion) {
      setSignal("received");
      return;
    }
    setSignal("sending");
    timerRef.current = setTimeout(() => setSignal("received"), 1600);
  }

  return (
    <section ref={deckRef} className="ranger-deck" aria-label="Cabina de comunicaciones de Ranger" data-signal={signal} data-motion={motion} onPointerMove={moveView} onPointerLeave={resetView}>
      {children}
      <div className="ranger-beacon">
        <div className="ranger-beacon__rings" aria-hidden="true"><i /><i /><i /></div>
        <button className="ranger-beacon__button" type="button" onClick={testSignal} aria-disabled={signal === "sending"}>
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="3" /><path d="M10 10a8.5 8.5 0 0 0 0 12m12-12a8.5 8.5 0 0 1 0 12M6 6a14 14 0 0 0 0 20M26 6a14 14 0 0 1 0 20" /></svg>
          <span>{signal === "sending" ? "Emitiendo señal" : signal === "received" ? "Repetir señal" : "Probar señal"}</span>
        </button>
      </div>
      <div className="ranger-receiver">
        <div className="ranger-receiver__wave" aria-hidden="true">{[5, 10, 6, 18, 25, 12, 32, 17, 8, 23, 14, 28, 10, 18, 5, 12, 7].map((height, index) => <i key={index} style={{ height, animationDelay: `${index * 45}ms` }} />)}</div>
        <p role="status" aria-live="polite">{signal === "sending" ? "Buscando el eco…" : signal === "received" ? "Prueba recibida. La próxima señal puede ser la tuya." : "Un pequeño salto. Una nueva conexión."}</p>
        <span className="ranger-receiver__label">{signal === "idle" ? "ENLACE / RANGER" : "SIMULACIÓN LOCAL"}</span>
      </div>
      <noscript><style>{`.ranger-beacon { display: none; }`}</style></noscript>
    </section>
  );
}
