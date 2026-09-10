# Identidad de Gargantúa y navbar

Dirección solicitada por el dueño: cabina espacial minimalista y elegante.
La prueba vigente es **Consola de cabina** (opción 1), solicitada después de
aprobar **Ventana de observación**. Se conserva la marca JONÁS ØRBIT que gustó
al dueño. Los iconos conservan Horizonte, por petición explícita.
Se conservó el original anterior en `public/brand/previous-icon.svg`.

## Prueba vigente — Consola de cabina (2026-09-10)

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
`public/brand/logo-options.html` es una comparativa no indexable, con tamaños
reales y botones que cambian únicamente la muestra de navbar. Permite descargar
los SVG y conserva las alternativas como referencia histórica.

## Navbar de cristal — versión guardada

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
