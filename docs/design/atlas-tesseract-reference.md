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

### V2 aprobada, y la deuda que deja para una V3 (2026-09-06)

El dueño aprueba esta versión tras ver el vídeo completo y pide **conservarla
intacta**: cualquier V3 tiene que demostrar que es mejor, no sólo distinta. El
checkpoint vive en `output/archive/tesseract-crystal-v2-2026-09-06.zip`
(ignorado por git) con las fuentes, las capturas y esta misma lista.

Su lectura del pase, que fija el criterio para lo que venga: **el cambio de
jerarquía por profundidad 4D importó mucho más que subir el brillo**. Lo que
resuelve la figura es que el ojo entienda que hay estructura dentro de
estructura —la celda cercana domina, la lejana retrocede y los tirantes
explican la relación entre las dos—, no que haya más luz. Y la estela larga
hace que la punta deje de ser una luciérnaga sobre un wireframe: se puede
seguir un instante la geometría que acaba de construir.

El concepto queda cerrado, y con él dos vetos. **No se recupera nada del
Tesseracto anterior** —vigas, carcasa, marcos arquitectónicos, espolones, masa
metálica—: aquel objeto representaba un Tesseracto mediante ARQUITECTURA y éste
es una PROYECCIÓN de uno, y la diferencia es conceptual. Y **no se añade nada
alrededor**: ni partículas, ni energía flotando, ni rayos, ni esfera de glow.

Lo que sí queda pendiente, por orden de techo:

1. **Menos wireframe de software.** Es el mayor límite que queda. La mejora
   tiene que venir del MATERIAL de la arista y no de más geometría: núcleo casi
   blanco muy fino, cuerpo translúcido frío, specular mínimo y variación tonal
   con la profundidad. Que parezca cristal o luz comprimida, no un `lineWidth`.
2. **Romper los cruces.** Cuando dos aristas se superponen en pantalla se
   atraviesan, y ahí se pierde profundidad. Basta con que la de atrás pierda un
   poco de intensidad alrededor del cruce —no hace falta ocultarla— para que el
   cerebro diga «ésa está detrás». Y cuando la rotación 4D invierta la
   relación, aparece la sensación imposible. Es la mejora con más recorrido.
3. **Jerarquía en w menos binaria.** Hoy son dos familias muy evidentes;
   convendría frente / medio / fondo, repartido a la vez en grosor, luminancia,
   saturación y bloom, y muy poco en cada uno, para que la profundidad se lea
   continua.
4. **La punta todavía gana la primera mirada** en algunas poses (5, 8, 11, 17,
   23 y 26 s). Se quiere el orden inverso: primero el Tesseracto, después
   descubrir que algo lo recorre. Sin bajar la estela — bajando el núcleo, o
   haciendo la punta algo menor cuando mira a cámara. No se retira: es
   identidad nueva.
5. **Que el recorrido signifique algo en 4D.** En vez de un lápiz recorriendo
   aristas, que en ciertos momentos priorice los ocho enlaces entre celdas, que
   son los que enseñan que esto no son dos cubos independientes. Cabe una
   dramaturgia: celda cercana → conexiones w → celda lejana → reorganización.
   Así la estela deja de ser bonita y pasa a explicar la estructura sin texto.
6. **Velocidad no constante.** Desacelerar al llegar a una proyección muy
   legible, sostenerla uno o dos segundos, deformarse, cruzar más rápido las
   proyecciones sin interés y aterrizar en otra pose fuerte. Nunca como
   parar → arrancar → parar: tiene que sentirse orgánico. Permite entender y
   perder la forma alternativamente, que es más interesante que un spinner
   matemático eterno. **No todas las proyecciones matemáticamente válidas son
   igual de buenas visualmente**, y esta es la consecuencia práctica.
7. **Memoria fantasma**, a probar en A/B y no necesariamente conservar: cuando
   una celda cambia mucho de posición 4D, que sobreviva 300-600 ms una silueta
   de dónde estaba al 5-10 % de intensidad. Si se nota como motion trail, fuera.

### V4 — pase de pulido sobre la base canónica (2026-09-06)

V3 queda como base canónica y esta sección **sólo pule**: material, oclusión,
ritmo y punta. No toca la matemática del 4-cubo, ni la estructura, ni la
dirección visual, ni la escala, ni la posición. El encargo del dueño fue
explícito sobre el riesgo: *«corremos un peligro muy real ahora: sobretrabajarlo
hasta destruir el hallazgo»*.

El techo que ataca: conviven dos Tesseractos, un objeto 4D imposible en sus
mejores poses y un modelo wireframe en las normales. Todo lo de aquí busca dar
carácter físico también a las poses normales **sin complicar la geometría**.

**1. La arista pasa de línea a varilla.** Dos cambios que van juntos. El
material se parte en tres niveles dentro de la misma sección de dos píxeles
—núcleo blanco frío estrechísimo, cuerpo cian/violeta translúcido y un halo casi
inexistente que sólo se enciende donde la energía acaba de pasar— usando como
parámetro `facing`, que en un tubo vale 1 en la línea central y cae hacia los
cantos. Y las **normales pasan a ser por esquina y no por faceta**: con la
normal de la faceta, `facing` saltaba en seis escalones —una cara encendida, las
vecinas apagadas— y a dos píxeles eso se lee como una tira plana con un filo
duro. Interpolada alrededor del tubo, el núcleo cae en el centro de la sección y
la arista tiene redondez. Sin este segundo cambio el primero no se ve.

**2. La punta encoge, la estela no.** El exponente sube de 14 a 22 —un 20 %
menos de extensión— y su ganancia y su halo bajan con ella; la estela conserva
sus trece aristas. El orden de lectura que se busca es Tesseracto primero y
recorrido después: con la punta anterior el ojo iba a la bolita en 3, 13, 20.5,
28 y 35.5 s y volvía luego a la figura. Menos cometa, más trazo.

**3. El tiempo tiene ritmo.** `rhythm` en `lib/tesseract.ts` deforma el reloj
antes de que entre en la rotación: se demora en las poses legibles y cruza más
deprisa los estados comprimidos. Son **dos armónicos y no uno**, y ésa es la
razón de que los números sean feos: con una sola sinusoide, mínimo y máximo caen
a media onda de distancia —nueve segundos con periodo 18— y las poses que el
dueño marcó como mejores (16.5 y 34.5 s) y las que marcó como débiles (21.5 y
39.5 s) están a cinco. Con un solo término, frenar en las buenas dejaba las
débiles a un 4 % por encima de la media: nada.

Medido: 0.71 en 16.5 s y 34.5 s, 1.21 en 21.5 s y 39.5 s, 0.95 en las
transiciones de 9 s y 27 s que el dueño quería conservar. Recorrido total dentro
de [0.70, 1.22]. Sigue siendo función **pura** del tiempo absoluto —integrar una
velocidad variable por fotograma habría atado la deformación al refresco de la
pantalla, que es lo que prohíbe §8— y **estrictamente creciente**, comprobado
hasta las seis horas: una figura que rebobina medio segundo se lee como un
fallo, no como ritmo.

**4. Los cruces se interrumpen.** El cristal ya se ocultaba a sí mismo —es
geometría sólida con profundidad— pero lo hacía durante los dos píxeles que mide
el tubo, y dos píxeles no se leen. Se añade una capa que **sólo escribe
profundidad**: una cinta orientada a la cámara, más ancha que la arista, que
hace que la línea de detrás se interrumpa unos píxeles alrededor de la
intersección. Como el corte lo decide la profundidad real, cuando la rotación 4D
invierte la relación la interrupción se invierte con ella.

Tres detalles que no son opcionales. Sus extremos se retraen un 13 %: sin eso el
ensanchado de una arista se comería a sus vecinas justo en los vértices, donde
todas se tocan. Su profundidad se empuja hacia atrás una escala de radio: sin
eso se taparía a sí misma —su superficie está más cerca de la cámara que la del
tubo que envuelve— y la figura entera habría desaparecido. Y es una **cinta de
cuatro vértices por arista y no un tubo**: con el tubo, el presupuesto de
vértices del sistema pasaba de 19 500 a 20 001 y el test de batches se ponía
rojo.

**5. Contaminación de Gargantúa.** Un 3.5 % de temperatura cálida sobre la clave
en las aristas que la miran. No las vuelve ámbar —eso rompería la familia fría
que separa al Tesseracto de Miller, Edmunds y la Endurance— pero hace que el
cuerpo pertenezca al mismo espacio físico aunque su material sea imposible.
Sólo se nota comparando dos caras.

**6. Y no engorda nada.** Las aristas conservan su calibre. La presencia extra
sale del contraste dentro de la sección, de la oclusión y del ritmo. Engordarlas
nos devolvería a la jaula, que es el fallo que las cuatro versiones anteriores
llevan evitando.

Presupuesto: cuatro draws y cuatro materiales —oclusión, cristal, trazo y
membranas—, los mismos que gastaba el corredor. Ni una textura ni un sitio de
ruido nuevos. Posición, fase, inclinación, tamaño, cámara, HUD y datos orbitales
intactos; radio publicado sin mover, 4.574 rs.

**Lo que NO se hizo, a propósito.** La persistencia 4D del punto 7 de la lista
—que ciertas aristas w dejen ~300 ms una copia al 5-8 % mientras cambian de
proyección— queda sin implementar. El dueño la planteó como prueba A/B con un
criterio de rechazo explícito («si parece After Effects, se elimina»), y ese
criterio sólo se puede aplicar mirándola en movimiento, no leyendo un diff.
Entra cuando haya con qué compararla.

### V5 — cristal que se ve y espacio que se pliega (2026-10-07)

Sobre la base canónica de V3/V4, sin tocar la matemática del 4-cubo, el ritmo,
la escala ni la posición. Lo que la crítica externa señalaba era cierto a
tamaño de hero: al lado de cuerpos con volumen, el Tesseracto se leía como un
wireframe simple. Tres cosas, en `tesseract-model.ts` y un pase nuevo:

1. **Membranas que se ven.** Del 1,3 % de alfa (ruido de cuantización) al
   7,5 % de cuerpo y 16 % en el canto, con **iridiscencia** lenta —cian a
   violeta en función del ángulo de vista y del tiempo, como una lámina
   delgada—. Siguen a contraluz y siguen siendo seis caras, no veinticuatro.
2. **Bordes luminosos muy finos.** El núcleo blanco sube (0,040 → 0,075 de
   base, 0,036 → 0,060 con la celda) y el cuerpo translúcido un 60 %. Ni un
   píxel más de calibre: la varilla tiene luz dentro, no es más gorda.
3. **Pliegue del espacio** (`components/scene/tesseract-lens.ts`). Un pase
   de pantalla entre el raymarch y los cuerpos desplaza el cielo en un anillo
   de 2,2 radios alrededor del Tesseracto proyectado —campana con el pico a
   medio radio, 1,5 % del alto como máximo, cuatro lóbulos que giran cada
   ~36 s, separación cromática mínima— y añade un campo cian/violeta apenas
   visible con los mismos lóbulos. El Tesseracto se dibuja encima y sale
   nítido sobre un fondo doblado. Mismo gate que el bloom; apagado fuera del
   cuadro.

Verificación: recortes A/B con GPU real a 1440×900 y en el teléfono; un
tinte rojo temporal del anillo confirmó el centrado y el alcance del pase
antes de dejarlo en su intensidad final. Registro: «Home — guía de entrada,
HUD legible, Endurance definida, horizonte y pliegue del Tesseracto».

## Verificación

- Suite existente: rutas, estado de foco/hover, accesibilidad, geometría,
  cuatro batches, centro atravesable y límites de movimiento.
- `e2e/atlas.spec.ts`: 320×568, 375×812, 768×1024, 812×375, 1440×860 y
  1920×1080; cuerpos dentro de pantalla, enlaces de 44 px, centro de cada proxy
  alcanzable y ausencia de overflow; información del raíl en reposo y con foco.
- `tools/shot.mjs` admite `--flat --width=375 --height=812` además del banco
  bloom-off existente. Capturas de revisión en `output/playwright/hero-redesign/`.

La validación técnica no equivale a aprobación visual del dueño.
