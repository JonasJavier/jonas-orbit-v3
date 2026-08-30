# Endurance Navigation Interface — HUD e interacción del System Map

**Fase:** Hero / System Map life pass. Continuous Journey permanece
**DEFERRED**; ver [`continuous-journey-phase.md`](continuous-journey-phase.md).

La dirección de mundos, escala, luz, estrellas y gate artístico vive en
[`hero-gargantua-direction.md`](hero-gargantua-direction.md). Este documento
detalla la interfaz de navegación y su contrato técnico.

## 1. Encuadre conceptual

El visitante observa Jonás Orbit mediante instrumentación de la Endurance. El
universo es protagonista; el HUD comunica estado real y navegación, no ficción
decorativa.

El lenguaje de cabina procede de tipografía, alineación, jerarquía, brackets,
cursor de precisión y respuesta coordinada. No se dibujan interiores, paneles de
vidrio, radares, gauges ni telemetría inventada.

```text
┌───────────────────────────────────────────────────────────────────────┐
│ ENDURANCE // NAV              JONAS ORBIT           ● SYSTEM NOMINAL │
│                                                                       │
│                                                       NAVIGATION      │
│                                                       ──────────      │
│                                                       SELECT          │
│                                                       DESTINATION     │
│                         GARGANTÚA                                     │
│                    universo y destinos                               │
│                                                                       │
│ 01 TESS  02 COOPER  03 MILLER  04 ENDURANCE  …  07 RANGER           │
└───────────────────────────────────────────────────────────────────────┘
```

No existe bloque visible de perfil. Nombre completo, rol, acciones contractuales
y CV permanecen en el HTML semántico, fuera del encuadre visual.

## 2. Jerarquía de contraste

| Token | Brillo orientativo | Elementos |
|---|---:|---|
| `HUD_PRIMARY` | 90–100 % | `JONAS ORBIT`, nombre del target, destino locked, acción crítica |
| `HUD_SECONDARY` | 60–75 % | modo, estado real, índice y sección activos |
| `HUD_TERTIARY` | 35–50 % | destinos inactivos y lecturas auxiliares útiles |
| `HUD_GHOST` | 15–25 % | ticks, marco, reglas y calibración decorativa |

La opacidad no sube globalmente. El idle es calmado; al adquirir un mundo el
nombre y el marcador cruzan a PRIMARY mientras lo ambiental permanece estable.

Paleta:

- blanco suave: información primaria;
- cian/azul frío: navegación, focus y adquisición;
- ámbar: respuesta secundaria ligada a Gargantúa;
- punto cian/verde: una única señal de sistema nominal;
- rojo apagado: warning o error real.

Violeta, magenta y pink pertenecen a la capa de stardust, no al HUD.

## 3. Franja superior

- izquierda: `ENDURANCE // NAV`;
- centro: `JONAS ORBIT` en PRIMARY;
- derecha: `● SYSTEM NOMINAL`, `SYSTEM FLAT` u otro estado verdadero.

El punto puede respirar lentamente si motion está permitido. No se añaden
coordenadas, combustible, oxígeno o velocidad falsos.

## 4. Subsistema TARGET

TARGET usa texto, regla fina, micro marcadores y espacio negativo; nunca tarjeta
o fondo.

### Idle

```text
NAVIGATION
──────────
SELECT DESTINATION
```

### Hover o focus

```text
TARGET LOCK
04

ENDURANCE
PROJECTS

[ ENTER ]
```

`ENDURANCE` cruza a `HUD_PRIMARY` y se convierte en uno de los textos más
brillantes del viewport. Focus de teclado y hover de proxy producen el mismo
TARGET, brackets, rim y estado del raíl.

### Locked

```text
DESTINATION LOCKED
04

ENDURANCE
PROJECTS
```

Los brackets se estabilizan y la trayectoria puede ampliarse durante la
navegación. No aparece modal ni una segunda acción.

La lectura ambiental de hover no usa `aria-live`; anunciar cada movimiento del
puntero sería ruido. La ruta y su heading confirman el viaje.

## 5. Brackets, mundo y trayectoria

Sólo el target actual recibe cuatro brackets pequeños:

- idle: ausentes;
- hover/focus: cian/blanco sutil;
- locked: algo más brillantes y estables.

El mundo gana apenas rim y la trayectoria progresa de ausente a arco tenue y,
sólo si ayuda, recorrido mayor en locked. No hay círculo por cuerpo, radar o
elipse saturada. Esta combinación de respuestas pequeñas hace que el HUD se
despierte sin añadir información permanente.

## 6. Raíl de destinos

El raíl contiene los únicos siete enlaces accesibles, en orden narrativo 01→07:

```text
01        02        03        04
TESS      COOPER    MILLER    ENDURANCE
```

No hay cajas por destino. Índice, nombre, tick y espacio construyen el control.

- inactivo: `HUD_TERTIARY`, apagado pero legible;
- hover/focus: `HUD_SECONDARY` y foco geométrico;
- target/locked: `HUD_PRIMARY`, blanco/cian y marcador corto.

El nombre accesible incluye mundo y sección; el índice es sólo orientación
visual. Focus no depende de glow.

## 7. Proxies de mundo y bug de hover

La navegación del canvas no usa R3F ni raycasting. La causa del antiguo hover
parcial era un `<a>` del tamaño y posición del rótulo, no de la geometría
percibida.

Cada cuerpo tiene ahora un `.system-map__hit-target` DOM separado del texto:

- recibe el centro proyectado y `--map-radius` del modelo compuesto;
- amplía su silueta 110–135 % según sphere, ringed, craft o box;
- incluye anillos de Cooper y bounds completos de Endurance;
- garantiza un mínimo táctil de 44 px;
- gestiona pointer enter/leave y click;
- está `aria-hidden` y `tabIndex=-1`, por lo que no duplica los siete enlaces;
- usa la misma máquina `idle → target → locked` y `navigateToWorld` que el raíl.

La etiqueta visual es hermana del proxy y tiene `pointer-events: none`.
`/es?debugHitboxes=1` muestra los bounds sólo en `next dev`, sin cambiar tamaño
o comportamiento. La validación manual recorre centro, izquierda, derecha,
arriba y abajo de cada silueta; en Cooper prueba los anillos y en Endurance los
módulos exteriores.

## 8. Cursor de navegación y stardust

Sólo desktop con `(hover: hover) and (pointer: fine)` monta esta capa.

El cursor de precisión tiene estados `space`, `target`, `locked` y `control`.
Permanece mínimo en vacío, responde sobre el proxy y conserva affordance normal
sobre raíl, botones y campos. Fuera del System Map no sustituye al cursor del
sistema.

El stardust se dibuja en un único canvas `aria-hidden` con pool circular de 112
slots en typed arrays. El pointermove no actualiza React ni crea nodos: activa
1–5 partículas según velocidad, con capacidad fija, vida 320–680 ms, deriva baja
y fade rápido.
Violeta/magenta/pink dominan y cian aparece de forma rara. El RAF se detiene al
vaciarse el pool y con `document.hidden`.

No hay línea continua, glitter brush, comet tail ni bursts sin límite.

## 9. Estado real y navegación

| Lectura | Fuente |
|---|---|
| sistema | gate publicado por la escena |
| TARGET | hover/focus/locked del destino |
| índice | orden canónico `WorldId` |
| movimiento | preferencia real de reduced-motion |
| 3D | perfil real de efectos |

Toda activación llama a `navigateToWorld(worldId)` desde
`lib/world-navigation.ts` y conserva `href` real. Hoy navega por ruta. La fase
continua futura podrá resolver a una ancla sin reconstruir HUD, raíl o proxies.

Las páginas actuales regresan de forma convencional a `/es`. `SYSTEM MAP ↑` se
define únicamente en la documentación de Continuous Journey diferida.

## 10. Mobile, touch y reduced-motion

Móvil recompone, no encoge desktop:

- `JONAS ORBIT`, TARGET y raíl tienen prioridad;
- el estado superior se simplifica y `HUD_GHOST` se oculta;
- los targets conservan al menos 44 px;
- el starfield permanece denso pero estático;
- no hay custom cursor ni stardust y no se emulan con el dedo.

Reduced-motion conserva estrellas estáticas, mundo target, foco, brackets
estáticos y navegación. Desactiva stardust, cursor animado, respiración de cámara,
paralaje, pulsos, adquisición y deriva del campo de estrellas.

## 11. Rendimiento y accesibilidad

Canvas 3D, starfield, stardust, brackets y cursor son decorativos y
`aria-hidden`. El HTML y los siete enlaces del raíl siguen siendo el producto.
Starfield y stardust se agrupan; el pool tiene techo fijo; el RAF de puntero sólo
vive con partículas activas. No se usan miles de nodos, meshes o setState por
movimiento.

La precisión geométrica final de hitboxes se valida en navegador con el modo
debug; tests DOM prueban el contrato, teclado, estados y clicks modificados.
