# Hero / System Map — dirección artística vigente

> **Decisión vigente del dueño · 2026-09-04:** el sistema tiene exactamente seis destinos: Tesseracto, Miller, Endurance, Edmunds, Gargantúa y Ranger. Cooper Station y `/es/formacion` están retirados, sin sustituto ni reasignación editorial. El [contrato de seis destinos](sistema-seis-destinos.md) sustituye cualquier número, pose, destino o bloqueo de posición anterior que lo contradiga. Los registros fechados de fases anteriores son evidencia histórica, no instrucciones para reintroducir objetos. La nueva composición queda pendiente de aprobación visual del dueño.


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
| 4 | **Tesseracto y Ranger** | +15–25 % | destinos menores pero localizables |

Estos porcentajes son calibración visual, no un multiplicador uniforme ni una
API. Cada modelo conserva su volumen compuesto para cámara, brackets e
interacción. Ningún destino debe requerir búsqueda consciente y ningún lado del
viewport queda muerto por conservar el layout del antiguo copy.

Gargantúa permanece sin rótulo permanente: escala, sombra y disco ya establecen
su identidad.

> **Corregido por §14 quinquies (2026-09-01).** La fila 1 se quedaba corta:
> Gargantúa crece un 39 % de tamaño aparente vía `rs`, hasta el 45.7 % del ancho
> del viewport. La fila 2 baja un 11 %. El resto de la tabla sigue vigente.

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
dibujan agrupadas en un único canvas 2D. El mapa plano añade sólo seis cuerpos
visuales acotados —Gargantúa y cinco destinos 2D—, no miles de meshes o nodos DOM.
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
- consume el radio compuesto real `--map-radius`, incluidos
  estructura extrema de Endurance;
- mide 110–135 % de la silueta según el arquetipo;
- conserva mínimo táctil de 44 px y fallback por mundo;
- etiqueta y proxy son hermanos: el texto nunca intercepta el puntero;
- queda `aria-hidden` y fuera de tabulación; el raíl sigue siendo el único
  recorrido accesible de seis enlaces;
- hover, leave y click alimentan el mismo TARGET y `navigateToWorld` que el raíl.

`/es?debugHitboxes=1` publica bounds translúcidos únicamente en desarrollo. El
modo no altera su tamaño, estado ni navegación y nunca aparece por defecto o en
producción. La prueba manual cruza centro, cuatro bordes y partes extremas de los
seis destinos; JSDOM sólo valida el contrato DOM, no geometría visual real.

## 10. Raíl y costura de navegación

El raíl inferior es selector de misión y único recorrido accesible 01→06. Su
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
circular de 340 slots en typed arrays. El perfil `flat` conserva el rastro ya
aprobado (420 slots, 1–14 motas y 520–1020 ms):

- capacidad fija; no hay React state ni objetos DOM por partícula;
- spawn sólo durante movimiento, de 1–12 motas de cuerpo según distancia y con
  techo duro, más 0,75 motas finas por cada una de cuerpo;
- vida aproximada de 560–1000 ms, deriva baja y fade en potencia ≥ 1;
- violeta, magenta y pink dominan; cian es raro;
- blend aditivo contenido, partículas diminutas y sin línea continua;
- el RAF sólo vive mientras existen partículas y se pausa con `document.hidden`.

No es un glitter brush, una cola de cometa ni un cursor neon. Al parar el puntero
desaparece rápido y nunca se convierte en otro campo de estrellas permanente.

### 11 bis. Retículo de instrumentación (2026-09-05)

Sustituye la figura del retículo, no su contrato: sigue viviendo sólo en desktop
fine-pointer dentro del System Map, sigue cediendo el puntero nativo a raíl y
controles, y sigue teniendo los mismos cuatro estados.

Lo que cambia es qué se dibuja. La cruz de cuatro trazos con punto central era
legible sobre el cielo del perfil plano y desaparecía sobre el disco: cuatro
líneas de 1 px sin anillo que las agrupe no forman figura, y sin figura no hay
nada que el ojo pueda seguir. La forma nueva es de cabina:

- **anillo exterior** que agrupa el conjunto y da la silueta;
- **núcleo concéntrico** —anillo pequeño con chispa dentro— que marca el punto
  exacto y aporta el único halo del retículo;
- **dos marcas laterales** separadas del anillo por aire. El aire es la mitad
  del efecto: pegadas al anillo se leen como cruz, separadas como calibración.

Los estados dejan de ser tres tamaños de la misma cruz y pasan a ser tres
figuras distintas:

- `space` — anillo cerrado, marcas cerca, presencia baja;
- `target` — el anillo se ABRE: los bordes laterales se vuelven transparentes y
  el círculo pasa a dos arcos que barren en 3,6 s. Los huecos giran con ellos,
  así que la lectura horizontal la sostienen las marcas laterales, que no rotan
  nunca. Acento del destino activo;
- `locked` — el anillo se CIERRA sobre el objetivo mientras las marcas se quedan
  fuera. Es un gesto de agarre, no un tamaño intermedio;
- `control` — oculto, cursor nativo.

Sigue vigente «nunca es un crosshair grande»: el vano marca-a-marca es 2,2 rem
en reposo y 3 rem sobre objetivo. El barrido es el único movimiento perpetuo de
la capa y se apaga bajo `prefers-reduced-motion` aunque el resto siga vivo tras
una activación explícita.

### 11 ter. Presencia del stardust en WebGL (2026-09-05)

Por petición del dueño. La pasada de WebGL se diseñó como una atenuación de
`flat` bajo el supuesto de un fondo oscuro, y ese supuesto no se cumple: el
disco de Gargantúa ocupa el centro del encuadre con naranjas casi saturados, y
un blend aditivo sobre casi-blanco no suma nada. El polvo existía en el pool y
no en la pantalla.

Sube pico de alfa (0,68 → 0,88), capacidad (300 → 340), ráfaga (9 → 12), tamaño
y vida (390–760 → 560–1000 ms), y baja el paso de siembra (8 → 6,5 px). El
parámetro decisivo es otro: la **curva de apagado** pasa de cuadrática a
potencia 1,2 (en dos pases). El apagado cuadrático gastaba la mitad del brillo en
el primer tercio de vida, así que la mota nacía, se apagaba casi entera y
arrastraba un rabo invisible; con 1,2 la caída sigue siendo caída y la mota se
lee durante el tramo en que el ojo la sigue.

**La vida no es la permanencia.** El segundo pase se pidió como «que se quede un
poco más antes de deshacerse» y se atacó primero por `maxLifetimeMs`: medido a
500 ms de soltar el gesto, 900 ms y 1000 ms de vida dan la misma pantalla. Los
milisegundos extra caen enteros por debajo del umbral visible. Quien manda sobre
la permanencia percibida es el exponente, porque sube el brillo de todo el tramo
medio de la vida a la vez; la vida sólo fija el techo. Cualquier petición futura
de «que dure más» se resuelve ahí, no en los milisegundos.

Los topes que impiden que esto derive en cola de cometa quedan fijados en test:
alfa, ráfaga y vida máxima de `webgl` no superan a `flat`, y ningún perfil
admite exponente de apagado menor que 1. `flat` no se toca.

Aviso para el siguiente pase: tras la subida de vida, `webgl` queda a 20 ms del
techo de `flat`. Alfa conserva margen; la vida no. Si vuelve a pedirse más
permanencia, lo que hay que reabrir es el techo de 1020 ms del efecto —una
decisión de dirección— y no seguir arañando este número.

### 11 quater. Dos calibres de mota (2026-09-05)

Por petición del dueño: «aparte de las partículas que están, necesito más
finas». Se añade una segunda clase POR ENCIMA de la anterior —0,75 motas finas
por cada mota de cuerpo, al 38 % de su tamaño—, no en su lugar: el rastro
aprobado no pierde ni una mota. La fina se despega más de la línea y deriva algo
más rápido, para que no se lea como un engrosamiento de la gruesa.

Lleva **sprite propio**, y eso no es un detalle de implementación. El sprite de
cuerpo reparte la energía en un halo ancho; dibujado a dos píxeles, ese halo
ocupa medio píxel de gradiente y devuelve gris sucio en vez de un grano. El
sprite fino concentra la energía en el núcleo, que es lo único que sobrevive al
reescalado. Capacidad del pool: 340 → 520.

Con esto `maxBurst` deja de significar «motas por evento»: WebGL siembra 21
frente a las 14 de `flat`. Lo que el tope acota son las motas de CUERPO, que son
las que aportan masa luminosa. El tope de ráfaga sólo protege algo acompañado
del de calibre — si `fineSizeScale` se acercara a 1, «fina» sería una segunda
capa de cuerpo por la puerta de atrás. Ambos quedan fijados en test.

## 12. Mobile, nivel `flat` y reduced-motion

Móvil no es desktop escalado:

- conserva cuerpos grandes y recompone su distribución;
- prioriza `JONAS ORBIT`, TARGET y raíl;
- oculta instrumentación GHOST antes de comprimirla;
- usa targets táctiles de al menos 44 px;
- mantiene un starfield estático denso;
- no monta cursor personalizado ni stardust y no los emula con el dedo.

El nivel `flat` no es un placeholder ni una pantalla de Gargantúa aislada. Debe
dibujar, desde el primer frame, la Gargantúa 2D y los cinco destinos estáticos en
las mismas posiciones de composición del System Map:

- Tesseracto se reconoce por sus marcos anidados;
- Miller y Edmunds por sus discos, atmósferas y lenguaje material propio;
- Endurance por los doce módulos separados y su gran centro vacío;
- Ranger por su silueta baja y ancha de lifting body.

Estas representaciones son ligeras, no animadas y comparten terminador cálido,
fill frío y rim contenido. Conservan los proxies, brackets, estados TARGET y los
seis enlaces reales del raíl. No sustituyen el contenido ni duplican texto
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

Los seis mundos se alcanzan por teclado mediante el raíl y el foco no depende
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
| Miller | 3.0 | 3.05 | Ajuste fino. |
| Edmunds | 2.9 | 3.0 | Ajuste fino. |

Este orden sigue vigente en `placement.size` y, por tanto, en el mapa `flat`.
WebGL lo complementa en §14 ter con escala perceptual y profundidad propias:
Ranger puede crecer sin tocar aquel layout y permanece subordinada a Endurance.

Los VALORES de esta tabla los sustituye el pase de autoridad de §14 quáter; el
orden que fija, no.

## 14 quáter. Pase de autoridad de Gargantúa (2026-09-05)

Ajuste de escala sobre la dirección aprobada. Manda sobre la tabla de §14 bis y
sobre la columna de `size` de [`sistema-seis-destinos.md`](sistema-seis-destinos.md);
no toca posición, fase, inclinación, cámara, material ni HUD.

El diagnóstico del dueño: el orden de lectura declarado se cumplía, pero lo
primero que se percibía era *el sistema de objetos*, no *el monstruo
gravitacional*. Gargantúa ya dominaba; podía dominar más sin romper el balance.

**Los cinco destinos encogen, y no todos igual.** Reducirlos por parejo habría
conservado el problema a otra escala, así que el recorte va por cuánto compite
cada cuerpo con el centro:

| Destino | `size` antes | `size` ahora | Δ | Motivo |
| --- | --- | --- | --- | --- |
| Endurance | 5.15 | 4.64 | −10 % | El único que competía de verdad, y no sólo por tamaño: masa blanca, mucho detalle por unidad de silueta y el sitio más cercano al centro visual. De paso su silueta deja de rozar la cola derecha del disco. |
| Miller | 3.05 | 2.81 | −8 % | Se leía como protagonista individual pese a estar lejos. |
| Edmunds | 3.0 | 2.76 | −8 % | Mismo recorte que Miller, para que la relación entre los dos planetas —dos profundidades— se conserve exacta. |
| Tesseracto | 2.87 | 2.71 | −5.6 % | Apenas: su lectura depende de la silueta y encoge mal. Sigue por encima del 2.7 previo a la recomposición. |
| Ranger | 2.0 | 1.93 | −3.5 % | Casi nada. Ya era el acento pequeño; por debajo de esto deja de ser una nave. |

**Gargantúa no se toca y aun así crece.** El encuadre se mide contra la
envolvente de los cuerpos, así que encogerlos ACERCA la cámara: la sombra pasa
de 45.9 a 46.7 px de radio a 1440×860 sin tocar una sola constante suya. Radio
de cada destino en proporción a esa sombra, medido con `tools/composition.mjs`:

| Destino | antes | ahora |
| --- | --- | --- |
| Endurance | 3.16× | 2.86× |
| Ranger | 1.63× | 1.59× |
| Tesseracto | 1.41× | 1.33× |
| Edmunds | 1.30× | 1.19× |
| Miller | 1.11× | 1.02× |

**Criterio de aceptación**, y también la señal de cuándo parar si alguien quiere
seguir bajando:

1. Acierto si se ve primero Gargantúa, luego el sistema entero y por último los
   objetos.
2. Se pasó si aparece demasiado vacío y los cuerpos se leen tímidos o lejanos.

La banda de guardia del radio del Tesseracto en `bodies.test.ts` baja de
[4.8, 5.3] a [4.55, 5.05] para acompañar este recorte. Sigue siendo una banda:
lo que prohíbe es que ese cuerpo cambie de tamaño sin que nadie lo decida.

## 14 quinquies. Pase de respiración (2026-09-05)

Continuación del anterior, el mismo día. Manda sobre la posición de Miller y del
Tesseracto; no toca tamaño, cámara, material ni HUD, y deja los otros tres
cuerpos exactamente donde estaban.

### El diagnóstico, que no era el obvio

Con la jerarquía ya resuelta, el dueño señaló que **Miller se leía pegado a
Gargantúa**. La explicación natural —está demasiado cerca— resultó ser falsa: a
234 px de separación estaba igual de lejos que el Tesseracto, que se lee suelto.

Lo que decide si dos cosas se leen separadas no es cuánto hay entre ellas, sino
si ese hueco **llega a negro**. Recorriendo sobre el render real el segmento que
une cada cuerpo con Gargantúa, el punto más oscuro del camino marca:

| Cuerpo | valle (luma) | banda oscura | separación |
| --- | --- | --- | --- |
| Miller | **22.4** | 19 px | 234 px |
| Ranger | 17.5 | 24 px | 174 px |
| Tesseracto | 6.0 | 44 px | 226 px |
| Edmunds | 3.5 | 55 px | 424 px |
| Endurance | 1.9 | 66 px | 309 px |

Miller era el único que nunca tocaba fondo, y la causa es de composición, no de
distancia: caía justo encima del **arco superior lensado**, la parte más
brillante del cuadro, con el halo subiendo a su encuentro. Con 19 px de banda
oscura el ojo lo agrupaba con el disco — exactamente lo que reportó el dueño.

### El movimiento

| Cuerpo | antes | ahora | Despeje a la zona brillante | Posición |
| --- | --- | --- | --- | --- |
| Miller | 26 / 242 / 31 | 28 / 240 / 37 | 26 → **67 px** | 32.0 / 30.0 → 29.7 / 25.6 |
| Tesseracto | 30 / 298 / 26 | 32 / 300 / 30 | 48 → **93 px** | 57.9 / 24.7 → 59.4 / 20.6 |

(radio de órbita / fase / inclinación; posición en % de ancho y alto a 1440×860)

Sobre el render, el valle de Miller baja de 22.4 a **11.7** y su banda oscura
sube de 19 a **30 px**. El del Tesseracto baja de 6.0 a 4.1 con 79 px de banda.

El Tesseracto se mueve mucho menos a propósito: el dueño lo describió como
*"oscuro y menos masivo, no molesta tanto"*, y la medición le daba la razón.
Su radio de órbita sube **a la vez** que el de Miller para conservar su identidad
de cuerpo más exterior del sistema.

### Lo que este pase no gasta

- **Gargantúa.** La cámara se queda clavada en 75.8 rs y la sombra en 46.7 px.
  Ninguno de estos dos cuerpos fija el encuadre — lo fijan los que tocan los
  bordes del cuadro—, así que moverlos sale gratis. Esto NO es general: subir a
  Miller por inclinación sí costaba un 11 % del radio de sombra en la
  composición anterior.
- **Tamaño.** Miller mide 47.5 px antes y después; el Tesseracto 61.9 → 61.6.
  Se mueven, no encogen: §14 quáter queda intacto.

### Guardas respetadas

Todas vienen de decisiones ya tomadas y ninguna se reabre:

1. Miller **no** vuelve a la esquina que dirección rechazó — aquélla estaba en
   25.6 % / 17.4 %; ésta queda en 29.7 % / 25.6 %.
2. Sigue **cinco puntos por debajo** del Tesseracto, sin formar con él la línea
   superior que ya se rechazó una vez.
3. El vacío de la esquina superior izquierda sigue ahí, a propósito.
4. La órbita de Miller sigue por dentro de la del Tesseracto, y ninguna entra en
   el disco de acreción.

## 14 sexies. Segundo recorte de escala (2026-09-05)

Tercera pasada del mismo día, y de naturaleza distinta a las dos anteriores.
Manda sobre la columna `size` de §14 quáter; no toca posición, fase,
inclinación, cámara, material ni HUD.

§14 quáter arreglaba una jerarquía rota — la escena decía *objetos* donde tenía
que decir *agujero negro*. Aquí no hay nada roto: el dueño pide margen extra, en
porcentajes pequeños y distintos por cuerpo. Conviene tenerlo escrito, porque a
la hora de leer la tabla la diferencia de propósito explica por qué los números
son diez veces menores.

| Destino | `size` antes | `size` ahora | Δ | Radio publicado (rs) |
| --- | --- | --- | --- | --- |
| Endurance | 4.64 | 4.547 | −2 % | 6.629 → 6.496 |
| Tesseracto | 2.71 | 2.669 | −1.5 % | 4.796 → 4.723 |
| Miller | 2.81 | 2.782 | −1 % | 3.147 → 3.116 |
| Edmunds | 2.76 | 2.732 | −1 % | 3.091 → 3.060 |
| Ranger | 1.93 | 1.92 | −0.5 % | 2.590 → 2.577 |

El reparto conserva el orden de §14 quáter —quien más compite con el centro,
más cede— a una décima parte de su magnitud. Ningún recorte es visible por sí
solo; lo que se mueve es la suma.

**Gargantúa vuelve a crecer sin tocarse**, aunque bastante menos que la vez
anterior, y el motivo conviene dejarlo escrito: el encuadre se mide contra la
envolvente de los cuerpos **y contra el borde del disco de acreción**, y desde
§14 quáter quien manda es casi siempre el disco. Encoger los destinos ya no
acerca la cámara en la misma proporción, sólo en la parte que todavía depende de
ellos. Medido con `tools/composition.mjs` a 1440×860, antes → después:

| Destino | radio en px | vs. sombra de Gargantúa |
| --- | --- | --- |
| Endurance | 147.3 → 144.9 | 3.223× → **3.157×** |
| Ranger | 71.5 → 71.6 | 1.565× → **1.560×** |
| Tesseracto | 60.7 → 59.9 | 1.328× → **1.305×** |
| Edmunds | 54.6 → 54.2 | 1.195× → **1.181×** |
| Miller | 46.7 → 46.4 | 1.022× → **1.011×** |
| Gargantúa | 45.7 → 45.9 | — |

La columna que importa es la tercera: cada cuerpo cede contra el centro
exactamente el porcentaje pedido. La segunda engaña —la Ranger incluso *gana*
una décima de píxel— porque la cámara se acerca a la vez que ella encoge, y a
−0.5 % las dos cosas se cancelan. Es la comprobación de que el recorte es
relativo a Gargantúa y no una reducción del sistema entero.

**Ninguna guarda se roza.** La que más aprieta es la ventaja de tamaño aparente
de la Endurance sobre el resto, que pasa de 2.045 a 2.014 contra un suelo de
1.4; el radio del Tesseracto queda en 4.723 dentro de su banda [4.55, 5.05], con
0.17 rs por debajo; Miller sigue siendo el menor tamaño aparente y la Ranger
sigue entre el Tesseracto y el 65 % de la Endurance. Que un recorte de este
tamaño no acerque ningún test es lo que confirma que es un ajuste fino y no una
decisión de composición disfrazada.

### Modelos

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

### Profundidad 3D

Los cuerpos conservan su centro proyectado: cada uno se desplaza sobre su propio
rayo cámara→cuerpo, y la misma traslación se aplica a su trayectoria. El orden es:

| Plano | Destinos | Offset |
|---|---|---:|
| foreground cercano | Ranger | +8 rs |
| foreground | Endurance | +4 rs |
| midground | Edmunds / Miller | +1 / 0 rs |
| lejano | Tesseracto | −7 rs |

La diferencia de perspectiva hace que el paralaje revele esos planos. La cámara
sigue siendo `f(routeWorldId)` y no recibe ningún controlador nuevo.

### Material, HUD y polvo

La cara noche de los mundos pierde fill y el terminador recibe una penumbra
cálida común desde Gargantúa. El metal estructural incorpora grano direccional;
los módulos principales de Endurance usan una máscara de acabado coherente.

En 3D, `ENDURANCE // NAV`, `SYSTEM NOMINAL`, el target y el destino activo ganan
contraste; ticks y calibración conservan GHOST. El control de salida se muestra
como `MOTION / ● FULL`, sin caja. Sólo durante WebGL, el stardust usa su propio
perfil —pico de alfa `0.88`, ráfaga y vida por debajo de `flat`, caída de alfa
más larga— y mantiene su paleta magenta; `flat` conserva exactamente su perfil
anterior. Los números vigentes están en §11 ter.

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
| Tesseracto | 1.45 | −3 rs | +27 % |
| Miller | 1.12 | 0 rs | = |
| Edmunds | 1.12 | +1 rs | = |

`placement.size` no cambia salvo en la Ranger —que se mueve de fase y radio—,
así que el mapa `flat` conserva su composición.

La escala perceptual de la Ranger sube a 1.75 porque el modelo nuevo es **más
compacto** que el anterior: fuselaje de verdad en vez de dos alas anchas. Sin
esa corrección, un rediseño pensado para hacerla crecer la habría encogido.

### La medida es el tamaño APARENTE

El radio métrico solo miente. El Tesseracto mide 3.99 rs contra los 3.42 de
Miller y aun así se ve más pequeño, porque vive veinte radios más lejos. La
jerarquía se comprueba en `bodies.test.ts` sobre radio partido por distancia a
cámara: Endurance domina por más de 1.5×, el Tesseracto es el más pequeño pero
tiene suelo, y la Ranger se queda entre los dos.

## 14 quinquies. Escala de Gargantúa y peso visual de Endurance (2026-09-01)

Corrección de jerarquía: la escena se leía como «hay varios objetos espaciales»
y sólo después como «estoy frente a un agujero negro». Gargantúa y Endurance se
disputaban la primera lectura. Esta sección manda sobre §2 y §4 en escala de
Gargantúa, encuadre y peso visual de Endurance.

### El único parámetro que mueve la jerarquía es `rs`

Medido, no supuesto. La distancia de encuadre la fijan los DESTINOS, así que:

- **escalar las órbitas no hace nada.** La cámara retrocede en la misma
  proporción y la imagen resultante es idéntica. Es un zoom.
- **acercar la cámara tampoco**, por lo mismo: si los destinos tienen que
  seguir en cuadro, no hay dónde acercarse.
- **bajar el margen de encuadre sí**, pero ese margen es la separación con el
  HUD y el raíl: gastarlo mete la Ranger debajo de la barra de navegación.

Queda `rs`, que es lo único que cambia el tamaño RELATIVO entre el agujero negro
y el sistema sin tocar la distancia de encuadre. Vive en `gargantua-shaders.ts`
como `GARGANTUA_RS` y el shader lo recibe como uniform: sombra, esfera de
fotones, lente y disco se derivan todos de él, porque en un agujero negro real
también se derivan todos de la masa.

### El techo lo pone la órbita más interior

El disco llega a 17·rs, así que el destino más cercano fija el máximo de `rs`.
Mientras los interiores estuvieron en 22-23.5 rs, ese techo era **1.29**: por
encima, los destinos caían literalmente dentro del disco. La revisión descartada
usaba 1.48 con esas órbitas —el disco alcanzaba 25 rs— y por eso Endurance y
Edmunds aparecían encima de él y el sistema se leía apelotonado.

El techo se levantó moviendo los destinos, no forzando el número: Endurance,
Edmunds y Miller pasan a 25-27 rs (ver `worlds.data.ts`) y el máximo sube a
~1.47.

Valor adoptado: **1.40**. En 16:9 el disco visible pasa del 32.9 % del ancho
—el original— al **45.7 %**, un 39 % más de tamaño aparente. El destino más
cercano queda a **1.22 veces** el semieje de la elipse visible del disco:
prácticamente el mismo aire que antes de todo esto, porque las órbitas están
inclinadas y el disco se ve casi de canto. El solapamiento que queda es el que
pidió dirección, sutil y en profundidad.

### La toma está descentrada

`targetShiftFraction = -0.075` y `targetShiftYFraction = 0.025` dejan la sombra
un 3.6 % del ancho a la izquierda y un 2.7 % del alto por debajo del centro. La
simetría perfecta es lo que hacía leer «diagrama»: el centro geométrico del
visor es el único sitio donde un objeto no parece encuadrado por nadie.

El corrimiento vertical es nuevo en el contrato de cámara. Y el encuadre pasa a
usar el VALOR ABSOLUTO del corrimiento al calcular cuánto cuadro le queda: con
el corrimiento negativo, la fórmula anterior creía tener más ancho, no menos, y
habría sacado de cuadro el destino del lado corto.

### Endurance deja de competir

El problema no era el tamaño sino el CONTRASTE: blanca, con mucha geometría por
unidad de silueta y cerca del centro visual.

- Módulos principales de 0.99 a **0.72** de albedo. A la intensidad de clave de
  esta órbita, 0.99 satura el canal y la manta deja de tener material: pasa a
  ser papel recortado.
- Manta general a 0.47 y grafito a 0.13: el salto de valor sigue existiendo,
  pero dentro de un rango que no reclama la mirada.
- El término ambiente plano de la nave baja de 0.048 a 0.018. Era luz que
  llegaba por igual a todas las caras y le quitaba a Gargantúa el trabajo de
  explicar los volúmenes.
- Suelo de relleno nocturno de 0.62: por debajo, los huecos entre módulos caen a
  negro y la nave se lee como confeti blanco y negro alrededor de un aro.
- Escala del modelo a 0.94, que con el descentrado queda en **−9 % aparente**.

De paso, el `coldRim` de las naves usaba `smoothstep` con `edge0 > edge1`, que
es comportamiento indefinido en GLSL ES. Funcionaba por suerte del compilador.

### Fase 2 — luz común (2026-09-01)

Objetivo: que todo pertenezca al mismo espacio físico. El cambio no está en los
materiales sino en que **todos obedezcan la misma ley de luz**.

### Fase 2.5 — Gargantúa a su nueva escala (2026-09-01)

Al pasar del 33 % al 46 % del ancho, el disco empezó a enseñar defectos que a un
tercio de pantalla no se percibían: se leía como curvas dibujadas sobre una
superficie en vez de como material orbitando. Esta fase toca **sólo** el disco y
la lente; composición, cámara, escala y cuerpos quedan congelados.

**La jerarquía de frecuencias estaba invertida.** El ruido se muestreaba a
frecuencia fija en unidades de mundo, y a radio r la circunferencia mide 2πr: el
exterior salía fino y el interior ancho, justo al revés de lo que cuenta un
disco de acreción. Ahora la frecuencia sube hacia dentro —el material cercano al
horizonte se lee comprimido y estirado— y la transición se perturba con el campo
de deformación para que sus isocurvas no sean circunferencias.

**Las corrientes son de cresta, mezcladas con bulto.** El valor absoluto plegado
del fbm da filamentos que se bifurcan y se cortan solos; mezclado al 45 % con el
fbm suave, aporta las bifurcaciones sin perder el flujo orbital, que sigue
mandando. Se añade una segunda escala de deformación de dominio, muy gruesa y
barata (dos valueNoise), para que el paso de la espiral no sea el mismo en todo
el contorno.

**Interrupciones con profundidad variable.** El corte de las corrientes sale de
campos ya calculados, y su PROFUNDIDAD la modula otro: con profundidad fija el
resultado es un ritmo de «segmento, hueco, segmento» tan reconocible como la
línea continua que sustituye. Así unos cortes adelgazan y otros interrumpen, y a
veces dos corrientes vecinas se funden.

**La corona marrón desaparece por fragmentación, no por otro color.** El radio
donde muere el material varía con el propio campo turbulento —que se muestrea en
el marco contrarrotado, así que los jirones prolongan la dirección del flujo—.
El disco se pierde en negro por filamentos y ya no hay una frontera del mismo
grosor en todo el contorno.

**Asimetría con dirección.** El exponente del beaming sube de 2.4 a 3.1 y el
suelo baja a 0.16 —no más: por debajo, el lado que se aleja deja de tener
material y se convierte en un recorte—. La asimetría es además de COLOR: crema
casi blanco donde el material viene hacia la cámara, cobre donde se va. El tinte
azulado anterior era correcto en física y equivocado en lectura, porque enfriaba
justo la zona que tiene que verse incandescente.

**Anillo de fotones: un filo, no un halo.** Término analítico en el parámetro de
impacto crítico b = (3√3/2)·rs = (√27/2)·rs ≈ 2.598·rs — la convención de este
shader es rs = 2GM/c², como confirman el horizonte en r = rs, la esfera de
fotones en 1.5·rs y el término (3/2)·rs·u² de la geodésica. Va fuera del bucle,
donde `fwidth()` sí es válido, así que su anchura se adapta a la resolución. Dos
condiciones lo separan de un círculo gráfico: se apaga en los rayos capturados
—la sombra se queda absolutamente limpia— y su intensidad se multiplica por la
luminancia ya acumulada, así que hereda el beaming y el lensado y no brilla igual
en los 360°.

**Antialias por OCTAVA, no por campo.** `fwidth()` dentro del integrador es
comportamiento indefinido —flujo no uniforme—, así que la huella del píxel se
calcula analíticamente: ángulo por píxel (del drawing buffer, ya con el DPR)
por el CAMINO RECORRIDO por el rayo, no por la cuerda cámara-punto, que en un
espacio curvo subestima justo los rayos que dan media vuelta. El primer intento
apagaba el campo entero según su frecuencia base y no servía de nada: la que
aliasea es la última octava, 8.4 veces más arriba. `fbmAA` desvanece cada octava
hacia su media cuando su longitud de onda cruza la huella. No cuesta ninguna
evaluación de ruido extra.

**Coste.** El muestreo del disco pasa de 18 a 20 evaluaciones de ruido (+11 %):
las dos de la deformación gruesa. Todo lo demás —cresta, cortes, calibre,
jirones, asimetría cromática, anillo— es aritmética sobre campos ya calculados.

## 15. Gate de aprobación visual

Cada iteración se revisa con frame estático, estados y movimiento de puntero:

1. ¿Los mundos parecen destinos y no iconos?
2. ¿Gargantúa ilumina el sistema y sigue dominando?
3. ¿El cielo se siente profundo sin parecer nieve?
4. ¿Centro y bordes de los seis destinos activan hover?
5. ¿El HUD despierta y sigue siendo legible, no ruidoso?
6. ¿Endurance se reconoce como nave y los dos planetas conservan profundidad distinta?
7. ¿El cursor y el stardust hacen el espacio reactivo sin parecer un gimmick?
8. ¿Touch y reduced-motion reciben un System Map 2D completo y tranquilo, con
   opt-in 3D visible pero sin animación previa al consentimiento?
9. ¿El frame estático ya se siente luminoso, vasto y premium?
10. ¿El universo se siente vivo aunque nada recorra una órbita?

Tests verdes son obligatorios, pero no responden estas preguntas. La evidencia
de 2026-08-31 cubre frame estático, target de Endurance, target de Ranger, 390 px
y reduced-motion; el resultado queda como **candidato aprobado**.
