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
| `composition.mjs` | dónde cae cada destino en pantalla, en píxeles y en % del cuadro |
| `crop.mjs` | recorta y amplía una zona de una captura |
| `stability.mjs` | mide si el disco avanza o hierve entre fotogramas |
| `disk-metrics.mjs` | área oscura e histograma de la banda del disco |
| `glsl-check.mjs` | falla si hay backticks dentro de los shaders |

## Las dos pruebas del contrato visual

`docs/design/world-visual-language.md` pide juzgar cada cuerpo sin sus dos
muletas. Las dos son banderas de `shot.mjs`:

```bash
node tools/shot.mjs mundo --sin-glow --sin-rotulos
```

`--sin-glow` pone a cero el bloom y los emisivos de los cuerpos (ver
`lib/visual-bench.ts`): si un objeto pierde su identidad ahí, su diseño no está
terminado. `--sin-rotulos` oculta el raíl y los nombres, que es la única forma de
comprobar si un cuerpo se reconoce sin que se lo digan.

## `composition.mjs` LEE la escena, no la reimplementa

Saca las posiciones de las variables CSS `--map-x` / `--map-y` / `--map-radius`
que la propia escena escribe en cada fotograma, así que lo que imprime es
exactamente lo que dibuja el navegador. Una copia de la trigonometría de
`system-scene.ts` se desincronizaría el día que alguien tocara la pose y a partir
de ahí mentiría en silencio.

## Por qué hace falta `shot.mjs` y no vale abrir la página

La mayoría de equipos de desarrollo reportan `prefers-reduced-motion`, así que
al abrir la home a mano sale el perfil plano y no hay canvas que juzgar. Y el
Chromium headless por defecto no trae GPU. El script fuerza las dos cosas.

## `glsl-check.mjs` conviene tenerlo a mano

Los shaders viven en template literals, así que un backtick en un comentario del
GLSL cierra el literal y rompe el build con un error que señala una línea de
prosa. Pasó tres veces en una sola sesión.
