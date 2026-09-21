# Endurance — jerarquía, silueta y muelle de misión

2026-09-20. Pedido del dueño: mejorar de forma importante la **nave**, tomando
las capturas del Observatorio como referencia. El diagnóstico es jerarquía,
silueta e identidad; añadir luces o detalle no basta. Dirección e implementación
delegadas a Codex. La valoración visual del resultado queda pendiente de Jonás.

Este documento sustituye los apartados anteriores de
`world-visual-language.md` y `endurance-operational-life.md` **sólo en geometría
y materiales de Endurance**. No rediseña la página Proyectos ni selecciona una
de las cuatro maquetas de página. Sigue la arquitectura del plan
`../plans/jonas-orbit-v3-mission-endurance.md` y su pivote: cuerpo compartido por
el mapa y el Observatorio, contenido independiente de la escena.

## Dirección

Un anillo portante que lleva estaciones de misión; un muelle axial que explica
su profundidad. Se conservan los doce módulos y cuatro grupos, pero sus masas
se extienden tangencialmente al aro en vez de salir como dientes radiales.

- **Cuatro estaciones principales**, más anchas, con carcasa biselada.
- **Cuatro hábitats secundarios**, compactos y claros.
- **Cuatro buses de servicio**, bajos y oscuros, con lamas enrasadas.
- **Dos alas térmicas** opuestas, en lugar de cuatro palas.
- **Una Ranger atracada**, en lugar de cuatro naves superpuestas.
- **Un muelle de misión** en el sector +X: fondo retraído, dos hojas laterales,
  tres guías y umbral de cobre. Es una decisión de geometría; no se presenta
  como un mecanismo interactivo ni despliega proyectos en esta entrega.

El núcleo cambia el cono y su mástil por un barril facetado más ancho, hombro
portante, collar hueco y seis garras. Su fondo queda retraído respecto del
labio; un rayo axial lo verifica. Los cuatro motores de popa permanecen.

Los puentes pierden sus bloques de encastre y horquillas secundarias. Tres
vanos y dos largueros expresan el esfuerzo. El doble aro tiene sección
rectangular, no tubular. Las piezas pequeñas se integran en las caras.

## Acabados

Cerámica satinada clara, titanio y grafito, con cobre localizado. Se retiran las
placas naranjas grandes. La textura de Endurance pasa de 128 a 256, con paños
amplios y juntas contenidas; la de la Ranger conserva sus datos.

El problema del grafito no era sólo su albedo: recibía el mismo filo aditivo
que el casco claro. `shipEdge` pondera los reflejos amplios y el filo por
acabado, exclusivamente en `uKind == 4`. Los radiadores usan canales finos con
antialias por derivadas. Se retira una llamada a FBM de Endurance. No cambian
la luz de Gargantúa, exposición, bloom global ni los materiales de otros cuerpos.

Las trece fuentes operacionales permanecen, recolocadas sobre superficies
reales y con aperturas más pequeñas. Las catorce toberas y su reloj no cambian;
los dos RCS del collar se recolocan en el nuevo hombro.

## Contratos conservados y coste medido

Mismo `placement`, pose, giro, cámara, interacción, navegación y cuatro batches
de cuerpo. El radio sigue siendo **6.2689430815**: las puntas de las dos alas
conservadas son los vértices que ya fijaban la envolvente. No se compensa el
rediseño acercando la cámara ni agrandando el blanco de clic.

Conteo del cuerpo, excluyendo su trayectoria:

| Medida | Antes | Después |
|---|---:|---:|
| Vértices | 11 843 | 10 157 |
| Triángulos | 13 136 | 8 848 |
| Mallas / draws de cuerpo | 4 | 4 |
| Módulos | 12 | 12 |
| Radiadores | 4 | 2 |
| Naves atracadas | 4 | 1 |

Son 32.6 % menos triángulos; no se afirma una mejora de FPS sin medirla. Los
techos globales de 22 500 vértices y 20 batches no se amplían. El resto de los
cuerpos conserva geometría y radio. El esquema SVG también muestra dos alas,
una lanzadera y los muelles, para que el perfil ligero represente la misma nave.

## Verificación

- Cavidad real del collar, radio conservado, conteos y presupuesto en
  `bodies.test.ts`; el contrato del espécimen sigue leyendo los conteos del
  modelo, incluidos los dos radiadores.
- Encuadres de todas las vistas, escritorio/móvil y barrido del eje con
  `observatory-frames.test.ts`, sin relajar sus límites.
- Esquema sin WebGL cubierto por `flat-world-body.test.tsx`.
- Lint, TypeScript y Knip; 405 pruebas unitarias y build de producción.
  La ejecución paralela sin límite tuvo tres timeouts de 5 s mientras se
  capturaba con SwiftShader; la suite completa pasa con dos workers sin
  cambiar timeouts ni pruebas.
- Capturas reales bajo `output/playwright/endurance-redesign/`: antes,
  canónica, rasante, silueta, operaciones, giro a 90°, sin bloom, móvil y mapa.
  Las maquetas de ImageGen de la conversación anterior no son estas pruebas.
- 14 pruebas de navegador aprobadas sobre el build de producción, en Chromium
  de escritorio y móvil: pausa con manipulación viva, reposo sin renders,
  fallback sin WebGL, HTML sin JavaScript, blancos accesibles a 375/768/1440,
  mandos alcanzables, contrato común del laboratorio y giro sin cambiar la luz.

Los controles `EJE`, `LUZ`, vistas, comparación y movimiento global conservan
su comportamiento. La voz del `registro` del MDX queda intacta.

## Segundo pase — referencias de la Endurance (2026-09-21)

Este apartado sustituye el anterior en arquitectura, tamaño y encuadre. Jonás
señaló las dos alas térmicas como piezas que no pertenecen a la Endurance y
pidió más módulos, más pequeños, con un anillo mayor. Adjuntó una imagen de
la nave y dos modelos de referencia. Es una nueva dirección autorizada; las
restricciones de doce módulos, dos alas y radio fijo del primer pase caducan.

### Forma

- **Dieciséis módulos**: cuatro estaciones, ocho hábitats y cuatro unidades
  de servicio. Las estaciones pasan de 0.46–0.51 a 0.30 de ancho tangencial;
  las demás piezas miden 0.27. Los cantos tienen un bisel contenido.
- **Anillo de radio 1.22**, antes 0.88: 38.6 % más diámetro en la cadena de
  módulos. Cilindros y abrazaderas conectan sus cuerpos; desaparecen ambos
  rieles continuos y las dos alas externas.
- **Dos tubos habitables**, en vez de cuatro puentes de celosía. Los cuatro
  cuadrantes interiores quedan abiertos.
- **Núcleo más corto**, con collar realmente hueco, seis garras y cuatro
  campanas. Dos Rangers pequeñas se acoplan a sus costados. Se retira el
  muelle rectangular del anillo: el acoplamiento se concentra en el centro.
- **32 caras térmicas integradas**, una por delante y otra por detrás de cada
  módulo. Marco, nervio, juntas y aberturas pertenecen a la carcasa. El shader
  representa canales y divisiones de casete, con antialias por derivadas.

Se mantienen cuatro cápsulas de maniobra, catorce toberas con su reloj, ocho
luces cálidas y cuatro técnicas. Todas están ancladas a superficies físicas.
La textura continúa en 256 y los otros cuerpos no cambian con este pase.

### Envolvente y coste

El anillo crece; la envolvente total disminuye porque ya no incluye las alas:
**6.2689430815 → 5.6365331193**. El radio y el blanco de selección siguen
derivándose de la geometría. No se cambia `placement`, la pose ni la cámara
del System Map. En el Observatorio `boundsFill` pasa de 1.15 a **0.96**: el
anillo ahora ocupa la envolvente y ya no procede compensar unas puntas finas.

El cuerpo pasa de **10 157 a 12 043 vértices** y de **8 848 a 9 080 triángulos**,
con **cuatro draws**. El conjunto con las órbitas y el quad suma **21 853
vértices**, dentro del techo de 22 500. Las conexiones no llevan tapas internas
ocultas y las pequeñas aberturas frontales son superficies enrasadas. No se
afirma una mejora de FPS.

El SVG representa la misma arquitectura (16 módulos, dos tubos, dos Rangers,
paneles integrados). `DATOS` publica 32 paneles térmicos integrados, no dos
radiadores exteriores. En el MDX sólo cambia la frase factual de construcción;
el resto del registro conserva la voz de Jonás.

### Verificación del segundo pase

- Rayos sobre las 32 caras térmicas comprueban que están expuestas. Esta prueba
  detecta una placa de soporte que ocultaba el panel trasero y fue retirada.
- Rayos sobre los cuatro vacíos, ambos tubos y el collar verifican la geometría.
- Pasan las vistas de escritorio/móvil y el barrido de rotación, sin relajar
  los límites de encuadre ni el presupuesto global.
- Capturas reales en `output/playwright/endurance-reference-v2/`: canónica,
  rasante, silueta, operaciones, giro a 90°, móvil, consola móvil, reverso y mapa.
- Suite completa: 405 pruebas; tras retirar las placas traseras, 42 pruebas
  del modelo, contrato y encuadre repetidas y aprobadas. Lint, TypeScript, Knip y
  compilación de producción aprobados.
- 14 pruebas de navegador aprobadas sobre producción, en escritorio y móvil:
  pausa y manipulación, reposo sin renders, fallback sin WebGL, HTML sin JS,
  mandos accesibles y giro sin cambiar la luz.

La valoración visual de este segundo pase queda pendiente de Jonás. No es una
implementación de la página Proyectos ni una animación de despliegue de proyectos.

## Tercer pase — catorce módulos y cuerpos prismáticos (2026-09-21)

Jonás pide quitar dos módulos y revisar su FORMA contra las mismas referencias.
Este apartado sustituye al segundo pase en cantidad y forma del casco modular.
La dirección nueva mantiene anillo, núcleo, dos brazos y dos Rangers.

El problema era de proporción: las carcasas anteriores tenían casi el mismo
largo, ancho y grosor. Ahora las cuatro estaciones miden **0.48 × 0.27 × 0.22**,
los seis hábitats **0.46 × 0.25 × 0.20** y las cuatro unidades de servicio
**0.43 × 0.25 × 0.19**, en ejes radial/tangencial/axial. El centro de cada
carcasa está 0.075 más afuera que la línea de conexiones.

`endurancePod` construye cuatro secciones: pie con 66 % de anchura y 70 % de
grosor, hombros inclinados, cuerpo prismático y tapa exterior con canto
facetado. La inclinación tiene volumen en dos planos; no es simplemente un
bisel más grande sobre una caja. La cara principal tiene tres franjas térmicas
longitudinales y una zona blanca de servicio con seis aberturas. La tapa
exterior lleva tres registros estrechos. Los paneles del reverso siguen expuestos.

Los **14 módulos** se distribuyen uniformemente; las cuatro cápsulas de
maniobra se recolocan en huecos reales de esa distribución para que no
atraviesen los módulos. Las dos uniones con los brazos siguen opuestas.
El SVG dibuja los mismos hombros y franjas; `DATOS` cuenta **28 paneles
térmicos**. La frase factual del MDX se actualiza a catorce.

Se conservan radio del anillo **1.22**, `boundsFill` **0.96**, las vistas,
el movimiento y la luz. La envolvente física se mide en **6.0906807906** por
el nuevo largo radial. Cuerpo: **11 891 vértices**, **8 996 triángulos** y
**cuatro draws**; total de escena con órbitas: **21 701 vértices**. No se
amplía ningún presupuesto y el resto de los modelos conserva sus medidas.

Pruebas: rayos comprueban que el pie es más estrecho y menos grueso que el
cuerpo, y que los 28 paneles están a la vista desde ambas caras. Los encuadres
de todas las vistas y el barrido del eje pasan en escritorio y móvil. Pasan
las 405 pruebas unitarias, lint, TypeScript, Knip y build de producción.
También pasan seis pruebas de navegador en escritorio/móvil sobre producción:
fallback sin WebGL, ruta sin JavaScript y contrato del laboratorio.
Capturas reales en `output/playwright/endurance-14/`.

La valoración visual del tercer pase queda pendiente de Jonás.


## Cuarto pase — doce módulos y tres siluetas (2026-09-21)

El dueño pide menos módulos y diferencias reales entre ellos, con dos nuevas
referencias: `0_gnBG2kpf8MolPY_M.png` y `871b815ab6044bfca60967012be12a04.jpeg`.
Este apartado sustituye al tercero en cantidad, familias, conexiones y paneles.
Se interpreta el patrón de doce de la vista frontal: cuatro cuerpos blancos
cerrados intercalados con ocho largos, no doce copias con cambios de color.

- Cuatro estaciones, en los ejes principales: **0.56 × 0.29 × 0.28**, con pie
  estrecho y dos paños longitudinales oscuros, satinados y de junta contenida.
- Cuatro hábitats: **0.51 × 0.31 × 0.30**, hombros inclinados y dos columnas de
  casetes térmicos acanalados con divisiones transversales.
- Cuatro bodegas en sectores 2/4/8/10: **0.36 × 0.36 × 0.34**, carcasa corta
  biselada, cuatro placas blancas por cara y registro de inspección. Sin panel
  térmico. La anchura, el grosor y el extremo radial difieren físicamente.

Cada hueco lleva un cuello blanco con abrazaderas y un nudo octogonal con
escotilla circular en ambas caras. Se corrige la composición de rotaciones
para que el cilindro no atraviese sus propias tapas. Los cuatro propulsores
periféricos se recolocan en huecos de la distribución de doce. Dos brazos,
núcleo y Rangers conservados; sin alas añadidas. No cambia la luz compartida.

Los ocho módulos con paneles tienen **16 caras térmicas**. La máscara 4 da a
las estaciones un paño continuo y oscuro; la 3 conserva los casetes, con
menos contraste en la rejilla. El SVG también distingue las tres familias.
`DATOS` y la frase factual del registro reflejan doce módulos y dieciséis caras.

Anillo **1.22**, `boundsFill` **0.96** y cámaras conservados. Radio físico
**6.2575212966**; **12 123 vértices**, **9 472 triángulos**, **cuatro draws**.
Total con órbitas y quad: **21 933 vértices**, bajo el techo de 22 500.
Los otros cuerpos mantienen exactamente geometría, radio y coste.

La verificación geométrica cubre los 16 paneles expuestos, la bodega más corta
y ancha, los hombros de los módulos largos, las escotillas completas y los
vacíos interiores. Capturas reales de las cuatro vistas, giro y móvil en
`output/playwright/endurance-12/`. Valoración visual pendiente del dueño.

Verificación del cuarto pase: 405 pruebas unitarias aprobadas con dos workers,
lint, TypeScript, Knip y build de producción aprobados. La primera suite sin
limitar workers agotó los 5 s de un test de Edmunds; la suite completa repetida
con dos workers pasó sin cambiar pruebas ni límites. Seis pruebas de navegador
aprobadas sobre producción en escritorio/móvil (HTML sin JS, fallback sin WebGL
y contrato de instrumentos). Las capturas en desarrollo tuvieron avisos
transitorios de framebuffer durante Fast Refresh; las imágenes finales se
revisaron completas y no hubo errores de consola.
