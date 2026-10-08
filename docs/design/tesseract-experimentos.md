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
de borde).

### Pase de cromo instrumental (2026-09-16)

La deuda de arriba, saldada. Jonás dio la dirección con un boceto —`INSPECCIONAR`
sobre `[BLOOM] MATERIAL DATOS` con una regla bajo el activo— y el diagnóstico
literal: «visor Three.js premium más que instrumento de JONAS ORBIT […]
especialmente por los botones tipo píldora».

El dato que respaldaba su lectura, verificado: `border-radius: 999px` sobre un
control **vivo** no existía en ningún otro sitio del repositorio. Las otras tres
apariciones son una lista de etiquetas no interactiva, una insignia y CSS
muerto. Ésta era la única píldora del proyecto.

| # | Qué corrige | Dónde |
| --- | --- | --- |
| 15 | Los mandos pierden la caja. Cuatro signos en su lugar, ninguno inventado: corchete que se abre (`system-hud.tsx:81`, el `[ Enter ]`), regla de 1 px que se TRAZA con `scaleX`, pica de 1 × 0.7rem entre palabras, y el peso de la letra | §5, `observatory.css` |
| 16 | El pie pasa entero a `--font-mono`. Era el único rótulo de instrumento del sitio en tipografía de interfaz, y de ahí salía buena parte de la sensación de componente genérico | §5 |
| 17 | `INSPECCIONAR` deja de ser rótulo suelto y pasa a cabecera de aparato: la palabra y detrás una regla que se desvanece hasta el borde de la banda | §5 |

**El corchete tiene que verse y no oírse, y eso es contrato.** Va en spans
`aria-hidden` dentro del botón, nunca en un `::before`: el `content` de un
pseudoelemento SÍ entra en el cálculo del nombre accesible en Chromium, y el
mando pasaría a llamarse «[Bloom]» — lo leería así un lector de pantalla y
`tools/observatory-shot.mjs` dejaría de encontrarlo, sin que nada diera error en
un build. Lo fija `components/observatory-chrome.test.tsx`, que comprueba a la
vez que el texto visible es `[Bloom]` y que el nombre accesible es `Bloom`.

**El estado se lee sin color.** El ámbar sobrevive y sigue significando «canal
aislado», pero ya no es la señal: la señal son tres cambios de geometría
—corchetes, regla y peso de 400 a 650— que sobreviven a una captura en escala de
grises. Verificado desaturando la captura, no prometido. Y el peso es gratis en
ancho porque la tinta es monoespaciada, que es el motivo real de la enmienda 16.

**Dónde NO se quitó la caja: la ficha de `DATOS`.** Conserva su fondo a
propósito, contra la propuesta que ganó el panel. No es cromo, es una superficie
de lectura, y sólo existe mientras el instrumento está abierto; quitarle el
fondo pondría seis números claros sobre las aristas del espécimen justo en la
esquina por la que la figura se acerca al abrirse. La petición era retirar la
píldora de los MANDOS.

Dos hallazgos de paso: el bloque de 44 px de activación nunca dependió del
borde sino del `min-height` —medido en vivo, 44 × 104 px sin un píxel de tinta—,
y el visor era el único componente del repositorio que llamaba a
`window.matchMedia` sin guarda. Ahora lleva la misma que la galería de Edmunds,
y sin `matchMedia` no hay modo cine: la duda se resuelve dejando los controles
a la vista.

**Sigue pendiente y sin tocar:** la atmósfera mínima (campo espacial tenue, halo
óptico ambiental, instrumentación de borde), que Jonás dejó explícitamente para
después de aprobar objeto y UI.

### Pase de atmósfera mínima (2026-09-17)

Tres ingredientes y una lista de vetos, los dos dictados por Jonás: campo
estelar extremadamente tenue, halo ambiental frío casi imperceptible, y unas
pocas marcas de borde de 1 px. Nada de nebulosa, campo denso, rejilla,
coordenadas, círculos, retículas ni HUD. Su tesis, que es la que gobierna el
resultado: **el laboratorio no es una sala** — es la cámara, las herramientas y
la forma de inspeccionar, y el espacio puede seguir siendo infinito.

| # | Qué añade | Dónde |
| --- | --- | --- |
| 18 | `observatory-sky.ts`: cáscara **pegada a la cámara** —rotación pura, traslación cero— con campo estelar procedural y halo. Ni un uniforme de tiempo: el bucle es bajo demanda y el único movimiento que el cielo se permite es el de la mano | §3, §5 |
| 19 | Cuatro escuadras de 1 px en las esquinas, hermanas del cromo y no hijas. Sin texto: cualquier rótulo sería un dato inventado o el raíl de seis entrando por la puerta de atrás | §5 |
| 20 | El Observatorio pasa a honrar `lib/visual-bench.ts`, que gana el eje `atmosfera`. Con ello gana `--reloj`, la deuda que su propia herramienta reconocía | §12 |

**El determinismo no sale de quedarse en la página, sale de nombrar el
instante.** Las tres capturas A/B/C se toman en tres cargas con el reloj clavado
en 16.5 s, una de las poses que `lib/tesseract.ts` documenta como buenas.
`sampleTesseract` es función pura de los segundos, así que el mismo número da
los mismos dieciséis vértices bit a bit — hoy, la semana que viene y en otra
máquina. `elapsed` no puede darlo: se acumula de deltas de rAF. Medido sobre las
capturas entregadas: **el espécimen difiere un 0.01 % entre A y B.**

**El umbral del bloom no era la restricción, y ése fue mi primer error.** Vale
2.0 de radiancia lineal y cualquier cosa que un ojo llame «tenue» vive entre
0.006 y 0.03 — sesenta a trescientas veces por debajo. Quien restringe es la
figura: el canto más débil de la celda lejana del hipercubo está en HDR ≈ 0.0083.
Contra ese suelo se calibró el cielo, y el resultado medido es que la estrella
más brillante llega a sRGB 16.7, por debajo del cuerpo del cristal (p50 23).

**El halo se ancla a la LUZ y no al centro del cuadro**, y es la única decisión
del pase que interpreta el encargo en vez de transcribirlo. Se pidió «detrás del
Tesseracto»; en la pose del preset el Tesseracto está a contraluz (`keyAngle`
145°), así que la luz ESTÁ detrás. Anclarlo ahí resuelve además la trampa que
destapó la auditoría: un «negro azulado muy profundo» tipo #04070e es HDR ≈
0.0084, exactamente el nivel de la celda lejana, y un halo centrado sobre la
silueta borraría la jerarquía 4D que costó las versiones V2 y V3. Las dos
defensas son que el pico se queda en 0.0034 y que su máximo cae fuera de la
figura. Al orbitar, el halo se queda donde está la luz en vez de seguir al ojo.

**Dos errores míos corregidos sobre la captura, no sobre el papel.** El dither
del halo se derivó en el punto equivocado de la curva ACES: entre HDR 0.005 y
0.010 un escalón de sRGB son 0.001, pero el halo vive en 0.003, donde la curva
es mucho más plana y un escalón son ~0.0025. Con 0.0011 el fondo salía en
anillos concéntricos —justo el «círculo» vetado—: 155 cambios de nivel en 460 px
con mesetas planas. Con 0.0032 y aplicado sólo donde hay halo, 300. Y el segundo:
`bloomPass.setSize(w, h)` pisaba con píxeles CSS el tamaño efectivo que
`composer.setSize` ya había propagado, así que a dpr 2 los mips del bloom se
construían a media resolución. No se veía porque la herramienta captura a dpr 1
— la misma clase de coincidencia que escondió el marco del overlay a 1440 px.

**Y una lección que el repositorio ya tenía escrita y repitió igual.**
`tools/glsl-check.mjs` existe para cazar backticks dentro del GLSL, y dio verde
mientras `observatory-sky.ts` nacía con dos. Su propio comentario contaba que
eso ya había pasado —«el guardián daba verde porque sólo miraba el archivo de
Gargantúa»— y la primera vez se arregló la LISTA en vez del mecanismo. Ahora
descubre los archivos: un shader nuevo queda cubierto por existir.

### Cierre de los dos huecos de sistema (2026-09-17)

Los dos pendientes que se venían reportando desde el primer checkpoint, ambos
independientes del veredicto visual.

| # | Qué cierra | Dónde |
| --- | --- | --- |
| 21 | El contexto persistente se **libera** en las rutas del Observatorio. La enmienda 3 del §3 estaba escrita y sin construir: `COVERED_WORLDS` sólo congelaba el bucle, así que había **dos contextos WebGL vivos** en esta ruta | §3, O2 |
| 22 | El gate de capacidad del §9, que aquí no existía. El Observatorio montaba WebGL sin preguntar mientras el resto del sitio sí preguntaba | §9, O7 |

**La liberación va por booleano, no por `pathname`.** El efecto que construye la
escena depende de `isObservatoryPath(pathname)` y no del pathname: con el
pathname, la escena se destruiría y volvería a subir su geometría en CADA
navegación, que es lo contrario de tener una escena persistente. Con el
booleano, sólo se reejecuta al CRUZAR la frontera. Y el lienzo se retira del
DOM, que es lo que hace comprobable la liberación: el marcador de persistencia
de la suite tiene que **desaparecer**, al revés que en Miller, donde debe
sobrevivir.

**El gate degrada por falta de equipo, no por preferencia de movimiento.** Al
cablearlo apareció un conflicto real entre dos documentos ratificados: el
interruptor global escribe el perfil ligero al apagarse
(`effects-mode.ts:146`), así que un gate ingenuo retiraba el espécimen entero
al apagar el movimiento — y el O6 de este mismo documento pide lo contrario,
«con movimiento apagado, sin giro en reposo, transiciones instantáneas,
MANIPULACIÓN VIVA». No se puede manipular lo que no está. El gate filtra por
`reason`, de modo que `sin-webgl2`, `gpu-por-software`, `red-lenta` y
`memoria-corta` degradan, y `perfil-ligero` congela sin retirar.

⏳ **Queda una decisión abierta para Jonás**, y es suya: con ese filtro,
`?no3d=1` —la puerta documentada del perfil ligero y la que usa la auditoría de
Lighthouse por la regla 5— tampoco retira el 3D de esta ruta. Antes de este pase
no lo retiraba nadie porque no había gate ninguno, así que no es una regresión,
pero conviene decidirlo a la vista y no por omisión.

**Verificación.** `e2e/observatorio.spec.ts` cubre **O2, O6, O7, O8 (parcial),
O10 y O12**; O11 entra como unit en `lib/observatory.test.ts`. O1, O9 y O13
siguen sin escribirse porque necesitan la recepción o un segundo espécimen, y
ninguna de las dos cosas existe: escribirlos ahora sería escribir pruebas que
pasan porque no hay nada que probar. O8 va parcial por lo mismo — pide seis URLs
y sólo existe una.

Dos cosas que costaron una pasada cada una. El **build obsoleto**: el servidor
de Playwright sirve `.next`, así que editar el visor y volver a correr sin
reconstruir mide la versión anterior. Y la **ventana de medición del arrastre**:
con un bucle bajo demanda el fotograma sucio se dibuja DURANTE el gesto, así que
contar doce fotogramas al soltar mide cero — el mismo cero que dos líneas antes
significa lo contrario. La cuenta va alrededor del gesto, no después.

### Segundo pase de atmósfera — presencia (2026-09-17)

Jonás vio el A/B/C del pase anterior y su veredicto fue que las tres variantes
se sentían prácticamente iguales: *«la implementación puede existir
técnicamente, pero no está comunicando atmósfera visualmente»*. Y puso la
corrección de rumbo que gobierna este pase:

> «Mínima» no significa invisible. Quiero que C tenga una identidad espacial
> evidente manteniendo jerarquía: **Tesseracto 100 % / atmósfera ~30 % /
> instrumentación ~10-15 %**. La prueba de éxito es muy sencilla: si tengo que
> acercarme a la pantalla para descubrir qué cambió, sigue demasiado débil.

Con dos límites explícitos: no tocar el Tesseracto en absoluto —*«ya está
haciendo su trabajo; lo que está vacío es el mundo alrededor de él»*— y la misma
lista de vetos de siempre (grids, órbitas, coordenadas, nebulosas, retículas
centrales, texto técnico nuevo).

#### No era cuestión de gusto: la atmósfera no existía en la imagen

El pase anterior calibró los tres ingredientes contra el «suelo del espécimen»
—HDR 0.0083, el canto más débil de la celda lejana— y le impuso al halo la mitad
de ese número. Pasado por la cadena real de salida (ACES a exposición 0.95, que
internamente divide por 0.6, más la codificación sRGB del `OutputPass`), HDR
0.0034 sale a **sRGB 0, 0, 1**.

Y ese 0,0,1 es el PICO, que además cae casi fuera de cuadro: la luz de este
preset está a 35° del eje de cámara y el cuadro llega a 30° por su lado ancho.
Lo que se veía era el hombro, `cos³(35°) = 0.55` de ese uno: **sRGB 0, 0, 0.**

O sea que la discusión sobre si «se notaba poco» era una discusión sobre una
imagen en la que no había nada, y no había forma de saberlo leyendo el código.

**La lección, que vale para todo el proyecto: un nivel en HDR no es un nivel en
pantalla.** Cerca del negro la curva ACES es muy plana y comprime tres décadas
de radiancia lineal en los diez primeros valores de sRGB. Acotar «por debajo de
tal cosa» en unidades lineales no acota la imagen: la borra. Y un test escrito
en la misma unidad que el error no puede verlo — el del pase anterior pasaba en
verde sobre un cielo inexistente.

| # | Qué cambia | Dónde |
| --- | --- | --- |
| 23 | El halo pasa de un coseno elevado a **dos lóbulos sobre el eje de la luz** con radio exterior finito: uno ancho que muere a 66° y un núcleo de petróleo que muere a 40°. El coseno elevado no llega nunca a cero, así que levantaba el cuadro entero por igual en vez de dibujar una masa — y morir es la mitad del encargo | §5 |
| 24 | El campo estelar recupera **suelo de magnitud** y **perfil medido en ángulo**. Sin suelo, el exponente 14 dejaba el 90 % del campo por debajo de un dígito de sRGB; con el perfil atado a la escala, la capa fina daba estrellas de 0.2 px que el rasterizador pillaba o no según dónde cayera el centro del píxel | §5 |
| 25 | La instrumentación de borde pasa de cuatro escuadras iguales a **cuatro asimétricas más tres signos** —calibre, fiducial y marcas cortas—, cada uno en un borde y a una altura distinta | §5 |

#### Lo que dicen las capturas

Medido con `tools/observatory-atmosfera.mjs`, que nace en este pase y mide en la
única unidad en la que se puede discutir con alguien que está delante de un
monitor: niveles de sRGB sobre el PNG.

| | Antes | Ahora |
| --- | --- | --- |
| Salto A→C, media | — | **+16.6 niveles** |
| Fondo que cambia ≥ 12 niveles | 0 % | **47.3 %** |
| Atmósfera (p99 del fondo) frente al objeto | 0 % | **23 %** |
| Estrellas de referencia en cuadro | 1 | **3** |
| Estrellas medias / débiles | 11 / 83 | **45 / 282** |
| Meseta mayor en la pendiente del halo | — | 14 px (sin anillos) |

El mapa del fondo en tercios, que es el sandwich que dibujó Jonás puesto en
números: **45 · 43 · 15 / 23 · 19 · 5 / 8 · 5 · 1.** Masa fría entrando por la
esquina de la luz, azul muy oscuro detrás de la figura, negro real en la esquina
opuesta.

#### El número que dijo una mentira, y por qué la imagen mandó

La primera versión de la métrica medía el contraste **con signo** de los cantos
flojos de la celda lejana contra su fondo local, y anunciaba una catástrofe: de
+7.8 a −1.3 niveles, con la mitad de los cantos «invertidos». Leído así, este
pase se habría cargado la jerarquía 4D que costó las versiones V2 y V3.

La captura decía lo contrario. **Contra negro, un canto casi negro es
invisible; contra el campo, es una línea nítida.** Lo que se había medido era el
cambio de POLARIDAD, no el de legibilidad: el ojo lee el valor absoluto del
contraste y el signo sólo dice si el canto brilla o recorta. Medido bien:

    |contraste| en A   7.79 niveles
    |contraste| en C   8.42 niveles

La celda lejana se lee **algo mejor** que antes, no peor. Lo que sí cambia —y
es una decisión de arte que le corresponde a Jonás, no una medida— es que el
49.5 % de esos cantos pasa de brillar a recortarse. El hipercubo sigue separando
sus dos celdas; la lejana lo hace ahora en negativo.

La defensa que sigue en pie del pase anterior es el ANCLAJE: con el halo atado a
la dirección de la luz, su máximo cae en la esquina del cuadro y el espécimen
vive en el hombro del lóbulo. Anclarlo a la vista lo pondría justo encima de la
silueta y entonces sí habría que elegir entre atmósfera y jerarquía.

#### Tres trampas de medida, y las tres daban verde o rojo por lo que no era

1. **Calibrar en HDR lo que se juzga en sRGB.** Descrito arriba. Ahora el test
   del cielo pasa por la cadena completa y afirma niveles de pantalla, que es la
   comprobación que habría cazado el fallo el primer día.
2. **Contar cambios de nivel para detectar bandeo.** El umbral era inventado y
   marcaba en rojo un degradado perfectamente dithered. La medida buena es la
   meseta más larga — pero sólo **en la pendiente**: el negro real del otro lado
   del halo es un tramo enorme de ceros que no es un degradado, y la cima DE LA
   LÍNEA también se cuantiza plana, porque donde la horizontal pasa por su punto
   más cercano al centro del halo la derivada es cero. Una cumbre de 116 px a
   valor 76 no es un anillo, es ese punto — el pico del lóbulo ni siquiera está
   en cuadro: con la luz a 35° del eje y la media diagonal del cuadro en 35.4°,
   cae justo detrás de la esquina.
3. **Dos servidores peleándose por el puerto.** Un `next start` anterior
   sobrevivió al `pkill`, se quedó con el 3100 y sirvió manifiestos obsoletos
   contra el `.next` recién construido: los chunks daban 500, React no hidrataba
   y la página se quedaba en el respaldo plano del §9. La captura fallaba con
   «no aparece el canvas», que es exactamente el síntoma de un gate de capacidad
   mal cableado. Es la misma familia que el build obsoleto del pase anterior: en
   este proyecto, **antes de creerse una captura hay que saber qué build la
   sirvió.**

*Estado: pendiente del veredicto visual de Jonás sobre el A/B/C.*

---

### Atmósfera aprobada, y la prueba en movimiento (2026-09-17)

Jonás aprobó la dirección —*«ya no tengo que buscar el efecto: se siente
inmediatamente que el Tesseracto está suspendido en un espacio profundo
observado mediante un instrumento»*— con una instrucción tan importante como la
aprobación: **no seguir subiendo la intensidad.** Y congeló geometría, bloom,
encuadre, cromo y campo estelar.

Quedaron dos cosas: un micro A/B del reparto del azul, y la única pregunta que
una imagen fija no puede contestar.

#### El micro A/B: menos «foco azul», mismo pico

El diagnóstico fue que la masa rozaba por momentos la sensación de *«una luz
azul entrando desde una esquina»* en vez de *«un medio espacial detrás de la
muestra»*. Tres palancas, ninguna de intensidad:

| | Actual | Variante |
| --- | --- | --- |
| Perfil del lóbulo ancho | `s²` | `s^1.5` |
| Pico del halo | 0.105 | 0.098 |
| Núcleo de petróleo | 0.052 | 0.042 |
| Tinte ancho / núcleo | (0.20, 0.46, 0.90) / (0.06, 0.58, 0.74) | (0.28, 0.46, 0.80) / (0.22, 0.48, 0.62) |

El exponente es la pieza clave y no es intensidad: bajar de 2 a 1.5 **no mueve
el pico** —en el máximo el `smoothstep` vale 1 y 1 elevado a cualquier cosa
sigue siendo 1— ni mueve el cero, porque el radio exterior no cambia. Lo único
que hace es engordar el cuerpo del degradado entre los dos extremos. Medido:

| Mediana de luma del fondo | Actual | Variante |
| --- | --- | --- |
| Pico (esquina superior izquierda) | 45.9 | **44.8** |
| Centro del cuadro | 19.0 | **22.9** |
| Columna derecha, franja media | 4.8 | **9.4** |
| Extremo inferior derecho | 0.1 | **1.0** |
| Saturación media en el pico | 79.9 % | **57.2 %** |

O sea: el pico baja un punto, la masa se extiende hacia el centro y la derecha,
el extremo inferior derecho sigue siendo negro real (1 de 255) y el cian del
pico cae veintitrés puntos. La relación pico/centro pasa de 2.38 a 1.95, que es
exactamente la diferencia entre «foco» y «medio».

#### La prueba en movimiento

> «Si las estrellas están screen-locked de una manera que el ojo detecte durante
> la órbita, la ilusión se rompe.»

Un cielo infinito es **rotación pura y traslación cero**, y eso son dos
comportamientos OPUESTOS que hay que comprobar por separado. Al orbitar, la
cámara rota contra una cáscara que no rota, así que el campo tiene que barrer el
cuadro. Al hacer zoom, la cáscara se traslada CON la cámara, así que el campo no
puede moverse ni escalar. Cualquiera de las dos sola se puede falsear: un fondo
pegado a la pantalla también da cero en el zoom.

`tools/observatory-shot.mjs --orbita` graba el clip sin tocar un solo
instrumento y deja diez fotogramas de contacto a 10° de cámara;
`observatory-atmosfera.mjs --movimiento` los mide.

    barrido en órbita    217 px por cada 10° de cámara (6 de 9 pasos con señal)
    marcas de borde      21.66 niveles de cambio · control sin marcas 22.29
    zoom                 mediana 0.00 niveles · 88.5 % del cuadro sin cambiar

**217 px medidos contra 225 px que predice la trigonometría** (10° ÷ 0.000776
rad por píxel): un 4 % de diferencia, o sea que el cielo se mueve exactamente lo
que se mueve el espacio. En el zoom no cambia ni un nivel en el 88.5 % del
cuadro. Y las marcas de borde cambian lo mismo que una franja vecina SIN marcas
—21.66 contra 22.29—, así que todo ese cambio es el halo pasando por debajo:
siguen clavadas mientras el espécimen gira.

#### Tres métricas mías que dijeron lo que no era

Las tres daban un veredicto rotundo y las tres estaban mal planteadas. Van aquí
porque el patrón se repite y es el mismo: **una medida sobre una escena donde el
espécimen cambia de tamaño acaba midiendo el espécimen.**

1. **«El cielo se mueve con el zoom: 160 px».** La correlación buscaba el
   desplazamiento en un parche lateral; al acercarse, el Tesseracto crece hasta
   tragarse ese parche y la correlación pasa a seguirlo a él. La medida correcta
   para el zoom no es correlacionar sino RESTAR: la respuesta esperada es
   «idéntico», y eso se comprueba píxel a píxel.
2. **«Las marcas derivan 21.66 niveles».** Detrás de las marcas está el cielo,
   que durante la órbita cambia entero. Sin una franja de control la cifra no
   significa nada.
3. **«El barrido se detiene en el paso 7».** No se detiene: el halo ya había
   barrido fuera de la banda de muestreo y sólo quedaba negro, así que la
   superficie de coste era plana y el mínimo caía donde fuera. Ahora cada paso
   informa de cuánto mejora el mejor encaje respecto de no desplazar nada, y por
   debajo de un cuarto no cuenta.

#### Lo que el clip deja ver, y que no es un defecto

Al orbitar más de unos 60° desde la pose del preset, la masa fría sale de cuadro
y el fondo se queda casi en negro con estrellas. Es la consecuencia directa del
anclaje a la luz —y la que hace que el halo se comporte como una cosa del
espacio en vez de como una viñeta—, pero significa que la atmósfera no está
presente desde todos los ángulos. Queda anotado para el veredicto: si molesta,
la respuesta no es subir el halo sino darle un suelo independiente de la
dirección de la luz, y eso es un ingrediente nuevo que hoy está vetado.

*Estado: dirección aprobada. Pendiente elegir entre halo actual y variante, y el
veredicto sobre el clip.*

---

### Tesseracto congelado · Endurance como prueba de generalización (2026-09-17)

Jonás eligió la variante nueva del halo —menos cian, más extendida— y **congeló
el Tesseracto**: geometría, materiales, encuadre, bloom, cromo, estrellas,
atmósfera y comportamiento en movimiento. No se vuelve a tocar.

Y puso el siguiente checkpoint con una pregunta que no es «¿se ve bonita?»:

> ¿Parecen dos objetos radicalmente distintos estudiados por el mismo
> instrumento? Si sí, hemos demostrado que la arquitectura visual escala. Si
> necesita que cambiemos completamente todo el fondo, UI y framing, significará
> que hemos construido la página del Tesseracto.

Por eso el segundo espécimen es la Endurance y no otro planeta: es el opuesto
exacto —mecánica, concreta, modular, material— del primero.

#### Lo que hizo falta, y lo que NO

Reutiliza sin tocar: cielo, halo, estrellas, instrumentación de borde, cromo,
gestos, modo cine, contrato de `DATOS`, respaldo plano y liberación del contexto
persistente. Lo único propio es su preset.

| # | Qué cambia | Dónde |
| --- | --- | --- |
| 26 | `SceneBody.animateAt(seconds)`: el movimiento PROPIO sin el giro genérico. `spinAt` sigue intacto para el System Map | §3 |
| 27 | `boundsFill` pasa a ser campo del preset. **No se hereda**: la relación entre esfera envolvente y silueta es propia de cada figura | §5, §6 |
| 28 | La ficha de `DATOS` sube de 0.72 a 0.94 de alfa. Una superficie de lectura no puede depender de lo que tenga detrás | §5 |
| 29 | El pie despeja la bandeja global por debajo de 34 rem. Defecto anterior a Endurance | §9 |

**El giro genérico y la actividad propia son dos cosas, y el Tesseracto lo
escondía.** El §3 pide apagar el giro en reposo y conservar lo que es contenido
—reconfiguración, oleaje, RCS y balizas—, pero `spinAt` hacía las dos con el
mismo reloj. Con el Tesseracto daba igual: su `SPIN_RATE` vale 0. La Endurance
gira a 0.016 rad/s y es el primer cuerpo donde llamar al método equivocado se
ve. De ahí `animateAt`, que es la segunda mitad de `spinAt` sin la primera.

**`boundsFill` no se hereda, y se midió.** Con el 0.91 del Tesseracto la
Endurance ocupaba el 58.3 % del alto contra el 70-85 % que pide el §5, porque su
esfera envolvente la fijan las puntas de los radiadores — lo más fino que tiene
y además fuera del plano de la silueta. Con 1.15 sube a **76.9 %**. Que el valor
pase de uno significa exactamente que la envolvente se sale del cuadro y la nave
no. Y basta una medida, al revés que con el Tesseracto: sin giro genérico, lo
único que mueve su silueta es la corrección de actitud de ±0.4°.

**Sus datos no se transcriben.** `DATOS` consume `enduranceArchitecture` del
propio modelo: 12 módulos, 4 grupos, 4 brazos, 4 campanas de motor, 4
radiadores, 2 Rangers atracadas, 2 módulos de descenso, 10 toberas RCS, 2
encendidas, 9 luces cálidas, 4 técnicas. Ni un número escrito a mano, que es la
regla del §8.

#### Lo que el segundo espécimen destapó, que es para lo que servía

1. **La ficha de `DATOS` dejaba pasar el espécimen.** Con 0.72 de alfa
   funcionaba sobre un cristal casi negro; sobre aluminio claro a plena luz, los
   módulos cruzaban por debajo del texto y se llevaban por delante dos filas.
   Sube a 0.94 — sin `backdrop-filter`, que costaría una pasada de composición
   por fotograma sobre un canvas que acaba de conseguir llegar a cero.
2. **A 375 px la bandeja global tapaba `MATERIAL` y `DATOS`.** Defecto anterior
   a Endurance —idéntico en los dos especímenes— que sobrevivió porque O10
   comprueba que cada mando MIDA 44 px, y eso es otra cosa que poder pulsarlo:
   la caja estaba perfecta y encima había otro elemento. Lo caza ahora
   `O10 bis`, con `elementFromPoint` sobre el centro de cada mando y en los dos
   especímenes.

#### La diferencia que hay que decidir: la Endurance no tiene halo en cuadro

No es un fallo ni una omisión. El halo es el resplandor de **la única luz del
mundo**, y dónde cae depende del `keyAngle` de cada preset:

| | keyAngle | Ángulo luz-cámara | Halo en cuadro |
| --- | --- | --- | --- |
| Tesseracto | 145° (contraluz) | 35° | sí, entra por la esquina |
| Endurance | 55° (tres cuartos) | 125° | no: la luz queda a la espalda |

Con una clave de tres cuartos, Gargantúa está detrás del visitante, así que
mirar hacia la muestra es mirar hacia el vacío. El cielo es el mismo objeto con
el mismo shader; lo que cambia es dónde se ha sentado uno. La Endurance conserva
campo estelar, instrumentación de borde y cromo — todo el laboratorio— sobre
negro real.

**No se toca sin decisión suya.** Si prefiere atmósfera en todas las muestras,
la solución NO es subir el halo —lo congelamos— sino darle un suelo
independiente de la dirección de la luz, y eso es un ingrediente nuevo. La
alternativa es mover el `keyAngle` de la Endurance hacia el contraluz, y eso
cambia lo que su material revela, que es justamente lo que el preset protege.

#### Y el cielo se mueve igual en los dos, medido de dos formas

    Tesseracto   barrido 216 px por cada 10° de cámara  (geometría: 225)
    Endurance    solape de encendidos tras 10°: 3.2 %
    los dos      zoom: mediana 0.00 niveles, 88 % del cielo sin cambiar

Hacen falta dos métricas porque cada una es ciega donde la otra ve. La
**correlación** necesita estructura continua: sobre el halo del Tesseracto
funciona, y sobre un cielo de sólo estrellas no encuentra mínimo. El **solape de
encendidos** —qué fracción de los píxeles de cielo encendidos sigue encendida en
el mismo sitio— funciona con puntos y no significa nada sobre un degradado,
donde el 83 % de la banda cae en el mismo rango de brillo aunque haya barrido
doscientos píxeles. La herramienta declara cuál aplica en cada caso.

Y la banda de muestreo **se elige corriendo la correlación en cada candidata y
quedándose con la de más confianza**. Los dos criterios que probé antes eligen
mal, y los dos costaron una lectura falsa: «la más vacía» escogió una franja de
cromo en la Endurance —97 % de solape, que parecía un cielo clavado y eran
letras— y «la que más cielo tiene» escogió la MESETA del halo del Tesseracto,
donde hay mucha luz y ningún relieve, y hundió la confianza del 65 % al 3 %.

*Estado: pendiente del veredicto visual sobre Tesseracto contra Endurance.*

---

### Primera interfaz completa del Observatorio (2026-09-17)

Jonás dio por pasado el test de generalización —*«dos especímenes radicalmente
distintos observados por el mismo instrumento»*— y con él dos decisiones que
cierran el pase anterior:

> No añadas un halo universal a Endurance; la diferencia de atmósfera derivada de
> la condición de observación me parece correcta y evita uniformar todos los
> objetos.

Y el Tesseracto queda **congelado** con la variante del halo elegida. De
Endurance queda una sola cosa pendiente: validar su iluminación en movimiento a
tamaño completo, sin pase grande antes de la interfaz.

La interfaz se diseña sobre **dos casos reales y opuestos** a propósito. Era la
razón de montar Endurance antes que el raíl: una UI validada sólo contra el
Tesseracto sería la página del Tesseracto.

| # | Qué añade | Dónde |
| --- | --- | --- |
| 30 | Catálogo de seis especímenes en el borde izquierdo: cifras en reposo, nombre al apuntar o enfocar, activo marcado por pica, peso y tono | §5 |
| 31 | Identidad de aparato: `01 / 06`, nombre y descriptor del ESPÉCIMEN | §5 |
| 32 | Cambio de muestra dentro del laboratorio con `key` por espécimen: cámara, zoom e instrumentos vuelven al preset de la nueva | §2, §5 |
| 33 | Salida al índice integrada en el instrumento, con rastro `Experimentos / Observatorio` | §5 |
| 34 | `REGISTRO`: ficha editorial en cinco secciones, desde el MDX del espécimen | §8 |
| 35 | El calibre del borde izquierdo se retira: ese borde lo ocupa el catálogo | §5 |

#### Las dos profundidades, y la frontera entre ellas

    DATOS      → el objeto como construcción técnica   (medido del modelo)
    REGISTRO   → el objeto como experimento de diseño  (escrito en el MDX)

La separación es el punto entero del instrumento y no se puede relajar. `DATOS`
no declara ni una constante de conteo: recorre el modelo. `REGISTRO` no lleva ni
una cifra, y esa regla es la que lo protege — en cuanto aparezca un número ahí,
alguien tendrá que decidir si está medido o escrito a mano, que es exactamente
la pregunta que el §8 existe para que no haya que hacerse.

Por eso el registro vive en el MDX del mundo y no en `worlds.data.ts` (regla 4)
ni en el componente, y por eso es OPCIONAL: los cuatro especímenes sin montar no
tienen registro y el mando sencillamente no aparece. Un botón que abre una ficha
vacía es la regla 8 incumplida por la puerta de la interfaz.

**Y el bloque describe el ESPÉCIMEN, no la sección.** Todo lo demás del MDX de
`tesseract` habla de «Experimentos» —«cosas que construyo para explorar una
idea»— y eso bajo el nombre del Tesseracto habla de otra cosa. De ahí
`observatory.descriptor` y `observatory.registro`, que son la primera prosa del
proyecto que se refiere al objeto y no a su sección.

⚠ **El texto de los dos registros es un borrador mío.** Está sacado de lo que
realmente pasó —está todo documentado en este archivo y en
`world-visual-language.md`—, pero es portafolio y es su voz. Pendiente de que
Jonás lo reescriba.

#### El catálogo: la trampa de accesibilidad del diseño que pidió

En reposo se ven seis cifras y el nombre aparece al apuntar. Eso tiene una
consecuencia que no se ve: si el nombre se ocultara con `display: none` o
`visibility: hidden` saldría del árbol de accesibilidad y el laboratorio tendría
**seis enlaces llamados «01», «02»…** — un lector de pantalla leería una lista de
números y ninguna muestra.

Se oculta con opacidad y se saca del flujo con posición absoluta: el enlace
conserva su nombre accesible y la columna conserva su ancho. El test comprueba
justamente lo que el ojo no ve — `getByRole("link", { name: "Endurance" })`.

Las cuatro sin montar son `<span aria-disabled>` y no enlaces muertos, y siguen
en el catálogo: el laboratorio tiene seis muestras y enseñar cinco mentiría
sobre su tamaño. Gargantúa entra también, aunque no tenga malla ni preset,
porque su ausencia escondería que se observa por otro contrato (§7).

El activo se marca por **geometría y tipografía** —pica de 1 × 0.7 rem, peso 650
y tono ámbar— y no despliega su nombre: ya está escrito en grande dos líneas más
arriba, y repetirlo convertía el raíl en una etiqueta redundante.

#### El cambio de muestra no hereda estado, y no se cumplía solo

La cámara sí se reinicia gratis: al cambiar el `id` el efecto reconstruye la
escena desde el preset. Los instrumentos no. Entre dos rutas con el mismo árbol
**React reutiliza la instancia**, así que `bloom`, `emission` y la ficha abierta
sobreviven al salto: dejar el Tesseracto sin bloom y abrir Endurance sin bloom,
que es la petición literal del encargo dicha al revés.

Lo resuelve un `key` por espécimen en la ruta. No rompe ningún tipo ni ninguna
unidad al quitarlo — sólo hace que una muestra se presente con el material de la
anterior— así que lo sujeta un e2e que apaga el bloom, salta por el raíl y
comprueba que vuelve encendido.

#### Lo que la interfaz nueva destapó en responsive

1. **El registro se salía por la derecha a 375 px.** Hereda `align-self:
   flex-start` de la ficha, y dentro de una columna flexible eso hace que la caja
   se ajuste a su contenido: la rejilla resolvía `auto-fit` contra su ancho
   máximo y seguía pidiendo dos columnas de 15 rem. Estirada cae a una sola.
2. **El cuarto instrumento volvió a acercar el banco a la bandeja global.**
   Comprobado con `elementFromPoint` sobre los seis controles en 375, 768 y 1440:
   todos alcanzables. Es la prueba que el pase anterior tuvo que inventar porque
   medir la caja de un botón no dice si se puede pulsar.

#### Lo que NO se ha hecho

Ranger, Miller, Edmunds y Gargantúa siguen sin montar y sin contenido; sólo
aparecen en el catálogo como estados no disponibles. La recepción
`/es/experimentos` sigue intacta y fuera de alcance.

*Estado: pendiente del veredicto visual sobre la composición.*

---

### Pase de UX: densidad, descubribilidad y móvil (2026-09-17)

La dirección de escritorio quedó aprobada conceptualmente —cabecera, salida,
banco y raíl pertenecen al mismo instrumento— con tres correcciones. Las dos
primeras son ajustes; la tercera es un rediseño.

| # | Qué cambia | Dónde |
| --- | --- | --- |
| 36 | `REGISTRO` enseña UNA de las cinco secciones, con pestañas reales (`tablist`/`tab`/`tabpanel`) y navegación por flechas | §5, §10 |
| 37 | El raíl sube su legibilidad en reposo y separa tres estados: activo, disponible y no montado | §5 |
| 38 | Móvil deja de imitar a escritorio: hoja inferior de lectura, paso compacto `‹ 02 / 06 ›` y retirada del cromo secundario | §9 |

#### «Reduce la densidad» no es «hazlo más pequeño», y lo hice mal primero

Con los cinco bloques puestos el panel era el segundo protagonista del cuadro:
el ojo empezaba a leer en vez de seguir mirando el objeto. La corrección es
enseñar una sección a la vez, con las cinco como navegación interna.

Pero al primer intento bajé las dos cosas —densidad Y tamaño— y el panel pasó a
leerse como un pie de foto: 640 × 150 px, el 7 % del cuadro. El encargo decía
literalmente *«no lo haría mucho más pequeño; reduciría su densidad»*. Con un
suelo de 10.5 rem la superficie vuelve a ser una ficha de lectura estable —que
además no salta de alto al cambiar de sección— y lo que baja es cuánto texto hay
dentro: **de 736 × 380 a 640 × 168**, con una quinta parte de las palabras.

Las pestañas son el patrón ARIA completo y no cinco botones que conmutan: con
tabulador roving hay UNA parada antes del texto en vez de cinco, y las flechas
mueven selección y foco juntos. Hablan el idioma del banco —palabras
monoespaciadas separadas por picas, activa en ámbar con su filete— pero **no
llevan corchetes**: el corchete significa «instrumento abierto» y esto son
secciones, no instrumentos.

#### El raíl era elegante y poco descubrible

En reposo tiene que leerse de un vistazo como un índice de SEIS muestras. Las no
montadas pasan de 0.15 a 0.3 de opacidad —con la cifra tachada— porque también
tienen que CONTARSE: son las que dicen que el laboratorio tiene seis sitios. Las
disponibles suben a 0.62 y el cuerpo de 0.6 a 0.68 rem. Lo que no sube es la
presencia del bloque: siguen siendo seis cifras pequeñas en el borde.

#### Móvil: dos estados en vez de los dos a la vez

El diagnóstico fue exacto — a 375 px todo CABÍA y nada funcionaba. **Caber no es
funcionar.**

    OBSERVAR        el objeto domina
    LEER REGISTRO   el texto domina, temporalmente

Tres decisiones, y ninguna es un margen:

1. **El raíl vertical desaparece** y lo sustituye `‹ 02 / 06 ›` sobre el nombre.
   No es una preferencia de tamaño: el raíl revela el nombre al APUNTAR, y en
   una pantalla táctil no existe apuntar — la columna quedaría como seis cifras
   mudas que nadie puede interrogar. Las dos presentaciones existen a la vez en
   el DOM y se excluyen con `display: none`, que **sí** saca del árbol de
   accesibilidad, así que hay siempre una sola navegación de especímenes
   expuesta y nunca dos.
2. **La ficha se convierte en hoja inferior**: 55 vh con desplazamiento propio y
   velo sobre el espécimen. El velo sale de una sombra de 100 vmax en vez de un
   elemento nuevo — ni un nodo más para oscurecer lo de detrás. Medido: el
   espécimen baja de luma 74 a 43 y sigue ahí.
3. **Con la hoja abierta se retira todo lo demás**: pista de manipulación,
   `Reajustar`, banco de instrumentos y paso entre muestras. Como la hoja tapa
   el banco —incluido el mando que la abrió— lleva su propia cabecera con la
   salida, que en escritorio está oculta porque allí se cierra con el instrumento.

**El espécimen no se mueve.** No se desplaza ni se reencuadra al abrir un panel,
y eso es contrato: si la capa editorial moviera la cámara, la escena tendría una
pose distinta según el estado de la interfaz.

#### Tres cosas que sólo aparecieron al medir

1. **La hoja se quedaba en 32 vh.** Con una sección a la vez el contenido es
   corto, así que el techo de 62 vh no hacía nada y la hoja salía como una tira.
   El suelo de 55 vh es lo que la convierte en zona de lectura, y de paso evita
   que cambiar de sección la haga saltar.
2. **El contador se salía por la izquierda en modo lectura.** El desplazamiento
   negativo que alinea la flecha estaba en la FILA, así que al ocultar las
   flechas seguía tirando del `02 / 06` fuera del margen. Ahora vive en la
   flecha y desaparece con ella.
3. **Creí que el velo no funcionaba.** La captura parecía igual de brillante y
   la medida decía lo contrario: 73.9 → 42.9 de luma sobre la zona de la hoja.
   Comparar dos imágenes de memoria no vale; la primera medición tampoco valía,
   porque su ventana incluía filas que ya eran hoja.

*Estado: pendiente del veredicto sobre las cuatro capturas.*

---

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

---

### La recepción y el encendido del instrumento (2026-09-17)

Jonás fijó la dirección tras una ronda de cinco conceptos juzgados contra el
código: **A · Encendido del instrumento + D · Protocolo de montaje**, con un
gesto propio llamado `ACQUISITION LOCK`. Quedan fuera C (la bandeja) y B (el
tramo final de cámara), este último aplazado hasta ver funcionando la
experiencia básica: *«primero quiero comprobar si el cambio ACQUIRING →
STANDBY → NOMINAL ya tiene suficiente fuerza por sí mismo»*.

> **El principio que ordena este pase, en sus palabras:** hay dos acciones
> distintas en Jonas Orbit —**viajar** a Experimentos y **operar** Experimentos—.
> El viaje desde el System Map sigue siendo la travesía. Entrar al Observatorio
> no es otro viaje: el visitante ya llegó al lugar y lo que hace es **encender
> un aparato**.

#### El diagnóstico, y por qué el laboratorio se sentía un modal

No faltaba un viaje. Faltaban un estado y una puerta, y había un defecto:

1. **No había puerta.** Ni un solo enlace del repositorio apuntaba a
   `/es/experimentos/observatorio/*` — el único existente era el raíl interno
   del propio visor. Se entraba tecleando la URL, que además no estaba en
   `app/sitemap.ts`.
2. **No había recepción.** `/es/experimentos` la servía la plantilla editorial
   común, que es exactamente lo que el §4 dice que no debe ser.
3. **Y la causa del «modal»:** la cara servida y el visor eran **hermanos** en
   el mismo `<main>`, y el visor no la sustituía: la **tapaba** con
   `.observatory { position: fixed; inset: 0; background: #000 }` en la
   hidratación. Una superficie opaca que aparece de golpe sobre una página viva
   es la definición de un modal. `.observatory-route` no tenía además **ni una
   regla de CSS** en todo el repositorio.

Tres creencias que el código desmintió y conviene no repetir: la liberación del
contexto persistente por ruta **ya existe** (`isObservatoryPath`,
`lib/world-route.ts:69`, con el JSX devolviendo `null`); `tesseract` ya estaba
en `COVERED_WORLDS`; y `forceContextLoss` sigue sin aparecer en ningún archivo
fuente.

#### La cadena, golpe a golpe

| t | qué pasa | quién lo hace |
| --- | --- | --- |
| — | recepción instrumental: vestíbulo + índice de seis | `components/experiments-page.tsx` |
| 0 | clic en una fila `LISTO`; `preventDefault` y arranca el protocolo | `experiments-index.tsx` |
| 0 | **empieza a descargarse `observatory-scene`**, si hay equipo | `import()` en el manejador |
| 0–0,42 s | `ADQUIRIENDO` · el vestíbulo se va a negro, el resto del catálogo se retira | CSS `[data-acquiring]` |
| 0,42–0,76 s | `BLOQUEO` | |
| 0,76–1,08 s | `MONTANDO` | |
| 1,08 s | `router.push` **por temporizador**, nunca desde un fotograma | |
| llegada | `INSTRUMENTO · EN ESPERA`: cara servida estilada, esquema del cuerpo, mandos `no disponible` | `observatory-face` |
| primer fotograma | `onFirstFrame` → `data-state="nominal"`: el canvas sube de 0 a 1, el negro llega con él, el cromo deja de ser `inert` | `observatory-scene.ts` |

**El protocolo no es decoración: es el tiempo que el aparato tarda de todos
modos.** Mientras se leen las tres palabras, los ~250 KB del instrumento ya
viajan por el cable. Con el movimiento apagado no hay protocolo — el
interruptor único manda aquí igual que en todo lo demás.

#### Cinco reglas que salen de este pase

1. **El aviso de llegada va después de `composer.render()`, no en el `.then()`
   del import.** Entre construir la escena y pintarla hay una compilación de
   shaders que en un equipo modesto se mide en cientos de milisegundos: encender
   el cromo con lo primero enseña un rectángulo negro con mandos encima.
2. **Exactamente UNA de las dos superficies está viva.** En espera manda la cara
   servida y el cromo va `inert`; encendido es al revés. Las dos dicen las
   mismas cosas —nombre y salida—, así que dejarlas vivas duplica cada nombre
   accesible y pone una parada de tabulador invisible bajo un canvas opaco. Ese
   fallo existía antes de este pase.
3. **Una tarjeta que navega copia `activate()` entero, `preventDefault`
   incluido.** `useWorldNavigation` no lo hace; quien lo hace es
   `system-map.tsx:129`. Sin esas dos líneas el enlace navega en el mismo tick.
4. **Atenuar una capa no la oscurece: la vuelve translúcida.** Bajar el
   vestíbulo al 32 % durante la adquisición dejaba pasar la nebulosa general del
   sitio: la sala se apagaba y el fondo se encendía. La sala se apaga **contra
   un velo negro**, que es la razón de los tres z-index de `experiments-page.css`.
5. **El esquema no llena su caja.** `FlatWorldBody` traza dentro de su `viewBox`
   con aire alrededor, así que una caja «del tamaño del espécimen» da un dibujo
   la mitad de pequeño. Calibrado en pantalla a 88 vmin para que el relevo se
   lea como la misma cosa cambiando de representación.

#### Decisiones de montaje

- **La recepción entra por la cascada de `app/[locale]/[mundo]/page.tsx`**, como
  ya hacen Sobre mí, Miller y Edmunds, y no como carpeta a medida: la ruta no
  cambia de forma, así que conserva `generateStaticParams`, su OG y las pruebas
  que ya la cubrían. `BESPOKE_WORLD_IDS` no se toca.
- **`lib/observatory-catalog.ts`** compone el catálogo una sola vez. La
  recepción y el raíl del laboratorio numeran igual por construcción; montar el
  tercer espécimen es una línea en `OBSERVATORY_SLUGS` y con ella se actualizan
  índice, raíl, `generateStaticParams` y sitemap.
- **El par instrumental del §14.1 pasa al MDX** (`observatory.pair`) y `registro`
  se vuelve opcional: los cuatro sin montar tienen nombre, descriptor y par
  —datos del objeto, que existe— y no tienen proceso escrito, porque no lo hay.
- **`SIN MONTAR` cuenta.** Las cuatro muestras sin observación siguen en el
  índice, con la cifra tachada y sin enlace. El catálogo dice cuántas hay.
- **La salida se llama `Salir del Observatorio`.** Antes ponía «Índice» con el
  destino en un `sr-only`, en la única ruta del sitio sin barra de navegación.
- **El vestíbulo es una imagen fija**, no un segundo contexto WebGL. La
  garantía del §1 se mantiene y ahora la vigila un test:
  `e2e/experimentos.spec.ts` cuenta los contextos creados sobre canvas anclados.
- **La figura humana se queda.** Es lo que fija la escala: sin ella la sala
  podría medir cuatro metros.

*Estado: `npm run check` verde; 125 e2e en chromium en verde, con cuatro
pruebas nuevas de recepción y una del encendido. **Pendiente del veredicto
visual de Jonás sobre composición, jerarquía y atmósfera**, y con B —el tramo
de cámara al llegar— aplazado a propósito hasta ese veredicto.*


#### El vestíbulo deja de ser un dibujo (2026-09-17, mismo día)

Jonás cambió el vestíbulo en SVG por una fotografía —imagen generada, dirigida
por él y documentada en `assets/experimentos/FUENTES.md`— en cuanto vio la
primera captura. La sustitución no cambia ni la arquitectura de la página ni el
protocolo: cambia una capa por otra dentro del mismo `.experiments-hall`.

El motivo es el que ya decía el §5: **la recepción vive de la escala**, y la
escala se compra con piedra, reflejo y distancia. Un SVG de tres degradados
sabe dar silencio y línea; no sabe dar un suelo pulido de veinte metros. El
dibujo cumplía la disciplina —cero datos, una sola curva de luz— y la
fotografía la hereda entera: sigue sin llevar un rótulo, un número ni una
lectura. Y sigue sin ser WebGL: son 132 KB de WebP y ni un contexto de dibujo.

Cuatro reglas salieron de montarla, y tres costaron una captura cada una.

**A la altura, no al ancho.** La sala no llena la ventana: toma su alto y deduce
su ancho de la proporción 2:3 del encuadre. En 1440 × 900 son 600 px, el 41 % —
justo por debajo del 44 % donde arranca la columna del índice, que ya estaba
escrito. Llenar a lo ancho con `cover` habría recortado más de la mitad del
alto, y lo que se pierde al recortar arriba y abajo es exactamente lo que da la
escala: el ventanal entero y el suelo bajo la figura. El marco lleva
`aspect-ratio` y la imagen `object-fit: cover` dentro, así que en una ventana
muy alta y estrecha se recorta por los lados —donde sólo hay pared— antes que
invadir la lectura.

**Un degradado que tapa un canto se mide en la IMAGEN, no en la ventana.** El
primer intento fundía a negro entre el 30 % y el 54 % del *viewport* y dejaba
un corte vertical duro sobre el suelo iluminado: el canto de la fotografía cae
donde su proporción diga, y eso se mueve con cada tamaño de ventana. La viñeta
vive ahora dentro del marco, donde el 100 % es la imagen, y apaga su último
8 %. Ocho y no más: la curva encendida de la jamba derecha ocupa del 72 % al
93 % y es la mejor línea del cuadro; un degradado más ancho la borraría para
arreglar un canto.

**Un interior no tiene estrellas.** Al meter la viñeta dentro del marco, el
resto de la ventana dejó de estar cubierto y apareció el cielo estrellado
general del sitio *dentro* de la sala. `.experiments-hall` es opaco a
propósito: es la pared, y todo lo que no es fotografía es pared.

**Y la misma regla de siempre, otra vez, en móvil.** Bajar la opacidad del
vestíbulo para que no estorbe al texto vuelve translúcida esa pared y devuelve
el cielo del sitio al interior. La sala no se atenúa: se oscurece con negro
encima, sobre la fotografía, dejándole en torno a un cuarto de su luz. Es la
tercera vez que este documento escribe la misma frase —**atenuar una capa la
vuelve translúcida, no oscura**— y ya no es una anécdota de implementación: es
la consecuencia de que el sitio entero tenga un cielo detrás.

*Estado: `npm run check` verde; 125 e2e en chromium en verde. La fotografía no
añadió ni quitó ninguna prueba: ninguna de las cinco del pase miraba el
vestíbulo, porque lo que fijan es la cadena y no el aspecto.*


#### La sala deja de ser una columna (2026-09-17, tercer pase del día)

Jonás rechazó el montaje anterior con un diagnóstico de cuatro puntos que vale
más que cualquier retoque: *«la imagen parece un póster pegado al layout»*, *«la
mitad derecha sigue siendo demasiado editorial»*, *«no hay relación visual entre
el espacio y el catálogo: son dos ideas colocadas juntas, no una sola
composición»* y *«hay demasiadas capas reclamando atención»*. Su objetivo, dicho
por él: **45 % lugar / 55 % instrumento, sin frontera evidente**, con el planeta
invadiendo la composición y muriendo en negro debajo del catálogo.

El pase no toca el protocolo de adquisición ni añade un solo efecto: es
composición estática, que es lo que él pidió arreglar primero.

**Lo que decidió el pase fue una medición, no un gusto.** Antes de mover nada se
levantó un mapa de luminancia de la fotografía en rejilla 32 × 48 y la media por
columna. De ahí salieron cuatro hechos duros: el arco del limbo **sube de
abajo-izquierda a arriba-derecha**; la columna más brillante de toda la imagen
—media 93 sobre 255— está al **87,5 %** del ancho, o sea la jamba encendida del
ventanal; el **6 % más a la derecha es pared, media 2**; y la figura ocupa el
**11,7 % del alto**, entre el 63,6 % y el 75,4 %, con la junta de pared y suelo
al 71,5 %.

De esos cuatro números salen las cuatro decisiones.

**La sala va ESPEJADA.** Con la fotografía en su orientación original, su parte
más brillante cae exactamente debajo del catálogo y su arco viene HACIA el
texto. Espejada, el arco desciende hacia las filas y se apaga bajo ellas, y lo
que queda debajo es la pared del otro extremo, que mide 2 sobre 255. La
composición no se arregló moviendo el texto: se arregló dando la vuelta a la
sala. La imagen no lleva rótulos ni retrata un lugar real, así que reflejarla no
miente sobre nada.

**Se ve una ventana sobre la fotografía, no la fotografía.** Antes se pintaba al
alto de la pantalla y cabía entera, con sus cuatro cantos — y una imagen con
cuatro cantos dentro de una página es un póster. Ahora ocupa el 58 % del ancho y
se recorta: la ventana va del 12 % al 80 % del alto, que es lo que conserva el
eclipse por encima de la barra de navegación, la figura completa y un palmo de
reflejo bajo sus pies. Se sacrifica cielo arriba y suelo en primer término
abajo, que es lo que menos cuenta.

**El desvanecido dura un tercio de la imagen**, y sigue midiéndose EN la imagen y
no en la ventana. Donde empieza el texto el negro ya pesa un 58 %, así que las
primeras filas caen sobre el limbo todavía visible y las últimas sobre pared. No
hay frontera que ver porque no hay frontera: hay una pendiente.

**Y el suelo sale de la foto.** Dos capas planas —el reflejo cálido que cruza
toda la ventana y una piedra fría bajísima bajo el catálogo— para que las
últimas filas no floten sobre la nada. Ni un nodo, ni un marco, ni una línea
técnica: la integración sale de la luz.

**La cabecera pasa de portada a lectura.** Antes iba destino, título a 4,2 rem,
subtítulo y párrafo, que es la gramática de cualquier otra sección del
portafolio. Ahora son tres líneas y la tercera ya es un estado del laboratorio
—`OBSERVATORIO EXPERIMENTAL · 02 / 06 MONTADOS`, con la cifra contada del
catálogo— y el índice empieza en el primer tercio de la pantalla. El encabezado
del índice desaparece de la vista y se queda de nombre accesible de la región:
un rótulo `ÍNDICE DE ESPECÍMENES` encima de seis filas numeradas no informa a
nadie que esté mirando, y la cuenta ya se dice una vez arriba. **Las seis filas
caben en una sola pantalla de 900 px.**

La prosa del mundo no se pierde: divisa, introducción, hechos y cierre bajan al
pie, detrás del catálogo y en cuerpo menor. Siguen enteros en el HTML servido,
que es lo que pide la regla 7. A la recepción se viene a elegir una muestra.

**La tensión que este pase no puede resolver del todo, y hay que saberla:**
recortar la imagen para que la sala tenga presencia hace la figura relativamente
más grande. Con la foto entera ocupaba el 11,7 % de la pantalla; con la ventana
al 68 % ocupa el 16,5 %. No hay encuadre que dé las dos cosas: **más presencia
del lugar es siempre menos escala del personaje**. El 58 % es el punto donde la
figura todavía se lee como una persona pequeña en una sala enorme.

La otra: el original mide 1024 px de ancho y ahora se pinta a 835 en una ventana
de 1440 —todavía por encima de 1:1— pero el marco se topa en 66 rem para que en
pantallas grandes no se estire. Con un original de 2048 px el tope sobra y se
retira cambiando un número.

*Estado: `npm run check` verde; 125 e2e en chromium en verde. Ninguna prueba
cambió: el encabezado del índice sigue siendo el nombre accesible de su región y
las seis filas siguen contándose igual. **Pendiente el veredicto visual de
Jonás.** ACQUISITION LOCK sigue intacto y B —el tramo de cámara al llegar—
sigue aplazado: él pidió expresamente no animar encima de una composición que
antes no funcionaba.*


## V1.5 — de manipular un modelo a investigar un objeto (2026-09-17)

Encargo de Jonás, y su diagnóstico es la especificación: *«el Observatorio
todavía se siente más como un inspector premium de un modelo 3D que como un
observatorio espacial donde realmente estoy estudiando un espécimen»*. La base
visual se conserva entera —composición, paleta, tipografía, el espécimen como
protagonista absoluto— y lo que sube de nivel es la PROFUNDIDAD DE INTERACCIÓN.

### Lo que existía, lo que se derivó barato y lo que no se construyó

Antes de tocar nada, la matriz que él pidió:

| Instrumento | Estado | Qué se hizo |
| --- | --- | --- |
| Vistas de observación | **derivable barato** | `observationPlacement` ya convertía dos ángulos en una pose. Una vista es esa misma función con otros dos ángulos. |
| Telemetría de cámara | **derivable barato** | La escena ya tenía la `Spherical` y la posición del espécimen. `AZ`, `EL`, `DIST` y `CLAVE` salen de restar dos vectores. |
| Sonda sobre el Tesseracto | **derivable barato** | `sampleTesseract` es pura: se puede volver a evaluar con los mismos segundos y da los mismos dieciséis vértices bit a bit. |
| Comparación A/B | **ya existía** | `setBloom` y `setEmission`. Lo que cambia es el GESTO, no el mecanismo. |
| `DATOS` en tres familias | **ya existía** | Los mismos números del contrato, reordenados. |
| Sonda sobre la Endurance | **requiere sistema nuevo** | Su arquitectura se cuenta pero sus piezas no llevan nombre en la malla: una sonda sólo podría decir «un triángulo». No se hizo. |
| Vistas de Gargantúa | **no existe** | Ver abajo. |
| `MEDIR` A→B, alambre/normales | **requiere sistema nuevo** | Aplazados a propósito, como pidió el encargo. |

**Corrección que hay que dejar escrita: Gargantúa NO tiene vistas curadas.** El
§7 diseña cuatro —cinematográfica, lente, disco y sombra— pero eso es una
especificación, no código: no tiene malla, `createBody` devuelve `null` para
ella y en el catálogo figura como muestra sin montar. `observation-views.ts`
deja su lista vacía y un test lo fija, porque un instrumento que promete una
capacidad que el modelo no tiene es la peor clase de dato inventado.

### Una vista es una geometría de luz, no un encuadre

La restricción que hace honesta la lista. En este Observatorio hay UNA fuente de
luz y es el origen del mundo, así que la única variable de observación real es
dónde se sienta uno respecto de ella. Una vista se define con los mismos dos
números que el preset y entra por el mismo `observationPlacement` —con un
parámetro opcional, no con una segunda función—, así que por construcción no
puede tocar el material: es literalmente el §6 hecho mando.

Por eso cada vista puede decir qué revela, y esas frases se pueden rastrear
hasta una línea del shader. Y por eso hay una prueba que lo demuestra a través
de la pantalla: elegir `RASANTE` lleva la lectura `CLAVE` de los 145° del preset
a los 92° que declara la vista. Si alguien colocara una cámara a ojo, ese número
no cuadraría.

**Y una vista puede ALEJARSE, nunca acercarse.** La regla la impuso una captura.
Había una vista `SECCIÓN` a 0,55 de la distancia de encuadre y lo que salió no
era una observación: era un recorte, con la figura cortada por los cuatro lados.
El motivo está medido en `observatory-framing.test.ts` —la silueta del
Tesseracto ocupa entre el 54 % y el 86 % del alto según la fase de su
reconfiguración, treinta y un puntos— y cualquier factor menor que uno
multiplica esa banda entera. No hay número que lo arregle: el problema es que la
figura respira. La `OPERACIONES` de la Endurance a 0,72 tenía el mismo fallo.

### La telemetría se escribe, no se renderiza

Cuatro lecturas bajo el nombre del espécimen: azimut, elevación, distancia **en
radios del propio espécimen** —las unidades de mundo aquí no significan nada— y
el ángulo de clave, que es el que ningún visor gráfico enseña y el único que
describe lo que de verdad cambia al orbitar.

Cambian en cada fotograma pintado, así que no pasan por estado de React:
re-renderizar el visor entero sesenta veces por segundo para cambiar cuatro
números cuesta reconciliar todo lo demás. Se escriben en el DOM por referencia.
Es la excepción, no la regla, y sólo vale para lecturas que no cambian la
estructura de nada. El panel `DATOS` enseña los mismos cuatro valores por el
mismo camino, y por eso al abrirlo hay que rellenarlo a mano: el bucle es bajo
demanda y con el instrumento quieto no llega ningún fotograma.

### La sonda dice cosas que son verdad del hipercubo

Señalar una arista devuelve su índice dentro del circuito euleriano, **el eje
por el que corre** —X, Y, Z o W—, su profundidad en la cuarta dimensión en el
punto señalado y a qué distancia está.

El eje es el dato que justifica la sonda entera. En un 4-cubo dos vértices son
adyacentes si y sólo si sus índices difieren en UN bit, y ese bit es el eje: no
es una convención de nuestro modelo, es la definición del hipercubo, y por eso
es invariante mientras la figura rota. Ocho de las treinta y dos aristas
atraviesan W, y el test lo cuenta de los datos en vez de escribirlo. **Es el
único sitio del proyecto donde se puede señalar la cuarta dimensión con el
dedo.**

Nada de raycasting: se proyectan los dieciséis vértices y se busca el segmento
más cercano al puntero en dos dimensiones. Treinta y dos distancias
punto-segmento, ninguna estructura de aceleración, y de regalo el parámetro a lo
largo de la arista, que es lo que permite interpolar la profundidad en el punto
y no sólo en los extremos. Los vértices salen de volver a evaluar
`sampleTesseract` con los mismos segundos: es una función pura, así que es la
misma verdad y no una copia del estado.

La retícula son cuatro marcas de un píxel con un hueco en medio. El hueco es la
pieza: una cruz completa tapa justo lo que se señala y un círculo convierte el
instrumento en una mira. Vive en el DOM porque cuatro trazos no justifican una
pasada de render.

### Comparar no es conmutar

`BLOOM` y `MATERIAL` pasan a responder a la pulsación sostenida: mientras se
mantiene, el instrumento sale de su estado canónico; al soltar vuelve solo. Es
la pregunta del bloom-off test hecha gesto —¿qué parte de esto es el objeto y
qué parte es el tratamiento?— y la pista de abajo deja de ser una instrucción
para decir qué se está comparando, sin añadir un rótulo nuevo.

El clic corto sigue conmutando, y eso no es un extra: es lo que mantiene el
mando utilizable con teclado, donde «mantener» no existe como gesto.

Dos cosas que costaron una captura cada una. **`preventDefault` en `pointerup`
no cancela el `click` de un botón**, así que soltar tras comparar conmutaba el
pestillo y el instrumento quedaba al revés; la decisión tiene que tomarse en el
propio `click`, midiendo cuánto duró la pulsación. Y el reloj es
`performance.now()` y no `event.timeStamp` **porque el `timeStamp` de un evento
sintético es de sólo lectura**: con él, la diferencia entre comparar y conmutar
quedaba fuera de la suite.

### `DATOS`: el orden ES la lectura

`OBJETO` → `OBSERVACIÓN` → `RENDER`. Qué estoy viendo, cómo lo estoy observando,
cómo está construido. Antes abría por las llamadas de dibujo, o sea por lo
último: contaba primero lo que le cuesta a la GPU y después qué es el objeto,
que es el orden de un profiler y no el de un laboratorio. Ningún número cambia;
cambia cuál se lee primero.

### Dos fallos preexistentes que este pase destapó

**El raíl nunca recibió su margen.** `--obs-inset` estaba declarada en
`.observatory__calipers`, que es HERMANO del raíl y no su ancestro, así que
`left: var(--obs-inset)` no resolvía a nada, la declaración era inválida, `left`
caía a `auto` y las seis cifras del catálogo se pintaban pegadas al canto de la
pantalla. **Ésa era la causa real de que `02`–`06` «casi desaparecieran»**, y
ninguna cantidad de color lo habría arreglado: una custom property sólo la ven
los descendientes del elemento que la declara. Ahora viven en `.observatory`.

**Y el panel de lectura se sentaba encima del catálogo.** Con dos familias era
corto y sólo alcanzaba a las dos últimas cifras; con tres llega a las seis. Un
panel que tapa la navegación deja de ser una lectura del objeto y pasa a ser un
modal. Se sangra lo justo para librar el raíl.

### Ajustes de presencia

El raíl sube de 0.62 a 0.76 y las no montadas de 0.30 a 0.42 —siguen por debajo
de las montadas y con la cifra tachada—; el rastro `EXPERIMENTOS / OBSERVATORIO`
baja a 0.20 para que la acción reconocible sea `SALIR DEL OBSERVATORIO`; la
prosa del registro baja un 6 % y abre interlínea. En modo cine la telemetría cae
a un 35 % del nivel 1: identidad, catálogo y salida contestan «dónde estoy» y se
quedan; la telemetría contesta «cómo estoy mirando», que es una pregunta que
sólo existe mientras se opera.

*Estado: `npm run check` verde; 127 e2e en chromium en verde, con dos pruebas
nuevas de navegador —una vista cambia la geometría de la luz y la telemetría lo
demuestra; la sonda nombra una arista real— más dieciséis unitarias nuevas entre
`observation-views.test.ts`, `tesseract-probe.test.ts` y el cromo. **Pendiente el
veredicto visual de Jonás.** `MEDIR` A→B y el alambre/normales siguen aplazados,
y la infraestructura queda lista para congelarse y montar los cuatro especímenes
que faltan.*

## V2 — dos modos, y una luz que se puede mover (2026-09-18)

Jonás vio la V1.5 terminada y el diagnóstico fue de densidad, no de piezas:
*«hay mucha información y se siente ahora todo muy pesado»*. Con él llegaron
cinco encargos concretos: **modo cine por defecto** —sólo la cámara con el
ratón— y un **modo estudio** con las herramientas; **quitar texto** de la
esquina superior izquierda; que la interfaz sea minimalista pero **se sienta más
como una nave espacial**; que **la sonda funcione**, porque no se entendía qué
hacía; y **poder mover la luz**.

### El error no era un rótulo de más: eran dos actividades a la vez

La pantalla contestaba al mismo tiempo dos preguntas que nadie se hace a la vez.
**Mirar** un espécimen y **medirlo** son dos cosas, y el aparato tenía las dos
encendidas siempre — de ahí el peso, y de ahí que cada intento de aligerar
acabara siendo una discusión sobre qué rótulo sacrificar.

`data-mode` en la raíz reparte el aparato entero:

 · **`OBSERVAR`** es el estado de reposo: el espécimen, su nombre, el catálogo,
   la salida y la mano. Nada más. Es lo que se ve al entrar.
 · **`ESTUDIO`** despliega la consola: vistas, luz, cámara e inspección.

La consola **no se desmonta** al plegarse. Así los mandos conservan su estado al
ir y volver, y cambiar de modo no reconstruye un solo nodo; lo que hace es irse
—`inert` más `visibility: hidden`— para que no quede ni en el puntero, ni en el
tabulador, ni en el árbol de accesibilidad. Eso es justo lo que jsdom NO
comprueba solo: `inert` no está implementado ahí, así que los mandos de una
consola plegada siguen apareciendo en las consultas por rol, y sin un test
explícito el reparto entero podría romperse sin que nada se pusiera rojo.

Y el **modo cine pasa a existir sólo en `OBSERVAR`**. En V1.5 la atenuación por
inactividad se llevaba también los controles: a los 3,5 s de estar pensando qué
medir, los mandos desaparecían. Un instrumento desplegado se queda desplegado;
el reposo es mirar.

### Lo que se fue de la esquina, y adónde

La cabecera tenía seis líneas. Ninguna se borró: cada una se mudó a donde sirve.

| Lo que estaba arriba | Adónde fue | Por qué |
| --- | --- | --- |
| `INSTRUMENTO · NOMINAL` | un punto ámbar | La cara servida ya lo enseña en grande mientras hace falta, que es mientras el aparato está en espera. Encendido, un aparato lo dice con una luz. |
| `AZ / EL / DIST` | consola, fila `CÁMARA` | Contestan «cómo estoy mirando», y ésa es una pregunta que sólo existe mientras se opera. |
| `CLAVE` | consola, dial de `LUZ` | Dejó de ser una lectura para ser un mando. Ver abajo. |
| lectura de la sonda | junto a la retícula | Ver abajo. |
| `EXPERIMENTOS / OBSERVATORIO` | retirado | Repetía al 20 % de opacidad lo que la salida dice entera, en la esquina donde sobraba texto. |

Quedan tres líneas: la cifra del catálogo, el nombre y el descriptor.

### `LUZ`: el instrumento que faltaba

Es el mando nuevo, y es el que convierte el visor en un laboratorio. Aquí **no
hay una lámpara que arrastrar** —la luz ES el origen del mundo, `toLight =
normalize(-vPositionW)`— así que lo que el dial mueve es el espécimen ALREDEDOR
de ese origen, con la cámara rígidamente enganchada a él.

Eso lo hace exactamente lo contrario de orbitar, y ahí está todo su valor:

 · **Orbitar** mueve la cámara y deja el espécimen quieto → cambia qué CARA se
   ve, y de paso cambia el ángulo de clave.
 · **`LUZ`** gira el espécimen alrededor del origen con la cámara pegada → la
   misma cara, el mismo encuadre, la misma distancia, **otra luz**.

Es la única variable que el §6 autoriza a tocar, ofrecida por primera vez sola.
Hasta ahora sólo se podía rozar de refilón orbitando, mezclada con el cambio de
cara. Con esto se puede sostener la pose y barrer la iluminación, que es lo que
hace un laboratorio y no un visor — y el Tesseracto a 20° de clave y a 145° son
dos objetos distintos: la tabla del §6 convertida en un dial.

Dos números, los dos medidos y los dos ajustables:

 · **`CLAVE`**, 0-180°: el ángulo entre la luz y la mirada, el mismo `keyAngle`
   del preset y la misma `key` de la telemetría. Una sola magnitud con un solo
   nombre.
 · **`GIRO`**, −180 a 180°: dónde cae la luz en el reloj de la PANTALLA. Se mide
   en pantalla y no en el mundo a propósito — `keyAzimuth` es el parámetro
   correcto para declarar un preset y el incorrecto para manipular, porque nadie
   puede predecir dónde acabará la luz sin resolver antes el `up` de la cámara.
   Aquí la pregunta que se contesta es la que un humano se hace: «quiero la luz
   arriba a la derecha».

**Y los dos diales son a la vez LECTURA.** Al orbitar se mueven solos, porque
rodear el espécimen cambia de dónde le llega la clave. Un dial que no sabe lo
que está pasando en el resto del aparato es una casilla con estilo. Por eso
`lightPlacement` y `lightGeometry` son inversas exactas y hay un test que barre
treinta pares: si la ida y la vuelta no coincidieran, cada fotograma escribiría
en el `<input>` un número ligeramente distinto del que acaba de poner el pulgar,
y la aguja temblaría mientras se arrastra.

Lo que el mando **no** puede tocar, por construcción y con prueba: el
desplazamiento cámara-espécimen se arrastra entero en coordenadas de mundo, y el
espécimen se queda en su esfera de `ORIGIN_DISTANCE_RADII`. Eso segundo protege
el material: esa distancia gobierna cuán paralela llega la luz, así que moverla
sería cambiar el CARÁCTER de la iluminación y no sólo su dirección.

**Un fallo que costó un barrido de teclado.** La primera versión leía
`camera.position`, que sólo se actualiza dentro de `applyCamera` —una vez por
fotograma PINTADO—, mientras la fuente de verdad del encuadre es la esférica.
Entre dos fotogramas caben varias órdenes, así que cada una conservaba un
desplazamiento caducado: medido, el dial saltaba de 52° a 49° en una sola
pulsación de flecha. Se reconstruye el desplazamiento desde la esférica y la ida
y la vuelta vuelven a ser exactas sin importar cuántas órdenes lleguen entre dos
fotogramas. Lo sujeta una prueba de navegador que no mira la imagen: cuarenta
pulsaciones de un grado tienen que llegar exactamente cuarenta grados más abajo.

### La sonda sí funcionaba. El problema era dónde aparecía

Medido antes de tocar nada: un barrido de 288 posiciones sobre la figura dio
**136 aciertos**. La sonda acertaba. Lo que fallaba es que la lectura salía
arriba a la izquierda, a seis líneas de distancia del punto señalado, en cuerpo
0,56 rem y entre otros cinco rótulos.

Una medición que aparece lejos de lo que se está midiendo no es una medición, es
un mensaje. Ahora el rótulo cuelga de la propia retícula —y se voltea al canto
izquierdo cuando el punto se acerca al borde derecho de la pantalla—, el lienzo
cambia a cursor de cruz mientras la sonda está encendida, y la pista de abajo
deja de explicar el arrastre para decir `SEÑALA UNA ARISTA DEL HIPERCUBO`. Tres
señales, ni un elemento nuevo.

### La consola, o de dónde sale la sensación de nave

La otra mitad del encargo —«que se sienta más nave espacial»— no se resuelve
añadiendo datos: se resuelve con **geometría de aparato**. Aquí no hay ni un
radar falso, ni un porcentaje inventado, ni una coordenada que nadie haya
medido. Lo que hay es esto, y ninguna pieza dice nada:

 · **El alféizar.** Una línea de 1 px de borde a borde con los extremos
   difuminados, arriba de la banda. Es la pieza que más trabaja: separa el
   espacio de la máquina. Y no cierra ninguna caja —es un solo lado— así que la
   regla del §5 sigue en pie.
 · **El velo.** El espécimen no se recorta ni se reencuadra al desplegar la
   consola, que es contrato; lo que hace es HUNDIRSE detrás del panel con un
   degradado que arranca en cero justo en la línea. Sin él, el alféizar cortaba
   la figura por la mitad con un filo de un píxel. Sus valores los fijó la
   Endurance —aluminio marfil a plena luz— y no el Tesseracto, que es cristal
   casi negro: la misma lección que ya enseñó la ficha de `DATOS`.
 · **El bastidor.** Una columna de rótulos a la derecha del todo, una regla
   vertical continua y las filas de mandos al otro lado. La regla la dibujan los
   propios rótulos con su borde derecho: filas adyacentes la sueldan en una sola
   línea, sin un elemento dedicado y sin que nadie tenga que saber cuántas filas
   hay.
 · **Los diales.** Escala de ocho divisiones, línea de referencia y una AGUJA de
   dos píxeles. Nada de pista rellena ni pulgar redondo — eso es un control de
   volumen. El blanco de agarre son los 24 px del carril; la tinta, cinco.
 · **El selector de modo.** Dos posiciones con su muesca colgadas de un raíl de
   1 px, no dos pestañas: una pestaña cambia el contenido, y aquí lo que cambia
   es lo que estás haciendo con el mismo objeto. La muesca crece con `scaleY` y
   no con `height`, porque en una caja en columna una muesca más alta EMPUJA la
   palabra: medido, la posición elegida quedaba siete píxeles por debajo de la
   otra.
 · **La escotilla.** Una caída de luz muy suave hacia los cuatro bordes del
   lienzo. No es viñeteado de fotografía: es lo que convierte un rectángulo
   negro en una ABERTURA. La instrumentación va por encima.

Y la pista de abajo pasa a ser el único sitio donde el aparato habla: dice qué
se puede hacer AHORA, que es distinto en cada modo y mientras se compara. Cuatro
frases en un rótulo es lo que permite no tener una capa de avisos.

### Dos fallos de alcance que este pase destapó

**La bandeja global se comía `Reajustar`.** Medida: ocupa 293 px a 20 px del
canto, en cualquier ancho por encima de móvil. Con el botón pegado al extremo
derecho —que es donde lo ponía el boceto— el clic no llegaba nunca. La barra del
aparato pasa a ordenarse de izquierda a derecha —selector, `Reajustar`, pista— y
reserva su sitio. El defecto no es de la bandeja: es global, vive en las seis
rutas, y esta página es la invitada.

**Y había un hueco entre 544 y 768 px** donde no actuaba ni la reserva vertical
de móvil ni la horizontal de la barra, así que la bandeja caía sobre los mandos
en cualquier tableta en vertical. El umbral sube de 34 a 48 rem.

### Móvil: el bastidor se aprieta, no rueda

La primera versión le puso un techo de 38 svh con desbordamiento propio, para
que el espécimen no bajara del 40 % de la pantalla. La suite lo tumbó en el sitio
exacto: a 375 px, `DATOS` y `REGISTRO` caían fuera del techo y `elementFromPoint`
sobre su centro devolvía el selector de modo. **Un mando que hay que desplazar
para tocar es un mando que no está**, y esa comprobación —O10 bis— existe
precisamente porque medir la caja no basta.

Así que el bastidor entra entero y lo que baja es su calibre. La consola se lleva
poco más de un tercio del teléfono, y eso es lo que `ESTUDIO` significa en un
teléfono: se entra a propósito, y `OBSERVAR` devuelve la pantalla con un toque.

*Estado: `npm run check` verde —48 archivos, 362 pruebas unitarias— y la suite de
Playwright entera en verde, con dos pruebas de navegador nuevas: que mover la luz
cambia la clave exactamente los grados pedidos y NO mueve la cámara, y que los
dos modos reparten el alcance de los mandos. `MEDIR` A→B y el alambre/normales
siguen aplazados. **Pendiente el veredicto visual de Jonás.***

---

## V3 — Gargantúa, el espécimen que no es una malla (2026-09-19)

Manda sobre `V2`, sobre el §6 y sobre el §7 en **qué instrumentos ofrece el
Observatorio a un objeto sin geometría, cómo se encuadra, y dónde viven los
números que lo dibujan**. No toca el System Map, ni el pase visual de Gargantúa,
ni el contrato de los cinco sólidos.

El catálogo pasa de `02 / 06` a `03 / 06 MONTADOS`.

### Por qué era distinto montarla

Los dos primeros especímenes eran mallas y el laboratorio está construido
alrededor de `createBody`. Para Gargantúa esa función devuelve `null`: no tiene
geometría. Lo que hay es un raymarch de geodésicas sobre un cuad de pantalla
completa, alimentado por una base de cámara explícita —posición y tres
vectores— en vez de por una `PerspectiveCamera`.

Eso no era un detalle de montaje: rompía tres contratos a la vez.
`OBSERVATION_PRESETS` la excluye a propósito —el §6 dice que no recibe ninguna
luz añadida, nada, en ninguna vista— así que la ruta, que leía
`preset.instruments` para pintar el banco en frío, no compilaba con ella
montada. `specimenContract` mide recorriendo un objeto que no existe. Y
`observationPlacement` coloca el espécimen a distancia del origen porque el
origen ES la lámpara, mientras que aquí el espécimen es el origen y no se mueve
nunca.

La salida no fue forzarla por el molde de los cinco. Fue el §5 un nivel más
abajo: **el laboratorio adapta sus instrumentos a la muestra, y también su
contrato de observación.**

### Los datos se extraen; la maquinaria, no

Había tres caminos para que el laboratorio dibujara el raymarch y ninguno era
obviamente el bueno: extraer el montaje entero a un módulo compartido,
replicarlo aquí, o algo intermedio. Se eligió lo tercero, y el criterio es dónde
está el riesgo real.

El cuad, los dos render targets en ping-pong y el orden de las pasadas no
derivan solos: son código que nadie edita por gusto, y los dos consumidores
quieren cosas distintas alrededor —el mapa tiene cinco cuerpos encima, una
travesía que dobla la imagen entera y una pose por ruta; el laboratorio tiene
cuatro vistas curadas y un bucle bajo demanda—. Un módulo que sirviera a los dos
habría ido creciendo opciones hasta ser un objeto de configuración, que es la
forma habitual de romper lo que se pretendía proteger.

Lo que sí deriva son los NÚMEROS. La guarda de la sombra se afinó dos veces en
un solo día —`amount` 0.88 → 0.96, `inner` 0.72 → 0.80 → 0.85— y con dos copias
vivas cada una de esas rondas habría dejado al Observatorio enseñando la versión
anterior. Justo en la página cuya vista `SOMBRA` existe para contar esa
constante.

Así que `components/scene/gargantua-render.ts` recibe el nivel de calidad, el
bloom, la exposición, la tabla de Halton, la regla de mezcla, la guarda de la
sombra y la fábrica de uniformes; `system-scene.ts` los importa y no conserva ni
una constante de Gargantúa. **El diff de ese archivo es auditable de un
vistazo**: 145 líneas borradas y, como añadidos, la importación y cinco
sustituciones de sitio de llamada. Si aparece una línea que no sea eso, el
camino se ejecutó mal.

Y se verificó como se verifica un refactor sobre un pase congelado: captura de
la home antes, extracción, captura después.

| | antes | después | suelo de ruido |
| --- | --- | --- | --- |
| media abs(Δ) contra la base | — | **0.157** | **0.231** |
| núcleo 0-0.35 R | 45.4 | 45.3 | ±0.2 |
| negro < 8 por el centro | 80 × 69 | 80 × 68 | ±1 |
| banda ≥ 235 | 0.84 % | 0.84 % | — |

La diferencia tras la extracción es MENOR que la que hay entre dos capturas del
mismo código, y las métricas reproducen los valores de cierre del §14 duodecies.
El System Map no se movió.

### Una vista es una cámara, y se calibra con aritmética

`lib/gargantua-views.ts` es a Gargantúa lo que `observatory.ts` es a los
sólidos. Allí una vista son dos ángulos de LUZ; aquí son seis números de CÁMARA
—elevación, azimut, distancia, campo, roll y corrimiento— porque la luz no se
puede tocar.

La primera versión eligió las distancias estimando, y las dos vistas de detalle
salieron siendo una pared de crema sin objeto dentro. El error fue olvidar el
tamaño del disco: diecisiete radios contra los 2.6 de la sombra. Lo que decide
un par es esta aritmética, verificada contra captura:

- la sombra ocupa `2.598 / (d · tan(fov/2))` del ALTO;
- el disco ocupa `17 / (d · tan(fov/2) · aspecto)` del SEMIANCHO.

| vista | d / fov | sombra | disco | qué estudia |
| --- | --- | --- | --- | --- |
| **Cinematográfica** | 42 / 35 | 19.6 % | 80.2 % | la composición aprobada |
| **Lente** | 40 / 20 | 36.8 % | 151 % | el anillo y la imagen doblada |
| **Disco** | 46 / 32 | 19.7 % | 80.6 % | bandas y asimetría |
| **Sombra** | 34 / 15 | 58.0 % | 237 % | el negro y su borde |

Las dos de conjunto encuadran el disco entero con el aire del §5; las dos de
detalle lo sacan de cuadro a propósito. Eso no contradice la regla de
`observation-views.ts` —una vista puede alejarse, nunca acercarse— porque
aquélla nació de que la silueta del Tesseracto respira treinta y un puntos.
Gargantúa no respira.

**Y `SOMBRA` costó una ronda entera.** A 38 / 18 daba la misma imagen que
`LENTE` —un negro con su arco— y dos vistas que enseñan lo mismo son una vista y
un rótulo de más. La diferencia no podía venir de la elevación, porque las dos
viven cerca del suelo de 9°: vino del encuadre. Una enseña la estructura
ALREDEDOR del agujero; la otra, el agujero.

La vista canónica repite los cinco números de `SYSTEM_POSE`, y la duplicación es
deliberada: el §2 prohíbe que el Observatorio importe el contrato de cámara. Lo
que impide que deriven es un test que lee los dos archivos, porque una prueba sí
puede conocer las dos orillas.

### Los instrumentos: tres que se van, tres que llegan

`LUZ` no existe aquí —ese mando gira el espécimen alrededor del origen para
barrer su iluminación, y el espécimen ES la fuente—, `SONDA` tampoco —no hay
aristas que nombrar— y `MATERIAL` menos —`uEmission` vive en el shader común de
los cuerpos—. La fila de luz desaparece entera y la telemetría no publica
`CLAVE`: un cero ahí no sería un dato neutro, sería una medición falsa.

En su lugar entran **tres ramas del raymarch que llevaban escritas desde que se
escribió el shader y que hasta este pase valían 1 y no tocaba nadie**:
`uDoppler`, `uSecondary` y `uSkyLens`. Son la cláusula de inspección del §6
aplicada a un objeto sin material: aíslan un canal con fines diagnósticos, son
reversibles y están etiquetados.

Medido con el reloj congelado y en la vista donde cada uno se usa, contra un
suelo de ruido de **0.0000** — el render asentado es determinista bit a bit:

| instrumento | media abs(Δ) | píxeles fuera de ±16 | qué retira |
| --- | --- | --- | --- |
| `DOPPLER` | **26.4** (lente) · 11.6 (canónica) | 50.6 % | beaming, tinte y el 12 % de asimetría de densidad |
| `LENTE` | 3.5 (canónica) · 2.0 (lente) | 2.1 % | la curvatura del campo estelar |
| `SECUNDARIAS` | 1.3 (lente) · 0.78 (canónica) | 0.70 % | las imágenes de orden superior |

Los tres están muy por encima del suelo. `SECUNDARIAS` es el más discreto y el
que más depende de dónde se mire: en la canónica se le nota poco, en `LENTE`
—que es la vista que existe para eso— retira la línea que cruza por debajo de la
sombra.

`DATOS` se compone de lo que el §8 le reserva, y todo sale del código: `rs` y
los radios del disco del módulo de shaders (publicados en radios de
Schwarzschild, porque 23.8 no dice nada y «17 rs» sí), los pasos por píxel del
mismo `define` con el que se compila el material, y la mezcla temporal leída del
uniform que el bucle acaba de escribir. Las tres cifras de render dicen la
verdad más rara de la ficha: **un agujero negro entero en una llamada de dibujo,
un material y cuatro vértices.**

### El asentamiento, y una trampa de medición que costó media tarde

Los cinco sólidos paran de dibujar en cuanto nadie toca nada. Gargantúa no
puede: su imagen se compone promediando ocho posiciones de Halton, así que parar
al primer fotograma dejaría el moteado de una sola muestra. Sigue dibujando
hasta que el promedio se asienta y entonces para — que es literalmente lo que
pide O12 para su caso.

Cuántos fotogramas es una medida, no la serie geométrica:

| promediados | media abs(Δ) contra la asentada | píxeles fuera de ±16 |
| --- | --- | --- |
| 17 | 0.476 | 0.33 % |
| 34 | 0.102 | 0.007 % |
| 48 | asentada | — |

A diecisiete quedan cuatro mil píxeles a más de dieciséis niveles de su valor
final: moteado visible. Cuarenta y ocho deja margen y son seis ciclos completos
de Halton.

**Y medir esto tiene una trampa.** En Chromium headless `requestAnimationFrame`
deja de dispararse cuando nada fuerza un pintado — comprobado con un contador de
rAF propio en la página, que se queda clavado a los veintitantos ciclos.
Esperar entre capturas no deja pasar fotogramas, deja pasar tiempo. La primera
medición concluyó que la acumulación se asentaba en tres pasos, y lo que medía
es que cada captura forzaba exactamente un fotograma. Hay que capturar en cadena
y leer el contador que el propio instrumento publica en `DATOS`.

El descarte que esa persecución dejó por el camino: el bucle tenía un `catch`
mudo que paraba el render sin decir nada, y fue la única salida que hubo que
descartar a mano. Ahora se anuncia por consola y por `onFailure`.

### Tres defectos que este pase destapó, y ninguno era de Gargantúa

**1 · Un clic no conmutaba el pestillo en un render lento.** El mando distingue
un clic de una comparación sostenida por cuánto dura la pulsación, y lo medía
con `performance.now()` dentro del manejador. Medido: sobre el Tesseracto un
clic entrega `pointerdown → pointerup` en **113 ms**; sobre Gargantúa, en **742
ms**, porque entre los dos eventos el hilo principal se queda dentro de un
fotograma del raymarch. Todo clic pasaba por comparación y `BLOOM` no conmutaba
nunca: un botón que no responde. El reloj del manejador no mide el gesto, mide
el gesto más lo que la página tardó en atenderlo — `event.timeStamp` lo fija el
navegador al CREAR el evento. Con el arreglo, el mismo clic mide 28 ms. No era
exclusivo de este espécimen: le pasaría a cualquiera en cuanto un fotograma
pasara de 220 ms.

**2 · `Reajustar` devolvía la cámara pero no el rótulo.** `reset()` lleva el
instrumento a la pose del preset, que es la vista 01, y la interfaz se quedaba
marcando la que el visitante hubiera elegido. Se destapó aquí —donde la
telemetría delata la pose— pero el defecto era de los cinco sólidos también.

**3 · `FlatWorldBody` no tenía dibujo para el agujero negro**, y devolvía
`null`. Era correcto mientras el único consumidor era el atlas plano, donde la
figura la pinta `SiteBackdrop`; dejó de serlo cuando la cara servida del
laboratorio pasó a usar la misma figura como esquema del espécimen. Sin dibujo,
la ruta salía sin cuerpo justo para quien no tiene JavaScript ni equipo — que es
a quien O7 y O8 protegen. Ahora existe, y la exclusión se mudó a
`system-map.tsx`, que es donde está el motivo: **una regla sostenida por un
hueco en otro archivo no es una regla, es una coincidencia que aguanta hasta el
siguiente consumidor.**

### Móvil: el disco no cabe, y perseguirlo lo empeora

El disco es una figura ancha, así que en vertical se sale por los lados y la
regla natural es retroceder en proporción al aspecto. Medido a 375 × 812, esa
regla lleva la cámara de 42 a **145 radios**: el disco cabe entero y el
espécimen queda en un borrón de cien píxeles. Cumplir la regla al pie de la
letra producía exactamente lo que el §5 prohíbe.

En un teléfono no se pueden tener las dos cosas, y de las dos manda la que hace
de esto una muestra: que la sombra se lea. El retroceso se topa en cuanto la
sombra baja del 12 % del alto —42 → 68.67 radios— y el disco se sale por los
lados, que es lo que hace cualquier fotografía de algo más ancho que su
encuadre.

### Herramientas

`tools/observatory-shot.mjs` deja de dar por supuestos los mandos del
Tesseracto: pregunta al DOM qué existe, recorre las vistas que haya, y **fija el
estado de un mando leyendo `aria-pressed` en vez de contando clics** — el A/B
del bloom salió invertido una vez y no se detectó mirando, sino midiendo, porque
el negro salía más grande CON halo. Nuevos: `--asentamiento`, `--vista=<rótulo>`
y `--movil`. `tools/gargantua-metrics.mjs` acepta `--centro`, `--radio` y
`--encuadre`, porque sus valores clavados eran los de la portada. Y nace
`tools/shot-diff.mjs`, que compara dos capturas contra un suelo de ruido medido.

**Y tres herramientas llevaban desde el 2026-09-13 capturando el perfil plano.**
`shot.mjs`, `composition.mjs` y `stability.mjs` escribían
`jonas-orbit:efectos-forzados`, una clave que el pase de movimiento unificado
renombró y que hoy no lee nadie. Las capturas seguían saliendo, sólo que del
atlas en SVG en vez de la escena. Una captura del cuerpo equivocado no es una
captura mala: es una medición de otra cosa.

*Estado: `npm run check` verde y la suite de Playwright entera en verde —262
pruebas—, con cuatro de navegador nuevas: O5 (ni luz, ni material, ni sonda, ni
órbita, y arrastrar no mueve un número), O12 para su caso (sigue dibujando hasta
asentarse y entonces para), que un clic conmuta también en el espécimen más
lento, y las cuentas del catálogo a tres montadas. Trece pruebas unitarias
nuevas en `lib/gargantua-views.test.ts`. **Pendiente el veredicto visual de
Jonás, y su aprobación del `registro`, que es su voz.***

---

## V4 — la Ranger, y el cuadro que nadie medía (2026-09-19)

*Manda sobre `V3`, el §5 y el §6 en **cómo se ilumina y se encuadra un
espécimen de malla**. El catálogo pasa a `04 / 06 MONTADOS`.*

Montarla fue una línea en `OBSERVATORY_SLUGS`, como estaba prometido. Lo que no
estaba previsto es lo que la Ranger destapó: **este laboratorio llevaba dos
especímenes iluminándolos por donde tocara y encuadrándolos por un solo eje**, y
ninguna de las dos cosas se notaba hasta que entró un cuerpo aerodinámico.

### 1. La actitud de una nave no es suya, es de su sitio

`RANGER_ATTITUDE` no describe a la Ranger: es la SOLUCIÓN de «encarar la luz y
la cámara a la vez» **en la posición que ocupa en el System Map**. Aquí el
espécimen se sienta en `(0, 0, −D)` y la lámpara es el origen, así que la misma
actitud da otra incidencia. Medido sobre la geometría real:

| | dorso · luz | estribor · luz | proa · luz |
|---|---|---|---|
| System Map | **+0.197** | — | — |
| Observatorio | **−0.088** | +0.759 | −0.645 |

El suelo que `bodies.test.ts` vigila en el mapa es 0.15, y aquí sale negativo:
el dorso —donde viven la cabina, su marco, las tapas de servicio y la deriva en
V— cae justo en el arranque del terminador. **Ninguna elección de cámara lo
arregla, porque la cámara no mueve la luz.** Lo mismo le pasa a la Endurance y
no se ve, porque con doce módulos siempre tiene caras encaradas; la Ranger es
casi toda una superficie mirando al mismo sitio.

No se corrige reorientando la nave. Se corrige eligiendo dónde sentarse, que es
lo único que el §6 permite tocar.

### 2. El barrido geométrico eligió mal, y la captura lo dijo

Primer intento, `70 / 35`: sale de proyectar los **2 184 triángulos** del modelo
sobre 36 × 72 direcciones y quedarse con la que maximiza a la vez área vista,
área iluminada e incidencia media — área 17.7, 53 % iluminada, incidencia 0.32,
tres cuartos altos por estribor. Sobre el papel, el óptimo del compromiso. En la
captura, una masa crema sin terminador.

El motivo estaba en el shader desde antes de este pase. La Ranger tiene **bloque
propio** (`uKind == 5`) y está escrito para contraluz: *«a 153° entre luz y
cámara ESTE es el término que dibuja el borde de ataque, la cabina y las
góndolas»*. Su identidad no la lleva el difuso, la llevan la envoltura y el filo
ámbar — y a clave baja esos términos no existen. Maximizar área iluminada era
optimizar justo el término que en esta nave no cuenta.

Ocho capturas con el azimut clavado en 80 y sólo la clave variando, contando
píxeles del cuadro por encima de dos umbrales:

| clave | ≥ 200 (meseta) | ≥ 235 (brillo de verdad) |
|---|---|---|
| 60 | 102 494 (7.9 % del cuadro) | 3 037 |
| 90 | 61 892 (4.8 %) | 4 753 |
| 120 | 26 738 (2.1 %) | 5 380 |
| **135** | **13 298 (1.0 %)** | **6 630** |
| 150 | 4 874 (0.4 %) | 1 479 |

La meseta se desploma a un octavo mientras el brillo real se **dobla**: la luz
deja de ser un lavado y se concentra en cantos. Es el mismo movimiento que el
§9 bis del lenguaje visual pide para las dos naves —«repartir el valor, no bajar
la exposición»— y aquí no cuesta ni un uniforme: sólo elegir dónde sentarse.
Pasados los 145° el cielo del laboratorio se enciende por detrás y le come el
contraste a la silueta, así que **el techo no lo pone el gusto, lo pone el
fondo**.

Preset: **`135 / 80`**, que es además la vecindad de los 153° del mapa. El
visitante llega del System Map y encuentra la nave con la luz donde la dejó.

### 3. `FOV` es el campo VERTICAL, y nadie miraba el otro

La distancia de encuadre era `radius / (boundsFill · sin(fov/2))`. En un cuadro
apaisado eso basta —lo ancho sobra— y por eso no se vio en un año y medio de
capturas a 1440 × 900. En cuanto el cuadro se estrecha, el que recorta es el
ancho, y three.js no compensa: `PerspectiveCamera` conserva el campo vertical y
ESTRECHA el horizontal. Proyectando la malla a **375 × 812**, antes de tocar
nada:

| | alto | ancho |
|---|---|---|
| Tesseracto | 83.4 % | **180.9 %** |
| Endurance | 75.9 % | **185.1 %** |

O sea que en un teléfono los dos especímenes montados salían cortados por los
dos costados, casi al doble del cuadro. No es una regresión de este pase: lleva
ahí desde el primero. Gargantúa no lo sufre porque su encuadre sí conoce el
aspecto (`gargantuaFraming`) — se escribió al montarla, y esto es esa misma
lección aplicada al camino de los sólidos.

`framingFor(aspect)` toma el eje que de verdad recorta. **Por construcción no
mueve ni un píxel de lo aprobado**: con el cuadro apaisado el campo horizontal
es mayor que el vertical, su seno también, y el mínimo vuelve a ser el término
de siempre. Sólo cambia por debajo de un aspecto de 1. Y como el encuadre deja
de ser constante, la esférica se reescala con él: lo que se conserva al girar el
teléfono es el ZOOM del visitante, no su distancia en unidades de mundo.

### 4. Y dos vistas de la Endurance se salían en ESCRITORIO

El instrumento que trajo la Ranger —`observatory-frames.test.ts`, que proyecta
el casco de cada espécimen en cada vista y en los dos formatos— encontró de paso
que `SILUETA` tocaba el borde inferior del cuadro (NDC y = −1.00) y que
`OPERACIONES` se salía por arriba (+1.06), justo la vista cuyo tema son las
toberas encendidas. Corregido subiendo su `distance` a 1.18 y 1.14. El peor de
los doce casos deja hoy un 5 % de aire.

**La pluma queda fuera de la promesa, y a propósito.** `modelRadius` la poda del
radio del cuerpo porque *«una nave no ocupa más espacio por encender un motor»*,
así que el encuadre no la conoce y no puede prometer nada sobre ella. En móvil
se sale del cuadro en las dos vistas de la Ranger que la miran de través, y es
la lectura correcta: un chorro que cruza el borde se lee como chorro. Lo que no
puede salirse nunca es la chapa.

### 5. `boundsFill` 1.0, y el primero que no se calibra por presencia

La Ranger mide 1.40 de largo por 1.21 de envergadura y 0.28 de alto: la figura
más anisótropa del catálogo, y su envolvente la fija el morro. Encuadrada por el
alto se queda en una franja — con el 0.91 del marcador, 28.1 % del alto.

Subirlo tiene tope, y está medido: con **1.15** ocupa el 78 % del alto en
escritorio y en móvil **se le sale el ala** (1.08); con **1.00**, 67 % y cabe
todo (0.95 en el peor caso). Se queda en uno. El §5 pide entre el 70 % y el
85 % y esto da 67, tres puntos por debajo — y es la decisión correcta mientras
el encuadre salga de la ESFERA envolvente: por encima de uno la envolvente se
sale del cuadro y quien garantiza que la figura no la siga es la suerte, no la
fórmula. ⏳ Si Jonás pide más presencia, el precio está dicho.

### 6. Cuatro vistas, y una arquitectura que se cuenta sola

`CANÓNICA` (135/80), `PLANTA` (90/80, la dirección de máxima área proyectada del
barrido: 22.1 contra 20.2), `PROPULSIÓN` (100/135, con el eje de escape mirando
a cámara y sólo el 18 % del área vista recibiendo luz, que es la condición para
que se vea lo que la nave EMITE en vez de lo que refleja) y `PERFIL` (139/190,
través exacto: el producto de la mirada con el costado vale −1.00, así que ni la
proa ni el dorso aportan nada a la silueta).

Y el panel `DATOS` deja de decir `null` para esta muestra:
`craft.userData.rangerArchitecture` publica semialas, planos de cola, largueros
de borde de ataque, campanas, plumas, toberas RCS, balizas, tapas de servicio y
piezas del marco de cabina. **Ningún número está escrito a mano**: el modelo
pasó de repetir `[-1, 1]` ocho veces a declarar cuatro listas, y los conteos
salen de la misma lista que construye las piezas. Verificado con suma de control
sobre los 6 036 vértices — idéntica antes y después del cambio.


### 7. Segunda entrega: la pose por defecto la decidió Jonás

La primera propuesta fue `135 / 80` y la rechazó. Tenía razón, y se ve en la
captura: a 0.74 de dorso son cuarenta y cuatro grados de elevación, o sea la
nave picada y con el morro caído — exactamente el defecto que la fase 1 del
lenguaje visual corrigió en el System Map cuando midió la proa CONTRA LA
PANTALLA y la encontró a −9.7°.

La clave se queda en 135 y el azimut baja a **110**: perfil-tres cuartos, proa a
la izquierda, planta abierta y las dos toberas a la derecha. El tope no es de
gusto: por encima de 115 el ala toca el borde del cuadro en móvil —0.985 del
centro contra el 0.98 que exige `observatory-frames.test.ts`— y a 110 queda en
0.957.

### 8. Y el modelo, que de cerca era otra cosa

El segundo encargo de esa entrega: *«ahora que se ve de cerca se ve que está muy
básica»*. También tenía razón, y el diagnóstico tiene tres partes y un orden.

**La textura, que era casi todo.** La chapa se generaba a 128 con paneles de 32,
o sea CUATRO paneles por cara. Sobre un fuselaje de seiscientos píxeles cada
junta salía de seis píxeles de ancho y difuminada: no una costura, una franja
pintada de negro. Sube a **384 con paneles de 48** —ocho por cara, juntas de un
texel— y gana tres cosas que no tenía: el **labio**, el texel claro que va pegado
a la junta y que es lo que hace que se lea como un escalón y no como una raya;
una **junta intermedia** en un tercio de las celdas, para que la retícula deje de
ser un damero perfecto; y **regueros** en un solo sentido, que es lo que
distingue una chapa que ha volado de una recién pintada. La Endurance se queda
en 128: su manta no tiene juntas que afinar y está aprobada.

**La teselación, donde se ve la silueta.** Todo se dimensionó para setenta
píxeles, donde un canto de dos subdivisiones ya es una curva y un cono de ocho
caras ya es una punta. El fuselaje pasa a tres subdivisiones, la proa a
dieciséis caras, góndolas y campanas a veintidós. Ni un radio cambia, así que la
escala y la silueta del mapa son las mismas.

**La cabina, que era lo peor.** Una esfera aplastada medio enterrada en el
fuselaje: lo que se veía era el trozo que asomaba, una mancha oscura de contorno
irregular sin arriba ni abajo. El problema no era el material —forzada a
cualquier color se veía igual de informe— sino que **una superficie recortada por
otra no tiene forma propia**. Ahora es una cúpula facetada de ocho caras con base
cerrada y cumbrera definida, y su marco —cumbrera, dos arcos y dos rieles— pasa
del metal oscuro de la quilla a la CHAPA, porque la dirección de arte lo dice
desde el primer pase: «cristal oscuro hundido entre dos montantes claros».

**Y las piezas que una nave tiene y ésta no tenía**: espina dorsal, anillo de
escotilla, antena de pala, tubo de Pitot, seis puertos de maniobra por costado,
rejillas en las góndolas, vallas de ala, carenados de actuador, carenado de
encastre —que tapa la interpenetración ala-fuselaje, que estaba a la vista— y el
interior de las campanas: garganta, anillo de cardán y tres nervios. Todo dentro
de la envolvente: **el radio del cuerpo sigue siendo 2.5640**, así que ni el
blanco de clic ni la distancia de encuadre se mueven.

Una corrección por el camino, y vale la pena anotarla: la primera versión puso
esos carenados en el METAL OSCURO de la estructura, y el resultado fue una
franja negra de punta a punta del lomo. Un carenado es del mismo material que el
casco; lo que lo separa no es su color, es el canto que proyecta.

**El presupuesto.** Las llamadas de dibujo no se mueven —tres por nave, veinte en
el sistema—: todo el detalle nuevo se fusiona en las mallas que ya existían. Los
vértices sí, y ahí había un candado: el techo estaba en 19 500 con 19 361
ocupados, o sea 139 de margen para los cinco cuerpos. Sube a **22 500** con el
reparto escrito en `bodies.test.ts`, y se recortó antes de subirlo —el fuselaje
de cinco subdivisiones a tres, una docena de carenados de `roundedBox` a
`BoxGeometry`— lo que devolvió 2 694 de los 5 306 que había costado el pase. La
Ranger queda en 4 624 contra los 12 163 de la Endurance. No se ha medido que
esta subida cueste tiempo de fotograma y no se afirma: lo que se afirma es que
el coste de la portada lo pone el raymarch de Gargantúa, entre 190 y 340 pasos
por píxel, y no veintidós mil vértices procesados una vez.

*Estado: `npm run check` verde. Pendientes el veredicto visual de Jonás sobre
las cuatro vistas y el `registro` de la Ranger, que es su voz y por eso no está
escrito en el MDX.*

## V5 — Miller y Edmunds, y el laboratorio completo (2026-09-20)

*Manda sobre `V4` y el §6 en **cómo se ilumina y se encuadra un cuerpo
esférico**, y sobre el §5 en **qué significa `boundsFill`**. El catálogo pasa a
`06 / 06 MONTADOS`: no queda ninguna muestra sin puerta.*

Montar los dos últimos fue dos líneas en `OBSERVATORY_SLUGS`, y esta vez sí fue
sólo eso: la recepción, el raíl, el sitemap, `generateStaticParams` y la cifra
de la cabecera salieron solos. Lo que sí hubo que hacer es lo que el propio
preset llevaba pidiendo por escrito desde la V1 — **los dos llegaban con
marcadores y con una nota que decía «⏳ sin montar: hasta que haya captura que
medir»**. Esto es esa captura.

### 1. Una esfera es su propia envolvente, y eso cambia qué es `boundsFill`

En las cuatro muestras anteriores ese campo era una calibración y no una
medida, porque la esfera envolvente y la figura no son lo mismo: un 4-cubo en
alambre toca la suya en ocho vértices, la Endurance en las puntas de sus
radiadores y la Ranger en la baliza del morro. De ahí que tres figuras
razonables acabaran en `0.91`, `1.15` y `1.00` sin que esos números se puedan
comparar entre sí.

Con un planeta la ambigüedad desaparece: la envolvente **es** la silueta, y la
fracción del alto del cuadro sale de la aritmética del encuadre,

    fracción = tan(asin(boundsFill · sin(fov/2))) / tan(fov/2)

Comprobado sobre captura antes de darlo por bueno, que es lo que este campo
exige:

| `boundsFill` | promete | mide |
|---|---|---|
| 0.91 | 90.0 % del alto | **89.6 %** |
| 0.78 | 76.0 % del alto | **75.4 %** |

El medio punto que falta es la teselación: el poliedro va inscrito en la esfera
que `modelRadius` mide. Los dos se quedan en **0.78**, que es mitad de la banda
del §5 (70-85 %) — y son los dos primeros especímenes que la cumplen sin
discusión ni nota al pie.

### 2. Miller: los 25° eran una frase de óptica que este shader no cumple

El marcador decía «casi frontal: el camino de luz y la cresta son reflejos, y un
reflejo sólo vuelve a la cámara cuando la fuente está cerca de su eje; a 90°
Miller es un planeta azul cualquiera». Suena a física y no describe este
material. `oceanSheet` y `oceanGlint` son gaussianas sobre `alongOff` /
`acrossOff`, que miden la separación respecto de la **dirección especular** — y
ésa existe para cualquier ángulo de clave. El destello se pondera además con
`mix(0.86, 1.34, waterFresnel)`: un espejo devuelve **más** cuanto más rasante
se le mira.

Cinco capturas con el azimut clavado en 20, descontando los 25 px fijos que
el instrumento cuenta siempre, también sobre un cuadro apagado: son el
indicador del servidor de desarrollo (`NEXTJS-PORTAL`, comprobado con
`elementFromPoint`) y no un píxel del espécimen. Conviene tenerlo anotado
porque lo arrastra cualquier medición de brillo hecha contra `npm run dev`:

| clave | blanco real (≥250) | meseta (≥200) | luz total |
|---|---|---|---|
| 25 | **0 px** | 18 537 | 44.0 Mlum |
| 45 | 172 px | **22 573** | 39.5 Mlum |
| 55 | 120 px | 21 786 | 35.4 Mlum |
| 75 | 314 px | 19 208 | 25.1 Mlum |
| 90 | 259 px | 15 174 | 18.1 Mlum |

**A 25° el camino de luz no llega a blanco ni en un píxel.** La lámina se
extiende en meseta por medio disco en vez de concentrarse en un trazo — es el
mismo movimiento que el §9 bis pidió para las naves, leído al revés: aquí el
defecto era el lavado y no la penumbra. Y sin terminador el cuerpo no tiene
volumen: Miller a 25° es una calcomanía azul.

Preset **`55 / 20`**, que es donde coinciden meseta casi máxima, blanco de
verdad en el trazo y un terminador que saca las bandas latitudinales — que son
lo que impide que la lámina se lea como gas. Los 25° no se tiran: bajan a la
vista `ESPEJO`.

### 3. Edmunds: los 82° eran verdad, y nadie había medido el precio

«Edmunds se define por PENDIENTE y no por altura, así que la luz casi tangente
es el instrumento correcto para ese campo» — eso sigue siendo cierto. Lo que
faltaba es cuánto cuesta. Cinco capturas con el azimut clavado en 10, sobre un
disco de 678 px:

| clave | ancho iluminado | alto ocupado | luz total |
|---|---|---|---|
| 30 | 605 px (89 %) | 74.4 % | 31.3 Mlum |
| 55 | 466 px (69 %) | 72.6 % | 20.1 Mlum |
| 65 | 395 px (58 %) | 70.0 % | 15.6 Mlum |
| 82 | 267 px (39 %) | **65.2 %** | 9.0 Mlum |
| 110 | 0 px | 0.9 % | 2.4 Mlum |

La ocupación se mide sobre **luz**, no sobre geometría, así que a 82° cae por
debajo del suelo del 70 % que pide el §5 sin que el encuadre tenga nada que
ver: el cuerpo cabe entero y se ve la mitad. Preset **`55 / 10`**, donde el
69 % del ancho lleva luz, la sombra larga de la cordillera sigue ahí y el campo
de provincias se lee entero. Los 82° bajan a la vista `RASANTE`, que es su
sitio: **una vista curada es para el extremo que revela una propiedad bajo
demanda; un preset es lo que ve quien entra.**

Y una cifra que dice de qué está hecho este cuerpo: en todo el barrido, de 30° a
150°, **Edmunds no llega a blanco en un solo píxel**. El instrumento cuenta los
mismos 25 px del indicador en las cinco capturas. La roca no tiene especular,
y eso no es falta de exposición.

### 4. Ningún planeta de este laboratorio admite contraluz

No es cuestión de grados: **todos los términos de canto de `uKind == 0` y
`uKind == 1` están cerrados por `ndl`**. El filo de aire de Miller va por
`airLit = smoothstep(0.20, 0.90, ndl)` y el arco de Edmunds por
`smoothstep(0.26, 0.94, ndl)`, así que lo que enciende su limbo es MIRAR A LA
LUZ, no tenerla detrás. En un punto del limbo el producto `n·l` no pasa de
`sin(clave)`, o sea que el término se apaga solo según la clave se acerca a 180.

Medido: a 160° Miller deja **94 px** por encima de 200 y a 150° Edmunds deja
**93** — contra los veinte mil de sus poses de trabajo. Y lo que ocupa el cuadro
en esas dos capturas no es el espécimen: es el cielo del laboratorio
encendiéndose por detrás.

O sea que la vista `SILUETA` del Tesseracto y de la Endurance **no es
trasladable**, y el motivo es material: aquél tiene `rim` propio y las dos naves
tienen envoltura y filo ámbar escritos para contraluz. Un planeta a contraluz en
este laboratorio es un agujero.

### 5. Seis vistas, y ninguna con `distance`

`MILLER` — `CANÓNICA` (el camino de luz con su cresta y el terminador),
`ESPEJO` (25°: la lámina abierta, hasta dónde llega el campo de destellos, al
precio de perder el volumen) y `CORRIENTES` (92°: las bandas picando la lámina y
el filo de aire en su máximo).

`EDMUNDS` — `CANÓNICA` (provincias y cordillera), `RASANTE` (82°: la pendiente
convertida en sombra larga y el limbo troceado en cresta, hueco y destello) y
`PROVINCIAS` (30°: con el sombreado aplanado lo único que queda dibujando es el
albedo, o sea los seis minerales separados del relieve que los tapa).

Ninguna toca `distance`, y tampoco es un olvido. La regla «una vista puede
alejarse, nunca acercarse» existe porque la silueta del Tesseracto respira
treinta y un puntos. **Una esfera no respira**: es la única figura del catálogo
cuya ocupación es idéntica en todas sus vistas, así que el encuadre del preset
vale para las tres sin corrección.

### 6. Lo que el laboratorio NO puede enseñar de estos dos

`specimenContract` devuelve `architecture: null` para los dos, así que el panel
`DATOS` se queda sin su familia `OBJETO` y enseña sólo `OBSERVACIÓN` y `RENDER`
— una llamada de dibujo, un material, 1 107 vértices. Eso ya estaba escrito en
ese módulo desde la V1 y se confirma montándolos: **no tienen estructura que
contar, son una esfera con un material**, y toda su identidad vive en parámetros
de shader, que son texto GLSL y no datos en ejecución. Publicarlos exigiría
copiarlos a mano, que es exactamente lo que el §8 prohíbe. Si algún día se
quieren contar, entran como CONTENIDO en el MDX citando el documento de lenguaje
visual — no disfrazados de medición.

### 7. Edmunds es el primer espécimen cuya imagen no cambia nunca

Medido con `shot-diff.mjs` sobre dos capturas separadas nueve segundos, sin
tocar nada:

| | media \|Δ\| | píxeles que cambian |
|---|---|---|
| Miller | **2.8241** | 27.3 % |
| Edmunds | **0.0007** | 0.001 % |

Miller se mueve porque su oleaje va por `uTime` dentro del shader, aunque
`simpleWorld` no declare ningún `animate`. Edmunds no se mueve en absoluto, y
sin embargo el bucle le dibuja sesenta fotogramas por segundo: `renderFrame`
marca `dirty` en cuanto hay movimiento global, sin preguntar si el espécimen
cambia.

**No se toca, y a propósito.** O12 afirma que el bucle llega a cero *con el
interruptor de movimiento apagado*, y eso se sigue cumpliendo; el contrato no
promete nada más. Cambiarlo obligaría a declarar a mano qué cuerpo se anima —un
dato que se separa del shader el día que alguien le meta tiempo al desierto— y a
tocar el bucle de los cinco especímenes para ahorrar fotogramas en uno, con un
beneficio que no se ha medido. Queda anotado con su número: **el ahorro está
identificado y el precio de cobrarlo no está calculado.**

### 8. El índice se queda sin huecos, y eso cambia qué vigilan dos pruebas

`indice.locator("[aria-disabled='true']")` pasa de 2 a **0**. La aserción no
desaparece porque ha cambiado de sentido: antes vigilaba que las muestras sin
montar no fingieran ser puertas, y ahora vigila lo contrario —que ninguna
montada pierda su `href`—, que es lo único que puede romperse ya. La cobertura
del estado deshabilitado no se pierde: vive en el fixture deliberadamente mixto
de `components/observatory-chrome.test.tsx`, que existe precisamente para no
depender de que el catálogo real tenga huecos.

Y `lib/observation-views.test.ts` deja de comprobar a mano que el Tesseracto y
la Endurance tienen vistas: ahora recorre `OBSERVATORY_SLUGS`. Esa línea escrita
a mano es la razón de que la suite se hubiera quedado verde con dos muestras
montadas y sin una sola vista curada.

*Estado: `npm run check` verde. El System Map, sus cuerpos, cámara y materiales
no cambian. Pendientes el veredicto visual de Jonás sobre los dos presets
—`55 / 20` y `55 / 10`, elegidos de un barrido que se le envía entero— y sobre
las seis vistas; y los `registro` de Miller y Edmunds, que son su voz y por eso
no están escritos en el MDX.*

## V6 — el eje de la figura, el tercer gesto (2026-09-20)

*Manda sobre `V2` y el §5 en **qué mandos ofrece la consola**, y sobre el §6 en
**qué puede tocar el Observatorio de un espécimen**. Lo pidió Jonás el mismo
día que se cerró la V5: «un control para la rotación de los objetos como
endurance, miller, edmunds y ranger».*

### 1. Lo que faltaba no era un mando, era un gesto

El laboratorio tenía dos maneras de cambiar lo que se ve, y **las dos cambiaban
dos cosas a la vez**:

| gesto | qué mueve | qué cara se ve | ángulo de clave |
|---|---|---|---|
| arrastre | la cámara | cambia | **cambia** |
| `LUZ` | el cuerpo alrededor del origen | **igual** | cambia |
| `EJE` | la figura sobre su propio eje | cambia | **igual** |

La primera fila es consecuencia directa del §6: la luz **es** el origen del
mundo, así que rodear el espécimen es cambiar de dónde le llega la clave. Eso
hace el arrastre muy expresivo y completamente inútil para una pregunta
concreta: *¿qué hay en la otra mitad de este cuerpo?* Con el arrastre, la otra
mitad llega siempre iluminada de otra manera, y no hay forma de saber si lo que
se está viendo es geografía o es luz.

La tercera fila es el mando nuevo, y es el único de los tres que no toca la
geometría de luz — ni por descuido ni por cuidado, sino **por construcción**:
girar la figura es una rotación del modelo, y `lightGeometry` se calcula entera
con tres vectores del mundo —cámara, cuerpo y vertical— en los que la
orientación del modelo no aparece.

Dónde se nota, muestra por muestra:

- **Edmunds** tiene seis provincias minerales y una cordillera, y desde la pose
  del preset se ve poco más de la mitad del cuerpo. Girarlo es la única forma
  de ver la cuenca pálida, que asoma hacia los 300°.
- **Miller** deja la demostración más limpia del contrato: al girar, **el camino
  de luz no se mueve** —es de la luz, no del agua— y las corrientes y la nube
  pasan por debajo de él.
- **La Endurance** gira sobre el eje de su aro, así que los doce módulos
  desfilan por delante. Es el gesto que la nave hace en la película.
- **La Ranger** alabea sobre su eje de proa y enseña el vientre, que desde la
  pose del preset no se ve nunca. La V4 le puso espina dorsal, escotilla,
  antenas, rejillas y carenados nuevos; la mitad de ese trabajo no tenía forma
  de verse.

### 2. Un eje, y es el que el cuerpo ya declaraba

`turnTo` usa `spinAxis`, el mismo del System Map: polo en los dos mundos, eje
del aro en la Endurance, proa-popa en la Ranger. **No se le inventa un segundo
eje a ninguna figura**, y ésa es la versión de este pase de la regla del §6: el
laboratorio puede cambiar las condiciones de observación, no afirmar cosas
sobre el objeto que el objeto no dice.

`turnTo(radianes)` es además la primera mitad de `spinAt` sacada a la luz, y las
dos la comparten. No podía ser `spinAt` quien sirviera al mando: multiplica por
`SPIN_RATE`, y esa tabla vale **cero** para la Ranger — el único mando capaz de
girar una lanzadera habría sido el que no la gira nunca.

### 3. Las dos ausencias, que no son de la misma clase

**Gargantúa** no tiene malla. `createBody` devuelve `null` y no hay raíz que
girar: la misma frontera que ya la deja fuera de los presets.

**El Tesseracto** sí tiene malla, y se queda fuera igual. Su motivo estaba
escrito desde antes de que este mando existiera, en la nota de su `SPIN_RATE`:
*«un objeto que gira sobre su eje afirma que tiene un eje, un dentro y un fuera
estables — que es exactamente la lectura que su diseño intenta negar»*. Y su
orientación de reposo no es una pose entre otras, es **toda** su lectura: el eje
de la recursión casi enfilado a la cámara, los tres marcos uno dentro de otro.
Un dial que la deshaga no ofrece otra cara, le quita la suya.

La Ranger también vale cero en `SPIN_RATE` y aquí **sí** entra. La asimetría es
la decisión de este pase: los dos ceros de esa tabla no dicen lo mismo. El del
Tesseracto niega que haya eje; el de la Ranger dice que una lanzadera dando
vueltas sola es «un modelo colgado de un hilo». Lo primero sobrevive a una mano
en el dial, lo segundo no — **una vuelta pedida no es una vuelta que se dé
sola**.

La lista vive en `hasTurnInstrument` y sale del handle, igual que `LUZ`: el
visor monta la fila si el método existe, y no deduce nada. Un mando que existe y
no obedece es peor que un mando que no está.

### 4. La envolvente es invariante, y por eso el encuadre no se toca

Era la pregunta obligada: si la figura da media vuelta, ¿sigue cabiendo? Tiene
dos capas y sólo la segunda necesita medirse.

**La envolvente no cambia.** El eje pasa por el origen de la raíz y
`modelRadius` mide el vértice más lejano de ese mismo origen, así que la esfera
envolvente es idéntica a cualquier ángulo. Como toda la aritmética del encuadre
sale de ese número, este mando no tocó ni una línea de `framingFor`. Lo fija
`bodies.test.ts` barriendo el círculo entero.

**La silueta dentro de esa envolvente sí se pasea.** Una esfera no —es su propia
envolvente— pero la Endurance toca la suya en las puntas de los radiadores.
Medido a un grado, sobre el preset y las cuatro vistas curadas de cada muestra:

| muestra | en reposo | peor del círculo | envolvente |
|---|---|---|---|
| Endurance (escritorio) | 0.947 | **1.041** (`RASANTE`, 249°) | 1.175 |
| Endurance (móvil) | 0.943 | **1.038** (`CANÓNICA`, 271°) | 1.155 |
| Ranger (escritorio) | 0.950 | **0.987** (`PROPULSIÓN`, 343°) | 1.000 |
| Miller / Edmunds | 0.760 | **0.760** | 0.7605 |

Los dos planetas llegan a su envolvente con un margen de 7·10⁻⁶ y no lo cruzan
nunca, que es la V5 dicha otra vez y ahora en movimiento: el vértice extremo del
poliedro se sienta exactamente sobre el disco que `boundsFill` promete.

Y la conclusión que hay que dejar escrita, porque se lee mal de otra manera:
**la promesa del §5 es la envolvente, no el borde del cuadro, y cubre las poses
que el laboratorio ELIGE** —el preset y las vistas curadas, que es lo que fija
el primer bloque de `observatory-frames.test.ts`—. Donde manda la mano del
visitante la promesa siempre fue más débil, y lo era antes de este mando:
medido, **el arrastre lleva el casco de la Endurance a 1.174** del semicuadro en
escritorio, más lejos de lo que puede llevarlo la vuelta entera del eje. Girar
es el más suave de los dos gestos que ya existían.

### 5. Una vista no devuelve la cara; `Reajustar` sí

`applyView` devuelve la luz a casa antes de colocar la cámara, y eso **no** es
simetría: es corrección. Los dos ángulos de una vista están declarados contra la
luz canónica, así que sobre una luz movida a mano darían un ángulo de clave que
la vista no promete.

El giro de la figura no entra en ninguna de esas cuentas —ni en `keyAngle`, ni
en `keyAzimuth`, ni en el encuadre, que sale de una envolvente invariante— así
que devolverlo no corregiría nada y sí le quitaría al visitante lo que acaba de
elegir. **Se escoge la cara y se barren las vistas sobre ella.** `Reajustar`
sigue devolviendo las dos cosas, porque «la pose del preset» las incluye.

### 6. El único mando de la consola que no es además una lectura

`CLAVE` y `GIRO` se mueven solos mientras el visitante orbita, y eso es lo que
los separa de un formulario. `EJE` no puede: nada más en el aparato cambia la
orientación propia de la figura —ni el arrastre, ni el zoom, ni las vistas, ni
el interruptor de movimiento—, así que su valor es siempre el que alguien pidió.
Publicarlo en cada fotograma habría sido un temporizador disfrazado de
telemetría, que es lo que el §8 llama un dato que se repite solo. Su cifra la
escribe el propio mando, y `Reajustar` la devuelve al centro.

El recorrido va de **−180 a 180** y no de 0 a 360, aunque la vuelta sea la
misma: así el reposo cae en el centro del dial, se ve de un vistazo cuánto se ha
girado y se llega a cualquier cara en un solo arrastre.

Y una palabra cambia en la pista: **«arrastra para orbitar»**, no «para girar».
Hasta ahora las dos eran la misma cosa porque sólo había una; desde que se puede
girar la figura, llamar «girar» al arrastre anunciaría igual los dos gestos —y
el que se anuncia ahí es justo el que **no** conserva la iluminación.

### 7. Lo que se probó

- `bodies.test.ts` — la envolvente no cambia en todo el círculo; el giro es
  absoluto e idempotente; el cero es la orientación de reposo; y la Ranger
  alabea sobre su eje de proa en vez de cabecear (la proa se queda quieta y el
  dorso se va a estribor).
- `observatory-frames.test.ts` — segundo bloque: el círculo entero de cada
  muestra girable contra su envolvente analítica, en los dos formatos.
- `lib/observatory.test.ts` — la frontera del mando, con sus dos ausencias.
- `observatory-chrome.test.tsx` — la fila manda el número y `Reajustar` la
  devuelve al centro; y sin método publicado no hay fila.
- `e2e/observatorio.spec.ts` — el contrario exacto de la prueba de `LUZ`: al
  girar, **ninguna** de las cuatro lecturas se mueve y la imagen **sí**. El
  movimiento se apaga antes para que el único motivo posible de un cambio de
  píxeles sea la vuelta pedida; sin ese trozo, un mando desconectado pasaría el
  test con matrícula. Y el Tesseracto y Gargantúa no enseñan el dial.
- `tools/observatory-shot.mjs` gana dos pasos, `07b` y `07c`: cuarto y media
  vuelta, por teclado como `LUZ` y por lo mismo —un ángulo se puede nombrar al
  comparar dos capturas, y el píxel donde se suelte el ratón no.

*Estado: `npm run check` verde (405 pruebas). `e2e/observatorio.spec.ts` verde en
escritorio y en móvil. El System Map, sus cuerpos, cámara y materiales no
cambian: `spinAt` sigue dando exactamente lo mismo que antes. Pendiente el
veredicto visual de Jonás, con cuatro barridos de seis ángulos enviados.*


## Pase de simplificación — recepción y silencio (2026-09-23)

Petición del dueño con captura del pie de `/es/experimentos`: «simplificarlo
más, el texto no me convence ni el diseño»; «audita bien el observatorio y la
página del teseracto»; y «los sonidos del observatorio no me gustan para nada,
cambiarlos o mejor eliminarlos». Aprobación visual pendiente.

1. **El pie es una frase y su eco.** Fuera divisa (`Curiosidad técnica
   dirigida`), los tres hechos en mono y el cierre con `//`. Queda el cierre
   del mundo como frase —«Aquí una idea se convierte en prototipo.»— con un
   filete ámbar encima, y la introducción en una línea debajo: «Pruebo
   movimiento, interfaces espaciales y render en tiempo real. Lo que funciona
   acaba mejorando productos reales.» Los dos textos se reescribieron en
   `content/es/worlds/tesseract.mdx` desde los anteriores, sin añadir nada. Los
   `facts` se quedan en el MDX (el esquema los exige) pero esta página ya no
   los pinta.
2. **Sin «LISTO».** Con 06/06 montados, seis `LISTO` en cian repetían la cuenta
   de la cabecera. La columna de estado sólo habla durante la adquisición
   (`Adquiriendo`, `Bloqueo`, `Montando`) y en una muestra sin montar.
3. **Se lee el par de cada muestra** (`CRISTAL / CUARTA DIMENSIÓN`): de 0,58 rem
   al 62 % a 0,62 rem al 82 %; la cifra, del 55 % al 72 %.
4. **Silencio.** Ver `sonido-del-sitio.md` §«El Observatorio calla».
5. **La pista del visor no promete un gesto que no existe.** En táctil decía
   «rueda para acercar» y el visor no tiene pellizco: con puntero grueso queda
   «Arrastra para orbitar».

Auditados y **no tocados a propósito**: el velo del modo cine en `OBSERVAR`
(decisión del V2: controles al 6 % en reposo, cabecera y raíl al 30 %) y la
consola de `ESTUDIO`, que al desplegarse tapa la parte baja de la figura. Si
el dueño la nota pesada, la palanca barata sigue siendo el velo y el calibre de
las filas. Pendiente de decidir: pellizco para acercar en móvil.

Validación: lint, tipos, Knip, unitarias; e2e `experimentos`, `soundtrack` y
`observatorio` en Chromium escritorio y móvil (26 + 38) sobre un build de
producción aislado.

## La ficha plegada — notas de construcción en la cara servida (2026-10-07)

Search Console marcó las páginas de los especímenes como «Descubierta:
actualmente sin indexar», y la cara servida sólo traía ~70 palabras: el riesgo
siguiente era «Rastreada: actualmente sin indexar» por contenido escaso.

1. **El resumen es del espécimen, nunca del mundo.** Sin `summary` propio la
   cara caía a `world.prose.summary`, que es el significado de la SECCIÓN: la
   Ranger decía «hablemos». Ahora cae a `seoDescription`.
2. **`observatory.notes`** (2-4 frases, ES/EN, en los seis MDX): cómo está
   hecho el cuerpo, sólo con hechos rastreables al código, a este documento o
   a las entradas del blog. No es el registro —ése es la voz de Jonás y sigue
   sin escribirse donde falta—; donde existe (Endurance, Tesseracto) la ficha
   lo enseña también.
3. **Plegada** (`<details>` «Notas de construcción» / «Build notes»): cerrada
   es una línea más en la cara, coherente con el pase de silencio; abierta,
   `.observatory__served` ya desplaza. Es HTML servido: se abre sin
   JavaScript (O8 lo comprueba) y el buscador la lee abierta o cerrada.

La cara pasa de ~70 a 190-360 palabras según el espécimen. Las notas son un
borrador para que Jonás las revise.
