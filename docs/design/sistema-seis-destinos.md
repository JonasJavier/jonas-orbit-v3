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

Gargantúa conserva shader, escala y pose de home. Endurance permanece a la
derecha, con su silueta sobre cielo oscuro. Miller queda alto y al fondo;
Edmunds, bajo a la izquierda y más próximo. El vacío superior izquierdo es
intencional y no recibe un reemplazo. El Tesseracto conserva geometría,
material y orientación; solo se ajusta su fase. Ranger es el detalle inferior: tamaño nominal −17.3 % y fase 105° → 109°,
conservando su plano cercano. El fallback reduce su silueta de forma equivalente.

Valores de `content/worlds.data.ts` (radio/fase/inclinación/tamaño, rs y grados)
y de `lib/scene-depth.ts` (desplazamiento sobre el rayo de vista, rs):

| Cuerpo | Placement anterior | Placement nuevo | Profundidad anterior → nueva |
|---|---|---|---|
| Tesseracto | 30 / 285 / 26 / 2.7 | 30 / 279 / 26 / 2.7 | −6 → −6 |
| Miller | 27 / 337 / 38 / 3.05 | 27 / 337 / 38 / 3.05 | 0 → 0 |
| Endurance | 25 / 45 / 12 / 5.15 | 25 / 45 / 12 / 5.15 | +4 → +4 |
| Edmunds | 25.5 / 167 / 56 / 3 | 25.5 / 167 / 56 / 3 | +2 → +2 |
| Ranger | 24 / 105 / 23 / 2.6 | 24 / 109 / 23 / 2.15 | +7 → +7 |

No se reparte una circunferencia en partes iguales ni se añaden elementos.
El encuadre sigue midiendo los cuerpos existentes y el disco; no conserva un
punto fantasma. Las rutas derivan sus poses únicamente de destinos válidos:
`cameraPose = f(routeWorldId)`. No cambian los controles ni las transiciones.

El mapa plano normaliza ahora contra el radio máximo real de 30 rs. Sus
semiejes pasan de 40/36 % a 36.5/32.75 % para conservar el margen anterior
y evitar recortes a 375 px; Gargantúa no cambia de escala.

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
