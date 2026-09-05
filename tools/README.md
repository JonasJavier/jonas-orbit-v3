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
| `epoch-ripple.mjs` | ondulación de luminancia a lo largo de un ciclo de épocas del disco |
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

## El disco ENVEJECE, y por eso `shot.mjs` sabe clavar el reloj

El disco de Gargantúa avanza con el tiempo, así que su aspecto es función de
cuánto lleva la pestaña abierta. Ahí se escondió durante meses el peor defecto
que ha tenido la escena: el enrollado crecía sin cota y a los quince minutos el
disco era un montón de bandas concéntricas aliaseadas. Una suite que solo mira
el primer cuadro no lo ve NUNCA.

```bash
node tools/shot.mjs t30 http://localhost:3100/es 16000 --reloj=1800
node tools/shot.mjs t30-plano http://localhost:3100/es 16000 --reloj=1800 --sin-acumular
```

`--reloj=<segundos>` clava el reloj de la escena, así que «a la media hora» es
una captura de dieciséis segundos. `--sin-acumular` apaga la acumulación
temporal: sin eso es imposible distinguir lo que dibuja el shader en UN cuadro
de lo que deposita encima el promediado de ocho muestras — y confundir las dos
cosas fue exactamente el diagnóstico equivocado que costó la primera tarde.

La matriz que se le pide a un cambio del disco es `--reloj` en 0, 60, 180, 600 y
1800, con acumulación encendida y apagada, más valores largos (3600, 21600) como
comprobación de estabilidad matemática. El criterio no es que una captura salga
bonita: es que el histograma de `disk-metrics.mjs` no se mueva entre ellas.

## El relevo de épocas no puede notarse: `epoch-ripple.mjs`

Como el enrollado está acotado por un cruce de dos copias del campo (ver la nota
larga de `gargantua-shaders.ts`), hay un ciclo de periodo EPOCH/2 y el relevo
entre copias tiene que ser invisible. `epoch-ripple.mjs` mide la excursión de
luminancia a lo largo de ese ciclo:

```bash
node tools/epoch-ripple.mjs ciclo-0 ciclo-1 ciclo-2 ciclo-3 ciclo-4
```

Da dos cifras y las dos importan. La ONDULACIÓN es cuánto se mueve el brillo
dentro del ciclo; el CIERRE es cuánto se diferencian la primera y la última fase,
que son la misma configuración media época después. Un cierre fuera del ruido de
captura significa deriva, que es peor que la ondulación. Y el ruido de captura
hay que medirlo repitiendo la MISMA fase dos veces: bajo SwiftShader sale del
orden de 0.15 %, y una ondulación de ese tamaño no existe.

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
