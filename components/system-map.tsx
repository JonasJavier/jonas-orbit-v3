import Link from "next/link";
import { projectPlacement } from "@/lib/system-map";
import type { WorldNavItem } from "@/lib/worlds";

/**
 * Los siete destinos del Sistema Gargantúa, anclados a sus cuerpos.
 *
 * ── Este DOM es un contrato, no una maqueta ────────────────────────────────
 *
 * Regla 7 del repositorio: la escena NUNCA es el contenido. Lo que se sirve
 * aquí — siete `<a href>` reales con su nombre y su resumen — es lo que ven
 * Googlebot, un lector de pantalla, un móvil sin WebGL2 y quien navega sin
 * JavaScript. La escena, cuando arranca, **no crea nada**: solo escribe
 * `--map-x` / `--map-y` sobre estos mismos nodos con la posición proyectada de
 * cada cuerpo.
 *
 * De ahí salen dos propiedades que no hay que programar aparte:
 *
 * - **G5 por construcción.** Los blancos de clic y de tabulación son enlaces,
 *   no una capa de eventos sobre el canvas. Se puede recorrer el sistema entero
 *   con Tab aunque la GPU no exista.
 * - **Degradación gratis.** Si la escena falla a mitad, los nodos se quedan
 *   donde los dejó el CSS del nivel `flat` y siguen funcionando.
 *
 * Sin escena, las posiciones las pone `projectPlacement` desde los MISMOS datos
 * orbitales: el mapa plano y el sistema 3D no pueden divergir.
 *
 * La ficha de cada destino se abre sin una línea de JavaScript — es un hijo del
 * propio enlace que se revela con `:hover` y `:focus-visible`. Un panel movido
 * por estado de React se habría caído con la escena; este no.
 */
export function SystemMap({ worlds }: { worlds: readonly WorldNavItem[] }) {
  return (
    <nav className="system-map" id="sistema" aria-label="Destinos del Sistema Gargantúa">
      <ol className="system-map__field">
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
                } as React.CSSProperties
              }
            >
              <Link
                className="system-map__body"
                href={world.href}
                data-world={world.id}
                data-system-body={world.id}
              >
                <span className="system-map__marker" aria-hidden="true" />
                {/*
                  Una palabra por destino. El nombre largo, el cósmico y el
                  número viven en la ficha, que solo aparece al enfocar: siete
                  bloques de tres líneas flotando sobre la escena la tapaban y
                  convertían un lugar en un menú de restaurante.
                */}
                <span className="system-map__label">{world.shortLabel}</span>
                {/*
                  La ficha es una ayuda VISUAL: aparece al apuntar o enfocar y
                  amplía lo que el rótulo ya dice. Va marcada como decorativa
                  porque, dentro del enlace, su texto pasaría a formar parte del
                  nombre accesible y cada destino se anunciaría con cuatro
                  frases seguidas — justo el ruido que la home se quitó de
                  encima. Quien usa lector de pantalla oye «Historia», entra, y
                  lee el resumen en su página.

                  Sigue estando en el documento, así que Googlebot lo indexa: lo
                  que cambia es a quién se le anuncia, no qué se sirve.
                */}
                <span className="system-map__ficha" aria-hidden="true">
                  <span className="system-map__ficha-eyebrow">
                    DESTINO {String(world.order).padStart(2, "0")} ·{" "}
                    {world.cosmicName}
                  </span>
                  <span className="system-map__ficha-title">{world.title}</span>
                  <span className="system-map__ficha-summary">{world.summary}</span>
                  <span className="system-map__ficha-go">Aterrizar →</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
