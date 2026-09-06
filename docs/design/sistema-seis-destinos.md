# Sistema de seis destinos — decisión del dueño, 2026-09-04

Este contrato sustituye el catálogo de siete mundos y el bloqueo de posición
anterior. La eliminación está aprobada; la composición implementada requiere
revisión visual del dueño. Las capturas y mediciones no constituyen aprobación.

## Catálogo y navegación

| Orden | WorldId | Nombre | Ruta ES |
|---|---|---|---|
| 1 | `tesseract` | Tesseracto | `/es/sobre-mi` |
| 2 | `miller` | Miller | `/es/desarrollo` |
| 3 | `endurance` | Endurance | `/es/proyectos` |
| 4 | `edmunds` | Edmunds | `/es/creatividad` |
| 5 | `gargantua` | Gargantúa | `/es/laboratorio` |
| 6 | `ranger` | Ranger | `/es/contacto` |

Cooper Station se retira del producto: identidad, datos, MDX, modelos WebGL y
SVG, materiales exclusivos, hitboxes, profundidad, navegación y generación de
rutas/OG/sitemap. No hay sustituto ni espacio reservado en arrays. La antigua
`/es/formacion` responde 404; no se inventa una redirección hacia contenido
distinto. No se redistribuye su prosa ni se modifica la Formación del CV.

Hay seis targets HTML, cinco cuerpos secundarios WebGL/SVG y Gargantúa en su
pase/backdrop compartido. La home más los seis destinos suman siete rutas; el
sitemap incluye además cuatro casos y privacidad: doce URLs indexables.

## Composición

Cuarta pasada. La tercera fue aprobada en lo estructural —«la escena encontró
una composición bastante más madura», «ya no me da la sensación de objetos
puestos alrededor de un círculo»— y el dueño pidió cuatro refinamientos, no
cambios: el Tesseracto se había ido algo demasiado a frontal y llegaba modesto
de tamaño, su profundidad interna no se leía como recorrido, Miller compartía
altura con él y la Ranger empezaba a parecer parte del pie de página. Nada más
se movió. **La composición sigue pendiente de aprobación visual del dueño.**

Historial: La primera conservaba el vacío que dejaba Cooper Station en el
cuadrante superior izquierdo. La segunda lo llenó con Miller. El dueño revisó
las capturas y rechazó esa solución con un argumento que manda sobre el
diagnóstico geométrico que la motivó:

> Un cuadrante vacío no es un error. Puede ser lo que hace que la imagen
> respire. El problema es que Miller, aislado contra negro en una esquina, se
> convierte casi en el segundo elemento que veo después del agujero negro, y no
> debería tener tanta jerarquía. Además hace pareja involuntaria con Edmunds y
> vuelve a formar una distribución periférica.

**La composición sigue pendiente de aprobación visual del dueño. Las capturas y
mediciones no la constituyen.**

Gargantúa conserva shader, escala, pose de home y protagonismo: no se toca ni su
`size` ni `SYSTEM_POSE`. Endurance, Edmunds y la Ranger quedan donde la segunda
pasada las dejó — el dueño las dio por buenas. Sólo cambian dos cosas:

- **Miller entra al tercio superior izquierdo, no a la esquina** (fase 337° →
  242°, radio 27 → 26, inclinación 38° → 31°). Pasa de **25.6 % / 17.4 %** del
  cuadro a **32.2 % / 30.3 %**: sigue arriba y a la izquierda, pero dentro del
  campo visual de Gargantúa en vez de anclado al borde del visor. El vacío de la
  esquina se conserva a propósito. Los tres números van atados: la altura sale
  de −r·sen(fase)·sen(inclinación) y la profundidad de r·sen(fase)·cos(incl.),
  así que acercarlo al centro del cuadro lo manda hacia atrás. Queda a 94 rs de
  la cámara de referencia —el segundo cuerpo más lejano— y esa distancia es lo
  que le quita el peso visual que no le tocaba. El radio no baja de 24 porque
  por debajo entraría en el disco (`DISK_OUTER` = 23.8 rs). Los últimos tres
  grados de fase y tres de inclinación son de la cuarta pasada: a 33.2 / 27.8
  quedaba a la misma altura que el Tesseracto y los dos formaban una línea
  superior. Entre él y el brazo izquierdo del disco queda una franja de negro
  que los separa; el dueño la señaló como parte de lo que funciona.
- **El Tesseracto no se mueve: gira, crece un 6.3 % y abre su rampa interna.**
  Su fase (298°) y su posición proyectada (57.7 % / 25.0 %) se conservan.
  - *Orientación* (`TESSERACT_BOX_TILT` / `TESSERACT_BOX_ROLL`): la cara pasa de
    **33.2° del eje de vista a 20.9 %** —yaw 18.8°, pitch 10.0°— con las aristas
    a 10° de la escuadra. La tercera pasada la había dejado en 17.5° y ahí
    aparecía el extremo contrario: a esa escala el objeto empezaba a leerse como
    un símbolo de cuadrados concéntricos en vez de como un objeto dimensional.
    Ni 33°, que escondía el interior, ni 17°, que lo aplanaba.
  - *Tamaño*: `size` 2.7 → 2.87. Siendo «Sobre mí» llegaba modesto al lado de la
    Endurance. Sigue muy por debajo de Gargantúa y por debajo de la Ranger en
    tamaño aparente.
  - *Profundidad interna*: la rampa de emisivo de los marcos pasa de
    0.15 / 0.30 / 0.62 a **0.12 / 0.36 / 0.95**, y el filo cálido con ella. Con
    la caja casi de frente, el recorrido hacia dentro es LA lectura del objeto;
    con los escalones anteriores los tres marcos llegaban demasiado parecidos.
    El primero es ahora más sobrio y el fondo bastante más caliente.

El orden de lectura que persigue la composición: **Gargantúa → Endurance →
Tesseracto → Miller / Edmunds → Ranger.**

Valores de `content/worlds.data.ts` (radio/fase/inclinación/tamaño, rs y grados)
y de `lib/scene-depth.ts` (desplazamiento sobre el rayo de vista, rs). La
columna «con 7 destinos» es el estado previo a la retirada de Cooper Station:

| Cuerpo | Con 7 destinos | Ahora | Profundidad |
|---|---|---|---|
| Tesseracto | 30 / 285 / 26 / 2.7 | 30 / 298 / 26 / 2.87 | −6 (sin cambio) |
| Miller | 27 / 337 / 38 / 3.05 | 26 / 242 / 31 / 3.05 | 0 → +5 |
| Endurance | 25 / 45 / 12 / 5.15 | 25 / 42 / 16 / 5.15 | +4 (sin cambio) |
| Edmunds | 25.5 / 167 / 56 / 3 | 25.5 / 167 / 56 / 3 | +2 (sin cambio) |
| Ranger | 24 / 105 / 23 / 2.6 | 24 / 97 / 14 / 2.0 | +7 (sin cambio) |

Esta tabla quedó superada el 2026-09-05 en dos pasadas, ambas en §14 de
[`hero-gargantua-direction.md`](hero-gargantua-direction.md):

- **§14 quáter** (autoridad de Gargantúa) cambia la columna de TAMAÑO, que pasa
  a 2.71 / 2.81 / 4.64 / 2.76 / 1.93 para las mismas cinco filas.
- **§14 quinquies** (respiración) cambia radio, fase e inclinación de los dos
  cuerpos de arriba: Tesseracto a 32 / 300 / 30 y Miller a 28 / 240 / 37.
- **§14 sexies** (segundo recorte) vuelve a cambiar sólo la columna de TAMAÑO,
  que queda en 2.669 / 2.782 / 4.547 / 2.732 / 1.92 para las mismas cinco filas.

Endurance, Edmunds y la Ranger conservan intactos radio, fase e inclinación, y
las seis profundidades de `scene-depth.ts` no se tocan. El razonamiento de esta
sección —por qué Miller no vuelve a la esquina, por qué el hueco se conserva—
sigue vigente y es lo que acota ambas pasadas.

Orientación del Tesseracto en `components/scene/bodies.ts`:

| | Antes | 3.ª pasada | Ahora |
|---|---|---|---|
| `TESSERACT_BOX_TILT` | `[0.6, 0.44, 0.16]` | `[0.251, 0.045, 0.353]` | `[0.251, 0.053, 0.417]` |
| `TESSERACT_BOX_ROLL` | `0.55` | `−0.09` | `−0.09` |
| Cara ↔ eje de vista | 33.2° | 17.5° | **20.9°** |
| Yaw / pitch | −24.4° / +25.3° | 15.0° / 9.0° | **18.8° / 10.0°** |
| Aristas fuera de escuadra | 26.8° | 10.0° | 10.0° |
| Emisivo marcos 2 / 3 / 4 | 0.15 / 0.30 / 0.62 | 0.15 / 0.30 / 0.62 | **0.12 / 0.36 / 0.95** |

Posición proyectada en pantalla a 1440×860, en porcentaje del cuadro, leída de
`--map-x` / `--map-y` con la escena viva (Gargantúa queda en 46.4 / 52.1):

| Cuerpo | Con 7 destinos | 2.ª pasada | 3.ª pasada | Ahora |
|---|---|---|---|---|
| Miller | 70.7 / 33.1 | 25.6 / 17.4 | 33.2 / 27.8 | **32.2 / 30.3** |
| Tesseracto | 48.4 / 26.5 | 57.7 / 25.0 | 57.7 / 25.0 | 57.7 / 25.0 |
| Endurance | 72.1 / 61.2 | 75.7 / 63.4 | 75.7 / 63.4 | 75.7 / 63.4 |
| Edmunds | 18.1 / 69.0 | 15.6 / 70.5 | 15.6 / 70.5 | 15.6 / 70.5 |
| Ranger | 37.3 / 84.2 | 42.3 / 82.0 | 42.3 / 82.0 | **43.6 / 79.8** |

Las rutas derivan sus poses únicamente de destinos válidos:
`cameraPose = f(routeWorldId)`. No cambian los controles ni las transiciones.

El mapa plano normaliza contra el radio máximo real de 30 rs. Sus semiejes
pasan de 40/36 % a 36.5/32.75 % para conservar el margen anterior y evitar
recortes a 375 px; Gargantúa no cambia de escala. Con las fases nuevas los
solapes de blanco entre destinos bajan de cuatro a tres a 375 px.

En móvil, el raíl dispone los seis destinos en dos filas de tres. Todos quedan
visibles con áreas táctiles de al menos 44 px; el control de efectos y TARGET
suben para no invadirlos. Los cuerpos mantienen su composición espacial libre.

### Sobre el test de jerarquía aparente

`components/scene/bodies.test.ts` medía el Tesseracto contra Miller
(`tesseract < miller · 1.15`). Miller era el cuerpo más pequeño y estaba quieto,
así que servía de patrón; dejó de estarlo. Las dos veces que la composición lo
movió saltó ese test sin que el Tesseracto hubiera cambiado — acoplaba una
garantía del modelo a una variable de composición y presionaba para distorsionar
la escena. Ahora se comprueba lo que de verdad se quiere: el radio publicado del
modelo (4.6–5.0), un suelo absoluto de tamaño aparente, y su sitio en la
jerarquía entre Miller y la Ranger. La banda del radio subió de [4.6, 5.0] a
[4.8, 5.3] al aprobar el dueño el 6.3 % de tamaño: sigue siendo una banda, no un
número — lo que se prohíbe es que crezca sin que nadie lo decida.

## Verificación exigida

- Catálogo exacto, orden consecutivo, vecinos sin huecos y poses deterministas.
- Ausencia de la ruta retirada en enlaces, sitemap y OG; respuesta 404.
- Cero ramas o assets exclusivos sin consumidor; Knip limpio.
- `npm run check` completo, seguido de E2E sobre producción.
- Capturas completas a 1920×1080, 1440×860 y 375×812; revisión de siluetas,
  huecos, bounds de cuerpos/proxies, HUD y fallback sin animación.

Las secciones fechadas anteriores en los planes y revisiones son historial de
decisiones, no contratos para reintroducir el destino retirado. Este documento
prevalece sobre sus catálogos, cantidades y bloqueos de composición.
