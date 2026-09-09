# Endurance Navigation Interface — HUD e interacción del System Map

> **Decisión vigente del dueño · 2026-09-06:** el significado de cada destino lo fija [Arquitectura narrativa](arquitectura-narrativa.md) — Gargantúa = Sobre mí, Miller = Formación, Endurance = Proyectos, Edmunds = Creatividad, Tesseracto = Experimentos, Ranger = Contacto — y sustituye cualquier asociación anterior entre cuerpo y sección. Siguen siendo seis cuerpos y la escena no cambia: ni posición, ni escala, ni cámara, ni material. **Revoca del banner de abajo únicamente el veto sobre `/es/formacion`**, que ahora es Miller; lo retirado el 2026-09-04 fue un CUERPO (Cooper Station) y sigue retirado, mientras que lo que vuelve es un SIGNIFICADO sobre un cuerpo que ya existía. `/es/desarrollo` y `/es/laboratorio` pasan a responder 404.
>
> **Decisión vigente del dueño · 2026-09-04:** el sistema tiene exactamente seis destinos: Tesseracto, Miller, Endurance, Edmunds, Gargantúa y Ranger. Cooper Station y `/es/formacion` están retirados, sin sustituto ni reasignación editorial. El [contrato de seis destinos](sistema-seis-destinos.md) sustituye cualquier número, pose, destino o bloqueo de posición anterior que lo contradiga. Los registros fechados de fases anteriores son evidencia histórica, no instrucciones para reintroducir objetos. La nueva composición queda pendiente de aprobación visual del dueño.


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
│ 01 TESS  02 MILLER  03 ENDURANCE  …  06 RANGER                     │
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

El raíl contiene los únicos seis enlaces accesibles, en orden narrativo 01→06:

```text
01        02        03        04
TESS      MILLER    ENDURANCE EDMUNDS
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
- amplía su silueta 110–135 % según sphere, craft o box;
- incluye los bounds completos de Endurance;
- garantiza un mínimo táctil de 44 px;
- gestiona pointer enter/leave y click;
- está `aria-hidden` y `tabIndex=-1`, por lo que no duplica los seis enlaces;
- usa la misma máquina `idle → target → locked` y `navigateToWorld` que el raíl.

La etiqueta visual es hermana del proxy y tiene `pointer-events: none`.
`/es?debugHitboxes=1` muestra los bounds sólo en `next dev`, sin cambiar tamaño
o comportamiento. La validación manual recorre centro, izquierda, derecha,
arriba y abajo de cada silueta; en Endurance prueba los
módulos exteriores.

## 8. Cursor de navegación y stardust

Sólo desktop con `(hover: hover) and (pointer: fine)` monta esta capa.

El cursor de precisión tiene estados `space`, `target`, `locked` y `control`.
Permanece mínimo en vacío, responde sobre el proxy y conserva affordance normal
sobre raíl, botones y campos. Fuera del System Map no sustituye al cursor del
sistema.

Con WebGL vivo, el stardust se dibuja en un único canvas `aria-hidden` con pool
circular de 300 slots en typed arrays. El pointermove no actualiza React ni crea
nodos: activa 1–9 partículas según distancia, con capacidad fija, vida 390–760
ms, deriva baja y fade rápido. El fallback `flat` conserva el perfil 2D aprobado.
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
`aria-hidden`. El HTML y los seis enlaces del raíl siguen siendo el producto.
Starfield y stardust se agrupan; el pool tiene techo fijo; el RAF de puntero sólo
vive con partículas activas. No se usan miles de nodos, meshes o setState por
movimiento.

La precisión geométrica final de hitboxes se valida en navegador con el modo
debug; tests DOM prueban el contrato, teclado, estados y clicks modificados.

## 12. Pase de cierre del puntero (2026-09-08)

Manda sobre §6 y §7 en **tamaño del raíl y condiciones bajo las que un cuerpo
recibe el puntero**. No toca composición, cámara, material, HUD ni el contrato
`idle → target → locked`.

El dueño reportó que «a veces» el hover no responde al pasar el ratón por encima
de los planetas. No era intermitente: eran **tres fallos deterministas** que se
disparaban en circunstancias distintas, y por eso desde fuera parecía azar.

### 12.1 El campo desaparecía por debajo de 960 px

`.system-map__field { display: none }` bajo `@media (max-width: 60rem)` se
escribió para el ATLAS PLANO, donde el campo son seis rótulos que no caben en un
móvil. Pero con la escena viva ese mismo campo es **el único sitio donde los
cuerpos dibujados reciben el puntero**: apagarlo dejaba los seis planetas mudos
al ratón —ni foco, ni HUD, ni retículo, ni clic— en cualquier ventana de menos
de 960 px CSS. En un Windows al 125 % eso son 1200 px de pantalla, o sea un
navegador cualquiera sin maximizar.

Con `(hover: hover) and (pointer: fine)` y escena viva, el campo vuelve. Lo que
sigue oculto es `.system-map__body`, que es lo que de verdad no cabe: los
rótulos anclados. El nombre del destino lo dice el HUD y el raíl sigue siendo el
índice accesible. En pantallas táctiles no cambia nada.

### 12.2 Gargantúa se quedaba encima de sus vecinos al apuntarla

`.system-map__slot:not([data-target-state="idle"]) { z-index: 7 }` promovía
cualquier destino adquirido por encima del resto. Para cinco cuerpos pequeños es
inocuo; para Gargantúa no, porque su proxy no es un círculo: cubre el disco
entero —968 × 245 px a 1440 px de ancho— y al subir tapaba a la Endurance y a
Edmunds en toda la franja donde se solapan. Dentro de esa franja el puntero
seguía dentro de Gargantúa, así que ni entraba en el vecino ni salía de ella.

Reproducido y medido: con la regla anterior, entrar desde el centro de Gargantúa
al solape con la Endurance en (1069, 452) dejaba el estado en `gargantua`; con
el centro fijado en `z-index: 3` —por debajo de los cinco cuerpos— el mismo
gesto entrega `endurance`.

La regla general que queda escrita: **en un mapa con blancos solapados gana
siempre el más pequeño**, que es el que cuesta apuntar.

### 12.3 El paralaje movía el blanco mientras lo apuntabas

El paralaje del puntero orienta la cámara hasta 1.5°, y a la distancia de
encuadre eso son decenas de píxeles. Además llega suavizado con una constante de
0.32 s, así que el sistema **seguía derivando casi un segundo después de que el
ratón se parara**. Sobre un cuerpo pequeño el resultado era que el planeta se
escurría por debajo de un cursor quieto y el hover se apagaba solo.

`setFocus(id)` congela ahora el objetivo del paralaje en el ángulo actual
mientras hay destino adquirido —no lo devuelve a cero: la cámara se queda donde
está— y lo suelta al liberar. Medido a 1440 × 860 sobre Miller: al entrar, el
cuerpo deriva 8.5 px; moviendo el puntero 33 px **dentro** del cuerpo ya
adquirido, 0.00 px; al salir, vuelve a derivar 8.1 px. No hay oscilación posible
porque adquirir siempre termina en un estado inmóvil.

### 12.4 Soltar sólo apaga lo que uno encendió

`pointerleave` hacía `setPointerTarget(null)` a secas. Con blancos que se tocan,
el navegador puede entregar el `pointerenter` del vecino antes del
`pointerleave` del que dejas, y entonces el segundo evento borra una adquisición
que ya era del primero. `release(id)` sólo apaga si el destino activo es el
suyo; `pointercancel` entra por la misma puerta. El raíl comparte el cambio.

### 12.5 El raíl gana presencia

`.nav-rail__name` pasa de `0.69rem` (11 px) a `0.78rem` (12.5 px), y el nombre
cósmico de `0.54rem` a `0.58rem` para no aplanar la jerarquía. Las dos variantes
estrechas suben en la misma proporción (0.65 → 0.72 y 0.58 → 0.64 rem). El
blanco de pulsación ya era de 44-50 px, así que esto no cambia accesibilidad:
cambia **peso visual**. Contra una escena a pantalla completa, once píxeles se
leían como instrumentación de fondo y no como la navegación del sitio, y es lo
primero que tiene que encontrar quien llega por primera vez. Misma familia mono,
mismo espaciado, mismos dos niveles.

## 13. El marco del overlay (2026-09-08)

Manda sobre §7 y sobre §12 en **en qué espacio se miden las coordenadas del
mapa**. Es la causa raíz de «el HUD está descentrado» y de «el hover sólo
funciona en zonas muy específicas», y es una sola línea de CSS.

### 13.1 El fallo

La escena publica `--map-x` / `--map-y` en **píxeles del viewport**: los saca de
proyectar con la cámara sobre `canvas.clientWidth/Height`, y el canvas es
`position: fixed; inset: 0`. El overlay que los consume, `.system-map`, era
`position: absolute; inset: 0` dentro de `.system-home`, que es
`width: min(100%, 92rem); margin-inline: auto`.

Mientras la ventana cabe en 92rem las dos cajas coinciden y todo funciona. En
cuanto la ventana es más ancha, `.system-home` deja de empezar en el borde
izquierdo y **el campo entero de destinos se desplaza (viewport − 1472)/2 hacia
la derecha**, mientras los cuerpos se siguen dibujando donde siempre.

| viewport | desfase del proxy respecto de su cuerpo |
| --- | --- |
| 1280 | 0 px |
| 1440 | 0 px |
| 1920 | **+224 px** |
| 2560 | **+544 px** |

Con ese desfase, apuntar a un planeta no hacía nada y los corchetes de
adquisición encuadraban el vacío a su derecha; el hover sólo se disparaba en los
sitios donde el blanco desplazado se cruzaba por casualidad con el puntero. Eso
es exactamente lo que se veía como «hay que acertarle a una línea fina».

### 13.2 Por qué no lo veía nadie

Dos coincidencias, y las dos son la lección:

1. **Toda la suite y todas las capturas viven en 1440 px**, justo por debajo del
   umbral de 1472. El defecto no existía en ningún tamaño probado.
2. **Ninguna prueba e2e monta la escena viva.** Toda la cobertura de la portada
   usa `?no3d=1`, donde el atlas plano se compone en porcentajes del contenedor
   y por tanto es CORRECTO que viva en la columna. El único modo donde el marco
   importa era el único modo sin pruebas.

### 13.3 El arreglo, y lo que NO era

No hace falta ningún desfase por objeto, ni recalcular centros, ni cambiar cómo
se proyecta: **la proyección siempre estuvo bien y el contenedor mal.** Con la
escena viva, `.system-map` pasa a `position: fixed; inset: 0` — el mismo espacio
en el que la escena mide. Y sólo con la escena viva: el atlas plano conserva su
marco de columna, que es el suyo.

Con el marco arreglado se movió también el ámbito de `cursor: none`, que colgaba
de `.system-home`. Si no, en una pantalla de 2560 px las dos bandas laterales
tendrían el retículo dibujado **y** el cursor del sistema encima.

### 13.4 Lo que ya estaba bien, y conviene no rehacer

La petición que acompañaba al informe —separar geometría visual de geometría
interactiva, con un collider invisible y generoso, y anclar el HUD en el centro
real proyectado— **describe lo que este sistema ya hace**, y por eso no se ha
tocado:

- no hay raycast contra la malla: el canvas es `aria-hidden` y no recibe puntero;
- cada cuerpo tiene un proxy DOM independiente del rótulo, dimensionado con el
  radio de silueta que publica `modelRadius` (el vértice más lejano, con las
  plumas de propulsión podadas) más un 10–24 % de margen y un mínimo de 44 px;
- `/es?debugHitboxes=1` dibuja esos volúmenes en `next dev`. Verificado a 1920 y
  a 2560: los seis cubren su cuerpo con holgura por los cuatro lados.

Medido después del arreglo, apuntando al centro y a cuatro puntos a media
silueta de cada cuerpo: **25 de 25 adquisiciones correctas a 1920 y 25 de 25 a
2560.** Antes, a 2560, fallaban las 25.

Se evaluó anclar el proxy en el centro de un `Box3` en vez de en el pivote y se
descartó con números: Miller y Edmunds tienen desfase 0.0 %, la Endurance 1.7 %,
y en el Tesseracto —el peor— el centro de la caja resulta ser PEOR ancla que el
pivote, porque `sampleTesseract` ya normaliza sus dieciséis vértices a radio 1.5
alrededor de su centroide en cada fase. Cambiarlo habría hecho respirar los
corchetes al ritmo de la rotación sin ganar precisión.

### 13.5 La prueba que faltaba

`e2e/scene-overlay.spec.ts` cubre el contrato en 1440, 1920 y 2560, y no
necesita GPU: lo que falló no fue la proyección sino el marco, y el marco lo
decide el CSS a partir de `data-scene-live`. Forzando ese atributo se comprueba
en seco que *un destino colocado en el píxel N del viewport aterriza en el píxel
N del viewport*, más la contraparte: que el atlas plano sigue componiéndose
dentro de la columna. Verificado que discrimina — con la regla anterior,
`.system-map` mide [224, 0, 1472, 1080] a 1920 y un destino puesto en x = 1574
aterriza en 1798.
