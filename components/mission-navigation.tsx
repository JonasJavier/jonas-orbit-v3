import type { WorldId } from "@/content/worlds.data";
import type { WorldNavItem } from "@/lib/worlds";
import { IntentLink } from "./intent-link";

/**
 * Navegación entre los 6 mundos.
 *
 * Server component: el mundo activo llega por props desde la ruta, no de un
 * store del cliente. En F1A esto leía el progreso de scroll con Zustand y
 * centraba el elemento activo con un efecto; con rutas reales, `aria-current`
 * lo dice mejor y gratis.
 *
 * Las rutas se precargan —§7 del pivote: la travesía es sensación de viaje y
 * no una espera disfrazada— pero no al abrir la página: `IntentLink` precarga
 * el destino al apuntarlo, enfocarlo o tocarlo (`lib/world-prefetch.ts`,
 * 2026-10-02).
 */
export function MissionNavigation({
  worlds,
  activeWorldId,
  label,
}: {
  worlds: readonly WorldNavItem[];
  activeWorldId?: WorldId;
  /** Nombre accesible del `<nav>`, en el idioma de la página. */
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="mission-nav"
      data-active-world={activeWorldId ?? "home"}
    >
      <ol>
        {worlds.map((world) => {
          const active = world.id === activeWorldId;
          return (
            <li key={world.id}>
              <IntentLink
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : undefined}
                href={world.href}
                style={{ "--nav-accent": world.accent } as React.CSSProperties}
              >
                <span aria-hidden="true">
                  {String(world.order).padStart(2, "0")}
                </span>
                {world.shortLabel}
              </IntentLink>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
