# Identidad de Gargantúa y navbar

Dirección solicitada por el dueño: cabina espacial minimalista y elegante.
La dirección vigente es **Ventana de observación** (opción 2), recuperada por
el dueño después de comparar la consola. Se conserva la marca JONÁS ØRBIT que gustó
al dueño. Los iconos conservan Horizonte, por petición explícita.
Se conservó el original anterior en `docs/media/brand/previous-icon.svg`.

## Dirección vigente — Observatorio y acento por mundo (2026-09-13)

Dos pases el mismo día. El primero («instrumento de a bordo») puso bajo cada
destino una segunda línea en mono con «índice · cuerpo» y agrupó los seis en
el centro. El dueño lo rechazó de plano: «se ve muy cargada, el objeto es una
navbar minimalista; me gusta cómo estaban organizados y desplegados los
títulos en la anterior». Se quedó con lo que sí le gustó —el color por
mundo— y pidió dos cosas más: que el icono del CV ofrezca **los dos CV,
español e inglés**, y que las estrellas de la barra sean «más realistas, que
parezca realmente un observatorio del universo». El estado anterior a todo
esto está guardado en
`output/archive/navbar-cristal-editorial-20260913-antes-instrumento.zip`.

**Lo que no cambia**, porque lo fijó él antes: marca JONÁS ØRBIT, barra de
borde a borde sin marco ni anclajes, 67/63 px adosada arriba, una sola fila,
**seis nombres repartidos por el ancho** con tipografía de cuerpo y sin
segunda línea, control de pausa del cielo, «Mapa estelar ↑», menú «Explorar»
en dos columnas hasta 1080 px, blancos de 44 px, HTML servido con
`aria-current` y navegación sin JavaScript.

**Lo que cambia:**

- **El activo habla en el acento de su mundo.** La línea inferior y el punto
  de hover toman `--nav-accent` (cian en Miller, ámbar en la Endurance,
  violeta en la Ranger…); el nombre sólo sube a blanco. Ya no todo es cian.
- **La línea viaja entre rutas.** Cada página monta su propia cabecera, así
  que una transición CSS no puede unir dos montajes; `site-header.tsx` guarda
  en una variable de módulo dónde quedó la línea y la cabecera nueva la
  arranca ahí y la lleva al destino nuevo (`--marker-x`, `--marker-w`,
  `--marker-accent`, medidos en un layout effect antes de pintar). La línea
  por enlace del CSS sigue existiendo para el primer pintado y para quien
  navega sin JavaScript; en cuanto el cliente mide, se apaga. En el menú móvil
  el nav está oculto y mide cero: ahí sigue la línea por enlace. Reduced-motion
  no viaja. El router no se entera. Trampa que costó una vuelta: esperar a
  `document.fonts.ready` asentaba la línea en un microtask, antes del cuadro
  de viaje; el sitio usa fuentes del sistema y no hace falta.
- **CV en dos idiomas.** El icono (glifo compartido `download-icon.tsx`:
  bandeja y flecha en trazo fino) es el `summary` de un `<details>`: abre y
  cierra sin JavaScript y muestra «Español · PDF» y «English · PDF», ambos con
  `download`. El cliente sólo añade cerrarlo al pulsar fuera, al salir el foco
  y con Escape —que se detiene ahí para no cerrar también el menú móvil—. Los
  nombres accesibles evitan «CV español» a propósito: la Ranger ya tiene esos
  enlaces y A31 los busca por regex.
- **Observatorio** (`components/voyage-sky.tsx`). La textura SVG que
  derivaba de un lado a otro pasa a ser el fallback sin JavaScript. Encima, un
  canvas 2D dibuja un cielo de verdad: tres profundidades que pasan en UN
  sentido a ritmos distintos (0,45 / 0,72 / 1 × 2,4 px/s), magnitudes
  repartidas como en el cielo (`random^3.2`: muchas débiles, pocas
  brillantes), tres temperaturas de color, centelleo propio por estrella con un
  temblor rápido en las brillantes, picos de difracción y halo en las de
  primera magnitud, una banda lechosa inclinada que también pasa, y un meteoro
  cada 14-38 s. El reloj es de módulo para que el cielo no salte atrás al
  cambiar de página, y el campo es determinista: el mismo cielo en todas las
  rutas. 30 fps con `running`; quieto —pausa, segundo plano, reduced-motion,
  perfil ligero— deja un solo fotograma, así que el control de pausa sigue
  significando algo. Con reduced-motion o perfil ligero el control pasa a
  «Activar estrellas», el mismo consentimiento explícito del océano de Miller:
  el dueño no veía moverse nada porque su equipo declara movimiento reducido
  y la barra no ofrecía encenderlo. Segundo ajuste, a petición suya: menos
  estrellas y giro visible; con 0,06 estrellas por píxel y 7 px/s vio «mucho
  movimiento», y pidió un último recorte: queda en 0,034 estrellas por píxel,
  3,2 px/s en la capa cercana, centelleo lento (0,3-1,9 Hz, ±30 %), un
  meteoro cada 18-44 s y la banda lechosa a poco más de la mitad de claridad
  (0,04 en el centro), que era «la parte más clara» que le molestaba. DPR ≤ 2, `ResizeObserver`, sin dependencias.
  `:has()` en el CSS retira la textura en cuanto el canvas marca `data-ready`.
- **Miller** ofrece «Descargar CV · PDF» en las acciones del hero y la Ranger
  usa el mismo glifo en su registro de a bordo.

Verificación: `components/site-header.test.tsx` (nombres accesibles exactos,
acento por destino, desplegable del CV con Escape y clic fuera, marcador
medido antes de pintar, canvas montado en silencio sin 2D) y en
`e2e/navbar.spec.ts` el observatorio contado por fotogramas —vivo, pausa,
reanudación, segundo plano, reduced-motion y perfil ligero a 375 y 1440—, la
línea viajera entre Formación y Proyectos con cambio de acento, el CV en
barra y en menú con ambos idiomas, y el CV en el hero de Miller. La matriz
320-2560 px, alturas y teclado no cambian.

## Dirección anterior — Cristal editorial (2026-09-10)

**Retirada del marco:** a petición del dueño se eliminan los bordes exteriores,
los anclajes metálicos, las esquinas redondeadas y las sombras del marco, también
en el menú móvil. La franja estelar sigue de borde a borde; se mantienen alturas
de 67/63 px, movimiento, separadores interiores y estado activo. El HUD de la
escena y el marco del hero de Miller no pertenecen a este cambio.

**Marco de extremo a extremo:** el dueño pide que llegue a ambos bordes de
la página. La barra pasa al 100 % del ancho, sin límite de 1440 px ni márgenes
laterales en móvil. Se conservan el borde lateral e inferior, las esquinas y
los anclajes, ahora colocados dentro del marco para que no se corten ni causen
scroll horizontal. Altura y animación intactas. Build y 26 pruebas de navbar
pasan, incluyendo posición x=0 y ancho completo en la matriz 320–2560 px.

**Cielo en deriva y menor presencia:** por petición posterior del dueño, la
barra se adosa al borde superior (`top: 0`, sin margen), baja de 76 a 67 px
en escritorio y de 72 a 63 px en móvil. Se atenúan el marco y los anclajes,
sin reducir la tipografía ni los blancos de interacción de 44 px. Miller
ajusta exclusivamente la reserva de altura para que el océano siga detrás.

El cielo mantiene su base opaca, pero ahora tiene dos capas estelares de
distinta escala y distribución. Deriva de 44 px en 90/130 segundos y variación
lenta de opacidad en la capa lejana, sin fogonazos ni movimiento de los enlaces.
Sólo se animan `transform` y `opacity`, sin canvas ni bucle JavaScript. Un
control discreto junto a Mapa estelar permite pausar/reanudar; en móvil está
dentro del menú. Pausa en segundo plano, en perfil ligero y con reduced-motion;
sin JavaScript el cielo queda estático y el control se oculta.

Verificación: `npm run check` completo (205 tests unitarios y build), más 102
pruebas E2E de navbar, Miller y rutas. La nueva cobertura comprueba alturas,
anclaje superior, pausa/reanudación, segundo plano, reduced-motion y perfil
ligero a 375 y 1440 px. El resto de la matriz conserva los anchos 320–2560 px.

**Prueba de cielo persistente, solicitada después:** la navbar contiene su
propio campo estelar, independiente del contenido bajo ella. Sustituye el
tinte al 24 % y el blur descritos abajo por una base azul-negra opaca con
reflejos y estrellas SVG discretas (`public/brand/navigation-stars.svg`).
La opacidad estabiliza el cielo incluso sobre los documentos blancos al hacer
scroll; la sensación de cristal procede de los cantos y el reflejo superficial.
El menú móvil comparte el material. No hay canvas, movimiento, listeners de
scroll ni cambios al HUD o a Miller. Build y 22 pruebas de navbar pasan.

La variante editorial transparente queda recuperable en
`output/archive/navbar-cristal-editorial-20260910-200244.zip`; no sobrescribe
las copias anteriores de cristal ni de consola.

La vista frontal del concepto manda; el detalle volumétrico sólo explica el
material. Una lámina azul-negra al 24 %, blur de 6 px, reflejo superior de 1 px
y dos anclajes de titanio pequeños. Altura total de 76 px en escritorio y 72 px
en móvil. No hay tornillos grandes, textura descargada ni volumen añadido.

Los destinos vuelven a ser tipografía sin cajas, repartida por el espacio
disponible. Inactivos gris claro, hover blanco con un punto cian tenue; activo
cian pálido con subrayado de 2 px al 76 % del texto. El resplandor pertenece
sólo a la línea, no a la palabra. La opacidad transiciona en 420 ms; no se
simula un desplazamiento entre rutas que desmontan la cabecera. Los separadores
después de la marca y antes de «Mapa estelar ↑» se conservan. La flecha señala
el regreso al hub interno. No vuelve la fila inferior de Miller.

La consola comparada también queda guardada, sin sobrescribir el cristal:
`output/archive/navbar-consola-20260910-155800.zip` (nueve archivos, con sus
rutas relativas). La copia original del cristal sigue intacta.

Validación de este pase: `npm run check` completo y 98 pruebas E2E de navbar,
Miller y rutas en Chromium de escritorio y móvil. Se mantienen las pruebas de
una sola fila, blancos alcanzables, navegación por teclado y anchos 320–2560 px.

## Prueba anterior — Consola de cabina (2026-09-10)

La opción 1 sustituye temporalmente al cristal para poder juzgarla en el sitio.
Carcasa de grafito con cepillado fino, biseles y anclajes pequeños; seis botones
empotrados, con luz cian en el destino activo. Marca marfil, sin otro símbolo
añadido. El acabado está hecho con CSS: no descarga una imagen de interfaz.
Se mantienen una sola fila, geometría exterior, navegación y menú accesible.
No cambia el HUD de la portada ni ninguno de los tres iconos.

**Copia recuperable de la opción 2 y Miller anterior:**
`output/archive/navbar-cristal-miller-20260910-142134.zip` (ignorado por git).
Contiene los once archivos fuente afectados, dos capturas y `RECUPERAR.md`.
Se verificaron los hashes de los catorce archivos frente al ZIP antes de retirar
la carpeta de preparación, para que TypeScript no compile la copia histórica.
El ZIP conserva las rutas relativas y se puede restaurar sobre el repositorio.
No borrar este checkpoint al pulir la consola.

Validación de la consola: `npm run check` completo (lint, TypeScript, Knip,
205 tests unitarios y build) y 98 pruebas E2E de `navbar`, `miller` y `smoke`
en Chromium de escritorio y móvil. Revisión visual de producción a 1440 y
375 px: hero, menú, archivo y documentos. Los tres iconos conservan sus hashes
anteriores. El HUD y los archivos de la escena no forman parte de este pase.

## Marca conservada — proceso de Ventana de observación

Tras comparar cinco conceptos de navbar de nave espacial, el dueño eligió la
opción 2 y su marca **JONÁS ØRBIT**, aportando un recorte como referencia.
La marca usa letras finas espaciadas y una O circular atravesada por un trazo
diagonal. El aro se dibuja en SVG dentro de la palabra; no es un icono separado.
El nombre accesible sigue siendo «Jonás Orbit, inicio».

La navbar retira el símbolo Horizonte. `app/favicon.ico`, `app/icon.svg` y
`app/apple-icon.png` conservan íntegros los archivos elegidos anteriormente.
El HUD de la portada conserva su propia identidad y composición.

## Variantes anteriores — referencia histórica

- **Horizonte**: arco superior fino, arco inferior más tenue y disco horizontal
  de acreción. La evolución más cercana al original; elegida y aplicada
  en la navbar, `app/icon.svg`, `app/favicon.ico` (16/32/48/64 px) y
  `app/apple-icon.png` (180 px).
- **Lente**: inclinación de 12 grados y arco de mayor grosor. Alternativa dinámica.
- **Singularidad**: dos arcos geométricos y una línea de horizonte. Alternativa abstracta.

Cada familia incluye SVG transparente claro, versión en tinta oscura y favicon
con base oscura. No usan fuentes externas, filtros ni recursos incrustados.
`docs/media/brand/logo-options.html` es una comparativa de archivo (fuera de
`public/` desde 2026-09-28, ya no se sirve), con tamaños
reales y botones que cambian únicamente la muestra de navbar. Permite descargar
los SVG y conserva las alternativas como referencia histórica.

## Navbar de cristal — base guardada, anterior al pulido editorial

La cabecera compartida de las páginas de contenido es una lámina de cristal
ahumado con borde fino, reflejo contenido y dos pequeños soportes de titanio.
Los remates laterales y el filo inferior pertenecen sólo a la navbar: no hay
marco alrededor del viewport ni elementos encima del HUD. Los soportes se
dibujan con CSS, no reciben puntero y no añaden imágenes ni animación continua.
La home mantiene su HUD independiente.

La barra se separa 12 px del borde superior (8 px en móvil), alcanza un máximo
de 1440 px y conserva una única fila de 74 px (70 en móvil). La marca usa
fuentes del sistema; no descarga tipografía. El enlace activo se distingue por
texto cian pálido y subrayado luminoso fino, sin caja ni punto indicador.
Miller deja de imponer su anterior fondo opaco a la cabecera; el mismo cristal
se usa en las páginas interiores. Con transparencia reducida, el panel es opaco.

Hasta 1080 px, «Explorar» despliega seis enlaces en dos columnas sobre la
página, sin desplazar su contenido. El panel tiene scroll propio en pantallas
bajas. Escape cierra y devuelve el foco al botón; un clic exterior, navegar o
sacar el foco del menú también lo cierran. Los blancos táctiles miden al menos
44 px. En pantallas amplias, la cabecera mantiene su composición centrada.
Sin JavaScript los seis enlaces quedan expuestos. El `aria-current="page"`
se sirve en HTML desde el `WorldId`, no se deduce mediante estado de cliente.

El dueño retiró la segunda fila de Miller (nombre del mundo y accesos a
Panorama, Trayectoria y Certificados). La navbar tiene una sola fila en todas
las rutas; también se retiran el estado de sección y los listeners de scroll
que lo mantenían. Los accesos a trayectoria y certificados siguen en el hero.

La primera entrega de cristal parecía opaca: tinte oscuro al 79 %, blur de
18 px y ninguna imagen detrás en la entrada de Miller. El pase correctivo baja
el tinte al 18 % y el blur a 3 px. El océano continúa detrás de la cabecera;
el texto del hero mantiene su separación y no queda cubierto. Sin JavaScript
se recupera el flujo normal para que el menú expandido no tape contenido.
La navbar no controla la cámara ni interviene en las poses de la escena.

## Validación — Ventana de observación

El pase de transparencia y retirada de la fila inferior vuelve a pasar
`npm run check` y las 96 pruebas E2E el 2026-09-10. La prueba de sección activa
se sustituye por el contrato vigente: una sola fila, océano detrás de la barra
y acceso a certificados desde el hero. Tab sale del menú al contenido real.

`npm run check` pasa: lint, TypeScript, Knip, 205 tests unitarios y build de
producción. Pasan las 96 pruebas E2E de `navbar`, `miller` y `smoke` en Chromium
de escritorio y móvil. La matriz de navbar añade 1080/1081 y 1280/1281 px para
verificar ambos lados de sus cambios de composición; conserva 320 px, tablet,
apaisado corto, 1440 y 2560 px, blancos de 44 px y centro alcanzable.

Revisión visual sobre producción en Formación y Proyectos a 1440 px y en
Formación a 375 px con el menú abierto y cerrado. Los tres hashes SHA-256 de
los iconos coinciden con los registrados antes del pase. No hay dependencias
nuevas, recursos raster nuevos ni cambios a la escena o al HUD.

## Validación anterior — Horizonte

Comparativa revisada visualmente, prueba del selector de logo y revisión en
1440 y 375 px. `npm run check` pasa, con 205 tests unitarios. Las 102 pruebas
E2E de navbar, Miller, rutas y banda sonora pasan en Chromium y Chromium móvil:
menú sin saltos, blancos alcanzables de 320 a 2560 px (incluido apaisado corto),
Escape, navegación con teclado, estado activo de ruta y sección, imágenes de
los 23 certificados, opt-in del océano y paridad sin JavaScript.
