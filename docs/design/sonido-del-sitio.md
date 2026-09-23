# El sonido del sitio · interacciones, ambiente y el bus común

Petición del dueño, 2026-09-22, después de aprobar el sonido de la travesía:
«revisa las demás páginas o iteraciones […] agrégale sonidos a las
interacciones que consideres serían más cinematográficas», con dos encargos
explícitos —**un sonido leve al apuntar los objetos espaciales de la portada**
y **agua en Miller, mar o gotas, también sutil**— y carta blanca para decidir
qué más lo merecía. Nota suya sobre el nivel: «tenemos una música por defecto
pero la música es muy suave, así que no hay problema si se mezcla».

Este documento manda sobre **qué suena en cada página, con qué peso, y quién
lo apaga**. No toca la travesía, que tiene el suyo
(`travesia-espaciotemporal.md`, `Segundo pase`), ni la banda sonora
(`soundtrack.md`). No cambia ninguna escena, cámara, material ni composición.

## 1 · Un solo bus, y por qué

La travesía estrenó síntesis con su propio `AudioContext`. Extender el sonido a
seis páginas con esa arquitectura serían seis hilos de audio despiertos, seis
limitadores y seis sitios donde acordarse de mirar si el visitante silenció —y
un navegador además tiene un techo de contextos por pestaña—.

`lib/audio-bus.ts` es el único. Todo cuelga de la misma cadena:

    efecto → out (nodo propio) → master (volumen) → limitador → salida

Uno para los EFECTOS, con una excepción que conviene tener presente antes de
medir nada: la **banda sonora mantiene su propio `AudioContext`**, porque lo
que reproduce es un `<audio>` con controles y volumen del visitante y no un
efecto. Son dos contextos, no uno, y en la portada el de la música es el
primero que se crea. El interruptor sigue siendo uno solo (§2); lo que no es
uno solo es el contexto.

La travesía se refactorizó encima; no cambió ni una de sus voces. Con el bus
viajan también las envolventes compartidas (`swell`, `hit`, `cut`) y la regla
que las justifica, que está escrita en su cabecera: **una rampa exponencial que
arranca en épsilon no es un hinchado, es silencio**.

## 2 · Quién lo apaga

**El control de AUDIO de la bandeja, y nadie más.** Es el principio del
interruptor único aplicado al oído: un solo mando para todo lo que suena.
`SoundtrackControl` publica su estado en `configureAudio()` y ahí se acaba la
discusión: pausar o silenciar deja el sitio entero mudo, y ocultar la pestaña
corta el bus en el acto.

El interruptor de **MOVIMIENTO no entra**. Un sonido no se mueve, y quien lo
apaga suele estar evitando mareo, no ruido. La única excepción está razonada y
es una sola: **el encendido de motores de la Ranger**, que cuelga del mismo
`data-boot` que arranca el vuelo del ventanal — ahí el motor es parte del
vuelo, no un aviso de interfaz, y con el vuelo apagado no hay nada que
encender.

**Encendido por defecto, y se ve (2026-09-22).** El dueño pidió asegurar que
música y sonido arranquen activados. Ya lo estaban en el código, pero no lo
parecía: el navegador retiene el sonido hasta el primer gesto y ese estado se
llamaba `paused`, así que el icono se pintaba apagado. Ahora es `armed`
(«Activado · suena al primer clic» en el panel) y la bandeja lo muestra como
**ON**: el estado que se enseña es la intención, no la espera. Además la
elección guardada cambia de clave (`jonas-orbit:audio-enabled` →
`jonas-orbit:audio-on`, la vieja se borra) para que un «apagado» escrito
mientras se construía el sitio no siga respondiendo por él, y un volumen
guardado de 0 —un silencio disfrazado, que no se recuerda— ya no se restaura.
El lenguaje visual ON / OFF / MUTE es el del interruptor de movimiento
(`movimiento-unificado.md`, §«El icono»).

**«Dice ON pero no suena» (2026-09-23).** Informe del dueño: al entrar la
bandeja marca ON, no se oye nada, y sólo suena al pulsar el icono. Medido en
Chromium real con las cuatro políticas de autoplay:

- En escritorio, **rueda y movimiento del puntero no son un gesto** para el
  navegador: no hay código que pueda hacerlos sonar. Leer bajando con la rueda
  deja la música en `armed` hasta el primer clic o tecla, en cualquier sitio de
  la página (no hace falta que sea el icono).
- En pantalla táctil sí había un defecto: el control sólo escuchaba
  `pointerdown` y `keydown`, y un toque activa la página en `pointerup` /
  `touchend`. **El primer toque se perdía; sonaba al segundo.** Ahora escucha
  `pointerdown`, `pointerup`, `touchend`, `keydown` y `click`, en captura sobre
  `window`, para que ningún manejador se lo trague. E2E «on a touch screen the
  first tap…»: pasa con el arreglo y falla con el build anterior.
- Blindaje: si el `<audio>` arranca pero el `AudioContext` sigue suspendido
  (sonido entrando en un grafo parado = silencio), el estado queda en `armed`
  y el siguiente gesto vuelve a intentar; antes se marcaba `playing` y el
  desbloqueo lo daba por hecho. Prueba unitaria que falla con el código viejo.

Para que el navegador del dueño suene sin clic, la vía es suya: permitir el
sonido o la reproducción automática para el sitio en la configuración del
navegador. Un visitante nuevo siempre necesitará un gesto.

## 3 · La paleta

`lib/sfx.ts`: catorce recetas y **un** renderizador. Cada receta es una lista de
voces —unas tonales, otras de ruido filtrado— con sus frecuencias y sus
envolventes, y nada más. Ningún archivo: números legibles, versionables y
comprobables sin tarjeta de sonido, cero bytes de transferencia y ninguna
licencia que justificar.

Los sonidos GRABADOS del sitio —el blip de apuntar la portada y el mar de
Miller, los dos elegidos por el dueño— viven aparte, en `lib/audio-samples.ts`
y `lib/ocean-ambience.ts`. Ver el §8: el principio de «cero bytes» era un medio
y no un fin, y un archivo no se disfraza de receta.

El criterio es el de un instrumento y no el de una aplicación: **nada suena
como una notificación**. Los mandos tienen muescas, las superficies se
despliegan, el agua gotea y los motores arrancan. Lo que se oye es lo que el
objeto haría, no un aviso de que has pulsado algo.

| Receta | Dónde | Qué es |
| --- | --- | --- |
| `proximity` | Sintonizar un canal en la Ranger | Seno corto y sin filo, afinado por canal |
| `detent` | Todo mando con estado | Muesca seca y mecánica |
| `deploy` / `stow` | Consola del Observatorio, `Reajustar` | Una superficie que se abre y se cierra |
| `sweep` | Anillo de Edmunds, visor | Dos bandas de aire que se cruzan |
| `open` / `close` | Visor de obras, capítulos de Sobre mí, fotos | Aire que sube o baja con cuerpo |
| `drop` | Documentos del archivo de Miller | Gota: el tono SUBE |
| `acquire` → `lock` → `mount` | `ACQUISITION LOCK` de Experimentos | Tres golpes ascendentes |
| `ignite` | Arranque del vuelo de la Ranger | Lo único que pasa del segundo |
| `transmit` / `reject` | Envío del formulario | Dos pulsos que suben / dos graves que bajan |
| `confirm` | Encender el audio | La única que se oye a sí misma |

**La regla de la separación.** Cada receta trae su `gap`: cuánto tiene que
pasar como mínimo entre dos disparos suyos. Sin eso, cruzar el mapa con el
ratón dispara seis veces el mismo blip en doscientos milisegundos y deja de ser
un instrumento para ser una ametralladora. El blip va a 90 ms, la gota a 260 —
en un archivo de treinta tarjetas, barrer la rejilla sonaría a lluvia— y los
tres del encendido van a **cero** a propósito, porque son una secuencia
disparada por un solo clic y no tres pulsaciones del visitante.

### El mapa ya no es un instrumento

Lo fue: `worldPitch` daba a cada destino una razón de entonación justa por su
orden narrativo, con Gargantúa una cuarta por debajo, y recorrer los seis
tocaba una escala en vez de repetir una nota. Se retiró en el **§8**, cuando el
blip sintetizado del mapa pasó a ser una grabación y dejó de haber altura que
repartir. Está en el historial y el sitio por donde volvería —`ping()` en
`system-map.tsx`— lleva la nota escrita.

Lo que sobrevive es la receta `proximity`, que nació como ese blip y se queda
en la cabina de la Ranger: un dial de radio buscando una frecuencia ES un tono
corto y afinado, y ahí quien pone la altura es el canal.

## 4 · El mar de Miller

`lib/ocean-ambience.ts`, el único sonido SOSTENIDO del sitio. Desde el **§8** es
una **grabación** de dos minutos que trajo el dueño, no una síntesis.

Lo anterior era ruido filtrado en tres capas, con los dos lavados a periodos
primos entre sí (23 y 37 s) para que el oído no encontrara el bucle, y con el
lavado barriendo su filtro además de su volumen para que la ola rompiera en vez
de sólo subir. Las dos ideas eran buenas y el resultado no le gustó, que es el
único veredicto que cuenta en un sonido: **un mar que no suena a mar no es un
mar**, por elegante que sea su construcción.

La grabación va por `<audio>` y no por `AudioBuffer` —3,8 MB descodificados son
unos 43 MB de memoria para algo que sólo hace falta según se oye— enchufada al
bus con `createMediaElementSource`, así que sigue pasando por el maestro y el
limitador y la sigue apagando el control de AUDIO.

Y **no se reproduce con `loop`**, por una razón medida: el archivo entra desde
el silencio (los dos primeros segundos suben de RMS 0,0003 a 0,009) y termina
en el cero digital (los últimos 3,4 s). Con `loop`, cada dos minutos el mar se
iría y volvería — un bache de cinco segundos, que es justo lo que delata un
archivo. Así que hay **dos elementos que se cruzan**: el que acaba se apaga
mientras el otro arranca desde el segundo 2, con cinco segundos de solape. Un
mar es estocástico y un cruce largo entre dos tramos suyos no tiene costura.

Medido: diez segundos continuos a pico 0,064 y RMS 0,0035 —una quinta parte de
RMS que el mar sintetizado que sustituye—, y el relevo forzado a mano no deja
ningún segundo por debajo del ambiente, o sea que no hay hueco. Silenciar lo
retira entero.

## 5 · Tres defectos que sólo aparecieron midiendo

**El primer sonido después de dormir se perdía.** El bus suspendía su contexto
para no gastar batería, y la primera versión lo hacía 400 ms después del último
sonido. Medido: de seis blips disparados con 620 ms entre ellos, **sólo dos
sonaron**. La causa es que `resume()` es asíncrono y `currentTime` no avanza
mientras el contexto duerme, así que una envolvente de 200 ms programada contra
el reloj congelado ya ha caducado cuando el hilo de audio vuelve. Alargar el
temporizador sólo lo hacía menos frecuente: la corrección es `WAKE_LOOKAHEAD`,
80 ms de margen **sólo cuando se despierta**. Verificado suspendiendo el
contexto a mano: el primer sonido pasa de pico 0,00000 a 0,033.

**El barrido del anillo sonaba a la mitad que todo lo demás.** 0,011 de pico
contra 0,034 del simple hover, y girar el anillo de Edmunds es un gesto mucho
mayor que apuntar algo. Dos palancas: el peso y **abrir las campanas**, porque
una Q alta sobre ruido deja pasar muy poca energía y aquí lo que se busca es
aire, no un silbido afinado. Queda en 0,028.

**El limitador no era opcional.** En el cruce de la travesía suenan a la vez el
golpe, el sub y la cola: a volumen 28 % eso mide 0,3 de pico, pero el visitante
puede subir el mando al 100 % y la suma se va por encima de 1. Recorte, que en
un grave suena a chasquido roto y no a impacto.

Calibración medida en el primer pase, pico por receta: todo el rango cabía en
un factor **2,11** (0,0223–0,0471) salvo el encendido de motores, que va a
0,120 y debe dominar. Ninguna receta muda. El blip de proximidad sale de esa
banda en el §7 y pasa a ser, a propósito, la mitad del resto.

## 6 · Verificación

Unitarios: `lib/sfx.test.ts` (ningún cero ni infinito en una rampa exponencial,
ninguna voz por encima de la unidad, ninguna receta muda, sólo los motores
pasan del segundo, separación de los que cuelgan del puntero, el blip de
proximidad es el más discreto de todos, y la escala del mapa sube con el orden
narrativo con Gargantúa una cuarta por debajo). Los 860 unitarios del
repositorio siguen pasando.

En navegador, contra el build de producción y pinchando el maestro del bus con
un `ScriptProcessor` en el hilo de audio: las quince recetas medidas una a una,
la escala del mapa, el mar de Miller a lo largo de 19 s, el silencio total al
silenciar, y las cuatro interacciones de Edmunds disparadas desde su interfaz.

E2E: 13 fallos, **todos ellos un subconjunto de los 17 que ya fallaban en HEAD**
antes de este pase. Cero fallos nuevos.

**Dos trampas de medición, las dos nuevas.** Primera: **`next start` no recoge
una reconstrucción en caliente**, así que medir contra un servidor que lleva
abierto desde antes del último `npm run build` es medir el código anterior —
pasó, y dio por buena una corrección que no estaba desplegada. Segunda: **con la
ventana de la aplicación detrás de otra, el documento no tiene foco y los
eventos `focus` no se disparan** aunque `document.activeElement` sí cambie; ahí
hay que verificar por clic y no por foco.

Su valoración sonora queda abierta.

## 7 · Segundo pase — el peso (2026-09-22)

El dueño escuchó el sitio y trajo dos cosas: **«el sonido de Miller está muy
alto, el del agua; reducir un 60 %»** y **«el sonido del hover en la portada no
me gusta: quiero algo más suave, sutil, que no se escuche mucho»**.

### El mar sonaba a plena escala, y su propio número no hacía nada

Esto no era un ajuste de gusto: era un **fallo**. `ocean-ambience.ts` abría su
sesión con `openAudio(LEVEL, 0)` —`LEVEL` = 0,09— y acto seguido la entrada
larga hacía `out.gain.linearRampToValueAtTime(1, …)`. La rampa pisaba el peso
declarado, así que el mar no sonaba al 0,09 del bus: sonaba a **uno**, once
veces lo que decía su propia documentación, y `LEVEL` era una constante muerta.

Lo que deja como regla: **un número que se declara y no se usa es peor que no
tenerlo**, porque la siguiente persona lo ajusta y no pasa nada. Y explica por
qué ninguna medición lo cazó: el mar se midió una vez y se comparó consigo
mismo. Un valor sólo está verificado cuando se ha comprobado que MOVERLO mueve
la medida.

La rampa sube ahora hasta `LEVEL`, y `LEVEL` es **0,4**: un 60 % menos de lo
que el dueño oyó, que era plena escala. Medido antes y después, en el mismo
build y con el mismo mando de volumen: pico **0,223 → 0,083** y RMS
**0,046 → 0,019**. Exactamente el 40 % pedido, y sale exacto porque el
limitador no llega a actuar —su umbral está en 0,63— así que la cadena es
lineal de punta a punta.

### El blip de la portada: tres cosas que lo hacían un aviso

Lo que molestaba no era sólo el volumen. Un oído registra como AVISO tres
rasgos, y el blip los tenía los tres:

1. **Ataque de 4 ms**, que es un clic. A 16 ms ya no hay borde de ataque, hay
   un soplo.
2. **Onda triangular**, con armónicos impares justo donde el oído es más
   sensible. El seno no tiene ninguno.
3. **Un chasquido de aire encima** —ruido de paso alto a 3-5 kHz— que era
   literalmente el «tick» de una interfaz. Queda un rastro, a poco más de un
   cuarto de lo que pesaba.

Y la altura baja una quinta (1480 → 1046 Hz de base), que es lo que lo saca de
la banda de 2-4 kHz. El peso, de 0,2 a **0,07**. Medido: pico **0,0223 →
0,012**, la mitad, y ahora es el único efecto de la paleta que suena a la mitad
que el resto — que es exactamente lo que se le pide al sonido que más veces se
oye en una visita.

Verificado en navegador contra el build de producción: un solo disparo por
apuntado (un oscilador y una capa de ruido, nada más), los seis destinos con su
altura exacta, y el mar con su nueva medida. Los 860 unitarios siguen pasando.

Su valoración sonora queda abierta.

## 8 · Tercer pase — los dos archivos del dueño (2026-09-22)

«Me sigue sin gustar el sonido del agua ni el del hover de la home page. Te
dejé una carpeta en el repo llamada `audio`, usa esos.» Dos archivos:
`hover.mp3` (0,84 s) y `miller.mp3` (2:02). Viven ahora en `public/audio/`
junto a la banda sonora, que es donde ya vivía el audio servido.

### El principio de «cero bytes» era un medio, no un fin

`sfx.ts` presume de catorce recetas sin un solo archivo, y esa frase describe
una ventaja real: números legibles, versionables y comprobables sin tarjeta de
sonido, sin licencia que justificar y sin bytes que transferir. Pero **nunca
fue el objetivo**; era la forma de no arrastrar una licencia por un pitido.
Cuando el dueño escucha dos versiones seguidas y ninguna le gusta, el que está
equivocado es el argumento, no su oído.

Así que los archivos entran, y entran **aparte**: `lib/audio-samples.ts` para
los sonidos grabados, sin disfrazarlos de receta dentro de `sfx.ts`. Un archivo
es opaco, pesa y tiene procedencia; una receta es un puñado de números. Meter
uno donde están los otros habría convertido las dos cosas en ninguna.

Lo que no cambia: los dos cuelgan del bus, pasan por el mismo maestro y el
mismo limitador, no suenan antes del primer gesto ni con la pestaña oculta, y
los apaga el control de AUDIO.

### Lo que se retira con ellos

La **escala del mapa**. `worldPitch` y sus tres pruebas desaparecen: la
grabación es la misma para los seis destinos, y estirarla por `playbackRate`
para afinarla le cambiaría también el largo. Se puede recuperar —el sitio está
señalado en `ping()`— pero no se deja código muerto esperando.

Y el **mar sintetizado** entero, con sus periodos primos. Ver §4.

### Calibración

Los dos archivos vienen bajos y muy distintos entre sí, así que el peso se
calcula, no se estima:

| | Archivo | Peso en el bus | Salida medida |
| --- | --- | --- | --- |
| `hover.mp3` | pico 0,378 · RMS 0,049 | **0,06** | pico 0,0072 |
| `miller.mp3` | pico 0,075 · RMS 0,0071 | **1,6** | pico 0,064 · RMS 0,0035 |

El peso del mar es mayor que uno y no es un error: la grabación está tan baja
que el número no dice cuánto suena, dice **cuánto hay que levantarla**. Lo que
cuenta es la medida de salida, y ahí el mar queda a una quinta parte de RMS
que el sintetizado al que sustituye (0,019).

Los dos pesos que están escritos arriba no son los primeros. La primera
calibración fue 0,15 y 4, y el dueño los oyó y pidió menos: «necesito reducir
el volumen de Miller y también del hover en la home page». Los dos bajan al
**40 %**, que es la unidad que él mismo había usado antes, y el bus es lineal
por debajo del umbral del limitador, así que bajar el peso baja la salida en
la misma proporción sin tocar nada más.

### Dos trampas de medición, y la segunda corrige a la primera

**El sitio tiene DOS `AudioContext`, y en la portada el primero es la música.**
El bus es uno solo para los efectos, pero `soundtrack.ts` mantiene el suyo
—reproduce un `<audio>` con controles y volumen propios, que no es un efecto—.
Una sonda que se engancha «al contexto» a secas coge el que primero llega a la
salida, y en `/es` ése es el de la banda sonora. Ocho disparos idénticos del
mismo blip midieron entre 0,0033 y 0,0307, y se anotó que un `ScriptProcessor`
de hilo principal dispersa sobre un transitorio: **era falso**. Lo que se movía
era la música. Con una sonda por contexto, el mismo disparo mide **0,00722 en
cuatro veces seguidas, idéntico a cinco decimales**.

**Y un limitador no es transparente por debajo de su umbral.** Reproducida la
cadena entera en un `OfflineAudioContext` —fuente → 0,06 → 0,28 → limitador—
con un golpe a −44 dB, o sea cuarenta decibelios por debajo del umbral:

| | Pico a la salida |
| --- | --- |
| Sin limitador | 0,00635 ← la aritmética exacta |
| Con limitador, asentado | **0,00722** (+1,1 dB de realce fijo) |
| Con limitador, primer medio segundo del contexto | **0,00365** |

Los tres reproducen a cinco decimales, y el tercero explica por qué el primer
blip de cada sesión sonaba flojo: el detector arranca frío y se suelta en su
`release`. La regla que queda sustituye a la anterior: **la aritmética de la
cadena predice el orden de magnitud, no el dígito; el dígito hay que medirlo
en el contexto correcto, y el primer sonido de una sesión no sirve de
muestra**.

Su valoración sonora queda abierta. Y queda una pregunta para el dueño que no
es técnica: **la procedencia y la licencia de los dos archivos**, que en este
repositorio se declaran en un `FUENTES.md` junto a las fotos.
