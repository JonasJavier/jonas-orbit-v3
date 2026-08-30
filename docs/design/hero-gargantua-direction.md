# Hero / System Map — dirección artística vigente

**Estado:** candidato en iteración. Esta especificación guía implementación y
revisión visual; compilar o pasar tests no constituye aprobación artística.

Manda sobre cualquier descripción anterior del Hero en
`docs/plans/sistema-gargantua.md`, el plan principal y el contrato WP0. La
arquitectura de rutas y cámara sigue perteneciendo al pivote; este documento
manda en composición, escala, mundos, HUD, interacción, luz, estrellas y motion
del System Map.

## 1. Propósito

El Hero es sistema espacial, navegación y exploración. No es una introducción
personal ni una portada editorial.

El bloque visible con «Jonás Javier Encarnación», los dos roles y la propuesta
desaparece por completo y no se sustituye por otro párrafo, tarjeta o panel de
vidrio. La identidad visible es `JONAS ORBIT` en el HUD. Nombre completo, rol,
acciones contractuales y CV permanecen en el HTML semántico servido sin
JavaScript, pero no forman un bloque visual de perfil dentro del System Map.

## 2. Escala y ocupación del viewport

El primer frame debe sentirse como un viewport de navegación frente a cuerpos
enormes, no como iconos pequeños dentro de un lienzo negro. La composición usa
escala, profundidad y relaciones de primer plano; no llena el vacío con UI.

| Jerarquía | Elemento | Calibración frente al mapa previo | Lectura requerida |
|---|---|---:|---|
| 1 | **Gargantúa** | +10–20 % si el encuadre lo permite | foco dominante y fuente de energía |
| 2 | **Endurance** | +25–45 % | segunda ancla; nave radial reconocible |
| 3 | **Miller, Edmunds y Cooper** | +25–40 % según silueta | destinos planetarios inmediatos |
| 4 | **Tesseracto y Ranger** | +15–25 % | destinos menores pero localizables |

Estos porcentajes son calibración visual, no un multiplicador uniforme ni una
API. Cada modelo conserva su volumen compuesto para cámara, brackets e
interacción. Ningún destino debe requerir búsqueda consciente y ningún lado del
viewport queda muerto por conservar el layout del antiguo copy.

Gargantúa permanece sin rótulo permanente: escala, sombra y disco ya establecen
su identidad.

## 3. El sistema está quieto, no muerto

Las posiciones de los seis cuerpos alrededor de Gargantúa son constantes de
dirección de arte. `phase` describe una posición, no una animación orbital.

La vida en reposo procede únicamente de:

- disco de acreción de Gargantúa;
- rotación local que aporte materialidad;
- deriva mínima de naves y balizas pequeñas;
- capas de estrellas con profundidad contenida;
- respiración de cámara apenas perceptible;
- paralaje aditivo de hasta 1.5°.

Hover, focus y selected despiertan respuesta coordinada. No se añade touring,
movimiento de órbita ni objetos volando para rellenar silencio.

## 4. Identidad de los mundos

### Gargantúa

Se conserva el raymarch de geodésicas. La sombra permanece negra; nunca se
simula energía iluminando el centro. El disco concentra el rango cálido
`hot white → cream → amber/gold`, con naranja saturado sólo como residuo. Su
luminancia, detalle y halo deben crecer sin lavar la textura ni convertir el
frame en bloom.

### Endurance — Proyectos

Endurance es una nave original de espacio profundo, no una copia cinematográfica
ni un toro decorativo. Su estructura contiene hub central, radios, 8–12 módulos,
anillo exterior parcial, antenas, estructura mecánica y luces pequeñas.

El casco es metálico oscuro o gris, con borde cálido de Gargantúa, relleno frío
contenido y como máximo un acento cian. No hay bandas azules/blancas gigantes ni
un anillo macizo. Su escala de primer plano la convierte en segunda ancla y su
silueta completa entra en el volumen interactivo.

### Cooper Station — Formación

Cooper es un **planeta anillado inventado con un hábitat orbital pequeño**. El
planeta aporta la silueta; la estación justifica el nombre sin dominarla.

La atmósfera es fría y desaturada, los anillos son finos y muestran profundidad
y sombra, y Gargantúa añade el borde cálido común. El hábitat puede tener anillo,
eje, antenas y pocos módulos iluminados. Debe comunicar conocimiento, orden,
calma y civilización aspiracional; nunca un cilindro provisional. Planeta y
anillos forman un único volumen percibido para hit testing.

### Tesseracto — Historia

Marcos anidados, profundidad real, núcleo sutil y una leve perspectiva imposible.
Permanece misterioso y distante, pero no tan pequeño que parezca un icono.

### Miller — Desarrollo

Mundo oceánico, frío, peligroso y bello. Aumentan su escala, reflexión de agua,
atmósfera contenida y borde cálido central sin convertirlo en la Tierra.

### Edmunds — Creatividad

Mundo cobre con variación de terreno, bruma atmosférica y riqueza material. Puede
ser el planeta más expresivo, pero sigue creíble y comparte la misma fuente de
luz; no usa arcoíris.

### Ranger — Contacto

Nave metálica pequeña con silueta legible. El violeta se limita a una baliza
mínima; no invade casco ni HUD.

## 5. Modelo de luz compartida

Todo objeto pertenece al mismo entorno:

1. **Primaria:** Gargantúa emite influencia cálida desde el centro. El disco, no
   la sombra, es la fuente perceptual.
2. **Secundaria:** un fill azul frío, débil y común recupera volumen en sombra.
3. **Rim:** cada material deriva el borde desde su orientación y posición
   respecto de Gargantúa; no usa un halo independiente pegado al asset.

Los lados oscuros permanecen oscuros. La legibilidad procede de silueta,
terminador, atmósfera y especular localizados, no de subir globalmente exposición
o emissive. El usuario debe inferir de forma subconsciente que la energía viene
del centro.

## 6. Campo de estrellas y profundidad

El espacio usa tres capas perceptuales dentro de una implementación batched:

| Capa | Densidad | Tamaño/movimiento | Función |
|---|---|---|---|
| **far** | muy alta | puntos subpíxel, estáticos | profundidad de cielo sin «space snow» |
| **mid** | media | algo más brillantes, paralaje y deriva mínimos | escala relativa |
| **near** | muy baja | motas pequeñas y suaves, movimiento lento | profundidad próxima, nunca nevada |

En WebGL las estrellas pertenecen al fondo procedural del shader; en `flat` se
dibujan agrupadas en un único canvas 2D. No existen miles de meshes o nodos DOM.
El orden de magnitud siempre es muchas far, algunas mid y casi ninguna near.

La densidad y luminancia se atenúan gradualmente junto al disco para proteger su
contraste y se recuperan hacia el exterior. El fondo añade sólo trazas casi
negras de navy, violeta y polvo cálido central; nunca una nebulosa púrpura de
wallpaper.

## 7. HUD: cuatro niveles de contraste

El HUD no se aclara de forma global. Usa tokens perceptuales explícitos:

| Nivel | Brillo orientativo | Contenido |
|---|---:|---|
| **PRIMARY** | 90–100 % | `JONAS ORBIT`, nombre del target, destino bloqueado, acción crítica |
| **SECONDARY** | 60–75 % | modo, estado real, índice y sección activos |
| **TERTIARY** | 35–50 % | destinos inactivos y lecturas auxiliares útiles |
| **GHOST** | 15–25 % | ticks, marco, calibración y marcas decorativas |

Paleta: blanco suave para primario, cian frío para navegación/focus, ámbar de
Gargantúa para respuesta secundaria y rojo apagado sólo para error real. El
indicador de sistema puede usar un único punto cian/verde contenido. El violeta
no es color del HUD: pertenece a la baliza de Ranger y al stardust de puntero.

La franja superior se limita a `ENDURANCE // NAV`, `JONAS ORBIT` y un indicador
real `SYSTEM NOMINAL`, `SYSTEM FLAT` o equivalente.

## 8. TARGET, brackets y trayectorias

TARGET se compone con texto, regla, micro marcadores y espacio negativo; nunca
es una tarjeta.

```text
NAVIGATION                 TARGET LOCK              DESTINATION LOCKED
──────────                 04                       04
SELECT DESTINATION         ENDURANCE                ENDURANCE
                           PROJECTS                 PROJECTS
                           [ ENTER ]
```

El nombre apuntado es uno de los textos más brillantes y grandes del HUD. Sólo
el objetivo actual recibe cuatro brackets de esquina:

- idle: ninguno;
- hover/focus: cian/blanco sutil;
- selected: algo más brillante y estable.

La trayectoria es feedback: ausente en reposo, arco corto y tenue al apuntar y
recorrido mayor sólo cuando selected y útil. No aparece una elipse saturada de
golpe. El mundo puede intensificar apenas su rim; la combinación de mundo, HUD,
brackets, raíl y trayectoria crea vida sin que un efecto individual grite.

La información de hover no usa `aria-live`. El enlace enfocado del raíl ya
aporta nombre accesible y la ruta confirma la navegación.

## 9. Proxies de interacción

El canvas es decorativo y no recibe puntero. La escena **no usa React Three
Fiber ni raycasting para navegación**. El bug histórico de hover parcial nació
porque el hit target era la caja desplazada del rótulo, mucho menor que la
silueta visible.

Cada destino usa ahora un proxy DOM dedicado:

- comparte el centro proyectado `--map-x` / `--map-y`;
- consume el radio compuesto real `--map-radius`, incluidos anillos de Cooper y
  estructura extrema de Endurance;
- mide 110–135 % de la silueta según el arquetipo;
- conserva mínimo táctil de 44 px y fallback por mundo;
- etiqueta y proxy son hermanos: el texto nunca intercepta el puntero;
- queda `aria-hidden` y fuera de tabulación; el raíl sigue siendo el único
  recorrido accesible de siete enlaces;
- hover, leave y click alimentan el mismo TARGET y `navigateToWorld` que el raíl.

`/es?debugHitboxes=1` publica bounds translúcidos únicamente en desarrollo. El
modo no altera su tamaño, estado ni navegación y nunca aparece por defecto o en
producción. La prueba manual cruza centro, cuatro bordes y partes extremas de los
siete destinos; JSDOM sólo valida el contrato DOM, no geometría visual real.

## 10. Raíl y costura de navegación

El raíl inferior es selector de misión y único recorrido accesible 01→07. Su
gramática es índice, nombre, tick y espacio; no siete botones rectangulares.

- inactivo: TERTIARY, apagado pero legible;
- hover/focus: SECONDARY y foco geométrico;
- target/selected: PRIMARY blanco/cian y marcador corto.

Los enlaces conservan `href` y nombre accesible. Toda activación pasa por
`navigateToWorld(worldId)`: hoy cambia de ruta; una fase futura podrá resolver a
un ancla sin rehacer HUD, raíl, proxies ni TARGET.

## 11. Cursor de navegación y stardust

Esta capa sólo existe en desktop con `(hover: hover) and (pointer: fine)` y
dentro del System Map.

El cursor es un retículo mínimo. En espacio permanece pequeño; sobre un proxy
adopta estado target; al activar, locked. Sobre raíl y controles conserva una
afordancia convencional clara. Nunca es un crosshair grande ni sustituye el
cursor fuera del viewport.

El stardust usa un único canvas 2D decorativo y un pool circular de 112 slots en
typed arrays:

- capacidad fija; no hay React state ni objetos DOM por partícula;
- spawn sólo durante movimiento, de 1–5 motas según velocidad y con techo duro;
- vida aproximada de 320–680 ms, deriva baja y fade cuadrático;
- violeta, magenta y pink dominan; cian es raro;
- blend aditivo contenido, partículas diminutas y sin línea continua;
- el RAF sólo vive mientras existen partículas y se pausa con `document.hidden`.

No es un glitter brush, una cola de cometa ni un cursor neon. Al parar el puntero
desaparece rápido y nunca se convierte en otro campo de estrellas permanente.

## 12. Mobile y reduced-motion

Móvil no es desktop escalado:

- conserva cuerpos grandes y recompone su distribución;
- prioriza `JONAS ORBIT`, TARGET y raíl;
- oculta instrumentación GHOST antes de comprimirla;
- usa targets táctiles de al menos 44 px;
- mantiene un starfield estático denso;
- no monta cursor personalizado ni stardust y no los emula con el dedo.

`prefers-reduced-motion` conserva contenido, estrellas estáticas, estados,
focus, brackets estáticos y navegación. Desactiva stardust, animación del cursor,
respiración de cámara, paralaje, deriva del starfield, pulsos y adquisición no
esencial.

## 13. Accesibilidad y rendimiento

Los siete mundos se alcanzan por teclado mediante el raíl y el foco no depende
de glow o color. El canvas y las capas de partículas son `aria-hidden`, están
detrás del HTML y nunca son contenido ni candidato a LCP.

El starfield se agrupa por capa; el stardust se agrupa en un canvas con pool
fijo; los cuerpos comparten materiales y la interacción no hace raycast. No se
añade postprocesado costoso o bloom global para compensar problemas de escala o
luz. Se miden FPS, draw calls, GPU, memoria y DPR en hardware real.

## 14. Continuous Journey

El viaje continuo permanece **DEFERRED** y se documenta únicamente en
[`continuous-journey-phase.md`](continuous-journey-phase.md). `SYSTEM MAP ↑`
pertenece a esa fase. En la arquitectura actual las páginas vuelven a `/es` con
navegación convencional.

## 15. Gate de aprobación visual

Cada iteración se revisa con frame estático, estados y movimiento de puntero:

1. ¿Los mundos parecen destinos y no iconos?
2. ¿Gargantúa ilumina el sistema y sigue dominando?
3. ¿El cielo se siente profundo sin parecer nieve?
4. ¿Centro y bordes de los siete destinos activan hover?
5. ¿El HUD despierta y sigue siendo legible, no ruidoso?
6. ¿Endurance se reconoce como nave y Cooper como mundo memorable?
7. ¿El cursor y el stardust hacen el espacio reactivo sin parecer un gimmick?
8. ¿Touch y reduced-motion reciben una experiencia completa y tranquila?
9. ¿El frame estático ya se siente luminoso, vasto y premium?
10. ¿El universo se siente vivo aunque nada recorra una órbita?

Tests verdes son obligatorios, pero no responden estas preguntas. Hasta que la
evidencia visual en GPU real las responda, el Hero sigue siendo **candidato en
iteración**.
