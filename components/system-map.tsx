import Link from "next/link";
import { projectPlacement } from "@/lib/system-map";
import { NavRail } from "./nav-rail";
import type { WorldNavItem } from "@/lib/worlds";

/**
 * Los siete destinos del Sistema Gargantúa.
 *
 * ── Un solo juego de enlaces, dos presentaciones ────────────────────────────
 *
 * Este componente dibuja los destinos DOS veces, y sólo una de ellas cuenta
 * para la accesibilidad:
 *
 * 1. **El raíl inferior** lleva los siete `<a href>` REALES. Es lo que recorre
 *    el teclado en orden 01→07, lo que indexa Googlebot y lo que sigue
 *    funcionando sin una línea de JavaScript.
 * 2. **Los rótulos anclados a los cuerpos** son un eco visual: `aria-hidden` y
 *    fuera del orden de tabulación.
 *
 * La alternativa —los dos juegos como enlaces reales— anunciaba CATORCE
 * destinos para siete mundos, y obligaba a recorrer con el teclado unas
 * etiquetas repartidas por toda la pantalla en un orden que dependía de dónde
 * estuviera cada cuerpo. El raíl es estrictamente mejor: una fila ordenada,
 * siempre visible, que además da usabilidad a los mundos que en la composición
 * 3D quedan pequeños o lejanos a propósito.
 *
 * La escena, cuando arranca, **no crea nada**: sólo escribe `--map-x` /
 * `--map-y` sobre los ecos.
 */
export function SystemMap({ worlds }: { worlds: readonly WorldNavItem[] }) {
  return (
    <nav className="system-map" id="sistema" aria-label="Destinos del Sistema Gargantúa">
      {/*
        Eco visual. `aria-hidden` en el contenedor entero: lo que hay dentro son
        enlaces de verdad —para que pulsar un planeta funcione también sin
        JavaScript— pero no se anuncian ni se tabulan, porque el raíl ya los
        ofrece una vez.
      */}
      <ol className="system-map__field" aria-hidden="true">
        {worlds.map((world) => {
          const point = projectPlacement(world.placement);
          const isCentre = world.placement.orbitRadius === 0;

          return (
            <li
              key={world.id}
              className="system-map__slot"
              data-centre={isCentre ? "true" : undefined}
              style={
                {
                  "--map-x": `${point.x.toFixed(2)}%`,
                  "--map-y": `${point.y.toFixed(2)}%`,
                  "--world-accent": world.accent,
                  "--world-secondary": world.secondary,
                  "--order": world.order,
                } as React.CSSProperties
              }
            >
              <Link
                className="system-map__body"
                href={world.href}
                tabIndex={-1}
                data-world={world.id}
                data-system-body={world.id}
              >
                <span className="system-map__marker" />
                <span className="system-map__label">
                  <span className="system-map__name">{world.cosmicName}</span>{" "}
                  {/*
                    Divulgación progresiva: en reposo sólo se ve el nombre del
                    cuerpo. El índice y la función aparecen al apuntarlo, y el
                    detalle completo vive en el NAV TARGET del HUD. Siete
                    bloques de dos líneas permanentes eran la última cosa que
                    seguía haciendo que esto pareciera un diagrama.
                  */}
                  <span className="system-map__role">
                    {String(world.order).padStart(2, "0")}{" // "}{world.shortLabel}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* El raíl: los siete destinos reales, en orden narrativo. */}
      <NavRail worlds={worlds} />
    </nav>
  );
}
