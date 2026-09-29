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
import { evaluateCapabilities, readSignals } from "@/components/scene/capability";
import { useExplicitEffects, useMotionEnabled } from "@/lib/effects-mode";
import { playSfx } from "@/lib/sfx";
import { useLocale } from "./locale-provider";

/**
 * Cabina de la Ranger: el visitante va sentado dentro de la nave de enlace,
 * cruzando la garganta de un agujero de gusano.
 *
 * Un solo estado gobierna todo lo que se mueve — el vuelo del ventanal
 * (WebGL2), el barrido del radar, el paralaje de cabeza y el encendido de los
 * instrumentos — y es el interruptor único de movimiento del sitio (la bandeja
 * inferior derecha). La primera pantalla es el ventanal entero. Todo lo que
 * importa —canales, formulario, CV y prosa— es HTML real que se sirve sin
 * JavaScript; sólo la animación necesita el cliente.
 */

type Look = { x: number; y: number };

type Cockpit = {
  /** The site's motion switch: flight, radar sweep, parallax. */
  running: boolean;
  /** False without WebGL2, once the context is lost, or on a device that cannot carry the flight (software GPU, 2G, 2 GB) unless explicitly asked: the still view stays. */
  supported: boolean;
  markUnsupported: () => void;
  /** Head offset in [-1, 1], read by the viewport every frame. */
  look: RefObject<Look>;
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

/*
  ¿Aguanta este equipo el vuelo? Las tres heurísticas de equipo del gate del
  System Map —GPU por software, red 2G, 2 GB— y la misma salida: el encendido
  por defecto no las supera, el pedido (icono o `?no3d=0`) sí
  (movimiento-unificado.md, §«Tres lecturas»). Sin aceleración, un fotograma
  del túnel bloquea el hilo principal; ahí va la vista fija en SVG. La falta de
  WebGL2 no se decide aquí: la detecta el propio ventanal al pedir el contexto.
  Una señal que no se puede leer es neutral, como en el gate.
*/
function canCarryFlight(explicit: boolean) {
  try {
    const signals = readSignals({ reducedMotion: false, lightEffects: false, forced: true, explicit });
    return evaluateCapabilities({ ...signals, hasWebGL2: true }).level !== "flat";
  } catch {
    return true;
  }
}

export function RangerCockpit({ children }: { children: ReactNode }) {
  const bridgeLabel = useLocale() === "es" ? "Cabina de la Ranger" : "Ranger cockpit";
  const bridgeRef = useRef<HTMLElement>(null);
  const look = useRef<Look>({ x: 0, y: 0 });
  const running = useMotionEnabled();
  const mounted = useMounted();
  const [webgl, setWebgl] = useState(true);
  const explicit = useExplicitEffects();
  const capable = useSyncExternalStore(subscribeNever, () => canCarryFlight(explicit), () => true);
  // Once it has flown, the verdict holds: pausing rewrites the stored choice
  // (no longer «explicit»), but a frozen frame costs nothing and must stay.
  const [cleared, setCleared] = useState(false);
  if (mounted && running && capable && !cleared) setCleared(true);
  const supported = webgl && (capable || cleared);
  const markUnsupported = useCallback(() => setWebgl(false), []);

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
    if (!mounted || !running || !supported || lit.current) return;
    lit.current = true;
    playSfx("ignite");
  }, [mounted, running, supported]);

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
    <CockpitContext.Provider value={{ running, supported, markUnsupported, look }}>
      <div className="ranger-cockpit" data-motion={running ? "on" : "off"} data-boot={mounted && running ? "on" : "off"}>
        <section
          ref={bridgeRef}
          className="ranger-bridge"
          aria-label={bridgeLabel}
          data-motion={running ? "on" : "off"}
          onPointerMove={moveHead}
          onPointerLeave={restHead}
        >
          {children}
        </section>
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
 * El estado de la nave, abajo a la derecha del cristal: su nombre, si vuela y
 * la hora real en Santo Domingo —un reclutador sabe a qué hora escribe—. El
 * vuelo dice lo que hace el interruptor de movimiento en este equipo, sin
 * cifras inventadas.
 */
export function RangerReadouts({ name }: { name: string }) {
  const es = useLocale() === "es";
  const { running, supported } = useRangerCockpit();
  const mounted = useMounted();
  // En travesía sólo si de verdad vuela: movimiento encendido y un equipo que lo aguanta.
  const flying = mounted && running && supported;
  const time = useSyncExternalStore(subscribeClock, localTime, () => "--:--");
  return (
    <div className="ranger-readouts">
      <p className="ranger-readouts__name">{name}</p>
      <dl>
        <div>
          <dt className="visually-hidden">{es ? "Vuelo" : "Flight"}</dt>
          <dd data-live={flying ? "flight" : undefined}><i className="ranger-led" data-state={flying ? "cyan" : undefined} aria-hidden="true" /> {flying ? (es ? "En travesía" : "In transit") : (es ? "Detenido" : "Holding")}</dd>
        </div>
        <div>
          <dt>{es ? "Hora" : "Time"}<span className="visually-hidden"> {es ? "en" : "in"} {SITE_PROFILE.locality}</span></dt>
          <dd data-live="clock">{time}</dd>
        </div>
      </dl>
    </div>
  );
}
