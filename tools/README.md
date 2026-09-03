# tools/

Utilidades para trabajar la escena 3D. No entran en el build ni en la web: son
para juzgar el render, que es la parte del proyecto que no se puede revisar
leyendo el diff.

Todas escriben y leen en `SHOTS_DIR`, que por defecto es `.shots/` en la raíz
(ignorada por git).

## Flujo típico

```bash
npm run build
npx next start -p 3100          # puerto propio: el 3210 es del e2e, el 3000 tuyo
node tools/shot.mjs base
node tools/crop.mjs base base-disco 300 250 840 420 1.6
```

| script | para qué |
| --- | --- |
| `shot.mjs` | captura 1440×860 del hero con WebGL por software y los efectos forzados |
| `crop.mjs` | recorta y amplía una zona de una captura |
| `stability.mjs` | mide si el disco avanza o hierve entre fotogramas |
| `disk-metrics.mjs` | área oscura e histograma de la banda del disco |
| `glsl-check.mjs` | falla si hay backticks dentro de los shaders |

## Por qué hace falta `shot.mjs` y no vale abrir la página

La mayoría de equipos de desarrollo reportan `prefers-reduced-motion`, así que
al abrir la home a mano sale el perfil plano y no hay canvas que juzgar. Y el
Chromium headless por defecto no trae GPU. El script fuerza las dos cosas.

## `glsl-check.mjs` conviene tenerlo a mano

Los shaders viven en template literals, así que un backtick en un comentario del
GLSL cierra el literal y rompe el build con un error que señala una línea de
prosa. Pasó tres veces en una sola sesión.
