"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { defineCopy } from "@/lib/i18n";
import type { SpecimenEntry } from "@/lib/observatory-catalog";
import { shouldNavigateToWorld } from "@/lib/world-navigation";
import { useLocale } from "./locale-provider";
import {
  useExplicitEffects,
  useForcedEffects,
  useLightEffectsMode,
  useMotionEnabled,
} from "@/lib/effects-mode";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  evaluateCapabilities,
  readSignals,
} from "@/components/scene/capability";

/**
 * EL ÍNDICE DE ESPECÍMENES Y LA ADQUISICIÓN.
 *
 * Aquí se decide la diferencia entre viajar y operar. Llegar a Experimentos es
 * un viaje —lo lleva la travesía de `lib/voyage.ts`, con su lente y su cruce—
 * pero entrar al Observatorio desde aquí NO es otro viaje: el visitante ya está
 * en el sitio y lo que hace es encender un aparato. Por eso esto no llama a
 * `startVoyage` ni pinta ninguna luz de cruce; es un protocolo de adquisición
 * de poco más de un segundo, y lo que comunica es una máquina cambiando de
 * estado.
 *
 * El protocolo no es decoración: mientras corre, el módulo de la escena del
 * Observatorio —three.js incluido— ya se está descargando. El aparato tarda en
 * montar de todos modos; esto es ese tiempo, dicho en voz alta en vez de
 * escondido detrás de un rectángulo negro.
 */

/**
 * Las tres fases y su reloj, en milisegundos desde el clic.
 *
 * Corto a propósito. El encargo pide «una máquina cambiando de estado», no una
 * cinemática: 1,08 s es tiempo suficiente para leer tres cambios y demasiado
 * poco para convertirse en un peaje al tercer uso.
 */
const STAGES = [{ at: 0 }, { at: 420 }, { at: 760 }] as const;

const COPY = defineCopy({
  es: {
    stages: ["Adquiriendo", "Bloqueo", "Montando"],
    announce: (stage: string) => `${stage} espécimen`,
    index: "Índice de especímenes",
    unmounted: "Sin montar",
  },
  en: {
    stages: ["Acquiring", "Locked", "Mounting"],
    announce: (stage: string) => `${stage} specimen`,
    index: "Specimen index",
    unmounted: "Not mounted",
  },
});

const ARRIVAL_MS = 1080;

export function ExperimentsIndex({
  specimens,
}: {
  specimens: readonly SpecimenEntry[];
}) {
  const t = COPY[useLocale()];
  const router = useRouter();
  const motion = useMotionEnabled();
  const reducedMotion = usePrefersReducedMotion();
  const lightEffects = useLightEffectsMode();
  const forced = useForcedEffects();
  // Sólo un encendido pedido monta WebGL en un equipo que no lo aguanta.
  const explicit = useExplicitEffects();

  const [acquiring, setAcquiring] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const timers = useRef<number[]>([]);

  const clear = () => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  };

  useEffect(() => clear, []);

  /*
    Escape aborta. Es la única salida que necesita el protocolo: a diferencia de
    la travesía —que se dispara al apuntar un cuerpo y puede sorprender— aquí el
    visitante acaba de pulsar una fila a propósito, así que cortar con cualquier
    tecla o cualquier movimiento del puntero sería quitarle lo que pidió.
  */
  useEffect(() => {
    if (!acquiring) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      clear();
      setAcquiring(null);
      setStage(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [acquiring]);

  function acquire(event: React.MouseEvent, entry: SpecimenEntry) {
    if (!entry.href) return;
    // Ctrl-clic, clic con rueda y abrir en otra pestaña siguen siendo del
    // navegador. Sin esta guarda, el protocolo se comería un gesto que el
    // visitante conoce mejor que nuestra interfaz.
    if (!shouldNavigateToWorld(event.nativeEvent)) return;
    event.preventDefault();

    /*
      El calentamiento. Sólo si hay equipo: en perfil ligero o con veredicto
      `flat` el Observatorio no monta WebGL, y descargar el módulo entero sería
      gastarle la red justo a quien menos tiene.
    */
    const verdict = evaluateCapabilities(
      readSignals({ reducedMotion, lightEffects, forced, explicit }),
    );
    if (verdict.level !== "flat") {
      void import("@/components/scene/observatory-scene");
    }

    // Con el movimiento apagado no hay protocolo: el interruptor único manda
    // aquí igual que en todo lo demás, y una secuencia de estados es
    // movimiento aunque no se desplace un píxel.
    if (!motion) {
      router.push(entry.href);
      return;
    }

    clear();
    setAcquiring(entry.id);
    setStage(0);
    // Sin sonido desde 2026-09-23: el dueño pidió retirar los del
    // Observatorio (sonido-del-sitio.md, tabla de la paleta).
    for (const [index, phase] of STAGES.entries()) {
      if (index === 0) continue;
      timers.current.push(window.setTimeout(() => setStage(index), phase.at));
    }
    /*
      La navegación va por TEMPORIZADOR y nunca desde un fotograma. Es la misma
      regla que la travesía aprendió a golpes (G10): atar un `router.push` a una
      animación deja la ruta a merced de una pestaña en segundo plano, donde
      `requestAnimationFrame` sencillamente no corre.
    */
    timers.current.push(
      window.setTimeout(() => router.push(entry.href!), ARRIVAL_MS),
    );
  }

  return (
    <section
      aria-labelledby="specimen-index-title"
      className="specimen-index"
      data-acquiring={acquiring ?? "none"}
    >
      {/*
        El encabezado se queda pero deja de verse: la cuenta ya la dice la
        cabecera de la página —una sola vez, que es como se dicen las cosas— y
        un rótulo `ÍNDICE DE ESPECÍMENES` encima de seis filas numeradas no
        informa a nadie que esté mirando. Sigue existiendo para quien navega
        por encabezados o por regiones, y es el nombre accesible de esta.
      */}
      <h2 className="sr-only" id="specimen-index-title">
        {t.index}
      </h2>

      <ol className="specimen-index__list">
        {specimens.map((entry) => {
          const activo = acquiring === entry.id;
          const cifra = (
            <span aria-hidden="true" className="specimen-row__index">
              {String(entry.index).padStart(2, "0")}
            </span>
          );
          const cuerpo = (
            <span className="specimen-row__body">
              <span className="specimen-row__name">{entry.name}</span>
              {entry.pair ? (
                <span className="specimen-row__pair">{entry.pair}</span>
              ) : null}
            </span>
          );

          return (
            <li
              className="specimen-index__item"
              data-active={activo ? "true" : undefined}
              key={entry.id}
            >
              {entry.href ? (
                <Link
                  className="specimen-row"
                  href={entry.href}
                  onClick={(event) => acquire(event, entry)}
                >
                  {cifra}
                  {cuerpo}
                  {/* En reposo no dice nada: con las seis montadas, seis
                      «LISTO» eran ruido (2026-09-23). Habla sólo mientras
                      el aparato cambia de estado. */}
                  <span className="specimen-row__state">
                    {activo ? t.stages[stage] : null}
                  </span>
                  <span aria-hidden="true" className="specimen-row__arrow">
                    →
                  </span>
                </Link>
              ) : (
                /*
                  Sin montar NO es un enlace muerto. Su nombre y su par son
                  reales —el objeto existe y está modelado— y lo único que falta
                  es su observación; fingir una puerta sería peor que decirlo.
                  El catálogo enseña las seis porque el catálogo dice cuántas
                  hay.

                  Desde el 2026-09-20 esta rama no se pinta: las seis están
                  montadas. Se queda porque es la regla que permitió enseñar el
                  laboratorio a medio construir sin mentir sobre su tamaño, y
                  porque el día que entre una muestra nueva —o se retire una—
                  vuelve a hacer falta. Y su prueba dejó de existir el día que
                  se llenaron los huecos, porque colgaba del catálogo real: hoy
                  la sostiene `experiments-index.test.tsx` con un catálogo
                  inventado, que es lo único que no caduca.
                */
                <span aria-disabled="true" className="specimen-row specimen-row--off">
                  {cifra}
                  {cuerpo}
                  <span className="specimen-row__state">{t.unmounted}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Lo que el protocolo dice en voz alta. Sin esto, quien navega
          escuchando se encontraría en otra página sin saber por qué. */}
      <p aria-live="polite" className="sr-only">
        {acquiring ? t.announce(t.stages[stage]) : ""}
      </p>
    </section>
  );
}
