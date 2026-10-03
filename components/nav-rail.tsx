"use client";

import { IntentLink as Link } from "@/components/intent-link";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { WorldId } from "@/content/worlds.data";
import type { WorldNavItem } from "@/lib/worlds";
import type {
  WorldDestination,
  WorldNavigationState,
} from "@/lib/world-navigation";

/**
 * El raíl de destinos: los seis enlaces REALES del sistema.
 *
 * ── Por qué es cliente y no un fragmento del mapa ───────────────────────────
 *
 * Porque aquí es donde el Hero deja de saber CÓMO se viaja.
 *
 * Los elementos siguen siendo `<a href>` de verdad —sin JavaScript el raíl
 * navega igual, que es lo que exige la regla 7— pero cuando hay JavaScript el
 * clic pasa por `navigateToWorld`. Hoy esa función hace `router.push`; en la
 * fase del viaje continuo hará `scrollTo("#miller")` y el store de progreso
 * moverá la cámara. **Ese cambio no tocará este archivo.**
 *
 * Es la diferencia entre poder implementar el viaje continuo y tener que
 * reconstruir el Hero para implementarlo.
 */
export function NavRail({
  worlds,
  activeWorldId,
  hoveredWorldId,
  navigationState,
  onPointerAcquire,
  onPointerRelease,
  onFocusAcquire,
  onFocusRelease,
  onActivate,
}: {
  worlds: readonly WorldNavItem[];
  activeWorldId: WorldId | null;
  /* El modo sencillo no enciende el raíl (ver `lib/map-hover.ts`), pero la
     entrada apuntada sí se marca: sin eso, apuntar un nombre de la lista no
     tendría ninguna respuesta y el raíl dejaría de parecer pulsable. */
  hoveredWorldId: WorldId | null;
  navigationState: WorldNavigationState;
  /* Soltar lleva el id, no `null`: quien deja un destino sólo puede apagar ESE
     destino. Ver la nota de `release` en system-map.tsx — el orden de
     enter/leave entre dos blancos que se tocan no está garantizado. */
  onPointerAcquire(id: WorldId): void;
  onPointerRelease(id: WorldId): void;
  onFocusAcquire(id: WorldId): void;
  onFocusRelease(id: WorldId): void;
  onActivate(
    event: ReactMouseEvent<HTMLAnchorElement>,
    destination: WorldDestination,
  ): void;
}) {
  return (
    <ul className="nav-rail">
      {worlds.map((world) => {
        const itemState =
          world.id === activeWorldId ? navigationState : "idle";

        return (
          <li
            key={world.id}
            className="nav-rail__item"
            data-map-hover={world.id === hoveredWorldId ? "true" : undefined}
            data-target-state={itemState}
          >
            <Link
              className="nav-rail__link"
              href={world.href}
              // Sin precarga por viewport: en la home los seis están siempre
              // a la vista y pedirlos al abrir competía con la escena. El
              // mapa precarga el apuntado (`lib/world-prefetch.ts`).
             
              data-active={itemState !== "idle" ? "true" : undefined}
              data-rail-world={world.id}
              data-target-state={itemState}
              onPointerEnter={() => onPointerAcquire(world.id)}
              onPointerLeave={() => onPointerRelease(world.id)}
              onPointerCancel={() => onPointerRelease(world.id)}
              onFocus={() => onFocusAcquire(world.id)}
              onBlur={() => onFocusRelease(world.id)}
              onClick={(event) =>
                onActivate(event, { id: world.id, href: world.href })
              }
            >
              <span className="nav-rail__active-marker" aria-hidden="true" />
              {/* Sin numeración. El orden narrativo sigue existiendo —lo fija
                  `worlds.data.ts` y lo recorre el tabulador— pero pintarlo delante
                  de cada destino no orientaba a nadie: seis pares de dígitos
                  compitiendo con seis nombres son doce cosas que leer para
                  elegir una. El nombre es el destino; el número era ruido. */}
              <span className="nav-rail__name">{world.shortLabel}</span>{" "}
              <span className="nav-rail__role">{world.cosmicName}</span>
              <span className="visually-hidden" aria-hidden="true">
                {world.summary}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
