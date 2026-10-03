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
| `observatory-shot.mjs` | recorrido del Observatorio: diez capturas y un vídeo del gesto y los instrumentos |
| `observatory-fill.mjs` | cuánto del cuadro ocupa el espécimen y cuánto blanco satura, leído del PNG |
| `observatory-atmosfera.mjs` | cuánta atmósfera hay en el A/B/C, en niveles de sRGB: salto, jerarquía, censo de estrellas y bandeo |
| `composition.mjs` | dónde cae cada destino en pantalla, en píxeles y en % del cuadro |
| `crop.mjs` | recorta y amplía una zona de una captura |
| `stability.mjs` | mide si el disco avanza o hierve entre fotogramas |
| `disk-metrics.mjs` | área oscura e histograma de la banda del disco |
| `epoch-ripple.mjs` | ondulación de luminancia a lo largo de un ciclo de épocas del disco |
| `star-streaks.mjs` | cuánto se estiran las estrellas del fondo, por anillo de distancia al agujero |
| `body-metrics.mjs` | reparto de valores dentro del disco de un cuerpo secundario |
| `gargantua-metrics.mjs` | luminancia por anillo de la sombra, negro de verdad, recorte blanco y asimetría de la banda |
| `gargantua-ab.mjs` | A/B de Gargantúa en laboratorio y portada, con y sin halo, reloj clavado y recortes de los dos brazos; `--diag=densidad,directo,lensado` captura los modos de diagnóstico del banco y `--doppler=0` apaga el instrumento DOPPLER |
| `disk-cohesion.mjs` | si el disco se lee como una masa: familia de tono, estratos, energía fina y coherencia por región |
| `disk-silhouette.mjs` | perfil de luz columna a columna: si el brazo termina en punta o se disuelve |
| `shot-diff.mjs` | diferencia entre dos capturas, con su suelo de ruido, para probar que un refactor no cambió la imagen |
| `prepare-article-og.mjs` | la tarjeta JPG (1200 × 630) de la portada de cada entrada del blog, leída de `content/articles.data.ts`; LinkedIn no pinta WebP |
| `awards-shots.mjs` | capturas de PORTADA para los premios desde producción: ventana con GPU real (se niega con SwiftShader), escritorio a DPR 2 y a DPR 1 (la escena se dibuja a 1 px por punto: los recortes salen de éstas), teléfono a DPR 3, escena calentada, sin burbuja de audio; NO escribe `reducir-efectos`; salida FUERA del repo |
| `awards-video.mjs` | vídeo home → travesía → Proyectos → vuelta a 1920 × 1080: screencast de CDP con tiempos reales montado a 60 fps constantes con el ffmpeg de Playwright (sólo VP8/WebM, sin `pipe` ni `concat`: los JPEG van pegados en un archivo); imprime la tasa real conseguida; `--solo-montaje` reutiliza `_frames/` |
| `awards-crops.mjs` | de las tomas a DPR 1 de `awards-shots.mjs`, los tamaños de cada formulario: Awwwards 1600 × 1200 PNG (recorte sin escalar), CSS Design Awards 1068 × 646 JPG ≤ 150 KB, 16:9 a 1920 × 1080 para The FWA |
| `glsl-check.mjs` | falla si hay backticks dentro de los shaders |
| `graph-check.mjs` | no es de la escena: comprueba que el grafo de codebase-memory no tenga fantasmas ni ruido (`npm run graph:check`; ver `docs/ai/codebase-memory.md`) |

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

## El Observatorio: cuatro trampas que costaron una medida cada una

`observatory-shot.mjs` hace el recorrido y `observatory-fill.mjs` lo mide. Las
dos trampas salieron en el primer pase visual del Tesseracto y las dos dan
números que parecen buenos y no significan nada.

**El espécimen sigue animándose entre capturas.** Comparar el paso `04-zoom`
con el `06-sin-bloom` para juzgar el bloom es comparar dos poses 4D distintas,
así que la diferencia mezcla el post-proceso con la forma — la misma trampa que
`body-metrics.mjs` documenta para un cuerpo que gira. El recorrido termina con
un A/B de verdad, pasos `09` y `10`, tomado con el **interruptor global de
movimiento apagado**: congela `elapsed` sin tocar la cámara, así que las dos
capturas son el mismo fotograma con y sin halo.

**Un muestreo no acota una figura cuasiperiódica.** `--ciclo=N` reparte N
capturas por el ciclo de 18 s del trazo, y sirve para ver el ritmo; pero la
FORMA del Tesseracto la deciden tres rotaciones 4D a ritmos inconmensurables y
no se repite nunca. Doce capturas daban «media 71 %» con aire de cifra cerrada
y lo que medían era doce instantes. Para acotar de verdad —«¿toca el borde
alguna vez?»— la medida vive en `components/scene/observatory-framing.test.ts`,
que proyecta la geometría real sobre 12 000 instantes.

```bash
node tools/observatory-shot.mjs .shots/obs tesseracto http://localhost:3100
node tools/observatory-fill.mjs obs/01-limpia obs/09-ab-bloom obs/10-ab-sin-bloom
```

Y un aviso sobre qué mide cada cifra de `observatory-fill.mjs`: el **alto
ocupado** es el encuadre, y el **núcleo ≥250** es el bloom. La luz total no
sirve para juzgar un halo — bajar la fuerza del bloom un 57 % movió el total un
13 %, porque casi todo lo pone la figura, que no bloomea.

### `observatory-atmosfera.mjs`, y la unidad en la que hay que discutir

Las otras dos trampas salieron en el pase de atmósfera, y las dos producen
aserciones verdes sobre imágenes que no existen.

**Un nivel en HDR no es un nivel en pantalla.** La primera atmósfera se calibró
en radiancia lineal —«el halo por debajo de la mitad del canto más débil del
espécimen»— y sobre el papel era impecable. En la captura no había nada: pasado
por ACES y la codificación sRGB del `OutputPass`, aquel número sale a **sRGB 0,
0, 1**, y en el centro del cuadro a 0. Cerca del negro la curva ACES es plana y
comprime tres décadas de radiancia en los diez primeros valores de sRGB, así que
una cota en unidades lineales no acota la imagen: la borra. De ahí este script —
mide en niveles de sRGB sobre el PNG, que es la única unidad en la que «se ve» y
«no se ve» significan algo.

**Un contraste con signo no mide legibilidad.** La primera versión de la medida
de jerarquía 4D anunciaba «de +7.8 a −1.3»: una catástrofe. La imagen decía lo
contrario, porque contra negro un canto casi negro es INVISIBLE y contra el
campo es una línea nítida. Lo medido era el cambio de polaridad. El ojo lee el
valor absoluto; el signo sólo dice si el canto brilla o recorta.

Y una tercera, menor, sobre el bandeo: la meseta se mide **en la pendiente**. El
negro real del otro lado del halo es un tramo enorme de ceros, y la cima de
cualquier máximo suave se cuantiza plana porque su derivada es cero. Ninguna de
las dos es un anillo.

```bash
node tools/observatory-shot.mjs .shots/atmosfera tesseracto http://localhost:3100 --atmosfera
node tools/observatory-atmosfera.mjs .shots/atmosfera
```

### `--orbita` y `--movimiento`: lo que una imagen fija no puede contestar

Un cielo infinito es **rotación pura y traslación cero**, y eso son dos
comportamientos opuestos: al orbitar el campo tiene que BARRER el cuadro, y al
hacer zoom no puede moverse ni escalar. Hay que comprobar los dos, porque cada
uno solo se puede falsear — un fondo pegado a la pantalla también da cero en el
zoom.

```bash
node tools/observatory-shot.mjs .shots/orbita tesseracto http://localhost:3100 --orbita
node tools/observatory-atmosfera.mjs .shots/orbita --movimiento
```

Cada mitad se mide con la herramienta que le toca, y mezclarlas costó una falsa
alarma: la órbita por correlación —hay que averiguar cuánto se movió— y el zoom
por resta píxel a píxel, porque ahí la respuesta correcta es «nada» y una
correlación sobre un cuadro donde el espécimen ha crecido acaba siguiendo al
espécimen. Ése es el patrón que repitieron las tres medidas que fallaron:
**cualquier medida sobre una escena donde el objeto cambia de tamaño acaba
midiendo el objeto.** El contacto va en pasos de 40 px —10° de cámara— porque
con saltos grandes no queda nada que correlacionar.

Las tres capturas tienen que venir de la misma pasada con el reloj clavado:
mismo instante, misma pose, mismo cromo. Si no, la comparación de jerarquía 4D
está midiendo dos figuras distintas.

## `composition.mjs` LEE la escena, no la reimplementa

Saca las posiciones de las variables CSS `--map-x` / `--map-y` / `--map-radius`
que la propia escena escribe en cada fotograma, así que lo que imprime es
exactamente lo que dibuja el navegador. Una copia de la trigonometría de
`system-scene.ts` se desincronizaría el día que alguien tocara la pose y a partir
de ahí mentiría en silencio.

## Lighthouse local, sin Chrome instalado

`npx lighthouse` no encuentra navegador en este equipo: hay que darle el
Chromium de Playwright con `CHROME_PATH` (por ejemplo
`%LOCALAPPDATA%\ms-playwright\chromium-<build>\chrome-win64\chrome.exe`) y
pasarle `--chrome-flags="--headless=new --use-angle=swiftshader
--enable-unsafe-swiftshader"` si la ruta lleva escena. Dos cosas que el QA de
premios (2026-10-02) aprendió a golpes: con la ruta del repo (lleva un
espacio) los argumentos van entre comillas, y SwiftShader compila los shaders
en la CPU, así que el TBT de una ruta con escena sale inflado: vale para A/B
entre dos builds, no como cifra absoluta. Medianas de tres pasadas como mínimo.

## Por qué hace falta `shot.mjs` y no vale abrir la página

La mayoría de equipos de desarrollo reportan `prefers-reduced-motion`, así que
al abrir la home a mano sale el perfil plano y no hay canvas que juzgar. Y el
Chromium headless por defecto no trae GPU. El script fuerza las dos cosas.

## `glsl-check.mjs` conviene tenerlo a mano

Los shaders viven en template literals, así que un backtick en un comentario del
GLSL cierra el literal y rompe el build con un error que señala una línea de
prosa. Pasó tres veces en una sola sesión.

## `prepare-specimens.mjs`: las imágenes de los seis especímenes

Las tarjetas, la imagen del `CreativeWork` y el sitemap de imágenes de cada
espécimen del Observatorio salen de capturas REALES, no de `shot.mjs`: el
Chromium headless cae al nivel plano (GPU por software) y no enseña el
espécimen. Se capturan a 1600 × 900 con un Chromium con ventana y
`--use-gl=angle --use-angle=d3d11` contra producción, en modo OBSERVAR, con
`jonas-orbit:reducir-efectos = "false"` y los hijos de `.observatory` que no
son el canvas en `visibility: hidden`; se espera ~12 s a que la acumulación
asiente. Después:

```
node tools/prepare-specimens.mjs <carpeta-con-<id>.png>
```

deja en `public/images/experimentos/observatorio/` las copias `-1600.webp`,
`-800.webp` y `-og.jpg` que `lib/observatory-images.ts` nombra.

