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
