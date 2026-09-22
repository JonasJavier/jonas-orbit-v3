"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Soundtrack } from "@/lib/soundtrack";
import "./soundtrack-control.css";

function Speaker({ quiet }: { quiet: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
      {quiet ? <path d="m16 9 6 6m0-6-6 6" /> : <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 4a11 11 0 0 1 0 16" /></>}
    </svg>
  );
}

/** Mounted beside the pages in the locale layout, never inside a world. */
export function SoundtrackControl() {
  const [player] = useState(() => new Soundtrack());
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getServerSnapshot);
  const details = useRef<HTMLDetailsElement>(null);
  const active = state.playback === "playing" || state.playback === "loading";
  const quiet = state.muted || state.volume === 0;
  const status = state.playback === "loading" ? "Cargando" : state.playback === "error" ? "Reintentar"
    : state.playback === "paused" ? "Pausa" : active ? quiet ? "Mute" : "On" : "Off";

  useEffect(() => {
    const visibility = () => player.setHidden(document.hidden);
    const pageHide = () => player.setHidden(true);
    const outside = (event: PointerEvent) => {
      if (details.current && !details.current.contains(event.target as Node)) details.current.open = false;
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("pageshow", visibility);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("pageshow", visibility);
      document.removeEventListener("pointerdown", outside);
      player.dispose();
    };
  }, [player]);

  return (
    <aside className="soundtrack" aria-label="Banda sonora" data-playing={active}>
      <button
        className="soundtrack__switch"
        type="button"
        aria-label={active ? "Pausar música" : state.playback === "error" ? "Reintentar música" : "Activar música"}
        aria-pressed={active}
        onClick={() => active ? player.pause() : void player.play()}
      >
        <Speaker quiet={!active || quiet} />
        <span className="soundtrack__readout"><span>Audio</span><strong>{status}</strong></span>
      </button>
      <details className="soundtrack__settings" ref={details} onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}>
        <summary aria-label="Ajustes de música" title="Ajustes de música">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M5 4v6m0 4v6M12 4v10m0 4v2M19 4v2m0 4v10M2 10h6m1 8h6m1-12h6" />
          </svg>
        </summary>
        <div className="soundtrack__panel">
          <div className="soundtrack__heading">
            <span className="soundtrack__signal" aria-hidden="true" />
            <div><p>Audio del sistema</p><span>{active ? quiet ? "Activo · en silencio" : "Reproduciendo" : "En pausa"}</span></div>
            <strong>{status}</strong>
          </div>
          <div className="soundtrack__volume-label"><label htmlFor="soundtrack-volume">Volumen</label><output htmlFor="soundtrack-volume">{Math.round(state.volume * 100)} %</output></div>
          <input id="soundtrack-volume" type="range" min="0" max="100" step="1" value={Math.round(state.volume * 100)}
            onChange={(event) => player.setVolume(Number(event.target.value) / 100)} />
          <button className="soundtrack__mute" type="button" aria-pressed={state.muted} onClick={() => player.toggleMute()}>
            <Speaker quiet={quiet} />{state.muted ? "Restaurar sonido" : "Silenciar"}
          </button>
        </div>
      </details>
      <span className="visually-hidden" role="status">
        {state.playback === "error" ? "No se pudo reproducir la música. Puedes reintentarlo; la navegación sigue disponible." : ""}
      </span>
    </aside>
  );
}
