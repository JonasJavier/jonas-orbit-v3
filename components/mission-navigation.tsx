import Link from "next/link";
import type { WorldId } from "@/content/worlds.data";
import type { WorldNavItem } from "@/lib/worlds";

/**
 * Navegación entre los 6 mundos.
 *
 * Server component sin una línea de JavaScript: el mundo activo llega por
 * props desde la ruta, no de un store del cliente. En F1A esto leía el progreso
 * de scroll con Zustand y centraba el elemento activo con un efecto; con rutas
 * reales, `aria-current` lo dice mejor y gratis.
 *
 * Cada destino nombra primero el CONTENIDO —que es lo que el visitante busca—
 * y debajo, en la letra pequeña del instrumento, su índice y su cuerpo:
 * «02 · Miller». La línea inferior va `aria-hidden` a propósito: el nombre
 * accesible del enlace sigue siendo «Formación», igual que en el raíl.
 *
 * `<Link>` prefetchea las 7 rutas estáticas, que es lo que §7 del pivote exige
 * para que la transición de viaje de G3 sea sensación de viaje y no una espera
 * disfrazada.
 */
export function MissionNavigation({
  worlds,
  activeWorldId,
}: {
  worlds: readonly WorldNavItem[];
  activeWorldId?: WorldId;
}) {
  return (
    <nav
      aria-label="Navegación de mundos"
      className="mission-nav"
      data-active-world={activeWorldId ?? "home"}
    >
      <ol>
        {worlds.map((world) => {
          const active = world.id === activeWorldId;
          return (
            <li key={world.id}>
              <Link
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : undefined}
                href={world.href}
                style={{ "--nav-accent": world.accent } as React.CSSProperties}
              >
                <span className="mission-nav__name">{world.shortLabel}</span>
                <span className="mission-nav__meta" aria-hidden="true">
                  {String(world.order).padStart(2, "0")} · {world.cosmicName}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
