"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { WorldId } from "@/content/worlds.data";
import { startVoyage } from "./voyage-controller";
import type { VoyageMode } from "./voyage";

/**
 * La costura entre el Hero y la forma de viajar a un mundo.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Hoy cada mundo es una ruta. En la fase del viaje continuo
 * (`docs/design/continuous-journey-phase.md`) los seis pasarán a ser anclas de
 * un único documento y el scroll será la fuente de verdad de la cámara.
 *
 * Ese cambio no puede obligar a rehacer el Hero. Así que el Hero **no sabe cómo
 * se navega**: pide `navigateToWorld(id)` y este módulo decide. Hoy resuelve a
 * `router.push`; mañana resolverá a `scrollTo(ancla)` y ni el raíl, ni los
 * rótulos, ni el NAV TARGET se enterarán.
 *
 * ── Y por qué NO sustituye a los enlaces ────────────────────────────────────
 *
 * Los seis destinos siguen siendo `<a href>` reales en el HTML servido. Esto
 * es una mejora progresiva encima, no un reemplazo: sin JavaScript la
 * navegación funciona igual, que es lo que exige la regla 7 del repositorio.
 */
export interface WorldDestination {
  id: WorldId;
  href: string;
}

/** Estado compartido por el HUD, los cuerpos y el raíl del System Map. */
export type WorldNavigationState = "idle" | "target" | "locked";

/**
 * La porción de un evento de enlace que decide si el Hero debe hacerse cargo.
 *
 * Se mantiene independiente de React para que la misma regla sirva a cualquier
 * proxy visual futuro: clic principal simple viaja dentro de la experiencia;
 * abrir en pestaña/ventana nueva sigue perteneciendo al navegador.
 */
export interface WorldNavigationActivation {
  defaultPrevented: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}

export function shouldNavigateToWorld(
  event: WorldNavigationActivation,
): boolean {
  return (
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    event.button === 0
  );
}

/**
 * Qué versión de la travesía le toca a este visitante.
 *
 * La completa —2,6 s de cámara y shader— sólo existe si la escena WebGL está
 * viva y dibujando, que es lo que `data-scene-live` publica con su primera
 * proyección. En cualquier otro caso (movimiento apagado, perfil ligero,
 * reduced-motion sin activación, sin WebGL2, escena aún cargando) va la
 * reducida: medio segundo de zoom y fundido en el DOM. Así el interruptor de
 * movimiento tiene sentido también al navegar.
 */
export function voyageModeFor(root: { dataset: DOMStringMap }): VoyageMode {
  return root.dataset.sceneLive === "true" ? "full" : "short";
}

export function useWorldNavigation() {
  const router = useRouter();

  return useCallback(
    (destination: WorldDestination) => {
      /*
        Fase actual: navegación por ruta, con la travesía delante.

        El router sigue siendo quien cambia la página; lo que hace la travesía
        es decidir CUÁNDO —en el pico de la distorsión, por temporizador— y
        cortarse con cualquier tecla o gesto. Si ya hay un viaje en marcha, el
        que va, va.

        Cuando llegue el viaje continuo, lo único que cambia es este cuerpo —
        pasará a `document.getElementById(id)?.scrollIntoView(...)` y el store
        de progreso hará el resto. La firma se queda como está a propósito.
      */
      startVoyage({
        id: destination.id,
        href: destination.href,
        mode: voyageModeFor(document.documentElement),
        navigate: (href) => router.push(href),
      });
    },
    [router],
  );
}
