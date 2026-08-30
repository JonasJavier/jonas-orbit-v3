"use client";

import Link from "next/link";
import type { WorldNavItem } from "@/lib/worlds";
import { useWorldNavigation } from "@/lib/world-navigation";

/**
 * El raíl de destinos: los siete enlaces REALES del sistema.
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
export function NavRail({ worlds }: { worlds: readonly WorldNavItem[] }) {
  const navigate = useWorldNavigation();

  return (
    <ul className="nav-rail">
      {worlds.map((world) => (
        <li
          key={world.id}
          className="nav-rail__item"
          style={{ "--world-accent": world.accent } as React.CSSProperties}
        >
          <Link
            className="nav-rail__link"
            href={world.href}
            data-rail-world={world.id}
            onClick={(event) => {
              // Se respetan los gestos del navegador: abrir en pestaña nueva,
              // en ventana, o descargar. Sólo se intercepta el clic simple.
              if (
                event.defaultPrevented ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return;
              }
              event.preventDefault();
              navigate({ id: world.id, href: world.href });
            }}
          >
            {/* El número orienta la vista pero no entra en el nombre accesible:
                dentro convertiría cada destino en «cero tres Miller Desarrollo». */}
            <span className="nav-rail__index" aria-hidden="true">
              {String(world.order).padStart(2, "0")}
            </span>
            <span className="nav-rail__name">{world.cosmicName}</span>{" "}
            <span className="nav-rail__role">{world.shortLabel}</span>
            <span className="visually-hidden" aria-hidden="true">
              {world.summary}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
