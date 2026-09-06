# Raíl, atlas plano y Tesseracto — 2026-09-06

Petición explícita del dueño: invertir la información del raíl, recomponer el
mapa 2D en todos los formatos y sustituir el exterior y el interior del
Tesseracto por una arquitectura inspirada en `teseracto referencia.png`.

Este documento sustituye los bloqueos anteriores del **atlas plano**, del
**orden de las etiquetas del raíl** y de la **geometría del Tesseracto**. La
referencia es dirección visual; la implementación sigue siendo geometría real,
con un equivalente SVG estático. La aprobación artística final sigue siendo
del dueño.

## Navegación

El raíl muestra Historia, Desarrollo, Proyectos, Creatividad, Laboratorio y
Contacto desde el primer frame. Hover, foco o selección revelan el nombre
cósmico debajo. Se reservan ambas líneas para que los enlaces no se desplacen.
Los seis enlaces, sus destinos y la prioridad de foco permanecen iguales. El
TARGET y las etiquetas junto a los cuerpos siguen identificando el mundo.

## Atlas 2D

`lib/flat-composition.ts` define **tres** composiciones en porcentaje del
viewport: `wide`, `portrait` y `short`. Son decisiones de composición del atlas,
independientes de los datos orbitales WebGL. Los mismos slots DOM y enlaces
sostienen los tres perfiles; las coordenadas planas sobreviven al teardown de
WebGL.

`short` es el apaisado corto —el móvil girado— y existe porque una sola tabla
horizontal no puede servir a la vez a un escritorio de 1080 px de alto y a un
teléfono de 375: lo que cambia entre los dos no es la proporción sino **cuánto
pesa el raíl dentro del cuadro**. A 1080 ocupa el 7 % del alto; a 375, el 19 %.
Con una sola tabla, la Ranger —el cuerpo más bajo del atlas— se metía debajo del
raíl a 812×375 y lo rozaba por una décima de píxel a 320×568.

La salida NO fue comprimir la composición para que quepa en el peor caso, porque
eso amontona los cuerpos en el centro de las pantallas que ya funcionaban: es la
misma decisión que ya estaba tomada al separar `portrait` de `wide`, aplicada
una vez más. `short` comparte las X de `wide` —a lo ancho ese formato sobra— y
sólo sube la columna vertical. La Ranger baja además de 73 a 69 en `portrait`.
Margen resultante contra el raíl: 22.6 px a 320×568 y 20.9 px a 812×375.

Gargantúa ocupa el centro visual desplazado: 46/49 en horizontal, 48/43 en
vertical. Miller y Tesseracto abren el campo superior; Edmunds y Endurance
equilibran el inferior, con Ranger más próxima al raíl. Tamaños y proxies
comparten variables CSS. En horizontal corto el raíl ocupa una sola fila.

Se retiran las elipses decorativas del atlas y los halos uniformes de los
cuerpos. El cielo plano baja de intensidad y se enmascara detrás de la sombra
central. Miller recibe agua azul grisácea con corrientes y luz hacia el centro;
Edmunds, provincias secas ocres, relieve y sombra direccional. Sus SVG son
estáticos también con reduced-motion y sin JavaScript.

## Tesseracto

La referencia se traduce en dos tramos estructurales exteriores desfasados,
planos laterales de grafito, cuatro extensiones en L y siete umbrales conectados
hacia un vacío central. Se abandona la caja compacta anterior. La luz cálida
procede del material común y crece hacia dentro, sin esfera o reactor central.

Cuatro meshes, un solo material opaco, cero texturas nuevas y ningún sitio de
ruido añadido al shader. La cáscara permanece fija; los tres grupos interiores
oscilan sin acumular giro. El radio real se normaliza a la envolvente anterior,
con tests geométricos del hueco, la envolvente animada y el movimiento proyectado.
No se cambian la posición, la cámara o los datos orbitales del Tesseracto.

### Profundidad contradictoria — revisión del dueño (2026-09-06)

La nueva petición sustituye la regularidad del corredor y el acabado de sus
vigas: cada pieza debe entenderse, pero su coexistencia debe resultar extraña.
Se conservan siete umbrales y el número de piezas. Las primeras capas reciben
desplazamientos, giros y pequeñas inclinaciones independientes; los intervalos
en profundidad dejan de ser uniformes y el último umbral retrocede. Dos de los
tirantes existentes saltan un nivel y desembocan sobre otra arista, conservando
el vacío central atravesable durante toda la animación.

Las vigas exteriores se conservan como referencia de escala y oclusión, con una
boca más interrumpida y un marco trasero más desfasado. Los prismas cuadrados
del Tesseracto pasan a secciones de ocho caras con biseles reales y normales
separadas: caras anchas de acero ennegrecido y reflejos cálidos en los cantos.
El relleno exterior baja para recuperar caras y cavidades; los primeros
umbrales contienen su emisión y el último devuelve más luz en el bisel incluso
con emisión apagada. El centro sigue siendo cielo visible, sin reactor ni velo.

El SVG estático comparte los desfases, los dos tirantes anómalos, la boca
interrumpida y la progresión tonal. Se mantienen cuatro draws, un material
opaco, cero texturas nuevas y el presupuesto de ruido. La envolvente se
normaliza al mismo radio; posición, escala del destino, cámara y otros cuerpos
permanecen iguales. No cambia el movimiento de los tres grupos interiores.

Verificación de esta revisión: `npm run check` (189 tests), siete E2E del atlas
y tres E2E de opt-in/reducción de efectos, navegación plana y ausencia de
chunks 3D en `flat`, todos verdes. Capturas de antes/después al mismo tiempo de
escena (`12 s`), bloom-off y SVG en `output/playwright/tesseract-depth/`.

### Remodelado estructural — segunda revisión del dueño (2026-09-06)

El dueño rechaza la lectura todavía demasiado concéntrica de la primera
pasada y autoriza remodelar. Esta sección sustituye su geometría y acabado:
dos codos estructurales opuestos, uno delantero y otro retrasado, sustituyen
el contorno exterior. Se conservan cuatro extensiones, con dos calibres, y
dos planos laterales; quedan dos enlaces entre los apoyos exteriores.

Los primeros cuatro umbrales están abiertos por lados alternos. Sus jambas
ganan anchura y profundidad real para ocultar parcialmente los planos que
hay detrás. Las caras anchas de las vigas tienen una orientación explícita
respecto al corredor, en lugar del giro arbitrario del tirante. Se mantienen
siete niveles y los dos enlaces que saltan de plano, con desfases mayores en
los primeros tres niveles y un centro que vuelve cerca del eje.
Dos uniones de esos primeros umbrales se pliegan hacia otro nivel: sus vigas
siguen siendo rectas, pero el umbral completo deja de pertenecer a un plano.

El material separa acero ennegrecido, caras de valor medio, alma rebajada y
cantos pulidos. La emisión aumenta en profundidad y se interrumpe cerca de
las juntas; no traza todos los marcos completos. La oclusión de las paredes
usa la dirección radial transversal del túnel. El SVG incorpora caras
laterales, umbrales abiertos y un apoyo delantero que oculta el interior.

Cuatro meshes con un material, envolvente normalizada y contratos de cámara,
posición, movimiento y presupuesto intactos. La prueba del vacío ahora pasa
cinco rayos en ambos sentidos durante 120 segundos, para verificar una abertura
real al aumentar el grosor de las vigas. Evidencia visual en
`output/playwright/tesseract-remodel/`.

Validación de esta segunda revisión: `npm run check` completo (189 tests),
los siete E2E del atlas y los tres de efectos y navegación plana pasan.
`final-wide.png` muestra la versión final a 1920×1080; `folded-bloom-off.png`
comprueba material sin bloom ni emisión, y `final-flat.png` su equivalente SVG.

### Hipercubo de cristal — tercera revisión del dueño (2026-09-06)

El dueño retira el corredor entero y pide otra cosa: **un hipercubo de aristas
cristalinas que una línea luminosa va trazando mientras sus planos cambian de
forma**, en cristal oscuro y luz blanca con acentos cian y violeta, legible al
tamaño del hero. Esta sección sustituye a las dos revisiones anteriores del
Tesseracto —`Profundidad contradictoria` y `Remodelado estructural`—, que
quedan como referencia histórica. El corredor se conserva recuperable en
`output/archive/tesseract-corridor-2026-09-06.zip` a petición del dueño; en git
sigue vivo en el árbol anterior a este cambio.

**La geometría es la figura, no una ilustración de ella.** `lib/tesseract.ts`
construye el 4-cubo real: dieciséis vértices, treinta y dos aristas y una
rotación en tres planos que incluyen la cuarta dimensión, proyectada a 3D por
perspectiva. Lo que se ve cambiar de forma no es una deformación pintada — es la
sombra tridimensional de un objeto que gira en un espacio con un eje de más, y
por eso las relaciones internas se reorganizan sin que ninguna arista se estire.

**El trazo es un circuito euleriano.** Los dieciséis vértices tienen grado
cuatro —par—, así que un solo lápiz recorre las treinta y dos aristas y vuelve
al origen sin levantarse ni teletransportarse. Ésa es la diferencia entre
«dibujar» y «encender segmentos»: el orden lo fija `TESSERACT_PATH` y el
fragment sólo necesita la EDAD de cada punto del recorrido. Una vuelta completa
cada dieciocho segundos, con punta blanca, halo y estela.

**Cristal oscuro, no alambre.** El cuerpo del vidrio es casi negro; lo que
dibuja la figura es el filete especular del disco sobre el canto y una
profundidad interna —0 al fondo, 1 al frente— que reparte el valor entre
aristas. La primera pasada no la tenía y devolvió exactamente la jaula que las
tres revisiones anteriores venían evitando: treinta y dos aristas del mismo
peso sobre negro se leen como un dibujo plano. El reparto sale de la propia
`modelMatrix`, sin un uniforme nuevo que mantener sincronizado.

**Las dos celdas no pesan lo mismo** — corrección del dueño sobre la primera
pasada, que salió ilegible: *«no se alcanza bien la forma que se está
dibujando, no sé si es porque todo está oscuro»*. El diagnóstico no era la
exposición. Un hipercubo proyectado son dos cubos —el de dentro y el de fuera—
unidos por ocho tirantes, y con las treinta y dos aristas al mismo valor el ojo
ve un dibujo plano de líneas cruzadas sin saber qué contiene a qué. Bajar la luz
lo apagaba; subirla devolvía el alambre. Lo que faltaba era jerarquía.

`sampleTesseract` publica ahora la **profundidad en W** de cada vértice,
normalizada 0..1 en cada muestra —y no contra un rango fijo, porque el recorrido
en w cambia con la rotación—. Con ella se reparten dos cosas a la vez: la luz,
en el fragment, y el **grosor del trazo**, en la geometría. La celda cercana en
la cuarta dimensión se dibuja gruesa y clara, la lejana fina y apagada, como lo
haría cualquiera a mano. El grosor sale gratis: el tubo se reconstruye entero en
cada muestra. Con el reparto puesto, el nivel general puede subir sin volver al
alambre, porque lo que crece es el contraste interno y no la luminancia media.
La estela pasa de ocho aristas y media a trece, que es lo que deja ver la forma
que se está trazando y no sólo el punto donde está la punta.

**Tres draws, tres materiales.** Uno menos que el corredor, y por primera vez
más de un material: la diferencia entre capas ya no es de acabado sino de
MEZCLA —el trazo es aditivo y no escribe profundidad, las membranas son
translúcidas a dos caras, el cristal es opaco— y eso no cabe en un ramo del
fragment. Como contrapartida, el Tesseracto sale del material común de los
cuerpos: las ocho ramas `uKind == 2` que allí tenía se retiran con él.

**Bloom-off test.** El cristal es opaco y escribe profundidad, y ni la clave ni
el fresnel bajan a cero: con la emisión y el bloom apagados la silueta sigue
entera y el material se reconoce por sus filetes cálidos. El trazo, que es
emisivo, no cuenta para pasar la prueba — un cuerpo que sólo existe mientras el
lápiz pasa por delante no está terminado.

**El atlas plano comparte la topología**, no una versión libre de ella:
`FlatWorldBody` importa `lib/tesseract.ts`, muestrea el instante cero y dibuja
las mismas treinta y dos aristas, las mismas seis membranas y el arranque del
trazo, sin una sola animación ni JavaScript. Comparte también la jerarquía de la
cuarta dimensión: allí no hay shader, así que el reparto viaja en el ancho de
trazo y en la opacidad. El halo del envoltorio pasa de
ámbar a la dispersión fría del cristal.

No cambian posición, fase, inclinación, tamaño, cámara ni los datos orbitales
del Tesseracto, ni ningún otro cuerpo. La envolvente se normaliza en cada
muestra al mismo radio de antes, así que el blanco de clic, los corchetes de
adquisición y la distancia de encuadre siguen valiendo lo mismo — también a las
seis horas de pestaña abierta, que es lo que comprueba `lib/tesseract.test.ts`.

Verificación de esta tercera revisión: `npm run check` completo y los E2E del
atlas y de reducción de efectos. Evidencia visual en
`output/playwright/tesseract-crystal/`: `final-9.png` y `final-14.png` a
1440×860 en dos fases del trazo, `final-bloom-off.png` para el bloom-off test y
`crystal-flat.png` para el SVG del perfil plano.

## Verificación

- Suite existente: rutas, estado de foco/hover, accesibilidad, geometría,
  cuatro batches, centro atravesable y límites de movimiento.
- `e2e/atlas.spec.ts`: 320×568, 375×812, 768×1024, 812×375, 1440×860 y
  1920×1080; cuerpos dentro de pantalla, enlaces de 44 px, centro de cada proxy
  alcanzable y ausencia de overflow; información del raíl en reposo y con foco.
- `tools/shot.mjs` admite `--flat --width=375 --height=812` además del banco
  bloom-off existente. Capturas de revisión en `output/playwright/hero-redesign/`.

La validación técnica no equivale a aprobación visual del dueño.
