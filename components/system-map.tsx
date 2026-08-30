"use client";

import Link from "next/link";
import { useState, type MouseEvent as ReactMouseEvent } from "react";
import type { WorldId } from "@/content/worlds.data";
import { projectPlacement } from "@/lib/system-map";
import {
  shouldNavigateToWorld,
  useWorldNavigation,
  type WorldDestination,
  type WorldNavigationState,
} from "@/lib/world-navigation";
import type { WorldNavItem } from "@/lib/worlds";
import { NavRail } from "./nav-rail";
import { SystemHud } from "./system-hud";

/**
 * Interfaz única del System Map.
 *
 * El raíl conserva los siete enlaces accesibles y los proxies sobre los cuerpos
 * siguen siendo enlaces reales para la mejora progresiva, pero ambos comparten
 * un solo estado y la misma costura de navegación. El canvas nunca crea UI.
 */
export function SystemMap({ worlds }: { worlds: readonly WorldNavItem[] }) {
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
      >
        {/*
          Eco visual. El contenedor completo se retira del árbol accesible:
          teclado y lectores recorren únicamente el raíl, en orden 01→07.
        */}
        <ol className="system-map__field" aria-hidden="true">
          {worlds.map((world) => {
            const point = projectPlacement(world.placement);
            const isCentre = world.placement.orbitRadius === 0;
            const itemState =
              world.id === activeWorldId ? navigationState : "idle";

            return (
              <li
                key={world.id}
                className="system-map__slot"
                data-centre={isCentre ? "true" : undefined}
                data-target-state={itemState}
                style={
                  {
                    "--map-x": `${point.x.toFixed(2)}%`,
                    "--map-y": `${point.y.toFixed(2)}%`,
                    "--order": world.order,
                  } as React.CSSProperties
                }
              >
                <span className="system-map__target-brackets" aria-hidden="true" />
                <Link
                  className="system-map__body"
                  href={world.href}
                  tabIndex={-1}
                  data-world={world.id}
                  data-system-body={world.id}
                  data-target-state={itemState}
                  onPointerEnter={() => setPointerTarget(world.id)}
                  onPointerLeave={() => setPointerTarget(null)}
                  onClick={(event) =>
                    activate(event, { id: world.id, href: world.href })
                  }
                >
                  <span className="system-map__marker" />
                  <span className="system-map__label">
                    <span className="system-map__name">{world.cosmicName}</span>
                    <span className="system-map__role">
                      {String(world.order).padStart(2, "0")} {"// "}
                      {world.shortLabel}
                    </span>
                  </span>
                </Link>
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
