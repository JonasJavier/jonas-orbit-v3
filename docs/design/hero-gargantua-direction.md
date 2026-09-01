# Hero / System Map — dirección artística vigente

**Estado:** candidato aprobado tras el pase de calidad de 2026-08-31. Esta
especificación guía implementación y revisión visual; compilar o pasar tests no
constituye por sí solo aprobación artística.

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

La petición explícita de 2026-08-31 sustituye la dirección anterior de nave
«original»: **Endurance debe reconocerse como la Endurance de _Interstellar_**,
sin reinterpretarla como otra estación radial. La reconstrucción procedural usa
doce módulos rectangulares independientes con huecos visibles, un gran centro
vacío, un único brazo radial hacia un hub compacto, cuatro módulos de motor y el
full stack de dos Ranger y dos Lander.

El casco comparte el lenguaje NASA/ISS de la miniatura: mantas térmicas blanco
roto y gris, recesos casi negros, paneles de servicio naranja muy localizados y
balizas pequeñas. El relleno frío separa el canto pero nunca vuelve azul la nave.
No hay toro continuo, rueda de radios ni kitbash ruidoso. Su escala de primer
plano la convierte en segunda ancla y su silueta completa entra en el volumen
interactivo.

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
dibujan agrupadas en un único canvas 2D. El mapa plano añade sólo siete cuerpos
visuales acotados —Gargantúa y seis destinos 2D—, no miles de meshes o nodos DOM.
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

## 12. Mobile, nivel `flat` y reduced-motion

Móvil no es desktop escalado:

- conserva cuerpos grandes y recompone su distribución;
- prioriza `JONAS ORBIT`, TARGET y raíl;
- oculta instrumentación GHOST antes de comprimirla;
- usa targets táctiles de al menos 44 px;
- mantiene un starfield estático denso;
- no monta cursor personalizado ni stardust y no los emula con el dedo.

El nivel `flat` no es un placeholder ni una pantalla de Gargantúa aislada. Debe
dibujar, desde el primer frame, la Gargantúa 2D y los seis destinos estáticos en
las mismas posiciones de composición del System Map:

- Tesseracto se reconoce por sus marcos anidados;
- Cooper por planeta, anillos y hábitat;
- Miller y Edmunds por sus discos, atmósferas y lenguaje material propio;
- Endurance por los doce módulos separados y su gran centro vacío;
- Ranger por su silueta baja y ancha de lifting body.

Estas representaciones son ligeras, no animadas y comparten terminador cálido,
fill frío y rim contenido. Conservan los proxies, brackets, estados TARGET y los
siete enlaces reales del raíl. No sustituyen el contenido ni duplican texto
accesible; son la representación visual estática del mismo mapa.

`prefers-reduced-motion` selecciona `flat` **por defecto** y, antes de cualquier
acción, conserva contenido, estrellas estáticas, cuerpos 2D, estados, focus,
brackets estáticos y navegación. Desactiva stardust, cursor animado, movimiento
local de los cuerpos, paralaje, deriva del starfield, pulsos y adquisición no
esencial.

La preferencia del sistema es el punto de partida seguro, no una prohibición
irreversible. En un dispositivo compatible aparece un control visible y
accesible para `ACTIVAR ANIMACIÓN`; sólo una activación explícita permite
montar WebGL y comenzar el movimiento. La escena activa ofrece un control
`MAPA SIN ANIMACIÓN` —o `REDUCIR EFECTOS` fuera del System Map— que devuelve
inmediatamente a `flat`. La elección se persiste y sigue siendo reversible;
nunca se inicia animación para ese visitante antes de su opt-in. La activación
no puede superar una incompatibilidad real de WebGL ni fabricar WebGL2 donde no
existe. `?no3d=1` preselecciona `flat`, pero el mismo control permite cambiar
después de opinión.

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

## 14 bis. Pase de calidad y vida (2026-08-31)

Refinamiento sobre la dirección aprobada, **no** un concepto nuevo. Lo que sigue
manda sobre cualquier descripción anterior de estos siete puntos.

### Escala de los destinos

| Destino | `size` antes | `size` ahora | Motivo |
| --- | --- | --- | --- |
| Endurance | 4.7 | 5.15 | Segundo ancla: sostiene la mirada y permite contar los doce módulos. |
| Ranger | 1.5 | 2.5 | Deja de ser una mota y conserva una silueta de lifting body legible. |
| Tesseracto | 2.05 | 2.7 | Conserva la jerarquía por encima de la Ranger tras su crecimiento. |
| Cooper Station | 2.16 | 2.45 | El sistema de anillos necesita superficie para leerse. |
| Miller | 3.0 | 3.05 | Ajuste fino. |
| Edmunds | 2.9 | 3.0 | Ajuste fino. |

Invariante que fija `bodies.test.ts`: Endurance > mundos mayores > objetos
lejanos, y Tesseracto > Ranger. Cambiar una escala sin comprobarlo rompe la
lectura del sistema aunque la escena siga compilando.

### Modelos

- **Endurance.** Doce módulos rectangulares separados, centro abierto, **un solo
  brazo radial**, hub compacto con dos Ranger y dos Lander, cuatro bloques de
  motor y doce campanas. Cuatro familias materiales fusionadas mantienen cuatro
  draws: manta/panel, estructura, servicio y balizas.
- **Ranger.** Lifting body bajo y ancho con planta de manta, cabina integrada,
  vientre oscuro de escudo térmico y toberas gemelas. Se reconoce como la
  lanzadera de la película, no como un caza con alas añadidas.
- **Cooper.** Un solo anillo con **división abierta por el shader** (`discard`),
  no dos mallas.
- **Tesseracto.** Dos cáscaras de retícula que contrarrotan; el espacio imposible
  sale del cruce de aristas, no de más aristas.

### Movimiento

Cada cuerpo tiene su propia velocidad de giro (`SPIN_RATE`) porque un mundo
necesita más vueltas que una estructura para contar lo mismo: lo que se ve girar
en un planeta es su relieve cruzando el terminador. Además, `BodyModel.animate`
mueve piezas DENTRO del cuerpo — anillo en su plano, hábitat en su órbita,
retículas contrarrotando, actitud de la Ranger. Nada recorre su trayectoria: el
sistema sigue congelado en composición.

**La cámara no respira.** La respiración vive en el cristal del HUD (2 px en 24 s)
y no en la pose, por dos razones que no son negociables: la pose sigue siendo
función pura de la ruta (regla 6 del repositorio) y la acumulación temporal del
raymarch necesita que la cámara se quede quieta para converger.

### HUD

- **Sin numeración.** Ni `01…07` en el raíl ni índice en el NAV TARGET. El orden
  narrativo existe en el DOM y en el tabulador; imprimirlo era ruido.
- **Sin lectura de movimiento.** `MOTION // REDUCED` se retiró del cristal: era
  telemetría persistente, no una acción. El estado sigue en
  `<html data-reduced-motion>` y el opt-in vive en un control separado, visible,
  descriptivo y reversible.
- **Copy corto.** El reposo usa `SYSTEM MAP / SELECT TARGET`; en móvil desaparece
  hasta que existe un objetivo porque el raíl ya comunica la acción.
- **Tres niveles opacos.** `--hud-primary` / `--hud-secondary` / `--hud-tertiary`
  son colores, no opacidades. La jerarquía se construye separando luminancias;
  bajar el alfa hasta desaparecer no es discreción, es niebla. El nivel más bajo
  cumple 4,5:1 contra el negro del espacio.

### Cristal del visor

Viñeta, reflejo frío del canto superior y marcas de calibración de 1 px. Ni una
mampara, ni un marco metálico, ni un instrumento con volumen. Criterio de
aceptación: si al describir la home alguien menciona el visor antes que
Gargantúa, está mal hecho.

## 15. Gate de aprobación visual

Cada iteración se revisa con frame estático, estados y movimiento de puntero:

1. ¿Los mundos parecen destinos y no iconos?
2. ¿Gargantúa ilumina el sistema y sigue dominando?
3. ¿El cielo se siente profundo sin parecer nieve?
4. ¿Centro y bordes de los siete destinos activan hover?
5. ¿El HUD despierta y sigue siendo legible, no ruidoso?
6. ¿Endurance se reconoce como nave y Cooper como mundo memorable?
7. ¿El cursor y el stardust hacen el espacio reactivo sin parecer un gimmick?
8. ¿Touch y reduced-motion reciben un System Map 2D completo y tranquilo, con
   opt-in 3D visible pero sin animación previa al consentimiento?
9. ¿El frame estático ya se siente luminoso, vasto y premium?
10. ¿El universo se siente vivo aunque nada recorra una órbita?

Tests verdes son obligatorios, pero no responden estas preguntas. La evidencia
de 2026-08-31 cubre frame estático, target de Endurance, target de Ranger, 390 px
y reduced-motion; el resultado queda como **candidato aprobado**.
