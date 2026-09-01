# Favicon — Gargantúa

Marca de pestaña del sitio. Deriva de `docs/design/hero-gargantua-direction.md`:
el mismo cuerpo que domina el hero, reducido a lo que sobrevive a 16 px.

## Qué se dibuja y por qué

Tres marcas, ninguna decorativa:

1. **Sombra negra** (`#04060d`, opaca). Nunca se ilumina — misma regla que la
   escena: no se simula energía dentro del horizonte.
2. **Cara lejana del disco**, curvada por la lente gravitatoria en dos arcos,
   uno sobre la sombra y otro, más tenue, bajo ella. Los arcos quedan **abiertos
   en los costados**: cerrados formaban un anillo continuo y el icono pasaba a
   leerse como un planeta anillado.
3. **Disco de acreción de canto**, una lente gruesa al centro y en punta en los
   extremos, cruzando por delante de la sombra. Esa perspectiva plana es lo que
   separa la silueta de Saturno, que necesita una elipse en perspectiva.

Paleta del contrato visual WP0: fondo `#05070f`/`#04060d` y rango cálido
`hot white → cream → amber` (`#f2c879`). Sin cian: aquí no hay navegación.

## Archivos

| Archivo | Papel |
| --- | --- |
| `app/icon.svg` | **Fuente maestra.** Lo que sirve Next a Chrome, Firefox y Edge; nítido a cualquier densidad. Editar aquí. |
| `gargantua-16.svg` | Misma silueta con trazos engordados. Solo alimenta los cuadros de 16 y 24 px del `.ico`: a ese tamaño los arcos de la obra completa caen por debajo de un píxel y se apagan. |
| `generate.mjs` | Rasteriza ambos a `app/favicon.ico` (16/24/32/48) y `app/apple-icon.png` (180). |

`app/favicon.ico` existe para Safari —que no soporta favicons SVG— y para los
rastreadores que piden `/favicon.ico` a ciegas. `apple-icon.png` va a sangre con
las esquinas rectas porque iOS aplica su propia máscara.

## Regenerar

Tras tocar cualquiera de los dos SVG:

    node docs/design/favicon/generate.mjs

Los binarios se versionan; el script no corre en CI ni en el build.
