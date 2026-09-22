"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { SITE_PROFILE } from "@/content/site.data";
import { useMotionEnabled } from "@/lib/effects-mode";
import { playSfx } from "@/lib/sfx";

/**
 * Cabina de la Ranger: el visitante va sentado dentro de la nave de enlace,
 * cruzando la garganta de un agujero de gusano.
 *
 * Un solo estado gobierna todo lo que se mueve — el vuelo del ventanal
 * (WebGL2), el barrido del radar, el paralaje de cabeza y el encendido de los
 * instrumentos — y es el interruptor único de movimiento del sitio (la bandeja
 * inferior derecha). La primera pantalla es el ventanal entero; el panel de
 * instrumentos va justo debajo, dentro del mismo estado. Los instrumentos son
 * HTML real: canales, formulario, CV y prosa se sirven sin JavaScript; sólo la
 * animación necesita el cliente.
 */

export type Frequency = { id: string; name: string; value: string } | null;
type Look = { x: number; y: number };

type Cockpit = {
  /** The site's motion switch: flight, radar sweep, parallax. */
  running: boolean;
  /** False once WebGL2 is missing or the context is lost: the still view stays. */
  supported: boolean;
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
  supported: false,
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

export function RangerCockpit({ children, panel }: { children: ReactNode; panel?: ReactNode }) {
  const bridgeRef = useRef<HTMLElement>(null);
  const look = useRef<Look>({ x: 0, y: 0 });
  const running = useMotionEnabled();
  const mounted = useMounted();
  const [supported, setSupported] = useState(true);
  const [frequency, setFrequency] = useState<Frequency>(null);
  const markUnsupported = useCallback(() => setSupported(false), []);

  /*
    Encendido de motores.

    Es el único sonido del sitio que NO cuelga de una interacción: cuelga del
    mismo `data-boot` que arranca el vuelo del ventanal, así que sienta al
    visitante dentro de la nave y enciende. Y por eso sí depende del
    interruptor de movimiento —con el vuelo apagado no hay nada que encender—,
    que es la excepción a la regla general de que el sonido lo gobierna sólo
    AUDIO: aquí el motor es parte del vuelo, no un aviso de interfaz.
  */
  const lit = useRef(false);
  useEffect(() => {
    if (!mounted || !running || lit.current) return;
    lit.current = true;
    playSfx("ignite");
  }, [mounted, running]);

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
    <CockpitContext.Provider value={{ running, supported, markUnsupported, look, frequency, setFrequency }}>
      <div className="ranger-cockpit" data-motion={running ? "on" : "off"} data-boot={mounted && running ? "on" : "off"}>
        <section
          ref={bridgeRef}
          className="ranger-bridge"
          aria-label="Cabina de la Ranger"
          data-motion={running ? "on" : "off"}
          onPointerMove={moveHead}
          onPointerLeave={restHead}
        >
          {children}
        </section>
        {panel}
      </div>
    </CockpitContext.Provider>
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
 * sabe a qué hora escribe— y el vuelo dice lo que hace el interruptor de
 * movimiento: en travesía o detenido, sin cifras inventadas. (La frecuencia
 * que se apunta se lee en el propio módulo de frecuencias, bajo el ventanal.)
 */
export function RangerReadouts({ destination }: { destination: string }) {
  const { running } = useRangerCockpit();
  const mounted = useMounted();
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
        <dt>Vuelo</dt>
        <dd data-live={mounted && running ? "flight" : undefined}><i className="ranger-led" data-state={mounted && running ? "cyan" : undefined} aria-hidden="true" /> {mounted && running ? "En travesía" : "Detenido"}</dd>
      </div>
    </dl>
  );
}
