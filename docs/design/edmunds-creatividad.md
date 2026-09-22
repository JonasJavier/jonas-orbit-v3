# Edmunds — cubierta de observación

2026-09-11 · Segunda implementación pedida por Jonás el mismo día, tras ver la
primera: «la galería 3D no me gusta, quiero que sea más inmersiva; el foco de
toda la página debe ser la galería 3D». Sustituye a la sección «Primera
implementación», que queda al final como referencia histórica.

**Tercer pase (mismo día).** Jonás aprobó la dirección —«me está gustando mucho,
sigamos por ese camino»— y pidió cuatro cosas: quitar una franja translúcida que
atravesaba las fotos, más fotos, Diseño como primer sector y que la galería 3D
ocupe todo el viewport con más sensación de espacio. Este documento describe
el estado tras ese pase.

**Cuarto pase (mismo día).** Jonás pidió mi opinión sincera y luego que
aplicara todo lo que propuse salvo reducir el número de obras — la curación
la hará él a mano. Entra el **modo cine**, el orden dentro de cada sector se
rehace con criterio, «Fantasía» abre y el homenaje cierra Diseño, y el móvil
pierde los efectos que más cuestan.

**Quinto pase (mismo día): simplificar.** Jonás pidió menos instrumentación y
más aire: «me gusta más lo minimalista y sólo las cosas necesarias». La
cabecera sale de la cubierta y se convierte en una sección propia que respira
(rótulo `DESTINO 04 / EDMUNDS`, `h1`, «Otra forma de mirar.» grande, la
introducción y un enlace «Entrar en la galería» que aterriza en la cubierta
exactamente bajo la barra); la cubierta ocupa un viewport entero ELLA SOLA, con
el filtro de sectores y el conmutador de vista arriba y, abajo, sólo las
flechas, `sector · posición`, el título de la obra y «Ampliar». Desaparecen las
lecturas del HUD, «CUBIERTA DE OBSERVACIÓN», los contadores de los chips, el
raíl de sectores con su pista, las leyendas de las obras (en cubierta, mosaico
y visor: «las imágenes hablan por sí solas»), las cabeceras de sector del
mosaico —queda una etiqueta mínima— y la bitácora de tarjetas, que duplicaba
el filtro. El arrastre ahora lleva el anillo con la mano (`--drag-px`) y al
soltar encaja con una curva expo de 1,05 s escalonada 30 ms por posición; el
título entra con un fundido. Un detalle que costó una vuelta: `scroll-padding`
global del sitio (8 rem) hacía aterrizar el ancla 195 px por debajo; la ruta
lo fija a la altura de la barra. Dirección pendiente de su valoración visual.

**Sexto pase (2026-09-12): nitidez, arrastre, transición y noche.** Cuatro
peticiones del dueño con una verificación previa cada una.

- **«Algunas imágenes salen en baja calidad en mosaico y galería 3D, pero al
  ampliar se ven muy bien.»** La hipótesis anotada —`sizes` pidiendo un
  archivo menor que lo pintado— se descartó con números: a DPR 1, 1,5 y 2 la
  cubierta y el mosaico servían el `-960.webp` REDUCIDO a un 30-87 % de su
  tamaño, nunca ampliado. La causa real es otra: un WebP a calidad 79 visto
  cerca de 1:1 se ve blando, y el visor se veía bien porque REDUCÍA el `-1920`.
  Medido a DPR 1,25 sobre «Entre montañas»: nitidez (varianza laplaciana) 331
  en la cubierta contra 979 en el visor a la misma escala. La respuesta tiene
  dos partes. `tools/prepare-edmunds.mjs` genera **seis peldaños** —320, 480,
  640, 960, 1280 y 1920— a calidad 84/85/86 (540 archivos, 82,5 MiB). Y cada
  contexto pide **1,5 veces los píxeles que pinta**: la cubierta calcula sus
  `sizes` por obra con la misma fórmula del CSS (relación de aspecto × altura
  de obra por breakpoint, con tope) y el mosaico con el ancho de sus columnas.
  Al entrar a 1280 × 720 y DPR 1 la obra activa toma el `-960`, no el `-1920`;
  el E2E comprueba que el archivo servido supera en ≥ 1,2× lo pintado.
- **«Quiero deslizar las obras con el cursor y que se vea bien; la transición
  es muy brusca, con arrastre y con flechas.»** El anillo se movía con
  `--drag-px`: una traslación plana de todas las obras mientras duraba el
  gesto y, al soltar, una transición por obra sobre `transform` con retardo
  escalonado. Dos defectos: durante el arrastre las obras se DESPLAZABAN en
  vez de GIRAR, y al soltar cada obra arrancaba su propia transición desde una
  pose que no existía en el anillo. Ahora todo movimiento es UN número:
  `--drag`, el desplazamiento fraccionario del anillo en posiciones, registrado
  con `@property` en el escenario y heredado por las obras. Cada obra calcula
  su posición real `--p = --o + --drag` y con `abs()` de CSS deriva de ella
  profundidad, giro, escala, luz y opacidad: a medio arrastre está exactamente
  a medio camino entre dos poses de reposo. Al soltar —y con flechas, teclas y
  saltos de sector— el índice activo cambia y `--drag` absorbe la diferencia en
  el mismo fotograma (`flushSync`), así que nada se mueve; luego UNA transición
  de 0,95 s con curva expo lleva `--drag` a 0 y el anillo gira como un cuerpo
  rígido. Las obras ya no transicionan su `transform`. El gesto gana impulso:
  el recorrido se redondea a posiciones y una velocidad de suelta mayor que
  0,55 px/ms añade una más, con tope de tres; una mano que se detiene más de
  80 ms antes de soltar, o un puntero que salta de golpe sin dos muestras de
  movimiento, no lleva impulso. El signo importa y costó tres pruebas: `--drag`
  es cuánto han ido las obras EN LA DIRECCIÓN DE LA MANO (`dx / paso`), y el
  recorrido al soltar es `-round(--drag)`; con el signo al revés las obras
  giraban contra la mano y la compensación al soltar dejaba de ser continua. Las obras que entran en la
  ventana visible emergen del fondo con una animación sobre su `figure`, dentro
  del contexto 3D, para no pelear con el transform del anillo. Un tercer
  defecto que nadie había nombrado: la luz ambiente se REMONTABA con `key` y
  fundía desde negro en cada cambio, un parpadeo del cielo. Ahora la luz nueva
  funde SOBRE la anterior, que sólo se retira al terminar el fundido.
- **«El fondo más como la noche, que se vean mejor las estrellas, con auroras
  boreales y una animación leve.»** El cielo pasa de casi negro (`#040308`) a
  un azul marino que se hace más profundo arriba y se calienta hacia el
  planeta. Las estrellas suben de opacidad (0,62 → 0,95 y 0,32 → 0,55), ambas
  capas centellean y entra una tercera de doce estrellas brillantes con núcleo
  suave y su propio parpadeo. Dos cortinas de aurora —verde con orla violeta—
  hechas SÓLO con degradados repetidos y máscaras, sin `filter`, para que lo
  único animado sea un `transform` compuesto: derivan en sentidos contrarios y
  respiran en ciclos de 26 y 33 s. En móvil queda una cortina; con
  reduced-motion no se mueve nada, como todo lo demás.
- **Verificación del pase.** `components/edmunds-page.test.tsx` gana dos
  pruebas (seis peldaños y `sizes` por contexto; anillo como un solo número y
  crossfade de la luz) y `e2e/edmunds.spec.ts` comprueba giro real a mitad de
  arrastre, `--drag` de vuelta a 0 al soltar, dos luces durante el fundido y
  una después, auroras animadas en la cubierta y quietas con reduced-motion, y
  archivo servido ≥ 1,2× lo pintado. Resultado: 12 unitarios, build y **30 E2E**
  en Chromium de escritorio y móvil. Capturas de Playwright a 1440 × 900 y
  375 × 812: reposo, mitad de arrastre, 250 ms tras soltar, 300 ms tras flecha
  y modo cine.
- **Reorganización y foto nueva de Diseño.** No se movió ninguna obra: la
  curación es del dueño. La propuesta va en la entrega: cuatro obras de
  Retratos que son figuras en el paisaje, no retratos, y una observación sobre
  las imágenes generadas mezcladas con fotografías. La foto nueva del sector
  Diseño aún no está en `Disenos/`; cuando llegue: entrada en el MDX con
  `medium`, `caption`, dimensiones reales y `source`, `npm run content` y
  `node tools/prepare-edmunds.mjs`.

**Séptimo pase (2026-09-22): una salida limpia al proyecto.** Jonás pidió que
X Tecno invite a ver más sin poner cromo encima de la captura. La pieza sigue
siendo UNA obra —no se infla el catálogo con cada pantalla del flujo—, pero
`prototypeHref` distingue las interfaces con prototipo vivo. Hay un solo botón
`VER PROYECTO EN FIGMA` fuera de la imagen: bajo el título en mosaico y en el
pie cuando X Tecno está centrada en la cubierta. Pulsar la captura conserva el
gesto normal de ampliar; dentro del visor aparece el mismo botón y sustituye a
`Abrir imagen`, para no ofrecer dos salidas equivalentes. El enlace primario de
la captura sigue apuntando al WebP sin JavaScript, y una obra lateral todavía
se centra antes de abrirse.

**Octavo pase (2026-09-22): el giro del anillo lo apagaba el sistema
operativo.** Jonás reportó que el arrastre gira precioso y que las flechas no
tienen esa animación. No era del componente: `go()` estaba bien y las cuatro
vías —flechas, teclas, salto de sector y centrar una obra lateral— creaban su
transición. Lo que fallaba es que duraba **0,01 ms**. La regla general de
`app/globals.css` bajo `prefers-reduced-motion` aplasta con `!important` la
duración de TODA transición del documento, y Jonás tiene movimiento reducido
activado en su equipo. De ahí la asimetría exacta que describió: **el arrastre
no usa transición** —son escrituras directas de `--drag`, fotograma a
fotograma— y sobrevivía entero, mientras que todo lo demás del anillo depende
de la ÚNICA transición de 0,95 s que el sexto pase dejó como único movimiento
del sistema. Un solo número animándolo todo es lo que hace el anillo rígido, y
es también lo que lo deja colgando de una sola regla.

La regla del sitio ya estaba escrita y es la que manda: el movimiento lo
decide UN interruptor (`docs/design/movimiento-unificado.md`), y
`prefers-reduced-motion` no apaga nada por sí solo. Así que la corrección es
devolver esa duración a `.edmunds-stage` mientras el interruptor esté
encendido, y sin tocar la regla general, que sigue gobernando el resto del
sitio. Con el interruptor apagado mandan las dos reglas de `Motion off` de esta
hoja, que retiran la PROPIEDAD y no sólo su duración, así que ganan igual.
Medido en el navegador con `prefers-reduced-motion: reduce` activo: antes
`transition-duration` = 1e-05 s en el escenario; después 0,95 s, y las cuatro
vías producen una transición de 950 ms sobre `--drag` con los fotogramas clave
correctos (`1 → 0`, `-1 → 0`, `3 → 0` en el salto de sector). Durante el
arrastre sigue sin haber transición ninguna.

**Y a continuación, el resto de la cubierta.** Anotado el punto anterior, Jonás
pidió expresamente lo que quedaba fuera, así que la restauración pasa de una
línea a un bloque: el cielo entero (deriva, centelleo de las tres capas, las dos
cortinas y el polvo), la emersión de la obra que entra (`edmunds-enter`, 0,9 s),
el crossfade de la luz ambiente, las escuadras, el barrido del marco, el rótulo,
el modo cine y el suavizado del paralaje por planos. Hay que restaurar **valor a
valor**: no existe forma de decir «vuelve a lo que escribió el autor» por encima
de un `!important` ajeno, así que quien añada una animación a esta página tiene
que añadirla también ahí. Quedan fuera a propósito las microtransiciones de los
controles (hover y foco, .2 s): no son la cubierta. Un efecto de borde que sí
hubo que atender: el polvo se apaga en móvil con `animation: none`, y una regla
sin `!important` pierde contra la restauración — pasa a llevarlo.

**Décimo pase (2026-09-22): el cielo de la cubierta.** Segundo encargo del
mismo día: «me gustaría el fondo 3D, que realmente parezca una noche
estrellada con auroras», y a media faena, **«lo mejor es hacer el
fondo más oscuro»**. Las dos frases dicen lo mismo desde lados distintos: lo que
convierte un cielo en noche no es el tono medio del cuadro, es **cuánto hay de
negro**. El anterior no tenía casi nada — arrancaba en azul marino (#070a1c →
#131a3e), llevaba dos cortinas de aurora al 92 % y al 60 % ocupando el 70 % del
alto, una nebulosa al 15-17 %, y encima la luz de la obra activa al 30 % en modo
`screen` SIN MÁSCARA, o sea una mancha desenfocada del tamaño del viewport. Con
«Fantasía» centrada —magenta de arriba abajo— el cuadro entero se teñía. Medido
en la franja de cielo puro (bajo la navbar, sobre la obra más alta): **fondo
p50 = 30,2 y ni un píxel de negro real**.

Cuatro frentes, y de los cuatro el que más mandó fue el último.

- **La base.** Negro casi puro arriba (#01020a) y calor sólo en los dos últimos
  tramos, donde ya empieza el limbo del planeta.
- **El campo estelar es propio** (`tools/prepare-edmunds-sky.mjs`, mosaico de
  1200 × 750 en `public/brand/edmunds-night-stars.svg`, 222 estrellas, 2,4 KiB
  en brotli). La cubierta usaba `navigation-stars.svg`, que es el mosaico de la
  NAVBAR: 640 × 160 y medio centenar de puntos **del mismo calibre**. Estirado a
  un viewport daba las dos cosas que delatan un papel pintado: todas las
  estrellas iguales y la trama repitiéndose cuatro veces a lo ancho. Lo que hace
  creíble un campo estelar no es la cantidad, es el **reparto de magnitud**
  (`Math.pow(azar, 2.6)`), con radio y opacidad saliendo del mismo número. La
  banda lechosa es **densidad**, no un velo pintado: un velo de baja frecuencia
  se delata al repetirse el mosaico; la densidad no, porque no tiene borde. Y
  una regla que costó una medición: **por debajo de medio píxel una estrella se
  reparte entre dos y pierde brillo con el CUADRADO del radio** — con el suelo
  en r = 0,3 la franja de cielo puro daba CERO píxeles por encima de 110; el
  suelo pasa a 0,58 y la magnitud la lleva la opacidad, que sí es lineal.
- **La aurora es una cortina, no un velo.** Tres cosas la hacen aurora y la
  versión anterior no tenía ninguna: **rayos casi verticales** —ya iban a 101° y
  86°, o sea casi verticales, pero con un periodo de 214 px y paradas blandas,
  que es una mancha; ahora tres periodos primos entre sí, 43 / 97 / 179 px—, un
  **pie brillante y definido** que se difumina hacia arriba (`linear-gradient(0deg,
  …)`, que mide desde el pie, porque en el cielo el borde nítido es el de abajo),
  y un **arco irregular con hueco en el centro**, para que la obra activa se
  recorte contra cielo negro y no contra pintura. Baja de 70 % a 50 % de alto y
  de .92 a .5 de opacidad. Y la deriva **no puede tumbar los rayos**: el sesgo
  de −14° a −4° los convertía en rayos de luz oblicuos, que es otra cosa; pasa a
  −4°..+3°. El verde se corre hacia el amarillo (557 nm) y arriba se abre en
  magenta.
- **La luz de la obra ilumina la SALA, no repinta el cielo.** Es la que más
  pesaba y la que nadie había acotado. Lleva máscara radial apozada alrededor de
  la obra y sobre el suelo, con el tercio superior libre; conserva su .3 y deja de
  existir donde estorba.

Medido en la misma franja de cielo puro, 1440 × 900 con `prefers-reduced-motion`
activo: **fondo p50 30,2 → 14,1** y p05 14,7 → 7,9, o sea que el cielo pasa a
valer menos de la mitad y las mismas estrellas tienen el doble de contraste
contra él. En la banda ancha (58-190 px, que ya incluye las obras) la mediana
cae de 37,3 a 16,8 y el negro real sube del 0,1 % al 2,4 %. Presupuesto: ni un
`filter` nuevo, ni un elemento nuevo, ni una animación nueva — lo único que se
añade al peso de la página es el mosaico de estrellas.

**Undécimo pase (2026-09-22): nombres concretos y sectores por sujeto.** Jonás
confirmó el problema que el sexto pase había dejado pendiente: varios títulos
eran demasiado genéricos y algunas figuras en el paisaje se habían archivado
como retratos. La corrección conserva las 90 obras y los siete sectores, pero
aplica una regla legible: el sector lo decide el sujeto con mayor peso visual,
no la carpeta de origen ni una persona o un copo de nieve que aparezcan en el
cuadro. De Retratos salen `frente-al-horizonte`, `de-pie-en-el-lago` y
`caminar-sin-prisa` hacia Horizontes; `la-ultima-luz` pasa a Después del sol.
`mirar-hacia-arriba` y `suelo-de-pinar` dejan De cerca porque son espacios, no
detalles. `un-instante-en-el-aire`, `encuentro-de-invierno` y
`desayuno-en-la-nieve` pasan a Criaturas porque el ave o la ardilla son el
sujeto. Invierno conserva las escenas donde el viaje, el hielo o la actividad
invernal son la historia completa, aunque haya personas.

Los títulos editoriales dejan de pedir que el visitante adivine: «Otro
universo» pasa a «Medusa violeta», «Luz de campo» a «Gato entre hierbas
doradas», «Compañía» a «Perro frente al mar» y «Curiosidad» a «Cachorro entre
hojas», entre otras correcciones. Los `id`, `source`, WebP y dimensiones no se
tocan: cambia la lectura del archivo, no sus recursos ni sus enlaces.

**Su valoración visual queda abierta.**

## Qué cambia y por qué

La primera versión tenía la galería como una franja entre una portada editorial
y la prosa: cinco posiciones planas, marcos de cobre, un fondo con la foto
«Entre montañas» atenuada. El dueño pidió cuatro cosas concretas: que la galería
sea el foco de la página, que sea inmersiva y profesional, que las obras estén
mejor agrupadas y nombradas, y que la página huela a nave espacial sin perder
los colores de Edmunds.

La respuesta es una **cubierta de observación**: la página abre directamente
sobre la galería, que ocupa la primera pantalla entera y lleva el `h1`. No se
añade WebGL ni un segundo canvas: sigue siendo CSS 3D con punto de vista fijo,
porque lo que faltaba no era tecnología sino **profundidad, atmósfera y
jerarquía**. El System Map, sus cuerpos, cámara y materiales no cambian.

## Composición de la cubierta

La cubierta mide exactamente una pantalla (`100svh` menos la barra, mínimo
640 px) y el escenario 3D la ocupa ENTERA; el resto es cromo superpuesto con
degradados hacia el negro, como la instrumentación de un puente de mando. Los
contenedores del cromo son transparentes al puntero y sólo sus controles lo
reciben, así que se puede arrastrar el anillo por debajo del rótulo. Cuatro
capas:

1. **HUD.** Rótulo `DESTINO 04 / EDMUNDS / CUBIERTA DE OBSERVACIÓN` con punto
   de estado, el `h1` con la línea en itálica serif, la introducción a la
   derecha y tres lecturas en monoespaciada: `OBRA 01 / 90`, `SECTOR`,
   `REGISTRO 01.01`. En mosaico las lecturas pasan a `PIEZAS / SECTOR / VISTA`.
2. **Controles.** Filtro por sector —cada chip con su punto de color y su
   cuenta— y el conmutador `Galería 3D / Mosaico`.
3. **Escenario.** Un anillo de obras con perspectiva de 1400 px: la activa al
   frente (46 vh de alto en escritorio, hasta 520 px), tres a cada lado
   retrocediendo en Z (260 px por paso), girando 28° por paso, escaladas al
   88 %, cada vez más oscuras y transparentes; al pasar el puntero por una
   lateral recupera su luz, que es la invitación a pulsarla. Más allá de ±3 no
   existen en el DOM (`display: none`), así que sus imágenes no se piden. La
   obra activa no se mueve —un blanco de clic tiene que ser estable—; lo que
   respira es su retículo. Debajo, un **suelo de
   rejilla** rotado 84°, con línea central de aterrizaje y máscara radial: es
   la pista de la cubierta y el principal indicio de profundidad. Vive en su
   PROPIA perspectiva, detrás de las obras — cuando compartía el contexto 3D de
   ellas, su borde cercano se levantaba por delante de la obra activa y pintaba
   una franja translúcida sobre la foto, que fue lo primero que señaló el
   dueño. Las obras se reflejan en él (`-webkit-box-reflect`, sólo en la
   cubierta; mejora progresiva). El cielo tiene cinco capas: una **nebulosa**
   tenue en cobre, violeta y ocre; dos campos de estrellas del mismo SVG que
   usa la navegación, con deriva lenta y centelleo; **polvo** de ocho motas que
   derivan; la **luz ambiente** —la copia de 480 px de la obra activa,
   desenfocada a 46 px, al 30 % y en mezcla `screen`— y, bajo el horizonte,
   **Edmunds**: el limbo de un planeta de roca ocre con su filo de atmósfera
   en arena y cobre, que asoma detrás de la pista. Cada capa se desplaza a
   distinta velocidad con el paralaje.
4. **Pie.** Botones `← / Ampliar / →` a la izquierda, leyenda de la obra en el
   centro (`registro · sector · medio`, título y una línea) y a la derecha el
   **raíl de sectores**: un segmento por sector proporcional a su tamaño, con
   marcador de posición; pulsar un segmento salta al primer trabajo de ese
   sector. El pie deja 56 px libres abajo —72 en móvil— para no pisar los dos
   controles fijos del sitio (audio y raíl de navegación). En móvil el raíl de
   sectores se oculta y la leyenda se reduce al título.

La obra activa recibe **retículo**: cuatro esquinas que se abren 2 px al
adquirirla, un barrido de luz de 1,2 s y un halo cobre. Pulsar una obra lateral
la trae al centro; sólo la centrada abre el visor. Teclado: flechas, Inicio,
Fin, **Av Pág / Re Pág para saltar de sector** y Enter para abrir. El puntero
fino añade un paralaje de ±2° a todo el bloque (obras, suelo, nebulosa y
estrellas a distinta velocidad), escrito en variables CSS desde `pointermove`
con un `rAF` por evento — no hay bucle. Las obras que entran en la ventana
visible llegan desde el fondo con `@starting-style`. Nada de esto ocurre con
reduced-motion ni con el perfil ligero: se empieza en mosaico, sin
transiciones, deriva ni paralaje.

**Modo cine.** Tras 3,5 s sin puntero, tecla ni toque, la instrumentación
—rótulo, controles y pie— baja al 8 % de opacidad en 1,6 s y el retículo se
atenúa; las obras se quedan solas con el cielo. Cualquier entrada la devuelve
en un segundo, y cambiar de obra rearma la cuenta. No se activa en mosaico, con
el visor abierto ni con reduced-motion o perfil ligero, y el cromo atenuado
sigue siendo alcanzable (los botones conservan su caja y el foco lo despierta).
Es la respuesta a «el cromo pesa»: en vez de quitar instrumentos, se apartan
cuando nadie los usa.

Dos reglas que costaron una entrega cada una y que valen para cualquier anillo
en CSS 3D:

- **En un contexto `preserve-3d` real, la lista `<ol>` es un plano en z = 0
  que cubre todo el escenario, y las obras retrocedidas en Z quedan DETRÁS de
  ese plano.** El rayo del puntero lo golpeaba primero y ninguna obra lateral
  recibía el clic — Playwright lo detectó porque `elementFromPoint` en el
  centro de una obra lateral devolvía el `<ol>`. Ni `filter`, ni `opacity`, ni
  el reflejo, ni la transición tenían que ver: sólo aplanar los tres niveles lo
  arreglaba, y eso mataba la profundidad. La solución es dejar los contenedores
  transparentes al puntero (`pointer-events: none` en `.edmunds-stage__space`,
  `.edmunds-deck` y `.edmunds-artworks`) y devolvérselo a cada obra visible.
- **Un plano inclinado dentro del mismo contexto 3D que las obras se levanta
  por delante de la activa.** El suelo, rotado 84°, tiene su borde cercano en
  z positivo, y el orden de pintado 3D lo ponía encima de la obra centrada: la
  franja translúcida que el dueño señaló. Cada capa con su propia perspectiva
  y su propio `z-index`, y el problema desaparece sin tocar la geometría.

Debajo de la cubierta va la **bitácora**: siete tarjetas de sector con portada
(la primera obra del sector, a 480 px y carga diferida), número, nombre,
descripción y cuenta. Elegir una filtra la cubierta y la desplaza a la vista.
Después, la declaración personal con los tres hechos del MDX como lecturas, el
colofón y los vecinos.

## Paleta

Los dos colores vivos son los del cuerpo en `worlds.data.ts`: cobre `#ff9b6b`
(acento) y arena `#f5cf83` (secundario). El resto es roca: carbón `#100d0b`
como sustrato, espacio `#06050a` detrás de la cubierta, panel `#1a1512`, ocre,
arcilla y oliva apagado. Cada sector tiene un tono propio sacado de esa misma
gama (cobre para Diseño, arena, oliva, ocre, cobre pálido, arena pálida,
arcilla) que colorea su chip, su segmento del raíl, su tarjeta y la leyenda de
sus obras.

## Catálogo: siete sectores, 90 obras

`Vida y detalles` mezclaba fauna, macro, plantas y nieve: era el cajón de lo
que no cabía en otro sitio. Se reparte en tres grupos con identidad visual
propia y aparece un sector de invierno, que era el motivo más repetido del
archivo sin publicar. **Diseño va primero** por petición del dueño: es la
parte profesional de su práctica creativa y la que un reclutador debe ver
antes. Abre con «Fantasía», un fotomontaje sobre un retrato propio que une las
dos mitades de la práctica, y **«Más allá» cierra el sector**: es una
reinterpretación del cartel de Interstellar con sus actores y, como primera
obra, invitaba a la pregunta «¿esto es tuyo?». Como cierre es un guiño; como
apertura era una duda. Después el viaje sigue de lejos a cerca, de lo vivo a
las personas, del frío a la noche.

Dentro de cada sector el orden es una decisión, no la fecha del archivo: las
obras con más fuerza van primero, se alternan formatos vertical y horizontal
para que el anillo respire, y las fotos de acabado muy procesado no van
seguidas de las naturales, porque una al lado de la otra la diferencia de
saturación se nota más que en un carrete. Las que yo habría retirado quedan al
final de su sector, a la espera de la curación manual del dueño. Un test
comprueba que el MDX respeta el orden por sector, la apertura y el cierre:

| # | Sector | Obras | Qué entra |
| --- | --- | --- | --- |
| 01 | Diseño | 12 | Carteles, fotomontajes, portada e interfaz |
| 02 | Horizontes | 25 | Paisajes, agua, cielos y figuras subordinadas al lugar |
| 03 | De cerca | 5 | Hojas, flores y texturas que llenan el encuadre |
| 04 | Criaturas | 15 | Fauna, acuarios y encuentros con animales |
| 05 | Retratos | 8 | Personas y gestos que llevan el peso de la imagen |
| 06 | Invierno | 14 | Nieve, hielo, túneles, pistas y vasos de hielo |
| 07 | Después del sol | 11 | Aurora, atardeceres, hogueras, caminos y ciudades encendidas |

Se incorporan **30 fotografías** que la primera selección dejó fuera: 17 en el
segundo pase y 13 más en el tercero, cuando el dueño pidió ampliar el
repertorio. Quedan fuera 18 imágenes, casi todas variantes de un motivo ya
publicado (el mismo pájaro en la mano, la misma puerta de hielo, la misma
fuente desde otro ángulo, los originales `Bitmap3` de los carteles), dos de
resolución insuficiente, el PDF de revista y los enlaces Figma. Se mantiene el
criterio —una representación por motivo, sin variantes— y no se cambia ningún
original.

Cada obra gana dos campos en el esquema de Velite: **`caption`**, una línea
editorial que acompaña al título en la cubierta, el mosaico y el visor, y
**`medium`** (`photo`, `poster`, `composite`, `editorial`, `interface`), que la
interfaz traduce a `Fotografía`, `Cartel`, `Fotomontaje`, `Portada` o
`Interfaz`. El registro `sector.posición` (`01.01`, `07.10`) se calcula en el
componente y no se guarda. Los títulos se revisan donde un nombre era vago
(«De cerca» → «Cara a cara», «Hot summer» → «Hoy se come», la palabra impresa en
el cartel) y los `alt` se corrigen con lo que se ve (la «cabra» era una llama).
Como antes, títulos y leyendas son editoriales: no atribuyen lugares,
identidades, fechas ni datos de cámara.

## Acceso y fallos

- Cada obra sigue siendo un enlace HTML real a su WebP grande; en la cubierta
  la activa lleva `aria-current`.
- Escenario: región con `aria-roledescription="carrusel"`, tabulable;
  flechas, Home, End, PageUp, PageDown y Enter (abre el visor); arrastre
  horizontal con puntero o dedo, con el scroll vertical intacto
  (`touch-action: pan-y`). Los enlaces de las obras llevan
  `draggable={false}`: al hacerse alcanzables por el puntero, un arrastre que
  empezaba sobre una obra disparaba el arrastre nativo del enlace y cancelaba
  el gesto — la prueba de arrastre lo detectó.
- Raíl de sectores: botones con nombre `Sector: n piezas`, mínimo 44 px.
- Visor: `dialog.showModal()`, esquinas del visor, Escape, flechas, cierre
  visible, tabulador confinado, foco devuelto al enlace de origen, reintento
  ante fallo de imagen.
- Sin JavaScript, `noscript` desmonta la cubierta en cuadrícula: los 90
  enlaces, imágenes, títulos y leyendas siguen ahí.
- Reduced-motion y perfil ligero empiezan en mosaico; elegir la cubierta
  conserva transiciones, deriva y paralaje apagados.
- El mosaico agrupa por sector con cabecera `h2` por grupo; en la cubierta el
  único `h2` de la galería es el título de la obra activa. Las imágenes del
  mosaico son diferidas (la primera versión de este pase las cargaba todas
  ansiosas por un `eager` mal condicionado, detectado en revisión).

## Recursos y presupuesto

`tools/prepare-edmunds.mjs` genera 540 WebP (90 × 320/480/640/960/1280/1920)
que ocupan 82,48 MiB en disco (antes 270 y 46,27 MiB). En pantallas táctiles o estrechas no hay reflejos, el
desenfoque ambiental baja de 46 a 28 px y el polvo no deriva: el compuesto
más caro se reserva para escritorio con puntero. Al entrar en la cubierta se piden como máximo **16**
recursos de obra: las siete del anillo, la copia ambiente de la activa (480 px,
ya en caché cuando el `srcset` eligió ese tamaño) y hasta siete portadas de
sector, ninguna de 1920 px. `e2e/edmunds.spec.ts` lo exige.

Los scripts modernos de producción, sin `nomodule` y contando cada `src` una
vez, suman **209,77 KiB gzip** en Creatividad y Formación —comparten el chunk
de `[mundo]`—, 203,07 en la portada y 197,86 en Privacidad: **+11,91 KiB**
sobre la ruta sin contenido interactivo, dentro del presupuesto propio de
40 KiB (el primer pase medía +10,09; la base absoluta subió con los cambios
de navegación de Miller, no con esta página). No se añadió ninguna dependencia.

Presupuesto de dibujo: cero contextos WebGL nuevos, cero bucles, un `rAF` por
evento de puntero. Las capas con `filter` son dos —la luz ambiente y el brillo
de las obras laterales— y el desenfoque vive en un solo elemento a resolución
de 480 px. Las animaciones en reposo son cuatro y todas baratas: deriva y
centelleo de estrellas, deriva del polvo y flotación de la obra activa; con
reduced-motion no existe ninguna.

## Verificación

`components/edmunds-page.test.tsx` cubre significado y vecinos, catálogo
(90 obras, 7 sectores con Diseño primero, 12 diseños, 78 fotos, orden por
sector, leyenda y medio, WebP íntegros), filtro y teclado con registro
publicado y salto de sector, centrar antes de abrir, bitácora, mosaico
agrupado, archivo vacío, una obra, imagen fallida y reduced-motion.
`e2e/edmunds.spec.ts` cubre mosaico agrupado, visor con registro, cubierta a
pantalla completa con perspectiva y `preserve-3d`, avance por teclado, salto
de sector y arrastre, carga acotada, obra lateral que se centra, bitácora y
raíl, modo cine que atenúa y vuelve, 404 con reintento, reduced-motion sin
atenuación, HTML sin JavaScript, cuatro anchos de 320 a 2560 en ambas vistas,
texto al 200 %, arrastre táctil y persistencia del canvas.

Resultado: `npm run check` completo, con **215 tests unitarios** y build
estático; **30 pruebas E2E** de Edmunds en Chromium de escritorio y móvil, y
las suites de smoke y navbar sin regresiones. Revisión visual con capturas de
Playwright a 1440 × 900 y 375 × 812: cubierta, mosaico, visor, bitácora y
cierre. Capturas en `output/playwright/edmunds/` (ignorado por git).

## Noveno pase — el mosaico en filas justificadas (2026-09-22)

Esta sección manda sobre el resto del documento en **cómo se compone la vista
Mosaico**. La abrió el dueño con cinco capturas: «hay espacios en la galería
versión mosaico que hay que eliminar […] no es que todas las fotos tengan el
mismo tamaño, sino que no existan espacios tan grandes».

El diagnóstico no era de medidas, era de mecanismo. **El mosaico era CSS
multi-columna** (`columns: 4 / 3 / 2`), y una columna CSS no reparte obras: las
apila buscando que todas las columnas midan LO MISMO DE ALTO. Con fotos que no
se pueden cortar —`break-inside: avoid`— y una mezcla de 0.56 y 1.78 de
relación de aspecto, ese equilibrio no existe: el navegador fija la altura por
la columna que peor le cuadra y las demás terminan donde terminan. De ahí los
huecos negros de las capturas, que no eran un fallo de espaciado sino la forma
normal de fallar de las columnas, y que además crecían con el sector porque
cada uno tiene su propio equilibrio.

La corrección es cambiar de figura: **filas justificadas**. Dentro de una fila,
el factor de crecimiento de cada obra es su relación de aspecto y la base es
sólo su marco, así que los anchos salen proporcionales al aspecto, **todas las
obras de una fila caen exactamente a la misma altura** y la fila ocupa el ancho
entero. El sobrante no se reparte mejor: no existe.

Lo único que queda por decidir es dónde se corta cada fila, y eso no puede ser
el `flex-wrap` del navegador —que llena mientras cabe y deja el resto en una
última fila a medias, siete veces, una por sector—. Lo decide
`lib/mosaic-rows.ts`: una programación dinámica sobre el orden de las obras, que
es curaduría y no se toca, donde cada fila cuesta lo que se separa del objetivo
al cuadrado y se elige el reparto más barato del sector entero. **La última fila
se decide con el mismo criterio que las demás**, así que también va llena. El
número de filas no se calcula aparte: sale solo.

Tres reglas que costaron una medición cada una:

1. **La altura de una fila la fija el ancho disponible**, así que un solo juego
   de cortes no sirve para todas las ventanas: con una sola banda de teléfono,
   de 320 px a 700 px, la misma fila pasa de 137 px a 950 px de alto. Son cinco
   bandas (`xl / lg / md / sm / xs`) y sus cortes viajan **todos a la vez en el
   HTML servido** —un elemento de ancho completo y alto cero por corte, con las
   bandas donde aplica en `data-at`—; la hoja de estilo enciende el que toca. No
   hay medición en JavaScript, ni `ResizeObserver`, ni salto al hidratar.
2. **Cuando los factores de crecimiento de una línea suman menos de uno,
   flexbox reparte sólo esa fracción del espacio libre.** Una obra vertical sola
   —0.87 de aspecto— se quedaba en 543 px de una fila de 619 y dejaba justo el
   hueco que el pase venía a quitar. El factor va multiplicado por diez, que no
   cambia ningún reparto porque el espacio se distribuye en proporción.
3. **Los topes son penalizaciones y no prohibiciones**, porque un sector puede
   no tener ningún reparto que las cumpla. `maxPerRow` impide que ocho carteles
   verticales entren en la misma fila convertidos en astillas; `maxRatio` impide
   la fila achatada —una panorámica junto a un cartel en un teléfono dejaba el
   cartel en 71 px de ancho y la fila en 90 px de alto—; y `minSolo` impide que
   una obra estrecha se quede sola ocupando el ancho entero, que es lo que la
   estira hasta la altura de la página.

El separador vertical lo ponen los márgenes de las obras y no `row-gap`, que
contaría dos veces alrededor de cada corte. El `max-width` por aspecto queda
como red de seguridad para un sector degenerado, y hoy no llega a aplicarse en
ninguna banda.

Medido en el navegador sobre las 90 obras, en 320, 375, 430, 540, 680, 820,
1000, 1200, 1425 y 1905 px de ancho: **holgura máxima al canto derecho 0 px** en
todas las filas de todos los sectores, **desalineación dentro de una fila 0 px**,
ningún desbordamiento horizontal, alturas de fila entre 144 px y 702 px y
ninguna obra por debajo de 108 px de ancho. Las mismas comprobaciones quedan en
`e2e/edmunds.spec.ts` (holgura y desalineación por debajo de 1,5 px) y el
reparto tiene prueba propia en `lib/mosaic-rows.test.ts`.

La cubierta 3D, el visor, el catálogo, la curaduría y la paleta no cambian.
`sizes` sí: la anchura que pinta el mosaico ya no es una columna sino
`aspecto × altura de fila`, y se declara por banda. Su valoración visual queda
abierta.

---

---

## Primera implementación (2026-09-11, sustituida el mismo día)

Edmunds mostraba fotografía, diseño y composición como práctica personal en
`/es/creatividad`, con prosa y catálogo en el frontmatter de
`content/es/worlds/edmunds.mdx`. Carbón, cobre y arena; marcos cálidos,
tipografía editorial y perspectiva fija con cinco posiciones (`perspective`,
`translateZ`, `rotateY`), recorrido con botones, flechas y arrastre, visor
modal y mosaico. La selección era de **48 fotografías y 12 diseños** en cinco
temas: Horizontes, Vida y detalles, Retratos, Después del sol y Diseño y
composición. Se revisaron visualmente 84 imágenes de `Fotos/` y 24 de
`Disenos/`; se escogió una representación por motivo, sin inferir proceso de
autoría de los nombres de archivo. Los 180 recursos ocupaban 29,62 MiB y la
prueba de red exigía como máximo siete recursos al entrar. Los scripts
modernos de producción sumaban 169,26 KiB gzip en Creatividad, +10,09 KiB sobre
Privacidad. Cerró A14 y A15 del Appendix A.
