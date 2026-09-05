# Lenguaje visual común de los mundos — F1.0

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
| Endurance | 0.60 | mucha cara por unidad de silueta; con menos se abren agujeros negros entre módulos |
| Ranger | 0.44 | chapa, no manta |
| Tesseracto y estructura | 0.40 | metal oscuro |

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

## 8. Herramientas
| script | para qué |
|---|---|
| `tools/shot.mjs` | captura del hero, con `--sin-glow` y `--sin-rotulos` |
| `tools/composition.mjs` | dónde cae cada destino en pantalla, en píxeles |
| `tools/crop.mjs` | recorta y amplía una zona de una captura |

Las tres leen la escena real. Ninguna reimplementa su matemática: una copia de
la proyección se desincronizaría el día que alguien tocara la pose, y entonces
mentiría en silencio.
