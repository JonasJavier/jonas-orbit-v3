# Lenguaje visual común de los mundos — F1.0

**Estado:** contrato congelado el 2026-09-03, al abrir la fase *World Visual
Pass*. Manda sobre `docs/design/hero-gargantua-direction.md` en **material,
iluminación y criterio de aceptación de los seis destinos**. No toca
composición, cámara, HUD ni interacción, que siguen perteneciendo a ese
documento; ni el disco de Gargantúa, que queda **congelado durante toda la
fase**.

## 1. Qué problema resuelve este documento

Gargantúa es un fenómeno: complejo, orgánico y memorable. Los seis destinos son
buenos objetos 3D colocados a su alrededor, y esa diferencia se nota. La fase
los lleva a *seis destinos con identidad propia, reconocibles y claramente del
mismo universo visual* — sin acercarlos a la complejidad del agujero negro,
que destruiría la jerarquía.

El riesgo real de una pasada mundo a mundo es acabar con **seis shaders
diseñados por separado**. Lo que sigue es lo que no se rediseña: el entorno
físico y artístico al que los seis responden.

## 2. Jerarquía visual objetivo

| Elemento | Jerarquía |
|---|---:|
| Gargantúa | 10 / 10 |
| Endurance | 8.5 / 10 |
| Tesseracto | 8 – 8.5 / 10 |
| Cooper Station | 7.5 – 8 / 10 |
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
| Cerámica de Cooper | 0.50 | casco claro: devuelve más cielo que el grafito, como haría de verdad |

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

### POSITION LOCK — TESSERACTO + COOPER STATION (2026-09-03)

Los dos intercambian sector. Medido con `tools/composition.mjs` a 1440×860:

| destino | antes | después | radio |
|---|---|---|---:|
| Tesseracto | (402, 324) sup-izq | **(735, 232) sup-centro** | 46 px |
| Cooper Station | (652, 239) sup-centro | **(399, 323) sup-izq** | 64 px |

El intercambio no cambia el tamaño aparente de ninguno de los dos: la cámara
queda a 119.2 rs del Tesseracto contra los 119.5 de antes, y a 116.5 de Cooper
contra 116.9. Es composición, no jerarquía.

La fase del Tesseracto es 285° y no los 272° que deja libre Cooper: a 272° caía
en Δx = −16 px del centro de la sombra, o sea alineado al píxel sobre el agujero
negro, que se lee como interfaz y no como composición. A 285° queda en Δx = +66
px. La banda superior se reparte 336 / 273 px entre sus tres cuerpos —desigual, a
propósito— y aparece una contradiagonal con la Ranger.

A partir de aquí los dos cuerpos no se mueven durante el desarrollo visual de la
fase salvo corrección objetiva.

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

## 8. Herramientas
| script | para qué |
|---|---|
| `tools/shot.mjs` | captura del hero, con `--sin-glow` y `--sin-rotulos` |
| `tools/composition.mjs` | dónde cae cada destino en pantalla, en píxeles |
| `tools/crop.mjs` | recorta y amplía una zona de una captura |

Las tres leen la escena real. Ninguna reimplementa su matemática: una copia de
la proyección se desincronizaría el día que alguien tocara la pose, y entonces
mentiría en silencio.

## 9. F1.3 — Cooper Station: de planeta a megaestructura (2026-09-04)

**Decisión.** El planeta anillado con hábitat pequeño se leía como mundo, no
como lugar habitado —y el destino representa Formación—. La silueta la pone a
partir de aquí la arquitectura: gran arco abierto de 220° con el hueco abajo a
la derecha, siete módulos habitables en serie sobre el arco, espina oscura con
cuatro montantes, dos alas solares, mástil con baliza, fragmento de arco en un
plano trasero y 35 microventanas cálidas. Endurance es máquina (manta gris,
grafito); Cooper es lugar (cerámica clara, aluminio, luz cálida diminuta).

**Composición intacta.** Misma trayectoria (33 rs, fase 233°), mismo sector,
mismo tamaño aparente: el radio publicado pasa de 5.40 a 5.33 rs escalados
(−1.1 %) y `composition.mjs` sigue dando (399, 323) r63. El mapa `flat` cuenta
lo mismo en SVG. La cámara, el encuadre y el POSITION LOCK no se tocan.

Las decisiones que la sostienen:

- **Apertura, no rueda.** El arco no cierra: una rueda cerrada sería otra
  Endurance. El vacío central es la pieza más grande del cuerpo.
- **Repetición como escala.** Siete módulos de tamaños distintos alternando
  cara, con cinco ventanas cada uno: unidades pequeñas en serie que el cerebro
  lee como enorme. Nada de miles de edificios.
- **Blanco con motivo.** Cerámica hasta 0.78 —más blanca que la manta principal
  de Endurance (0.72)— compensada por órbita más lejana y plano más al fondo:
  la misma clave le devuelve menos y nunca es el elemento más luminoso.
- **Dos luces, dos trabajos.** Balizas a 2.75 para pinchar el bloom; ventanas
  a 1.15 para conservar el ámbar sin clipear (`uKind == 11`, mismo programa, sin
  un `fbm` más). La rama de anillos (`uKind == 6`) se retira con el planeta.
- **No gira.** La orientación del arco es información, como la proa de la
  Ranger: quedan vaivén subgrado y el ascensor recorriendo la espina, dentro
  del modelo y deterministas.

**Criterio de salida, verificado** (capturas `cooper-f13c*`, 1440×860):

| prueba | resultado |
|---|---|
| Label-off | estructura habitada abierta; no planeta, no nave |
| Bloom-off | misma silueta, volumen y material con `--sin-glow` |
| Thumbnail | arco blanco distinguible a 400 px de ancho de hero |
| Jerarquía | 7.5–8/10 intacta; Endurance sigue dominando por >1.4× |
| Composición | (399, 323) r63, sin tangencias nuevas |

**Presupuestos.** 25 draws (+1 por separar ventanas de balizas), 20.8 k
vértices (Cooper 4.6 k), −1 sitio de `fbm`. Test de arquitectura
(`cooperStationArchitecture`) y glifo `flat` con las mismas piezas.
