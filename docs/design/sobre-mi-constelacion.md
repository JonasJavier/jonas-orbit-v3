# Sobre mí · constelación personal

Petición del dueño, 2026-09-14: aprueba la maqueta con sus fotos, pide comenzar
la página real, completar la imagen de «Curioso por naturaleza», generar un
fondo semejante a la referencia de cielo y montañas, pulir y conservar la navbar.
Este documento manda sobre las propuestas previas de Sobre mí en composición
y contenido personal. No altera la arquitectura de rutas ni la cámara.

## Textos nuevos de Cómo soy y Mi camino · 2026-09-29 (vigente)

Texto del dueño, traducido al inglés. Manda sobre el pase de pulido en Cómo
soy, Mi gente (cierre) y Mi camino.

- **Cómo soy.** Título «Un poco de mí.» (el nodo sigue «Cómo soy»); frase
  «Curioso por naturaleza.»; dos párrafos, el del tiempo a solas como aparte
  en cursiva con filete dorado; rasgos igual; la fe cierra el capítulo en
  serif con filete superior. Fuera la línea «Le doy demasiadas vueltas…».
- **Mi gente.** Retirado «Amigos, casi familia» con sus dos fotos (F34, F15):
  fuera de la página, del manifiesto y de `public/` (14 fotos ampliables).
- **Mi camino.** «Servir. Aprender. Compartir.» pasa a ser la franja titular
  del capítulo: tres verbos grandes con índice 01–03, «Compartir» en cursiva
  dorada; en el teléfono, apilados y escalonados. Las dos historias se atan a
  la franja: «COMPARTIR · LA PREDICACIÓN» (Conectar con las personas; pies
  «Compartiendo con otros.» / «Predicando desde niño.») y «SERVIR · EL
  VOLUNTARIADO» (Hombro con hombro). Las fotos F11/F36 no son de Betel: sale
  toda mención a Betel de ese bloque; pies «Servir nos hace felices.» / «Un
  esfuerzo que se disfruta.».

## Pase de pulido · 2026-09-22

Petición del dueño: «esta tiene que ser de las mejores páginas del sitio». Manda
sobre los apartados inferiores en Raíces, copy de Mi gente, abuelos y Cómo soy,
y en las listas y el comportamiento de los carruseles. Aprobación visual pendiente.

- **Mis raíces.** No le gustaba la foto centrada con el texto debajo. Ahora dos
  columnas: a la izquierda eyebrow, título, lugar con coordenadas de Bonao
  (18°56′ N · 70°25′ O, dato público del municipio, no de la foto), frase y
  relato; a la derecha F23 completa (4:3, sin recortar caras) con el marco
  dorado desplazado que ya usa Cómo soy. Cabe entera en 1440×860. F23 es ahora
  ampliable como el resto de fotos (16 enlaces de foto). Móvil: título, foto,
  texto.
- **Mi gente.** Sin párrafo: frase principal «Mi familia es mi primer hogar.» y
  subfrase «La alegría de mi madre, el esfuerzo de mi padre y la amistad de mi
  hermana.», condensada del texto anterior sin añadir nada.
- **Abuelos.** «Cariño, sabiduría y muchos recuerdos.»
- **Cómo soy.** Frase guía «Curioso por naturaleza.»; un párrafo corto; los
  cuatro rasgos que usan sus amigos como fila tipográfica; la fe en una frase;
  cierre «Le doy demasiadas vueltas a algunas cosas. Estoy trabajando en eso.»
- **Música.** Sólo artistas, sin canción ni nota. 18 artistas; primero los
  favoritos que nombró: Imagine Dragons, Hans Zimmer, José Luis Perales, Beach
  House, Ed Sheeran, Of Monsters and Men. Se añaden Julio Iglesias, Camilo Sesto,
  Snow Patrol, M83 y Daughter. Frase: «Bandas sonoras, baladas de siempre…».
- **Zimmer.** Retirado el retrato CC BY y su línea de crédito, que el dueño pidió
  quitar: la licencia exige atribución visible, así que el retrato se sustituye
  por la portada de «The World of Hans Zimmer», con la misma base que el resto.
- **Historias.** 18 títulos, todos en 16:9 de Apple TV/Netflix. Fuera Fight Club
  y Psycho-Pass. Nuevos: Marvel (imagen de Avengers: Endgame, porque le gustan
  todas), Spider-Man (No Way Home), Fullmetal Alchemist (imagen de Brotherhood),
  El Rey León (1994), La isla siniestra, Ratatouille, Gurren Lagann, Superman
  («Cine · Henry Cavill», imagen de Man of Steel) y The Flash («Serie · Grant
  Gustin»).
- **Carruseles → cintas automáticas.** Sin flechas ni barra de herramientas. CSS
  puro: dos copias de la lista (la segunda `aria-hidden` y fuera del tabulador),
  deriva continua a ~40 px/s (música hacia la izquierda, historias al revés),
  bordes con fundido. Se pausa con el puntero encima, con el visor abierto,
  fuera de pantalla o con la pestaña oculta. Un usuario de teclado recibe una
  fila desplazable normal; sin JavaScript o con el interruptor apagado, también.
  Retirados el temporizador de 5,5 s y el JavaScript de desplazamiento.
- **Reduced-motion.** Revierte la excepción de la revisión editorial para las
  cintas y el centelleo: el dueño navega con movimiento reducido y nunca vio el
  autoplay. Siguen la doctrina de `movimiento-unificado.md` (el interruptor es el
  consentimiento): `about-page.css` devuelve valor a valor duración e iteración
  frente a la regla general de `globals.css`, igual que Edmunds. Las
  transiciones entre capítulos y el scroll suave siguen apagándose con
  reduced-motion.

Herramienta: `tools/prepare-about-tastes.mjs` busca música por artista Y álbum
y reutiliza lo ya descargado (`--refresh` para rehacerlo todo). Validación:
lint, tipos, Knip, 437 unitarias, build; e2e de Sobre mí y movimiento en
Chromium escritorio y móvil, incluida la deriva medida con reduced-motion.

## Simplificación de recuerdos · 2026-09-15 (vigente)

Petición del dueño tras revisar las capturas: menos explicación, frases cortas
junto a las imágenes. Sustituye los textos largos de vínculos, aficiones y camino.

- Amistad: «Mi mejor amigo y yo, cumpliendo metas y sueños juntos». Sin el
  encabezado ni el relato anterior de infancia y habitación compartida.
- Abuelos: una frase de cariño, sabiduría y recuerdos; imagen ampliada de 180 px
  a aproximadamente 270 px en escritorio y hasta 280 px en móvil.
- Fotografía, música e historias: una frase de apoyo, con las fotos y los
  carruseles como contenido principal. Smallville conserva «Mi serie favorita»
  en su tarjeta, sin duplicarlo en el párrafo.
- «Mis planes favoritos» ocupa el ancho completo DEBAJO de la composición
  fotográfica, fuera de la columna de la cascada. Una fila en escritorio,
  dos bloques breves en móvil.
- Mi camino: sin introducción larga; una frase para predicación y otra para
  Betel, conservando una explicación sencilla de ese centro de voluntarios.
  Fotos y captions de mantenimiento siguen diferenciados de Betel.
- Hero, selección, fondos, autoplay, fotos, cierre y footer conservados.

Capturas y validación en `output/playwright/sobre-mi-simplificado.md`.
Aprobación visual pendiente del dueño.

## Revisión editorial del pase · 2026-09-15 (vigente)

Sustituye los puntos de contenido, fondos y carruseles del pase inferior por
petición del dueño tras revisar las capturas. La aprobación visual sigue abierta.

- Hero: título más compacto (34–50 px), sin subtítulo; se conserva sólo
  «Misma persona, distintos cielos» y se retira «Seis constelaciones / una misma
  persona». Invitación dorada con estrella y línea, sin flecha; es una indicación,
  los seis enlaces fotográficos siguen siendo los controles.
- F23 sustituye a E03 en el nodo y en Mis raíces. La fuente vigente es
  `assets/sobre-mi/_curaduria/miniaturas/F23.jpg`, reemplazada por el dueño.
  No volver al original antiguo al preparar fotos. Se leen las dimensiones reales
  de esta versión y no se amplía. Foto completa en el capítulo, con el título
  debajo para no tapar caras. Sin atribuirle una ubicación no confirmada.
  Las cuatro copias públicas de E03 se retiran; la referencia privada se conserva.
- El cielo existente continúa detrás de TODOS los capítulos, con velo oscuro
  estático para lectura. Mi gente conserva su tratamiento. No hay nuevas imágenes
  generadas, partículas ni contextos gráficos.
- Lo que disfruto: fuera F42/hielo; fotografía + F20/F07 junto a la cascada.
  Carruseles en filas propias de ancho completo, evitando que su altura deje un
  hueco bajo Mis planes favoritos. Se eliminan los dos desplegables redundantes.
- Diez artistas y once títulos de cine, anime y televisión, tomados de
  `GUSTOS-REFERENCIA.md`. Las cubiertas de álbum identifican artistas, no afirman
  que Jonás haya señalado esos discos como favoritos. Se incorpora Dark junto a
  Smallville. Ninguna selección adjudica una adaptación de Fullmetal Alchemist.
- Autoplay pedido explícitamente: una tarjeta cada 5,5 s, sólo con al menos 60 %
  del carrusel visible, pestaña activa, sin visor y movimiento global encendido.
  Reduced-motion lo impide incluso con el interruptor activo. Hover pausa;
  teclado, tacto o rueda entregan el control al visitante hasta reiniciar el
  movimiento global. Flechas y desplazamiento nativo siguen disponibles.
  El control global es también la pausa; no aparece otro interruptor local.
  Sólo temporizadores acotados, sin RAF continuo ni dependencias nuevas.
- Retrato de Hans Zimmer por ColliderVideo, CC BY 3.0, con atribución visible,
  enlace a fuente/licencia y nota de adaptación. Sustituye a la portada de
  Interstellar. Fuentes de las otras miniaturas: Apple Music/TV y Netflix.
- Betel se explica al mencionarlo en Mi gente y Mi camino: centro de los testigos
  de Jehová donde viven y colaboran voluntarios. Contexto contrastado con
  [¿Qué es Betel?](https://www.jw.org/es/biblioteca/folletos/voluntad-de-Jehov%C3%A1/qu%C3%A9-es-betel/).
  F11/F36 siguen identificadas como mantenimiento. Nuevas fotos de Betel pendientes.
- Se mantienen slot único, hashes, SSR/no-JS, gestión de foco, navbar y footer.

Validación: `npm run check` (265 pruebas en 40 archivos), 114 E2E de Sobre mí,
navbar, movimiento y smoke. Capturas de producción a 1440×860, 1536×864,
768×1024 y 390×844. Incluyen hero y seis capítulos en escritorio/móvil.
Dossier: `output/playwright/sobre-mi-revision.md`. Delta de scripts frente a
Privacidad: 22 884 bytes gzip; incluye el grupo compartido de páginas de mundo.

## Pase de exploración · 2026-09-15 (vigente)

Petición explícita del dueño: conservar la identidad visual y convertir las
seis constelaciones en navegación real. Este apartado sustituye el documento
anterior en navegación, copy, selección fotográfica y composición del hero.
La aprobación visual de este pase queda pendiente del dueño.

- Entrada sin hash: sólo hero, cierre y footer; ningún capítulo ni índice de
  lectura abierto. Los seis nodos caben completos en 1440×860 y 1536×864.
- Un único espacio de lectura bajo el hero, con índice sticky bajo el header.
  Elegir otro destino sustituye el capítulo, nunca acumula historias.
- Hashes canónicos: `#mis-raices`, `#mi-gente`, `#como-soy`,
  `#lo-que-disfruto`, `#mi-camino`, `#lo-que-sueno`.
- El HTML sirve las seis historias como Server Components. CSS `:target`
  permite seleccionar exactamente una sin JavaScript, incluso al entrar por
  enlace directo; imágenes de capítulos y portadas con `loading="lazy"`.
  `AboutExperience` mantiene la única frontera cliente y añade `pushState`,
  restauración de historial, foco sin scroll implícito y visor nativo.
- Salida de 160 ms + entrada de 180 ms, opacidad y 10 px. El hash se actualiza
  al elegir; la sustitución no depende de un evento de animación. Un mínimo
  temporal conserva el alto saliente durante el desplazamiento al inicio.
  Selecciones rápidas cancelan la transición previa.
- El interruptor global apaga también esta transición. Por petición específica
  de este pase, `prefers-reduced-motion` elimina transición y smooth scroll
  aunque el interruptor esté encendido; no altera la política de otros mundos.
- Móvil: retrato y seis fotos en dos columnas, con scroll vertical natural;
  no se miniaturiza el diagrama orbital para encajarlo en una sola pantalla.
  Índice horizontal con blancos de 44 px y opción activa visible.

### Contenido y fotografías

Se integra el copy completo aportado por el dueño: convicciones en el hero,
voz personal en Cómo soy y relación entre el paisaje y su curiosidad en Raíces.
Se conservan F40, F28, E03, las fotos anteriores de vínculos y las composiciones
de cascada/lago. Se añade F34 (amigos que son casi familia) y F15 (collage
completo, sin recortar) a Mi gente; F20 y F07 a Lo que disfruto.

Mi camino incorpora Predicar y Betel. **El dueño confirmó F02 y F16 como
fotografías de predicación durante este pase**: F02 principal y F16 recuerdo
pequeño, sin inferir nombres, fechas ni lugares. F11 sustituye a F13 en hero
y voluntariado. F13 se retira de la página, manifiesto y copias públicas por
petición del dueño; su original privado se conserva. F11/F36 siguen rotuladas
como mantenimiento: no se atribuyen a Betel. Las nuevas fotos de Betel se
añadirán cuando el dueño las envíe; no hay placeholders públicos.

Dos pequeños carruseles manuales dentro de Lo que disfruto: música e historias.
`AboutShelf` se sirve en el servidor y `AboutExperience` mejora el desplazamiento.
Flechas reales de 44 px, extremos deshabilitados, lista desplazable por teclado
y tacto sin autoplay. Cada miniatura enlaza a su ficha externa, sin audio ni
reproductor. Fuentes en `content/about-tastes.data.json`, preparación explícita
en `tools/prepare-about-tastes.mjs`; nada se consulta en tiempo de ejecución.
Las portadas pertenecen a sus titulares; las fichas de Apple Music/TV son
referencias de procedencia, no una licencia de propiedad ni autoría de Jonás.

**SiteShell, navbar, cierre y footer conservados.** E03 sigue con la autorización
de publicación pendiente documentada abajo. Este pase no despliega el sitio.

### Validación del pase

Extiende Appendix A A15–A17, A22–A24, A28–A29 y A32 con los flujos de
`e2e/about.spec.ts`: entrada cerrada, un capítulo, seis enlaces directos,
recarga, atrás/adelante, teclado/foco/visor, movimiento reducido, cambio rápido,
carruseles, SSR, no-JS, imágenes diferidas, retirada de F13 y geometría.
Pruebas de componente mantienen hechos, recursos existentes y exclusión de
detalles privados. Capturas reales y resultados en `output/playwright/`.

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

Resultado del pase: `npm run check` correcto (40 archivos de pruebas,
265 pruebas, lint/tipos/Knip y build); 112 E2E correctos en Chromium escritorio
y móvil para Sobre mí, navbar, movimiento y smoke. Diferencia de scripts
comprimidos frente a Privacidad: 22 529 bytes (incluye el grupo de páginas de
mundo, por debajo de 40 KiB). Cierre y shell comparados con HEAD sin cambios.
Capturas finales tomadas del build de producción en 1440×860, 1536×864,
768×1024 y 390×844. Dossier: `output/playwright/sobre-mi-revision.md`.
