"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Soundtrack } from "@/lib/soundtrack";
import { configureAudio } from "@/lib/audio-bus";
import { playSfx } from "@/lib/sfx";
import "./soundtrack-control.css";

type TrayState = "on" | "off" | "muted";

const UNLOCK_EVENTS = ["pointerdown", "pointerup", "touchend", "keydown", "click"] as const;

/** Waves when it sounds, a cross when muted, silent and struck through when off. */
function Speaker({ state }: { state: TrayState }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
      {state === "muted" ? <path d="m16 9 6 6m0-6-6 6" /> : null}
      {state === "on" ? <><path className="soundtrack__wave" d="M15 8a6 6 0 0 1 0 8" /><path className="soundtrack__wave" d="M18 4a11 11 0 0 1 0 16" /></> : null}
      {state === "off" ? <path className="tray-slash" d="M3.5 20.5 20.5 3.5" /> : null}
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
  // ON is the default, and it stays ON while the browser waits for the first
  // gesture to let it sound (`armed`): the tray shows the intent, not the wait.
  const tray: TrayState = quiet ? "muted" : active || state.playback === "armed" ? "on" : "off";
  const status = quiet ? "Mute" : state.playback === "loading" ? "Cargando" : state.playback === "error" ? "Reintentar"
    : state.playback === "paused" ? "Pausa" : state.playback === "armed" ? "Listo" : active ? "On" : "Off";
  const panelStatus = quiet ? "Silenciado" : active ? "Reproduciendo" : state.playback === "armed" ? "Activado · suena al primer clic" : "Audio detenido";
  /*
    ON pero todavía mudo: el navegador espera un gesto (sonido-del-sitio.md §2).
    El dueño lo leía como una avería, así que ese estado se enseña: una
    etiqueta pequeña sobre el icono y el ON latiendo, hasta que suena.
  */
  const waiting = state.playback === "armed" && !quiet;

  /*
    Un solo mando para todo lo que suena. La música es un archivo; la travesía,
    el mapa, el mar de Miller, el Observatorio y la Ranger se sintetizan en el
    bus de audio. Los dos obedecen a este control: pausar o silenciar aquí deja
    el sitio entero en silencio. «Pausa» sin intención (autoplay bloqueado,
    pestaña oculta) no cuenta: ahí el visitante sigue queriendo audio y su
    primer gesto es justo el que lo desbloquea.
  */
  const audible = state.playback !== "off" && !quiet;
  useEffect(() => {
    configureAudio({ enabled: audible, volume: state.volume });
  }, [audible, state.volume]);

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
    /*
      Every event a browser may count as the activating gesture, in capture so
      no handler can swallow it. `pointerdown` alone left touch screens mute on
      the first tap (a touch activates on `pointerup`/`touchend`, measured
      2026-09-23: the music started only on the second tap). Wheel and pointer
      movement never activate; nothing can make them sound.
    */
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock, { capture: true, passive: true });
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("pageshow", visibility);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlock, { capture: true });
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("pageshow", visibility);
      document.removeEventListener("pointerdown", outside);
      player.dispose();
    };
  }, [player]);

  return (
    <aside className="soundtrack" aria-label="Banda sonora" data-playing={active} data-muted={quiet} data-state={tray} data-waiting={waiting}>
      {waiting ? (
        <span className="soundtrack__hint" aria-hidden="true">
          <span className="soundtrack__hint-click">Haz clic para escuchar</span>
          <span className="soundtrack__hint-touch">Toca para escuchar</span>
        </span>
      ) : null}
      <details className="soundtrack__settings" ref={details} onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}>
        <summary aria-label="Audio" title={waiting ? "Audio activado · suena con tu primer clic" : tray === "on" ? "Audio activado" : tray === "muted" ? "Audio silenciado" : "Audio desactivado"}>
          <Speaker state={tray} />
          <span className="tray-state" aria-hidden="true">{tray === "muted" ? "Mute" : tray}</span>
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
              onClick={() => {
                if (active) {
                  player.pause();
                  return;
                }
                void player.play();
                // El único efecto que se oye a sí mismo: encender el audio sin
                // respuesta audible deja al visitante sin saber si funcionó.
                playSfx("confirm");
              }}
            >
              <PlaybackIcon active={active} />
              <span className="visually-hidden">{status}</span>
            </button>
          </div>
          <div className="soundtrack__volume-label"><label htmlFor="soundtrack-volume">Volumen</label><output htmlFor="soundtrack-volume">{Math.round(state.volume * 100)} %</output></div>
          <input id="soundtrack-volume" type="range" min="0" max="100" step="1" value={Math.round(state.volume * 100)}
            onChange={(event) => player.setVolume(Number(event.target.value) / 100)} />
          <button className="soundtrack__mute" type="button" aria-pressed={quiet} onClick={() => player.toggleMute()}>
            <Speaker state={quiet ? "muted" : "on"} />{quiet ? "Restaurar sonido" : "Silenciar"}
          </button>
        </div>
      </details>
      <span className="visually-hidden" role="status">
        {state.playback === "error" ? "No se pudo reproducir la música. Puedes reintentarlo; la navegación sigue disponible." : ""}
      </span>
    </aside>
  );
}
