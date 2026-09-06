# Lenguaje visual común de los mundos — F1.0

> **Revisión del dueño · 2026-09-06:** [Raíl, atlas y Tesseracto](atlas-tesseract-reference.md) sustituye la geometría anterior del Tesseracto y el acabado del atlas 2D. Conserva luz común, cuatro batches del Tesseracto y pruebas de centro abierto, movimiento y envolvente.

> **Decisión vigente del dueño · 2026-09-06:** el significado de cada destino lo fija [Arquitectura narrativa](arquitectura-narrativa.md) — Gargantúa = Sobre mí, Miller = Formación, Endurance = Proyectos, Edmunds = Creatividad, Tesseracto = Experimentos, Ranger = Contacto — y sustituye cualquier asociación anterior entre cuerpo y sección. Siguen siendo seis cuerpos y la escena no cambia: ni posición, ni escala, ni cámara, ni material. **Revoca del banner de abajo únicamente el veto sobre `/es/formacion`**, que ahora es Miller; lo retirado el 2026-09-04 fue un CUERPO (Cooper Station) y sigue retirado, mientras que lo que vuelve es un SIGNIFICADO sobre un cuerpo que ya existía. `/es/desarrollo` y `/es/laboratorio` pasan a responder 404.
>
> **Decisión vigente del dueño · 2026-09-04:** el sistema tiene exactamente seis destinos: Tesseracto, Miller, Endurance, Edmunds, Gargantúa y Ranger. Cooper Station y `/es/formacion` están retirados, sin sustituto ni reasignación editorial. El [contrato de seis destinos](sistema-seis-destinos.md) sustituye cualquier número, pose, destino o bloqueo de posición anterior que lo contradiga. Los registros fechados de fases anteriores son evidencia histórica, no instrucciones para reintroducir objetos. La nueva composición queda pendiente de aprobación visual del dueño.


**Estado:** contrato congelado el 2026-09-03, al abrir la fase *World Visual
Pass*. Manda sobre `docs/design/hero-gargantua-direction.md` en **material,
iluminación y criterio de aceptación de los cinco cuerpos secundarios**. No toca
composición, cámara, HUD ni interacción, que siguen perteneciendo a ese
documento; ni el disco de Gargantúa, que queda **congelado durante toda la
fase**.

## 1. Qué problema resuelve este documento

Gargantúa es un fenómeno: complejo, orgánico y memorable. Los cinco cuerpos secundarios son
buenos objetos 3D colocados a su alrededor, y esa diferencia se nota. La fase
los lleva a *cinco destinos con identidad propia, reconocibles y claramente del
mismo universo visual* — sin acercarlos a la complejidad del agujero negro,
que destruiría la jerarquía.

El riesgo real de una pasada mundo a mundo es acabar con **cinco materiales
diseñados por separado**. Lo que sigue es lo que no se rediseña: el entorno
físico y artístico al que los cinco responden.

## 2. Jerarquía visual objetivo

| Elemento | Jerarquía |
|---|---:|
| Gargantúa | 10 / 10 |
| Endurance | 8.5 / 10 |
| Tesseracto | 8 – 8.5 / 10 |
| Miller | 7 – 7.5 / 10 |
| Edmunds | 7 – 7.5 / 10 |
| Ranger | 6.5 – 7 / 10 |

Endurance y Tesseracto son los dos secundarios más memorables por motivos
opuestos: **Endurance por silueta, ingeniería y presencia; Tesseracto por
rareza espacial, abstracción y misterio.** Ninguno compite con Gargantúa, y
ninguno lo hace por brillo.

## 3. La luz es una sola, y es Gargantúa

No existe ni un `THREE.Light` en la escena. La única fuente del sistema es el
disco de acreción, en el origen, y todo cuerpo se ilumina desde ahí. Los
valores viven en `BODY_FRAGMENT`, dentro de `components/scene/bodies.ts`, y son
comunes a los seis:

| Término | Valor | Papel |
|---|---|---|
| Clave | `vec3(1.0, 0.78, 0.52) × uLightIntensity` | ámbar del disco; la cara encarada |
| Relleno | `vec3(0.044, 0.058, 0.115)` | el cielo, no una segunda lámpara |
| Contraluz frío | `vec3(0.062, 0.086, 0.152)` | cierra la silueta contra el negro |
| Filo cálido | `key × fresnel × 0.18` | separa del fondo sin dibujar contorno |
| Terminador | `smoothstep(-0.08, 0.34, n·l + relieve)` | la media luna encendida |

`uLightIntensity` cae con el radio orbital —de 1.66 a 1.08— así que la
iluminación pertenece al **sitio**, no al cuerpo: intercambiar dos destinos de
sector intercambia también su luz. Es lo que hace que el sistema se lea como un
sistema y no como seis objetos renderizados por separado.

Del lado encarado a Gargantúa se admite crema, oro, ámbar y cobre muy sutil. No
convierte los mundos en objetos naranjas: es una influencia externa sobre
materiales distintos. El lado contrario cae a negro profundo o gris muy oscuro,
con el relleno frío justo para conservar volumen. Cuánto conserva cada familia
lo fija el suelo nocturno:

| Familia | Suelo nocturno | Por qué |
|---|---|---:|
| Mundos con aire | 0.50 | tienen atmósfera que rebota |
| Ranger | 0.44 | chapa, no manta |
| Tesseracto y estructura | 0.40 | metal oscuro |
| Endurance | 0.30 | *(0.42 hasta el pase de fase 1)* luz sin dirección repartida por todo el casco; lo que se le quita vuelve como filo y lámina, que sí dependen de dónde está Gargantúa |
| Edmunds | 0.22 | *(0.28 hasta el pase de fase 1)* roca seca sin océano ni nubes: tiene menos que rebotar que cualquier otro mundo con aire |

El filo cálido tampoco es igual para todos, y por el mismo motivo por el que el
suelo no lo es: **cuánto trabajo tiene que hacer depende de la geometría de luz
del sitio**. El ángulo entre Gargantúa y la cámara en cada destino está medido y
manda sobre esta tabla:

| Cuerpo | Ángulo luz-cámara | Filo cálido | Por qué |
|---|---:|---:|---|
| Tesseracto | 28.9° | 0.045 – 0.115 | luz casi de frente: el filo lo pone el material |
| Miller | 47.0° | 0.18 | difuso de sobra |
| Edmunds | 80.9° | 0.061 | lateral pura: media luna y filo corto |
| Endurance | 117.4° | 0.50 | contraluz de tres cuartos: **el filo ES su iluminación** |
| Ranger | 153.3° | envoltura propia | contraluz casi puro; ver su bloque dedicado |

Un cuerpo a 117° o a 153° no tiene difuso que ajustar. Subirle la exposición no
lo ilumina: lo lava. Lo que lo dibuja es el canto.

> **Principio:** la misma luz toca materiales diferentes.

## 4. Material

La base se construye con **material oscuro + highlight controlado +
microvariación + rim light**. Gargantúa obtiene su complejidad de la materia
del disco; los demás la obtienen de **roughness, geometría, iluminación y
detalle localizado**.

Queda prohibido:

- plástico CGI y metal cromado perfecto;
- superficies completamente uniformes;
- colores excesivamente saturados;
- glow usado para tapar geometría floja;
- emisivos que sustituyan a la iluminación real;
- detalle superficial que desaparezca al tamaño real del hero.

Lo último no es una cuestión de gusto: a tamaño de Hero un cuerpo mide entre 45
y 130 px, y el detalle por debajo del píxel no aporta complejidad percibida
sino aliasing. La regla práctica que ya aplica el shader es *pocas frecuencias
fuertes* — primero masa, después estructura y el grano al final.

Ningún cuerpo compite con Gargantúa añadiendo más ruido, más glow o más
cantidad de detalle.

## 5. Bloom-off test

Todo cuerpo debe conservar **silueta, volumen, jerarquía, material y
legibilidad** con el bloom y los emisivos apagados. Si pierde su identidad al
desaparecer el glow, su diseño todavía no está terminado.

El instrumento es `lib/visual-bench.ts`, y se dispara desde la herramienta de
captura:

```bash
node tools/shot.mjs mundo-sin-glow --sin-glow --sin-rotulos
```

`--sin-glow` pone a cero la fuerza del bloom y el multiplicador `uEmission` de
todos los cuerpos. `--sin-rotulos` oculta el raíl y los nombres, que es la
única forma de comprobar si un cuerpo se reconoce sin que se lo digan.

El banco **no se activa solo**: hay que escribir la clave `jonas-orbit:banco-
visual` a mano en el almacenamiento local. No inspecciona user agent, tamaño de
ventana ni ninguna señal del auditor, así que no cruza la regla nº5 del repo
(prohibido el código cuya única función sea alterar una auditoría) por el mismo
motivo por el que no la cruza `?no3d=1`.

## 6. Criterio de salida, por cuerpo

Un cuerpo sale de la fase cuando pasa las cuatro pruebas:

1. **Label-off.** Sin su nombre, se entiende qué clase de cosa es.
2. **Bloom-off.** Conserva silueta, profundidad e identidad.
3. **Thumbnail.** En una captura reducida del hero sigue siendo una estructura
   distinguible y no ruido de estrellas.
4. **Jerarquía.** Cae en su casilla de la tabla del §2 y nunca es el elemento
   más luminoso del cuadro.

## 7. F1.1 — Tesseracto

### Composición vigente

El bloqueo de posición anterior queda sustituido por `sistema-seis-destinos.md`. Se conserva el diseño del Tesseracto y se permite el ajuste compositivo de su posición.

### TESSERACT VISUAL FREEZE (2026-09-03)

**Qué era:** un cubo de wireframe brillante. Tres cáscaras concéntricas de vigas
de 4 px con un canal emisivo recorriendo cada arista, y —la causa de fondo— un
atajo en el fragment que le devolvía sólo emisión: el único cuerpo del sistema
que no obedecía a Gargantúa.

**Qué es:** dos placas cuadradas de 12 px giradas ±13.5° una contra otra, unidas
por cuatro montantes alabeados. Se mira a través de él. Once elementos
estructurales, cuatro draws, 2.4 k vértices.

Las decisiones que lo sostienen:

- **Torsión.** Los montantes son alabeados, así que no existe cara plana que los
  contenga: el ojo intenta cerrar la figura como un prisma y no puede.
- **Interior que está dentro y fuera.** El marco interior saca dos esquinas por
  los agujeros y hunde las otras dos detrás de la pared del túnel.
- **Una lanza que entra y no sale.** Asoma por la placa superior, cruza rozando
  el borde del agujero y se detiene en el aire. No se puede cerrar como volumen.
- **Vacío real.** El agujero mide el 40 % del ancho del cuerpo y deja pasar el
  campo de estrellas.
- **Material.** Grafito casi negro, filo que se enciende **por orientación** y no
  por albedo —sólo brilla el canto cuya cara mira al disco—, oclusión de cavidad
  analítica y una única costura fría en las láminas.

**Criterio de salida, verificado:**

| prueba | resultado |
|---|---|
| Label-off | no se lee como planeta, nave ni estación |
| Bloom-off | conserva silueta, profundidad e identidad (`--sin-glow`) |
| Thumbnail | distinguible a 400 px de ancho de hero |
| Motion | 7.5 % de los píxeles del cuerpo cambian en 7 s; silueta estable al 83 % |
| Jerarquía | 46 px de radio, el cuerpo más pequeño del cuadro; nunca el más luminoso |
| Composición | 336 / 273 px de separación en la banda superior, sin tangencias |

A partir de aquí sólo se admiten correcciones objetivas, bugs y los ajustes que
salgan de la futura pasada de cohesión global.

### Pase de imposible (2026-09-04)

Revisión de dirección sobre la captura f7: 6.5–7/10, sin freeze. Diagnóstico:
lavado beige integral (el barrido encendía las cuatro barras de cada placa a la
vez porque sus normales coincidían —los pliegues iban a cero— y el suelo de
gloss 0.34 participaba siempre), diamante exterior perfecto, interior taponado
y contradicciones ilegibles a 46 px. Cuatro cambios quirúrgicos, verificados en
`t2`/`t3`:

- **Material.** Barrido a potencia 24 con suelo 0.06 y fuerza 0.38: de cada
  placa se enciende UNA barra. Filo de 2.9 a 1.7, cobre del albedo de 0.3 a
  0.22, cara aún más oscura, oclusión de cavidad de 0.74 a 0.82 y rim común
  reducido a un tercio en este cuerpo. Grafito real con crema sólo por
  orientación.
- **Asimetría.** Placas desencuadradas tres centésimas en direcciones opuestas,
  cuatro anchos distintos por placa (±10-16 %), alabeo de ±7-9° por barra y
  2.5° de inclinación del plano lejano. Silueta exterior intacta, diamante roto.
- **Vacío.** Fragmentos y láminas pegados a las paredes; el cilindro central de
  r < 0.3 queda libre y deja pasar estrellas. Velo reducido y fuera del eje.
- **Contradicciones legibles.** Hueco del montante al 62 % (≈8 px en hero) y un
  sexto nodo huérfano en el corte: destello facetado flotando donde la barra
  debería continuar.
- **Movimiento.** Sin cambios de amplitud salvo cabeceo 0.3→0.22 y desliz de
  láminas 0.17→0.12, para que las piezas nuevas no asomen por la silueta; los
  canales que mide el test no se tocan. Entre capturas separadas 7 s el interior
  se reconfigura y la cáscara no se mueve un grado.

`MODEL_SCALE` 1.50→1.49: el desencuadre y las barras anchas subían el radio un
0.2 % y el cuerpo dejaba de ser el más pequeño del cuadro. La centésima lo
devuelve a su sitio sin mover el tamaño aparente. Jerarquía, tests (177/177) y
presupuestos intactos: 4 draws del cuerpo, ≤12 sitios de `fbm`.

Criterio actualizado: Motion queda en reconfiguración visible a 7 s con
silueta estable; el resto de la tabla no cambia. Se re-congela en los mismos
términos.

### Efecto colateral corregido

`modelRadius` decía «radio real» y devolvía una cota —centro de la esfera
envolvente más su radio—, exacta sólo para geometría compacta. La estructura de
placas la separaba un 20 %, y ese número dimensiona el blanco de clic, los
corchetes y la distancia de encuadre. Ahora recorre vértices. Sólo cambia dos
cuerpos: Tesseracto (−16 %) y Ranger (−10 %), los dos únicos con geometría de
caja fusionada.

### Rediseño imposible (2026-09-04)

Por orden expresa del dueño, el `TESSERACT VISUAL FREEZE` y el pase de
imposible quedan sustituidos por un rediseño completo. La queja de fondo: las
dos placas torsionadas se dejaban entender (marco, marco, centro).

**Qué es ahora:** siete marcos rectangulares en caída (0.56 → 0.13) a lo largo
del eje del túnel: cinco quedan abiertos por lados distintos y sólo dos cierran
para conservar la gramática de marco. Cambian relación de aspecto, giro,
inclinación, desplazamiento, longitud y punto de terminación entre capas. La
cáscara deja de ser dos bocas unidas —la causa de la lectura de cubo— y pasa a
ser una boca más cinco pórticos transversales repartidos en los tres ejes.
Cinco extensiones de longitudes y secciones distintas rompen la caja exterior;
un montante se interrumpe y reaparece fuera de eje, una barra continúa detrás
de otra con un resalte lateral, una lanza entra y no sale y un tirante termina
en un nodo huérfano. El cilindro central de r < 0.055 queda libre en toda la
altura: no hay núcleo, reactor ni velo que tapone el vacío.

Grafito y acero ennegrecido en todas partes; el Tesseracto sustituye el fill
azul común por una reflexión neutra-cálida propia. El único calor añadido son
ranuras de tungsteno en los dos marcos más profundos y una costura tenue en las
piezas transversales. Tres draws con un solo material opaco y sin texturas. En
reposo funciona prácticamente quieto: dos derivas interiores de ±3° en sentidos
opuestos, sin giro propio.

**Lo que no se mueve:** posición (fase 285°, trayectoria 30 rs, capa −6),
cámara, Gargantúa ni los demás mundos. El radio aparente usa el margen aprobado
para legibilidad: 46.3 → 55.0 px (+18.8 %) vía `MODEL_SCALE` 1.18, dentro del
techo de +20 %. `tools/composition.mjs` mantiene el centro en (735, 232); las
capturas completa, sin glow y de `/sobre-mi` conservan silueta, vacío y
recursividad. Los presupuestos siguen en tres draws y sin nuevas llamadas a
`fbm`.

### Acabado de profundidad, luz y fallback (2026-09-04)

Continuación autorizada por el dueño para terminar el Tesseracto. Esta
descripción sustituye la de siete marcos del rediseño anterior: la lectura
vigente tiene **cuatro capas principales**, caja exterior y tres marcos
recursivos. Un marco trasero abierto, girado contra el interior, y tres
tirantes añaden profundidad sin aumentar la silueta. El fondo y la caja se
mantienen fijos; sólo los grupos interiores tienen deriva.

El material separa fondo oscuro, caja de grafito y tres escalones de calor.
La reflexión, el filo y el tungsteno aumentan hacia dentro. La respiración
emisiva comparte el multiplicador del banco visual, por lo que desaparece
completamente al apagar los emisivos. Cabeceo menor de 1.5° y variación de
escala interior menor del 4 % refuerzan la profundidad sin giro del conjunto.

El fallback SVG conserva escorzo, marco trasero, arista interrumpida, tres
marcos interiores y nodo huérfano. Sus filos son finos y el centro está
realmente sin relleno: se retiran el disco negro y la mancha luminosa que
tapaban el cielo. El estado de selección conserva el halo cálido; la regla
general del mapa ya no lo sustituye por cian.

**Verificación de cierre:**

| Prueba | Resultado |
|---|---|
| Hero a 1440×860 | Centro (735.2, 231.5), radio 55.4 px; posición y jerarquía conservadas |
| Label-off y bloom-off | Fondo, volumen, marcos y hueco distinguibles sin rótulos, bloom ni emisivos |
| Thumbnail | Estructura reconocible en el hero reducido a 400 px de ancho |
| Motion | Dos capturas separadas por una espera de 7 s muestran cambio interior; test de 120 s mantiene cáscara y radio fijos y acota los diez canales |
| Fallback | Revisado a 1440×860 y 375×812, con movimiento reducido y selección cálida |
| Ruta | `/es/sobre-mi` conserva contenido y escena sin errores de consola |
| Suite | `npm run check`: 29 archivos, 178 tests; lint, tipos, Knip y build correctos |
| Navegador | `npm run test:e2e -- --workers=4`: 58 pruebas correctas en Chromium escritorio y móvil |
| Bundle | Chunk de escena y Three: 193.3 KiB gzip; sigue diferido y no se solicita en `flat` |

Sin dependencias ni texturas nuevas. El Tesseracto sigue usando tres draws y
un material opaco; pasan los presupuestos de geometría y ruido existentes.
Evidencia local en `output/playwright/tesseract-*`, incluyendo hero completo,
detalle, movimiento, bloom-off, thumbnail, fallback y la ruta de Historia.

### Revisión de espalda con referencia del dueño (2026-09-04)

El dueño señala que el costado izquierdo parece incompleto y aporta una
referencia de arquitectura metálica recursiva. Esta revisión sustituye la
descripción del marco trasero independiente del acabado anterior.

La espalda ahora tiene **cuatro lados completos**, comparte orientación y
esquinas con el frente y se conecta mediante **cuatro tirantes**. Dos paneles
laterales muestran espesor y superficie metálica sin ocupar el centro. El
frente conserva su arista desplazada. La respuesta del material trasero sube
lo necesario para que la espalda sea visible con la iluminación común.

Se añade un cuarto marco interior: 0.68 → 0.50 → 0.345 → 0.225. El último
comparte material y movimiento con el grupo profundo, sin un draw adicional.
El shader filtra el bisel según la huella del píxel y usa su cobertura media
cuando la cara deja de resolverse. Esto reduce los destellos discontinuos de
las vigas pequeñas. La referencia se adapta en volumen, recursividad y luz;
su densidad de detalle no se copia a una figura de unos 110 px de diámetro.

El SVG incorpora la misma espalda completa, dos laterales y cuatro marcos
interiores. Se conserva el hueco transparente y el estado de selección cálido.

**Verificación:** hero completo, detalle, bloom-off y thumbnail; escritorio y
móvil con reduced-motion; raycast por el centro del túnel en ambos sentidos
y a cuatro instantes; deriva acotada durante 120 s. `npm run check` pasa con
179 tests y las 58 pruebas E2E de Chromium escritorio/móvil pasan. Se mantienen
tres draws del Tesseracto, un material y los presupuestos de geometría y ruido.
La escala compensa la profundidad adicional para conservar aproximadamente
55 px de radio, con centro (735.2, 231.5). No cambian cámara, posición, Gargantúa
ni otros destinos. Capturas de esta revisión: `output/playwright/tesseract-rear-*`.

### Umbral vivo — revisión del dueño (2026-09-05)

El dueño pide una animación perceptible y un interior menos mecánico, usando
su referencia de arquitectura recursiva como guía. Esta revisión sustituye los
límites anteriores de deriva mínima y el acabado del Tesseracto. La caja,
espalda, posición, escala y orientación de la composición de seis destinos se
conservan; Gargantúa y el contrato de cámara siguen intactos.

Los cuatro marcos interiores tienen giros alternos y una caída en profundidad
menos uniforme. Tres grupos animados cambian su relación con periodos distintos:
los dos marcos medios se contraen de forma desigual en sus ejes; el penúltimo
deriva en sentido opuesto; el último umbral tiene un pivote propio y otro ritmo.
Las oscilaciones de giro son de ±6.9°, ±10.9° y ±13.8°, con escalas acotadas por
debajo del 9 %. La cáscara permanece inmóvil. El movimiento depende del tiempo
de escena existente, sin otro bucle ni acumulación por fotograma.

El exterior conserva grafito con reflejos de Gargantúa. El interior devuelve
más luz del mismo disco incluso con emisión apagada; los biseles profundos
pasan a oro suave. Un pulso cálido recorre los cuatro estratos con retraso,
concentrado en las caras internas. El último marco tiene su propio escalón de
calor. El centro es un hueco real: ninguna esfera, plano o velo lo rellena.

El umbral independiente añade un draw: **cuatro draws del Tesseracto**, un
material opaco compartido, sin texturas ni geometría adicional. El conjunto de
cuerpos, órbitas y quad ocupa **19 de 20 draws y 16 610 de 19 500 vértices**.

Pruebas del modelo: cáscara, destino y radio estables durante 120 s; pose
determinista; oscilación acotada; túnel atravesable en ambos sentidos cada
segundo de esos 120 s. Una prueba proyecta los vértices reales con la pose de
referencia del hero y exige desplazamiento superior a un píxel CSS del
percentil 75 de cada grupo interior en ventanas de 3–7 s desde cuatro fases.
Esta prueba mide movimiento geométrico; las capturas siguen siendo necesarias
para juzgar contraste, oclusión e identidad.

La revisión se entrega para valoración visual del dueño; las pruebas técnicas
no constituyen su aprobación artística. La evidencia de esta pasada usa el
prefijo `output/playwright/tesseract-anomaly-final-`.

## 8. F1.2 — Edmunds

### Mundo mineral — revisión del dueño (2026-09-05)

Esta revisión sustituye **todo el material y el aire** del apartado histórico
`Mundo habitable` de abajo. El dueño lee aquella versión como un planeta
volcánico: las manchas crema parecen emitir, las nubes ocultan el terreno y el
rim blanco tiene demasiado peso. La dirección vigente es **seco, mineral,
polvoriento, ocre y hierro**, remoto y potencialmente habitable. Miller conserva
su contraste de agua fría y reflejo. Gargantúa es la fuente y domina por luz.

**Composición intacta.** No cambia geometría, tamaño, posición, fase,
inclinación, giro propio, cámara, interacción ni otros cuerpos. El peso visual
se corrige por material antes de considerar cualquier reducción de escala.

**Superficie.** Se retiran nubes, velo alto, casquetes y sus reflejos. Dos
campos de FBM organizan cuencas de umber, macizos de ocre rojizo, mesetas de arena
y provincias de hierro oscuro. Las fronteras son más definidas; una fractura
extensa lleva depósitos de sedimento a sus lados. El grano sólo modula ±4 %.
Los escarpes toman su pendiente del mismo campo que define las mesetas, sin
muestrear más ruido; su efecto en la incidencia se acota a ±0.09. Los estratos
se filtran según la huella del píxel para desaparecer antes de producir aliasing.
Las grandes estructuras mandan sobre el detalle al tamaño real del Hero.

**Paleta e iluminación.** El albedo de roca principal baja a
`0.34, 0.185, 0.105`; la arena es `0.43, 0.30, 0.18` y el hierro oscuro
`0.245, 0.105, 0.062`. Se retira la sobresaturación anterior (1.36 → 0.94).
El difuso depende de la incidencia y de la pendiente incluso en pleno día:
máxima respuesta hacia Gargantúa, arriba a la derecha en el Hero. Las pocas
crestas claras exigen altura **y** ladera orientada al disco, y siguen pasando
por la iluminación difusa; no hay emisión. La roca casi no tiene especular.

**Noche y aire.** El relieve analítico conserva irregularidad suave en el
terminador. Rebote cálido mínimo y corto, relleno nocturno a 0.28 y contraluz
azul atenuado permiten que la izquierda desaparezca en azul-negro. El halo
común de Edmunds se retira; el aire queda en un filo de exponente 11, ocre
pálido, cuya intensidad cae al rodear el limbo según su orientación al disco.
No hay contorno blanco uniforme.

**Presupuesto.** Dos sitios de FBM frente a cuatro, sin texturas, materiales,
geometría ni draws adicionales. La ley de luz común conserva su dirección,
temperatura e intensidad: sólo cambia la respuesta del material de Edmunds.

**Aceptación visual.** Hero, detalle y thumbnail deben conservar provincias,
volumen y roca seca sin etiquetas, bloom ni emisivos. Sin regiones que parezcan
lava, algodón o energía. La valoración estética final sigue siendo del dueño.

### Mundo habitable — referencia sustituida (2026-09-05)

Registro histórico: nubes, paleta, saturación y aire descritos a continuación
quedan sustituidos por `Mundo mineral`.

El dueño lee el Edmunds anterior como «esfera con ruido procedural»: silueta
correcta y buen peso compositivo abajo a la izquierda, pero sin identidad. Esta
revisión sustituye su material, su paleta y su tratamiento de atmósfera. **No
cambia posición, tamaño, órbita, cámara ni ningún otro cuerpo**, y no añade
lunas, anillos ni satélites.

**Diagnóstico.** El cobre y el basalto lo dejaban en la misma familia cálida que
Gargantúa; los depósitos minerales de alta frecuencia salían como salpicaduras
repartidas por el disco; no había atmósfera perceptible; y la cara noche se
lavaba a gris azulado sin información.

**Dirección.** Mundo terrestre cálido, sobrio y habitable — orgánico y algo
misterioso, claramente distinto de Miller (frío, azul, oceánico) y fuera del
blanco-metal de la Endurance.

**Superficie, en tres escalas con papeles separados.** Una macroforma decide
tierra y cuenca; una escala media *deformada por la macro* —así sus costas
siguen al continente en vez de cruzarlo— pone regiones y altiplanos; el grano
fino sólo modula (±6 % multiplicativo) y no pinta color. El relieve sigue siendo
analítico: tres ondas direccionales cuyo gradiente es la misma onda en coseno,
con números de onda bajados a ~0.73 de los anteriores para que las cordilleras
se lean como cadenas y no como grano.

**Paleta: óxido de hierro (corrección de dirección del dueño, 2026-09-05).**
Dos entregas anteriores fallaron por el mismo lado. La primera buscó marfil y
caliza y salió una luna gris; la segunda subió el croma pero dejó la familia
beige-salvia mandando en la superficie, y el planeta seguía leyéndose lavado. El
fallo nunca estuvo en la jerarquía de escalas —esa se conserva entera— sino en
**qué familia domina cada masa**. El reparto se invierte:

| Región | vec3 | Papel |
|---|---|---|
| Cuenca profunda | `0.118, 0.052, 0.038` | deep umber; no baja a negro |
| Cuenca media erosionada | `0.232, 0.098, 0.066` | pardo rojizo |
| **A — masa continental** | `0.552, 0.248, 0.142` | terracota; la voz principal |
| **B — franja mineral** | `0.392, 0.136, 0.078` | rust; provincia, no moteado |
| Transición | `0.578, 0.318, 0.132` | cobre entre A y C |
| **C — altiplanos** | `0.642, 0.438, 0.208` | ocre y arena; segunda voz |
| **D — costa** | `0.232, 0.258, 0.162` | olivo apagado; acento |
| Crestas / valles | `0.702, 0.508, 0.268` / `0.082, 0.036, 0.026` | relieve |
| Nubes | `0.862, 0.792, 0.632` | crema, nunca blanco puro |

La **región B es la única pieza nueva**: sale de una banda en el espacio de la
macroforma —`smoothstep(0.5, 0.62, continents) * (1 - smoothstep(0.72, 0.88,
continents))`— y no de otra octava de ruido. Eso es lo que la hace provincia
geológica contigua en vez de salpicaduras, que es el fallo al que el dueño pidió
expresamente no volver. Cuesta dos `smoothstep` y ningún sitio de FBM.

Los vec3 no son los hex de referencia del dueño (#873A25 rust, #B9623D
terracota, #C9974C ocre, #687056 olivo…) porque el shader trabaja antes del tono
y de la clave ámbar, pero **conservan sus proporciones de canal**, que es lo que
decide el tono: la versión gris tenía G/R = 0.72 y B/R = 0.41; la terracota va a
0.45 y 0.26.

Lo que lavaba el planeta eran los altiplanos y el velo: el altiplano baja de
peso 0.9 a 0.46 y sube su umbral de 0.44 a 0.56; el velo alto pasa de 0.13 a
0.07 y entra en la familia del cobre; las nubes bajan de 0.6 a 0.46 con el
umbral en 0.575, conservando cúmulos fuertes y perdiendo el velo continuo. La
lectura tiene que ser SUPERFICIE + NUBES, no crema con huecos.

**Saturación: un solo mando.** El croma sube extrapolando desde la luma
—`mix(vec3(luma), albedo, 1.36)`, con `max` para no producir negativos—
aplicado **sólo al suelo**, antes de nubes y casquetes: el vapor de agua y el
hielo no tienen color propio y saturarlos los volvería de plástico. Extrapolar
desde la luma sube el croma sin tocar el valor, así que la jerarquía de masas no
se mueve. Es el mando que hay que tocar si el dueño pide más o menos color; no
repartir saturación por cada `mix`. Por encima de ~1.4 los pigmentos minerales
se van a rojo de coche y el planeta deja de leerse como tierra.

**Distinción con Gargantúa.** Comparten temperatura, no material: el disco es
emisivo, dorado y luminoso; Edmunds es mate, mineral y oscuro. La separación se
sostiene por luminancia y saturación, no bajándole el rojo a Edmunds. El ocre de
los altiplanos fue el único punto donde se acercaban, y por eso perdió
luminancia (`0.688 → 0.642`) y superficie.

**Aire.** Tres términos, todos derivados de la misma luz del disco. Un filo de
limbo con exponente 7 —una línea, no un halo—, más pesado en el lado iluminado;
un crepúsculo que multiplica el albedo y mete geografía dentro de la penumbra;
y brillo especular acotado a la capa de nubes. El halo común baja de 1.18 a
0.30: era ámbar puro y ancho, de la familia del disco, y lavaba el limbo.

**Terminador.** La banda de penumbra cae a 10.5 en vez de 15 y pesa 0.135 en vez
de 0.09. El contraluz frío común se queda —es ley compartida— y lo que lo saca
de «velo lechoso» es el crepúsculo, que devuelve detalle dentro del mismo azul.

**Presupuesto.** Cuatro sitios de FBM, **uno menos** que la versión anterior: el
grano fino pasa a una octava. Sin geometría, draws, materiales ni texturas
nuevas. El coste del shader se mide en sitios de llamada, no en cuerpos.

**Validación.** `npm run check` en verde (177 tests, build) y `npm run test:e2e`
con 62 pasados. Capturas con el prefijo `output/playwright/edmunds-oxido2-`: hero completo a 1440×860, close-up
comparativo antes/después, bloom-off y recorte de Miller para contrastar. Los
tests del modelo no juzgan material: la aprobación es visual y es del dueño.

**Pendiente de valoración del dueño.** Si tras verlo pide microajuste de
posición —1–2 % hacia dentro o algo más arriba—, se hace y se documenta el valor
exacto; esta revisión no lo ha tocado.

## 9. F1.3 — Miller

### Océano global — revisión del dueño (2026-09-05)

El dueño lee el Miller anterior como «esfera azul luminosa»: silueta buena y
color que lo separa de Edmunds, pero a medio camino entre planeta de hielo y
gigante gaseoso. Esta revisión sustituye su material, su paleta, su modelo de
reflejo y su tratamiento de atmósfera. **No cambia posición, tamaño, órbita,
inclinación, cámara ni ningún otro cuerpo**, y no añade lunas ni anillos.

**Dirección.** Más agua que nubes. Un océano continuo, frío y austero, con una
lámina de luz encima —no un punto— y el aire justo para tener volumen. Un sitio
silencioso, inundado y peligroso; no un planeta azul bonito.

**Diagnóstico, en cuatro puntos.**

1. **Un foco frontal.** Una mancha blanca lechosa, redonda y centrada. No venía
   del especular estrecho sino de una lámina isótropa de exponente 15 encima —
   un lóbulo tan ancho que cubría un tercio del disco con luz plana.
2. **Nubes y espuma repartidas.** Motitas claras por todo el globo. A tamaño de
   Hero eso no es meteorología, es textura de planeta.
3. **Un halo isótropo.** La atmósfera pesaba 1.12 y rodeaba el cuerpo por igual,
   también donde no llega luz.
4. **Ninguna relación visible con Gargantúa.** La luz llegaba, pero nada en el
   cuerpo decía de dónde.

**Superficie: patrones largos, no grano.** Una macroforma decide dónde el agua
tiene fondo; unas vetas de bajío *deformadas por la macro* —el mismo warp que
ordenó la geografía de Edmunds— siguen la cuenca en vez de cruzarla; y una banda
direccional larga las peina, porque un océano visto desde órbita tiene
corrientes. Desaparecen las bandas de tormenta, las rompientes y la espuma: lo
que se quita no se sustituye por más ruido.

**Paleta: azul grisáceo, no cyan de piscina.**

| Región | vec3 | Papel |
|---|---|---|
| Fosa | `0.006, 0.024, 0.078` | azul casi negro; el agua tiene fondo |
| Océano medio | `0.022, 0.094, 0.226` | la voz principal |
| Bajío | `0.072, 0.212, 0.408` | plataforma, no hielo |
| Veta somera | `0.126, 0.298, 0.472` | acento direccional, no continente |
| Nube | `0.418, 0.512, 0.616` | vapor frío; ni blanco ni cálido |

Los tres tramos de profundidad se conservan —son lo que da fondo al agua— pero
pierden croma. El bajío era `0.09, 0.47, 0.55`: un turquesa que a tamaño de Hero
se leía como hielo iluminado. **El canal azul sube mucho a propósito**: la clave
del disco es ámbar (`1.0, 0.78, 0.52`), así que multiplica R por 1.21 y B por
0.63. Una paleta escrita «en azul» sale verde menta en pantalla, y ése fue el
primer intento de esta revisión.

**Reflejo: tres anchos del MISMO lóbulo.** El reflejo sobre agua no es un disco,
es una lámina estirada en la dirección del plano luz-vista y rota por el oleaje.
Se escribe como una gaussiana anisótropa sobre las dos componentes tangenciales
—asiento ancho y tenue, lámina, destello picado por el oleaje— y el núcleo
isótropo compartido baja de 74 / 0.82 a **320 / 0.12**: cuatro píxeles de corazón
caliente dentro del camino de luz, en vez de catorce de mancha.

Dos trampas costaron una captura cada una y quedan documentadas en el shader:

- **El eje transversal sale de la luz y la vista, no de la normal.** Escrito como
  `cross(normal, toLight)`, el reparto entre componentes se divide por el seno
  del ángulo normal-luz, que vale cero en el punto sublunar —a unos veinte grados
  del pico, o sea dentro del cuerpo—. El reflejo salía como un **rombo de aristas
  rectas**. El plano luz-vista no se degrada en ningún punto del cuerpo.
- **El rombo no era teselado.** Se probó subiendo la esfera de 40×26 a 120×78 y
  la figura salió idéntica. El teselado vuelve a 40×26; el presupuesto de
  vértices del §4 sigue intacto.

**Aire.** El halo común baja de 1.12 a 0.30 —el mismo orden que Edmunds— y el
aire que de verdad se ve pasa a ser un filo de exponente 8 en el limbo, sólo del
lado que mira a Gargantúa, con microvariación de la propia bruma para que no sea
un contorno dibujado con compás. Encima, un rebote ámbar del disco en el filo más
encarado: un toque, no un borde naranja.

**Romper la perfección.** Un hemisferio catorce puntos de luminancia más profundo
que el otro, sobre una dirección fija y sin ruido nuevo; y la marejada que
quiebra el terminador sube de 0.0035 a 0.0052 y deja de descontar tanta nube. Lo
justo para que deje de parecer una bola de catálogo.

**Presupuesto.** Tres sitios de FBM y una octava suelta: exactamente los de la
versión anterior. Sin geometría, draws, materiales ni texturas nuevas.

**Jerarquía, medida.** Luma media dentro del disco de Miller: **102.2 → 70.5**;
máxima **234 → 192**, o sea deja de saturar. Con Edmunds en 85.9 y la Endurance
en 29.7 sobre la misma captura, Miller cae en su casilla del §2 y ya no es el
cuerpo más luminoso del cuadro.

**Validación.** `npm run check` en verde (187 tests, build). Capturas con el
prefijo `output/playwright/miller-oceano-`: hero completo a 1440×860, close-up
comparativo antes/después y bloom-off. Los tests del modelo no juzgan material:
la aprobación es visual y es del dueño.


### Corrientes y dirección de luz — segunda revisión del dueño (2026-09-05)

El dueño aprueba la base —«mundo oscuro y acuático que empieza a pertenecer a
Gargantúa», 8/10— y pide un pase pequeño, no un rediseño: bandas largas de
reflejo siguiendo la curvatura, más claridad sobre de dónde viene la luz, un
limbo asimétrico y algo más de microcontraste. Nada de continentes, nubes ni
glow nuevo.

**Dónde estaban de verdad las manchas blandas.** Se buscaron tres veces en la
paleta y en la capa de nubes, y no estaban en ninguna de las dos. Pintar los
campos en canales de color lo resolvió en dos capturas:

- `reliefOffset` en un canal enseñó que **la marejada** —dos trenes de onda
  cruzados de amplitud parecida— produce un patrón de **batido**: elipses de
  interferencia del tamaño de una cuarta parte del cuerpo. A 47 px de radio eso
  no se lee como oleaje sino como manchas sin dirección. Baja de 0.0052 a
  **0.0018**: sigue rompiendo el terminador, deja de pintar.
- La máscara de bajío en otro canal enseñó el segundo foco: salía de mezclar
  tres campos de pesos parecidos —macro, vetas y corriente—, y esa construcción
  sólo puede dar una nube isótropa. La capa de nubes, en cambio, apenas
  aparecía: nunca fue el problema.

Los tres pases anteriores subieron dosis sobre los mandos equivocados y el
contraste local **bajó** cada vez (30.1 → 28.6 → 28.9 → 28.5). El diagnóstico por
canales costó dos builds y lo resolvió.

**Corrientes zonales, y son lo primero que se decide.** Una banda latitudinal
—`vLocal.y * 6.6`, perturbada por la macro y las vetas, dos o tres bandas sobre
la cara visible— pasa a ser la voz que manda en la máscara de bajío. Las masas
claras dejan de ser nubes y pasan a ser franjas largas que siguen la curvatura.
Cuesta cero sitios de FBM.

**Y las bandas inclinan la lámina.** Pintarlas en el albedo no bastaba: sobre un
cuerpo oscuro un ±17 % de color son seis niveles de gris y el ojo los lee como
más nube. Lo que se ve en un océano no es agua de otro color por franjas — es la
lámina inclinada por franjas devolviendo la luz de otra manera. Mismo truco de
gradiente analítico que la marejada, una escala por encima y sin una muestra
extra. Por eso el color de las bandas se queda deliberadamente bajo
(`0.062, 0.19, 0.376` al 55 %) y el peso está en el relieve (0.023).

**Filo asimétrico.** Encendía desde `ndl = −0.06`, o sea casi todo el hemisferio
visible, y sumado al desborde del halo común dibujaba una línea pálida
prácticamente uniforme por el borde inferior: un contorno de recorte. Ahora la
puerta abre en 0.22 y cierra en 0.86, así que el filo **nace** mirando a
Gargantúa y muere dando la vuelta al limbo; y cambia de color con la misma rampa
—cyan pálido en los flancos, blanco cálido en el punto más encarado—. El halo
común baja otra vez, de 0.30 a **0.16**.

**Microcontraste.** Un unsharp barato sobre la escala media: `albedo *= 1 +
(shoal − 0.47) * 0.7`. Realza lo que ya era claro y hunde lo que ya era oscuro
sin inventar estructura ni mover la jerarquía de masas.

**Medido.** Contraste local dentro del disco (desviación de luma): **30.1 → 29.6**
con la media bajando de 68.4 a 63.7 — o sea más contraste *relativo* sobre un
cuerpo más oscuro, y con dirección donde antes había manchas. `npm run check` en
verde (187 tests, build). Capturas con el prefijo
`output/playwright/miller-corrientes-`.

## Endurance — peso, escala e integración (2026-09-05)

Revisión solicitada por el dueño sobre la base existente. Sustituye los valores
anteriores de material y núcleo, y autoriza el ajuste de pose de Endurance:

- Manta estándar de 0.47 a 0.34 y principal de 0.72 a 0.49, en aluminio marfil
  apagado. Especulares más estrechos, menor reflexión ancha y menos ambiente.
- La dirección de luz sigue siendo el origen de Gargantúa. El casco usa Lambert
  facetado para distinguir caras encaradas y oblicuas, conservando la clave cálida
  común. Suelo nocturno 0.42, sombra azul grisácea y cavidades interiores oscuras
  por orientación radial y profundidad entre rieles. Es oclusión analítica, no
  shadow maps; no se añaden luces ni pases de sombras.
- Barril central de diámetro 0.48 a 0.37 y longitud 0.50 a 0.65. Collar, cinturón,
  mástil y propulsión acompañan el eje más esbelto; los brazos llegan al cinturón.
- Los doce módulos mantienen sus cuatro grupos. Los satélites alternan planos
  axiales con 0.21 de separación, pequeñas diferencias fijas de tamaño y giros
  de hasta 4°. Sus soportes conectan los planos; los accesorios siguen a su módulo.
- Se conservan cuatro radiadores: dos crecen de 0.32 a 0.50/0.46 y los otros
  dos mantienen su longitud. Se corrige el metadato antiguo que declaraba ocho.
- Yaw adicional de 0.12 rad (6.9°). No cambia posición, escala del conjunto,
  órbita, cámara, HUD, fallback plano ni los otros cuerpos. Las dos extensiones
  amplían la silueta local y el radio publicado se calcula desde sus vértices.

Se mantienen cuatro draws y el mismo mapa procedural; no hay nuevas texturas,
dependencias ni sitios de FBM. El pase se revisa con hero completo, bloom-off,
thumbnail, interacción y ruta de Proyectos. La aprobación visual corresponde al
dueño; las pruebas técnicas no la sustituyen.


### Trenes largos y filo sin halo — tercera revisión del dueño (2026-09-05)

El dueño aprueba masa oscura, dirección de luz y ausencia de hotspot, y pide tres
cosas: el filo cyan superior sigue demasiado uniforme, la superficie sigue algo
nebulosa, y el reflejo debería ser más lámina y menos mancha.

**El halo común no puede ser direccional, por construcción.** Usa exponente 2.2 y
desborda hasta `ndl = −0.45`, así que cualquier peso que se le deje pinta también
el hemisferio que no mira a Gargantúa. Bajó de 1.12 a 0.30, luego a 0.16, y
termina en **0.09**: casi apagado. Todo el aire visible pasa al filo propio, con
la puerta desplazada a `smoothstep(0.28, 0.9, ndl)` y peso 2.15. El limbo
superior queda gobernado sólo por el contraluz frío común, que es ley compartida
y no se toca.

**La marejada cambia de escala, no de volumen.** Bajarla a un tercio quitó las
manchas de batido pero dejó el océano sin estructura propia. Los números de onda
caen de ~21 a ~5.2 — de doce crestas sobre el diámetro a menos de dos — y el
segundo tren pasa a pesar un quinto del primero. Quedan dos o tres trenes largos
y oblicuos que cruzan las corrientes latitudinales, y el batido entre ellos tiene
ahora una escala **mayor que el cuerpo**, así que no puede dibujar elipses dentro
de él. La amplitud vuelve a subir a 0.013 sobre gradientes cuatro veces menores,
y la cresta manda también sobre el brillo (`gloss *= 0.68 + swellCrest * 0.58`):
una cresta larga devuelve luz distinta que un seno, y eso es lo que hace
inequívoco que es agua.

**La lámina se alarga.** El lóbulo pasa de `11 / 210` a `7.5 / 265` y el destello
de `48 / 420` a `26 / 520`: más largo, más estrecho, menos puntual. El núcleo
isótropo baja otra vez, de 0.12 a **0.085**.

**Medido.** Contraste relativo dentro del disco (desviación / media de luma):
**0.440 → 0.465 → 0.514**, un 17 % por encima del primer pase, con la media
cayendo de 68.4 a 56.8 — más estructura sobre un océano más oscuro, que es la
dirección pedida. Posición y tamaño en pantalla sin cambio (centro 435.0/224.5 →
436.5/225.5; la diferencia es el limbo pálido que se ha retirado). `npm run
check` en verde (188 tests, build). Capturas con el prefijo
`output/playwright/miller-trenes-`.

## 9 bis. Fase 1 — Presencia, lectura y cine (2026-09-05)

Revisión del dueño sobre Endurance, Edmunds y la Ranger. **No es una fase de
composición**: no se mueve un cuerpo de sitio, no cambia la cámara, no cambia el
HUD y no cambia el fallback plano. Lo que cambia es iluminación, material,
silueta, acento y lectura a distancia.

El principio que la ordena, en palabras del encargo: **no hacerlos más oscuros,
hacerlos más intencionales.** Menos gris lavado, menos blanco plano, menos
material muerto; más luz dirigida, más contraste local, más jerarquía entre luz
y sombra. Bajar la exposición no es cine; repartir el valor sí.

Sustituye, para estos tres cuerpos, los apartados de material y luz de las
revisiones anteriores del 2026-09-05. Miller y el Tesseracto no se tocan.

### El diagnóstico que faltaba: la geometría de luz de cada sitio

Los tres problemas reportados tenían el mismo origen y ninguno era el material.
El ángulo entre Gargantúa y la cámara, medido en la posición real de cada
cuerpo, decide qué término de iluminación puede hacer algo por él:

| Cuerpo | Ángulo | Qué significa |
|---|---:|---|
| Edmunds | 80.9° | luz lateral: media luna clásica |
| Endurance | 117.4° | tres cuartos a contraluz |
| Ranger | 153.3° | contraluz casi puro |

La Endurance a 117° no tenía apenas difuso que ajustar, y aun así todo su
tratamiento vivía en el difuso y en un suelo nocturno alto: luz sin dirección
repartida por igual. Eso es exactamente lo que produce «modelo 3D iluminado» en
vez de «nave delante de un agujero negro». La Ranger, a 153°, ya tenía su bloque
de contraluz propio, y por eso su arreglo fue mucho más corto.

### Pase 1 · Endurance

- **Valor por familia de material, no un gris con motas.** Manta principal de
  0.49 a 0.66 (aluminio marfil con recorrido, no blanco plano), manta estándar
  con más recorrido interno, grafito de 0.58 a 0.30 —dejó de competir con la
  manta principal— y radiador con el valle más hundido y el estriado con un
  tercio más de contraste. Cuatro familias, cuatro valores separados.
- **Lámina ancha de fuente extensa.** Era el único casco metálico del sistema
  sin ella: tenía el filete de exponente 22 y nada más, así que dos módulos
  vecinos con la misma manta devolvían lo mismo mirasen donde mirasen. El disco
  es enorme y un panel encarado le devuelve una lámina suave: es lo que separa
  los módulos entre sí y lo que produce «metal vivo».
- **Filo de Gargantúa, de 0.18 a 0.50**, más un bloque de envoltura propio
  —ancha y ámbar corta— como el que ya tenía la Ranger. A 117° el filo no es un
  adorno que separa del fondo: es la iluminación principal.
- **Cavidades de verdad.** Banda de receso más ancha, oclusión de 0.78 a 0.88 y
  suelo de cavidad de 0.38 a 0.24. Suelo nocturno de 0.42 a 0.30, con el relleno
  frío direccional subiendo de 0.16 a 0.30 para que la espalda tenga materia y
  no sea un recorte.
- **Propulsión visible.** Cuatro grupos de maniobra de dos toberas sobre el
  barril, y dos de ellas encendidas. El sitio no es una preferencia: la proa da
  0.672 con la cámara y −0.918 con Gargantúa, así que las cuatro campanas
  principales quedan detrás Y a plena luz —invisibles las dos cosas— mientras
  que la mitad de proa del barril mira a cámara Y está en sombra. Una brasa
  sobre chapa oscura es la lectura más limpia que puede tener un acento de
  propulsión. Cero draws nuevos: comparten material con las balizas y se
  distinguen por máscara de vértice.
- **Pose: 0.30/0.32/−0.08 → 0.38/0.29/−0.12.** 2.6° más comprimida contra la
  cámara y 1.7° más rasante contra la luz. Se probó el doble de giro y se
  descartó en la captura: a esa compresión el aro deja de leerse como aro, y la
  silueta circular es media identidad de esta nave. El blanco de clic sigue a la
  pose (`hitScaleY` 0.64 → 0.62).

**Medido** tras esta primera ronda sobre la ventana de 260×270 px que ocupa en
el hero: contraste (desviación / media) 1.834 → 2.050, percentil 95 de luma 86 →
104, relación cálido/frío 1.158 → 1.201. La segunda ronda lo lleva más lejos;
los números finales están en su tabla.

### Pase 2 · Edmunds

El encargo aquí era doble y conviene no confundirlo: **recuperar lectura
mineral, no recuperar brillo de fuego.** La revisión mineral anterior corrigió
un planeta que parecía incandescente y se pasó al otro lado; la mitad diurna se
resolvía casi entera por debajo de 60 de luma y las cuatro provincias se leían
como una sola mancha.

- **Las cuatro provincias suben un 16 %, todas a la vez y sin tocar el tono.**
  La relación entre umber, macizo, arena y hierro es exactamente la misma; lo
  que cambia es el tramo de la escala donde ocurre. No vuelve el naranja.
- **Más geología.** Relieve analítico un 29 % más marcado, escarpes de 0.022 a
  0.028, estratos de 0.18 a 0.24, arena de cresta de 0.38 a 0.44 y un punto
  menos de desaturación (0.94 → 0.975).
- **La sombra se conserva profunda y deja de ser azul.** El lavado que cubría
  casi medio disco no salía de la clave sino de tres términos de canto: relleno
  nocturno (0.28 → 0.22, con mezcla propia mineral en vez del azul de cielo),
  contraluz frío (0.24 → 0.10) y relleno de canto (0.32 → 0.11).
- **Filo cálido de Gargantúa, de 0.12 a 0.34 del común.** Un mundo cuya única
  luz es un disco de acreción tenía menos relación visible con él que cualquier
  casco del sistema.
- **Atmósfera más fina y más concentrada.** Exponente 11 → 14 y puerta desplazada
  a `smoothstep(0.26, 0.94, ndl)`: gana peso (0.55 → 0.95) sin ganar extensión,
  que es la diferencia entre una línea de aire y un halo.

**Medido** tras esta primera ronda sobre su ventana de 160×160 px: contraste
1.340 → 1.450, relación cálido/frío 1.757 → 2.143, limbo iluminado (95, 63, 44)
→ (106, 69, 45). Más legible y más mineral, con la sombra más profunda que
antes; los números finales están en la tabla de la segunda ronda.

### Pase 3 · Ranger

- **La proa apuntaba mal, y llevaba tiempo.** El documento dice desde el
  principio que apunta a la Endurance y que ese gesto cuenta un viaje sin que
  nada se mueva, pero eso nunca se comprobó contra la pantalla. Medido: la
  dirección Ranger → Endurance proyectada sobre el cuadro es (0.978, **+0.207**)
  y la proa daba (0.986, **−0.168**). Veinte grados de error, y del signo que
  peor se lee: una nave con el morro caído no va a ningún sitio.
- **La pose nueva se eligió por barrido con las puertas medidas**, y hubo que
  añadir una cuarta magnitud a mitad de camino: **hacia dónde miran las
  toberas**. Las dos primeras candidatas dejaban el eje de escape en −0.08 —las
  campanas al otro lado, con sus brasas invisibles— y ése era justo el acento
  que pedía el encargo. La elegida da dorso·luz 0.197, dorso·cámara 0.232,
  proa (0.718, **+0.197**) y escape·cámara **0.569**, mejor que el 0.508 de
  partida: el morro sube 25°, el área vista se queda donde estaba y los motores
  se ven mejor que antes.
- **Escape y baliza dejan de ser lo mismo.** Máscara 0 en violeta de identidad
  para puntas de ala y morro —señal—; máscara 1 en blanco azulado para las dos
  campanas y dos toberas de maniobra de proa nuevas —escape—, con fase propia.
  Un acento frío-lavanda sobre chapa lavanda era buena parte de por qué la nave
  se leía como miniatura de plástico.
- **Contraste entre piezas, sin apagar nada.** Chapa con más recorrido y
  calentada en el extremo claro (una nave iluminada por un disco ámbar no
  devuelve blanco neutro), junta más hundida (0.62 → 0.74), plano sustentador un
  escalón entero por debajo del fuselaje —antes casi compartían valor y el
  larguero oscuro tenía que separarlos él solo— y tapas de servicio un punto más
  vivas.
- **Filo ámbar de 0.30 a 0.44 y envoltura de 0.62 a 0.70.** Lo que hacía gris a
  esta nave no era su chapa: forzada a blanco puro se veía igual de apagada.

**Medido** tras esta primera ronda sobre su ventana de 200×110 px: percentil 95
de luma 99 → 121, contraste 1.283 → 1.291, media prácticamente clavada (34.2 →
33.8). Más clara donde importa y con el mismo peso en el cuadro; los números
finales están en la tabla de la segunda ronda.

### Segunda ronda: propulsión de verdad, estela y jerarquía (2026-09-05)

Revisión del dueño sobre la primera ronda. El veredicto, resumido: *«correcta
técnicamente, insuficiente dramáticamente. No está fea. Solo no está contando
nada.»* Y tres encargos concretos: los propulsores no se notan lo suficiente,
falta estela, y Edmunds se está perdiendo en la oscuridad.

#### La estela, y por qué cuesta cero draws

Una pluma necesita transparencia con caída — y el presupuesto de batches está
cerrado en veinte, con diecinueve gastados. Un material más por nave lo habría
roto, así que la pluma entra en el material EMISIVO que ya existe, junto a las
balizas, con tres piezas de maquinaria nuevas:

1. **La rampa viaja dentro de la máscara.** `aSurfaceMask` ya es un float
   interpolado por vértice; `surfaceRamp` escribe 8.0 en la garganta y 9.0 en la
   punta, y el fragment recupera el parámetro restando. Ni un atributo más, ni
   un canal de vértice más, ni tocar la fusión de geometrías.
2. **El emisivo pasa a mezcla aditiva** sin escritura de profundidad. Es lo que
   hace que la pluma se deshaga en el negro en vez de tener borde. Las balizas
   pagan la mitad de brillo para no cambiar de aspecto: con dos caras activas
   una esfera diminuta se dibuja dos veces y suma, y sin esa corrección se
   convertían en halos cian del tamaño del barril.
3. **`modelRadius` poda la pluma.** Una nave no ocupa más espacio por encender
   un motor: contarla hinchaba el radio publicado un 15 % en la Ranger, y con él
   el blanco de clic, los corchetes de adquisición y la distancia de encuadre.
   El umbral de la máscara vale 8 y no 2 justamente por esto — el atributo es
   compartido entre materiales, y con base 2 la poda se comía el grafito y los
   radiadores de la Endurance, que usan las máscaras 2 y 3.

**La pluma es corta a propósito**, y los números salen de una captura. La
primera versión —ganancia 1.15, caída con exponente 1.7— salía un foco de coche
más largo que la nave. La única fuente de luz de este sistema es Gargantúa y esa
regla no la rompe un propulsor: ganancia **0.36**, caída con exponente **2.4**
(la mitad del brillo se ha ido en el primer 25 % de la longitud), alfa 0.62 y un
factor de incidencia que borra la silueta del cono. Blanco casi puro en la
garganta, azul en la punta: un escape que conserva su color hasta el final se
lee como plástico.

#### Endurance: la maniobra se va al borde del aro

La primera ronda puso ocho toberas diminutas sobre el barril y el dueño tenía
razón en que no se notaban. La pregunta estaba bien planteada —dónde caben unos
propulsores que se vean, con las campanas principales invisibles por pose— pero
la respuesta era mala por dos motivos: son pequeñas, y están en la zona más
ocupada del modelo. Y una pluma que sale del barril apunta hacia la cámara,
donde el escorzo la convierte en una mancha redonda.

El borde del aro resuelve las tres cosas a la vez: se ve contra negro y fuera de
la silueta, la pluma se despliega a lo ancho en vez de venir de frente, y es lo
que haría una nave así — el par de actitud de un anillo se da en el radio
máximo. **Cuatro toberas entre grupos, en los 46° de riel desnudo, y sólo dos
encendidas y opuestas**: eso es un par puro, o sea una nave corrigiendo su giro.
Disparan a 24° del radio, no tangencialmente: la primera versión corría la pluma
pegada al aro y el escape se leía dentro de la nave.

El resto del hero pass es jerarquía de valor llevada más lejos: manta principal
a 0.735, manta estándar a 0.345, grafito a 0.232, oclusión de cavidad a 0.93 con
suelo 0.19, suelo nocturno a 0.26, filo cálido a 0.62 y envoltura a 0.38 / 0.42.
Caras heroicas y caras sacrificadas, que era el encargo. La pose gana otro grado
y medio (0.42/0.28/−0.14: 4.0° más comprimida contra la cámara, 2.4° más rasante
contra la luz) y el blanco de clic la sigue, `hitScaleY` 0.64 → 0.60.

#### Ranger: relleno con dirección

Lo que la dejaba plana no era la chapa sino el relleno: un color plano sumado a
toda la superficie por igual. Un relleno sin dirección no puede integrar nada,
porque no sabe dónde está la fuente. Ahora son **dos rellenos y una rampa que
los cruza** — la chapa que aún mira algo hacia Gargantúa recoge un rebote ámbar,
la que le da la espalda se queda con el azul del campo estelar. Misma cantidad
de luz, repartida por orientación. Más una segunda línea de filo, estrecha y
rojiza, pegada al canto.

Sus dos campanas ganan pluma corta —0.30 de largo contra 1.7 de nave, unos 17 px
en el hero— y las gargantas bajan a 0.056 de radio: la versión anterior las
dejaba en dos faros que lavaban el fuselaje entero, y eso trabajaba justo en
contra del contraste de material que pedía la revisión.

#### Edmunds: cuatro macroformas

Subir la reflectancia hizo el hemisferio diurno visible; no lo hizo legible. A
la distancia del hero un planeta se lee por cuántas masas distintas se le
distinguen, y había una provincia grande peleándose con una escala media que la
troceaba. Dos cambios, ninguno añade una llamada de ruido:

- **La provincia baja de 1.62 a 1.28 de frecuencia** — cuatro masas sobre el
  disco en vez de siete.
- **La escala media deja de mandar sobre el color** (de ±20 % a ±12 %): pasa a
  ser textura dentro de cada masa, que es su papel.

Y aparece la cuarta macroforma, la **cuenca pálida**: los valores bajos de la
misma provincia, que antes se iban a umber oscuro sin más. Depósitos de polvo
claro en el fondo de una cuenca son lo que un mundo seco tiene de verdad.
Cuesta un `smoothstep`, no un campo nuevo. El filo cálido sube a 0.52 del común
y la sombra no se toca: el problema estaba en la zona iluminada, no en la
oscura.

#### Medido, antes → después de las dos rondas

| Ventana | Contraste | Percentil 95 | Cálido/frío | % bajo 12 de luma |
|---|---|---|---|---|
| Endurance (260×270) | 1.834 → **2.074** | 86 → **111** | 1.158 → **1.195** | 62.6 → **64.8** |
| Edmunds (160×160) | 1.340 → **1.514** | 80 → **99** | 1.757 → **2.053** | 64.2 → **67.3** |
| Ranger (200×110) | 1.283 → **1.300** | 99 → **137** | 1.060 → **1.111** | 10.7 → **11.8** |
| Ranger, sólo casco | 1.105 → **1.134** | 233 → 224 | 1.006 → **1.091** | — |

La última fila es la que dice que las plumas están controladas. Una versión
intermedia dejaba el casco en 1.020 de contraste y 57.5 de media —el bloom del
escape lavando la nave— y eso es exactamente lo contrario de lo que pedía la
revisión. Con la pluma en su tamaño final el casco conserva su media (53.4 →
53.0) y gana contraste.

### Pruebas del contrato

Los tres pasan el **bloom-off** con `--sin-glow --sin-rotulos`: silueta,
volumen, material y jerarquía se conservan sin emisivos ni halo, y ninguna de
las brasas nuevas tapa geometría. Ninguno sube de casilla en la tabla del §2 —la
Endurance sigue en 8.5 y la Ranger en 6.5-7— porque lo que gana cada uno es
CONTRASTE INTERNO, no luminancia media. `npm run check` en verde (188 tests).

No se añade un solo sitio de FBM, ni una textura, ni un draw call —plumas
incluidas—: el presupuesto sigue en 19 batches de 20 y en 12 sitios de ruido de
12.

## 9 ter. Miller — el océano gigantesco (2026-09-06)

Manda sobre §9 en **material, paleta e iluminación de Miller**. No toca su
posición, su tamaño, su órbita, su inclinación, la cámara ni el HUD — el dueño
fue explícito: *«Yo ya no movería a Miller. Ahora está donde tenía que estar.»*

**El diagnóstico del dueño, literal:** «A cierta distancia sigue leyendo primero
como planeta azul bonito, y después como Miller. La diagonal blanca de agua
ayuda muchísimo, pero todavía podríamos reforzar la sensación de océano
gigantesco mediante material e iluminación, no mediante más efectos.»

Así que no entra ni un efecto nuevo: ni un sitio de FBM más, ni una textura, ni
un draw call. Lo que cambia son cinco cosas que ya estaban.

### 1. Se acaba la meseta del terminador

Era el fallo estructural. La envolvente común de luz satura en n·l = 0.34, así
que más de la mitad del hemisferio diurno salía a brillo PLENO. En un mundo con
relieve eso apenas se nota; en un océano continuo es fatal, porque **el
degradado es el único sitio donde un cuerpo sin accidentes cuenta su curvatura y
su tamaño**. Sin degradado quedaba un disco azul uniforme con un trazo encima.

Miller estrena su propia ley difusa, como ya la tenían la roca de Edmunds y la
chapa de la Endurance: `0.10 + 0.90·(n·l)^0.55`. El exponente no es 1 porque el
agua devuelve luz por dispersión bajo la superficie y su caída es más lenta que
la de un lambert seco. Lo que importa es que ya no hay meseta.

### 2. Fresnel de agua sobre la lámina

Faltaba la mitad del material. El agua es la superficie del sistema con el
comportamiento angular más extremo que existe: **a incidencia normal devuelve un
2 % y a incidencia rasante casi el 100 %**. Sin ese término, el reflejo pesaba
lo mismo en el centro del disco que en el limbo, y salía como una banda blanca
uniforme cruzando una bola — la firma de una nube, no de un mar.

Schlick sobre el ángulo de vista, exponente 5, sin una muestra extra: la lámina
se adelgaza hacia el centro y se abre hacia el borde. Es lo que hace el mar de
verdad visto de lejos, y es lo que hace que **el reflejo cuente la curvatura**.

### 3. El camino de luz es cálido; la sábana, fría

Un reflejo especular devuelve el color de la fuente, y la fuente aquí es ámbar.
La versión anterior enfriaba el camino estrecho un 34 % y la sábana ancha un
46 %: casi lo mismo, y el resultado era una banda blanca de temperatura
indefinida. Ahora el reparto es opuesto —camino al 22 % de frío, sábana al 58 %—
así que sobre agua fría sólo puede ser una cosa, y además dice de dónde viene la
luz sin dibujar ninguna flecha. La lámina se alarga y se estrecha (7.5 → 6.4 a
lo largo, 265 → 290 a lo ancho) para que sea un CAMINO y no una mancha.

### 4. El agua honda baja, y las masas pálidas se retiran

El contraste entre el agua profunda y el reflejo es literalmente la única
relación de valores que tiene este mundo, y las masas pálidas —nube y bajío— se
la estaban comiendo: a tamaño de hero lo primero que veía el ojo eran manchas
claras sobre azul, que es la firma de un planeta nuboso. El tinte de nube baja de
0.26 a 0.09, el bajío de 0.55 a 0.30, la veta somera de 0.42 a 0.22, y el extremo
profundo de la cuenca cae otro tercio. **No es meteorología menos: es jerarquía
más.** El sitio más brillante del cuerpo tiene que ser el reflejo de Gargantúa, y
sólo ése.

### 5. Ni suelo nocturno común ni aro pálido

Miller se había quedado con el suelo de relleno nocturno COMÚN, 0.5, el más alto
del sistema — y el agua es, físicamente, el peor rebotador del cuadro. Baja a
0.32, la misma operación que la fase 1 hizo con la Endurance y con Edmunds. El
relleno de canto baja de 0.32 a 0.13 y el filo cálido común de 0.18 a 0.07: los
dos levantaban el limbo MIRE DONDE MIRE, y entre ambos dibujaban una línea pálida
por toda la circunferencia, cara noche incluida. El agua no tiene borde difuso:
su limbo lo dibuja el reflejo, que sólo existe de un lado.

### Medida

Sobre el disco de Miller en el hero de 1440×860, luminancia:

| | antes | ahora |
| --- | --- | --- |
| media | 63.1 | **51.2** |
| p50 | 59 | **48** |
| p95 | 116 | **108** |
| p99.5 | 143 | **155** |
| máximo | 186 | **198** |

La media baja y el pico sube: es exactamente el reparto que se buscaba. El agua
se hunde y el camino de luz se separa de ella, que es lo que convierte una bola
azul en una superficie enorme reflejando una fuente.

## 9 quater. El foco no puede borrar el material (2026-09-06)

Manda sobre la respuesta de adquisición de los seis cuerpos. Es la aplicación
directa del criterio de §3 —*una misma luz toca materiales diferentes sin borrar
su identidad*— al único sitio donde el sistema lo estaba incumpliendo.

**El diagnóstico del dueño:** «Cuando seleccionas Edmunds, la respuesta cian es
demasiado fuerte. El planeta acaba pareciendo casi otro mundo acuático. Yo no
teñiría el objeto al adquirirlo. Mantendría Edmunds marrón/ocre, y pondría el
estado interactivo en brackets cian + órbita cian + un pequeñísimo aumento de
luz/rim. Nada más.»

Bajarlo una vez para todos no valía, porque el problema es relativo al material:
sobre el océano de Miller el cian ES su color y no se nota; sobre la roca ocre de
Edmunds lo convierte en otro mundo. **El cuerpo que peor lo llevaba era el que
más lejos estaba de la paleta de navegación.**

El foco deja de ser un color y pasa a ser tres cosas cuyo reparto depende del
material:

| | `focusTint` | `focusGain` | `focusEdge` |
| --- | --- | --- | --- |
| Edmunds (roca) | 0.08 | 0.16 | 0.11 |
| Endurance (metal) | 0.16 | 0.15 | 0.30 |
| Agua, baliza, Tesseracto | 1.00 | — | — |

`focusTint` es cuánto cian aguanta el cuerpo sin dejar de ser él. `focusGain`
multiplica el color que ya tenía, así que un planeta ocre se enciende ocre.
`focusEdge` marca un poco más el filo cálido, que ya sabe dónde está Gargantúa —
es la parte que se lee como «apuntado» a tamaño de hero sin tocar la
temperatura.

**Los números salieron de medir, no de mirar.** Media RGB del cuerpo apuntado
sobre el hero, y el umbral es que el canal azul no crezca al doble que el rojo:

| | reposo | tinte 45 % | tinte 34 % | tinte 16 % |
| --- | --- | --- | --- | --- |
| Endurance | 21/20/20 | 27/34/36 | 27/33/34 | **26/31/32** |

El paso de 45 a 34 casi no mueve la aguja porque el tinte entra multiplicado por
el fresnel y el casco es casi todo canto: sobre esa geometría hay que bajar el
número mucho más de lo que parece para bajar el color un poco.

Lo que dice de verdad la adquisición sigue estando **fuera del cuerpo**: los
corchetes, el arco de la órbita, el raíl y el NAV TARGET. El cuerpo sólo la
confirma.

## 10. Herramientas
| script | para qué |
|---|---|
| `tools/shot.mjs` | captura del hero, con `--sin-glow` y `--sin-rotulos` |
| `tools/composition.mjs` | dónde cae cada destino en pantalla, en píxeles |
| `tools/crop.mjs` | recorta y amplía una zona de una captura |
| `tools/star-streaks.mjs` | cuánto se estiran las estrellas, por anillo de distancia |

Las tres leen la escena real. Ninguna reimplementa su matemática: una copia de
la proyección se desincronizaría el día que alguien tocara la pose, y entonces
mentiría en silencio.
