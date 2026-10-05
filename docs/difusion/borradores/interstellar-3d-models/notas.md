# interstellar-3d-models — notas del borrador (2026-10-05)

Entrada-hub #1 de la cola (`docs/presencia-web.md` §5): un recorrido por los
seis especímenes con enlace a cada uno. Registro «SEO — frases del nicho 3D…»
(10-04): las entradas del blog SÍ pueden llevar «Interstellar» en el título
(precedente: la de la física de Gargantúa); las páginas del sitio no.

## Datos de la entrada

| Campo | ES | EN |
| --- | --- | --- |
| slug | `modelos-3d-de-interstellar-en-el-navegador` | `interstellar-3d-models-in-the-browser` |
| title | 76 car. | 72 car. |
| summary (≤ 220) | 202 | 190 |
| seoTitle (≤ 60) | 54 | 58 |
| seoDescription (110–160) | 147 | 146 |
| palabras / secciones `##` | 1685 / 10 | 1613 / 10 |

Longitudes medidas con `yaml.parse` del front matter (comando en la sesión).

Para `content/articles.data.ts` al publicar: `topic: "webgl"`, `images:
"/images/articulos/modelos-3d"`, `cover: "modelos-3d-portada"`. Sin
`specimen` (habla de los seis).

## Cifras y de dónde salen

| Cifra / afirmación | Fuente |
| --- | --- |
| Ni una `THREE.Light`; única fuente el disco; clave `vec3(1.0, 0.78, 0.52)`, relleno, contraluz frío, terminador `smoothstep` | `docs/design/world-visual-language.md` §3 |
| Bloom-off test: silueta, volumen, jerarquía, material, legibilidad | mismo documento §5 |
| 190 pasos (normal) / 340 (profundo) | `content/*/articles/gargantua-webgl.mdx` §«Steps that follow the curve» |
| Cuatro vistas (Cinematográfica, Lente, Disco, Sombra), acumulación en ocho posiciones de Halton, no se baja de 9°, órbita libre en los cinco sólidos | `docs/design/tesseract-experimentos.md` §7 |
| Endurance: doce módulos en cuatro grupos, cuatro draws, pluma en el emisivo sin draw, propulsores al borde del aro, «mancha brillante», cavidades | `content/*/worlds/endurance.mdx` → `observatory.registro` |
| Endurance blanca (manta 0.88), 24 ventanas (tres por módulo habitado, bodegas sin), cálidas, fijas, tenues (1.35 contra 1.65-1.7 de las balizas), «luz de interior, no señal» | registro «Rediseño de Ranger, Endurance y Miller…» (10-04) |
| Ranger: casco loftado de nueve estaciones, más ancho (0.52 vs 0.37) y más plano (0.17 vs 0.28), vientre más plano que el lomo, crema → metal cañón, clave a 153° | mismo registro (10-04) |
| Reflexión de entorno analítica: anillo ámbar ceñido al plano orbital, sin cubemap ni textura | registro «Render de cine…» (10-04) |
| MSAA 4x sólo con GPU real; SwiftShader no | registro «Render de cine…» (10-04) |
| Juzgar los cuerpos sólo con GPU real (`awards-shots.mjs`), `shot.mjs` no sirve | registro «Cuerpos del System Map — pase de realismo…» (10-04) |
| Miller: cuatro revisiones hacia lo oscuro, «piedra azul», «océano no es exposición, es comportamiento», tres escalas de oleaje con gradiente analítico, 0,05 rad/s = 2,35 px/s en el ecuador (47 px), olas a 0,5–2,5 px/s, regla de 4–6× | `world-visual-language.md` §9 quinquies |
| Edmunds: `smoothstep` de 0,05–0,065 sobre fbm de cuatro octavas con ±0,15 de rizado (×3 la puerta), tres ondas direccionales de baja frecuencia, fbm sólo como perturbación de frontera, «un terreno pintado y otro iluminado» | `world-visual-language.md` §9 sexies |
| Teseracto: 16 vértices, cuatro planos, 32 aristas, circuito euleriano, cuatro draws y un material; legibilidad por jerarquía (celda lejana más fina y tenue) | `content/*/worlds/tesseract.mdx` → `observatory.registro` |
| Observar / Estudio; mirar y medir son dos actividades | `tesseract-experimentos.md` §V2 |
| Arrastre / Luz / Figura (EJE) y qué cambia cada uno | `tesseract-experimentos.md` §V6; etiquetas en `components/observatory-viewer.tsx` («Luz»/«Light», «Figura»/«Figure», «Estudio»/«Study») |

**Deliberadamente fuera:** el «aluminio marfil apagado» del registro de la
Endurance (lo sustituyó el blanco del 10-04 — ojo: ese `registro` en
`content/*/worlds/endurance.mdx` sigue diciendo «Muted ivory aluminum» y es voz
de Jonás; decide él si lo actualiza). Nada de la física de Gargantúa (ya está en
su entrada). Sin clientes ni precios.

## Enlaces internos (todos existen hoy)

ES: `/es/experimentos`, `/es/experimentos/observatorio/{gargantua,endurance,ranger,miller,edmunds,tesseracto}`,
`/es/blog/como-hice-un-agujero-negro-en-webgl`, `/es/blog/la-fisica-del-agujero-negro-de-interstellar`,
`/es/blog/teseracto-4d-en-three-js`, `/es/blog/portafolio-3d-webgl-seo-y-rendimiento`, `/es/contacto/servicios`.

EN: `/en/experiments`, `/en/experiments/observatory/{gargantua,endurance,ranger,miller,edmunds,tesseract}`,
`/en/blog/how-i-built-a-black-hole-in-webgl`, `/en/blog/interstellar-black-hole-gargantua-explained`,
`/en/blog/4d-tesseract-in-three-js`, `/en/blog/3d-portfolio-webgl-seo-and-performance`, `/en/contact/services`.

Rutas construidas con `lib/page-paths.ts` + `lib/observatory-slugs.ts`
(«tesseracto» en ES). Comprobar 200 en producción el martes antes de publicar.

## Figuras que faltan (capturar con GPU real, `tools/README.md`)

Carpeta `public/images/articulos/modelos-3d/`, cada una en `-800.webp` y
`-1600.webp` (+ `-og.jpg` de la portada):

1. `modelos-3d-portada` — la home de escritorio con los seis cuerpos.
2. `modelos-3d-naves` — Endurance y Ranger en el Observatorio (modo Observar),
   juntas en una composición de dos paneles.
3. `modelos-3d-planetas` — Miller y Edmunds, igual.

**Importante:** las capturas actuales de los especímenes
(`public/images/experimentos/observatorio/*`, 10-02) son ANTERIORES al rediseño
del 10-04 de Ranger, Endurance y Miller: no valen para estas figuras (y
convendría rehacerlas también para `og:image`). Si el martes no se pueden
capturar con GPU real, la entrada se aplaza una semana (§5 de la rutina).

## Dudas para Jonás

- ¿«La Ranger acaba de cambiar de forma» te vale, o prefieres contar el
  porqué del rediseño con tus palabras («casi no se nota el cambio…»)?
- La sección «Lo que no está resuelto» habla de la órbita libre y del render
  por software. ¿Prefieres otra cosa (p. ej. que Miller y Edmunds aún no
  tienen su registro en el Observatorio)?
