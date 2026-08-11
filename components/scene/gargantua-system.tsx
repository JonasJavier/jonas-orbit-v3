"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { WorldId, WorldStructuralData } from "@/content/worlds.data";
import { useLightEffectsMode } from "@/lib/effects-mode";
import { cameraPoseForRoute } from "@/lib/scene-poses";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { findWorldRoute, type WorldRoute } from "@/lib/world-route";
import { detectLevel, readSignals, type EffectsLevel } from "./capability";
import type { ProjectedBody, SceneHandle } from "./system-scene";

/**
 * El canvas persistente del Sistema Gargantúa.
 *
 * Vive en `app/[locale]/layout.tsx` y **no se remonta al navegar** (§4): si lo
 * hiciera, cada viaje recrearía el contexto WebGL y sería un parpadeo negro. Es
 * también lo que hará posible la transición de G3.
 *
 * `aria-hidden`, fuera del orden de tabulación y sin una palabra de texto
 * dentro. Todo lo que se puede leer o pulsar vive en el HTML servido, encima.
 */

export interface SceneBodyDescriptor {
  id: WorldId;
  visual: WorldStructuralData["visual"];
  accent: string;
  secondary: string;
  placement: WorldStructuralData["placement"];
}

/** Atributo que enlaza un enlace del HTML servido con su cuerpo en la escena. */
const BODY_ATTRIBUTE = "data-system-body";

/**
 * Las capacidades del equipo no cambian durante la sesión, así que no hay nada
 * a lo que suscribirse: lo que sí cambia —reduced-motion y el perfil ligero—
 * llega por props de sus propios hooks y ya provoca un render.
 */
function subscribeNothing() {
  return () => {};
}

/** En el servidor no hay navegador al que preguntar: siempre `flat`. */
function serverLevel(): EffectsLevel {
  return "flat";
}

interface LabelBinding {
  update(projected: readonly ProjectedBody[]): void;
  /** Vuelve a medir las etiquetas: sus tamaños cambian al redimensionar. */
  remeasure(): void;
  detach(): void;
}

export function GargantuaSystem({
  bodies,
  routes,
}: {
  bodies: readonly SceneBodyDescriptor[];
  routes: readonly WorldRoute[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const labelsRef = useRef<LabelBinding | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const lightEffects = useLightEffectsMode();
  const pathname = usePathname();

  /**
   * Una escena que se rindió no vuelve a intentarlo en esta visita: reintentar
   * en bucle contra una GPU que acaba de tirar el contexto es la peor manera de
   * gastar la batería de alguien.
   */
  const [failed, setFailed] = useState(false);
  const [forced, setForced] = useState(false);

  /**
   * El nivel se lee como una fuente externa, no como estado calculado en un
   * efecto. En servidor la instantánea es siempre `flat` —ahí no hay navegador
   * al que preguntar— y tras la hidratación se resuelve con las capacidades
   * reales, sin provocar mismatch. Es el mismo patrón que reduced-motion.
   */
  const detected = useSyncExternalStore(
    subscribeNothing,
    () => detectLevel(readSignals({ reducedMotion, lightEffects, forced })),
    serverLevel,
  );
  const level: EffectsLevel = failed ? "flat" : detected;

  /**
   * ¿Tiene sentido ofrecer «activar»? Solo si el equipo PUEDE (hay WebGL2) y
   * no lo pidió apagado por accesibilidad. Sin esta comprobación, el botón
   * aparecería en equipos donde no haría absolutamente nada.
   */
  const canOffer = useSyncExternalStore(
    subscribeNothing,
    () => readSignals({ reducedMotion, lightEffects }).hasWebGL2 && !reducedMotion,
    () => false,
  );

  const worldId = findWorldRoute(pathname, routes)?.id ?? null;
  const worldIdRef = useRef<WorldId | null>(worldId);

  // Publica el nivel activo en el DOM. Es lo que hace auditable el gate y lo que
  // permite que el CSS retire el fondo 2D cuando la escena está viva.
  useEffect(() => {
    document.documentElement.dataset.scene = level;
    return () => {
      delete document.documentElement.dataset.scene;
    };
  }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || level === "flat") return;

    let cancelled = false;
    let handle: SceneHandle | null = null;

    /**
     * La escena se carga bajo demanda. three.js entero jamás entra en la carga
     * inicial de ninguna ruta: es el presupuesto de §8 y el motivo por el que el
     * nivel `flat` no descarga ni un byte de 3D.
     */
    void import("./system-scene")
      .then(({ createSystemScene }) => {
        if (cancelled) return;
        handle = createSystemScene({
          canvas,
          tier: level === "deep" ? "deep" : "orbit",
          pose: cameraPoseForRoute(worldIdRef.current),
          bodies,
          onProject: (projected) => labelsRef.current?.update(projected),
          onFailure: () => {
            // Degradación real: se libera todo y se vuelve al nivel `flat`, que
            // ya está construido y probado. Nunca se deja una escena rota.
            handle?.dispose();
            handle = null;
            handleRef.current = null;
            setFailed(true);
          },
        });
        handleRef.current = handle;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      handle?.dispose();
      handleRef.current = null;
    };
    // `bodies` viene del servidor y es estable. Cambiar de ruta NO reconstruye
    // la escena: solo cambia su pose.
  }, [bodies, level]);

  /**
   * Enlaza los nodos del HTML con la escena. Se rehace en cada navegación
   * porque el marcado cambia: la home trae los siete destinos y una página de
   * mundo no trae ninguno.
   */
  useEffect(() => {
    if (level === "flat") return;
    const binding = bindLabels(() => handleRef.current);
    labelsRef.current = binding;

    // El tamaño de las etiquetas cambia con el ancho del viewport, y de él
    // depende cuándo se consideran solapadas.
    const onResize = () => binding.remeasure();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      binding.detach();
      if (labelsRef.current === binding) labelsRef.current = null;
    };
  }, [level, pathname]);

  // La pose sigue a la ruta. Es todo el acoplamiento que existe entre el router
  // y la cámara, y va en esta dirección: la ruta manda, la cámara obedece.
  //
  // El ref existe porque la escena se carga de forma asíncrona: cuando el
  // `import()` resuelve hay que darle la pose de la ruta en la que estamos AHORA,
  // que puede no ser la del montaje.
  useEffect(() => {
    worldIdRef.current = worldId;
    handleRef.current?.setPose(cameraPoseForRoute(worldId));
  }, [worldId]);

  // Paralaje aditivo del puntero, acotado a 2° dentro de la escena (§3).
  useEffect(() => {
    if (level === "flat" || reducedMotion) return;

    let frame = 0;
    let pendingX = 0;
    let pendingY = 0;

    function apply() {
      frame = 0;
      handleRef.current?.setParallax(pendingX, pendingY);
    }

    function onPointerMove(event: PointerEvent) {
      pendingX = (event.clientX / window.innerWidth) * 2 - 1;
      pendingY = (event.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(apply);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [level, reducedMotion]);

  if (level === "flat") {
    // Nunca se deja al visitante sin explicación ni sin salida: o el gate creyó
    // que su equipo no llegaba y puede desmentirlo, o la escena se rindió y hay
    // que decirlo. El silencio es lo único que no vale.
    if (!canOffer || failed) return null;
    return (
      <button
        className="scene-toggle"
        onClick={() => setForced(true)}
        type="button"
      >
        Activar escena 3D
      </button>
    );
  }

  return (
    <canvas
      aria-hidden="true"
      className="system-canvas"
      data-testid="gargantua-canvas"
      ref={canvasRef}
    />
  );
}

/**
 * Une la escena con el HTML servido.
 *
 * Los siete enlaces YA existen en el marcado: esto no los crea, solo les escribe
 * dónde está su cuerpo. Por eso la escena puede fallar entera y los destinos
 * siguen ahí, y por eso el recorrido con teclado funciona sin que la escena se
 * entere de nada.
 *
 * Se escribe `transform` vía variables CSS, nunca `left`/`top`: mover siete
 * elementos por frame con propiedades de layout obligaría al navegador a
 * recalcularlo sesenta veces por segundo.
 */
function bindLabels(getHandle: () => SceneHandle | null): LabelBinding {
  const nodes = new Map<string, HTMLElement>();
  /**
   * Las coordenadas se escriben en el CONTENEDOR posicionado, no en el enlace.
   * Las variables CSS heredan hacia abajo, nunca hacia arriba: escribirlas en el
   * `<a>` dejaba el `transform` del `<li>` leyendo el valor del servidor y los
   * destinos se quedaban clavados en el sitio del mapa plano.
   */
  const slots = new Map<string, HTMLElement>();

  for (const node of document.querySelectorAll<HTMLElement>(`[${BODY_ATTRIBUTE}]`)) {
    const id = node.getAttribute(BODY_ATTRIBUTE);
    if (!id) continue;
    nodes.set(id, node);
    slots.set(id, node.closest<HTMLElement>(".system-map__slot") ?? node);
  }

  const teardown: Array<() => void> = [];
  for (const [id, node] of nodes) {
    const enter = () => getHandle()?.setFocus(id as WorldId);
    const leave = () => getHandle()?.setFocus(null);
    node.addEventListener("pointerenter", enter);
    node.addEventListener("pointerleave", leave);
    node.addEventListener("focus", enter);
    node.addEventListener("blur", leave);
    teardown.push(() => {
      node.removeEventListener("pointerenter", enter);
      node.removeEventListener("pointerleave", leave);
      node.removeEventListener("focus", enter);
      node.removeEventListener("blur", leave);
    });
  }

  /**
   * Separación de etiquetas que se pisan.
   *
   * Con órbitas reales, dos cuerpos se cruzan en pantalla tarde o temprano: es
   * inevitable y no se arregla moviendo los cuerpos — eso sería falsear el
   * sistema para que la interfaz quede cómoda. Lo que se aparta es la ETIQUETA.
   *
   * El tamaño de cada etiqueta se mide UNA vez y se cachea: leer `offsetWidth`
   * en cada frame forzaría al navegador a recalcular el layout sesenta veces
   * por segundo, que es justo lo que este diseño evita.
   *
   * El desplazamiento se suaviza hacia su objetivo en vez de saltar. Sin eso,
   * dos etiquetas al borde del contacto oscilarían entre separadas y juntas en
   * frames alternos, y el parpadeo se ve muchísimo más que el solape.
   */
  const sizes = new Map<string, { w: number; h: number }>();
  const nudges = new Map<string, number>();

  function measureSizes() {
    for (const [id, slot] of slots) {
      sizes.set(id, { w: slot.offsetWidth, h: slot.offsetHeight });
    }
  }

  function separate(projected: readonly ProjectedBody[]) {
    if (sizes.size === 0) measureSizes();

    // De arriba abajo: cada etiqueta empuja hacia abajo a la siguiente con la
    // que choque. Una pasada basta para siete elementos.
    const order = [...projected].sort((a, b) => a.y - b.y);
    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];

    for (const body of order) {
      const size = sizes.get(body.id) ?? { w: 180, h: 60 };
      let y = body.y;

      for (const other of placed) {
        const overlapX =
          Math.abs(body.x - other.x) < (size.w + other.w) / 2 - 8;
        const overlapY = Math.abs(y - other.y) < (size.h + other.h) / 2 + 6;
        if (overlapX && overlapY) {
          y = other.y + (size.h + other.h) / 2 + 6;
        }
      }

      placed.push({ x: body.x, y, w: size.w, h: size.h });

      const target = y - body.y;
      const current = nudges.get(body.id) ?? 0;
      // Suavizado exponencial: llega en ~10 frames y no vibra.
      nudges.set(body.id, current + (target - current) * 0.22);
    }
  }

  return {
    update(projected) {
      // El interruptor se acciona con la PRIMERA proyección, no al decidir el
      // nivel. Entre las dos cosas hay una carga dinámica de varios cientos de
      // milisegundos, y durante ese hueco el CSS de la escena leería las
      // coordenadas en % del servidor como si fueran píxeles: los siete
      // destinos amontonados en una esquina hasta que llegara el primer frame.
      document.documentElement.dataset.sceneLive = "true";
      separate(projected);

      for (const body of projected) {
        const slot = slots.get(body.id);
        if (!slot) continue;
        const nudge = nudges.get(body.id) ?? 0;
        slot.style.setProperty("--map-x", `${body.x.toFixed(1)}px`);
        slot.style.setProperty("--map-y", `${(body.y + nudge).toFixed(1)}px`);
        slot.style.setProperty("--map-radius", `${body.radius.toFixed(1)}px`);
        slot.dataset.offscreen = body.visible ? "false" : "true";
        slot.dataset.side = body.side;
      }
    },
    remeasure: measureSizes,
    detach() {
      delete document.documentElement.dataset.sceneLive;
      for (const off of teardown) off();
      for (const slot of slots.values()) {
        slot.style.removeProperty("--map-x");
        slot.style.removeProperty("--map-y");
        slot.style.removeProperty("--map-radius");
        delete slot.dataset.offscreen;
        delete slot.dataset.side;
      }
    },
  };
}
