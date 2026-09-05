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

Tercera pasada. La primera conservaba el vacío que dejaba Cooper Station en el
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
  245°, radio 27 → 26, inclinación 38° → 34°). Pasa de **25.6 % / 17.4 %** del
  cuadro a **33.2 % / 27.8 %**: sigue arriba y a la izquierda, pero dentro del
  campo visual de Gargantúa en vez de anclado al borde del visor. El vacío de la
  esquina se conserva a propósito. Los tres números van atados: la altura sale
  de −r·sen(fase)·sen(inclinación) y la profundidad de r·sen(fase)·cos(incl.),
  así que acercarlo al centro del cuadro lo manda hacia atrás. Queda a 94 rs de
  la cámara de referencia —el segundo cuerpo más lejano— y esa distancia es lo
  que le quita el peso visual que no le tocaba. El radio no baja de 24 porque
  por debajo entraría en el disco (`DISK_OUTER` = 23.8 rs).
- **El Tesseracto no se mueve: gira.** Su fase (298°) y su posición proyectada
  (57.7 % / 25.0 %) se conservan. Lo que cambia es `TESSERACT_BOX_TILT` /
  `TESSERACT_BOX_ROLL`: la cara pasa de **33.2° del eje de vista a 17.5°**
  —15° de yaw y 9° de pitch— con las aristas a 10° de la escuadra. El objeto se
  rediseñó para que se leyeran el marco exterior, los interiores y la progresión
  hacia el vacío; de canto escondía exactamente eso. Frontal del todo sería el
  otro error: un icono plano.

El orden de lectura que persigue la composición: **Gargantúa → Endurance →
Tesseracto → Miller / Edmunds → Ranger.**

Valores de `content/worlds.data.ts` (radio/fase/inclinación/tamaño, rs y grados)
y de `lib/scene-depth.ts` (desplazamiento sobre el rayo de vista, rs). La
columna «con 7 destinos» es el estado previo a la retirada de Cooper Station:

| Cuerpo | Con 7 destinos | Ahora | Profundidad |
|---|---|---|---|
| Tesseracto | 30 / 285 / 26 / 2.7 | 30 / 298 / 26 / 2.7 | −6 (sin cambio) |
| Miller | 27 / 337 / 38 / 3.05 | 26 / 245 / 34 / 3.05 | 0 → +5 |
| Endurance | 25 / 45 / 12 / 5.15 | 25 / 42 / 16 / 5.15 | +4 (sin cambio) |
| Edmunds | 25.5 / 167 / 56 / 3 | 25.5 / 167 / 56 / 3 | +2 (sin cambio) |
| Ranger | 24 / 105 / 23 / 2.6 | 24 / 99 / 16 / 2.0 | +7 (sin cambio) |

Orientación del Tesseracto en `components/scene/bodies.ts`:

| | Antes | Ahora |
|---|---|---|
| `TESSERACT_BOX_TILT` | `[0.6, 0.44, 0.16]` | `[0.251, 0.045, 0.353]` |
| `TESSERACT_BOX_ROLL` | `0.55` | `−0.09` |
| Cara ↔ eje de vista | 33.2° | 17.5° |
| Yaw / pitch | −24.4° / +25.3° | 15.0° / 9.0° |
| Aristas fuera de escuadra | 26.8° | 10.0° |

Posición proyectada en pantalla a 1440×860, en porcentaje del cuadro, leída de
`--map-x` / `--map-y` con la escena viva (Gargantúa queda en 46.4 / 52.1):

| Cuerpo | Con 7 destinos | 2.ª pasada | Ahora |
|---|---|---|---|
| Miller | 70.7 / 33.1 | 25.6 / 17.4 | **33.2 / 27.8** |
| Tesseracto | 48.4 / 26.5 | 57.7 / 25.0 | 57.7 / 25.0 |
| Endurance | 72.1 / 61.2 | 75.7 / 63.4 | 75.7 / 63.4 |
| Edmunds | 18.1 / 69.0 | 15.6 / 70.5 | 15.6 / 70.5 |
| Ranger | 37.3 / 84.2 | 42.3 / 82.0 | 42.3 / 82.0 |

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
jerarquía entre Miller y la Ranger.

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
