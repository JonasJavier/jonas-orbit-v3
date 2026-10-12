# miller-ocean-webgl2 — notas del borrador (2026-10-12)

Tema #2 de la cola (`docs/presencia-web.md` §5). Habla del agua de la
cabecera de Formación (`components/miller-ocean.tsx`), no del planeta del
Observatorio: el planeta sólo se enlaza al final como «otro océano con su
propio shader» (`content/es/worlds/miller.mdx`).

## Datos de la entrada

| Campo | ES | EN |
| --- | --- | --- |
| slug | `oceano-de-miller-agua-en-webgl2` | `miller-ocean-webgl2-water-shader` |
| title | 68 car. | 55 car. |
| summary (≤ 220) | 195 | 196 |
| seoTitle (≤ 60) | 52 | 52 |
| seoDescription (110–160) | 157 | 160 |
| palabras (prosa / con código) | 1499 / 1700 | 1395 / 1596 |
| secciones `##` | 9 | 9 |

Medido con `yaml.parse` del front matter y conteo de palabras sin y con los
bloques de código (script en la sesión).

Para `content/articles.data.ts` al publicar: `topic: "webgl"`, `images:
"/images/articulos/oceano-miller"`, `cover: "oceano-miller-portada"`,
`specimen: "miller"`.

## Figuras que faltan (martes)

La entrada no lleva figuras dentro del cuerpo; sólo necesita la portada.

- **Portada:** `oceano-miller-portada-800.webp` y `-1600.webp`. Lo más
  sencillo y honesto: derivarla de `public/images/miller/ocean.webp`
  (1672 × 941, es la imagen que se refracta). Una captura con GPU real de
  `/es/formacion` en marcha sería mejor pero, quieta, es casi la misma
  imagen.

## Cifras y de dónde salen

| Cifra / afirmación | Fuente |
| --- | --- |
| Canvas 2D anterior: filas de 3 px, fase sólo de la profundidad, «gelatina»; veredicto del dueño | `docs/design/miller-formacion.md` §«Océano en WebGL2…» (2026-09-12); registro «Página de Miller — océano en WebGL2…» |
| WebGL2 propio, un triángulo, una textura, cielo intacto con `d ≤ 0`, sin dependencias | `components/miller-ocean.tsx` (código copiado tal cual) |
| Horizonte al 24 % (`HORIZON = 0.24`), `z = 1/(0.9·d + 0.1)`, tres trenes + rizo, velocidad `∝ 1/√k` | `components/miller-ocean.tsx`; `miller-formacion.md` |
| `smoothstep(0, 0.16, d)` y `d^1.5`; luz desde la derecha, Blinn, chispas sólo sobre espuma | mismo código y documento |
| ~70 px/s junto al borde inferior a 600 px de agua | comentario de `SPEED` en el código; `miller-formacion.md` |
| Playwright a 1440 px, 3 capturas a 0,5 s: 12–13 % de píxeles, diferencia media 5,5, cielo 0,005; tira de 6 fotogramas a 0,2 s | `miller-formacion.md` §«Océano en WebGL2…» |
| `ocean-movil.webp` 53 KB frente a 195; precarga por `media` | comentario en `miller-ocean.tsx`; registro «Rendimiento móvil — PageSpeed…» |
| ~200 ms del contexto y shaders sin GPU; espera a `after-load-idle` (`requestIdleCallback`, tope 2 s) | registro «Rendimiento móvil…»; `lib/after-load-idle.ts` |
| ~380 ms al llegar a Contacto; 378 → 80–250 ms; `KHR_parallel_shader_compile` | registro «Navegación con red lenta…» (2026-10-07) §«El frisado»; `lib/webgl-program.ts` (código copiado tal cual) |
| 30 fps, IntersectionObserver, `visibilitychange`, DPR ≤ 1,5, tope 2048 px | `components/miller-ocean.tsx` |
| Escena persistente dormida: nunca dos contextos dibujando | registro «Página de Miller…»; `miller-formacion.md` |
| Sigue el interruptor único de movimiento, sin botón propio | `components/miller-water.tsx` (el documento de diseño aún habla de «consentimiento y pausa en MillerWater»: el código manda) |
| Sin WebGL2 o contexto perdido: sin canvas ni control; se suelta el contexto | `miller-formacion.md`; `lib/webgl-release.ts` |
| e2e cuenta `drawArrays`: dibuja, se para apagado, fuera de pantalla, en segundo plano | `e2e/miller.spec.ts` (test «el océano pausa, reanuda y deja de dibujar…») |
| LCP de Formación sin moverse (3,65 ↔ 3,83 s) | registro «Rendimiento móvil…», primer pase |

«Lo que no está resuelto»: que el oleaje del shader no sigue las olas de la
imagen es una observación del propio código (el campo no lee la textura),
no una medición.

## Enlaces internos (existen)

- `/es/formacion`, `/en/education` — `WorldId` `miller`.
- `/es/experimentos/observatorio/miller`, `/en/experiments/observatory/miller`
  — `PATH_SEGMENTS.observatory`.
- `/es/contacto/servicios`, `/en/contact/services` — `servicesPath`.

## Para Jonás

- **La imagen es generada** (ImageGen, según `miller-formacion.md` §«Asset
  original»), no una foto tuya. El texto dice «imagen» en todo momento y
  nunca «mi fotografía». ¿Quieres decirlo explícitamente en la entrada?
- La frase del veredicto («no se ve bien el movimiento») es tuya, del
  registro. Si prefieres no citarte, se quita.
