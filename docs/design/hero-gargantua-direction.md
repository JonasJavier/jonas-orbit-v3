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
doce módulos rectangulares independientes con huecos visibles, un hub central
dominante y cuatro brazos de doble larguero, cuatro módulos de motor y el full
stack de dos Ranger y dos Lander. Los módulos se agrupan en cuatro familias
repetidas cada 90°; el detalle confirma la estructura y no la sustituye.

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

La proyección canónica del hipercubo, construida como arquitectura: cubo
exterior, cubo interior concéntrico y ocho tirantes uniendo vértices homólogos.
Esa topología —y no el número de aristas— es lo que el ojo lee como «esto no cabe
en tres dimensiones». Dentro, una jaula emisiva de dos marcos cruzados a 45°
contrarrota como un giroscopio, con el núcleo en su centro.

Permanece misterioso y distante, pero no es un icono: es una estructura con
sección, juntas y luz propia.

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

Cuando WebGL está vivo, el stardust usa un único canvas 2D decorativo y un pool
circular de 300 slots en typed arrays. El perfil `flat` conserva el rastro ya
aprobado (420 slots, 1–14 motas y 520–1020 ms):

- capacidad fija; no hay React state ni objetos DOM por partícula;
- spawn sólo durante movimiento, de 1–9 motas según distancia y con techo duro;
- vida aproximada de 390–760 ms, deriva baja y fade cuadrático;
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
`MOTION / FULL`, un control compacto y accionable que devuelve inmediatamente a
`flat`. En el mapa 2D el control de activación conserva su copy explícito; no se
disfraza la entrada a WebGL como telemetría. La elección se persiste y sigue siendo reversible;
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
| Ranger | 1.5 | 2.6 | Deja de ser una mota y conserva una silueta de lifting body legible. |
| Tesseracto | 2.05 | 2.7 | Conserva la jerarquía por encima de la Ranger tras su crecimiento. |
| Cooper Station | 2.16 | 2.6 | El sistema de anillos necesita superficie para leerse. |
| Miller | 3.0 | 3.05 | Ajuste fino. |
| Edmunds | 2.9 | 3.0 | Ajuste fino. |

Este orden sigue vigente en `placement.size` y, por tanto, en el mapa `flat`.
WebGL lo complementa en §14 ter con escala perceptual y profundidad propias:
Ranger puede crecer sin tocar aquel layout y permanece subordinada a Endurance.

### Modelos

- **Endurance.** Doce módulos rectangulares separados, centro abierto, **cuatro
  brazos de doble larguero**, hub compacto con dos Ranger y dos Lander, cuatro bloques de
  motor y doce campanas. Un mapa térmico procedural de 128×128, con costuras,
  manta y máscaras de servicio, aporta lectura material sin descargar imágenes.
  Cuatro familias materiales fusionadas mantienen cuatro draws: manta/panel,
  estructura, servicio y balizas.
- **Ranger.** Lifting body bajo y ancho con planta de manta, cabina integrada,
  cristal frío, paneles de servicio cobre, vientre oscuro de escudo térmico y
  toberas gemelas. Su mapa procedural comparte el mismo presupuesto sin red. Se
  reconoce como la lanzadera de la película, no como un caza con alas añadidas.
- **Cooper.** Un solo anillo con **división abierta por el shader** (`discard`),
  no dos mallas.
- **Tesseracto.** Vigas reales de sección cuadrada con nodos facetados, no
  `LineSegments`. El espacio imposible sale de la topología del hipercubo, no de
  cruzar aristas al azar.

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
- **Movimiento como acción, no telemetría.** `MOTION / FULL` sólo aparece como
  control accionable dentro de la escena 3D. El mapa `flat` conserva
  `ACTIVAR 3D`, y `<html data-reduced-motion>` sigue siendo la fuente de estado.
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

## 14 ter. World Asset & Material Pass (2026-09-01)

Esta pasada es exclusivamente 3D. `FlatWorldBody`, sus tamaños, sus coordenadas
y el control de entrada al mapa plano permanecen intactos. `placement.size`
continúa siendo la composición compartida; WebGL normaliza cada asset mediante
`MODEL_SCALE` porque un anillo, una retícula y un lifting body no ocupan su esfera
envolvente del mismo modo.

### Assets y escala perceptual

- **Endurance:** hub central de tres diámetros, cuatro brazos de doble larguero
  con travesaños, doce módulos agrupados en cuatro familias, paneles sólo en los
  módulos de jerarquía y una única antena. Conserva cuatro familias de material.
- **Ranger:** lifting body, cockpit, proa, estabilizadores, escudo y motores
  crecen en geometría; el asset usa `1.22×` y su plano foreground completa un
  aumento aparente aproximado de `1.6×` sin falsear el mapa 2D.
- **Cooper:** `1.35×` en WebGL, planeta algo mayor, anillo de doble superficie
  con cantos físicos y hábitat con dos paneles, antena y dos luces.
- **Tesseracto:** `1.22×` y geometría sólida —vigas, tirantes y dieciséis nodos—
  en lugar de aristas de un píxel. Su detalle (chaflán, acoplamientos y canal de
  luz embutido) es procedural sobre las UV de viga, así que no tiene resolución:
  es la única pieza del sistema preparada para un acercamiento de cámara. La caja
  translúcida se retiró: en una caja el Fresnel es constante por cara y el
  «cristal» se veía como cuatro paneles grises planos.
- **Miller / Edmunds:** `1.12×` y más contraste material. Miller añade dos
  escalas de ola, espuma y glints; Edmunds añade escarpes y roughness mineral.

### Profundidad 3D

Los cuerpos conservan su centro proyectado: cada uno se desplaza sobre su propio
rayo cámara→cuerpo, y la misma traslación se aplica a su trayectoria. El orden es:

| Plano | Destinos | Offset |
|---|---|---:|
| foreground cercano | Ranger | +8 rs |
| foreground | Endurance | +4 rs |
| midground | Edmunds / Miller | +1 / 0 rs |
| mid-background | Cooper | −4 rs |
| lejano | Tesseracto | −7 rs |

La diferencia de perspectiva hace que el paralaje revele esos planos. La cámara
sigue siendo `f(routeWorldId)` y no recibe ningún controlador nuevo.

### Material, HUD y polvo

La cara noche de los mundos pierde fill y el terminador recibe una penumbra
cálida común desde Gargantúa. El metal estructural incorpora grano direccional;
los módulos principales de Endurance usan una máscara de acabado coherente.

En 3D, `ENDURANCE // NAV`, `SYSTEM NOMINAL`, el target y el destino activo ganan
contraste; ticks y calibración conservan GHOST. El control de salida se muestra
como `MOTION / ● FULL`, sin caja. Sólo durante WebGL, el stardust baja el pico de
alfa de `0.92` a `0.68`, reduce tamaño, vida y ráfaga, y mantiene su paleta
magenta; `flat` conserva exactamente su perfil anterior.

El presupuesto actualizado es ≤ 24 draws reales —incluidos los pases de caras
transparentes; hoy son 23— y < 18 000 vértices para Gargantúa, los seis cuerpos y
sus trayectorias. El techo de vértices subió de 15 000 cuando el Tesseracto pasó
a ser geometría: mil vértices más no los nota ninguna GPU de esta década, y son
lo que separa una estructura de un wireframe.

Hay un tercer presupuesto, menos obvio y más caro de romper: **≤ 12 sitios de
llamada a `fbm` en el fragment de los cuerpos**. Los seis comparten un único
programa, así que lo que se paga —en compilación y por píxel— es el número de
llamadas escritas, no el de materiales; cada una son cuatro octavas por ocho
`hash`. Con dieciséis sitios, montar la escena en el runtime software de CI pasó
de 1,7 s a 46–60 s con tres workers, hasta agotar el timeout de A28, mientras que
en una GPU real no se notaba nada. El detalle de alta frecuencia —microoleaje,
escarpes, vórtices, grano cepillado— se resuelve con `noise()` de una octava, que
a esa frecuencia se ve igual. Lo vigila un test en `components/scene/bodies.test.ts`.

## 14 quater. Pase de diseño industrial (2026-09-01)

Manda sobre §14 bis y §14 ter en **modelo de la Endurance, modelo y pose de la
Ranger, cáscaras del Tesseracto, escala perceptual, capas de profundidad y
fase de la Ranger**. El resto de las dos secciones sigue vigente.

Origen: revisión de dirección de arte sobre el frame de 2026-08-31. El
diagnóstico que la abre es el que ordena todo lo demás — «hay una diferencia
entre *tiene muchas piezas* y *se entiende cómo fue construida esta nave*, y
ahora estoy más cerca de lo primero».

### Endurance: jerarquía de lectura antes que detalle

Doce módulos iguales repartidos cada 30°, brazos de dos centímetros de canto y
un hub más pequeño que cualquiera de sus módulos no son una nave: son una nube
de cubos con complejidad procedural. El modelo se reconstruye alrededor de un
orden de lectura explícito, y en ese orden:

1. **Núcleo.** Barril axial con collar de atraque a proa y bloque de cuatro
   campanas a popa. Es la pieza individual más grande y la única que rompe el
   plano del anillo.
2. **Estructura primaria.** Dos rieles continuos cierran la circunferencia
   entera, también donde no hay módulos, más veinticuatro travesaños.
3. **Cuatro brazos.** Celosía real: dos cordones de 55 mm, cinco travesaños y
   cuatro diagonales alternas por brazo.
4. **Cuatro grupos de tres módulos.** Un módulo principal por brazo, dos
   satélites a 22° y 46° de riel desnudo entre grupos.
5. **Sistemas secundarios.** Cuatro radiadores en el plano del anillo, paneles
   de servicio, dos Ranger y dos Lander atracadas alternando cara, y balizas.

Rieles, cordones, horquillas y módulos van en el material de **casco** y no en
el de estructura: a tamaño de Hero el metal oscuro desaparece contra el fondo y
lo primero que tiene que verse es la circunferencia. La jerarquía la sostiene el
VALOR — manta estándar en gris medio, módulos principales en blanco casi puro,
estructura fina en grafito — y no el número de piezas.

Pose de reposo a **48° de frontal** en vez de 60°: la circunferencia se
reconoce, los brazos separan sus grupos y el núcleo sigue asomando por delante
del plano. El blanco de interacción acompaña ese cambio (`hitScaleY` 0.52 →
0.64).

`assembly.userData.enduranceArchitecture` publica esa arquitectura y un test la
fija: es el contrato que impide volver a repartir doce módulos iguales.

### Ranger: definición, pose fija y sitio nuevo

- **Modelo.** Fuselaje real con proa facetada de ocho caras, cabina de cristal
  hundida entre montantes, alas en flecha con larguero oscuro de borde de
  ataque, dos góndolas con anillo, campana y brasa, deriva en V y contenedores
  de punta de ala. La textura procedural de la Ranger deja de compartir
  gramática con la Endurance: junta marcada y remache, no manta acolchada.
- **Ya no gira.** `SPIN_RATE.beacon = 0`. Una nave con proa, cabina y toberas
  rotando sobre su eje longitudinal cada seis minutos parece una maqueta colgada
  de un hilo y convierte su orientación —que es información— en ruido. Le queda
  la corrección de actitud de menos de un grado, dentro del modelo.
- **Pose por base ortonormal**, no por tres ángulos de Euler. Se declara dorso y
  proa: el dorso apunta al punto medio entre cámara y Gargantúa —visible al
  70 % y con dos tercios de la clave— y la proa señala a la Endurance. Es lo que
  cumple «iluminación cálida mucho más clara proveniente de Gargantúa» para un
  cuerpo aerodinámico, que al contrario que la Endurance no tiene doce caras
  encaradas a la luz.
- **Fase 105° y radio 24 rs**, antes 180° y 30. Estaba en el borde izquierdo del
  cuadro, sola, alineada con el centro y en el punto más lejano de su
  trayectoria. Ahora ocupa el único hueco grande del encuadre —abajo, por
  delante del plano del disco—, gana un tercio de tamaño aparente sin tocar su
  escala y cierra el triángulo con Endurance y Edmunds. El mapa `flat` usa la
  misma fase, así que las dos vistas siguen contando lo mismo.
- **Contraluz dedicado** en el material: envoltura de la luz en el canto más un
  término ámbar corto. A 122° entre luz y cámara, la respuesta correcta no es
  subir el difuso —no existe— sino el filo.

### Tesseracto: tres cáscaras

Era el destino más pequeño en pantalla y el más hundido en profundidad, dos
factores multiplicándose. Ahora lleva **tres cáscaras concéntricas** en
progresión geométrica (0.56 / 0.325 / 0.185) y dieciséis tirantes en dos tramos:
la fuga doble es lo que el ojo lee como profundidad imposible. El pozo interior
tiene máscara propia y **temperatura de luz más fría**, así que el fondo del
túnel se distingue del borde a treinta píxeles. La jaula contrarrotante y el
núcleo siguen igual.

### Cooper: sombra de anillos proyectada

La sombra dejó de ser una franja de latitud pintada alrededor del ecuador. Se
traza el rayo: la dirección de la luz llega al espacio local del cuerpo desde el
vertex shader y se corta el plano del anillo. La densidad usa las mismas bandas
y la misma división que dibuja el anillo, así que la división cruza el planeta.
Sin shadow map y sin una sola llamada más de ruido. El planeta abre rango tonal
—cinturón ecuatorial claro, casquetes fríos, óvalos de tormenta alargados por
muestreo anisótropo— y gana diez grados de inclinación.

### Mundos con relieve iluminado

Miller y Edmunds ganan **sombra propia** sin coste de ruido: sumas de ondas
direccionales cuyo gradiente es analítico —la derivada de un seno es un coseno—
desplazan el término lambert punto a punto. El terminador deja de ser una curva
limpia y se convierte en una banda rota, que es lo que hace que una esfera
parezca un mundo con sitios. Edmunds además reordena su paleta: dos terrenos con
umbral duro —cobre alto y basalto de cuenca— en vez de cinco escalas de ruido
pintando color, más sales secas en los fondos. Miller pasa a tres profundidades
de agua, nubes alargadas y un reflejo especular mucho más cerrado.

### Escala perceptual y profundidad

| Destino | `MODEL_SCALE` | Capa de profundidad | Tamaño aparente |
| --- | ---: | ---: | ---: |
| Endurance | 1.0 | +4 rs | +9 % |
| Ranger | 1.75 | +5 rs | +22 % |
| Cooper Station | 1.6 | −1 rs | +22 % |
| Tesseracto | 1.45 | −3 rs | +27 % |
| Miller | 1.12 | 0 rs | = |
| Edmunds | 1.12 | +1 rs | = |

`placement.size` no cambia salvo en la Ranger —que se mueve de fase y radio—,
así que el mapa `flat` conserva su composición.

La escala perceptual de la Ranger sube a 1.75 porque el modelo nuevo es **más
compacto** que el anterior: fuselaje de verdad en vez de dos alas anchas. Sin
esa corrección, un rediseño pensado para hacerla crecer la habría encogido.

El radio publicado de Cooper deja de incluir su hábitat orbital: mide lo que el
visitante llama «Cooper Station» —planeta y anillos— y no la caja envolvente de
todo lo que orbita ahí. `modelRadius` acepta poda de subárbol para eso.

### La medida es el tamaño APARENTE

El radio métrico solo miente. El Tesseracto mide 3.99 rs contra los 3.42 de
Miller y aun así se ve más pequeño, porque vive veinte radios más lejos. La
jerarquía se comprueba en `bodies.test.ts` sobre radio partido por distancia a
cámara: Endurance domina por más de 1.5×, el Tesseracto es el más pequeño pero
tiene suelo, y la Ranger se queda entre los dos.

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
