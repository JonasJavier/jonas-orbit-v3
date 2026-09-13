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
| `star-streaks.mjs` | cuánto se estiran las estrellas del fondo, por anillo de distancia al agujero |
| `body-metrics.mjs` | reparto de valores dentro del disco de un cuerpo secundario |
| `gargantua-metrics.mjs` | luminancia por anillo de la sombra, negro de verdad, recorte blanco y asimetría de la banda |
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

`--flat` captura el ATLAS 2D en vez de la escena: reporta reduced-motion y no
escribe el interruptor de efectos, que es exactamente lo que hace un equipo de
verdad con el movimiento reducido. `--width=` y `--height=` cambian el viewport
(240-4096 px), y los dos juntos son la única forma de juzgar el atlas en los
formatos donde se rompe — el apaisado corto y el vertical estrecho:

```bash
node tools/shot.mjs atlas-movil http://localhost:3100/es 2000 --flat --width=375 --height=812
node tools/shot.mjs atlas-corto http://localhost:3100/es 2000 --flat --width=812 --height=375
```

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

## `star-streaks.mjs` existe porque una discusión no se cerraba mirando

El dueño veía «trazos gravitacionales por toda la pantalla»; la aritmética del
lente decía que en la periferia la magnificación tangencial no llega al 15 %.
Una de las dos lecturas estaba mal y no había forma de saber cuál sin medir los
blobs del render.

Segmenta el cielo por umbral, descarta lo que no es estrella —disco, cuerpos,
HUD— y saca de cada mancha la razón entre sus ejes principales. Después las
agrupa por anillos de distancia a Gargantúa, que es la variable que importa: la
dirección de arte pide puntos fuera y estiramiento dentro.

```bash
node tools/star-streaks.mjs antes despues
```

Dos avisos que costaron un intento cada uno:

- **El umbral engaña en las dos direcciones.** Una mancha redonda que se apaga
  deja un núcleo alargado, así que un recuento de «alargadas» puede SUBIR donde
  hay menos luz. Por eso el script imprime también el brillo medio del anillo,
  que no depende de ningún umbral, y por eso TRAZO se define como alargado **y**
  largo: una mancha de tres píxeles con aspecto 2 es un punto un poco oval.
- **El HUD contamina.** Los rótulos del raíl y del lado derecho caen dentro de
  los anillos exteriores y pesan más que las estrellas. Para comparar dos
  pasadas, captura con `--sin-rotulos` o mide ventanas de cielo limpio.

## `gargantua-metrics.mjs`: la sombra, el blanco y los dos lados

Es la medida del pase visual final de Gargantúa (`docs/design/hero-gargantua-direction.md`
§14 duodecies) y de la guarda del bloom (§14 undecies), que antes se medían a
mano. Sobre una captura de 1440×860 saca cuatro cosas, todas en la geometría de
`disk-metrics.mjs` (sombra en 668,448, radio 95):

```bash
node tools/gargantua-metrics.mjs antes despues antes-noglow despues-noglow
```

- **Anillos de la sombra:** luminancia media por anillo del radio de la sombra.
  Los dos interiores dicen si el agujero es negro o gris; el de 0.8-1.0 es el
  filo; los dos exteriores no deberían moverse con un cambio de la sombra.
- **Negro de verdad:** cuánto mide, por el centro, la zona por debajo de 8, y
  qué fracción del disco de 1.25 R está ahí. Medirlo sólo sobre la captura
  `--sin-glow` dice qué hace el raymarch; con glow, qué hace la guarda.
- **Recorte blanco:** fracción de la banda del disco en ≥ 250 y ≥ 235. Es el
  número del «reflector»: el blanco puro puede existir, pero localizado.
- **Asimetría:** luminancia media a izquierda y derecha del centro dentro de la
  banda, y su razón. Es la lectura tone-mapped del beaming, que es la que ve
  el ojo, no el exponente del shader.

Dos avisos. La banda incluye cielo y el centro de la sombra queda excluido, así
que los absolutos importan poco: lo que vale es la diferencia entre capturas
de la MISMA fase (`--reloj`). Y el HUD contamina la banda igual que a
`star-streaks.mjs`: captura con `--sin-rotulos`.

## `body-metrics.mjs`, y la trampa de medir un cuerpo que gira

`disk-metrics.mjs` mide la banda de Gargantúa y `star-streaks.mjs` el cielo;
faltaba lo mismo para los cinco destinos secundarios, que es donde vive todo el
trabajo de `docs/design/world-visual-language.md`. Recorta el círculo del cuerpo
—centro y radio te los da `composition.mjs`— y saca media, percentiles, croma
medio y qué fracción del disco está en penumbra o compite con el reflejo.

```bash
node tools/composition.mjs
node tools/body-metrics.mjs --centro=429.8,222.6 --radio=46.6 antes despues
```

El par que importa casi siempre es **media contra p99.5**: bajar la media
subiendo el pico es «repartir el valor», que es el movimiento que pide la fase 1
del contrato visual; bajar las dos es simplemente apagar el cuerpo, y no es lo
mismo. El **croma** distingue un mundo que se fue al color de uno que se fue al
valor.

`--difiere a b` compara dos capturas píxel a píxel dentro del disco. **Sobre un
cuerpo que gira sobre su eje no mide la animación del material**, y esto costó
dos pasadas: con todo el oleaje de Miller congelado, la diferencia entre el
segundo 4 y el 10 seguía siendo 11.7 de media y el 46 % del disco, porque la
rotación rígida cambia todos los píxeles. Para aislar lo que decide el material,
compara dos renders **del mismo instante** que difieran sólo en el término que
investigas.

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
