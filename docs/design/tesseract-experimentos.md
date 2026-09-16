# Tesseracto — Experimentos y el Observatorio

2026-09-16 · Documento de arquitectura para `/es/experimentos` y la experiencia
dedicada que cuelga de ella. Pedido por Jonás tras dos rondas de concepto y una
revisión cruzada. **Es un documento para aprobar antes de escribir código.**

Sustituye al panel `Experimento activo` de `content/es/worlds/tesseract.mdx`,
que era un marcador («se documentarán aquí en F1B»), y da a `tesseract` la
misma categoría de página propia que ya tienen Miller, Edmunds, la Ranger y
Gargantúa. No sustituye a ningún otro documento: la arquitectura narrativa, el
contrato de cámara del System Map, el lenguaje visual de los cuerpos y el
interruptor único de movimiento siguen intactos y mandan donde siempre.

> **Principio del Observatorio, y criterio para aceptar o rechazar cualquier
> decisión de esta página:**
>
> No estamos mostrando los objetos más grandes. Estamos dando al visitante
> instrumentos para estudiarlos.

---

## 0. Qué se verificó antes de escribir esto

Tres afirmaciones que circularon durante el diseño, comprobadas contra el
repositorio. Dos cambiaron el plan.

**`tesseract` → Experimentos ya es canónico.** No hace falta pivote. Lo fijó
`docs/design/arquitectura-narrativa.md` el 2026-09-06 (`| 5 | tesseract |
Tesseracto | Experimentos | /es/experimentos |`), revocando explícitamente el
mapeo anterior, y está en el contenido: `content/es/worlds/tesseract.mdx` lleva
`slug: experimentos`, `title: Experimentos` desde entonces. `/es/sobre-mi` es
`gargantua`. Este documento **no abre** ninguna decisión narrativa; se limita a
construir sobre la que ya existe.

**Gargantúa acumula temporalmente, y eso decide su interacción.**
`components/scene/system-scene.ts:147` → `TEMPORAL_BLEND = 0.18` sobre ocho
posiciones de Halton(2,3) y dos render targets `tHistory` en ping-pong. El
comentario de cabecera es explícito: «El raymarch se acumula en el tiempo porque
la cámara es fija y el píxel de ayer es el mismo píxel de hoy». Con 0.18, el
82 % de cada fotograma viene del historial. Una cámara en órbita libre lo
invalida. Ver §7.

**Los conteos de la Endurance sólo existen en un sitio, y no es un texto.**
`bodies.ts:3412` publica `userData.enduranceArchitecture` y
`bodies.test.ts:190` lo asserta entero. Durante esta misma conversación alguien
escribió «8 radiadores» de memoria; el modelo dice 4. Ver §8: **ninguna lectura
del HUD se teclea.**

**`COVERED_WORLDS` NO libera el contexto WebGL. Sólo detiene el bucle.** Éste es
el hallazgo que corrige una afirmación falsa de la primera versión de este
documento, y la enmienda que lo pidió tenía razón. Ver §3 y §11.

**Cuatro mecanismos que ya existen y que el Observatorio no tiene que
inventar:** `uEmission` como único punto de estrangulamiento de la emisión
(§6); `resetAccumulation()` como reinicio de historial a coste cero (§7);
`SPIN_RATE` como tabla de giro por cuerpo (§3); y el conteo de dibujos por
canvas dueño como patrón de test (§12). Tres cosas que **no** existen y hay que
presupuestar: liberación del contexto por ruta, alambre/normales, y parámetros
de cámara en `tools/shot.mjs`.

---

## 1. La arquitectura: dos niveles

### El problema

Las cuatro maquetas de concepto compartían el mismo fallo en distinta dosis: el
visor 3D encajonado entre una barra lateral y una ficha, o dentro de una mitad
de una pantalla partida. El objeto acababa ocupando *menos* pantalla que en el
System Map, y entonces la tesis de la página se cae sola.

Es la misma lección que ya costó una entrega en Edmunds: la cubierta de
observación no funcionó hasta que ocupó **un viewport ella sola**.

### La decisión

Dos rutas. El Observatorio no es una sección de una página: es un sitio al que
se entra.

| Ruta | Qué es | WebGL |
| --- | --- | --- |
| `/es/experimentos` | Recepción del laboratorio. Editorial, rápida. | **Ninguno propio**; el persistente no dibuja |
| `/es/experimentos/observatorio/[objeto]` | El laboratorio. Un espécimen, pantalla completa. | Contexto propio; el persistente **liberado** |

**La garantía de la recepción, medida y no idealizada.** La primera versión de
este documento decía «cero WebGL, cero `three`». Verificado: es falso y
arreglarlo sería caro sin que nadie lo note. `GargantuaSystem` se monta en
`app/[locale]/layout.tsx:61` para **todas** las rutas del locale, y su efecto
—con dependencias `[bodies, level]`— hace `import("./system-scene")` una vez, sin
volver a ejecutarse al cambiar de ruta. En un equipo capaz, `three` ya está
cargado y el contexto ya existe cuando llegas a la recepción, igual que cuando
llegas a Miller o a Sobre mí. El comentario del código siempre lo dijo bien:
«three.js entero jamás entra en la **carga inicial** de ninguna ruta» — habla del
import dinámico, no de un aislamiento por ruta. Volví a leer de más.

Conseguir «cero `three` en la recepción» exigiría desmontar `GargantuaSystem`
por ruta, que es el mismo mecanismo caro del Observatorio, aplicado a una página
que no lo necesita y que ninguna otra del sitio tiene. No se hace. La garantía
pasa a ser la barata y verdadera:

> **La recepción no crea un contexto WebGL propio y la escena persistente no
> dibuja en ella.**

Lo obligatorio —y lo que sí cuesta construir— es lo otro: **dentro del
Observatorio no se retiene el contexto pesado del System Map.** Ahí la pureza no
es estética, es la VRAM que le falta a un equipo modesto para montar el segundo
contexto (§3).

Por qué esto y no una página larga:

1. **El visor se queda con la pantalla entera, siempre.** No hay nada que
   negociar con el resto de la página porque no hay resto de la página.
2. **El WebGL pesado sólo se monta cuando el visitante lo pide.** El
   presupuesto de JS se resuelve por arquitectura, no por trucos. La recepción
   es genuinamente ligera: no hay nada que un auditor pueda oler porque no hay
   nada escondido (regla 5).
3. **Cada espécimen tiene URL propia, compartible y con historial.** Para un
   portafolio eso importa: se puede enlazar «mira la Endurance» en una
   candidatura.
4. **Es la gramática que el sitio ya tiene.** El mapa es un sitio, cada mundo
   es un sitio. El Observatorio es un séptimo tipo de sitio.

### Montaje

`tesseract` entra en `BESPOKE_WORLD_IDS` y se lleva carpeta propia, exactamente
como ya hicieron `endurance` (`/es/proyectos`) y `ranger` (`/es/contacto`). El
segmento estático gana al dinámico `[mundo]` y `generateStaticParams` lo excluye
solo. No hay ni una línea de routing nueva que inventar: el patrón existe.

```
app/[locale]/experimentos/
├── page.tsx                            recepción
└── observatorio/
    ├── layout.tsx                      ← monta el canvas UNA vez
    └── [objeto]/page.tsx               ← seis segmentos estáticos
```

El `layout.tsx` es la pieza importante: sostiene el canvas y la cámara, y los
seis segmentos sólo cambian ficha, preset y pose. Navegar de Miller a Endurance
es **cambiar la muestra del instrumento**, no cargar otra página.

Slugs en español (`tesseracto`, `gargantua`, `endurance`, `ranger`, `miller`,
`edmunds`). La identidad canónica sigue siendo `WorldId`, nunca el slug
(regla 4): el segmento se resuelve a `WorldId` en el borde y nada más abajo
vuelve a mirar la URL.

---

## 2. Enmienda al contrato de cámara

El contrato del pivote dice: «la cámara no tiene controlador. Su pose es una
función pura de la ruta activa. Nadie más le escribe. Nunca», y
`lib/scene-poses.ts` lo escribe como código, con la advertencia de que quien
añada `OrbitControls` tendrá que romper ese archivo.

**Esta enmienda acota su ámbito sin debilitarlo:**

> El contrato de cámara rige **la escena persistente** — el canvas de fondo que
> acompaña a todas las rutas y cuya pose es `f(routeWorldId)`. El Observatorio
> es otra escena, con otro canvas y otra cámara, montada dentro de una página y
> a la que el visitante entra a propósito. Su cámara no es la del sistema y no
> puede escribir en ella.
>
> `lib/scene-poses.ts` sigue siendo el único productor de poses del System Map,
> y sigue sin importar nada del DOM. Esa garantía no se toca.

Lo que la enmienda **no** permite:

- Que el Observatorio escriba en la pose del System Map, directa o
  indirectamente.
- Que la escena persistente gane rueda, arrastre o acoplamiento al scroll.
- Que el Observatorio se monte en la recepción o en cualquier otra ruta.

Un test de superficie lo vigila: `scene-poses.ts` no importa nada del
Observatorio y el Observatorio no importa `scene-poses.ts`.

---

## 3. Estados del canvas

### La escena persistente: dormir no basta, hay que soltar

Aquí había una afirmación falsa en la primera versión de este documento y
conviene dejarla registrada, no borrarla. Yo escribí que `COVERED_WORLDS`
garantizaba «un solo contexto WebGL en toda la sesión». **No lo garantiza.**
Verificado en código:

- `setCovered(next)` hace exactamente tres cosas: guardar la bandera, escribir
  `canvas.dataset.covered` y llamar a `handleVisibility()`
  (`system-scene.ts:1544`).
- `handleVisibility()` hace `cancelAnimationFrame` y nada más
  (`system-scene.ts:1515`). Es el mismo camino que una pestaña oculta.
- **`forceContextLoss` no aparece en ningún archivo fuente del repositorio.**
- `renderer.dispose()` existe una sola vez, dentro de `handle.dispose()`
  (`system-scene.ts:1670`), y `dispose()` sólo se llama desde el cleanup del
  efecto de montaje y desde `onFailure` — **nunca desde `setCovered`**.
- El `<canvas>` sigue en el DOM: la única salida temprana del JSX es
  `if (level === "flat") return null` (`gargantua-system.tsx:280`), que depende
  del gate, no de la ruta. `data-covered` no tiene ni una regla de CSS: es un
  gancho de diagnóstico.

El comentario de `COVERED_WORLDS` siempre fue literal y honesto — dice «nunca
hay dos contextos **dibujando**», no «existiendo». Fui yo quien lo leyó de más.
Hoy, en `gargantua`, `miller`, `edmunds` y `ranger`, el sitio mantiene **dos
contextos asignados a la vez**: el persistente congelado pero íntegro —renderer,
composer, los dos render targets de acumulación en half-float a tamaño de
viewport, materiales y geometrías de los seis cuerpos— y el propio de la página.

**La decisión para el Observatorio:**

> En las rutas del Observatorio el contexto persistente **no se crea, o se
> libera**. Pausar su bucle no es suficiente.

Y el motivo es específico de esta página, no un principio general: el
Observatorio es el único sitio del proyecto donde el contexto de la página
puede llegar a cargar el raymarch entero —Gargantúa es uno de los seis
especímenes—. Sumarle la VRAM retenida del persistente es justo lo que un
equipo modesto no tiene. En Miller o la Ranger el contexto de página es un
triángulo con una textura y congelar bastaba; aquí no.

**Lo que cuesta, dicho claro.** El mecanismo no existe y hay que construirlo, y
tiene precio: si el canvas persistente se desmonta al entrar, el cleanup del
efecto ejecuta el `dispose()` real y **volver a la home reconstruye la escena
entera** —geometrías, materiales, render targets—. Eso es exactamente lo que el
diseño actual evitaba congelando. Se acepta a propósito: entrar al Observatorio
es una acción deliberada y poco frecuente, y la reconstrucción al volver es un
coste que se paga una vez, mientras que la VRAM retenida se paga durante toda la
visita. Si al implementarlo la reconstrucción resulta visible, la alternativa es
`WEBGL_lose_context` sobre el contexto persistente conservando el elemento — más
barato de recuperar y más difícil de hacer bien.

**En la recepción, en cambio, congelar basta y sobra.** `tesseract` entra en
`COVERED_WORLDS` y con eso la escena persistente deja de dibujar, que es todo lo
que hace falta: allí no hay segundo contexto con el que competir. Es exactamente
el trato que ya tienen Miller, Edmunds, la Ranger y Sobre mí, y no merece un
mecanismo propio. La liberación es sólo para el Observatorio, donde el segundo
contexto sí existe y puede llegar a cargar el raymarch entero.

### Render bajo demanda

El Observatorio **no** tiene un bucle continuo. Dibuja cuando algo cambia: el
visitante mueve la cámara, una transición está en curso, o el espécimen tiene
movimiento propio.

La promesa, escrita con precisión y no como eslogan:

> **Cuando no hay interacción, ni transición en curso, ni movimiento autónomo,
> el renderer queda completamente inactivo.**

No es lo mismo que «el laboratorio no calienta nada». Mientras el Tesseracto se
reconfigura o la Endurance mantiene su propulsión, hay render continuo y eso es
correcto: ese movimiento es contenido. La garantía es que *sin nada de eso*, el
contador de fotogramas deja de avanzar. La cubre el test O12.

**No hay giro genérico en reposo.** En un laboratorio el espécimen se queda
quieto hasta que alguien lo estudia; un objeto que gira solo obliga a
perseguirlo para mirarle una cara concreta y convierte el visor en un
escaparate.

Esto no es «no añadir» nada: el giro **ya existe** y hay que apagarlo. `SPIN_RATE`
(`bodies.ts:4074`) lo tabula por familia visual y `spinAt` lo aplica de forma
**absoluta**, no incremental —`setFromAxisAngle(axis, spin * seconds)`
(`bodies.ts:4317`)—, lo que hace que congelarlo sea trivial: basta con no
avanzar `seconds` para ese término.

Inventario verificado de lo que se mueve solo, y qué hace el Observatorio con
cada cosa:

| Espécimen | Movimiento propio hoy | En el Observatorio |
| --- | --- | --- |
| Miller | giro 0.05 rad/s (~126 s/vuelta) + océano en shader (`seaSpeed 0.24`) | **giro off**, océano **on** |
| Edmunds | giro 0.042 rad/s (~150 s) y **nada más** — ni una referencia a `uTime` | **giro off** → espécimen estático |
| Endurance | giro 0.016 rad/s (~6,5 min) + actitud ±0,5° + RCS y balizas cada 5,8 s | **giro off**, propulsión **on** |
| Tesseracto | giro 0 · reconfiguración 4D + trazo euleriano de 18 s | todo **on** |
| Ranger | giro 0 · respiración y balizas | todo **on** |
| Gargantúa | giro 0, sin malla · disco devanado en épocas de 20 s | disco **on** |

Que Edmunds quede completamente quieto es correcto, no un descuido: es un
planeta, y lo que hay que estudiar en él es la pendiente bajo luz rasante.

**Y esto obliga a una decisión de reloj.** En la escena persistente hay **un
solo interruptor**: con `pose.animated === false` el reloj deja de crecer y se
congela todo a la vez —giro, oleaje, reconfiguración, propulsión y disco—
(`system-scene.ts:1416`). El Observatorio necesita lo contrario: giro apagado
*y* movimiento propio vivo. Por tanto **el Observatorio lleva su propio reloj**,
desacoplado de la pose, y el giro se anula por espécimen en vez de por reloj. Es
una diferencia con el System Map y va escrita aquí para que nadie la «arregle»
igualando los dos comportamientos.

**Gargantúa y el asentamiento del historial.** Es el único espécimen que
necesita fotogramas consecutivos sin que nadie toque nada, hasta que la
acumulación se asienta. Con `TEMPORAL_BLEND = 0.18` la contribución del
historial anterior cae como `0.82^n`: **por debajo del 1 % a los 24
fotogramas**. Eso es lo que dice la aritmética y es todo lo que dice — no
demuestra convergencia visual, que depende del contraste de la escena, ni fija
un tiempo, porque 24 fotogramas son ~0,4 s a 60 Hz y ~0,8 s a 30 Hz. **El
umbral real de asentamiento se determinará con `tools/gargantua-metrics.mjs` y
capturas comparadas**, y hasta entonces el número que se usa es el de la
aritmética, no una promesa de medio segundo.

### Estado al cambiar de espécimen

El `layout.tsx` persistente evita recrear el laboratorio en cada navegación, y
precisamente por eso hay que decir qué **no** persiste:

> Al cambiar de `WorldId`, la cámara, el zoom y los instrumentos de inspección
> se **recalibran al preset inicial del nuevo espécimen**. No se hereda nada del
> anterior y no se recuerda la última pose de cada uno.

Lo que persiste es el *instrumento* —el contexto, el renderer, el bucle—; lo que
se recalibra es la *muestra*. Heredar el azimut de la Endurance al entrar en
Miller puede dejar el objeto fuera de encuadre, o peor, dar una primera
impresión rara de un cuerpo que tiene una vista pensada. Y un instrumento de
inspección heredado sería aún peor: entrarías en Edmunds con el bloom apagado
sin haberlo pedido y verías un cuerpo que no es el suyo.

En V1, **estado determinista por espécimen** antes que memoria por espécimen.
Recordar la última pose de cada uno es una mejora posible, no un punto de
partida.

### Pérdida de contexto y visibilidad

Se reusa el patrón que ya funciona en Miller (`components/miller-ocean.tsx`):
`IntersectionObserver` para suspender fuera de pantalla, escucha de
`webglcontextlost`, y liberación del contexto al desmontar. Aquí se añade
`document.visibilitychange`, porque un laboratorio se deja abierto en otra
pestaña y el de Miller no vive en esa situación.

---

## 4. `/es/experimentos` — la recepción

Ligera, editorial, **sin canvas vivo**. Aunque una maqueta con el Tesseracto
flotando en el hero se vea espectacular, una captura real extraordinaria
consigue casi lo mismo y el premio interactivo está a un clic. Meter un segundo
contexto aquí destruiría la razón de partir la experiencia en dos.

### Composición

1. **Cabecera tipográfica que respira.** Título, una frase, nada más. Sin render
   decorativo grande: un render genérico en el hero desprestigia al de verdad.
   Es la lección del quinto pase de Edmunds — la cabecera es una sección propia.

2. **`3D EXPERIMENTS` — el índice de especímenes.** Es el héroe de esta página:
   seis capturas reales de los cuerpos, grandes, ocupando la primera pantalla
   útil. Honesto (son capturas de su propio trabajo) y doblemente útil (es el
   índice). Cada entrada lleva su par instrumental:

   ```
   01  GARGANTÚA     LENTE / DISCO
   02  TESSERACTO    CRISTAL / CUARTA DIMENSIÓN
   03  ENDURANCE     ESTRUCTURA / ALUMINIO
   04  RANGER        CASCO / PROPULSIÓN
   05  MILLER        AGUA / LUZ
   06  EDMUNDS       ROCA / PENDIENTE
   ```

   **Estos pares hablan del objeto como objeto, no de la sección del sitio.** No
   contradicen la arquitectura narrativa —que asigna significados a los cuerpos
   para el System Map— porque son otro eje. Queda escrito aquí para que nadie lo
   «arregle» dentro de seis meses.

   Las capturas se generan a 1,5× los píxeles que pintan sobre los peldaños
   habituales (320-1920). Es la regla de nitidez del sexto pase de Edmunds y
   aplica igual.

3. **`OTHER EXPERIMENTS`.** Lista de **experimentos reales individuales**, no
   categorías. Un cajón llamado «Interface» con un elemento dentro se lee peor
   que una lista de cuatro cosas concretas. Las categorías llegan cuando el
   volumen las justifique, no antes. Los cuatro de la V1 y por qué esos cuatro,
   en §14.2.

4. **`EXPLORANDO AHORA`.** Una sola entrada, para que el archivo no parezca
   muerto.

### El orden narrativo de la recepción

3D primero y con más peso. No es simetría: el trabajo 3D es el diferenciador, y
una partición 50/50 lo subestimaría. `Other Experiments` va debajo, con
lenguaje más editorial —archivo, cuaderno— frente al espacial de arriba.

---

## 5. `/es/experimentos/observatorio/[objeto]` — el laboratorio

### Composición

El espécimen ocupa entre el **70 % y el 85 % del cuadro**. Todo lo demás es
instrumentación, y toda la instrumentación se quita de en medio.

```
┌─────────────────────────────────────────────────────┐
│  ← EXPERIMENTOS            ENDURANCE        03 / 06 │
│ ┌──┐                                                │
│ │01│                                                │
│ │02│                                                │
│ │03│◀                E S P É C I M E N       ┌─────┐│
│ │04│                                         │FICHA││
│ │05│                                         │  ▸  ││
│ │06│                                         └─────┘│
│ └──┘                                                │
│           OBSERVAR · rotar zoom reajustar           │
│           INSPECCIONAR ▸                            │
└─────────────────────────────────────────────────────┘
```

- **Raíl de especímenes**: tira vertical fina en un borde, seis marcas. No es
  una columna: no roba ancho. Al apuntar revela el nombre, igual que el raíl del
  System Map revela el nombre cósmico.
- **Ficha**: panel colapsable, **cerrado por defecto**. Cuando se cierra, sólo
  queda el espécimen.
- **Mandos**: una fila, abajo, centrada.

### Los dos niveles

Ésta es la decisión que convierte un visor en un laboratorio. Un laboratorio
tiene instrumentos que no todo el mundo usa, y eso es una virtud.

**OBSERVAR** — lo que cualquiera entiende sin explicación:

```
ROTAR · ZOOM · REAJUSTAR · cambiar espécimen
```

**INSPECCIONAR** — capa secundaria, plegada, para quien quiera desmontarlo:

```
○ BLOOM        apagar el halo
○ MATERIAL     el material sin su emisión
○ DATOS        el contrato del modelo
```

**`ESTRUCTURA` (alambre / normales) queda fuera de la V1**, como deuda
declarada. Es el único instrumento que exige construir un sistema entero desde
cero —no existe ni un `wireframe` ni una visualización de normales en el
repositorio— y la V1 no tiene por qué demostrar la visión completa de una vez.
Primero se ve si `OBSERVAR` + `BLOOM` + `MATERIAL` + `DATOS` + las fichas ya
hacen que el Observatorio se sienta terminado. Si con eso basta, `ESTRUCTURA`
no se construye nunca; si falta algo, se construye sabiendo qué falta. Ver §13.

El interruptor de bloom es el más valioso y por eso no puede estar en la fila
principal: el criterio de aceptación del lenguaje visual dice que **un cuerpo
que pierde su identidad al apagar el glow no está terminado**. Dejar que el
visitante lo compruebe es la prueba de oficio de todo el proyecto — pero un
visitante cualquiera no sabe qué está probando, y un botón que no se entiende
en la fila principal es ruido.

**No todos los especímenes llevan todos los instrumentos.** El laboratorio
adapta sus instrumentos a la muestra; no fuerza a los seis a tener los mismos
botones. La tabla de §6 declara cuáles aplican a cada uno.

### Atenuación

La instrumentación se atenúa tras **3,5 s sin entrada** y vuelve con cualquier
gesto. Es el modo cine de Edmunds, exactamente el mismo comportamiento y la
misma constante. Esto es lo que permite tener el vocabulario de laboratorio de
la maqueta C sin su fallo de proporción: los mandos están cuando los buscas y no
están cuando miras.

### La ficha

Todo el proceso vive aquí dentro. **No hay una sección `Process` debajo del
Observatorio**: el proceso pertenece a la muestra.

```
TESSERACTO                                      ESPÉCIMEN 02 / 06

QUÉ ES            Un 4-cubo real: dieciséis vértices, treinta y dos
                  aristas, rotación en cuatro dimensiones proyectada.

QUÉ BUSCABA       Que se sintiera imposible sin depender del glow.

PROBLEMA          La primera versión salió ilegible. La lectura no
                  dependía de la exposición sino de la JERARQUÍA.

CONSTRUCCIÓN      `sampleTesseract` publica la profundidad en W de
                  cada vértice; con ella se reparten luz y grosor de
                  trazo entre las dos celdas del hipercubo.

RESULTADO         Gruesa y clara la celda cercana en la cuarta
                  dimensión, fina y apagada la lejana.

QUÉ APRENDÍ       El movimiento puede percibirse sin desplazar el
                  objeto entero.

ITERACIONES       V1  corredor de marcos — retirado
                  V2  4-cubo, ilegible por exposición
                  V3  jerarquía por W  ← base canónica
                  V4  normales por esquina, oclusión de cruces
                  ACTUAL

DATOS             4 draws · 3 materiales · 32 aristas
```

Las iteraciones son los `FAILED PATHS` del concepto original. Van aquí y no en
una sección propia: cuentan cómo se decidió *este* objeto.

El texto vive en MDX (regla 4: ni una palabra visible en `worlds.data.ts`); los
`DATOS` no son texto, salen del modelo (§8).

---

## 6. Iluminación

### La regla

> **El Observatorio puede cambiar las condiciones de observación, pero no puede
> alterar la identidad material del objeto para hacerlo funcionar.**

Una formulación anterior —«no cambia la fuente de luz, sólo dónde te sientas»—
se descarta: era elegante y se contradecía sola, porque el Tesseracto necesita un
rim y esa regla lo prohibía. Ésta mantiene la disciplina donde importa y no veta
lo que un laboratorio existe para hacer.

Consecuencias directas:

- **Prohibido tocar un parámetro de material** para que un cuerpo se vea mejor
  aquí. Ni paleta, ni ley difusa, ni suelo nocturno, ni exponente de Fresnel.
  Si un cuerpo no se lee, se corrige la condición de observación, no el cuerpo.
- **Los presets son declarativos**, en una sola tabla, no código por objeto. Sin
  esta condición, en seis pases hay seis rigs a mano y el criterio de «la misma
  luz toca materiales diferentes» está muerto.
- **Toda excepción se justifica por escrito** en la propia tabla.

### La cláusula de inspección

La regla de arriba y el instrumento `MATERIAL` de §5 se contradirían sin esto,
así que queda escrito:

> **Los presets de observación nunca alteran el material.** Los instrumentos de
> `INSPECCIONAR` sí pueden **aislar temporalmente canales del material con fines
> diagnósticos** —apagar la emisión, apagar el bloom, sustituir el sombreado por
> normales o alambre—, siempre señalados como modo de inspección y **nunca como
> apariencia canónica**.

La diferencia es quién manda y durante cuánto: un preset es cómo se ve el
espécimen, y es permanente mientras estás en él; un instrumento es una pregunta
que el visitante hace, es reversible, está etiquetado, y al salir del
Observatorio no queda rastro. Un instrumento activo no puede aparecer en una
captura del índice ni ser el estado inicial de ninguna ruta.

### Por qué es barata, y el mecanismo exacto

Para los cinco sólidos, la `KEY` **no es una luz nueva**. No hay ni un
`THREE.Light` en toda la escena. Y el mecanismo es más literal de lo que yo
suponía — verificado en el shader:

```glsl
/* La única luz del sistema es el disco, en el origen. */
vec3 toLight = normalize(-vPositionW);   // bodies.ts:415
vec3 toLightW = normalize(-world.xyz);   // bodies.ts:265, vertex
```

No hay uniform de dirección de luz. **La luz ES el origen del mundo.** De ahí
sale la regla mecánica del Observatorio, que es a la vez una trampa y la
solución:

> **La trampa:** un espécimen centrado en el origen del mundo queda a oscuras.
> Para una esfera en el origen, `toLight = -normal` y `ndl = -1` en todo el
> disco: noche cerrada. `uLightIntensity` no lo arregla, porque multiplica una
> clave que no llega.
>
> **La solución, y el preset:** el espécimen **no se centra en el origen**. Se
> coloca a una distancia del origen en la dirección que se elija, y la cámara se
> coloca para encuadrarlo. Ese par —posición del cuerpo, posición de cámara— **es**
> el preset de observación. Colocar el cuerpo respecto del origen *es* elegir el
> ángulo de luz.

Con eso, la columna `KEY` de la tabla deja de ser una descripción literaria y
pasa a ser un dato calculable: un ángulo alrededor del espécimen. Y se cumple lo
que prometía el §6: **cero uniformes nuevos y cero líneas de shader** para los
cinco sólidos. El espécimen aparece centrado *en pantalla* porque lo encuadra la
cámara, no porque esté en el origen del mundo.

Sólo `ENVIRONMENT` (ambiente de campo estelar) y `RIM` son uniformes nuevos, y
sólo los usan dos entradas de la tabla.

**Aviso para quien lo implemente:** añadir un uniform de dirección de luz al
`BODY_FRAGMENT` compartido sería la solución «limpia» y es la trampa cara — ese
fragment lo comparten los cinco cuerpos del System Map, y habría que demostrar
que el valor por defecto reproduce `-vPositionW` bit a bit. No se hace.

### La tabla

| Espécimen | KEY | ENVIRONMENT | RIM | VISTA inicial | INSPECCIONAR |
| --- | --- | --- | --- | --- | --- |
| **Gargantúa** | — *(es la fuente)* | 0 | ninguno | Cinematográfica | bloom, datos |
| **Tesseracto** | dirección compatible, contraluz | muy bajo | **frío, sutil** ¹ | Tres cuartos alto | bloom, material, datos |
| **Endurance** | canónica desde Gargantúa | mínimo ² | ninguno | Tres cuartos | bloom, material, datos |
| **Ranger** | lateral | mínimo ² | ninguno | Perfil alto | bloom, material, datos |
| **Miller** | casi frontal a cámara | mínimo ² | ninguno | Ecuatorial | bloom, datos ³ |
| **Edmunds** | rasante | mínimo ² | ninguno | Terminador | bloom, datos ³ |

*(Si `ESTRUCTURA` llega algún día, sus candidatos son Tesseracto, Endurance y
Ranger — los tres que se leen por construcción. No Miller ni Edmunds, que son
superficie.)*

### CONTRATO VERIFICADO ✅ · CALIBRACIÓN VISUAL ⏳

Esta tabla ya es código —`lib/observatory.ts`— y sus tests demuestran que **si un
preset dice 55°, la geometría produce exactamente 55°**. Eso es todo lo que
demuestran.

**No demuestran que 55° sea el ángulo correcto para la Endurance.** Los valores
de `keyAngle`, `keyAzimuth`, `environment`, `rim` y `ORIGIN_DISTANCE_RADII` son
puntos de partida técnicamente válidos, **no dirección de arte aprobada**.
Cuando se monte el primer espécimen puede resultar que 55 deba ser 47, o que
Miller funcione mejor a 18: eso no sería un fallo de la arquitectura, sería el
pase visual haciendo su trabajo. La lista vive en
`PENDING_VISUAL_CALIBRATION` y sólo se vacía sobre capturas aprobadas por
Jonás, nunca porque la suite esté verde.

**`ORIGIN_DISTANCE_RADII = 10` en particular no se congela.** «Está dentro de la
banda 6-13 del System Map» no implica «el material se verá igual»: la Endurance
vive cerca de 6 radios y es una estructura grande, así que la divergencia de la
luz a 10 radios puede leerse distinta. Antes de darlo por bueno hay un A/B sobre
al menos dos cuerpos: System Map original contra Observatorio a 6, 10 y 13
radios, y se juzga cuál conserva el carácter.

**Corrección de nombre.** La columna se llamaba `keyRoll` y estaba mal descrita
como «roll alrededor del eje de mirada, 0° sitúa la luz a la derecha». Medido:
es un **azimut alrededor del eje de luz**, y con `keyAngle 90` y azimut 0 la luz
cae completamente a la **izquierda**. Dónde acaba la luz en pantalla depende
además del `up` de la cámara, así que se calcula aparte —`keyScreenDirection`—
y es ahí donde se mira al calibrar. De paso apareció una mina: `keyAngle 90` con
azimut 90 degenera la base de cámara, y la Ranger ya está en `keyAngle 90`.
Salvada con eje de reserva y con test propio.

**¹ Excepción declarada — Tesseracto.** Es cristal casi negro y salió del
material común de los cuerpos. Contra fondo oscuro y sin vecinos, la silueta se
pierde: en el System Map no ocurre porque hay disco, estrellas y cinco cuerpos
llenando el cuadro. Rim frío, muy débil, **sólo separación de silueta**: si
llega a leerse como una luz, está mal calibrado.

**² Excepción declarada — ambiente de campo estelar.** Misma causa: la cara
noche funciona en el mapa porque el cuadro está lleno. Sola contra negro puede
leerse como un objeto roto. Es ambiente, no un *fill*: no tiene dirección y no
puede levantar el terminador. El concepto ya existe en la Ranger («azul de
campo estelar en la espalda»).

**³ Miller y Edmunds no llevan `MATERIAL`, y no es un olvido.** Verificado:
`vec3 emissive` sólo se escribe dentro de la rama `uKind == 8`
(`bodies.ts:1519`, `1530`, `1541`), que sale por `return` en `1572`. Miller,
Edmunds, los cascos, la estructura y el servicio **no tienen término emisivo**,
así que un instrumento de «apagar la emisión» no haría absolutamente nada sobre
ellos. Un botón que no cambia nada es peor que un botón ausente. Es el ejemplo
más limpio del principio de §5: **el laboratorio adapta sus instrumentos a la
muestra.**

### El instrumento ya está construido

`uEmission` existe: `uniform float` declarado en `bodies.ts:286`, inicializado a
1 en `2684`, y aplicado en **un solo punto de estrangulamiento** —
`emissive *= uEmission` (`bodies.ts:1557`)— deliberadamente después de que cada
material haya escrito el suyo y antes de que nadie lo use. No toca albedo,
gloss, ley difusa, terminador, rim, atmósfera ni tinte de foco. Los otros dos
materiales que emiten declaran el mismo nombre:
`endurance-operations.ts:50` y `tesseract-model.ts:221`. Lo alimenta
`lib/visual-bench.ts` y `tools/shot.mjs` ya lo pone a 0 para sus capturas sin
glow.

O sea: el instrumento `MATERIAL` **no necesita un uniform nuevo ni tocar una
línea de material**, que es exactamente lo que la cláusula de inspección exige.
Dos cosas sobreviven al apagado y hay que decidirlas aparte cuando se
implemente: el término `uNavigation * uFocus * 0.75` (`bodies.ts:1572`) y la
cinta orbital aditiva (`bodies.ts:4275`), que no pasa por `uEmission`.

Eso deja la V1 sin **ningún** instrumento que exija sistema nuevo: `BLOOM` es un
parámetro que ya existe, `MATERIAL` es `uEmission`, y `DATOS` es leer contratos.
`ESTRUCTURA`, el único que sí lo exigía, sale de la V1 (§13).

**Por qué cada KEY.** No es gusto, es qué revela ese material:

- **Edmunds** se define por PENDIENTE, no por altura. La luz rasante es
  literalmente el instrumento correcto para ese campo.
- **Miller**: el camino de luz y la cresta con espuma sólo aparecen con la
  fuente cerca del eje de cámara.
- **Endurance**: los tres cuartos son donde separan facetas y cavidades.
- **Ranger**: su identidad es el reparto ámbar/azul, que sólo existe con
  Gargantúa lateral.
- **Tesseracto**: la jerarquía por profundidad en W se lee a contraluz.

**Gargantúa no recibe ninguna luz añadida. Nada. En ninguna vista.**

---

## 7. Gargantúa: cuatro vistas, y por qué no hay órbita

### La razón

Primero, lo que **no** es el argumento. El razonamiento inicial —que el sistema
es axisimétrico y el conteo de pasos apenas cambia con el azimut— medía el eje
equivocado y se descarta. Pero tampoco vale el argumento contrario en su
versión fuerte: **la acumulación temporal, por sí sola, no demuestra que la
órbita libre sea inviable.** Existe una estrategia natural y el propio proyecto
ya la roza — bajar o desactivar la acumulación mientras se arrastra y
reiniciarla al soltar, que es primo hermano de lo que hace
`VOYAGE_TEMPORAL_BLEND = 0.55` durante la travesía.

El argumento correcto, y el que se escribe aquí:

> La órbita libre no entra en V1 porque durante la manipulación se perdería
> temporalmente la calidad final —el supermuestreo sobre ocho posiciones de
> Halton es lo que paga el acabado de Gargantúa— y **no se ha demostrado ni que
> esa degradación sea aceptable, ni que todos los ángulos alcanzables conserven
> la composición** que costó un pase entero de cinco puntos.

Son dos incógnitas distintas, una de rendimiento y otra de dirección de arte, y
la segunda es la que más pesa: una órbita libre garantiza que alguien acabará
mirando el pase visual final desde un ángulo que nadie encuadró.

Las vistas curadas, además, no cuestan trabajo nuevo: las poses acumulan a 0.18
como la home y las transiciones entre ellas usan 0.55 como la travesía. Los dos
números ya están afinados y probados.

**Y nada de esto afecta a los otros cinco.** Los cuerpos no se acumulan porque
se mueven (`system-scene.ts:49`). Órbita libre en los cinco sólidos, sin
asterisco.

### Las cuatro vistas

Cada una estudia una propiedad distinta. Eso es más laboratorio, no menos.

| Vista | Qué se estudia |
| --- | --- |
| **01 · Cinematográfica** | La composición aprobada: elipse aplanada, arco superior sobre la sombra, secundaria por debajo. |
| **02 · Lente** | El anillo de fotones y la imagen duplicada. Elevación baja dentro de la banda medida. |
| **03 · Disco** | Estructura interna de las bandas y la asimetría Doppler entre los dos lados. |
| **04 · Sombra** | El negro real y su borde. La vista donde el interruptor de bloom cuenta la historia del §14 undecies: el halo no puede encender lo que estaba apagado. |

La elevación de cada vista se queda dentro de la banda que el A/B de 17°/12°/9°
ya justificó. Por debajo de 9° no se baja, y el motivo está escrito en
`scene-poses.ts`: a partir de ahí se persigue un fotograma de Interstellar a
costa de la composición propia.

### Deuda abierta, explícita

La órbita libre en Gargantúa queda como **hipótesis no demostrada, no como
diseño**. Si se retoma, el trabajo tiene tres partes y ninguna es opcional:

1. **Implementar** la acumulación degradada durante el arrastre con reinicio y
   refinado al soltar. La mecánica está verificada y el camino es corto:
   `uBlend` sale hoy de `Math.max(voyage ? 0.55 : 0.18, 1/(accumulated + 1))`,
   así que un estado de arrastre entra como una constante más en ese ternario,
   alimentada por un método del handle al estilo de `setVoyage`. Y **el reinicio
   al soltar es obligatorio y gratis**: `resetAccumulation()` es literalmente
   `accumulated = 0`, sin limpiar ningún render target — el siguiente fotograma
   calcula `uBlend = 1` por la rampa de arranque y sobrescribe el historial
   entero de una vez. Sin ese reinicio, el historial sucio del arrastre entra al
   82 % y deja fantasma varios fotogramas.
2. **Juzgar visualmente** si esa degradación transitoria es aceptable — es una
   decisión de Jonás sobre capturas, no una métrica.
3. **Medir** con `tools/gargantua-metrics.mjs` en varios azimuts y elevaciones
   que la composición aguanta en todo el rango alcanzable.

Un aviso para quien lo implemente: `setParallax` **no** llama a
`resetAccumulation()`, y es a propósito — hay un comentario largo explicando que
antes sí lo hacía y por eso Gargantúa se veía granulada al mover el ratón. El
arrastre del Observatorio es un caso distinto (movimiento grande y discreto,
no un objetivo suavizado), pero conviene saber que ese camino ya se recorrió
una vez en la dirección contraria.

Las cuatro vistas no son un peldaño provisional hacia la órbita: son la V1 y son
suficientes. Si la órbita llega algún día, llegará *además*.

---

## 8. Instrumentación: lecturas derivadas

### La regla

> **Ninguna lectura del HUD se teclea. Toda lectura se deriva del modelo o del
> código que la produce.**

Nada de `RA 03h 12m`, `DEC -42°`, `MODEL v2.4`, `STABILITY 97 %`. Parece NASA y
es teatro, rompe la regla 8 de contenido honesto, y —lo importante— un número
escrito a mano se separa del modelo el día que alguien toca el modelo.

La prueba llegó sola durante el diseño de esta página: en una propuesta de HUD
apareció «8 radiadores». El modelo dice 4.

### El contrato que ya existe

`bodies.ts:3412` publica y `bodies.test.ts:190` vigila:

```
modules 12 · groups 4 · arms 4 · primaryModules 4 · engineBells 4
radiators 4 · dockedRangers 2 · dockedLanders 2 · manoeuvringPods 4
manoeuvringNozzles 4 · rcsNozzles 10 · firingNozzles 2
warmLights 9 · technicalLights 4
```

La ficha de la Endurance consume **ese objeto**. Si alguien cambia el modelo, o
el test falla o el HUD cambia con él. Nunca puede mentir.

### Los cinco que faltan — trabajo declarado

Sólo la Endurance tiene contrato. Los otros cinco necesitan el equivalente,
publicado igual y vigilado igual:

| Espécimen | Contrato a crear |
| --- | --- |
| Tesseracto | vértices 16, aristas 32, draws, materiales, celdas |
| Ranger | secciones de casco, toberas de escape, balizas, draws |
| Miller | escalas de oleaje, sitios de FBM, velocidad de superficie |
| Edmunds | macroformas, minerales, sitios de FBM, exponente de ley difusa |
| Gargantúa | `rs`, radios del disco, pasos por píxel, mezcla temporal |

Es la parte menos vistosa del trabajo y la que hace que el resto sea verdad.

### Lo que salió al construirlo, y revisa esta tabla

`components/scene/specimen-contract.ts` mide el modelo ya construido: `draws`,
`materials` y `vertices` se cuentan recorriendo el objeto real, con el mismo
criterio que el presupuesto de `bodies.test.ts` para que los dos números se
puedan comparar. No declara ni una constante de conteo. Medido:

| Espécimen | draws | materiales | vértices | arquitectura propia |
| --- | --- | --- | --- | --- |
| Tesseracto | 4 | 4 | 1 688 | vértices 16 · aristas 32 · caras 6 |
| Endurance | 4 | 4 | 11 843 | los 14 campos de `enduranceArchitecture` |
| Ranger | 3 | 3 | 2 012 | — |
| Miller | 1 | 1 | 1 107 | — |
| Edmunds | 1 | 1 | 1 107 | — |

Dos cosas que la tabla de arriba no preveía:

**El Tesseracto no necesita `userData`.** Su topología ya la posee
`lib/tesseract.ts`, y duplicarla dentro de la malla sería crear una segunda
verdad. El contrato la deduce del circuito euleriano —el índice más alto que
recorre, más uno—, así que ni el 16 está escrito en ninguna parte.

**Miller y Edmunds no tienen arquitectura que publicar, y es una conclusión, no
una carencia.** Son **una esfera con un material**. Toda su identidad vive en
parámetros de shader —sitios de FBM, exponente de la ley difusa, suelo nocturno,
escalas de oleaje— que son texto GLSL, no datos en ejecución. Copiarlos a una
tabla de runtime sería exactamente el «8 radiadores» otra vez, con más pasos.

Así que sus lecturas específicas **entran como CONTENIDO**: prosa en MDX citando
`world-visual-language.md`, presentadas como lo que son —decisiones de diseño
documentadas— y nunca disfrazadas de medición. La regla del §8 no se debilita;
se precisa: *lo que se presenta como medido, se mide; lo que es una decisión, se
cita.*

### Lecturas comunes

De `worlds.data.ts` y `placement`: radio orbital en `rs`, fase, inclinación,
tamaño. Del modelo: draws, materiales, geometría. Del lenguaje visual: los
parámetros publicados (ley difusa, suelo nocturno). Todo existente, todo
verificable, todo más interesante que unas coordenadas inventadas.

---

## 9. Responsive, movimiento y capacidad

Tres ejes independientes. Se deciden aquí y no después de construir.

### Eje 1 — capacidad

El Observatorio usa el mismo gate que la escena (`components/scene/capability.ts`),
sin una heurística nueva:

| Nivel | Qué recibe el Observatorio |
| --- | --- |
| `deep` | Todo: espécimen, órbita libre y los **tres** instrumentos de la V1. |
| `orbit` | Igual, con el conteo de pasos y el bloom del perfil `orbit`. |
| `flat` | **Sin canvas.** Espécimen en SVG grande + ficha completa. |

El nivel `flat` no es una página de error: `components/flat-world-body.tsx` ya
dibuja los seis cuerpos en SVG espejando la arquitectura del modelo 3D —los
cuatro grupos de la Endurance, el hipercubo congelado en su pose inicial—. En el
Observatorio se muestra **grande**, con la ficha entera, las iteraciones y los
datos derivados. Se pierde la manipulación; no se pierde el contenido.

Sin WebGL2 no hay negociación (veto duro del gate): `flat` directo, y el
Observatorio lo dice en una línea sin dramatismo.

### Eje 2 — movimiento

Un solo interruptor manda, el de la bandeja inferior derecha
(`components/motion-toggle.tsx`). El Observatorio **no añade ningún control de
pausa propio**: eso es exactamente lo que la decisión del 2026-09-13 retiró.

Y una distinción que hay que escribir para que nadie la resuelva mal:

> El interruptor gobierna el movimiento **autónomo**, no la mano del visitante.

| Con movimiento apagado | |
| --- | --- |
| Rotar, acercar, reajustar | **Siguen funcionando.** Es manipulación directa. |
| Giro en reposo del espécimen | Apagado. |
| Reconfiguración interna del Tesseracto | Congelada en su pose legible. |
| Propulsión de la Endurance / Ranger | Sin animación. |
| Transiciones entre vistas | **Instantáneas**, no suprimidas. |
| Atenuación del cromo a los 3,5 s | Sigue: no es movimiento, es foco. |

**El canvas NO se desmonta con el movimiento apagado.** Aquí hay una diferencia
deliberada con Miller, y conviene justificarla: en Miller el canvas es
decoración sobre una fotografía que ya lo dice todo, así que apagarlo devuelve
el contenido. Aquí el canvas **es** el contenido. Apagarlo dejaría al visitante
en una página vacía.

`prefers-reduced-motion` no apaga nada por sí solo, igual que en el resto del
sitio; el icono es el consentimiento. `?no3d=1` sigue siendo la puerta al perfil
ligero y lleva al `flat` de arriba.

### Eje 3 — viewport

| Ancho | Observatorio |
| --- | --- |
| ≥ 1024 px | Composición completa: raíl lateral, ficha lateral. |
| 768–1023 px | Raíl inferior horizontal, ficha a pantalla completa al abrirse. |
| < 768 px | Ver abajo. |

**Móvil.** El gate manda a un móvil a `orbit`, nunca a `deep` — `deep` pide
señales verdes, no ausencia de rojas. Decisiones propias del móvil:

- **Un dedo rota, dos hacen zoom.** El pan se retira entero: no cabe un tercer
  gesto y en un objeto centrado no aporta nada.
- **El scroll vertical de la página gana al gesto** fuera del espécimen, y el
  espécimen captura el gesto sólo dentro de su caja. Un visor que secuestra el
  scroll en un móvil es una trampa.
- **Raíl de especímenes abajo**, deslizable, con blancos de 44 px.
- **La ficha abre a pantalla completa** con cierre explícito. Un panel lateral
  en 375 px no es un panel, es la página.
- **Gargantúa en móvil**: las cuatro vistas, sin excepción. El asentamiento del
  historial (§3) es aún más valioso aquí, porque limita el gasto a una ráfaga
  por cambio de vista en vez de un bucle continuo — pero **cuántos fotogramas
  dura en un móvil real es justo lo que hay que medir**, no una cifra que este
  documento pueda dar por buena. A 30 Hz el mismo número de fotogramas es el
  doble de tiempo, y el umbral de asentamiento sale de capturas comparadas, no
  de la aritmética.
- **El cromo no se atenúa en puntero grueso.** Sin hover no hay forma barata de
  recuperarlo, y el modo cine sin ratón es una interfaz que desaparece.

---

## 10. Accesibilidad

- El canvas es `aria-hidden`. La formulación exacta importa, porque §9 dice que
  aquí «el canvas es el contenido» y eso se leería como una contradicción:

  > El canvas es la **representación visual principal** del espécimen, pero
  > **nunca su única representación semántica**.

  El HTML servido de cada ruta del Observatorio lleva el nombre del espécimen,
  su ficha entera, sus iteraciones y sus datos, sin una línea de JavaScript. La
  regla 7 se cumple: la escena nunca *es* el contenido, aunque aquí sea la forma
  en que la mayoría lo mire.
- Sin JS: la recepción funciona entera; el Observatorio muestra la captura real
  del espécimen y su ficha. Los seis enlaces del índice son `<a href>`.
- El raíl es una lista de enlaces reales navegable con tabulador, con estado
  visible de foco.
- Los mandos son botones con nombre accesible en español, no iconos mudos.
- Los instrumentos de `INSPECCIONAR` son `<button aria-pressed>`.
- Orden de foco: volver → raíl → espécimen → mandos → inspección → ficha.
- Contraste del cromo verificado en su estado atenuado, no sólo en el activo.

---

## 11. Recursos y presupuesto

- **Un solo contexto WebGL mientras el Observatorio está abierto** — y esto
  **no** lo garantiza `COVERED_WORLDS`, que sólo detiene el bucle y conserva
  toda la memoria de GPU del contexto persistente (§3). Lo garantiza el
  mecanismo de liberación que hay que construir, y el test O2 lo vigila. La
  frase «un solo contexto en toda la sesión» era falsa en la primera versión de
  este documento y queda retirada.
- **Cero dependencias nuevas.** No entra `OrbitControls` de `three/examples`: la
  órbita del Observatorio son tres gestos sobre coordenadas esféricas acotadas y
  cabe en menos código del que pesa importar el módulo. Además, importarlo
  contradiría la letra de `scene-poses.ts` aunque no su espíritu, y eso es una
  discusión que no hace falta tener.
- **`bodies.ts` se factoriza**, pero con una precaución explícita que fijó
  Jonás: **no es una refactorización estética.** Se extrae una API mínima para
  construir un cuerpo aislado y publicar su contrato de datos, **conservando
  exactamente la salida del System Map** y con los tests actuales pasando sin
  tocarlos. Después el Observatorio consume esa API. La primera entrega no
  cambia ni un píxel: sólo abre la puerta arquitectónica. Reordenar, renombrar o
  «limpiar» el archivo es otra tarea y no entra aquí.
- La recepción **no crea un contexto WebGL propio**. Y no, tampoco «no carga
  `three`»: `GargantuaSystem` vive en el layout de todas las rutas, así que en
  un equipo capaz el chunk ya está cargado cuando se llega a ella, igual que en
  Miller o en Sobre mí (§1).
- Las capturas del índice: seis peldaños (320-1920) a 1,5× los píxeles pintados,
  WebP, `loading="lazy"` salvo la primera. El molde ya existe —`tools/shot.mjs`
  para capturar y `tools/prepare-*.mjs` + `sharp` para los peldaños—, pero
  `shot.mjs` **no acepta parámetros de cámara**: hoy la pose sólo se deriva de
  la ruta. Ver §14.4.
- `public/` no tiene hoy **ni una sola captura** de la escena. Las seis del
  índice son contenido nuevo que hay que generar.

### La forma de cada entrega la decide Knip

Medido con un experimento controlado y revertido: un export o un archivo nuevo
**sin ningún consumidor** hace `npx knip` → **EXIT=1**; el mismo export con un
`*.test.ts` nuevo como único consumidor → **EXIT=0**. `knip.json` no tiene
`rules` ni `ignoreExportsUsedInFile`, así que rigen los defaults y `files`,
`exports` y `types` son error.

Dos consecuencias prácticas:

1. **Ninguna entrega puede ser «API pelada».** Cada módulo nuevo llega con su
   propio test, que es además lo que ya hace el repo. Añadir tests nuevos no
   viola la condición de «no tocar los tests existentes».
2. **No anteponer `export` a un helper interno de `bodies.ts`** para «abrir la
   API»: con `ignoreExportsUsedInFile: false`, exportar algo que sólo se usa
   dentro de su propio archivo **rompe CI** aunque esté vivo.

Y el orden importa al iterar: `check` es
`lint && typecheck && knip && test && build`, así que un huérfano impide
siquiera llegar a ver si los tests del System Map siguen verdes. `npx knip`
suelto tarda segundos — correrlo antes.

---

## 12. Verificación

| # | Qué garantiza | Regresión que evita | Tipo |
| --- | --- | --- | --- |
| O1 | La recepción no crea un contexto WebGL **propio** y la escena persistente **no dibuja** en ella | El índice engorda hasta ser otro System Map | E2E |
| O2 | En el Observatorio el contexto persistente **está liberado, no sólo pausado**; en la recepción basta con que no dibuje | Creer que congelar libera VRAM — el error real del §3 | E2E |
| O3 | Cada cuerpo **sólido** tiene preset de observación y ninguno escribe un parámetro de material; **Gargantúa queda fuera a propósito** y usa el contrato de vistas curadas | Rigs a mano por objeto, o una luz añadida a Gargantúa por descuido | Unit ✅ |
| O4 | Las lecturas salen del contrato del modelo, no de literales | El «8 radiadores» otra vez | Unit |
| O5 | Gargantúa no expone órbita libre ni recibe luz añadida | La deuda de §7 aplicada por descuido | Unit |
| O6 | Con movimiento apagado: sin giro en reposo, transiciones instantáneas, manipulación viva | Un laboratorio inerte o un control de pausa nuevo | E2E |
| O7 | En `flat` y sin WebGL2 hay espécimen SVG y ficha completa | Una página rota en vez de una degradada | E2E |
| O8 | Sin JS: seis URLs con nombre, ficha y captura | La escena convertida en el contenido (regla 7) | E2E |
| O9 | Navegar entre especímenes no desmonta el canvas | Recrear el laboratorio en cada clic | E2E |
| O10 | 375/768/1440: cero desbordamiento, blancos de 44 px, el scroll de página gana fuera del espécimen | Un visor que secuestra el móvil | E2E |
| O11 | `scene-poses.ts` y el Observatorio no se importan entre sí | La enmienda del §2 erosionada | Unit |
| O12 | **Sin interacción, transición ni movimiento autónomo, el contador de renders deja de avanzar** — inmediato en los cinco sólidos, tras el asentamiento en Gargantúa | Vender «no malgasta GPU» y tener un bucle continuo igual | E2E |
| O13 | Cambiar de espécimen recalibra cámara, zoom e instrumentos al preset del nuevo | Entrar en Miller con el encuadre de la Endurance o el bloom apagado sin pedirlo | E2E |

### Cómo se escriben, con las trampas ya medidas

La suite tiene patrones establecidos y tres trampas verificadas. Escribirlos de
cero sin esto costaría una entrega.

**El patrón de la casa es contar dibujos por canvas dueño**, no mirar contextos.
`miller.spec.ts:186` parchea `drawArrays`/`drawElements` en
`WebGL2RenderingContext.prototype` y cuenta sólo si
`canvas.classList.contains("system-canvas")`; luego afirma `whileCovered === 0`
sobre una ventana de 12 fotogramas. `ranger.spec.ts:48` hace lo mismo filtrando
por `closest(".ranger-view")`. O2 y O12 siguen ese molde.

**Trampa 1 — no enganchar `getContext`.** Daría falsos positivos: `probeWebGL()`
(`capability.ts:205`) crea un canvas desechable fuera del DOM para sondear
WebGL2 y lo suelta con `WEBGL_lose_context`. Si O2 quiere contar contextos y no
sólo dibujos, tiene que filtrar por `canvas.isConnected`.

**Trampa 2 — «cero fotogramas» no es cierto en la escena persistente.** Su modo
congelado no es quieto: `FROZEN_FRAME_MS = 250` la deja dibujando a ~4 fps, y
además sólo entra en ese modo cuando `accumulated > JITTER.length * 2`. El
Observatorio **sí** puede llegar a cero de verdad porque su bucle es bajo
demanda, y por eso O12 puede afirmar cero — pero afirmarlo sobre la home sería
un test rojo desde el primer día.

**Trampa 3 — estos dos tests necesitan la escena VIVA**, así que no pueden usar
`?no3d=1` como casi toda la suite. El precedente es `addInitScript` escribiendo
`jonas-orbit:reducir-efectos = "false"` (`miller.spec.ts:188`,
`edmunds.spec.ts:255`) o el camino del icono (`smoke.spec.ts:711`). Bajo
SwiftShader el raymarch va a ~2 fps: hace falta `test.setTimeout(90_000)` y
esperas con `{ timeout: 30000 }`. Y `test:e2e` corre también el proyecto
`mobile-chromium` a 375×812, donde el gate puede no montar la escena — hay que
fijar viewport o saltar por proyecto, como ya hacen Miller y Edmunds.

**Un extra que la suite ya usa y conviene heredar:** `data-persistence-marker`
(`miller.spec.ts:203`). Se marca el canvas a mano antes de navegar y se
comprueba al volver. Sirve para distinguir «no dibujó» de «es otro elemento» —
y en O2, precisamente, el marcador debe **desaparecer**, porque el contexto se
liberó de verdad.

---

## 13. Alcance V1

**Entra:**

1. **La «extracción» de `bodies.ts` resulta ser casi un no-op, y eso cambia el
   orden.** Verificado leyendo `createBody` (`bodies.ts:4262`): **nunca escribe
   `object.position`** —el cuerpo ya nace centrado en su propio origen— y **la
   cinta de órbita es un hermano** que se devuelve aparte en `body.orbit`, no un
   hijo de `object`. Así que «un cuerpo sin el resto del sistema y sin cinta» ya
   se consigue hoy: llamar a `createBody`, añadir sólo `body.object` a la escena
   nueva y no añadir `body.orbit`. **Cero cambios en `bodies.ts` para la
   geometría.**

   Lo que sí hay que construir, y es otra cosa: el **preset de colocación**
   (§6 — dónde va el cuerpo respecto del origen y dónde la cámara), el **driver
   de uniformes** —el bucle del System Map escribe `uTime`, `uCamPos`,
   `uLightIntensity` y `uEmission` por fotograma, más `uFocus` por evento, y el
   Observatorio tiene que escribirlos él— y la **publicación de contratos** para
   los cinco cuerpos que no la tienen, que sí toca `bodies.ts` de forma aditiva.
2. **Liberación del contexto persistente por ruta** (§3). Mecanismo nuevo; hoy
   sólo existe pausar.
3. Ruta `/es/experimentos` completa: cabecera, índice de seis, `Other
   Experiments` con los cuatro de §14.2, `Explorando ahora`.
4. Ruta `/es/experimentos/observatorio/[objeto]` con los **seis** especímenes,
   reloj propio desacoplado de la pose y giro anulado por espécimen (§3).
5. `OBSERVAR` completo. `INSPECCIONAR` con `BLOOM`, `MATERIAL` y `DATOS` — los
   tres reusan mecanismos que ya existen. **Ningún instrumento de la V1 exige
   construir un sistema nuevo.**
6. Gargantúa con sus cuatro vistas y transiciones guionadas.
7. Contratos de datos para los cinco cuerpos que no los tienen.
8. Fichas de los seis, con proceso e iteraciones, en MDX.
9. Los tres ejes del §9 y los trece tests del §12.
10. **Al final, no al principio:** `capturePreset` por espécimen, la bandera de
    cámara en `tools/shot.mjs` y las seis capturas del índice (§14.4).

**No entra:**

- **`ESTRUCTURA` (alambre / normales) — deuda V1.1.** El único instrumento que
  exigía un sistema entero desde cero. Se construirá **sólo si** la V1 demuestra
  que hace falta: primero se ve si `OBSERVAR` + `BLOOM` + `MATERIAL` + `DATOS` +
  las fichas ya dejan el Observatorio terminado. Condición para reabrirlo: que
  al usarlo se eche de menos algo concreto, no que quede bonito en una lista.
- Órbita libre en Gargantúa (§7, deuda declarada).
- Categorías en `Other Experiments`.
- Vistas preparadas para los cinco sólidos (tienen órbita libre; las vistas son
  la solución a un problema que sólo tiene Gargantúa).
- Previsualizaciones animadas al pasar el cursor en el índice.
- Comparador de escala entre especímenes. Buena idea, otra entrega.

**Sin engañar a nadie sobre el tamaño:** el Observatorio con los seis está en la
escala de Edmunds, y Edmunds necesitó seis pases. Es una semana de trabajo.

---

## 14. Decisiones cerradas por Jonás

Las cuatro preguntas que este documento dejó abiertas, resueltas el mismo día.

**1 · Pares del índice: instrumentales.** `LENTE / DISCO`,
`CRISTAL / CUARTA DIMENSIÓN`, `ROCA / PENDIENTE`. El razonamiento de Jonás, que
vale como criterio para toda la página: *el System Map ya cuenta qué significa
cada mundo; Experimentos debe demostrar cómo lo construiste.* Nada de repetir
`ISOLATION / TIME` aquí.

**2 · `Other Experiments` arranca con cuatro, no con ocho:**

```
LA TRAVESÍA            navegación · movimiento · shader      lib/voyage.ts
OCÉANO EN WEBGL2       agua · refracción · perspectiva       Miller
ANILLO EN CSS 3D       galería · arrastre · profundidad      Edmunds
RASTRO DEL PUNTERO     partículas · cola · calibre           System Map
```

La regla que los selecciona no es la antigüedad, es **no duplicar lo que ya
cuenta la ficha de un espécimen**. El estudio de lente de Gargantúa y las
iteraciones de material del Tesseracto viven en sus fichas, donde `ITERACIONES`
ya les da un sitio mejor del que tendrían en una lista. Así `Other Experiments`
se lee como otro archivo —exploraciones que no son de los cuerpos— y no como una
segunda lista de cosas de Gargantúa y el Tesseracto.

Quedan fuera de la V1 pero son candidatos naturales cuando crezca: el ventanal
de la Ranger y el cielo de observatorio del navbar.

**3 · Idioma: español, con una excepción.** `OBSERVAR`, `INSPECCIONAR`,
`ESTRUCTURA`, `DATOS`, `MATERIAL`. **`BLOOM` se queda en inglés** por ser un
término técnico reconocible de rendering: «RESPLANDOR» pierde precisión y es
precisamente el instrumento donde la precisión es el punto. `OBSERVATORIO` es
nombre propio del instrumento.

**4 · Capturas: híbrido, no una cosa ni la otra.** Jonás elige **una vez** la
cámara exacta de cada espécimen; ese encuadre se guarda como `capturePreset`
junto al preset de observación, y `tools/` genera siempre los seis peldaños
(320-1920) a 1,5× a partir de esas poses. Ojo humano en la dirección,
reproducibilidad en la ejecución — y si una captura envejece, se regenera sin
volver a decidir nada.

Lo que hay y lo que falta, verificado: `tools/shot.mjs` ya levanta Chromium
headless sobre SwiftShader y tiene banderas para `--sin-glow`, `--sin-rotulos`,
`--reloj=<s>` y `--sin-acumular`; `tools/prepare-*.mjs` con `sharp` es el molde
establecido para publicar en `public/`. **Lo que no existe es el concepto de
encuadre**: hoy la pose sólo se deriva de la ruta y `shot.mjs` no acepta
parámetros de cámara.

Eso resuelve solo el orden de construcción, y de forma elegante: el
`capturePreset` no se inventa para las capturas — **es la pose del Observatorio**.
Se construye el Observatorio, Jonás elige el encuadre de cada espécimen dentro
de él, y la herramienta captura desde esa misma pose. Por eso las seis imágenes
del índice son la **última** tarea de la V1 y no la primera.

---

## 15. Enmiendas aplicadas (2026-09-16)

Jonás aprobó el documento con ocho enmiendas. Quedan incorporadas arriba; se
listan aquí porque varias corrigen afirmaciones que yo había escrito con más
seguridad de la que tenía, y ese registro vale más que la versión limpia.

| # | Qué corrige | Dónde |
| --- | --- | --- |
| 1 | «24 fotogramas = medio segundo» pasa a «la contribución del historial cae por debajo del 1 %»; la convergencia **visual** se verificará con métricas y capturas | §3 |
| 2 | La promesa de render bajo demanda se hace exacta, y **se retira el giro genérico en reposo** | §3 |
| 3 | «La escena duerme» no garantiza un solo contexto: en las rutas del Observatorio el contexto persistente **no se crea o se libera**, no basta con pausar el bucle | §3, §11, O2 |
| 4 | El argumento contra la órbita libre deja de ser «no tiene respuesta» y pasa a ser «degradación transitoria no juzgada y ángulos no verificados» | §7 |
| 5 | Cláusula que separa **preset** (nunca toca el material) de **instrumento** (aísla canales, temporal y etiquetado) | §6 |
| 6 | El canvas es la representación visual principal, **nunca la única representación semántica** | §10 |
| 7 | Al cambiar de espécimen se recalibran cámara, zoom e instrumentos | §3, O13 |
| 8 | O12: guardrail del render bajo demanda | §12 |

**Segunda ronda, mismo día**, tras revisar las anteriores:

| # | Qué corrige | Dónde |
| --- | --- | --- |
| 9 | «Cero WebGL y cero `three` en la recepción» era falso y caro de conseguir. La garantía pasa a **«no crea contexto propio y el persistente no dibuja»**; la liberación real se reserva al Observatorio, donde sí hace falta | §1, §3, O1 |
| 10 | **`ESTRUCTURA` sale de la V1** como deuda V1.1. Era el único instrumento que exigía un sistema nuevo; se construirá sólo si al usar la V1 se echa de menos algo concreto | §5, §6, §13 |
| 11 | La «convergencia de medio segundo» en móvil se sustituye por la misma formulación prudente del §3: el asentamiento se mide, no se promete | §9 |

Las enmiendas 2, 3, 4 y 5 se verificaron contra el código antes de reescribirse
(doce agentes, seis preguntas con un pase adversarial cada una). Resultado: la
3 estaba en lo cierto y mi afirmación era falsa; la 2 resultó ser más trabajo
del que yo creía —el giro existe y hay que apagarlo, y eso obliga a un reloj
propio—; la 4 y la 5 resultaron **más fáciles** de lo previsto, porque
`resetAccumulation()` y `uEmission` ya existen.

### Primer pase visual del Tesseracto (2026-09-16)

Jonás vio el Tesseracto montado y dictó tres correcciones. Su veredicto del
checkpoint: *«la idea funciona»*, con el encargo explícito de **no tocar
geometría ni materiales** y de no avanzar a los otros cinco especímenes.

| # | Qué corrige | Dónde |
| --- | --- | --- |
| 12 | El bloom **deja de copiarse del System Map**. Fuerza 0.6 → 0.26 y radio 0.57 → 0.74; el umbral no se toca. Motivo: `UnrealBloomPass` mide su kernel en píxeles de PANTALLA, así que las mismas constantes sobre un espécimen mil veces más grande en área convierten la punta del trazo en una lámpara | §6, `observatory-scene.ts` |
| 13 | `FRAME_FILL` pasa a `BOUNDS_FILL` y de 0.78 a 0.91. El nombre anterior mentía: la fórmula parte de la esfera ENVOLVENTE, y un 4-cubo en alambre la toca en ocho vértices. Medido: ocupación media 58.5 % → 69.0 % (+17.9 %) | §5, `observatory-scene.ts` |
| 14 | Toda la instrumentación se agrupa en una **banda inferior** y el modo cine se parte en dos niveles: la identidad se queda al 30 % y los controles bajan al 6 %. El centro del cuadro queda libre por construcción, no por márgenes | §5, `observatory.css` |

**La banda del 70-85 % del §5 no puede cumplirse como está escrita, y es un
hallazgo, no un incumplimiento.** El Tesseracto no tiene ciclo: su trazo sí
—32 aristas en 18 s— pero su forma la deciden tres rotaciones 4D a ritmos
inconmensurables, así que la pose es cuasiperiódica. Su silueta respira un 31 %
entre el instante más estrecho y el más ancho, de modo que ninguna banda de
quince puntos la contiene entera. Medido sobre 12 000 instantes con
`BOUNDS_FILL = 0.91`: **media 69.0 %, mínimo 54.2 %, máximo 85.6 %** — la media
roza el suelo por abajo y el máximo el techo por arriba. Queda como decisión
abierta de Jonás: o se acepta el desbordamiento de los extremos, o se baja la
constante a costa de presencia media. La única promesa dura que sí está cerrada
es que **nunca toca el borde**, y la sostiene `observatory-framing.test.ts`.

Y una corrección de lo que yo había reportado en el checkpoint anterior: dije
que la leyenda `INSPECCIONAR` chocaba con «el avatar de la bandeja». No hay tal
avatar en el proyecto — era el indicador de desarrollo de Next, que no existe
en el build. Las capturas de este pase se toman contra `next start` por eso.

**Deuda anotada, a petición de Jonás:** los controles siguen siendo píldoras
genéricas. El siguiente pase los lleva a un lenguaje instrumental propio —líneas
finas, divisores, corchetes, estados tipográficos— y sólo entonces se juzga la
atmósfera mínima (campo espacial tenue, halo óptico ambiental, instrumentación
de borde). Ninguna de las dos cosas se toca hasta que bloom y encuadre tengan
veredicto.

### Apéndice — una discrepancia encontrada de paso

No afecta al Observatorio, pero conviene registrarla donde se vea:
`AGENTS.md` dice que `?no3d=0` entra por `useForcedEffects()`. El código dice
otra cosa — `getForcedSnapshot` (`lib/effects-mode.ts:178`) devuelve
`readStored(...) === "false"`, y su propio comentario es explícito: «`?no3d=0`
sólo retira el perfil ligero; no fuerza la escena». Consecuencia menor:
`navbar.spec.ts:28` (`/es/formacion?no3d=0`) no es un test de escena forzada,
aunque su nombre lo sugiera. Decisión de Jonás si se corrige el texto o el
código.

---

## 16. Estado de construcción

**Entrega 1 — hecha (2026-09-16).** `lib/observatory.ts` y su test: la tabla del
§6 como dato, la matemática de colocación que sale del hallazgo de la luz, la
base de cámara con su salvaguarda y `keyScreenDirection`. 19 tests propios;
`npm run check` verde con 279 tests en 41 archivos. **Ni un archivo existente
modificado** — y la razón por la que no cambia un píxel no es que `git diff`
salga vacío, que con ficheros sin rastrear no demuestra nada: es que **ningún
módulo de la aplicación los importa todavía**.

**Siguiente — el driver de uniformes y los contratos de datos.** La extracción
geométrica de `bodies.ts` que este documento anunciaba como primer paso resultó
ser casi un no-op (§13.1): `createBody` ya devuelve el espécimen aislado. El
trabajo real es escribir `uTime`, `uCamPos`, `uLightIntensity` y `uEmission` por
fotograma —y `uFocus` por evento— desde el bucle del Observatorio, y publicar
`userData` de contrato en los cinco cuerpos que no lo tienen (§8), que sí toca
`bodies.ts` de forma aditiva.

**Y después se PARA.** Con el primer espécimen montado —el Tesseracto— hay
captura y pase visual con Jonás antes de seguir. Ninguna palanca de §6 se
calibra a ojo de número: `keyAngle`, `keyAzimuth`, `environment`, `rim` y
`ORIGIN_DISTANCE_RADII` están declarados como pendientes en
`PENDING_VISUAL_CALIBRATION`, y esa lista sólo se vacía sobre capturas. La
pregunta que queda no la responde Vitest: *¿se siente como entrar a un
laboratorio espacial a estudiar un objeto de Jonás Orbit?*

---

*Estado: **aprobado con enmiendas** por Jonás el 2026-09-16, once enmiendas en
dos rondas más cuatro ajustes de precisión, todas incorporadas. Entrega 1 en
verde; el resto sin implementar.*
