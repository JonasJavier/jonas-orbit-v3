# Edmunds — cubierta de observación

2026-09-11 · Segunda implementación pedida por Jonás el mismo día, tras ver la
primera: «la galería 3D no me gusta, quiero que sea más inmersiva; el foco de
toda la página debe ser la galería 3D». Sustituye a la sección «Primera
implementación», que queda al final como referencia histórica. Dirección
pendiente de su valoración visual.

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

Cuatro bandas apiladas que juntas miden una pantalla (`100svh` menos la barra):

1. **HUD.** Rótulo `DESTINO 04 / EDMUNDS / CUBIERTA DE OBSERVACIÓN` con punto
   de estado, el `h1` con la línea en itálica serif, la introducción a la
   derecha y tres lecturas en monoespaciada: `OBRA 01 / 77`, `SECTOR`,
   `REGISTRO 01.01`. En mosaico las lecturas pasan a `PIEZAS / SECTOR / VISTA`.
2. **Controles.** Filtro por sector —cada chip con su punto de color y su
   cuenta— y el conmutador `Galería 3D / Mosaico`.
3. **Escenario.** Un anillo de obras con perspectiva de 1400 px: la activa al
   frente, tres a cada lado retrocediendo en Z (240 px por paso), girando
   28° por paso, escaladas al 88 %, cada vez más oscuras y transparentes. Más
   allá de ±3 no existen en el DOM (`display: none`), así que sus imágenes no
   se piden. Debajo, un **suelo de rejilla** rotado 84° en el mismo espacio 3D,
   con línea central de aterrizaje y máscara radial: es la pista de la cubierta
   y el principal indicio de profundidad. Las obras se reflejan en él
   (`-webkit-box-reflect`, sólo en la cubierta; mejora progresiva). Detrás, dos
   capas de estrellas del mismo SVG que usa la navegación, con deriva lenta, y
   una **luz ambiente**: la copia de 480 px de la obra activa, desenfocada a
   46 px, al 34 % y en mezcla `screen` sobre el carbón, de modo que cada obra
   tiñe la cubierta sin sacarla de la paleta.
4. **Pie.** Botones `← / Ampliar / →` a la izquierda —lejos del control de
   audio fijo en la esquina inferior derecha—, leyenda de la obra en el centro
   (`registro · sector · medio`, título y una línea) y a la derecha el **raíl
   de sectores**: un segmento por sector proporcional a su tamaño, con marcador
   de posición; pulsar un segmento salta al primer trabajo de ese sector.

La obra activa recibe **retículo**: cuatro esquinas que se abren 2 px al
adquirirla, un barrido de luz de 1,2 s y un halo cobre. Pulsar una obra lateral
la trae al centro; sólo la centrada abre el visor. El puntero fino añade un
paralaje de ±2° a todo el bloque (obras, suelo y estrellas a distinta
velocidad), escrito en variables CSS desde `pointermove` con un `rAF` por
evento — no hay bucle. Las obras que entran en la ventana visible llegan desde
el fondo con `@starting-style`. Nada de esto ocurre con reduced-motion ni con
el perfil ligero: se empieza en mosaico, sin transiciones ni paralaje.

Una regla que costó una entrega y que vale para cualquier anillo en CSS 3D:
**en un contexto `preserve-3d` real, la lista `<ol>` es un plano en z = 0 que
cubre todo el escenario, y las obras retrocedidas en Z quedan DETRÁS de ese
plano.** El rayo del puntero lo golpeaba primero y ninguna obra lateral recibía
el clic — Playwright lo detectó porque `elementFromPoint` en el centro de una
obra lateral devolvía el `<ol>`. Ni `filter`, ni `opacity`, ni el reflejo, ni
la transición tenían que ver: sólo aplanar los tres niveles lo arreglaba, y eso
mataba la profundidad. La solución es dejar los contenedores transparentes al
puntero (`pointer-events: none` en `.edmunds-stage__space`, `.edmunds-deck` y
`.edmunds-artworks`) y devolvérselo a cada obra visible.

Debajo de la cubierta va la **bitácora**: siete tarjetas de sector con portada
(la primera obra del sector, a 480 px y carga diferida), número, nombre,
descripción y cuenta. Elegir una filtra la cubierta y la desplaza a la vista.
Después, la declaración personal con los tres hechos del MDX como lecturas, el
colofón y los vecinos.

## Paleta

Los dos colores vivos son los del cuerpo en `worlds.data.ts`: cobre `#ff9b6b`
(acento) y arena `#f5cf83` (secundario). El resto es roca: carbón `#100d0b`
como sustrato, panel `#1a1512`, ocre, arcilla y oliva apagado. Cada sector tiene
un tono propio sacado de esa misma gama (arena, oliva, ocre, cobre, arena
pálida, arcilla, cobre pálido) que colorea su chip, su segmento del raíl, su
tarjeta y la leyenda de sus obras.

## Catálogo: siete sectores, 77 obras

`Vida y detalles` mezclaba fauna, macro, plantas y nieve: era el cajón de lo
que no cabía en otro sitio. Se reparte en tres grupos con identidad visual
propia y aparece un sector de invierno, que era el motivo más repetido del
archivo sin publicar. El orden del MDX es el orden del viaje —de lejos a cerca,
de lo vivo a las personas, del frío a la noche y por último a lo imaginado— y
un test lo comprueba:

| # | Sector | Obras | Qué entra |
| --- | --- | --- | --- |
| 01 | Horizontes | 17 | Paisajes, agua y cielos |
| 02 | De cerca | 7 | Hojas, flores, texturas, el bosque desde abajo |
| 03 | Criaturas | 11 | Fauna, acuarios, la llama que se acercó |
| 04 | Retratos | 10 | Personas, gestos, figuras en el paisaje |
| 05 | Invierno | 12 | Nieve, hielo, túneles y vasos de hielo |
| 06 | Después del sol | 8 | Aurora, hogueras, ciudades encendidas |
| 07 | Diseño | 12 | Carteles, fotomontajes, portada e interfaz |

Se incorporan **17 fotografías** que la primera selección dejó fuera y que
refuerzan los sectores nuevos (siete de invierno, cuatro horizontes, dos de
noche, dos retratos, un oso, un suelo de pinar). Siguen siendo una selección:
quedan 31 imágenes sin publicar, más el PDF de revista y los enlaces Figma. Se
mantiene el criterio anterior —una representación por motivo, sin variantes— y
no se cambia ningún original.

Cada obra gana dos campos en el esquema de Velite: **`caption`**, una línea
editorial que acompaña al título en la cubierta, el mosaico y el visor, y
**`medium`** (`photo`, `poster`, `composite`, `editorial`, `interface`), que la
interfaz traduce a `Fotografía`, `Cartel`, `Fotomontaje`, `Portada` o
`Interfaz`. El registro `sector.posición` (`01.01`, `07.12`) se calcula en el
componente y no se guarda. Los títulos se revisan donde un nombre era vago
(«De cerca» → «Cara a cara», «Hot summer» → «Hoy se come», la palabra impresa en
el cartel) y los `alt` se corrigen con lo que se ve (la «cabra» era una llama).
Como antes, títulos y leyendas son editoriales: no atribuyen lugares,
identidades, fechas ni datos de cámara.

## Acceso y fallos

- Cada obra sigue siendo un enlace HTML real a su WebP grande; en la cubierta
  la activa lleva `aria-current`.
- Escenario: región con `aria-roledescription="carrusel"`, tabulable;
  flechas, Home, End y Enter (abre el visor); arrastre horizontal con puntero o
  dedo, con el scroll vertical intacto (`touch-action: pan-y`). Los enlaces de
  las obras llevan `draggable={false}`: al hacerse alcanzables por el puntero,
  un arrastre que empezaba sobre una obra disparaba el arrastre nativo del
  enlace y cancelaba el gesto — la prueba de arrastre lo detectó.
- Raíl de sectores: botones con nombre `Sector: n piezas`, mínimo 44 px.
- Visor: `dialog.showModal()`, esquinas del visor, Escape, flechas, cierre
  visible, tabulador confinado, foco devuelto al enlace de origen, reintento
  ante fallo de imagen.
- Sin JavaScript, `noscript` desmonta la cubierta en cuadrícula: los 77
  enlaces, imágenes, títulos y leyendas siguen ahí.
- Reduced-motion y perfil ligero empiezan en mosaico; elegir la cubierta
  conserva transiciones, deriva y paralaje apagados.
- El mosaico agrupa por sector con cabecera `h2` por grupo; en la cubierta el
  único `h2` de la galería es el título de la obra activa. Las imágenes del
  mosaico son diferidas (la primera versión de este pase las cargaba todas
  ansiosas por un `eager` mal condicionado, detectado en revisión).

## Recursos y presupuesto

`tools/prepare-edmunds.mjs` genera 231 WebP (77 × 480/960/1920) que ocupan
39,14 MiB en disco. Al entrar en la cubierta se piden como máximo **16**
recursos de obra: las siete del anillo, la copia ambiente de la activa (480 px,
ya en caché cuando el `srcset` eligió ese tamaño) y hasta siete portadas de
sector, ninguna de 1920 px. `e2e/edmunds.spec.ts` lo exige.

Los scripts modernos de producción, sin `nomodule` y contando cada `src` una
vez, suman **209,63 KiB gzip** en Creatividad y Formación —comparten el chunk
de `[mundo]`—, 203,07 en la portada y 197,86 en Privacidad: **+11,77 KiB**
sobre la ruta sin contenido interactivo, dentro del presupuesto propio de
40 KiB (el pase anterior medía +10,09; la base absoluta subió con los cambios
de navegación de Miller, no con esta página). No se añadió ninguna dependencia.

Presupuesto de dibujo: cero contextos WebGL nuevos, cero bucles, un `rAF` por
evento de puntero. Las capas con `filter` son dos —la luz ambiente y el brillo
de las obras laterales— y el desenfoque vive en un solo elemento a resolución
de 480 px.

## Verificación

`components/edmunds-page.test.tsx` cubre significado y vecinos, catálogo
(77 obras, 7 sectores, 12 diseños, 65 fotos, orden por sector, leyenda y
medio, WebP íntegros), filtro y teclado con registro publicado, centrar antes
de abrir, bitácora, mosaico agrupado, archivo vacío, una obra, imagen fallida y
reduced-motion. `e2e/edmunds.spec.ts` cubre mosaico agrupado, visor con
registro, cubierta con perspectiva y `preserve-3d`, avance por teclado y
arrastre, carga acotada, obra lateral que se centra, bitácora y raíl, 404 con
reintento, reduced-motion, HTML sin JavaScript, cuatro anchos de 320 a 2560 en
ambas vistas, texto al 200 %, arrastre táctil y persistencia del canvas.

Resultado: `npm run check` completo, con **214 tests unitarios** y build
estático; **28 pruebas E2E** de Edmunds en Chromium de escritorio y móvil, y
las suites de smoke y navbar sin regresiones (114 pruebas). Revisión visual en
el navegador integrado a 1440 × 900 y 375 × 812: cubierta, mosaico, visor,
bitácora y cierre. Capturas en `output/playwright/edmunds/` (ignorado por git).

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
