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
export function SystemMap({ worlds }: { worlds: readonly WorldNavItem[] }) {
  const mapRef = useRef<HTMLElement>(null);
  const navigateToWorld = useWorldNavigation();
  const [pointerTarget, setPointerTarget] = useState<WorldId | null>(null);
  const [focusTarget, setFocusTarget] = useState<WorldId | null>(null);
  const [lockedTarget, setLockedTarget] = useState<WorldId | null>(null);

  const activeWorldId = lockedTarget ?? focusTarget ?? pointerTarget;
  const navigationState: WorldNavigationState = lockedTarget
    ? "locked"
    : activeWorldId
      ? "target"
      : "idle";

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

            return (
              <li
                key={world.id}
                className="system-map__slot"
                data-centre={isCentre ? "true" : undefined}
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
                    "--atlas-portrait-y": `${atlas.portrait.y}%`,
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
                <FlatWorldBody world={world} />
                <span className="system-map__target-brackets" aria-hidden="true" />
                <Link
                  aria-hidden="true"
                  className="system-map__hit-target"
                  href={world.href}
                  tabIndex={-1}
                  data-hit-shape={hitbox.shape}
                  data-hitbox-proxy={world.id}
                  data-world={world.id}
                  data-system-body={world.id}
                  data-target-state={itemState}
                  onPointerEnter={() => setPointerTarget(world.id)}
                  onPointerLeave={() => setPointerTarget(null)}
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
          navigationState={navigationState}
          onActivate={activate}
          onFocusTargetChange={setFocusTarget}
          onPointerTargetChange={setPointerTarget}
          worlds={worlds}
        />
      </nav>
    </>
  );
}
