"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { WorldId } from "@/content/worlds.data";
import { MAP_HOVER_MODE, type MapHoverMode } from "@/lib/map-hover";
import { playSample } from "@/lib/audio-samples";
import { projectPlacement } from "@/lib/system-map";
import { flatCompositionFor } from "@/lib/flat-composition";
import {
  shouldNavigateToWorld,
  useWorldNavigation,
  type WorldDestination,
  type WorldNavigationState,
} from "@/lib/world-navigation";
import type { WorldNavItem } from "@/lib/worlds";
import { FlatWorldBody } from "./flat-world-body";
import { NavRail } from "./nav-rail";
import { SystemHud } from "./system-hud";
import "./system-map-atlas.css";

type HitboxShape = "box" | "craft" | "sphere";

interface InteractionVolume {
  /** Radio de respaldo para el mapa plano, antes de recibir `--map-radius`. */
  fallbackRadius: number;
  /** Factor sobre el diámetro proyectado: siempre dentro del contrato 110–135 %. */
  scale: number;
  shape: HitboxShape;
}

/**
 * Volumen de interacción por silueta, no por texto.
 *
 * El mapa no usa eventos R3F ni raycasting: el canvas es deliberadamente
 * `aria-hidden` y no recibe puntero. La proyección 3D publica el radio compuesto
 * de cada modelo como `--map-radius`; este proxy DOM lo amplía apenas para que
 * anillos, módulos y bordes sigan reaccionando. El mínimo táctil lo impone el
 * CSS con `--hitbox-min`, sin falsear el tamaño visual de ningún mundo.
 */
function interactionVolumeFor(world: WorldNavItem): InteractionVolume {
  switch (world.visual) {
    case "black-hole":
      return { fallbackRadius: 104, scale: 1.1, shape: "sphere" };
    case "ship":
      return { fallbackRadius: 58, scale: 1.2, shape: "craft" };
    case "tesseract":
      return { fallbackRadius: 34, scale: 1.24, shape: "box" };
    case "beacon":
      return { fallbackRadius: 48, scale: 1.2, shape: "craft" };
    case "water":
    case "desert":
      return { fallbackRadius: 36, scale: 1.18, shape: "sphere" };
  }
}

/**
 * Interfaz única del System Map.
 *
 * El raíl conserva los seis enlaces accesibles. Los proxies sobre los cuerpos
 * son enlaces reales retirados del árbol accesible: aportan puntero y mejora
 * progresiva sin duplicar las seis paradas de teclado. Ambos comparten un solo
 * estado y la misma costura de navegación. El canvas nunca crea UI.
 */
export function SystemMap({
  worlds,
  /* Cuál de las dos respuestas al puntero corre. Es propiedad y no sólo
     constante para que los tests recorran las dos: un camino apagado que nadie
     ejecuta se pudre en silencio, y éste está apagado a propósito. */
  hoverMode = MAP_HOVER_MODE,
}: {
  worlds: readonly WorldNavItem[];
  hoverMode?: MapHoverMode;
}) {
  const mapRef = useRef<HTMLElement>(null);
  const navigateToWorld = useWorldNavigation();
  const [pointerTarget, setPointerTarget] = useState<WorldId | null>(null);
  const [focusTarget, setFocusTarget] = useState<WorldId | null>(null);
  const [lockedTarget, setLockedTarget] = useState<WorldId | null>(null);
  /*
    Qué destino sonó la última vez.

    El blip de proximidad tiene que sonar UNA vez por cuerpo apuntado, y
    `acquire` se dispara más de una vez por el mismo: los blancos se tocan —el
    proxy de Gargantúa cubre media escena— así que entrar en un vecino y volver
    reentra en el mismo enlace. Sin esta referencia, cruzar el mapa despacio
    repica la misma nota. No es estado de React a propósito: no pinta nada.
  */
  const sounded = useRef<WorldId | null>(null);

  /*
    LA MISMA SEÑAL, DOS LECTURAS. Ver `lib/map-hover.ts`.

    Apuntar y enfocar se recogen igual en los dos modos —es el mismo evento del
    mismo enlace— y lo único que cambia es a dónde va la señal. En
    `instrumento` alimenta `navigationState`, que es lo que encienden las
    escuadras, el HUD, el raíl y el tinte del cuerpo. En `sencillo` ese estado
    se queda en `idle` para todo el mundo y la señal sale por un canal aparte,
    `hoveredWorldId`, que sólo ve el slot apuntado.

    Se hace así y no quitando los manejadores porque el estado bloqueado tiene
    que seguir existiendo: `activate` lo escribe antes de navegar y la travesía
    lo lee. Lo que se apaga es lo que se PINTA con él.
  */
  const instrument = hoverMode === "instrumento";
  const activeWorldId = instrument
    ? (lockedTarget ?? focusTarget ?? pointerTarget)
    : null;
  const hoveredWorldId = instrument ? null : (focusTarget ?? pointerTarget);
  const navigationState: WorldNavigationState =
    !instrument || !activeWorldId ? "idle" : lockedTarget ? "locked" : "target";

  /*
   * Instrumentación de desarrollo deliberadamente DOM-only. No crea geometría,
   * no cambia el raycast (no hay raycast) y no existe por defecto ni en
   * producción. La hoja global decide cómo dibujar los bounds cuando este
   * atributo está presente.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || process.env.NODE_ENV !== "development") return;

    const debug =
      new URLSearchParams(window.location.search).get("debugHitboxes") === "1";
    if (debug) map.dataset.debugHitboxes = "true";

    return () => {
      delete map.dataset.debugHitboxes;
    };
  }, []);

  /*
    Adquirir y soltar son asimétricos, y tienen que serlo.

    `pointerleave` decía `setPointerTarget(null)` a secas: quien saliera de un
    destino apagaba el estado de navegación fuera cual fuera el destino activo.
    Con blancos que se tocan —y el proxy de Gargantúa toca a media escena— el
    navegador puede entregar el `pointerenter` del vecino ANTES del
    `pointerleave` del que dejas, y entonces el segundo evento borraba una
    adquisición que ya era del primero: el cuerpo se encendía y se apagaba solo
    en el mismo gesto. Soltar solo puede apagar lo que uno mismo encendió.
  */
  /*
    Es una grabación y no una receta, y además es la MISMA para los seis. Antes
    cada destino tenía su altura y recorrer el mapa tocaba una escala; el dueño
    rechazó dos veces aquel blip y trajo este archivo, así que la escala se
    retira con él. Si algún día vuelve a querer el mapa afinado, el sitio donde
    entra es aquí y el precio es que la grabación cambia de largo al cambiar de
    tono.

    Va en `acquire`/`focusOn` y no en el JSX porque el raíl entra por aquí
    también: apuntar un nombre de la lista es el mismo acto que apuntar su
    cuerpo, y con teclado tiene que sonar igual.
  */
  function ping(id: WorldId) {
    if (sounded.current === id) return;
    sounded.current = id;
    playSample("hover");
  }

  function unping(id: WorldId) {
    if (sounded.current === id) sounded.current = null;
  }

  function acquire(id: WorldId) {
    setPointerTarget(id);
    ping(id);
  }

  function release(id: WorldId) {
    setPointerTarget((current) => (current === id ? null : current));
    unping(id);
  }

  function focusOn(id: WorldId) {
    setFocusTarget(id);
    ping(id);
  }

  function blurFrom(id: WorldId) {
    setFocusTarget((current) => (current === id ? null : current));
    unping(id);
  }

  function activate(
    event: ReactMouseEvent<HTMLAnchorElement>,
    destination: WorldDestination,
  ) {
    // Cmd/Ctrl/Shift/Alt y botones secundarios siguen perteneciendo al
    // navegador; sólo la activación principal entra en la abstracción.
    if (!shouldNavigateToWorld(event)) return;
    event.preventDefault();
    setLockedTarget(destination.id);
    navigateToWorld(destination);
  }

  return (
    <>
      <SystemHud
        activeWorldId={activeWorldId}
        navigationState={navigationState}
        worlds={worlds}
      />

      <nav
        className="system-map"
        id="sistema"
        aria-label="Destinos del Sistema Gargantúa"
        ref={mapRef}
      >
        {/*
          Eco visual. El contenedor completo se retira del árbol accesible:
          teclado y lectores recorren únicamente el raíl, en orden 01→06.
        */}
        <ol className="system-map__field" aria-hidden="true">
          {worlds.map((world) => {
            const point = projectPlacement(world.placement);
            const atlas = flatCompositionFor(world.id);
            const isCentre = world.placement.orbitRadius === 0;
            const hitbox = interactionVolumeFor(world);
            const itemState =
              world.id === activeWorldId ? navigationState : "idle";
            const hovered = world.id === hoveredWorldId;

            return (
              <li
                key={world.id}
                className="system-map__slot"
                data-centre={isCentre ? "true" : undefined}
                data-map-hover={hovered ? "true" : undefined}
                data-flat-visual={world.visual}
                data-flat-side={
                  isCentre ? "centre" : point.x < 50 ? "left" : "right"
                }
                data-map-world={world.id}
                data-target-state={itemState}
                style={
                  {
                    // La posición plana conserva su propio par de variables.
                    // La escena 3D escribe --map-x/y cada frame y las retira al
                    // desmontarse; React no vuelve a aplicar una propiedad
                    // inline borrada imperativamente si no hubo otro render.
                    // Separar ambas fuentes evita que 3D → flat deje todos los
                    // destinos en 0,0 hasta recargar la página.
                    "--map-flat-x": `${point.x.toFixed(2)}%`,
                    "--map-flat-y": `${point.y.toFixed(2)}%`,
                    "--atlas-x": `${atlas.wide.x}%`,
                    "--atlas-y": `${atlas.wide.y}%`,
                    "--atlas-portrait-x": `${atlas.portrait.x}%`,
                    // Fracción, no porcentaje: se multiplica por el alto del
                    // escenario (system-map-atlas.css), no por el del viewport.
                    "--atlas-portrait-y": atlas.portrait.y / 100,
                    "--atlas-short-x": `${atlas.short.x}%`,
                    "--atlas-short-y": `${atlas.short.y}%`,
                    "--map-x": `${point.x.toFixed(2)}%`,
                    "--map-y": `${point.y.toFixed(2)}%`,
                    "--order": world.order,
                    "--hitbox-scale": hitbox.scale,
                    "--hitbox-min": "44px",
                    "--map-fallback-radius": `${hitbox.fallbackRadius}px`,
                  } as CSSProperties
                }
              >
                {/*
                  GARGANTÚA NO SE DIBUJA AQUÍ, y la decisión es del mapa.

                  En el atlas plano su figura la pone `SiteBackdrop`, a pantalla
                  completa y detrás de todo: dibujarla también en su slot pondría
                  dos agujeros negros en el cuadro.

                  Hasta este pase esto funcionaba por omisión —`FlatWorldBody`
                  no tenía dibujo para `black-hole` y devolvía `null`— y eso era
                  una regla del mapa sostenida por un hueco en otro archivo. Al
                  montar el Observatorio ese hueco tuvo que rellenarse, porque su
                  cara servida usa la misma figura como esquema del espécimen, y
                  la ausencia se convirtió al instante en un sexto cuerpo aquí.
                  Ahora la condición vive donde está el motivo.
                */}
                {world.id === "gargantua" ? null : (
                  <FlatWorldBody world={world} />
                )}
                {/* Las escuadras son del modo instrumento y sólo existen
                    ahí. El modo sencillo no pone NADA en su lugar: su
                    respuesta es el trazo que ya vive bajo el rótulo. Ver
                    `lib/map-hover.ts`. */}
                {instrument ? (
                  <span
                    className="system-map__target-brackets"
                    aria-hidden="true"
                  />
                ) : null}
                <Link
                  aria-hidden="true"
                  className="system-map__hit-target"
                  href={world.href}
                  tabIndex={-1}
                  data-hit-shape={hitbox.shape}
                  data-hitbox-proxy={world.id}
                  data-world={world.id}
                  data-system-body={world.id}
                  data-map-hover={hovered ? "true" : undefined}
                  data-target-state={itemState}
                  onPointerEnter={() => acquire(world.id)}
                  onPointerLeave={() => release(world.id)}
                  onPointerCancel={() => release(world.id)}
                  onClick={(event) =>
                    activate(event, { id: world.id, href: world.href })
                  }
                />
                {/*
                  El rótulo no participa del hit testing. Antes el enlace era
                  esta caja de texto con 17×14 px de padding: por eso sólo una
                  fracción concreta de una nave o planeta grande despertaba el
                  sistema aunque su geometría visible se extendiera mucho más.
                */}
                <span
                  className="system-map__body"
                  aria-hidden="true"
                  style={{ pointerEvents: "none" }}
                >
                  <span className="system-map__marker" />
                  <span className="system-map__label">
                    <span className="system-map__name">{world.cosmicName}</span>
                    <span className="system-map__role">
                      {world.shortLabel}
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        <NavRail
          activeWorldId={activeWorldId}
          hoveredWorldId={hoveredWorldId}
          navigationState={navigationState}
          onActivate={activate}
          onFocusAcquire={focusOn}
          onFocusRelease={blurFrom}
          onPointerAcquire={acquire}
          onPointerRelease={release}
          worlds={worlds}
        />
      </nav>
    </>
  );
}
