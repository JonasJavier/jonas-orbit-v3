"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { SITE_PROFILE } from "@/content/site.data";
import { useLightEffectsMode } from "@/lib/effects-mode";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * Cabina de la Ranger: el visitante va sentado dentro de la nave de enlace.
 *
 * Un solo estado gobierna todo lo que se mueve en la primera pantalla — el
 * vuelo del ventanal (WebGL2), el barrido del radar, el paralaje de cabeza y
 * el encendido de los instrumentos —: reduced-motion y el perfil ligero lo
 * dejan quieto por defecto, el interruptor «Activar vuelo» es el opt-in y
 * «Pausar vuelo» lo detiene. Los instrumentos son HTML real: canales, formulario,
 * CV y prosa se sirven sin JavaScript; sólo la animación necesita el cliente.
 */

export type Frequency = { id: string; name: string; value: string } | null;
type Look = { x: number; y: number };

type Cockpit = {
  /** Motion allowed by preference and not paused: flight, radar sweep, parallax. */
  running: boolean;
  preferenceBlocked: boolean;
  paused: boolean;
  /** False once WebGL2 is missing or the context is lost: the switch disappears. */
  supported: boolean;
  toggle: () => void;
  markUnsupported: () => void;
  /** Head offset in [-1, 1], read by the viewport every frame. */
  look: RefObject<Look>;
  frequency: Frequency;
  setFrequency: (frequency: Frequency) => void;
};

const CockpitContext = createContext<Cockpit | null>(null);
const STILL_LOOK: RefObject<Look> = { current: { x: 0, y: 0 } };
const noop = () => {};
/** Outside the bridge (tests, isolated instruments) everything reads as still. */
const STANDALONE: Cockpit = {
  running: false,
  preferenceBlocked: false,
  paused: false,
  supported: false,
  toggle: noop,
  markUnsupported: noop,
  look: STILL_LOOK,
  frequency: null,
  setFrequency: noop,
};

export function useRangerCockpit(): Cockpit {
  return useContext(CockpitContext) ?? STANDALONE;
}

/** True only after hydration: the server never renders motion-only controls. */
export function useMounted() {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}
function subscribeNever() {
  return noop;
}

export function RangerCockpit({ children }: { children: ReactNode }) {
  const bridgeRef = useRef<HTMLElement>(null);
  const look = useRef<Look>({ x: 0, y: 0 });
  const reducedMotion = usePrefersReducedMotion();
  const lightEffects = useLightEffectsMode();
  const mounted = useMounted();
  const [paused, setPaused] = useState(false);
  const [activated, setActivated] = useState(false);
  const [supported, setSupported] = useState(true);
  const [frequency, setFrequency] = useState<Frequency>(null);
  const preferenceBlocked = !activated && (reducedMotion || lightEffects);
  const running = !paused && !preferenceBlocked;
  const markUnsupported = useCallback(() => setSupported(false), []);

  const toggle = () => {
    if (preferenceBlocked) {
      setActivated(true);
      setPaused(false);
    } else {
      setPaused(!paused);
    }
  };

  function moveHead(event: PointerEvent<HTMLElement>) {
    if (!running || event.pointerType !== "mouse" || !window.matchMedia("(pointer: fine)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    look.current = { x, y };
    event.currentTarget.style.setProperty("--rx", x.toFixed(3));
    event.currentTarget.style.setProperty("--ry", y.toFixed(3));
  }

  function restHead() {
    look.current = { x: 0, y: 0 };
    bridgeRef.current?.style.setProperty("--rx", "0");
    bridgeRef.current?.style.setProperty("--ry", "0");
  }

  return (
    <CockpitContext.Provider value={{ running, preferenceBlocked, paused, supported, toggle, markUnsupported, look, frequency, setFrequency }}>
      <section
        ref={bridgeRef}
        className="ranger-bridge"
        aria-label="Cabina de la Ranger"
        data-motion={running ? "on" : "off"}
        data-boot={mounted && running ? "on" : "off"}
        onPointerMove={moveHead}
        onPointerLeave={restHead}
      >
        {children}
      </section>
    </CockpitContext.Provider>
  );
}

/** Flight switch on the dashboard. Absent without JavaScript or WebGL2. */
export function RangerFlightControl() {
  const { running, preferenceBlocked, supported, toggle } = useRangerCockpit();
  const mounted = useMounted();
  if (!mounted || !supported) return null;
  const label = running ? "Pausar vuelo" : preferenceBlocked ? "Activar vuelo" : "Reanudar vuelo";
  return (
    <button className="ranger-flight" type="button" aria-pressed={running} onClick={toggle}>
      <span>{label}</span>
      <i className="ranger-flight__switch" aria-hidden="true" />
    </button>
  );
}

/* ── Hora local de Santo Domingo, actualizada por minuto ───────────────────── */

const TIME_ZONE = "America/Santo_Domingo";
let clockFormatter: Intl.DateTimeFormat | undefined;
function localTime() {
  clockFormatter ??= new Intl.DateTimeFormat("es-DO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIME_ZONE });
  return clockFormatter.format(new Date());
}
function subscribeClock(callback: () => void) {
  const timer = window.setInterval(callback, 15_000);
  return () => window.clearInterval(timer);
}

/**
 * Lecturas del HUD proyectadas sobre el cristal. La hora es real —un reclutador
 * sabe a qué hora escribe— y la frecuencia refleja el canal que se apunta.
 */
export function RangerReadouts({ destination }: { destination: string }) {
  const { frequency } = useRangerCockpit();
  const time = useSyncExternalStore(subscribeClock, localTime, () => "--:--");
  return (
    <dl className="ranger-readouts">
      <div>
        <dt>Enlace</dt>
        <dd><i className="ranger-led" data-state="cyan" aria-hidden="true" /> Abierto</dd>
      </div>
      <div>
        <dt>Destino</dt>
        <dd>{destination}</dd>
      </div>
      <div>
        <dt>Hora en {SITE_PROFILE.locality}</dt>
        <dd data-live="clock">{time}</dd>
      </div>
      <div>
        <dt>Frecuencia</dt>
        <dd data-live={frequency ? "frequency" : undefined}>{frequency ? `${frequency.id} · ${frequency.name}` : "— elige una —"}</dd>
      </div>
    </dl>
  );
}
