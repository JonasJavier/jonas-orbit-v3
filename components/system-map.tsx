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
                  // Orden narrativo, para escalonar la aparición. Los siete
                  // destinos no tienen por qué encenderse a la vez: hacerlo en
                  // secuencia convierte la llegada en una puesta en marcha.
                  "--order": world.order,
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
                <span className="system-map__label">
                  {world.shortLabel}
                  {/*
                    Al enfocar, un solo dato más: el nombre cósmico del cuerpo.

                    Antes se abría una tarjeta con eyebrow, título largo, resumen
                    y un «Aterrizar →». Cuatro elementos por destino, siete
                    destinos: la escena acababa siendo el fondo de una interfaz.
                    El rótulo ya dice a dónde vas; lo único que añade valor al
                    apuntar es qué cuerpo estás mirando. Todo lo demás está a un
                    clic, en su página.

                    Va DENTRO del rótulo y fuera de flujo: así se ancla al ras de
                    la palabra en vez de al borde del relleno invisible del
                    enlace, que es mucho más grande. Al estar fuera de flujo no
                    ensancha la caja y `offsetWidth` sigue midiendo sólo el
                    nombre, que es lo que la separación necesita saber.
                  */}
                  <span className="system-map__cosmic" aria-hidden="true">
                    {world.cosmicName}
                  </span>
                </span>
                {/*
                  El resumen se queda en el documento pero no en pantalla: lo
                  indexa Googlebot y no ensucia la escena. Va oculto también para
                  el lector de pantalla porque, dentro del enlace, su texto
                  entraría en el nombre accesible y cada destino se anunciaría
                  con una frase entera de más.
                */}
                <span className="visually-hidden" aria-hidden="true">
                  {world.summary}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
