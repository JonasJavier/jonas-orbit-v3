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

Segunda pasada, tras revisión del dueño. La primera conservaba el vacío que
dejaba Cooper Station en el cuadrante superior izquierdo; medido a 1440×860,
ningún cuerpo caía en x < 48 % con y < 50 % y la masa se repartía 34/66 entre
izquierda y derecha. El dueño confirmó que el cuadro se leía vacío y autorizó
recomponer. **La composición resultante sigue pendiente de su aprobación
visual; las capturas y mediciones no la constituyen.**

Gargantúa conserva shader, escala, pose de home y protagonismo: no se toca ni
su `size` ni `SYSTEM_POSE`. Se mueven dos cuerpos y se afinan otros dos:

- **Miller cruza al superior izquierdo** (fase 337° → 235°, radio 27 → 28,
  inclinación 38° → 58°, profundidad 0 → +5). Ocupa el hueco con el cuerpo
  adecuado: un planeta con albedo y terminador se sostiene contra el campo de
  estrellas donde una estructura de marcos oscuros se leería como un icono
  suelto. La fase lo hunde doce radios por detrás del plano del origen, así que
  sigue siendo el segundo cuerpo más lejano; los +5 rs de capa sólo compensan
  esa distancia lo justo para que el Tesseracto no se vea mayor que él —el
  deslizamiento sobre el rayo no lo mueve un píxel ni toca el encuadre—.
- **El Tesseracto se corre a la derecha del eje** (fase 279° → 298°). Con Miller
  arriba a la izquierda, dejarlo centrado los habría convertido en dos objetos
  colgados de la misma banda superior. Conserva geometría, material, radio y
  profundidad: solo cambia su fase.
- **Endurance baja y se abre** (fase 45° → 42°, inclinación 12° → 16°): separa
  su silueta de la cola derecha del disco. Permanece en el hemisferio derecho.
- **La Ranger sube y se centra** (fase 109° → 99°, inclinación 23° → 16°,
  tamaño 2.15 → 2.0): se despega del borde inferior y del raíl, y vuelve a
  leerse como detalle de escala y no como sexto protagonista. Mantiene su plano
  cercano.
- **Edmunds no se toca.** Es el ancla inferior izquierda y el contrapeso cálido
  de Miller: mismo lado del cuadro, mitad opuesta, más cerca de la cámara.

No se reparte una circunferencia en partes iguales, no se añaden elementos y
ningún cuerpo crece para compensar. El encuadre se mide contra la envolvente de
los cuerpos existentes, así que recogerlos acerca la cámara: el radio de sombra
de Gargantúa pasa de 42 a 46 px a 1440×860 sin tocar su escala ni la pose.

Valores de `content/worlds.data.ts` (radio/fase/inclinación/tamaño, rs y grados)
y de `lib/scene-depth.ts` (desplazamiento sobre el rayo de vista, rs). La
columna «con 7 destinos» es el estado previo a la retirada de Cooper Station:

| Cuerpo | Con 7 destinos | Ahora | Profundidad |
|---|---|---|---|
| Tesseracto | 30 / 285 / 26 / 2.7 | 30 / 298 / 26 / 2.7 | −6 (sin cambio) |
| Miller | 27 / 337 / 38 / 3.05 | 28 / 235 / 58 / 3.05 | 0 → +5 |
| Endurance | 25 / 45 / 12 / 5.15 | 25 / 42 / 16 / 5.15 | +4 (sin cambio) |
| Edmunds | 25.5 / 167 / 56 / 3 | 25.5 / 167 / 56 / 3 | +2 (sin cambio) |
| Ranger | 24 / 105 / 23 / 2.6 | 24 / 99 / 16 / 2.0 | +7 (sin cambio) |

Posición proyectada en pantalla a 1440×860, en porcentaje del cuadro, leída de
`--map-x` / `--map-y` con la escena viva (Gargantúa queda en 46.4 / 52.1):

| Cuerpo | Antes | Ahora |
|---|---|---|
| Miller | 70.7 / 33.1 | 25.6 / 17.4 |
| Tesseracto | 48.4 / 26.5 | 57.7 / 25.0 |
| Endurance | 72.1 / 61.2 | 75.7 / 63.4 |
| Edmunds | 18.1 / 69.0 | 15.6 / 70.5 |
| Ranger | 37.3 / 84.2 | 42.3 / 82.0 |

Las rutas derivan sus poses únicamente de destinos válidos:
`cameraPose = f(routeWorldId)`. No cambian los controles ni las transiciones.

El mapa plano normaliza contra el radio máximo real de 30 rs. Sus semiejes
pasan de 40/36 % a 36.5/32.75 % para conservar el margen anterior y evitar
recortes a 375 px; Gargantúa no cambia de escala. Con las fases nuevas los
solapes de blanco entre destinos bajan de cuatro a tres a 375 px.

En móvil, el raíl dispone los seis destinos en dos filas de tres. Todos quedan
visibles con áreas táctiles de al menos 44 px; el control de efectos y TARGET
suben para no invadirlos. Los cuerpos mantienen su composición espacial libre.

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
