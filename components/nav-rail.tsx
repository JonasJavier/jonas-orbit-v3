"use client";

import Link from "next/link";
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
  navigationState,
  onPointerTargetChange,
  onFocusTargetChange,
  onActivate,
}: {
  worlds: readonly WorldNavItem[];
  activeWorldId: WorldId | null;
  navigationState: WorldNavigationState;
  onPointerTargetChange(id: WorldId | null): void;
  onFocusTargetChange(id: WorldId | null): void;
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
            data-target-state={itemState}
          >
            <Link
              className="nav-rail__link"
              href={world.href}
              data-active={itemState !== "idle" ? "true" : undefined}
              data-rail-world={world.id}
              data-target-state={itemState}
              onPointerEnter={() => onPointerTargetChange(world.id)}
              onPointerLeave={() => onPointerTargetChange(null)}
              onFocus={() => onFocusTargetChange(world.id)}
              onBlur={() => onFocusTargetChange(null)}
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
              <span className="nav-rail__name">{world.cosmicName}</span>{" "}
              <span className="nav-rail__role">{world.shortLabel}</span>
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
