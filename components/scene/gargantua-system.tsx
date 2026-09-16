"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { WorldId, WorldStructuralData } from "@/content/worlds.data";
import { useForcedEffects, useLightEffectsMode } from "@/lib/effects-mode";
import { cameraPoseForRoute } from "@/lib/scene-poses";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { readVoyageDeparture, subscribeVoyage } from "@/lib/voyage-controller";
import { findWorldRoute, type WorldRoute } from "@/lib/world-route";
import {
  evaluateCapabilities,
  readSignals,
  type EffectsLevel,
  type LevelReason,
} from "./capability";
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

/** Atributo que enlaza el proxy DOM dedicado con su cuerpo en la escena. */
/**
 * Mundos cuya página cubre la escena persistente con un lienzo propio (Sobre
 * mí, Miller y Edmunds) o con un contexto WebGL2 propio (Miller, Ranger). Mientras el
 * visitante está en ellos la escena duerme: nunca hay dos contextos dibujando.
 */
const COVERED_WORLDS: readonly WorldId[] = ["gargantua", "miller", "edmunds", "ranger", "tesseract"];
function isCoveredRoute(worldId: WorldId | null): boolean {
  return worldId !== null && COVERED_WORLDS.includes(worldId);
}

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

function serverReason(): LevelReason {
  return "ok";
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
  // La activación no es estado de este componente: es una preferencia del
  // visitante que el cielo y el polvo también leen. Vive en `effects-mode`.
  const forced = useForcedEffects();

  /**
   * El nivel se lee como una fuente externa, no como estado calculado en un
   * efecto. En servidor la instantánea es siempre `flat` —ahí no hay navegador
   * al que preguntar— y tras la hidratación se resuelve con las capacidades
   * reales, sin provocar mismatch. Es el mismo patrón que reduced-motion.
   */
  //
  // Se leen tres VALORES PRIMITIVOS, no un objeto. `useSyncExternalStore`
  // compara la instantánea con `Object.is`: devolver un objeto nuevo en cada
  // llamada lo metería en un bucle infinito de re-renders.
  const readVerdict = () =>
    evaluateCapabilities(readSignals({ reducedMotion, lightEffects, forced }));

  const detected = useSyncExternalStore(
    subscribeNothing,
    () => readVerdict().level,
    serverLevel,
  );
  const reason = useSyncExternalStore(
    subscribeNothing,
    () => readVerdict().reason,
    serverReason,
  );
  const level: EffectsLevel = failed ? "flat" : detected;

  const worldId = findWorldRoute(pathname, routes)?.id ?? null;
  const worldIdRef = useRef<WorldId | null>(worldId);

  /**
   * La travesía hacia un destino. El controlador (`voyage-controller`) es el
   * dueño del reloj y del router; la escena sólo recibe el despegue —id e
   * instante de salida— y muestrea la línea de tiempo por su cuenta. El
   * despegue es el mismo objeto mientras dura, así que esto no re-renderiza
   * por fotograma: cambia dos veces por viaje, al salir y al pedir la ruta.
   */
  const departure = useSyncExternalStore(
    subscribeVoyage,
    readVoyageDeparture,
    () => null,
  );
  const departureRef = useRef(departure);

  // Publica el nivel y el motivo en el DOM. Es lo que hace auditable el gate, lo
  // que permite que el CSS retire el fondo 2D cuando la escena está viva, y lo
  // que convierte «no se ve nada» en un diagnóstico de una sola línea.
  useEffect(() => {
    document.documentElement.dataset.scene = level;
    document.documentElement.dataset.sceneReason = failed
      ? "escena-fallida"
      : reason;
    return () => {
      delete document.documentElement.dataset.scene;
      delete document.documentElement.dataset.sceneReason;
    };
  }, [level, reason, failed]);

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
        handle.setCovered(isCoveredRoute(worldIdRef.current));
        const current = departureRef.current;
        if (current) {
          handle.setVoyage({ id: current.id, startedAt: current.startedAt });
        }
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
   * porque el marcado cambia: la home trae los seis destinos y una página de
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
    handleRef.current?.setCovered(isCoveredRoute(worldId));
  }, [worldId]);

  // El despegue va a la escena tal cual llega: un objeto con id e instante, o
  // null cuando el router ya tiene la ruta. La pose de la ruta nueva llega por
  // el efecto de arriba y también termina el viaje por su cuenta.
  useEffect(() => {
    departureRef.current = departure;
    handleRef.current?.setVoyage(
      departure ? { id: departure.id, startedAt: departure.startedAt } : null,
    );
  }, [departure]);

  // Paralaje aditivo del puntero, acotado a 2° dentro de la escena (§3). La
  // preferencia del sistema lo apaga por defecto; el consentimiento explícito
  // que montó la escena recupera también este efecto, no sólo el canvas.
  useEffect(() => {
    if (level === "flat" || (reducedMotion && !forced)) return;

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
  }, [forced, level, reducedMotion]);

  // Sin escena no hay nada que dibujar ni que ofrecer: el interruptor único
  // de movimiento de la bandeja es el único control, en todas las rutas.
  if (level === "flat") return null;

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
 * Los seis enlaces accesibles YA existen en el raíl: esto no los crea. Sólo
 * escribe posición y radio compuesto sobre el ancla de cada cuerpo. El proxy
 * visual es un enlace separado, `aria-hidden` y fuera de tabulación; así el área
 * de puntero puede cubrir la silueta completa sin duplicar navegación accesible.
 * Por eso la escena puede fallar entera y los destinos siguen navegables.
 *
 * Se escribe `transform` vía variables CSS, nunca `left`/`top`: mover seis
 * elementos por frame con propiedades de layout obligaría al navegador a
 * recalcularlo sesenta veces por segundo.
 */
function bindLabels(getHandle: () => SceneHandle | null): LabelBinding {
  const proxies = new Map<string, HTMLElement>();
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
    proxies.set(id, node);
    slots.set(id, node.closest<HTMLElement>(".system-map__slot") ?? node);
  }

  /*
    Apuntar una entrada del RAÍL enciende el mismo cuerpo y la misma órbita que
    apuntar el planeta. Sin esto, el raíl sería una lista de enlaces al lado de
    un universo mudo; con esto, es el mando del universo — y es lo que da
    usabilidad a los destinos que la composición deja pequeños o lejanos.

    El raíl no mueve etiquetas, así que no entra en `slots`: sólo en el foco.
  */
  const focusable = new Map<string, HTMLElement[]>();
  for (const [id, node] of proxies) focusable.set(id, [node]);
  for (const node of document.querySelectorAll<HTMLElement>("[data-rail-world]")) {
    const id = node.getAttribute("data-rail-world");
    if (!id) continue;
    focusable.set(id, [...(focusable.get(id) ?? []), node]);
  }

  const teardown: Array<() => void> = [];
  for (const [id, group] of focusable) {
    for (const node of group) {
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
  /** Tamaño del TEXTO de cada etiqueta. Estable: solo cambia al redimensionar. */
  const textSizes = new Map<string, { w: number; h: number }>();
  const nudges = new Map<string, number>();
  /** Cuerpos cuyo nombre va centrado bajo ellos: hoy solo el agujero negro. */
  const centres = new Set(
    [...slots].filter(([, slot]) => slot.dataset.centre === "true").map(([id]) => id),
  );
  /** El lado con el que se quedó cada etiqueta, para la histéresis del borde. */
  const folded = new Map<string, "left" | "right">();

  /*
    Relleno del rótulo y hueco hasta el cuerpo. Tienen que coincidir con el CSS:
    es el precio de calcular la caja en vez de medirla en cada fotograma.

    Este cálculo sólo separa texto; el blanco de interacción ya no depende de
    esta caja. El proxy centrado usa `--map-radius` y su propio mínimo de 44 px.
  */
  const PAD_X = 14;
  // Coincide con el padding visual del rótulo para que su caja de colisión sea
  // estable; el mínimo táctil de 44 px pertenece ahora al proxy independiente.
  const PAD_Y = 17;
  /** Del centro del cuerpo al borde del texto, además de su radio aparente. */
  const LABEL_GAP = 12;
  /** Aire mínimo entre una etiqueta y el borde de la ventana, en píxeles. */
  const EDGE = 14;
  /** Aire entre dos etiquetas apartadas. Absorbe el error del cálculo de caja. */
  const SEPARATION = 12;
  /** Holgura que hay que recuperar para deshacer un pliegue contra el borde. */
  const FOLD_SLACK = 28;

  function measureSizes() {
    for (const [id, slot] of slots) {
      const label = slot.querySelector<HTMLElement>(".system-map__label");
      textSizes.set(id, {
        w: label?.offsetWidth ?? 70,
        h: label?.offsetHeight ?? 14,
      });
    }
  }

  /**
   * Caja de la etiqueta.
   *
   * ── Por qué ahora es ESTABLE, y por qué eso arregla un movimiento raro ─────
   *
   * Antes la caja incluía el aro del marcador, cuyo diámetro salía del radio
   * aparente del cuerpo — un número que cambia en CADA fotograma porque el
   * cuerpo se acerca y se aleja a lo largo de su órbita. Así que el tamaño de
   * cada caja respiraba sesenta veces por segundo, y con él respiraba la
   * decisión de qué etiquetas se solapan. El suavizado de abajo perseguía un
   * objetivo que nunca se estaba quieto: los nombres derivaban despacio y sin
   * motivo aparente. Era la «deriva rara» del sistema.
   *
   * Sin aro, la caja es texto más relleno: constante entre redimensionados. El
   * objetivo de la separación deja de moverse solo y el suavizado converge y se
   * calla.
   */
  function boxOf(id: string) {
    const text = textSizes.get(id) ?? { w: 70, h: 14 };
    return { w: text.w + PAD_X * 2, h: text.h + PAD_Y * 2 };
  }

  /** Desplazamiento del borde de la caja respecto del cuerpo. Igual que el CSS. */
  function offsetOf(radius: number) {
    return radius + LABEL_GAP - PAD_X;
  }

  /**
   * Lado definitivo del nombre.
   *
   * La escena ya ha decidido el lado natural —hacia fuera del sistema— pero no
   * conoce el ancho de las palabras. Aquí se pliega hacia dentro si por ese lado
   * el nombre se saldría de la ventana, con histéresis para que un cuerpo que
   * roza el borde no lo haga en fotogramas alternos.
   */
  function sideOf(
    id: string,
    radius: number,
    x: number,
    natural: "left" | "right",
  ): "left" | "right" {
    if (centres.has(id)) return natural;

    const width = boxOf(id).w;
    const offset = offsetOf(radius);
    const previous = folded.get(id);
    // Cuánto sitio hace falta a cada lado para que la caja entre entera.
    const needsRight = x + offset + width <= window.innerWidth - EDGE;
    const needsLeft = x - offset - width >= EDGE;

    let side = natural;
    if (side === "right" && !needsRight && needsLeft) side = "left";
    else if (side === "left" && !needsLeft && needsRight) side = "right";

    // Volver al lado natural exige recuperar holgura de sobra, no sólo la justa.
    if (previous && previous !== side) {
      const slackRight = x + offset + width <= window.innerWidth - EDGE - FOLD_SLACK;
      const slackLeft = x - offset - width >= EDGE + FOLD_SLACK;
      if (side === "right" && !slackRight) side = previous;
      else if (side === "left" && !slackLeft) side = previous;
    }

    folded.set(id, side);
    return side;
  }

  /** Centro horizontal de la caja, dado el punto del cuerpo y su lado. */
  function centreXOf(id: string, radius: number, x: number, side: "left" | "right") {
    if (centres.has(id)) return x;
    const half = boxOf(id).w / 2;
    const offset = offsetOf(radius);
    return side === "left" ? x - offset - half : x + offset + half;
  }

  function separate(projected: readonly ProjectedBody[]) {
    // De arriba abajo: cada etiqueta empuja hacia abajo a la siguiente con la
    // que choque. Dos pasadas, porque al apartar una puede aparecer un choque
    // nuevo con la de más abajo.
    const order = [...projected].sort(
      (a, b) => a.y + (a.labelDrop ?? 0) - (b.y + (b.labelDrop ?? 0)),
    );
    const placed = new Map<string, { x: number; y: number; w: number; h: number }>();

    for (let pass = 0; pass < 2; pass++) {
      for (const body of order) {
        const size = boxOf(body.id);
        const centreX = centreXOf(body.id, body.radius, body.x, body.side);
        const labelY = body.y + (body.labelDrop ?? 0);
        let y = placed.get(body.id)?.y ?? labelY;

        for (const [id, other] of placed) {
          if (id === body.id) continue;
          const overlapX = Math.abs(centreX - other.x) < (size.w + other.w) / 2 - 8;
          const overlapY = Math.abs(y - other.y) < (size.h + other.h) / 2 + SEPARATION;
          if (overlapX && overlapY) {
            y = other.y + (size.h + other.h) / 2 + SEPARATION;
          }
        }

        placed.set(body.id, { x: centreX, y, w: size.w, h: size.h });
      }
    }

    for (const body of projected) {
      const labelY = body.y + (body.labelDrop ?? 0);
      const target = (placed.get(body.id)?.y ?? labelY) - labelY;
      const current = nudges.get(body.id);

      // La primera colocación es instantánea: no hay historial que conservar y
      // suavizar desde cero solo produce un deslizamiento al entrar. A partir de
      // ahí, suavizado exponencial — llega en ~10 fotogramas y no vibra, que es
      // lo que impide el parpadeo entre «separadas» y «juntas» cuando dos
      // etiquetas rondan el contacto.
      nudges.set(
        body.id,
        current === undefined ? target : current + (target - current) * 0.22,
      );
    }
  }

  /**
   * Mete la etiqueta dentro de la ventana. Se aplica al valor FINAL, después
   * del suavizado, y ese orden importa: si se limitara antes, el suavizado
   * seguiría acercándose al límite poco a poco y durante los primeros
   * fotogramas la etiqueta estaría fuera de pantalla. Un destino fuera de la
   * ventana es un enlace que no existe, aunque sea medio segundo.
   */
  function clamp(
    id: string,
    radius: number,
    x: number,
    y: number,
    side: "left" | "right",
  ) {
    const size = boxOf(id);
    const halfH = size.h / 2;

    /*
      El límite horizontal se calcula sobre la caja REAL, que cuelga hacia un
      lado del ancla. Con la caja centrada —lo que valía antes— un destino a la
      derecha del cuadro se daba por dentro cuando su nombre ya asomaba medio
      fuera, porque el texto está todo a un lado y no repartido.
    */
    const offset = offsetOf(radius);
    const left = centres.has(id)
      ? x - size.w / 2
      : side === "left"
        ? x - offset - size.w
        : x + offset;
    const right = left + size.w;

    // Se corrige el ANCLA lo justo para que la caja entre. El pliegue de lado ya
    // ha hecho lo que ha podido; esto es el último recurso.
    let shift = 0;
    if (left < EDGE) shift = EDGE - left;
    else if (right > window.innerWidth - EDGE) {
      shift = window.innerWidth - EDGE - right;
    }

    return {
      x: x + shift,
      y: Math.min(Math.max(y, halfH + EDGE), window.innerHeight - halfH - EDGE),
    };
  }

  let sceneLivePublished = false;

  return {
    update(projected) {
      // El interruptor se acciona con la PRIMERA proyección, no al decidir el
      // nivel. Entre las dos cosas hay una carga dinámica de varios cientos de
      // milisegundos, y durante ese hueco el CSS de la escena leería las
      // coordenadas en % del servidor como si fueran píxeles: los seis
      // destinos amontonados en una esquina hasta que llegara el primer frame.
      if (!sceneLivePublished) {
        document.documentElement.dataset.sceneLive = "true";
        sceneLivePublished = true;
      }
      if (textSizes.size === 0) measureSizes();

      // El lado definitivo se resuelve UNA vez por fotograma y viaja a todo lo
      // demás. Calcularlo dentro de la separación y otra vez dentro del ajuste
      // al borde permitiría que los dos discreparan durante un fotograma, y esa
      // discrepancia se ve: la etiqueta se coloca contra un lado y se dibuja
      // contra el otro.
      const resolved = projected.map((body) => ({
        ...body,
        side: sideOf(body.id, body.radius, body.x, body.side),
      }));

      separate(resolved);

      for (const body of resolved) {
        const slot = slots.get(body.id);
        if (!slot) continue;
        const nudge = nudges.get(body.id) ?? 0;
        const labelY = body.y + (body.labelDrop ?? 0) + nudge;
        const at = clamp(body.id, body.radius, body.x, labelY, body.side);
        slot.style.setProperty("--map-x", `${body.x.toFixed(1)}px`);
        slot.style.setProperty("--map-y", `${body.y.toFixed(1)}px`);
        slot.style.setProperty("--map-radius", `${body.radius.toFixed(1)}px`);
        slot.style.setProperty(
          "--map-hit-radius-x",
          `${(body.hitRadiusX ?? body.radius).toFixed(1)}px`,
        );
        slot.style.setProperty(
          "--map-hit-radius-y",
          `${(body.hitRadiusY ?? body.radius).toFixed(1)}px`,
        );
        slot.style.setProperty(
          "--map-label-shift-x",
          `${(at.x - body.x).toFixed(1)}px`,
        );
        slot.style.setProperty(
          "--map-label-shift-y",
          `${(at.y - body.y).toFixed(1)}px`,
        );
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
        slot.style.removeProperty("--map-hit-radius-x");
        slot.style.removeProperty("--map-hit-radius-y");
        slot.style.removeProperty("--map-label-shift-x");
        slot.style.removeProperty("--map-label-shift-y");
        delete slot.dataset.offscreen;
        delete slot.dataset.side;
      }
    },
  };
}
