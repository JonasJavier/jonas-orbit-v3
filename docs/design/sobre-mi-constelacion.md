# Sobre mí · constelación personal

Petición del dueño, 2026-09-14: aprueba la maqueta con sus fotos, pide comenzar
la página real, completar la imagen de «Curioso por naturaleza», generar un
fondo semejante a la referencia de cielo y montañas, pulir y conservar la navbar.
Este documento manda sobre las propuestas previas de Sobre mí en composición
y contenido personal. No altera la arquitectura de rutas ni la cámara.

## Implementación

`/es/sobre-mi` sigue siendo Gargantúa. `AboutPage` ocupa el contenido dentro del
`SiteShell` existente: la navbar, sus seis enlaces, CV en dos idiomas, menú,
Mapa estelar y controles globales se conservan. El metadata sigue viniendo del
MDX de Gargantúa; su resumen ahora describe la persona en vez de duplicar su CV.

Seis constelaciones: Mis raíces, Mi gente, Cómo soy, Lo que disfruto, Mi camino,
Lo que sueño. Se conserva la unión de personalidad y valores dentro de Cómo soy.
El retrato central es F40, elegido por Jonás. F28 acompaña el nodo Cómo soy y
su sección: sustituye el recuadro de texto de la maqueta que no tenía fotografía.

La portada usa fotografía generada de cielo y montañas, texto a la izquierda,
retratos conectados, estrellas puntuales y reflejos dorados. Mi gente continúa
con el paisaje como atmósfera, fotos con margen cálido y recuerdos breves.
Los demás capítulos conservan distintas proporciones y composición. La cascada
F44 y el lago F45 se muestran verticales, sin convertirlos en falsos panoramas.

Selección: F40; E03 para Bonao; F50, F09–F29 y F04 para vínculos; F28 para
personalidad; F44 y F42 para aficiones; F13 y F36 para mantenimiento; F45 para
el cierre. Las fotos de mantenimiento no se etiquetan como Betel. No se añaden
nombres, fechas, lugares o parentescos no confirmados.

Se omiten los detalles que Jonás señaló como privados acerca de su sueño y sus
motivos. El texto público sólo habla de vivir sencillamente cerca de la naturaleza
y seguir explorando. Las listas de música y cine/anime son detalles opcionales.

## Interacción y movimiento

El índice superior tiene seis enlaces reales. Hover y foco iluminan la conexión;
el índice de lectura marca la sección vigente. La versión móvil usa dos columnas
para nodos y una para capítulos. No se transforma el scroll en movimiento de cámara.

`AboutExperience` es la única frontera de cliente propia de esta página. Recibe
el contenido servido, controla la ampliación de fotos con `dialog`, Escape,
restauración de foco y el estado de visibilidad. Los enlaces de foto abren un
WebP real sin JavaScript; los desplegables son `details` nativos. El contenido
no se esconde hasta animar ni depende del visor para ser entendido.

Las estrellas obedecen `useMotionEnabled()` y duermen fuera de pantalla o en
segundo plano. No hay un nuevo botón de pausa, canvas ni bucle de render.
Un rAF puntual agrupa los eventos de scroll para el índice. La escena persistente
incluye Gargantúa en `COVERED_WORLDS` porque la página personal ahora la cubre.
El sistema en la portada conserva todos sus cuerpos, tamaños y cámara.

## Imágenes y procedencia

`tools/prepare-about.mjs` crea copias WebP a 320, 640, 960 y hasta 1600 px,
sin ampliar el original pequeño de infancia. El manifiesto público contiene sólo
dimensiones y tamaños: `content/about-photos.data.json`. Los originales y la
base editorial personal permanecen en assets, fuera de public. Sharp elimina
metadata de las copias de publicación. Las imágenes llevan dimensiones y sizes;
las de los capítulos cargan de forma diferida.

El fondo fue creado con la herramienta integrada de generación de imágenes;
ninguna foto personal se envió al generador. Original conservado en
`assets/sobre-mi/_curaduria/fondo-generado-v1.png`, versiones de 768 y 1536 px en
`public/images/sobre-mi/cielo-montanas-*.webp`. Es un paisaje imaginado, no una
fotografía de Bonao ni un lugar visitado por Jonás.

E03 es la fotografía de río elegida por el dueño, de Bonao City. La integración
local lleva copias optimizadas y crédito. Su autorización de reutilización para
publicar sigue pendiente; esto no se resuelve por descargarla ni dar crédito.
Ver `assets/sobre-mi/mis-raices/referencias-externas/FUENTES.md`. No se despliega
el sitio en esta tarea.

## Prompt del fondo

undefined

## Verificación

`components/about-page.test.tsx`: seis historias y anclas, foto del nodo Cómo
soy, hechos confirmados, exclusión de detalles privados, enlaces progresivos,
recursos presentes y ausencia de audio automático.

`e2e/about.spec.ts`: navbar conservada, navegación de constelación, indicador,
visor por teclado, retorno del foco, música desplegable, canonical, interruptor
único, varios anchos y lectura/navegación sin JavaScript. Se completa con revisión
visual en navegador real y la suite del repositorio.

Resultado de la entrega: lint, tipos, Knip, 233 pruebas unitarias y build de
producción correctos. Pasan seis pruebas de Sobre mí (escritorio/móvil), 38 de
navbar y movimiento, y 12 de rutas, metadata, destinos y desbordamiento del smoke.
Revisión visual en Edge a 1440 y 390 px; geometría comprobada entre 320 y 1920 px.
Los 50 originales conservan sus hashes y las 50 copias WebP no contienen EXIF.
El fondo de escritorio pesa 214 KB. Las capturas finales están en
`output/playwright/sobre-mi-real-*.png`.
