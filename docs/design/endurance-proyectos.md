# Endurance — la mesa de ingeniería

Diseño de `/es/proyectos`. Este documento manda sobre `WorldPage` +
`ProjectGrid` —la ficha genérica que ocupa hoy la ruta— en **composición,
interacción, contenido de arquitectura y límites de la página Proyectos**. No
toca el System Map, la Endurance del mapa, su cámara ni sus materiales; tampoco
toca `/es/proyectos/[slug]`, que sigue siendo el caso completo.

Estado: **plan aprobado por el dueño en dirección; construcción pendiente.**
Fecha: 2026-09-21. Boceto del dueño en `assets/proyectos/boceto-mesa-2026-09-21.webp`
(referencia de composición, no de contenido: ver §3).

---

## 1. La petición, y lo que significa

Texto del dueño, 2026-09-21:

> Mesa de ingeniería — desplegar cada proyecto. Entras en una sala oscura con
> una mesa de proyección. Sobre ella aparece una representación visual del
> proyecto seleccionado: sus pantallas, conectadas como las piezas de un
> sistema. Resultado: la interfaz terminada ocupa el centro. Diseño: aparecen
> pantallas y decisiones de experiencia de usuario. Ingeniería: se despliega un
> esquema sencillo de cómo funciona, basado en su arquitectura real. El
> visitante decide cuánto profundizar; el resumen y los enlaces permanecen a
> mano. El momento especial: pasar de ver un producto bonito a entender cómo lo
> pensaste y construiste.

Y una instrucción de nivel: «quiero que esta sea una de las mejores páginas de
todo el proyecto».

Lo que la petición pide de verdad no es una galería con tres pestañas. Es que
**el mismo objeto se lea a tres profundidades**: como producto, como decisiones
de experiencia y como sistema. La página existe para el momento en que el
visitante pasa de la primera a la tercera y descubre que quien diseñó la
pantalla es quien decidió que los pagos fueran idempotentes. Ese tránsito es
lo que ninguna otra página del portafolio puede enseñar, y todo lo que sigue
está al servicio de él.

Encaja con la arquitectura narrativa sin forzarla: Endurance es la nave que se
construyó, y Proyectos es el trabajo construido. Es además la última página
marcada como bespoke (`BESPOKE_WORLD_IDS`) que sigue con la ficha genérica.

## 2. Qué se verificó antes de escribir esto

- **El contenido de las tres capas ya existe.** OMSTA y Delicaté son casos de
  diecisiete secciones; `8. Decisiones importantes`, `9. Arquitectura y stack`,
  `12. Diseño y UX` y `13. Capturas y demo` son exactamente Ingeniería, Diseño y
  Resultado. Las tres fichas breves (Izak's, Wiki Universe, Network) llevan
  `decision`, `technologies`, `highlights` y galería. No hay que inventar nada:
  hay que **estructurar** lo que ya está escrito para que una máquina lo pueda
  disponer sobre una mesa.
- **La ruta del caso completo existe y funciona** (`/es/proyectos/[slug]`,
  `ProjectCase`, A20 y A30 cubiertos). La mesa no lo duplica: es el instrumento
  para elegir cuánto profundizar y el caso es la profundidad entera.
- **El índice publica cuatro proyectos, no cinco.** `getF1AProjects` filtra por
  `F1A_PROJECT_IDS` y Delicaté está en F1B por decisión del plan (2026-07-23,
  ratificada 2026-08-03). Su caso está redactado y sus capturas existen. El
  boceto muestra cinco; ver la decisión abierta en §13.
- **Las capturas son PNG reales de pantalla**, sin marco de dispositivo:
  escritorio a 1440 × 900 (Izak's a 2160 × 1500) y móvil a 390 × 844 (Izak's a
  780 × 1688). Pesan entre 29 KB y 3,2 MB; las tres de Izak's suman 5,7 MB.
  Hoy `ProjectCase` las sirve por `next/image`. Para una mesa que pinta hasta
  ocho a la vez hacen falta peldaños WebP preparados, como en Edmunds (§9).
- **Hay precedente para cada pieza técnica**: vestíbulo fotográfico sin WebGL
  (`ExperimentsHall`, `assets/experimentos/FUENTES.md`,
  `tools/prepare-experiments.mjs`), anillo CSS 3D movido por UN número
  (`--drag`, Edmunds sexto pase), selección sin JS por `:target` (Sobre mí),
  encendido aditivo (Ranger), y la lista `COVERED_WORLDS` para dormir la escena
  persistente. Nada de esta página pide una tecnología nueva.
- **La escena persistente hoy sigue viva detrás de `/es/proyectos`**:
  `endurance` no está en `COVERED_WORLDS`. Con una sala a todo el ancho eso es
  un contexto WebGL dibujando debajo de una fotografía opaca.

## 3. Tres principios

1. **Una sola escena, tres disposiciones.** Resultado, Diseño e Ingeniería no
   son tres pantallas: son los mismos objetos —las capturas del proyecto— en
   tres posiciones. En Resultado la interfaz terminada ocupa el centro y las
   demás se retiran. En Diseño se abren en abanico y cada una lleva su nota de
   experiencia. En Ingeniería se encogen a nodos, entran los módulos que no
   tienen pantalla (base de datos, worker, API) y aparecen las líneas. Si el
   visitante ve que la pantalla que miraba se convierte en un nodo del sistema,
   la página cumple su promesa. Si ve un carrusel que cambia de pestaña, no.
2. **La arquitectura es contenido, no dibujo.** El esquema de Ingeniería sale
   del frontmatter del MDX (§6), validado por Velite, y la página lo dispone.
   El boceto del dueño enseña un diagrama de microservicios con gateway, rate
   limiting y servicio de notificaciones: **no es OMSTA**, que es un monolito
   Django modular con PostgreSQL como fuente de verdad. Lo que se dibuja es lo
   que el caso dice, con sus palabras. Regla 8. Y como el significado vive en el
   MDX, la página no lleva ni una palabra de proyecto en código (regla 4 y
   `arquitectura-narrativa.md`).
3. **Las decisiones van pegadas a las cajas.** Lo que muestra cómo se pensó un
   sistema no son las cajas, son las decisiones que se tomaron en cada una: en
   Pagos, «servicios atómicos e idempotentes»; en Worker, «estado durable en
   PostgreSQL». Cada nodo puede llevar una decisión y la capa Ingeniería la
   enseña al apuntar o enfocar el nodo. Es la diferencia entre un diagrama de
   stack, que cualquiera tiene, y un mapa de criterio.

Y un cuarto que hereda del resto del sitio: **el HTML servido está completo**.
Las tres capas son tres secciones reales en el DOM, el esquema sin JavaScript es
una lista de nodos con sus decisiones, y la mesa sólo añade disposición y
movimiento encima. Regla 7.

## 4. Composición

La primera pantalla es la sala entera, con la cabecera del sitio como techo,
igual que en la Ranger. Cuatro capas, de atrás hacia delante:

### 4.1 La sala

Una fotografía, como el vestíbulo de Experimentos, y ninguna capa más que las
que la integran. Interior de una bahía de ingeniería de la Endurance a oscuras:
paredes de módulos con cajas y equipo, un ventanal ancho con un limbo de
planeta, y en primer plano una **mesa de proyección vacía** con su superficie
oscura ocupando el tercio inferior del cuadro. Paleta reducida: negro, carbón,
acero frío y ámbar de las luces de servicio; el cian queda reservado para lo que
proyecta la mesa, que es lo que se debe mirar.

Restricciones de la imagen, las mismas que costaron una entrega en Experimentos:
**sin texto, sin rótulos, sin interfaz, sin pantallas pintadas y sin figura**.
Todo lo que informa es HTML. La mesa tiene que ser una superficie limpia porque
encima va la proyección real, y una pantalla pintada dentro de la foto sería
una captura falsa (regla 8). Original en `assets/proyectos/`, copias en
`public/images/proyectos/` por `tools/prepare-projects.mjs`, informe de origen
en `assets/proyectos/FUENTES.md` con el mismo formato que el de Experimentos.
Formato apaisado (3:2 o 16:10) porque aquí la sala se pinta a lo ANCHO, al
revés que el vestíbulo, y la mesa tiene que cruzar la pantalla entera.

Mientras la fotografía no exista, la sala es CSS: fondo `#04060a`, un
degradado de ventanal y el plano de la mesa como trapecio en perspectiva con
rejilla fina. No es un placeholder disfrazado —no afirma nada— y deja construir
y probar toda la mesa sin depender de la imagen. La foto la sustituye sin tocar
una línea de la mesa.

### 4.2 La mesa

Un plano en perspectiva CSS (`perspective` en el escenario, `rotateX` en la
mesa) que ocupa el tercio inferior y todo el ancho útil. Sobre la superficie va
**grabado** el esquema plano de la Endurance —el mismo `FlatWorldBody` del
mapa, en trazo fino y opacidad baja— con el rótulo del proyecto activo y su
divisa en tipografía técnica. Es decoración con sentido: la mesa pertenece a la
nave y el proyecto está apoyado sobre ella. No lleva datos.

Encima de la mesa, en el mismo contexto 3D, flotan las **pantallas**: cada
captura del proyecto en un marco fino de cristal con canto cian, sombra sobre
la mesa y una línea de conexión que cae a su ancla en la superficie. Las
pantallas viven en un contexto 3D y la mesa en el suyo, detrás: lección de
Edmunds, un suelo inclinado dentro del mismo contexto que las obras se levanta
por delante de la activa. Y los contenedores llevan `pointer-events: none`;
sólo las pantallas y los nodos reciben el puntero.

### 4.3 La lectura

Columna izquierda, sobre la sala, como el bloque de copia de la Ranger:

- Kicker `ENDURANCE / MESA DE INGENIERÍA`, `h1` **Proyectos** (el título de la
  página es el destino, no el proyecto).
- Regla corta, `h2` con el título del proyecto activo, su `summary` en una
  línea, y el **estado real** como lectura con punto: `EN PRODUCCIÓN` o
  `LISTO PARA PRODUCCIÓN`, derivado de `projectsData.status`, con
  `statusLabel` como título accesible. El boceto no lo enseña y el contenido
  insiste en «estado verificable»: va.
- CTA primario **«Explorar proyecto»** al caso completo. Siempre presente, en
  cualquier capa, porque A20 promete hero → Endurance → OMSTA en dos
  interacciones y la mesa no puede pedir una tercera. Debajo, los `links` del
  proyecto (repositorio, demo) como enlaces secundarios con el glifo
  compartido; nunca inventados: si no hay demo, no hay enlace.
- Al pie de la columna, en cuerpo pequeño, la lista de tecnologías del
  proyecto activo.

Arriba, centrado sobre la mesa, el **selector de capa**: tres botones
`Resultado · Diseño · Ingeniería` con el subrayado del sitio. Es un `tablist`
real y cada capa es un `tabpanel` presente en el DOM.

Abajo, centrado, el **muelle**: los nombres de los proyectos en fila, con un
punto bajo el activo, como en el boceto. Son `<a href="#omsta">`: sin
JavaScript seleccionan por `:target`, con JavaScript cambian el estado sin
recargar y actualizan el hash con `replaceState`.

Derecha, arriba, la divisa del mundo (`prose.eyebrow`, «Misiones construidas»)
como rótulo vertical o en tres líneas, sin datos, igual que el canto de
Experimentos. La prosa del mundo, sus tres `facts` y el `closing` bajan al pie
de la página, detrás de la mesa, como en Experimentos: a la mesa se viene a
desplegar un proyecto, no a leer una presentación. Siguen enteros en el HTML.

### 4.4 Lo que se conserva

Navbar intacta, vecinos (`getWorldNeighbours`) y pie con «Volver al Sistema
Gargantúa» exactamente como en las otras páginas a medida. `StructuredData`
con el breadcrumb del mundo. `mainClassName="projects-route"` para el CSS de
ruta, con el mismo tratamiento del pie que la Ranger.

## 5. Las tres disposiciones

Un solo estado gobierna la mesa: `{ project, layer }`. La capa se publica como
`data-layer="resultado" | "diseno" | "ingenieria"` en el escenario, y cada
pantalla declara sus tres poses como custom properties (`--rx/--ry/--rz`,
`--dx/--dy/--dz`, `--ix/--iy/--iz`, más escala y giro). El CSS elige la pose
por `data-layer` y transiciona `transform`, `opacity` y `filter` en **una sola
transición de 0,9 s con curva expo**, la misma de Edmunds. Como cada pantalla
tiene las tres poses definidas, a medio camino está exactamente entre dos
posiciones reales; nunca arranca desde una pose que no existe.

### Resultado

La captura destacada (`featuredImage`) ocupa el centro, grande y de frente,
levantada sobre la mesa. Las demás se retiran hacia los lados y atrás, un 40 %
más pequeñas y a media opacidad, en el orden de la galería; la captura móvil
(§6, `frame: mobile`) va delante a la derecha, vertical, como en el boceto.
Debajo de la destacada, en la mesa, su `caption`. Es la capa de reposo: quien
entra ve el producto terminado y nada más.

### Diseño

Las pantallas se abren en abanico —tres a cinco visibles a la vez, en un arco
alrededor del centro, con la móvil delante— y cada una lleva una **nota de
diseño**: su `caption` de la galería, que ya está escrita como afirmación de
experiencia («La reserva funciona como cockpit operativo y financiero, no como
un registro aislado»). En la columna de lectura, el `summary` se sustituye por
el párrafo de `12. Diseño y UX` en los casos completos, y por el `decision` en
las fichas breves cuando su decisión es de diseño (Izak's: «la fotografía
dirige la interfaz»). Apuntar o enfocar una pantalla la trae al frente y
enciende su nota; las flechas del teclado recorren el abanico.

Aquí se enseña también la responsividad sin decirlo: la captura móvil al lado
de la de escritorio del mismo flujo (OMSTA tiene panel ejecutivo en ambas;
Delicaté, portada y carrito en ambas).

### Ingeniería

Las pantallas se encogen hasta ser **nodos con miniatura** y se colocan en su
sitio del sistema; entran los nodos sin pantalla (API, base de datos, worker,
servicios externos) como cajas de trazo con icono técnico, y las **líneas** se
dibujan entre nodos según las aristas declaradas. La superficie de la mesa se
convierte en el plano del esquema: cuatro carriles de izquierda a derecha,
`cliente → servicio → datos → infraestructura`, que es el flujo real de todos
los proyectos del inventario (React o Django templates, DRF o servicios,
PostgreSQL/Redis, Railway/WhatsApp).

Cada nodo con decisión lleva una marca; apuntar o enfocar el nodo despliega
la decisión en una etiqueta anclada al nodo (junto a él, no a seis líneas:
lección de la sonda del Observatorio). En la columna de lectura, el texto pasa
a ser el párrafo de `9. Arquitectura y stack` (o el `decision` en las fichas
breves). Las líneas se dibujan en un SVG superpuesto cuyas coordenadas se
miden de las cajas ya colocadas (un `ResizeObserver` sobre el escenario); sin
JavaScript no hay líneas y el esquema es la lista de nodos y decisiones, que es
honesta y completa.

### El paso entre capas

La transición es la página. De Resultado a Diseño, la destacada cede el centro
y el abanico se abre; de Diseño a Ingeniería, cada pantalla viaja a su nodo
mientras entran los nodos sin pantalla (aparecen con un retardo de 150 ms,
después de que las pantallas hayan llegado, para que se lea que se AÑADEN al
producto) y las líneas se trazan con `stroke-dashoffset` en 0,5 s. Al volver a
Resultado todo se recoge. Con el movimiento apagado (`html[data-motion="off"]`)
no hay transición ni trazado: el estado cambia en el acto.

## 6. Contenido: qué entra al esquema de Velite

Dos campos nuevos en `ProjectProse`, ambos opcionales en el esquema y exigidos
por `validate-projects.ts` según `kind`:

```yaml
gallery:
  - src: /media/projects/omsta/50-mobile-dashboard.png
    alt: …
    caption: …
    frame: mobile            # opcional; por defecto desktop
architecture:
  lanes: [cliente, servicio, datos, infraestructura]   # fijo; se valida
  nodes:
    - id: reservas
      label: Reservas y CRM
      lane: servicio
      screen: /media/projects/omsta/04-reserva-detalle.png   # opcional
      decision: >-                                            # opcional
        …
  edges:
    - [reservas, pagos]
    - [pagos, contabilidad]
```

Reglas que valida el build (P1):

- Toda arista referencia dos `id` existentes; ningún `id` repetido; `lane` en
  el conjunto fijo.
- `screen`, si existe, es la `src` de la destacada o de una entrada de la
  galería del mismo proyecto: una pantalla no puede ser nodo de un sistema si
  no está en la mesa.
- Los casos completos (`kind: case-study`) exigen `architecture` con al menos
  cuatro nodos y una decisión; las fichas breves pueden llevarla y, si no la
  llevan, la capa Ingeniería se construye sola con **stack + `decision`**: un
  nodo por tecnología, colocado en su carril por una tabla fija de la página
  (React/Vite → cliente; Django/DRF → servicio; PostgreSQL/Redis → datos;
  Railway/WhatsApp → infraestructura), y la decisión como único rótulo. No se
  finge un sistema que el texto no describe.
- `frame: mobile` sólo puede llevarlo una imagen más alta que ancha: lo
  comprueba `tools/prepare-projects.mjs` al leer las dimensiones, y es lo que
  evita un campo de dimensiones a mano.

Las arquitecturas se redactan a partir del texto ya publicado de cada caso.
Borradores para la primera entrega, **pendientes de que Jonás los confirme**
porque son su sistema y no el mío:

**OMSTA** — monolito Django modular; flujo `views → services/selectors → models`.
Cliente: Panel ejecutivo (01), Panel móvil (50). Servicio: Reservas y CRM (04,
08), Pagos y cobros (10) *[decisión: servicios explícitos, atómicos e
idempotentes; snapshot de tasa en cada pago]*, Facturación, Contabilidad y
posteo (15) *[decisión: el motor de posteo dentro de contabilidad]*, Ledger
(libro mayor neutral) *[decisión: `ledger` neutral, 27 rutinas de posteo
trasladadas para romper el ciclo]*, Reportes DGII 606/607/608/623, Nómina (31),
Sucursales y roles (33) *[decisión: seguridad por defecto en el servidor]*.
Datos: PostgreSQL *[decisión: única fuente de verdad, también para el estado
durable de las tareas]*, Redis (colas y caché). Infraestructura: Django Q2
(worker), Railway (web + worker). Aristas: la columna contable del §9
—reservas → facturación → pagos → contabilidad → ledger → DGII—, nómina →
ledger, todo servicio → PostgreSQL, worker → Redis y PostgreSQL.

**Delicaté** — Cliente: Portada (01), Catálogo y filtros (02), Detalle (06),
Carrito (03/04) *[decisión: carrito persistido en `localStorage`]*. Servicio:
API pública de sólo lectura (DRF) *[decisión]*, Administración del catálogo
(Django). Datos: PostgreSQL. Infraestructura: WhatsApp *[decisión: el pedido
estructurado como cierre real del proceso]*.

**Wiki Universe** — Cliente: Inicio (01), Artículo (02), Historial (03).
Servicio: API DRF con JWT y esquema OpenAPI, Artículos en Markdown, Revisiones
*[decisión: contenido separado de metadatos y revisiones]*. Datos: PostgreSQL
*[decisión: `SearchVector`/`SearchRank` en vez de un motor externo]*, Redis.

**Network 3.0** — Cliente: Feed (01), Perfil (02), Notificaciones (03).
Servicio: Feed por cursor *[decisión]*, Perfiles y follows, Publicaciones y
comentarios anidados, Notificaciones *[decisión: dominio propio, con sus reglas
y endpoints]*. Datos: PostgreSQL, Redis.

**Izak's Photos** — Cliente: Inicio (01), Galería y visor (02) *[decisión: la
fotografía dirige la interfaz; dimensiones reservadas]*. Servicio: API Django
(reserva, endpoint persistente), Django sirve el build de Vite *[decisión: un
solo servicio]*. Infraestructura: Railway.

Ni un dato que no esté en el MDX: sin cifras de usuarios, sin nombres de las
dieciocho aplicaciones, sin latencias. Si el dueño quiere más precisión, se
escribe en el caso primero y la mesa lo hereda.

## 7. Interacción

- **Un estado.** `EngineeringTable` (cliente) guarda `{ project, layer }`.
  Proyecto inicial: el del hash si es un slug válido, si no el `order` 1.
  Capa inicial: Resultado, siempre; la capa no viaja en la URL porque un
  enlace compartido debe abrir el producto, no el esquema.
- **Sin JavaScript.** Cada proyecto es una `<section id="omsta">` con las tres
  capas apiladas; `:target` muestra el proyecto elegido y, sin hash, el
  primero (patrón de Sobre mí). Todo el texto, todas las capturas, todos los
  enlaces. Los nodos de Ingeniería son una `<dl>` de nodo → decisión.
- **Teclado.** El muelle es una lista de enlaces; el selector de capa es un
  `tablist` con flechas izquierda/derecha; dentro de Diseño e Ingeniería las
  pantallas y nodos son botones enfocables en orden de lectura, y el foco no
  se pierde al cambiar de capa (se queda en el selector). Escape en una nota
  desplegada la cierra. Las capas no activas van `inert` + `visibility:
  hidden`, y **eso se prueba a propósito** porque jsdom no implementa `inert`
  y los mandos de una capa plegada siguen apareciendo por rol (lección de la
  consola del Observatorio).
- **Puntero.** Apuntar una pantalla o un nodo lo trae al frente y muestra su
  nota. Paralaje de la mesa entera ≤ 2° con puntero fino (`--rx/--ry` como en
  la Ranger), apagado con el interruptor global. **No hay arrastre**: el
  gesto de la mesa es elegir, no orbitar, y un arrastre sobre pantallas que se
  recolocan solas por capa sería un segundo controlador.
- **Cambiar de proyecto** cruza en 0,45 s: las pantallas del saliente caen a
  la mesa y se apagan, las del entrante suben en la capa activa. Las capturas
  del siguiente proyecto en el muelle se precargan con `<link rel=prefetch>`
  al apuntar su nombre.
- **Encendido.** Al montar con movimiento permitido, `data-boot="on"` una vez:
  la rejilla de la mesa se enciende, las pantallas suben desde la superficie
  escalonadas (60 ms) y la lectura aparece. Aditivo: el HTML ya está completo y
  no se oculta nada antes (regla de la Ranger).
- **Modo cine.** No. Aquí la instrumentación ES el contenido; atenuarla no
  tiene sentido.

## 8. Movimiento, capacidad y responsive

- Un solo interruptor (`docs/design/movimiento-unificado.md`): transiciones,
  encendido, trazado de líneas y paralaje obedecen a `useMotionEnabled()` y a
  `html[data-motion="off"]`. Con el movimiento apagado la mesa es igual de
  operable: los estados cambian en el acto. No hay control de pausa propio.
- **Sin WebGL** en esta página, por decisión: la mesa es CSS 3D y SVG, la
  sala una fotografía. La escena persistente **duerme**: `endurance` entra en
  `COVERED_WORLDS` de `gargantua-system.tsx` (P6). Nunca hay un contexto
  dibujando debajo de una foto opaca.
- **Viewports.** A 1440 y más, la composición de §4. Entre 768 y 1024 la
  lectura sube encima de la mesa y el muelle pasa a dos filas. **Por debajo de
  768** la mesa se aplana: el selector de capa se pega bajo la cabecera, las
  pantallas van en columna a todo el ancho (la destacada primero), el abanico
  de Diseño es la misma columna con las notas debajo de cada captura, y el
  esquema de Ingeniería es un flujo VERTICAL —los carriles pasan a filas— con
  las líneas verticales entre ellas. El scroll de página gana siempre: la mesa
  nunca desplaza dentro de un contenedor (lección de O10 bis: un mando que hay
  que desplazar para tocar es un mando que no está). Blancos de 44 px en
  muelle, selector, pantallas y nodos.
- **Perfil ligero** (`?no3d=1`): idéntico, porque no hay nada que degradar.

## 9. Recursos y presupuesto

- **Capturas.** `tools/prepare-projects.mjs` genera de cada PNG de
  `public/media/projects/` copias WebP en peldaños —480, 720, 960, 1440 para
  escritorio; 390 y 780 para móvil— a calidad 84, sin ampliar nunca, y las
  deja en `public/media/projects/<id>/<nombre>-<w>.webp`. La mesa pide **1,5
  veces los píxeles que pinta** por contexto (regla de nitidez de Edmunds):
  la destacada en Resultado, unos 900 px de ancho a 1440, toma el `-1440`;
  una satélite del abanico, unos 420, toma el `-720`; una miniatura de nodo
  toma el `-480`. El E2E comprueba el ≥ 1,2× (P9). `ProjectCase` y
  `ProjectCard` no cambian: siguen con los PNG por `next/image`.
- **LCP.** La destacada del proyecto inicial es un `<img>` con `fetchpriority=
  "high"` y sin `loading="lazy"`; el resto de pantallas, `lazy`. La sala es
  decorado (`aria-hidden`, `alt=""`) y va detrás.
- **Bundle.** Un componente cliente (`EngineeringTable`) y su CSS; cero
  dependencias nuevas; ni `three` ni el módulo de escena entran por esta ruta
  más allá de lo que el layout ya monta. Knip decide la forma de los archivos.
- **Sala.** Copias 960/1440/1920 del original; objetivo ≤ 180 KB la mayor.

## 10. Accesibilidad

- El `h1` es «Proyectos»; el proyecto activo es `h2`; las capas son
  `tabpanel` con `aria-labelledby` al botón de capa; el muelle es
  `nav aria-label="Proyectos"` con `aria-current="true"` en el activo.
- Cada pantalla conserva su `alt` completo; las notas de diseño y las
  decisiones son texto en el DOM, no `title`.
- Los cambios de proyecto y de capa se anuncian en una región `aria-live=
  "polite"` con una frase corta («OMSTA · Ingeniería · 12 nodos»).
- Contraste: los rótulos técnicos en cian sobre `#04060a` a ≥ 4,5:1; las notas
  sobre cristal llevan fondo propio, no sólo `backdrop-filter`.
- Sin JavaScript, sin movimiento y con lector de pantalla se conserva el
  mismo significado y las mismas rutas.

## 11. Verificación

| # | Qué garantiza | Regresión que evita | Tipo |
| --- | --- | --- | --- |
| P1 | `architecture`: aristas a nodos existentes, `screen` presente en la galería, carriles fijos, casos completos con ≥ 4 nodos y ≥ 1 decisión; `frame: mobile` sólo en imágenes verticales | Un esquema que dibuja cajas huérfanas o pantallas que no están en la mesa | Unit (fixtures en `validate-projects.test.ts`) |
| P2 | La disposición se deriva de los datos: destacada al centro, galería como satélites, móvil delante; ficha breve sin `architecture` → stack + decisión | Posiciones a mano por proyecto | Unit |
| P3 | Sin galería, sin `links`, sin decisión en ningún nodo: render digno | Componente roto por dato ausente (A18) | Comp |
| P4 | Sólo la capa activa es operable; las otras van `inert` y ocultas, comprobado por atributo | Mandos de una capa plegada alcanzables por rol | Comp |
| P5 | Sin JS: cuatro proyectos con tres capas, texto íntegro, `#omsta` selecciona por `:target`, «Explorar proyecto» y enlaces sin uno muerto | La mesa convertida en el contenido (regla 7) | E2E |
| P6 | La ruta no crea contexto WebGL y la escena persistente no dibuja (`whileCovered === 0`, molde de `miller.spec.ts`) | Dos contextos, o uno dibujando bajo una foto | E2E (escena viva, viewport fijo) |
| P7 | Sólo teclado: muelle → capa → nodo → decisión → «Explorar proyecto»; foco nunca perdido; hero → Endurance → OMSTA sigue en dos interacciones (A20) | Instrumento inaccesible o tercera interacción | E2E |
| P8 | 375/768/1440: cero desbordamiento horizontal, blancos de 44 px, el scroll de página gana | Un visor que secuestra el móvil | E2E |
| P9 | Cada pantalla pintada sirve un archivo ≥ 1,2× su tamaño pintado | Capturas blandas a 1:1 (Edmunds) | E2E |
| P10 | Con movimiento apagado: `transition-duration` 0 s en pantallas y líneas, sin encendido, estados instantáneos y operables | Un control de pausa nuevo o una coreografía forzada | E2E |
| P11 | El contador de la cabecera y el número de nodos salen de los datos | El «8 radiadores» otra vez (O4) | Unit |
| P12 | En Ingeniería, el SVG tiene tantas líneas como aristas y cada nodo con decisión la muestra al enfocar | Un esquema decorativo que no corresponde al MDX | E2E |

Trampas heredadas que aplican: P6 necesita la escena viva
(`jonas-orbit:reducir-efectos = "false"` por `addInitScript`) y el proyecto
`mobile-chromium` puede no montarla; el indicador de `next dev` aporta píxeles
a cualquier captura; y `npm run check` nunca por tubería.

## 12. Entregas

1. **La mesa en Resultado.** Ruta `projects-route`, sala en CSS, mesa con el
   esquema de la Endurance grabado, lectura, muelle, estado real, CTA y
   enlaces; `tools/prepare-projects.mjs` y los peldaños WebP; `frame: mobile`
   en las galerías; `endurance` en `COVERED_WORLDS`; P2, P3, P5, P6, P8, P9.
   Ya es una página completa y publicable por sí sola.
2. **Diseño e Ingeniería.** `architecture` en el esquema y en los cuatro MDX
   publicados (y en Delicaté, aunque siga en F1B); selector de capa; abanico
   con notas; esquema con carriles, nodos, líneas y decisiones; versión
   vertical en móvil; P1, P4, P7, P11, P12.
3. **Movimiento y sala.** Transiciones entre capas y proyectos, trazado de
   líneas, encendido, paralaje, prefetch; P10. Fotografía de la sala cuando
   el dueño la dirija, con `FUENTES.md`. Capturas a 1440 y 375 en las tres
   capas de los cuatro proyectos, enviadas para el veredicto.

Cada entrega pasa `npm run check` completo y añade su fila a `AGENTS.md` con la
fecha; este documento recibe las enmiendas con lo medido, como los demás.

## 13. Decisiones abiertas, para Jonás

1. **Delicaté en la mesa.** El plan lo tiene en F1B y el boceto lo muestra. Su
   caso y capturas están listos. Recomendación: la mesa lista **cuatro** hasta
   que él declare F1B, y su `architecture` se redacta ya para que entrar sea
   mover un id a `F1A_PROJECT_IDS`. Si prefiere cinco desde el primer día, es
   un cambio del plan principal y se anota allí.
2. **Los borradores de arquitectura del §6.** Están sacados de su texto; los
   confirma o corrige antes de la segunda entrega. En particular: qué
   pantallas de OMSTA corresponden a qué módulo, y si Nómina va como nodo.
3. **La sala.** Generar la fotografía con el brief del §4.1 o dejar la sala en
   CSS. La mesa funciona con las dos; la foto da escala, como en Experimentos.
4. **Orden de los proyectos en el muelle.** Hoy es `order` (OMSTA, Izak's,
   Wiki Universe, Network). Se conserva salvo que diga otra cosa.

## 14. Qué no cambia

El System Map, la Endurance del mapa (sus doce módulos, su anillo de 1.22, sus
cuatro draws), la cámara, la luz compartida y los otros cinco cuerpos. La ruta
del caso completo y `ProjectCase`. `ProjectCard` y `ProjectGrid` se retiran
sólo si Knip los declara huérfanos tras la primera entrega; si otra ruta los
usa, se quedan. La navbar, el interruptor de movimiento, la banda sonora, el
pie y los vecinos. Ninguna dependencia nueva.
