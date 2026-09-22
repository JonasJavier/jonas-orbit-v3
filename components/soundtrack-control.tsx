"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Soundtrack } from "@/lib/soundtrack";
import { voyageAudio } from "@/lib/voyage-audio";
import "./soundtrack-control.css";

function Speaker({ quiet }: { quiet: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
      {quiet ? <path d="m16 9 6 6m0-6-6 6" /> : <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 4a11 11 0 0 1 0 16" /></>}
    </svg>
  );
}

function PlaybackIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {active ? <><path d="M8 6v12" /><path d="M16 6v12" /></> : <path d="m9 6 9 6-9 6V6Z" strokeLinejoin="round" />}
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
  const status = quiet ? "Mute" : state.playback === "loading" ? "Cargando" : state.playback === "error" ? "Reintentar"
    : state.playback === "paused" ? "Pausa" : active ? "On" : "Off";
  const panelStatus = quiet ? "Silenciado" : active ? "Reproduciendo" : "Audio detenido";

  /*
    Un solo mando para todo lo que suena. El sonido de la travesía se sintetiza
    aparte —no es esta pista— pero obedece a este control: pausar o silenciar
    aquí deja el sitio entero en silencio. «Pausa» sin intención (autoplay
    bloqueado, pestaña oculta) no cuenta: ahí el visitante sigue queriendo
    audio y el primer clic en un destino es justo el gesto que lo desbloquea.
  */
  useEffect(() => {
    voyageAudio.configure({
      enabled: state.playback !== "off" && !quiet,
      volume: state.volume,
    });
  }, [state.playback, state.volume, quiet]);

  useEffect(() => {
    const visibility = () => player.setHidden(document.hidden);
    const pageHide = () => player.setHidden(true);
    const unlock = () => player.resumeWanted();
    const outside = (event: PointerEvent) => {
      if (details.current && !details.current.contains(event.target as Node)) details.current.open = false;
    };
    visibility();
    player.startDefault();
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("pageshow", visibility);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("pageshow", visibility);
      document.removeEventListener("pointerdown", outside);
      player.dispose();
    };
  }, [player]);

  return (
    <aside className="soundtrack" aria-label="Banda sonora" data-playing={active} data-muted={quiet}>
      <details className="soundtrack__settings" ref={details} onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}>
        <summary aria-label="Audio" title="Audio">
          <Speaker quiet={quiet} />
        </summary>
        <div className="soundtrack__panel">
          <div className="soundtrack__heading">
            <span className="soundtrack__signal" aria-hidden="true" />
            <div><p>Audio</p><span>{panelStatus}</span></div>
            <button
              className="soundtrack__power"
              type="button"
              aria-label={active ? "Pausar música" : state.playback === "error" ? "Reintentar música" : "Activar música"}
              aria-pressed={active}
              onClick={() => active ? player.pause() : void player.play()}
            >
              <PlaybackIcon active={active} />
              <span className="visually-hidden">{status}</span>
            </button>
          </div>
          <div className="soundtrack__volume-label"><label htmlFor="soundtrack-volume">Volumen</label><output htmlFor="soundtrack-volume">{Math.round(state.volume * 100)} %</output></div>
          <input id="soundtrack-volume" type="range" min="0" max="100" step="1" value={Math.round(state.volume * 100)}
            onChange={(event) => player.setVolume(Number(event.target.value) / 100)} />
          <button className="soundtrack__mute" type="button" aria-pressed={quiet} onClick={() => player.toggleMute()}>
            <Speaker quiet={quiet} />{quiet ? "Restaurar sonido" : "Silenciar"}
          </button>
        </div>
      </details>
      <span className="visually-hidden" role="status">
        {state.playback === "error" ? "No se pudo reproducir la música. Puedes reintentarlo; la navegación sigue disponible." : ""}
      </span>
    </aside>
  );
}
