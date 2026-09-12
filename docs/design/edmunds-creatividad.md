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
| 02 | Horizontes | 21 | Paisajes, agua, cielos, cañones y la ciudad desde arriba |
| 03 | De cerca | 7 | Hojas, flores, texturas, el bosque desde abajo |
| 04 | Criaturas | 12 | Fauna, acuarios, la llama y la alpaca |
| 05 | Retratos | 12 | Personas, gestos, figuras en el paisaje |
| 06 | Invierno | 16 | Nieve, hielo, túneles, pistas y vasos de hielo |
| 07 | Después del sol | 10 | Aurora, hogueras, caminos y ciudades encendidas |

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

`tools/prepare-edmunds.mjs` genera 270 WebP (90 × 480/960/1920) que ocupan
46,27 MiB en disco. En pantallas táctiles o estrechas no hay reflejos, el
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
