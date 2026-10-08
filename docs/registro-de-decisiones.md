# Registro de decisiones vigentes — Jonás Orbit v3

Texto íntegro de las entradas que vivían en `AGENTS.md` hasta el 2026-09-22,
movidas aquí sin editar para que `AGENTS.md` —que se carga en cada sesión de
cada agente— quede en un índice corto. El índice de `AGENTS.md` dice QUÉ
documento manda en QUÉ; aquí está el porqué, las cifras medidas y las trampas.

**Las entradas nuevas se escriben aquí**, arriba del todo, como
`## Ámbito — título (AAAA-MM-DD)` seguido del texto, y en `AGENTS.md` sólo se
añade su línea de índice. El orden es el que tenían (no estrictamente
cronológico): ante contradicción, manda lo que diga cada entrada sobre qué
sustituye, y si no lo dice, la más reciente.

**Cómo leerlo sin cargarlo entero** (pesa >120 KB):
`grep -n '^## ' docs/registro-de-decisiones.md` da el índice con número de
línea; después `Read` con `offset`/`limit` sólo esa entrada. Cada `## ` es
también un nodo del grafo: `search_graph(name_pattern="(?i).*agujero.*",
label="Section", file_pattern="docs/registro*")` la encuentra por tema.

---

## Navegación con red lenta — la travesía espera a la página, y nada se congela (2026-10-07) — manda sobre el «tope de llegada de 1,4 s» de la Travesía

Queja del dueño: con el internet lento, al entrar a un planeta «hace la
animación pero no entra y vuelve a la escena», y en la navbar a veces el
cambio de página «se queda frisado». Medido con `tools/nav-latency.mjs`
(nuevo) sobre `next start`, Chromium con GPU real y «Slow 4G» de DevTools
(563 ms, 1,6 Mbit/s) aplicado tras la carga:

- **La causa del «vuelve a la escena».** Tras pedir la ruta, la luz del cruce
  se retiraba a los 1,4 s llegara o no la página. Con un toque directo (sin
  hover que precargue) la luz se retiraba sobre la home en 5 de 6 mundos en
  3D y en 6 de 6 en 2D, y la página aparecía de golpe 0,6–3,8 s después.
  Además, en 3D la ruta no se pedía hasta el pico (2,05 s): la red estaba
  parada todo el despegue.
- **Arreglo.** (1) `useWorldNavigation` llama a `router.prefetch` al
  DESPEGAR. (2) Nueva fase `wait` en `voyage-controller.ts`: si a
  `waitAfter` (0,5 s completa / 0,4 s reducida) de pedir la ruta la página no
  ha llegado, la luz se apaga en un velo oscuro con el acento del destino
  (`filter: brightness(.3)`) y una línea de progreso fina arriba
  (`.route-progress` en `VoyageLayer`); cualquier tecla, clic o gesto lo
  retira, y `arriveCap` sube de 1,4 a 12 s como tope duro. La llegada tras
  una espera sale del velo, no de la luz blanca (`data-voyage-waited`).
  Resultado con la misma red: la luz se retira sobre la página NUEVA en
  12 de 12 viajes. Con red buena la espera no llega a verse.
- **Precarga por intención = quedarse.** El cursor que cruza Gargantúa (el
  centro) camino de otro planeta precargaba Sobre mí con sus `preload` (~390
  KB de cielo y fotos) y le quitaba red al destino pulsado (Contacto llegaba
  2,9 s después de retirarse la luz). `usePrefetchOnIntent` espera 160 ms y
  sólo precarga si el enlace sigue apuntado o enfocado. El clic no depende
  de esto.
- **Navbar.** Las rutas entre mundos casi no piden JS (el chunk de `[mundo]`
  ya trae los seis), así que llegan en ~0,7–1 s con «Slow 4G»; lo que faltaba
  era respuesta: `IntentLink` monta `RoutePending` (`useLinkStatus`), que
  publica `data-route-pending` en `<html>` y enciende la misma línea de
  progreso, con 250 ms de retraso para que una navegación rápida no la
  encienda.
- **El «frisado».** La Ranger y el océano de Miller compilaban su shader de
  forma síncrona en el commit de la página nueva (`getShaderParameter` /
  `getProgramParameter` justo tras compilar): ~380 ms de hilo bloqueado al
  llegar a Contacto. `lib/webgl-program.ts` compila sin leer el estado y
  espera `COMPLETION_STATUS_KHR` (`KHR_parallel_shader_compile`) fotograma a
  fotograma; el lienzo queda `visibility: hidden` hasta su primer fotograma
  (`data-drawn`), así que se ve la foto o la vista fija y no un negro. Tarea
  más larga al llegar a Contacto: 378 → 80–250 ms.

Queda, sin tocar a propósito: la escena del mapa se construye también en las
rutas cubiertas tras `after-load-idle` (100–300 ms de tarea con GPU real,
más en un móvil) para que la vuelta a la home sea inmediata —es la decisión
de «Rendimiento móvil»—; y el primer viaje desde la home baja el chunk
cliente de los seis mundos (~50 KB comprimidos) sólo al navegar, porque la
precarga del RSC no lo pide. Las dos son candidatas si el dueño lo quiere.

## Home — guía de entrada, HUD legible, horizonte y pliegue del Tesseracto (2026-10-07)

Pedido del dueño a partir de una crítica externa de la portada: «cambiar y
mejorar todo esto», llevarlo «al siguiente nivel» y que en el móvil funcione
bien. Cuatro frentes, todos juzgados con GPU real (recortes A/B por cuerpo
en 1440×900 y 390×844 con un script de Playwright con ventana, como
`awards-shots.mjs`; nunca con `shot.mjs`).

- **Guía de entrada «NAVIGATION SYSTEM // 001»** (`components/system-guide.tsx`
  + `.css`). El riesgo que señalaba la crítica era real: se puede admirar la
  escena diez segundos sin descubrir que es un portafolio. La guía dice
  sólo «Explora mi universo / Apunta (Toca) a un destino para comenzar» y un
  botón «Entendido» (tenía una frase sobre los destinos; el dueño la quitó:
  «el texto también es mucho, simplifícalo mucho más»). Aparece 1,1 s
  después de montar (sólo con JavaScript: en el HTML servido no hay nada que
  explorar salvo el raíl), vive en el flanco izquierdo entre Miller y Edmunds
  —frente al NAV TARGET— y **se retira con el primer destino apuntado o
  enfocado** (cuerpo o raíl), con `Escape` o con el botón; no se va sola por
  tiempo. Durante ese 1,1 s está `pending`: montada, invisible e inmune —en
  una captura el puntero que ya cruzaba la pantalla entró en el blanco de
  Gargantúa (842×213 px a 1280 de ancho) sobre el atlas plano y la retiró
  antes de verse—. Una vez por sesión (`sessionStorage`, clave
  `jonas-orbit:guia-vista`). `aside` no modal; deja pasar el puntero (sólo el
  botón lo recoge). Cabecera en inglés de instrumento, el resto traducido con
  `defineCopy`. **Teléfono:** tarjeta centrada sobre el raíl con velo y
  44 px en el botón y sin `backdrop-filter` (en un Chromium con GPU a DPR 2 el
  desenfoque se compuso encima del propio texto); «Toca para explorar» espera
  a que la guía se retire. Apaisado bajo: sin cuerpo de texto.
- **HUD legible.** La lectura en reposo deja de ser `SELECT TARGET` (jerga)
  y pasa a «Elige un destino / y explora mi trabajo» (EN: «Choose a
  destination / and explore my work»), traducida. Tamaños de escritorio:
  franja 0,58 → 0,64 rem; `JONAS ORBIT` 0,74 → 0,84; placa 0,56 → 0,62;
  instrucción 0,76 → 0,88; raíl 0,61 → 0,70 (función 0,43 → 0,50) y su color
  del 48 % al 66 %. **El raíl se despega del borde**: `bottom` 1,35 → 2,3 rem
  y el texto alineado a 3,4 rem con la franja superior; las lecturas de abajo
  a la derecha suben igual. El móvil no cambia de tamaños.
- **Endurance: RECHAZADO y revertido el mismo día.** Se probó separarla del
  fondo con un rebote dirigido al triple, un filo lateral del disco sin
  albedo y el suelo nocturno 0,26 → 0,34. El dueño: «no se siente integrada
  ahora con la iluminación, estaba mejor antes». La nave queda exactamente
  como en el pase 10-04; si alguna vez se retoma, el camino no es más luz
  lateral.
- **Horizonte de Gargantúa** (`gargantua-shaders.ts`). La rampa de los rayos
  condenados vuelve del 13 % al 20 % exterior de b crítico (0,87 → 0,80): la
  transición sombra–disco gana degradado donde las imágenes de orden superior
  se desvanecen en vez de cortarse. Sin término analítico de anillo de fotones
  (sigue prohibido: registro «Pase visual final»), sin más bloom, centro de la
  sombra a cero.
- **Tesseracto: cristal que se ve y espacio que se pliega.** (1) Membranas
  del 1,3 % al 7,5 % de alfa (16 % en el canto) con **iridiscencia** lenta
  cian→violeta por ángulo y tiempo (`tesseract-model.ts`); núcleo blanco de las
  aristas 0,040 → 0,075 y cuerpo +60 % sin engordar ni un píxel. (2) **Pase
  nuevo `tesseract-lens.ts`** entre el raymarch y los cuerpos: desplaza el
  cielo en un anillo de 2,2 radios alrededor del Tesseracto proyectado (campana
  con pico a medio radio, 1,5 % del alto como máximo, cuatro lóbulos que giran
  cada ~36 s, separación cromática mínima) y añade un campo cian/violeta
  apenas visible con los mismos lóbulos (`uField` 0,045, lineal, antes del
  bloom) — sin él, sobre un cielo vacío la distorsión no tiene qué mover. Los
  cuerpos se dibujan encima: el Tesseracto sale nítido sobre un fondo doblado.
  Mismo gate que el bloom (`canFloat`); apagado si no está en el cuadro; un
  blit de coste. La matemática del 4-cubo, el ritmo, la escala y la posición
  no se tocan (V4 sigue siendo la base).
- **Verificado:** unitarios de `system-map` y `system-hud` (copy nuevo),
  `npm run check` completo, capturas A/B con GPU real (escritorio y teléfono,
  ES) y la guía probada en el navegador: aparece, se retira al apuntar el
  raíl, móvil con tarjeta compacta. E2E de la home: ver el commit.
- Valoración visual del dueño pendiente en los cuatro frentes.

## Blog — los simuladores a la vista (2026-10-05)

Pedido del dueño: mejorar el diseño del blog y que el botón del simulador
«esté bien visible» e «invite a entrar»; el fondo (`blog-sky.tsx`) le gusta y
no se toca. Antes, «Abrir el simulador» era una caja ámbar al pie de la
columna lateral, bajo el índice, y en el índice del blog no había simuladores.

- **Un solo botón lleno en todo el blog:** `.blog-button--live` (píldora
  ámbar con brillo, texto oscuro) es siempre «entrar a un simulador». El punto
  rojo `.blog-live-dot` late sólo con `html[data-motion="on"]`; quieto dice lo
  mismo.
- **Índice:** la puerta al Observatorio (`.blog-gate`) ocupa el hueco a la
  derecha del título: captura real de Gargantúa (`specimenImage`), «Simulador
  3D · en vivo», botón a `/es/experimentos` (el hub del nicho 3D) y los seis
  especímenes montados como enlaces directos (`observatoryCatalog`, sólo los
  que tienen `href`). Las tarjetas con `specimen` llevan el sello «Con
  simulador 3D» y todas cierran con «Leer la entrada →». La rejilla ya no deja
  huecos: con 3n+2 tarjetas las dos primeras van a medias (rejilla de 6
  columnas y `:has()`).
- **Entrada con espécimen:** botón «Entrar al simulador de {nombre}» bajo el
  autor; la portada (que es una captura del simulador) se vuelve su puerta con
  un botón ▶; la tarjeta lateral sube ENCIMA del índice, fija, con la captura
  del espécimen; y al final un cierre grande «Ahora míralo en vivo» con la
  captura a la derecha, fundida hacia el texto para que el disco no caiga
  detrás de una línea.
- **Entrada sin espécimen:** el mismo cierre, hacia el Observatorio entero.
- **Teléfono:** la tarjeta lateral se oculta en una columna (quedaba pegada a
  la portada, que ya es la puerta: tres botones seguidos); el cierre pone la
  imagen arriba y el texto debajo.
- e2e: `blog.spec.ts` comprueba los destinos de los cuatro accesos.

## Rediseño de Ranger, Endurance y Miller — casco loftado, ventanas y nubes cizalladas (2026-10-04)

Tercera ronda del día, pedida por el dueño con mandato explícito de REDISEÑO
(«casi no se nota el cambio… necesito un rediseño y que se vea mucho más
realista», Ranger/Endurance/Miller). Esta entrada SUSTITUYE, en lo que toca, a
tres decisiones anteriores: la proa facetada y la chapa crema de la Ranger
(fase 1 · pase 3, 09-05), el marfil 0.76 de la manta principal de la Endurance
(segunda ronda 09-05) y la forma de las nubes de Miller (§9 quinquies, 09-06;
su paleta de aguas y su camino de luz SIGUEN vigentes).

- **Ranger: casco loftado continuo** (`loftedFuselage` en `bodies.ts`). El
  fuselaje deja de ser caja redondeada + cono + tapa y pasa a UNA superficie
  de nueve estaciones con normales suaves: cuerpo sustentador más ancho
  (0.52 contra 0.37) y más plano (0.17 contra 0.28), vientre más plano que el
  lomo, boat-tail. Envergadura, eslora y balizas no se mueven: ni el radio
  publicado ni la escala aparente cambian. Góndolas semienterradas en el
  flanco (z 0.26 — a 0.27 la vista PROPULSIÓN rozaba el cuadro del móvil).
  La chapa pasa de crema (0.34-0.96) a METAL CAÑÓN (0.148-0.56), más pulida
  (filete 92, gloss hasta 0.98): a 153° un casco claro se lava; el oscuro
  vive de filos ámbar, barrido especular y reflejo del disco. La envoltura
  baja a 0.58 y su curva de modulación se recalibra para la chapa oscura.
  Medido: media clavada (29 → 29.5), p95 142 → 178, sombra profunda 71 → 77 % —
  el mismo peso en el cuadro con mucho más contraste interno.
- **Endurance: blanca y habitada.** La manta principal sube a blanco de
  verdad (0.88) y la estándar medio punto; el grafito no se mueve, así que el
  contraste entre familias crece un escalón. Y VENTANAS encendidas: tres por
  módulo habitado (24 en total; las bodegas no llevan), máscara 5 del draw de
  luces (`ENDURANCE_LIGHT_FRAGMENT`), cálidas, FIJAS y tenues (1.35 contra
  1.65-1.7 de las balizas): luz de interior, no señal. Es la señal más barata
  de nave habitada. Media 20.5 → 21.5; sigue dominando la jerarquía.
- **Miller: nubes cizalladas, no manchas.** Mismo sitio de fbm (el
  presupuesto de 12 no se toca): el DOMINIO se comprime un 72 % a lo largo
  del eje del mar, así que los sistemas salen ~3,5 veces más largos en la
  dirección de la corriente, con la deriva compensada para conservar los
  4,7 px/s. Puerta más abierta (0.47-0.80), nube más blanca (0.86-0.93 a
  0.34) y núcleos convectivos casi blancos gateados sobre el mismo campo.
  El abismo baja medio escalón: océano hondo + bajío turquesa + nube blanca,
  tres valores francos. Medido: media 93 → 100, croma 0.457 → 0.363 (menos
  bola de cian, más fotografía), p05 intacto.

Bloom-off en pie para los tres. Las capturas del antes/después, con GPU real,
en la conversación del 10-04; `shot.mjs` sigue sin valer para juzgar esto.

## SEO — frases del nicho 3D: hub de Experimentos y cola del blog (2026-10-04)

El dueño pidió competir con más frases del nicho («modelos 3D de
Interstellar», «Gargantúa», «planetas 3D»…). Lo que se cambió y lo que se
decidió no tocar:

- **Experimentos es el hub del nicho.** Su título pasa de «Experimentos 3D —
  WebGL, Three.js y shaders» a «Experimentos 3D — Gargantúa, planetas y naves
  en WebGL» (EN igual): los cuerpos al título, la técnica (Three.js, shaders)
  a la descripción, que ahora abre con «Modelos 3D interactivos…». Es la
  página de colección para «planetas 3D», «naves 3D» y «Gargantúa» a secas;
  cada espécimen sigue siendo quien gana su búsqueda larga.
- **El simulador dice «3D» y «Three.js».** La descripción del espécimen
  Gargantúa pasa a «Simulador 3D del agujero negro Gargantúa… en WebGL con
  Three.js» (pierde «cuatro vistas», que nadie busca). Los otros cinco ya
  nombraban cuerpo + 3D + WebGL/Three.js y no se tocan.
- **«Modelos 3D de Interstellar» se gana desde el blog, no desde un título de
  página.** Sigue vigente «Interstellar en descripciones, nunca en títulos»
  para las páginas del sitio; las entradas del blog sí pueden llevarlo
  (precedente: «Agujero negro de Interstellar: la física de Gargantúa»,
  10-02). Nueva entrada-hub como #1 de la cola (`interstellar-3d-models`,
  `docs/presencia-web.md` §5): un recorrido por los seis especímenes con
  enlace a cada uno.
- **Lo que se decidió NO hacer:** `<meta keywords>` (los buscadores la
  ignoran); tocar título o descripción de la portada (manda «SEO — nombre,
  nicho 3D y freelance»: nombre y oficio primero); `keywords` en el JSON-LD
  de los especímenes (no mueve ranking y añade esquema); repetir las mismas
  frases en los seis especímenes (se canibalizarían con el hub).
- Lo que de verdad mueve estas frases a medio plazo ya está en marcha:
  entradas del blog por espécimen (cola §5), imágenes propias en Google
  Imágenes (10-02) y enlaces entrantes (rutina del foro de Three.js, dev.to).
  Se valora con las consultas reales de Search Console ≈10-27, como manda la
  auditoría del 10-02.

## Render de cine — MSAA, resolución de escritorio y reflejo del disco (2026-10-04)

Segunda ronda del pase de realismo, pedida por el dueño tras ver la primera
(«que realmente sea mucho más realista y más de película»). Tres mecanismos
nuevos y un hallazgo que evita trabajo futuro:

- **MSAA 4x en la cadena de post** (`system-scene.ts` y
  `observatory-scene.ts`). El renderer va con `antialias: false` y el flag del
  canvas nunca suavizó nada porque todo pasa por render targets; en WebGL2 los
  targets del composer admiten `samples: 4` y Three los resuelve al leerlos.
  Es EL salto de calidad percibida: las aristas de las naves dejan de ser
  escaleras de píxel entero, en el hero y sobre todo en el Observatorio a
  600 px. Sólo con GPU real (`renderScale === 1`): SwiftShader (CI, e2e,
  `shot.mjs`) no paga el sobrecoste y sus medidas no cambian. El quad del
  raymarch no lo nota; quien gana es el pase de los cuerpos, el único que
  dibuja geometría.
- **El governor de resolución prueba también en escritorio.** Se quita la
  condición `pointer: coarse` (quedan `orbit` y GPU real): un monitor escalado
  a 1,25-2 de densidad dibujaba a 1,0 y el navegador estiraba — la misma
  blandura que motivó el governor táctil. En un monitor de densidad 1,0 no hay
  escalones que probar y no hace nada. Medido en el equipo del dueño (AMD
  iGPU, ventana a densidad 2): prueba y se queda en 1,0 — no hay holgura, y
  ése es el diseño («sostenga su propio mejor ritmo»); el teléfono emulado
  sube a 1,25. En escritorios con margen subirá hasta 1,5.
- **Reflexión de entorno analítica en los metales** (kinds 4/5/7 de
  `BODY_FRAGMENT`). Sin cubemap ni textura: el entorno del sistema es
  describible — anillo ámbar enorme alrededor del origen, ceñido al plano
  orbital (normal +Y del mundo, ver `orbitalPosition`), negro en lo demás. El
  rayo reflejado del ojo contra la dirección a Gargantúa, lóbulo ancho + núcleo
  caliente, aplastado en vertical. A diferencia del filete y la lámina no
  depende de `day`: la chapa nocturna también refleja el disco, que es el
  plano clásico de la Endurance a contraluz. Pesos: 0.95 casco
  Endurance/Ranger, 0.55 metal oscuro; pasa por `materialOcclusion`, NO por
  `shipEdge` (el grafito satinado también refleja). Medido: medias +3-4 %,
  p95 Ranger 142→157 (los brillos nuevos), sombras y jerarquía §2 intactas.
- **ACES ya estaba.** El tone mapping fílmico se recomendó como cuarto punto y
  resultó estar activo desde siempre: `ACESFilmicToneMapping` a
  `BASE_EXPOSURE` 0.95 en las tres superficies (mapa, Observatorio,
  laboratorio), modulado por pose. Que nadie vuelva a proponer «añadir ACES»:
  lo que se calibró encima ya lo asume.

El coste del MSAA es memoria de GPU (targets multimuestreados a media
precisión) y un resolve por pase; el raymarch sigue mandando en el coste del
fotograma. `composerTarget` sustituye a `fallbackTarget` y se desecha en el
teardown igual.

## Cuerpos del System Map — pase de realismo sin mover la jerarquía (2026-10-04)

El dueño pidió más realismo en los cuerpos, por este orden: Ranger y Endurance
(las peores para él), luego Miller y Edmunds, Tesseracto opcional. El pase
cambia MECANISMOS de sombreado, no la jerarquía de valor aprobada: medido con
`body-metrics.mjs` sobre la misma ventana antes/después, media, p05/p50/p95 y
croma de los cuatro cuerpos quedan clavados al decimal. Bloom-off en pie.
Presupuestos intactos: cero sitios de FBM nuevos, cero draws (FrontSide
transparente no paga doble pase), cero vértices.

- **Antialias analítico del limbo de los planetas.** El renderer va sin MSAA y
  el canto de una esfera de 50-60 px salía en escalera de píxel entero — la
  señal de render barato más visible del cuadro con GPU real. Miller y Edmunds
  pasan a `transparent: true` (FrontSide, depthWrite intacto) y el fragment
  funde el alfa en el último par de píxeles con `smoothstep` sobre
  `fwidth(n·v)`. La esfera se adelanta a las cintas de órbita (`renderOrder`
  −2 contra −1): la cinta de detrás pierde contra su profundidad y la de
  delante se funde encima — el mismo orden que con material opaco.
- **La envoltura de las naves lee la chapa.** Los términos de filo/envoltura
  de Ranger (153°) y Endurance (117°) se sumaban planos sobre la superficie, y
  como ahí son casi toda la luz de la nave, encima de ellos no se veía ni
  junta ni panel: plástico con forma de nave. Ahora se modulan por la
  luminancia del albedo (que ya trae paneles, juntas, remaches y regueros),
  con el factor centrado en ~1 para no mover la energía.
- **El filo responde como espejo.** Un canto metálico ante una fuente extensa
  no se enciende parejo a lo largo de la silueta: destella donde
  `reflect(−view, n)` apunta a Gargantúa y cae donde no (`mix(0.55, 1.5)` en
  la Ranger, `mix(0.62, 1.38)` en la Endurance, exponente 4).
- **Microrrelieve de casco.** El canal de rugosidad de la textura (acolchado,
  grano, regueros) entra por `reliefOffset` (±4 %), restada la media del canal
  para no correr el terminador; el difuso de la Endurance pasa a `shadedNdl`
  para que la cara a plena luz también lo reciba. La chapa de la Ranger sube
  el recorrido entre paneles vecinos de ±0.065 a ±0.085.
- **Edmunds deja de motearse por píxel.** En el campo que se deriva con
  `dFdx/dFdy` (derivadas por cuadrete de 2×2), `terrain` baja de 0.15 a 0.05:
  su cuarta octava (~1.5 px de longitud de onda) derivada así no era
  orografía sino un moteado cuadriculado sobre el hemisferio diurno. Su papel
  de textura en el albedo no se toca.
- **Tesseracto sin tocar**: base canónica en freeze, y sus aristas finas no
  admiten el fundido de limbo (son tubos, no una silueta cerrada).

Trampa que costó el diagnóstico: `shot.mjs` (SwiftShader) pinta los cuerpos
con píxel gordo y NO sirve para juzgar este pase; el antes/después se miró con
`awards-shots.mjs` (GPU real, DPR 1) y recortes de `crop.mjs`. SwiftShader
sigue valiendo para las MÉTRICAS de distribución, que es para lo que se usó.

## QA para premios — precarga diferida, páginas de lectura y pulido (2026-10-02)

El dueño pidió dejar el sitio impecable para Awwwards, CSS Design Awards y The
FWA: QA completo como jurado, arreglar, publicar y preparar capturas. El
informe con la línea base, cada hallazgo y su estado está en
`docs/reviews/qa-premios-2026-10.md`; aquí sólo las decisiones que cambian
reglas vigentes.

- **Los seis destinos ya no se precargan al abrir la página.** El §7 del
  pivote («la ruta se prefetchea antes de empezar») sigue en pie, pero cambia
  el CUÁNDO. `<Link>` precargaba cada ruta al entrar en el viewport, y los
  seis destinos están siempre a la vista (raíl de la home, cabecera de las
  demás páginas). Medido el 2026-10-02 sobre `next start` en la home: a los
  2,1 s de abrirla el navegador pedía el RSC de los seis mundos (565 KB) y,
  con él, lo que esas páginas declaran con `preload` —el cielo y las ocho
  fotos de Sobre mí, la sala de Proyectos, el ventanal de Experimentos— más
  cuatro hojas de estilo ajenas: 1,3 MB de otras páginas pedidos ANTES que el
  chunk de three.js (872 KB) que dibuja la escena. Y en consola, «preloaded
  but not used» en cada ruta: 1 830 avisos en 174 cargas. Primer intento:
  precargar los seis en segundo plano cuando la escena ya dibujara o seis
  segundos después del ocio. No sirvió para la consola: React aplica los
  `preload` del RSC en cuanto lo recibe y Chrome avisa de cada preload que no
  se usa, se pida cuando se pida (medido: 14 avisos en la home y 19 en
  Formación con la precarga diferida). Así que **todo `<Link>` del sitio pasa
  por `IntentLink`** (`import { IntentLink as Link }`): precarga sólo al
  apuntar, enfocar o tocar, que es cuando precede a una navegación real y los
  preload se consumen; `pointerenter` dispara también en táctil, antes del
  `click`. El §7 del pivote sigue —la ruta se pide antes de pulsar— y la
  travesía (2,6 s) tapa lo que falte. El footer ya no precargaba (decisión
  de 09-23); ahora ningún enlace lo hace por estar a la vista. Cifras A/B de
  Lighthouse en el informe.
- **La nota de privacidad es una página de lectura, como el blog.** Caía en
  la pose de la home (`cameraPoseForRoute(null)`): el sistema entero,
  animado y a plena opacidad, detrás de un titular de tres líneas, y 24
  avisos `GL_INVALID_FRAMEBUFFER_OPERATION` por carga. Ahora `isPrivacyPath`
  la cubre como al blog y lleva el mismo cielo opaco (`BlogSky`). La 404 —que
  se sirve sin layout y sin escena— lleva ese cielo también: era la única
  página sobre un fondo liso. `cameraPoseForRoute(null)` sigue siendo la
  home para cualquier otra ruta sin mundo.
- **El Tesseracto se llama «Tesseract» en inglés.** `cosmicName` era la misma
  cadena en los dos idiomas y «TESSERACTO» en una página inglesa se leía como
  errata. Se localiza en `lib/worlds.ts` igual que su slug del Observatorio;
  los demás nombres son propios y no cambian. Las entradas del blog en inglés
  pasan a ortografía americana (center, color, visualization, recognize),
  que es la de la interfaz.
- **La banda sonora se arma sin crear un `AudioContext`.** Crearlo al entrar
  sólo para que el navegador lo rechazara imprimía «The AudioContext was not
  allowed to start» en cada carga (168 avisos en 174). Si
  `navigator.userActivation.hasBeenActive` es `false`, el reproductor pasa
  a `armed` sin tocar Web Audio y el primer gesto construye el grafo dentro
  de la activación. Mismo estado visible; una línea menos en consola.
- **Detalles de premio:** manifiesto web (`app/manifest.ts`) y `theme-color`
  oscuro (el marco del móvil quedaba blanco alrededor de un sitio que es todo
  espacio); la señal «Descender / Dive in» de Miller pasa a la izquierda
  porque a la derecha la tapaba la bandeja de MOVIMIENTO/AUDIO y su rótulo;
  `og:image` de las entradas del blog en JPG (`prepare-article-og.mjs`)
  porque LinkedIn no pinta tarjetas WebP.

## Presencia web — el repo como proyecto entero y la rutina semanal (2026-10-02)

El dueño: el sitio no es el proyecto; el proyecto es su presencia web entera
(LinkedIn, dev.to, Business Profile, foro de Three.js…) y este repo es donde
se gestiona. Pidió documentarlo y programar un blog semanal en dev.to como
tarea semanal de Claude.

- **`docs/presencia-web.md` manda en canales, cadencia y proceso**: tabla de
  canales con estado y dueño, una entrada por semana (ES/EN en el sitio y
  copia en dev.to con `canonical_url`), proceso de siete pasos, cola de
  dieciséis temas sacados del material real del repo, y qué se mide al mes.
  Semanal y no diaria: dev.to y Google premian la constancia; una cuenta
  nueva publicando a diario se lee como spam y el material honesto no da
  para tanto.
- **Rutina «Borrador semanal del blog»** (claude.ai/code/routines): lunes
  08:00 Santo Domingo, copia del repo en la nube, sin acceso a la máquina ni
  a dev.to. Sólo hace el borrador (`docs/difusion/borradores/<id>/` con
  `es.mdx`, `en.mdx`, `notas.md`) y marca la cola; commit en `main` sólo de
  documentación. Publicar sigue siendo revisión de Jonás + gates + sesión
  local. Si el push falla, PR desde `routine/<id>` y se fusiona a mano.

## SEO — auditoría, especímenes con imagen, retrato con nombre y dos entradas (2026-10-02)

El dueño pidió una auditoría SEO completa para competir por su nombre, sus
servicios, «simulador de Gargantúa / agujero negro» y el nicho 3D, con sus
retratos indexados, revisando Search Console y mejorando o ampliando el blog.
Lo que se vio y lo que se cambió:

- **Search Console (dominio `jonasjavier.dev`, añadido el 09-29).** Tres días
  de datos: 3 impresiones, 2 clics, sitemap leído con 50 URL, 10 rutas de
  exploración válidas, Core Web Vitals sin muestra. Inspección de URL:
  portada, `/en/blog`, `/es/blog` y las entradas de teseracto, portafolio 3D
  y sitio bilingüe ya indexadas; la del agujero negro (EN) «descubierta, sin
  indexar» y `/en/contact/services` «rastreada, sin indexar»: indexación
  pedida para las dos, para `/es/blog`, `/es/contacto/servicios` y la
  versión ES del agujero negro. Tras publicar se pidió la entrada de física en
  los dos idiomas; la guía freelance (ES y EN) queda por pedir a mano (la caja
  de inspección dejó de aceptar texto desde la extensión; el sitemap ya las
  lista). Se valora con consultas reales a las
  3–4 semanas (≈ 10-27), no antes.
- **`www.jonasjavier.dev` no respondía** (sin DNS ni certificado).
  `LEGACY_HOSTS` ya incluye `www` → 308 al dominio canónico, pero sólo actúa
  si la petición llega. El dueño añadió `www` como dominio del servicio `web`
  el mismo día; como Railway gestiona el DNS del dominio (registrado allí,
  nameservers de name.com), creó solo el `CNAME www → jviyvyq4.up.railway.app`
  y el `TXT _railway-verify.www`. Verificado: `https://www.jonasjavier.dev/x`
  → 308 → `https://jonasjavier.dev/x`.
- **Producción iba cuatro commits por detrás de `main`** (tarjeta corta,
  logos de Formación): se publica con este pase.
- **Especímenes del Observatorio con imagen propia.** Antes compartían la
  tarjeta genérica de la portada y no tenían imagen en JSON-LD ni en el
  sitemap. Ahora `public/images/experimentos/observatorio/<id>-{1600,800}.webp`
  y `<id>-og.jpg` (1200 × 630), capturas reales con GPU (Chromium con ventana
  y ANGLE/D3D11 contra producción, modo OBSERVAR, cromo oculto; el headless
  cae al nivel plano). `lib/observatory-images.ts` da las rutas;
  `tools/prepare-specimens.mjs` produce las copias. Van a `og:image`,
  `CreativeWork.image` y al sitemap de imágenes: es la vía para «Gargantúa 3D»
  o «nave Endurance» en Google Imágenes.
- **Cada espécimen enlaza a su entrada del blog** («Cómo está hecho →», bajo
  «Salir del Observatorio» en el cromo y bajo «Volver a Experimentos» en la
  cara servida, `observatory-face__read`, elemento aparte para no romper el
  selector de la prueba de la salida). El espécimen prefiere la entrada de
  WebGL cuando hay varias con su `specimen`; el `CreativeWork` declara
  `subjectOf` esa entrada.
- **Retrato.** El archivo pasa de `F40-*.webp` a
  `jonas-javier-encarnacion-*.webp` (Google lee el nombre del archivo;
  `tools/prepare-about.mjs` mantiene el mapa `OUTPUT_IDS`), el `alt` lleva
  nombre completo y rol en los dos idiomas, y `Person.image` es un
  `ImageObject` con `caption` (`SITE_PROFILE.portraitCaption`). Sigue siendo
  la única foto de «Sobre mí» en el sitemap de imágenes.
- **Metadatos:** el índice del blog no tenía `og:image` (tarjeta por defecto
  añadida); «Sobre mí» usa `og:type profile` con nombre y apellido.
- **Blog: dos entradas nuevas (ES/EN, voz del dueño, sin cifras
  inventadas).** «La física del agujero negro de Interstellar, vista en un
  simulador» (tema nuevo `space`, carpeta de figuras compartida con la
  primera entrada más la portada `gargantua-observatorio`, `specimen:
  gargantua`): para quien busca «agujero negro de Interstellar» y no
  «shader»; física verificable (Schwarzschild, sombra √27/2·rs, DNGR 2015,
  Doppler omitido en la película, EHT 2019/2022) y la lista honesta de lo que
  el simulador hace distinto. «Cómo elegir un desarrollador web freelance en
  República Dominicana» (tema nuevo `freelance`, figuras de la página de
  servicios; `cover` admite un nombre por idioma porque la captura lleva
  texto): guía para quien contrata, con el proceso y las preguntas reales
  de Servicios y casos publicados (OMSTA, Delicaté). Las cuatro entradas
  anteriores se revisaron y no necesitaban cambios de redacción. El e2e del
  blog cuenta 6. Kit de difusión §8 ampliado.
- **Difusión, el mismo día:** el dueño creó el Google Business Profile (en
  verificación) y pidió el perfil de dev.to: <https://dev.to/jonasjavier>
  completado (retrato, bio, habilidades, disponibilidad, formación) y las seis
  entradas publicadas en inglés con `canonical_url` al original, en la serie
  «Building Jonás Orbit, a 3D portfolio» (la guía freelance fuera de ella).
  `tools/prepare-devto.mjs` genera las copias en `docs/difusion/devto/`; el
  editor de la cuenta quedó en «basic markdown» (acepta front matter). dev.to
  limita las publicaciones seguidas de una cuenta nueva (429 «try again in
  300 seconds»; el editor se lo traga sin avisar): una entrada cada ~5 min.
- **Pendiente del dueño:**
  publicar el kit; Bing Webmaster Tools (importa la propiedad de Search
  Console en un clic); revisar la voz de las dos entradas nuevas.

## Tarjeta para compartir la portada — Discord, LinkedIn, WhatsApp, X (2026-10-01)

El dueño: al compartir `https://jonasjavier.dev/es` en Discord no salía la
tarjeta. Pidió diagnosticarlo y una tarjeta 1200 × 630 con «Software real.
Sistemas que llegan a producción.» y Django · React · TypeScript.

- **Diagnóstico.** Producción (Railway, sin proxy de Cloudflare: `Server:
  railway-hikari`) ya respondía 200 `text/html` a Discordbot,
  facebookexternalhit, Twitterbot, LinkedInBot y WhatsApp, con `og:*` y
  `twitter:*` completos en el `<head>` servido (prerender, sin JavaScript),
  imagen PNG 1200 × 630 accesible, sin `X-Robots-Tag`, robots.txt abierto,
  sin redirecciones en `/es`, TLS válido y sin AAAA. Un verificador externo
  (opengraph.xyz) pintaba la tarjeta. La causa probable está del lado de
  Discord: guarda la vista previa por URL (incluida una fallida, p. ej. de
  antes del dominio del 09-28), o el canal no tiene «Insertar enlaces» o el
  usuario tiene las vistas previas apagadas.
- **La tarjeta habla distinto que el buscador, a propósito.** `og:title` /
  `og:description` de la portada: «Jonás Javier — Full-Stack Developer» y
  el oficio (Django, React, TypeScript). El `<title>` y la meta description
  siguen como manda «SEO — nombre, nicho 3D y freelance». Next copia `og:*`
  a `twitter:*`.
- **`og:site_name` = «Jonás Javier»** en todo el sitio (el rótulo sobre la
  tarjeta); «Jonás Orbit» sigue en la imagen, `applicationName` y JSON-LD.
- **Imagen** (`app/[locale]/opengraph-image.tsx`, ImageResponse en build):
  nombre corto en grande, rol en ámbar, las dos frases, el stack y
  Gargantúa a la derecha. Estática: Railway la sirve del prerender y el
  preview de Cloudflare de su caché de assets.
- **`?v=N` en la URL de la imagen** (`DEFAULT_OG_VERSION` en
  `lib/site-metadata.ts`): las redes guardan la imagen por URL; al cambiar
  el diseño se sube el número. La ruta lo ignora.
- Test e2e en `smoke.spec.ts`: el HTML servido a Discordbot lleva las
  etiquetas en el `<head>` y la imagen es PNG 1200 × 630 de < 300 KB.

## Servicios — segundo pase y cabecera centrada del blog (2026-10-01)

Pedido del dueño: la página de servicios «más profesional, más bonita», con
otro fondo y mejor organización; y la cabecera de las entradas del blog, que
se veía descentrada respecto de la portada.

- **Fondo propio** (`.services-sky` en `components/services-page.css`): cielo
  fijo y opaco con el violeta y el cian de Ranger y el campo estelar de
  Edmunds; el hero termina en el horizonte iluminado de un planeta
  (`.svc-horizon`, recortado y fundido para que su borde inferior no asome
  detrás de otra sección). La escena persistente sigue dormida (Ranger).
- **Orden:** hero a dos columnas (titular, entradilla y dos llamadas · ficha
  de trabajo con modalidad, idiomas y herramientas de `knowsAbout`) → cuatro
  tarjetas con una CAPTURA REAL del caso que las prueba (OMSTA web y app,
  Delicaté, Gargantúa), qué incluye y «Hecho en» → proceso en línea de
  tiempo → preguntas frecuentes (`<details>`, respuestas sacadas de lo ya
  publicado en «Cómo trabajo») → cierre con formulario, WhatsApp y el blog.
- **Blog:** la cabecera de la entrada va centrada sobre la portada (a la
  izquierda en el teléfono).
- e2e: O10 del Observatorio falla a veces por redondeo (43,9999 px frente a
  44); no es de este cambio.

## Blog — sección propia, cielo propio y tres entradas nuevas (2026-10-01)

Pedido del dueño: «otro fondo» para las notas (se veían dos agujeros negros:
la escena congelada detrás y la portada delante, y el título no se leía), más
prominencia —«una sección o blog»— y más artículos «de buen material y
completos»; además, un acceso a Servicios desde el hero de Contacto. Sustituye
la parte «Notas de taller» de la entrada de 09-30.

- **Rutas:** `/es/blog` y `/en/blog` (el segmento es el mismo en los dos
  idiomas, `PATH_SEGMENTS.blog`), entradas en `/{locale}/blog/<slug>`
  (`app/[locale]/blog`). No es un séptimo mundo: enlace «Blog» con las
  herramientas de la cabecera (junto al CV, con su línea al estar dentro), y
  en el pie junto a Servicios y Privacidad. Las dos URL viejas de la primera
  nota (`/es/experimentos/como-hice-…`, `/en/experiments/how-i-built-…`)
  redirigen con 308 (`next.config.ts`). Experimentos lista sólo las entradas
  de WebGL («Del blog») y enlaza al blog entero.
- **Fondo:** `components/blog-sky.tsx`, fijo y opaco bajo `.blog-route`
  (`isolation: isolate`): campo estelar de Edmunds a dos escalas, tres
  nebulosas muy veladas, una órbita y las estrellas atenuadas donde se lee.
  La escena persistente DUERME en el blog (`isBlogPath` en
  `lib/world-route.ts` → `covered` en `gargantua-system.tsx`).
- **Entrada:** cabecera sobre el cielo (migas, título, entradilla, autor con
  fecha y minutos de lectura), portada DEBAJO, rejilla de dos columnas
  (índice lateral fijo 14 rem + lectura 46 rem), barra de lectura por
  `animation-timeline: scroll()` (sin JS; `!important` contra la regla de
  reduced-motion), tarjeta «Abrir el simulador» si la entrada tiene
  espécimen, «Quién escribe» con Servicios/Escribirme y «Sigue leyendo».
  Índice y minutos salen de Velite: `content/article-outline.ts` (un plugin
  de rehype pone el id de cada `<h2>` con el MISMO slug que el índice).
  JSON-LD `BlogPosting` (+ `Blog` en el índice).
- **Datos:** `content/articles.data.ts` añade `topic` (webgl / nextjs /
  performance, nombre visible en `components/blog-copy.ts`), carpeta de
  imágenes y `specimen` opcional. El blog ordena por fecha.
- **Entradas nuevas** (ES/EN, datos sacados del código y del registro, con
  cifras medidas; BORRADOR en voz del dueño): «Cómo dibujé un teseracto 4D en
  Three.js», «Un sitio bilingüe en Next.js sin middleware» y «Un portafolio 3D
  que Google puede leer y un teléfono puede mover». Figuras con GPU real
  desde el Observatorio y la portada (con y sin JavaScript), en
  `public/images/articulos/{teseracto,sitio-bilingue,portafolio-3d}/`.
- **De paso:** la lectura de la sonda del Observatorio salía en español en
  `/en` («Arista… eje…»): ahora `Edge… axis…`. La descripción SEO del
  Tesseracto decía «cuatro planos»: gira en tres (XW, YW, ZW).
- **Contacto:** «Ver servicios →» en el hero, botón secundario junto a
  «Escribir un mensaje».

## Identidad pública y CV — enlaces canónicos y formación confirmada (2026-10-01)

El dueño confirmó ocho meses de estudios de Multimedia en ITLA, sin titulación,
y bachillerato cursado entre 2018 y 2022, completado en 2022. Sustituye las
referencias del CV a aproximadamente un año de Multimedia y bachillerato en 2024.
Miller, en ambos idiomas, expresa el período completo de secundaria.

El perfil de LinkedIn se renombró y verificó en el navegador:
`https://www.linkedin.com/in/jonas-javier-encarnacion/`. Es el único enlace
canónico para el sitio, sus datos estructurados, README, CV y perfil de GitHub.
El perfil de GitHub es `https://github.com/JonasJavier`, verificado con la sesión
del dueño. Los enlaces a repositorios concretos conservan su destino propio.
Los PDF activos son `public/cv/jonas-javier-cv-es.pdf` y
`public/cv/jonas-javier-cv-en-ats.pdf`; sus fuentes HTML están en el archivo
local privado `portfolio-content/cv/`, fuera del repositorio público.
El dueño eligió `cv-jonas-es-noche-v2.pdf` como diseño canónico: las versiones
ES y EN comparten esa composición espacial nocturna, también en LinkedIn y
en los enlaces de GitHub. El nombre histórico `cv-en-ats.pdf` se conserva en la
URL para mantener los enlaces existentes; su contenido es ahora el CV nocturno
en inglés y no se presenta como una plantilla ATS.

## Home — placa del operador bajo JONAS ORBIT (2026-09-30)

Sustituye en parte a `hero-gargantua-direction.md` §1/§7 («sin bloque
personal»): el dueño aceptó la crítica de que la home escondía a la vista
quién es y a qué se dedica —estaba sólo en el `<h1>` oculto— y quien llega
desde LinkedIn tiene que poder contestarlo en 3–5 segundos sin «completar una
misión de la NASA». No se convierte en portafolio tradicional: no hay bloque,
ni foto, ni CTA nuevos. Se añade una **placa del operador** dentro del HUD.

- **Qué dice:** `JONÁS JAVIER // FULL-STACK · PRODUCT DESIGN` (ES: `DISEÑO DE
  PRODUCTO`). Nombre corto, como manda la entrada de SEO; la marca sigue siendo
  `JONAS ORBIT`. El rol se traduce (`defineCopy` en `system-hud.tsx`); el resto
  del HUD sigue en inglés de instrumento.
- **Dónde:** colgada de `.hud__system` en posición absoluta, así comparte su
  visibilidad en cada ancho y la franja superior sigue siendo de una línea.
  Escritorio: una línea centrada bajo la marca, nombre en `--hud-secondary`, rol
  en `--hud-tertiary`, separadores en `--hud-ghost`, 0,56rem.
- **Teléfono (≤60rem):** a la izquierda bajo la marca y apilada en tres líneas
  (nombre / Full-stack / Diseño de producto). En una o dos líneas el rol en
  español chocaba con el aviso «Haz clic / Toca para escuchar», que se abre bajo
  la bandeja justo en los primeros segundos; apilada aguanta hasta 320 px. El
  selector de idioma de la portada baja de `+46px` a `+96px` para dejarle sitio.
- **Segundo pase en el teléfono (2026-10-01):** el dueño sintió la columna
  apilada «muy cargada» (marca, nombre, dos líneas de rol y selector) y eligió
  **sólo el rol, en una línea**: `FULL-STACK · DISEÑO DE PRODUCTO`. Quien llega
  desde LinkedIn ya sabe el nombre; le falta a qué se dedica. Puesto en la
  primera línea bajo la marca queda POR ENCIMA del aviso de la banda sonora, así
  que ya no choca. El selector sube a `+64px`. A ≤360 px el tracking baja a
  0,08em para no tocar la bandeja a 320 px. Sustituye al apilado de abajo.
- **Accesibilidad:** `aria-hidden` como todo el HUD — el `<h1>` del respaldo
  semántico (`hero.tsx`) ya dice nombre completo y rol; anunciarlo dos veces
  sería ruido.
- **Verificado** con `tools/shot.mjs` en 1440×860 (escena y `--flat`), 375×812
  EN/ES, 320×640 y 812×375 horizontal. Test unitario en `system-hud.test.tsx` y
  e2e de no-solape (placa ↔ selector ↔ bandeja) en `e2e/idioma.spec.ts`.
- Valoración visual del dueño pendiente.

## Servicios y notas de taller (2026-09-30)

El dueño eligió: servicios DENTRO de Contacto, los cuatro servicios, remoto +
presencial en Santo Domingo, y el artículo en el sitio con copia en dev.to.

- **Servicios** (`/es/contacto/servicios`, `/en/contact/services`,
  `components/services-page.tsx`): hijo de Ranger, no un séptimo mundo. Cuatro
  tarjetas —web a medida, tiendas, apps móviles, UX/UI y 3D— y cada una
  enlaza a los casos publicados que la prueban (nada de precios, clientes ni
  cifras). «Cómo trabajo» en cuatro pasos y dos llamadas al formulario
  (`#transmision`). JSON-LD: un `Service` por tarjeta con la Person como
  proveedor y Santo Domingo como zona. Contacto enlaza con «Ver servicios»
  bajo «Qué puedo llevar a bordo». Título: «Desarrollador web freelance en
  Santo Domingo — Servicios».
- **Notas de taller** (colección Velite `articleProse`,
  `content/{es,en}/articles`, identidad en `content/articles.data.ts`):
  artículos largos bajo Experimentos (`/es/experimentos/<slug>`). La
  primera, «Cómo hice un agujero negro en WebGL», sale de los datos del código
  (`gargantua-shaders.ts`, `gargantua-render.ts`, hero-gargantua-direction
  §14) y es BORRADOR en voz del dueño: él la revisa. `TechArticle` en
  JSON-LD; `<Figure>` en el MDX con copias WebP 800/1600 en
  `public/images/articulos/agujero-negro/`, capturadas con GPU real (ANGLE
  D3D11, no SwiftShader) desde el Observatorio en modo Estudio, HUD oculto.
  La recepción de Experimentos lista las notas en una línea («Notas de
  taller»).
- **Fuera del sitio:** `docs/difusion/` —textos para Google Business
  Profile, dev.to (con `canonical_url` al original), foro de Three.js,
  Reddit, Show HN y premios—. Publicarlos es del dueño.
- **Pendiente del dueño:** revisar la voz del artículo y los pasos de «Cómo
  trabajo».

## SEO — nombre, nicho 3D y freelance (2026-09-29)

El dueño pidió posicionar el sitio en tres frentes: su nombre, el nicho 3D
(portafolio 3D, Gargantúa, planetas y naves de Interstellar) y el desarrollo
full-stack freelance. Sólo metadatos y JSON-LD: nada visible cambia.

- **Nombre.** «Jonás Javier Encarnación» es el nombre completo (títulos, H1,
  `Person.name`); «Jonás Javier» es el corto (plantilla `%s · Jonás Javier`,
  `alternateName`). El completo es único y se gana primero; el corto lo
  hereda cuando el buscador ya los asocia.
- **Portada:** el título dice `Portafolio 3D` / `3D Portfolio` en lugar
  de «diseñador UX/UI» (que pasa a la descripción) y la descripción nombra
  Interstellar como inspiración.
- **Interstellar se nombra como homenaje, nunca como palabra principal.** Va
  en descripciones («inspirado en Interstellar»), no en títulos: la búsqueda
  «Interstellar» a secas es de la película (Wikipedia, IMDb) y quien la hace
  no contrata; en los títulos van los cuerpos y la técnica.
- **Los seis especímenes tienen `seoTitle`/`seoDescription` propios**
  (antes sólo Gargantúa): «Planeta Miller en 3D», «Nave Endurance en 3D»,
  «Tesseracto — Hipercubo 4D»… Son las páginas que pueden ganar las
  búsquedas largas del nicho. La descripción entra también en su
  `CreativeWork`.
- **Contacto** dice «contratar» y «freelance»; **Experimentos**, «3D».
- **JSON-LD:** `ProfilePage` (`mainEntity` = la Person) en «Sobre mí», y
  `description` en Person y WebSite.
- **Pendiente:** página de servicios (dónde vive en la arquitectura de seis
  mundos es decisión del dueño), `sameAs` si abre más perfiles, enlaces
  entrantes (Awwwards, foro de Three.js) y el artículo técnico del agujero
  negro. Se valora con las consultas reales de Search Console a las 3–4
  semanas, no con suposiciones.

## Flujo de git — todo en `main`, sin ramas (2026-09-29)

El dueño vio cinco ramas locales (`dpr-merge`, `dpr-movil`, `movil-compacto`,
`movil-merge`, `prod-dpr`), todas ya fusionadas en `main`, restos de sesiones
anteriores, y pidió dejar sólo `main` y trabajar ahí.

- **Se trabaja y se commitea directamente en `main`.** No se crean ramas de
  feature, ni para cambios grandes: commits pequeños y enfocados, siempre con
  `npm run check` en verde. Sustituye a «crea una rama desde `main`» de
  `CONTRIBUTING.md`.
- **La única otra rama es `production`** (sólo en GitHub): es lo que Railway
  publica. No se borra ni se trabaja en ella; se mueve con
  `git push origin <commit>:production` tras los gates y con permiso del
  dueño (registro «Publicación — rama `production`…»).
- **Los worktrees no llevan rama.** Si hace falta un entorno aislado (build
  o e2e con otra sesión viva), va `--detach` en una ruta temporal y se borra
  al terminar. Si una herramienta crea una rama por su cuenta, se fusiona en
  `main` y se borra en la misma sesión.
- Con varias sesiones en el mismo árbol, se commitea por ruta
  (`git commit -- <rutas>`), nunca `git add -A`.

## Proyectos en el teléfono — la misma mesa, más pequeña (2026-09-29)

El dueño, con capturas de su teléfono: Proyectos en móvil «bien mal», pidió
algo «mucho más profesional, sencillo y minimalista», **con el 3D**, «lo
mismo que la versión normal pero más pequeño y compacto», quitando lo que en
el teléfono no sirve, y revisar el resto de Endurance. Sustituye a «la mesa
se aplana» por debajo de 768 px (§17 y auditoría responsive del 09-29 en lo
que toque a la mesa y al caso en teléfono).

- **La mesa (≤ 767 px)** ya no se aplana: la sala horneada vuelve a verse
  (velo oscuro arriba y abajo, claro en el centro); el destino pequeño, los
  proyectos en cápsulas de 34 px dentro de blancos de 44 que se deslizan y se
  desvanecen en el canto; la lectura con el estado encima del nombre, sin el
  stack (vive en el caso); el selector de capa en una pieza de cristal pegada
  bajo la cabecera; y el holograma con las poses de escritorio —el arco de
  Producto, el carrete de Diseño— de pie sobre un cristal de mesa en trapecio
  (`.table-scene::before/::after`) que lleva el alcance o la decisión. A
  412 × 915, del título al alcance cabe en una pantalla, como en escritorio.
  Ingeniería sigue sin holograma: módulos de dos en dos, el elegido a toda la
  fila con su decisión y su stack.
- **Vara y orden en profundidad.** El holograma no es contenedor (su alto
  depende de lo que lleva la mesa): las pantallas miden en `vw` y en
  `--m-holo-h`; el centro de cada capa vuelve al eje (`--m-cx`) y el carrete
  se abre (`--m-spread` 118vw). Cada pantalla lleva su propia `perspective()`
  —tras el primer `translate`, así el punto de fuga es el centro del
  holograma— en un grupo plano, y quién tapa a quién lo dice `z-index`
  (`data-dist`, la distancia a la elegida, nuevo en `Screen`). Motivo: con GPU
  por software (Playwright/SwiftShader, y Android sin GPU aceptada) Chromium
  no ordenaba el carrete y la vecina cruzaba por delante de la elegida; con
  GPU real sí. Sólo teléfono: escritorio conserva su contexto 3D.
- **El caso (≤ 767 px)** pasa de ~25 000 a ~11 500 px en OMSTA: decisiones
  en un carrusel con imán (asoma la siguiente), sistema de dos en dos, stack
  en líneas corridas, tiras de pantallas más bajas y la lectura larga
  plegada tras sus primeros párrafos con «Seguir leyendo» (`CaseFold` en
  `project-case-nav.tsx`; se abre sola con un capítulo en el hash o el foco
  dentro; sin JavaScript y en escritorio no existe). Nada se quita del HTML.
- **Segundo pase (mismo día): el proyecto primero.** El dueño, con captura
  de OMSTA: «una cabina de avión» —destino, chips, estado, nombre, CTA,
  pestañas, mockup, flechas, problema y decisión a la vez—. Con guion y
  ≤ 767 px (`(scripting: enabled)`, así nada salta al hidratar): una línea
  arriba, `PROYECTOS` y el muelle plegado en `‹ 01 / 05 ›`, cuyo contador
  abre la lista (`.table-dock__toggle`, `aria-expanded`; ↑ ↓, Escape y tocar
  fuera la cierran, el foco vuelve); el kicker y los chips se van. Estado
  pegado al nombre; pestañas en fila con subrayado, sin caja de cristal; en
  Diseño `← 01 / 08 →` centrado con flechas sin aro y SOLO la decisión (el
  problema sigue en escritorio, en el caso y en `aria-describedby`); las
  salidas bajan al final (`.table-read` en `display: contents`) y encogen:
  el sitio contorneado en ámbar y GitHub sólo con su marca, blanco de 44.
  Del pie se ocultan la frase y el párrafo (llegaban tarde); quedan las tres
  cifras. Sin guion, la fila de chips de antes. OMSTA no lleva botón de
  código porque su repositorio es privado (el caso lo dice). El descriptor
  no se recorta: es copy del MDX.
- Pendiente: veredicto visual del dueño en su teléfono.

## Rendimiento móvil — PageSpeed de las siete páginas (2026-09-29)

El dueño pasó PageSpeed (móvil) por las páginas: Sobre mí 86 y Formación 81,
con accesibilidad, prácticas y SEO a 100. La API de PageSpeed sin clave tiene
cuota 0: se mide con Lighthouse 13.5.0 local (el mismo que usa PageSpeed)
contra `next start`, tres pasadas y mediana, A/B contra `main` en la misma
máquina. **Las cifras absolutas locales no son las de PageSpeed**; sólo vale
la comparación.

- **Las imágenes se piden al tamaño que se pintan.** En el teléfono los nodos
  de la constelación miden ~114 px y el retrato ~174 px, pero `sizes` decía
  `43vw` y `480px`: a DPR 2 bajaban las versiones de 640 y 960 (~700 KB).
  Ahora `(max-width: 700px) 120px` y `180px`. **La calidad de las fotos no se
  toca.**
- **Cabeceras con recorte para el teléfono.** El móvil ve de los paisajes
  apaisados sólo una franja (`cover`). `cielo-montanas-movil.webp` (720 ×
  1024, 92 KB frente a 214) lo genera `tools/prepare-about.mjs` empezando en
  el 58 % del sobrante, así que el encuadre es idéntico al anterior;
  `ocean-movil.webp` (franja central de 640, 53 KB frente a 195) se recortó
  una vez desde `ocean.webp`, que no tiene original fuera del repo. Cada
  cabecera se precarga desde el `<head>` con `fetchPriority: "high"` y una
  precarga por versión con su `media`. El shader de Miller calcula su `cover`
  con `naturalWidth`, así que la franja da el mismo agua.
- **La escena persistente —y su sonda— esperan al ocio en las rutas
  cubiertas.** Todas las páginas de mundo cubren la escena y aun así, nada
  más hidratar, se sondeaba WebGL (`readSignals`: un contexto entero, ~250 ms
  en el Chrome sin GPU de PageSpeed, que Lighthouse multiplica por 4: era la
  tarea de ~1 s de TBT de TODAS las páginas) y se bajaba y compilaba
  three.js. Ahora, en ruta cubierta, `gargantua-system.tsx` no decide el
  nivel (ni publica `data-scene`) hasta que `lib/after-load-idle.ts` dice
  que la página cargó y está ociosa (`requestIdleCallback`, tope de 2 s;
  Safari, sin esa API, justo tras el `load`: un retraso fijo chocaba con la
  primera interacción en el e2e de Edmunds en WebKit). Una travesía o salir
  de la cobertura la despiertan al momento. En la home no cambia nada.
- **El agua de Miller arranca con el mismo ocio.** Su contexto WebGL y sus
  shaders (compilación síncrona, ~200 ms sin GPU) corrían al cargar la
  imagen, en plena hidratación; mientras tanto se ve la misma foto quieta.
- **Luz ambiente de Edmunds a 320 px** (antes 480): va a `blur(28–46px)` y
  30 % de opacidad.
- **Medido (A/B local, móvil simulado):** Sobre mí 61 → 70, LCP 5,25 → 4,54 s,
  TBT 765 → 537 ms, peso 1086 → 907 KB (imágenes 465 → 285 KB). Formación
  65 → 67, TBT 1096 → 808 ms, imágenes 193 → 54 KB; su LCP no se mueve
  (3,65 ↔ 3,83 s).
- **Segundo pase, mismas condiciones (antes → después):** Proyectos 66 → 79–82
  (TBT 762 → ~250 ms), Creatividad 72 → 84 (631 → ~130), Experimentos 74 →
  81–92 (660 → ~180), Sobre mí 70 → 78–80 (522 → ~187), Formación 68 → 81
  (806 → 410). Home (63, la escena ES la página) y Contacto (~70) no cambian:
  `RangerCockpit` necesita su veredicto al instante para el vuelo de la
  cabecera y sondea en el render; quitárselo pide rehacer cómo decide «vista
  fija y Detenido» sin GPU.
- **Trampa: FCP bimodal.** Con la hidratación ya ligera, el prefetch de rutas
  de Next (`_rsc` y sus CSS) arranca a veces antes del primer pintado
  observado y el simulador de Lighthouse lo carga al FCP: ~1,37 s o ~1,88 s
  en la misma build (Experimentos 92 u 80). No es una regresión y no se
  retrasa el prefetch, que es navegación real. Comparar medianas de ≥3.
- **Tercer pase (el dueño: «haz lo que tengas que hacer», meta ~90).**
  Sobre mí abierto por capítulo (`#mis-raices`…) bajaba 0,75–1,3 MB de fotos:
  - Escalera de las fotos con un peldaño de **800** (el teléfono pedía ~650–750
    px y saltaba a 960) y **calidad 80** hasta 960; el tamaño completo del
    visor sigue a 86. Comparado al 200 % en F44 y F23: sin diferencia visible,
    −17 %.
  - Fotos de capítulo a ≥ 2,5 px por punto: `sizes` a 60vw (~2×), no 1113 px
    (`F44-1600` pesa 1,38 MB).
  - Los fondos `.about-people` y `.about-slot::before` usan en el teléfono el
    recorte `-movil`: abrir un capítulo bajaba otros 210 KB del de 1536.
  - Edmunds: el `OVERSAMPLE` 1,5 sólo por debajo de 1,5 px por punto (donde
    se midió, DPR 1,25); en pantallas densas la densidad ya reduce el archivo
    y basta con cubrir lo pintado, sin ampliar nunca.
  - Medido (imágenes, Moto G simulado): Lo que disfruto 1313 → 725 KB, Mis
    raíces 756 → 407, Mi camino 1030 → 549, Creatividad 601 → 327.
- **Trampa: el primer pintado local oscila entre ~170 y ~480 ms** en la misma
  build y en todas las páginas (con el hilo principal libre); cuando sale
  tarde, el simulador carga todo el JS descargado al FCP/LCP y la nota cae de
  ~80 a ~55. No es de la página: comparar peso y TBT, y confirmar en
  PageSpeed.
- **Creatividad:** el LCP es el cielo de estrellas de la cubierta, un SVG de
  fondo en CSS que el navegador descubría 300–570 ms tarde: se precarga con
  `fetchPriority: "high"` desde `EdmundsGallery`. Contra producción (Lighthouse
  local): Creatividad 83, Proyectos 84, Formación 92, capítulos 81–83.
- **Descartado:** recomprimir `cielo-montanas-movil.webp` a 72 (90 → 57 KB):
  al 200 % pierde el polvo de estrellas débiles, que es el carácter del cielo.
- **Contacto:** el contenedor de Turnstile lleva `role="group"`: un `div` sin
  rol no admite `aria-label` («Navegación agéntica» 1/2 en PageSpeed).
- **Lo que queda y por qué.** El LCP simulado está atado al JavaScript de
  cliente del layout, no a la imagen: la imagen llega y el pintado espera
  ~400 ms a la hidratación (el chunk del framework se lleva ~1,9 s de CPU a
  4×). Bajarlo pide reducir las islas de cliente del layout: es un proyecto
  aparte. **Descartado:** `experimental.inlineCss` (global, experimental, y
  con ~63 KB comprimidos de CSS por página duplicados en el payload RSC); el
  aviso de «JavaScript antiguo» (13 KB) son los polyfills internos de Next.
  El TTFB de Railway (~300–600 ms sin CDN, páginas ya prerenderizadas y en
  caché) sólo baja con una CDN delante.

## Resolución adaptable de la escena en el teléfono (2026-09-29)

El dueño preguntó por qué la home se ve «en tan baja resolución» en el móvil y
pidió subirla. La causa: el nivel `orbit` dibuja a 1 píxel por punto CSS
(`TIER.orbit.dpr` en `gargantua-render.ts`) sobre pantallas de 2,6-3, así que
el navegador estiraba la escena casi el triple.

- **Qué hace.** En táctil (`pointer: coarse`), nivel `orbit` y GPU real,
  `components/scene/resolution-governor.ts` arranca en 1,0 y prueba escalones
  1,25 → 1,5 → 1,75 (nunca más que `devicePixelRatio`). Sube cuando una
  ventana de 45 fotogramas tiene el percentil 75 del intervalo de rAF
  ≤ 18,5 ms; baja si pasa de 26 ms, y **ese techo queda cerrado** el resto de
  la visita: cada cambio reinicia la acumulación y se vería como grano.
  Descarta 30 fotogramas tras cada cambio, y no mide travesía, pose congelada,
  pestaña oculta ni huecos > 250 ms.
- **Por qué probar y no medir la GPU.** Casi ningún móvil expone
  `EXT_disjoint_timer_query`; con rAF sólo se sabe que hay margen al llegar a
  la frecuencia de refresco. En modo ahorro (30 Hz) se queda en 1,0.
- **Qué no cambia.** `deep` (escritorio) sigue fijo en 1,35; el rasterizador
  por software sigue a media resolución (`SOFTWARE_RENDER_SCALE`), así que la
  suite e2e (SwiftShader) no ve el regulador. El Gargantúa del observatorio no
  lo lleva: converge y deja de dibujar, su coste es otro.
- **Medido** (Chromium + GPU real, 412 × 915 a 2,625): 1,0 → 1,75 en ~6 s;
  con 30 ms de trabajo inyectado por fotograma baja 1,75 → 1,0 en ~7 s.
  `canvas[data-render-dpr]` expone la densidad vigente para las herramientas.
- **Palancas.** `TOUCH_DPR_STEPS`, `FAST_MS`, `SLOW_MS` en el mismo archivo.
- **Corrección — vara relativa y techo 1,5 (2026-09-29, noche).** Tras
  publicarlo, Jonás notó en su teléfono que tocar un cuerpo tardaba en
  entrar. La vara fija de 18,5 ms trataba 60 fps como holgado también en
  pantallas de 90-120 Hz, donde es ir a la mitad: el regulador subía hasta
  1,75 (≈3× los píxeles de antes) con la GPU al límite. Ahora la vara es el
  ritmo más rápido sostenido en la visita (`pace`): un escalón cuyo p75 pasa
  de `pace × 1,15` (`PACE_TOLERANCE`) se deshace y queda cerrado, y los
  escalones son 1 → 1,25 → 1,5. `FAST_MS`/`SLOW_MS` siguen como topes
  absolutos (a 30 Hz no sube). Sin teléfono de 120 Hz a mano, lo prueban los
  tests del regulador; el veredicto es el del dueño en su equipo.
- **Caché de `public/` (misma noche).** Next sirve `public/` con
  `max-age=0` y en Railway cada foto se revalidaba en cada visita (~200 ms
  por foto en el teléfono). `next.config.ts` da a `art`, `audio`, `brand`,
  `cv`, `education`, `images` y `media` un día de caché con
  `stale-while-revalidate` de una semana; no `immutable`, porque los nombres
  no llevan hash y una foto recomprimida conserva el suyo.

## Idiomas — el sitio en inglés, idioma por defecto (2026-09-29)

Pedido de Jonás: versión completa en inglés, **inglés por defecto** y el
español a un clic desde la cabecera, con un selector cuidado y responsive.
Sustituye a la regla del plan «F1A publica sólo ES; `/` → `/es`».

- **Rutas propias por idioma**, nunca reescrituras: `/en/about`,
  `/en/education`, `/en/projects/omsta`, `/en/contact/thanks`,
  `/en/experiments/observatory/tesseract`, `/en/privacy`. Los slugs de los
  mundos siguen en el frontmatter (`content/en/worlds/*.mdx`); los demás
  segmentos, en `lib/path-segments.ts`. Toda URL sale de `lib/page-paths.ts`
  (`PageRef` → ruta en cada idioma): de ahí beben el selector, el `hreflang`
  de cada página, el sitemap y `robots.txt`. Por eso las carpetas
  `proyectos/`, `contacto/` y `experimentos/observatorio/` pasaron a
  `[mundo]`, `[mundo]/[sub]` y `[mundo]/[sub]/[objeto]`: una carpeta estática
  sólo puede llamarse de una manera, y una reescritura (`next.config` o proxy)
  deja `usePathname` distinto en servidor y cliente. Privacidad sí tiene dos
  carpetas (`privacidad/`, `privacy/`), cada una sólo en su idioma.
- **`app/[locale]/layout.tsx` es el layout raíz** para que `<html lang>` sea el
  de la página en el HTML servido. Cambiar de idioma recarga el documento
  (dos layouts raíz): aceptado, se pulsa una vez. La 404 fuera de un idioma es
  `app/global-not-found.tsx` (`experimental.globalNotFound`).
- **`/` → `/en`** por redirect estático; si el visitante eligió español en el
  selector, la cookie `jonas-orbit-lang=es` lleva `/` a `/es`. Sin
  `Accept-Language`: una portada que cambia según quién pregunte no se
  cachea ni se enlaza de forma estable, y un buscador siempre ve el inglés.
- **SEO:** `hreflang` en/es + `x-default` → inglés en cada página y en el
  sitemap; `og:locale` `en_US` / `es_DO` con su alterno; JSON-LD con
  `jobTitle`, `knowsAbout` y país en el idioma de la página, y la Person con un
  `@id` único para los dos idiomas. Títulos y descripciones en inglés escritos
  para búsquedas en inglés («Full-Stack Developer», «Dominican Republic»,
  «Django», «React»), no traducidos palabra por palabra.
- **Texto de interfaz**: objetos `defineCopy({ es, en })` junto a cada
  componente (`lib/i18n.ts`; `NoInfer` obliga a que el inglés tenga las mismas
  claves). Los de cliente leen el idioma con `useLocale()`
  (`components/locale-provider.tsx`); sin proveedor —sólo en pruebas de
  componentes— hablan español, el idioma fuente. «Sobre mí» lleva su texto en
  `components/about-page.copy.ts`. Las vistas del Observatorio tienen su
  inglés en `VIEW_TEXT_EN` (una prueba exige una por vista).
- **Contacto:** el formulario valida y el servidor responde en el idioma de la
  página (`createContactFormSchema(locale)`; el cliente manda `locale`). El
  correo a Jonás sigue en español y dice en qué idioma escribió el visitante.
- **El selector** (`components/language-switch.tsx`): EN | ES en una píldora
  de instrumento; son enlaces a la misma página en el otro idioma (funcionan
  sin JavaScript), con el nombre nativo como nombre accesible, 44 px de área
  táctil y la píldora que viaja al pulsar. Escritorio: junto al CV. Táctil: en
  la barra, a la vista sin abrir el menú. Portada: arriba a la derecha bajo el
  estado del HUD; en teléfono, bajo la marca (la esquina es de la bandeja).
- `WorldPage` y `WorldGlyph` se borraron: ningún mundo los usaba ya.

e2e: `e2e/idioma.spec.ts` (rutas, `hreflang`, selector, cookie, formulario,
teléfono).

## Móvil compacto — adaptar, no comprimir (2026-09-29)

Segunda valoración del dueño sobre el teléfono: «todo compactado, pequeño,
minimalista… adaptar no es llevar a móvil todo lo de escritorio; si hay que
eliminar, se elimina». Todo va en CSS bajo media queries de teléfono (y dos
constantes de la escena); el escritorio no cambia. Ningún texto se reescribe:
lo que sobra se oculta, para no chocar con la versión en inglés en curso.

- **Home.** El raíl deja el panel 3 × 2: seis nombres blancos de 10 px en dos
  filas de tres, sin cuadrícula, fondo, acento ni nombre cósmico
  (`system-map-atlas.css`). Las celdas siguen midiendo 44 px aunque no se
  dibujen: es el blanco táctil que exigen `atlas.spec` y `smoke.spec` (a 40
  fallaban). Gargantúa más pequeño: `PORTRAIT_DISK_FRAME` 0.9 → 1.1 (el
  disco brillante cabe entero; los cuerpos, que se colocan sobre su rayo, se
  achican en la misma proporción).
  La tabla `portrait` se agrupa y baja: Y de 15-90 % del escenario a 18-88 %,
  X hacia el centro; Gargantúa a 0.46 (el CSS del atlas lleva el mismo 0.46 en
  dos `calc`).
- **Sobre mí.** La rejilla de dos columnas se sustituye por la constelación del
  escritorio en pequeño: retrato de 96-124 px en el centro y seis fotos de
  98-128 px alrededor, colocadas en el % donde termina cada línea del SVG (se
  estira con `preserveAspectRatio="none"`). Fuera las elipses, las frases de
  cada nodo y «BONAO · REPÚBLICA DOMINICANA» (220 px que chocaban con los nodos
  laterales). El retrato se descentraba porque el anillo, de ancho fijo, no
  tenía `margin-inline: auto`.
- **Footer.** Se queda la invitación con su botón, los seis destinos como
  índice de texto en 3 × 2, la marca con GitHub/LinkedIn/Email y la línea
  legal. Se van el mapa estelar, la frase de apoyo, números, nombres cósmicos,
  flechas, cargo, ciudad y posición. ~1100 → 504 px (con el hueco de la
  bandeja).
- **Formación.** Certificados en 2 columnas en el teléfono y 3 de 601 a 900 px,
  con tarjeta de miniatura (vista previa, tipo, título, emisor y «ABRIR PDF»
  pequeño; fuera «M / 01 · CÓDIGO» y la línea de detalle). Filtros en una fila
  de cuatro. El resto baja un escalón de tipo y de aire. 9187 → 5327 px.
- **Contacto.** Fuera en el teléfono el manifiesto («Aplicaciones y sitios
  web · Producto…»), la firma «J.» y el rótulo «Fin de la exploración».
  Formulario y panel de frecuencias intactos (le gustan). 5079 → 3810 px.
- **Observatorio, ESTUDIO.** La consola pasa de ~410 px a ~140-180: fuera la
  frase de la vista, la lectura de cámara (sigue en DATOS) y los rótulos de
  grupo; los instrumentos en una fila (sin los corchetes, que ocupaban dos
  caracteres por mando apagado), dos diales por fila y las vistas en una
  línea. Todos los mandos siguen a la vista y con 44 px (O10 / O10 bis). El
  hueco de la bandeja pasa de toda la barra a la pista, la última fila.

Pregunta del dueño, contestada sin cambiar nada: la escena se ve de baja
resolución en el teléfono porque el nivel `orbit` (todo lo que no es clase
escritorio) dibuja a DPR 1.0 (`TIER` en `gargantua-render.ts`) sobre pantallas
de DPR 2.6-3: el raymarch de Gargantúa cuesta por píxel, y a DPR completo serían
~9 veces más píxeles. Palanca si se decide subirlo: un DPR propio para `orbit`
en táctil (1.5) o adaptativo por tiempo de fotograma.

## Auditoría responsive del sitio en móvil (2026-09-29)

El dueño pidió, tras la home, auditar y mejorar TODAS las páginas en móvil
«con excelente UX». Medido en 320 × 568, 390 × 844, 768 × 1024 y 844 × 390
(desbordes, texto < 11 px, blancos < 32 px y capturas por pantallazos). Ninguna
página desbordaba a lo ancho; los fallos eran de uso:

- **La bandeja de MOVIMIENTO/AUDIO tapaba texto y botones al pie de todas las
  páginas.** `components/system-tray.tsx`: en pantallas táctiles estrechas se
  retira al bajar leyendo (48 px seguidos) y vuelve al subir, arriba del todo
  y al final de la página (patrón de la barra del navegador). Nunca con el foco
  dentro ni el panel de audio abierto; con ratón no se mueve. El pie reserva
  68 px en su última fila para que al volver no caiga sobre «Privacidad».
- **Creatividad: filtros, flechas y pie de la galería se quedaban al 8 %.** El
  modo cine los atenúa a los 3,5 s quietos y en táctil ni el scroll ni nada los
  despertaba. El atenuado queda sólo con puntero fino (`hover: hover`).
- **Privacidad: la escena de la home caía bajo el titular.** En pantallas
  estrechas el canvas baja a 0,28 en esa ruta; enlaces del pie a 44 px.
- **Observatorio:** la fila OBSERVAR/ESTUDIO/REAJUSTAR deja 100 px a la bandeja
  en vertical (REAJUSTAR baja de línea si no cabe); índices 01–06 con blanco
  táctil de 44 px sin cambiar lo que se ve.
- **Formación:** los tres botones del hero pasan a rejilla (recorrido a lo
  ancho; certificados y CV a medias).
- **Sobre mí en apaisado:** usa la maqueta de teléfono (dos columnas) en vez
  de la constelación de escritorio cortada.
- **Caso de proyecto:** ritmo vertical en px y no en `vh` en teléfono (se
  quitan 50-90 px de negro entre cada bloque) y la barra de capítulos se funde
  en los bordes para que se note que desliza.
- **Suelo de lectura:** rótulos mono de 7-9 px suben a ~10 px en teléfono (pie,
  Formación, Contacto —las etiquetas del formulario a 11 px—, panel de audio).

e2e `mobile-ux.spec.ts` (bandeja, desbordes, galería en táctil) y suite
Chromium completa 322/322. Valoración visual del dueño pendiente.

## Home en móvil — escenario compartido, cabecera en una fila y raíl en panel (2026-09-28)

El dueño: el index en móvil «se ve mal», tanto en 3D como en 2D; lo quiere
«más profesional, mejor organizado» y adaptable en todos los dispositivos.
Alcance: SÓLO la home; la auditoría responsive del resto queda para después.

**Diagnóstico (capturas a 320–430 px, tablet y apaisado):** la escena 3D
componía en vertical con la elipse de escritorio estirada (×0.72 / ×1.05), así
que los cuerpos salían diminutos y dispersos, Edmunds montado sobre el disco y
franjas muertas arriba y abajo; el canvas iba atenuado (0.86) como telón de una
lista que ya no existe; a 320 × 568 la Ranger pisaba el raíl; la bandeja
(MOVIMIENTO/AUDIO) flotaba bajo la marca o, en apaisado, encima de Edmunds; y
en táctil tocar un planeta no hacía nada (el campo se apagaba entero).

**Lo que manda ahora:**

- **Tres franjas.** Cabecera (marca a la izquierda, bandeja a la derecha, una
  fila), escenario (el sistema) y raíl. El escenario lo declaran
  `--home-stage-top` / `--home-stage-bottom` en `system-map-atlas.css`,
  registradas con `@property` para que su valor calculado llegue en px con el
  área segura incluida; fuera de la home (y en escritorio) valen 0.
- **Una composición vertical para los dos renderizadores.** `portrait` de
  `lib/flat-composition.ts`: X en % del ancho, Y en % del ESCENARIO. El atlas
  la aplica con `calc()`; la escena coloca cada cuerpo sobre el rayo que pasa
  por ese punto (`portraitNdc` en `system-scene.ts`) y la cámara sólo encuadra
  el disco. Apagar el movimiento ya no mueve los cuerpos de sitio.
- **Escena 3D en vertical:** umbral 0.75 → 0.8 (una tablet a 0.75 caía en el
  encuadre apaisado), disco al 0.9 de su radio a lo ancho y atado al alto por
  encima de 0.52 de proporción (`PORTRAIT_DISK_MAX_ASPECT`, la tablet no se
  llena de disco), cuerpos ×0.92 (la cámara queda más cerca que en escritorio).
  En apaisado la pose se encaja dentro del escenario y, sin rótulos anclados,
  con el margen corto. Escritorio: idéntico (escenario 0 → la pose de siempre).
- **Canvas a plena luz en la home estrecha.** La legibilidad la da el panel.
- **Raíl en panel 3 × 2** con filetes de 1 px (una fila en apaisado corto); el
  nombre cósmico sale al enfocar sin reservar segunda línea.
- **Los cuerpos se tocan.** En táctil vuelven los blancos del campo; siguen
  fuera los rótulos anclados.

Medido a 390 × 844 (3D): Miller 33 px de radio de blanco, Edmunds 32,
Tesseracto 45, Endurance 56, Ranger 28; 40 px de aire entre la Ranger y el
panel. e2e `atlas`, `smoke`, `scene-overlay`, `soundtrack`, `voyage`, `motion`
en chromium y mobile-chromium: 126/126.

**Segundo pase (2026-09-29), tras la primera valoración del dueño.** Le gustó
la composición, Gargantúa como protagonista, el raíl en 3 × 2 y que la
interfaz no compita con el universo. Pidió tres cosas, y manda esto:

- **Más presencia de las naves.** `PORTRAIT_EMPHASIS` (sólo vertical): Ranger
  ×1.5 y Endurance ×1.1 sobre `PORTRAIT_BODY_SCALE`; la Ranger pasa de
  (42, 93) a (47, 90), centrada bajo Gargantúa. En el atlas plano, la baliza
  sube a `clamp(72px, min(23vw, 12svh), 160px)`. A 390 × 844: Ranger 42 px de
  radio de blanco (antes 28), Endurance 62 (antes 56).
- **Que se note que se puede tocar.** Etiqueta «Toca para explorar» sobre el
  borde del panel y un aro cian que late TRES veces en cada cuerpo, escalonado
  por orden narrativo; sólo en táctil (`hover: none` y `pointer: coarse`), sin
  aros con el movimiento apagado y sin etiqueta en apaisado corto. Se retira al
  apuntar el primer destino (cuerpo o raíl) y no vuelve:
  `localStorage["jonas-orbit:explorar-visto"]`. Es `aria-hidden`: el raíl ya es
  el índice accesible. No es la respuesta al hover que el dueño rechazó
  (endurance-navigation-interface.md §14): no responde al puntero, se apaga
  sola y no vuelve.
- **Raíl más bajo y más separado del borde.** Celdas de 52 → 46 px (el mínimo
  táctil sigue en 44) y 1,25 rem de aire con el borde inferior (antes 0,75);
  `--home-rail-*` alimenta también el escenario.

e2e de la home 126/126; test unitario de la indicación en
`system-map.test.tsx`. Valoración visual del dueño pendiente.

## Repositorio público, SEO y arranque de la escena (2026-09-28)

El dueño pidió revisar organización, SEO, peso y rendimiento, y hacer público
el repositorio protegiéndolo, con autorización para los cambios necesarios.

- **Licencia: todos los derechos reservados** (`LICENSE`, ES + EN). Público
  para leer y evaluar; prohibido copiar, derivar, desplegar, usar el contenido
  o entrenar IA sin permiso escrito. `package.json`: `SEE LICENSE IN LICENSE`.
  `CONTRIBUTING.md`: no se aceptan PR de terceros; sí issues.
- **Las fuentes salen del repositorio y de su historial.** `Fotos/`,
  `Disenos/`, `portfolio-content/`, `assets/` (~1,1 GB, fuera ya del build por
  `.dockerignore`) quedan en disco e ignoradas; el historial completo se
  conserva en el repositorio PRIVADO `JonasJavier/jonas-orbit-v3-archivo`
  (y en el espejo local `../jonas-orbit-v3-archivo.git`). El historial del
  público se reescribió con `git filter-repo` antes de publicarlo: un clon
  anterior al 2026-09-28 no se puede fusionar, hay que volver a clonar.
- **Las PNG maestras de las capturas no se publican.** Las 215 de
  `public/media/projects/` (~122 MB) nunca se servían —todo pasa por
  `screenSources`, que pide la escalera WebP—. Viven en
  `assets/media/projects/`; `tools/prepare-projects.mjs` lee de ahí y escribe
  en `public/`, como ya hacía con la sala. Velite comprueba ahora que existan
  los peldaños WebP, no la PNG. La ruta `/media/projects/…png` sigue siendo la
  CLAVE de cada captura en el MDX y en el manifiesto.
- **SEO.** Plantilla de título `%s · Jonás Javier` (se busca por el nombre, no
  por la marca). Cada mundo lleva `seoTitle` (≤55) y `seoDescription`
  (110–160) en su MDX, validados por Velite; `title` y `summary` siguen siendo
  la voz de la página. Los casos, sin «| Caso de estudio» y con descripción
  ≤160. `twitter` del layout sólo declara la tarjeta: su título viajaba a
  TODAS las rutas. JSON-LD: `knowsAbout`, migas de varios niveles y
  `CreativeWork` en cada caso y espécimen. `/` → `/es` sigue siendo 307 a
  propósito: `/en` llegará con detección de idioma y un 308 se cachea para
  siempre.
- **La escena compila sus shaders en paralelo antes del primer fotograma**
  (`compileAsync`, `KHR_parallel_shader_compile`), con un render target activo
  —el programa depende de él— y un pestillo `warming` para que `setCovered`
  no arranque el bucle antes de tiempo (ese fue el primer intento fallido).
  Medido con GPU real (AMD integrada, ANGLE/D3D11): la tarea de 2,4–2,7 s al
  llegar a `/es` desaparece; Lighthouse móvil pasa de TBT 7,95 s a ~2,0 s,
  TTI 12,0 → 7,5 s, SI 7,1 → 4,1 s. Igual en `observatory-scene.ts` (−0,9 s
  al abrir un espécimen) y `gargantua-observatory.ts`.
- **La sonda de capacidad no se toca:** su contexto WebGL2 cuesta ~700 ms en
  headless pero 3 ms en un navegador real con el canal de GPU abierto.
- **Código muerto:** fuera la colección Velite `designProse` (sin contenido
  ni consumidor).
- **La sonda de WebGL no corre si no decide nada** (perfil ligero sin
  petición) ni durante la hidratación de `gargantua-system` (los hooks aún dan
  valores de servidor). **La nebulosa del cielo 2D se hornea por franjas** de
  8 ms (`lib/nebula.ts`, mismo resultado píxel a píxel; `onReady` repinta el
  cielo quieto). Con la CPU a 10×, el bloqueo de `/es?no3d=1` baja de ~1,4 s a
  ~0,95 s. Probado y DESCARTADO: envolver las islas del layout en `<Suspense>`
  no midió mejora y retrasaba la hidratación de la bandeja y la travesía.
- **El formulario valida con `zod/mini`.** Next precarga la ruta de Contacto
  desde la portada y la API clásica de Zod llevaba ~72 KB comprimidos a cada
  visita; el chunk de contacto, formulario incluido, queda en 23,5 KB.

## Publicación — rama `production`, cabeceras y límite de tasa (2026-09-28)

El dueño pidió dejar el repositorio listo y subir Jonás Orbit a producción,
con autorización para los cambios necesarios. Esto sustituye, en el método de
publicación, a «no se conecta el repositorio a autodeploy» (09-27):

- **Publicar es mover `production`.** `railway up` no puede con el sitio
  (`public/` comprime a ~280 MB y la subida devuelve 413). El servicio `web`
  construye desde GitHub, rama `production`; un push a `main` nunca publica.
  Se publica con `git push origin <commit>:production` tras los gates, que es
  el «desplegar manualmente una revisión exacta» ya aprobado. `.dockerignore`
  (Railpack lo respeta) deja fuera fuentes, diseño, evidencia y `docs/`.
- **El build de Railway es un gate real.** Corre `npm run check` en Linux con
  `NODE_ENV=production`; el primer intento rompió 120 tests de componentes
  (React sin `act`). `vitest.config.ts` fija `NODE_ENV=test` y 15 s por test.
- **Seguridad en Next, no en `_headers`.** CSP sin nonces (todo se
  prerenderiza; Turnstile es el único origen externo), HSTS sin subdominios,
  `nosniff`, `SAMEORIGIN`, COOP, Permissions-Policy con sensores de movimiento
  permitidos; sin `X-Powered-By`. Recorrido con escena encendida: cero
  violaciones.
- **Límite de tasa en la aplicación.** El dominio no pasa por el proxy de
  Cloudflare: 5 POST/min por IP (`x-real-ip`), bloqueo de 10 min, 429. Cierra
  el bloqueo de «control de abuso».
- **`orbit.jonasjavier.dev` redirige** con 308 al canónico.
- **Metadatos y rutas:** base común de Open Graph (antes `/es` no tenía
  imagen), tarjetas JPEG de 1200 × 630 por caso (55–86 KB frente a PNG de
  2–3 MB), `dynamicParams = false` en idioma y casos (URL inventada = 404 sin
  escribir disco; Next lo registra como `NoFallbackError`), sin `/spike/` en
  robots ni `lastmod` falso en el sitemap. Páginas de error propias.
- **Limpieza:** la comparativa de logos sale de `public/` a
  `docs/media/brand/`; fuera `file.svg`, `globe.svg`, los F42 descartados y el
  cielo de 768 px sin uso. `vite-tsconfig-paths` sobra (Vite lo hace nativo).

Queda del dueño: las dos claves de Turnstile en Railway (sin ellas
`/api/health` da 503 y Railway no enruta el deployment), una entrega real del
formulario y la revisión humana de los enlaces de Netflix y LinkedIn.
Evidencia en `docs/reviews/production-release-2026-09-28.md`.

## Publicación — jonasjavier.dev es el dominio canónico (2026-09-28)

El dueño sustituyó `orbit.jonasjavier.dev` por `jonasjavier.dev` como URL
principal de Jonás Orbit. Esta elección prevalece sobre el dominio de la
entrada «Publicación en Railway» del 2026-09-27. El subdominio
`send.jonasjavier.dev` permanece dedicado al envío por Resend y no cambia.
`NEXT_PUBLIC_SITE_URL` debe ser `https://jonasjavier.dev`, la validación del
contacto debe esperar `jonasjavier.dev` y el widget de Turnstile debe autorizar
ese hostname. El dominio raíz resuelve y tiene TLS válido, pero responde 404
porque el servicio `web` aún no tiene deployment. Conservar `orbit` hasta
verificar el sitio en la raíz; no activar autodeploy ni publicar antes de
cerrar los gates técnicos y de facturación de `docs/production-readiness.md`.

## Proyectos — Wikiverse rehecho: caso completo, en producción (2026-09-28)

El §22 de `docs/design/endurance-proyectos.md` aplica el mismo método desde
`portfolio-content/wikiverse-2026/`. «Wiki Universe» pasa a llamarse
**Wikiverse** y de ficha breve a **caso completo** con `status: production`
(`wikiverse.jonasjavier.dev`): los cinco proyectos son ahora casos completos.
Lo publicado estaba mal —«universos y personajes», 23 pruebas en lugar de 608,
la búsqueda descrita a medias, sin nginx— y se corrigió. 18 de las 23 capturas
en 5 módulos (la de la vista previa, rehecha en producción), 8 decisiones, 18
nodos con 17 aristas y 49 tecnologías. Pie de Endurance: 5 en producción, 2
para clientes reales, 5 casos completos. De paso, `npm run check` vuelve a
pasar en `main` (`*.cjs` con `require`, binario del grafo en knip) y las
cabeceras de cinco carriles ya no se tocan a 1280 px. Abierto: subir y
desplegar la rama de arreglos de Wikiverse (búsqueda e historial) y el
veredicto.

## Publicación en Railway (2026-09-27)

El dueño eligió Railway para Jonás
Orbit v3, autorizó crear un proyecto nuevo y eligió `orbit.jonasjavier.dev`.
Esto sustituye a Cloudflare Workers como destino de producción en el README,
la guía operativa y el workflow; las pruebas y el adaptador OpenNext se
conservan como compatibilidad, pero no publican el sitio. El servicio `web`
del proyecto `6a8d4331-4025-4ab1-a6fb-d618bc054a7c` ejecutará el build y
`npm start`, con `/api/health` como gate de preparación. El dominio tiene DNS
verificado y TLS válido, pero el servicio sigue sin código desplegado. El
dueño confirmó derechos de publicación del audio y aprobó el diseño actual;
no son aprobación de las pruebas técnicas. Faltan las credenciales de
Turnstile/Resend, verificación de entrega real, cierre de WebKit y restablecer
GitHub Actions (facturación). Ningún push puede activar un deploy en
Cloudflare. No se conecta el repositorio a autodeploy ni se publica hasta
cerrar esos gates. La protección de tasa de la antigua infraestructura
Cloudflare no se traslada automáticamente a Railway: resolverla antes de
abrir el formulario al tráfico público.

## Cloudflare — caché de páginas prerenderizadas (2026-09-27)

El preview real
del candidato con Wrangler 4.141.0 sí arranca en Windows, pero la caché `dummy`
de OpenNext deja cuatro destinos en 404 y OMSTA en 500. Se configura la caché
de Static Assets de sólo lectura y su interceptación, siguiendo el modo SSG
del adaptador: las mismas 20 rutas HTML pasan, con redirect y cuatro 404
canónicos conservados. El gate comprueba además contenido semántico, los seis
destinos, el CV y un chunk con header `immutable`. No se añade R2, otro pipeline
MDX, evaluación permisiva,
revalidación ni rutas nuevas. `/api/contact` sigue dinámico y el POST inválido
devuelve 400 sin correo. `npm run test:worker` reproduce el fallo anterior y
entra en CI tras el build del Worker. `public/_headers` da caché immutable sólo
a los chunks con hash de Next. Procedimiento y evidencia en
`docs/production-readiness.md` y `docs/reviews/repository-readiness-2026-09-27.md`.

## Compatibilidad de audio y pruebas de capacidad (2026-09-27)

La revisión
multinavegador detecta `cancelAndHoldAtTime` ausente en Firefox y un evento de
pausa que podía apagar la intención antes de desbloquear el autoplay. La banda
sonora conserva la rampa y `armed` mediante APIs disponibles y prueba ambos
casos; el comportamiento aprobado de AUDIO no cambia. Los e2e de fallback fijan
la ausencia de WebGL, el índice sólo cuenta sus contextos propios y el swipe
inyectado por CDP se limita a Chromium, donde existe esa API. Se normaliza
ruido subpíxel en el blanco de 44 px sin reducir el tamaño exigido. Evidencia
en `docs/reviews/repository-readiness-2026-09-27.md`; los gates siguen vigentes.
El visor exige foco dentro del diálogo nativo al volver desde la interfaz del
navegador, no necesariamente en su botón (Firefox enfoca el propio diálogo).
Lighthouse conserva sus umbrales; su comentario de LCP sale de `assertions`
porque allí se interpretaba erróneamente como otro audit. Los reportes LHCI
quedan ignorados, igual que las capturas de trabajo.
El dispatch manual de CI incluye multinavegador y enlaces para comprobar una
rama candidata antes de fusionar; los PR ordinarios conservan Chromium y el
deploy sigue restringido a `main`.

## Dependencias — actualización dedicada de seguridad (2026-09-27)

Dentro
de la preparación de producción solicitada por el dueño, la rama
`codex/security-hardening` fija Next/ESLint 16.3.6, OpenNext 1.20.6,
Vitest 4.1.11 y Wrangler 4.141.0. PostCSS 8.5.28 y Sharp 0.35.4 conservan
overrides exactos para unificar las versiones parcheadas. La auditoría completa
pasa de 16 avisos a cero y `npm run check` conserva 995 tests en verde. La
evidencia y los gates pendientes viven en
`docs/reviews/repository-readiness-2026-09-27.md`; CI añade auditoría de avisos
altos/críticos. La actualización permanece separada de cambios de interfaz.

## Calidad del repositorio y publicación (2026-09-27)

Por solicitud del dueño,
el README se actualiza a los seis destinos y al estado real de los casos. Se
añaden guías de contribución, seguridad, plantillas y responsables; los
artefactos generados y temporales salen del checkout versionado y siguen
recuperables en Git. `docs/repository-quality.md` define la higiene y la
evidencia; `docs/production-readiness.md`, los gates y el contrato GitHub / Worker.
El deploy espera también Firefox/WebKit y enlaces, declara los bindings
obligatorios y conserva las variables de Cloudflare. La organización del
repositorio no constituye aprobación visual ni certificación de producción:
facturación de Actions, dominio, runtime, licencias y vulnerabilidades requieren
su propia verificación. No cambia la arquitectura narrativa ni la interfaz.

## Proyectos — Izak's Photos rehecho: caso completo, en línea, estudio de demostración (2026-09-27)

El §21 de `docs/design/endurance-proyectos.md`
aplica el mismo método desde `portfolio-content/izaks-photos-2026/`. Izak's
pasa de ficha breve a **caso completo** y a `status: production`: en línea en
`izaksphotos.jonasjavier.dev` con las mejoras del kit ya desplegadas. El
README público del repositorio dice que Izak y el estudio son ficticios y que
precios, cifras y testimonios son de muestra: el caso, el panel de Endurance y
el CV dejan de presentarlo como cliente real (la línea de freelance del CV
decía «dos productos para clientes reales»). El caso reconoce el origen en el
repositorio de Job Nacor. 44 de las 57 capturas en 7 módulos, 8 decisiones,
17 nodos con 19 aristas y 38 tecnologías; 8 pruebas y no 9. Cifras del pie de
Endurance: 4 en producción, 1 lista. Abierto: veredicto y el origen de las
fotografías.

## Proyectos — Delicaté rehecho: en producción con su dominio (2026-09-26)

El §20 de `docs/design/endurance-proyectos.md` aplica el mismo
método desde `portfolio-content/delicate-2026/`. Delicaté pasa a
`status: production`: en línea en `delicate.jonasjavier.dev` (Railway, un
contenedor Docker, PostgreSQL, volumen de fotos); `statusLabel` y el caso dicen
que la salida comercial del negocio sigue en validación. El dueño confirmó
clienta real, catálogo real y la foto de «Jardín Botánico». 30 de las 42
capturas del kit en 7 módulos, 8 decisiones de diseño, 18 nodos en los cinco
carriles con 19 aristas y 43 tecnologías en 10 áreas. Corregido: 18 pruebas y
no 12, sin «4.ª versión» ni WhatsApp como tecnología, saludo sin emoji.
Trampa de orden: un módulo de una sola pantalla queda pobre en el recorrido, y
el primer escritorio de la galería es el que la mesa pone a la derecha. Las
cifras del pie de Endurance (3 en producción, 2 listos) estaban viejas desde
Network. La prueba «sin módulos» pasa a Wiki Universe. CV ES/EN al día y en
una página. Abierto: veredicto.

## Proyectos — Network rehecho: caso completo, desplegado y con demo (2026-09-26)

El §19 de `docs/design/endurance-proyectos.md` aplica a Network
el método del §18 desde `portfolio-content/network-2026/` (kit de otra
sesión, misma regla: lo que falla o no se ve bien, fuera). Network pasa de
ficha breve a **caso completo** y a `status: production`: web y API
desplegadas de forma permanente en Railway con PostgreSQL y Redis, demo
pública y `/health/` verde; `statusLabel` y el caso dicen que no tiene
usuarios reales. 62 de las 77 capturas del kit en 9 módulos (escritorio
reducido a 1920), 8 decisiones de diseño comprobadas en el código, 27 nodos
en los cinco carriles con 36 aristas y 55 tecnologías en 10 áreas. Trampa del
esquema: si todas las pantallas entran por la API, elegir cualquiera enciende
el sistema entero (`nodePath` es un cierre transitivo); las pantallas van a su
dominio y el transporte va aparte. Rótulos sin palabras largas (a 1280 px se
partían con guion). El botón del caso dice el `label` del enlace demo, como la
mesa, y una sola captura con módulo ya no es un recorrido. Repositorio
canónico `cs50w-network`; el caso publica las cuentas de la demo por decisión
del dueño. CV ES/EN al día y en una página. Abierto: veredicto, y
«Aprendizajes» en la voz del dueño.

## Proyectos — OMSTA rehecho: web y app móvil, recorrido por módulos y tecnologías (2026-09-26)

El §18 de `docs/design/endurance-proyectos.md`
manda sobre el §17 en cuántas pantallas monta la mesa, el final del caso y
cómo se dicen las tecnologías. El dueño pidió que OMSTA abarcase de verdad
un sistema «muy muy grande» —más información, capturas y módulos— y su app
móvil (React Native + Expo), y que cada proyecto y su mesa detallen todas sus
tecnologías. Material nuevo de otra sesión en `portfolio-content/omsta-2026/`,
hecho de cero con la regla del dueño «si algo falla o no se ve bien, no se
incluye»; la carpeta vieja `portfolio-content/omsta/` se borró con su
permiso. Velite gana `module` por captura (todas o ninguna), `stack` (el
inventario por áreas) y `tech` por nodo. El caso: sección **Tecnologías** y,
con módulos, **Recorrido por módulos** con cada módulo entero. La mesa monta
sólo las pantallas que levanta (`onTable`: 10 de 61 en OMSTA), aprieta las
filas de un sistema grande (`92cqh / rows`, medido a 1280/1440/1920; hasta
ocho filas no cambia nada) y quita miniaturas a un esquema de cinco carriles
por debajo de 1800 px. El inspector dice las tecnologías del módulo elegido.
Peldaño WebP de 1920 para el visor. Trampa: el carrete llevaba el foco por
`:nth-of-type` y, con la mesa montando parte de las pantallas, lo dejaba en
otra (`data-screen`). iOS se dice como es: probada en Android, configurada
para iOS, sin build ni tiendas. Confirmado el mismo día: la agencia es
**CristegnoViajes SRL** y son **15 usuarios** (caso y CV); las decisiones de
diseño, revisadas por delegación del dueño (§18.5). Abierto: veredicto.

## Proyectos — tercer pase: la mesa cambia de función y el caso se rehace (2026-09-25)

El §17 de `docs/design/endurance-proyectos.md` manda sobre el
§16 en capas, lectura, mesa física, muelle y contenido de Diseño, y sustituye
la ficha antigua de `/es/proyectos/[slug]`. El dueño hizo suya una crítica
larga de la mesa y pidió rehacer «Explorar proyecto» «totalmente diferente,
profesional, hasta el fondo» y dar protagonismo al selector de proyectos; la
advertencia de la crítica —no convertirla en un dashboard, mejorar restando—
es la regla del pase. Contenido nuevo en Velite: quinto carril
`integraciones` (WhatsApp sale de infraestructura), `scope` (tres cifras que
el caso ya afirma) y `designDecisions` (problema → decisión → pantalla, sólo
con texto que ya estaba; borrador para que lo revise el dueño), más la `luma`
medida de cada captura. «Resultado» pasa a **Producto** (enseñaba el producto,
no un resultado): la mesa muestra el Alcance en Producto, explica decisiones
en Diseño y es el mapa del sistema en Ingeniería (anillo de módulos por
carril que sigue al foco). Elegir un módulo enciende su RUTA entera
(`nodePath`) y apaga el resto; el esquema sólo dibuja los carriles ocupados;
la sala cede −18 % / −8 % y las pantallas se exponen por luma con una rodilla
sobre 0,8 (Wiki dejó de comerse la sala). Fuera «Misiones construidas» y la
ficha de tres cifras de la columna. Muelle: barra de cristal con ← →,
cápsula y pista de luz deslizantes, vista previa, teclado y rueda horizontal
sólo sobre él. El caso: escena dormida, hero con el producto entero, ficha,
alcance, reto, decisiones con su pantalla, `SystemExplorer` (esquema e
inspector compartidos en `components/system-diagram.*`), resultados, visor
`<dialog>`, lectura larga con índice pegajoso y cierre con anterior/siguiente.
Hecho en paralelo con una crítica visual adversarial por tarea y un
refinado, y una revisión adversarial final del diff (9 hallazgos confirmados y
corregidos: el más grave, el `<dialog>` del visor anclado arriba del
documento, que subía la página a 0 al abrirlo). Verificado en un worktree
aislado (el `next start` ajeno de :3000 no se tocó): `npm run check` en
verde; `e2e/proyectos.spec.ts` al día y `e2e/proyecto-caso.spec.ts` nuevo,
40/40, más smoke, navbar y travesía. Abierto: veredicto del
dueño, redacción de `scope`/`designDecisions`, dos llamadas a contacto al
final del caso, arquitecturas y URL `kind: demo`.

## Proyectos — la mesa en limpio, segundo pase (2026-09-24)

El §16 de
`docs/design/endurance-proyectos.md` manda sobre §4, §5, §7 y §15 en
composición, lectura, capas, mesa física, sala e interacción. El dueño
rechazó la construcción del mismo día («hay mucho texto»; minimalista,
moderna, interactiva, profesional, realista, creativa) y dejó el cómo a
criterio con el boceto del 09-21. La lectura queda en nombre + una línea
(la cola del título o la antetitular) + estado + «Explorar proyecto», igual
en las tres capas; tres cifras de los datos abajo; el stack grabado en la
mesa. Resultado: tres pantallas en arco atadas a la mesa. Diseño: un carrete
con UNA línea de nota. Ingeniería: esquema por carriles (cadenas seguidas,
corchetes, rodeos por media fila libre, SVG estirado que coincide con las
cajas sin medir el DOM) + inspector (capa, decisión, recibe/entrega). Mesa
física en perspectiva real. Sala: render 3D procedural horneado
(`tools/render-projects-room.mjs` → `assets/proyectos/sala.png` → WebP de
23-107 KB), sin texto, interfaz, pantallas, figura, mesa ni cian.
`designNote` y `architecture.summary` retirados del esquema y de los MDX
(sus originales siguen en el caso). Revisión adversarial: 27 hallazgos
confirmados y corregidos (el más grave, `mix-blend-mode` dentro del grupo
3D aplanaba toda la perspectiva). Trampas: la utilidad `.table` de Tailwind
(`display: table`); reseteos que ganan a las clases (van en `:where()`);
la perspectiva en el padre directo; `img` topado al 100 % por el preflight;
lo inerte se lleva el `alt` de lo que contiene; una animación infinita que
mueve cajas deja a Playwright sin «estable»; el encendido puesto por
atributo al hidratar escondía lo ya pintado. Unit, componente y
`e2e/proyectos.spec.ts` en verde. Abierto: veredicto visual del dueño,
arquitecturas, URL `kind: demo`.

## Proyectos — la mesa de ingeniería construida (2026-09-24)

El §15
«Construcción» de `docs/design/endurance-proyectos.md` manda sobre §5-§9 y
§12 en **cómo está hecha la mesa y en qué se aparta del plan**. El dueño
pidió continuar con los cinco proyectos ya documentados y un sitio visible
para «visitar el sitio web» (URL pendientes). Las tres entregas van juntas:
`components/projects-page.tsx` + `engineering-table.tsx` + `projects-page.css`,
la parte pura en `lib/engineering-table.ts` (poses derivadas de los datos,
nunca escritas por proyecto), `architecture` en los cinco MDX con sus
palabras (51 nodos, 59 aristas), `frame: mobile` en las siete capturas de
teléfono, 95 peldaños WebP y `content/projects-media.json` medido por
`tools/prepare-projects.mjs`. Siete desvíos razonados: carriles fijos en
`projects.data.ts` y no por MDX; `designNote` y `architecture.summary`
copiados tal cual del caso porque un párrafo del MDX compilado no se puede
recortar; el manifiesto de medidas en vez de parsear PNG; **`endurance` NO
entra en `COVERED_WORLDS`** —habría congelado el caso completo, que es hijo
del mismo mundo— y cubre sólo su portada por `isWorldIndexPath`; las
líneas se dibujan con las fracciones de los nodos y no midiendo cajas, que
alabean con el paralaje; en móvil Ingeniería va en filas sin líneas; y el
muelle usa el título cortado en la raya. «Visitar el sitio» sale de `links`
`kind: demo` y hoy ningún MDX lo lleva. `ProjectGrid`/`ProjectCard`
retirados con su CSS. P1-P12 verdes (unit, componente y `e2e/proyectos.spec.ts`
en los dos proyectos Chromium). Trampas: `naturalWidth` miente con `srcset`
de anchos (el ancho real se lee del nombre del peldaño); la escena
persistente no dibuja en una página quieta; el panel del navegador captura
a DPR 2 recortando; `overflow: clip` y no `hidden`, o el selector pegajoso
de móvil se rompe; y `container-type: size` no puede vivir en el mismo
elemento que `preserve-3d`. Abiertos: confirmar arquitecturas, URL de
producción, foto de la sala, conector por fila en móvil, valoración visual.

## Proyectos — Delicaté publicado antes de la mesa (2026-09-23)

El dueño
pidió incluir Delicaté antes de construir la mesa de ingeniería; cierra la
decisión abierta §13.1 de `docs/design/endurance-proyectos.md` a favor de
cinco proyectos y modifica el plan principal, que lo dejaba en F1B.
`delicate` entra en `F1A_PROJECT_IDS` con `phase: "f1a"` y conserva
`order: 5` (§13.4 sin cambios). El caso se reescribió contra el repositorio
real (`65a15e7b`) y no contra el texto del 08-03, que afirmaba filtros por
beneficio que el código no tiene: sólo filtra por categoría. Datos
verificados ese día: 12 pruebas, `check` y migraciones limpios, lint y build
del frontend correctos, 69 KB de JS comprimido, ~2.200 líneas sin
migraciones. Ocho capturas nuevas en `public/media/projects/delicate/`
(escritorio 1440 × 900 a 1,5×, móvil 390 × 844 a 2×) sustituyen a las seis
anteriores, que cortaban «Hablemos», mostraban un carrito de un producto y un
catálogo a medio desplazar; incluyen la administración de Django. Se
capturaron con Playwright sobre una base SQLite desechable y una sesión de
administrador sin contraseña creada sólo para capturar. **Trampas:** las
variables de entorno globales de la máquina llevan la configuración de OMSTA
(`DJANGO_ALLOWED_HOSTS` y otras) y hacen que Delicaté responda
`DisallowedHost`, así que el frontend cae al catálogo de demostración sin
avisar de la causa; hay que arrancarlo con esas variables anuladas. Y
«Agregar» abre el carrito, que tapa la siguiente tarjeta. **Se retiró el
enlace al repositorio**: es privado (los de Izak's, Wiki Universe y Network
son públicos) y guarda en su historial tres `.env` versionados, uno con
credenciales. Volverá cuando el dueño rote esas credenciales, limpie el
historial y lo haga público. Pendiente del dueño: confirmar «negocio real»
(el README de Delicaté lo llama «proyecto de portafolio personal»).

## Gargantúa — sin retículo fijo en el centro (2026-09-23)

§7 bis de
`docs/design/hero-gargantua-direction.md` sustituye §7 sólo en la marca de
calibración centrada del visor. El dueño señaló sus dos trazos laterales como
dos rayitas que parecían estar dentro de Gargantúa. Se retira el glifo completo,
incluidos sus dos trazos verticales; marco, brackets, franja superior, TARGET y
retículo móvil del puntero siguen intactos. No se toca Gargantúa, el raymarch,
el bloom ni el rastro de polvo.

## Footer — misma paleta exacta y más animación (2026-09-23)

El dueño
corrige el primer pase: mismos colores que la navbar y movimiento más
visible, con estrellas fugaces. `footer-observatorio.md` §«Segundo pase»
manda en paleta y ritmo: tokens compartidos en `voyage-palette.css`, fuera
el baño violeta y el degradado del título. Perfil de cielo del footer a
8 px/s, fugaces de 1,3 s cada 3,5–6,5 s, primera al llegar y traza de 12 s.
El interruptor global y la suspensión por visibilidad siguen mandando.
La navbar conserva su paleta y ritmo. Valoración visual pendiente.

## Footer — complemento vivo de la navbar (2026-09-23)

Petición del dueño
de mejorar el footer y darle una animación similar a la cabecera. El pase
candidato se documenta en `docs/design/footer-observatorio.md`: mismo
`VoyageSky`, marca y acento por mundo; invitación con acceso orbital al mapa,
seis destinos en una franja adaptable y perfiles al cierre. El cielo y la
traza sólo corren a la vista, en primer plano y con movimiento ON. HTML
servido completo, sin sonido ni dependencias nuevas. El CTA de Contacto
sigue abriendo el correo; los demás llevan a Contacto. Pruebas de servidor,
pausa y reanudación añadidas; navbar, typecheck, Knip y build verificados.
**La valoración visual del dueño sigue pendiente.**

## La Ranger despega siempre al entrar (2026-09-23)

El dueño tenía que
recargar varias veces para que el vuelo arrancara. Causa: la limpieza del
efecto del ventanal llamaba a `loseContext()` sobre un `<canvas>` que React
NO retira —el doble montaje de StrictMode en desarrollo, Fast Refresh—; el
montaje siguiente pedía `getContext` a ese mismo canvas, recibía el contexto
perdido, su `webglcontextlost` llamaba a `markUnsupported()` y la cabina
quedaba «Detenida» hasta recargar. Al entrar navegando (desde Sobre mí, ida y
vuelta) fallaba 8 de 8; recargando en la propia página, no, porque ahí
`live` se enciende después de hidratar y el doble montaje ocurre en vacío.
Ahora `lib/webgl-release.ts` (`releaseWhenDetached`) suelta el contexto una
tarea después y sólo si el canvas ya salió del documento; lo usan la Ranger y
el océano de Miller (mismo patrón). Medido con GPU real y ventana visible:
15/15 despegues (directo, recarga, desde la portada, desde Sobre mí, ida y
vuelta), ~28 cuadros/s. **Trampa**: con Chromium sin cabeza el rAF se frena
y los draws salen a 0–22/s; para medir el ritmo, `HEADED=1`
(`node .shots/ranger-boot-probe.mjs`). La suite e2e corre el build de
producción, sin StrictMode: no habría visto este fallo.

## El encendido por defecto no monta la escena en un equipo que no puede (2026-09-23)

`docs/design/movimiento-unificado.md` §«Tres lecturas». El
commit 5711581 (09-22) hizo `useForcedEffects()` verdadero por defecto para
que reduced-motion no congelara la escena, y de paso el gate dejó de mirar al
equipo: el System Map se montaba sobre GPU por software, donde **un fotograma
bloquea el hilo principal ~6 s** (medido con SwiftShader en Chromium sin
cabeza, que es lo que corre la suite e2e). Ése era el origen común de siete
e2e rojos en `main` —clics del mapa que no navegaban en 5 s (A20, A21, A29,
«el fondo sobrevive»), la línea de la cabecera que no se podía leer
(navbar:139)— y es un sitio congelado para cualquier visitante sin
aceleración. Ahora `useExplicitEffects()` (icono o `?no3d=0`) es lo único que
supera las tres heurísticas de equipo (`explicit` en `capability.ts`); el
encendido por defecto sigue superando reduced-motion. **Trampa**: una sonda
con `chromium.launch()` a secas usa la GPU real en Windows y NO reproduce
nada de esto; la suite corre en SwiftShader. En el mismo pase: el pie de
universo (7cdd907) se llama «Destinos del pie» y duplica los nombres de los
mundos en cualquier página, así que los localizadores `/Tesseracto/` o
`/Endurance/` se acotan a su región; en el modo `sencillo` del mapa (§14) el
raíl no PINTA `locked` (el e2e lee `MAP_HOVER_MODE`); A28 ya no espera que
reduced-motion apague nada; el Observatorio encendido no tenía **ningún**
encabezado accesible (la cara servida, con el único h1, va `inert`) y ahora
el nombre del espécimen es el h1 mientras está encendido; y la Ranger que se
abre con el movimiento apagado ya no crea contexto WebGL. **Cerrado el mismo
día** («haz lo que recomiendes»): el Observatorio, el índice de Experimentos y
el vuelo de la Ranger aplican la misma regla; en vez de adelgazar el shader
del túnel (un 20 % más caro que el anterior en SwiftShader), un equipo sin
aceleración ya no lo dibuja. Los e2e que prueban el render lo piden
explícitamente (`conEscenaViva`, `?no3d=0`). Los más pesados (O5, la cubierta
de Edmunds) todavía fallan a veces SÓLO con la suite entera en paralelo. La
suite limita por eso el paralelismo a cuatro workers locales y dos en CI: los
fallos de C2/C4 y salida del Observatorio del 2026-09-26 pasaron 6/6 al
repetirlos aislados y no justificaban relajar sus aserciones.

## Ranger — hero mínimo y panel de enlace (2026-09-23)

La sección
homónima de `docs/design/ranger-contacto.md` manda en la primera pantalla y
en el orden de `/es/contacto`. Hero como la referencia del dueño: destino,
título, una línea, UN botón y «o abrir mi correo»; el panel derecho baja a un
bloque mínimo `RANGER / EN TRAVESÍA / HORA`. El formulario sube justo debajo
del hero y los canales pasan a UN panel de enlace después: correo, WhatsApp
(con el número: el teléfono aparte se retira) y LinkedIn a la izquierda;
radar, CV ES/EN y GitHub a la derecha. Se retiran el módulo «Mandos», la
cinta de rumbo, el retículo y el bloque «Tripulación» suelto. En móvil la
consola sube antes del manifiesto para que el botón aterrice en el
formulario. Valoración visual abierta.

## Ranger — travesía por el agujero de gusano (2026-09-22)

La sección
`Travesía por el agujero de gusano` de `docs/design/ranger-contacto.md` manda
sobre `Cabina de mando` en **ventanal, vuelo, marco y composición de la primera
pantalla de `/es/contacto`**. Pedido del dueño: vuelo ligado al interruptor
global, «que el espacio y el tiempo se doblen como al cruzar el agujero de
gusano de Interstellar», sin planetas, continuo, y **el hero al 100 % del
viewport**. El ventanal pasa a sangre (`100svh`), se retiran el casco y el
montante (queda un visor de esquinas) y el panel de instrumentos baja justo
debajo, con enlace «Canales directos». El shader es otro: tres paredes de hilos
de luz con Doppler cian/ámbar, ángulo que gira con la profundidad (espirales),
sección del tubo que se retuerce, boca que se desplaza sin deformar el anillo,
gas violeta y cian, y el cielo del otro lado lensado con anillo de Einstein.
**Todo es periódico en profundidad (48) y la distancia se envuelve ahí**: sin
fin, sin costura, sin pérdida de precisión. **Apagar el movimiento congela el
último fotograma** (canvas y contexto se quedan; se liberan al salir), que
sustituye a «pausar retira el canvas». HUD: VUELO «En travesía / Detenido»
sustituye a FRECUENCIA, que pasa a la cabecera de su módulo. Con reduced-motion
del sistema la cabina devuelve sus animaciones CSS mientras el interruptor esté
en «on». Medido en GPU integrada a 2048 px: 16,2 cuadros/s contra 14,7 del
ventanal anterior. Valoración visual abierta.

## Bandeja — ON/OFF legible y audio encendido por defecto (2026-09-22)

`docs/design/movimiento-unificado.md` §«El icono» y
`docs/design/sonido-del-sitio.md` §2. El dueño no distinguía encendido de
apagado: con reduced-motion el satélite no gira, y sólo cambiaba un punto de
5 px. Ahora ON = icono y borde cian, halo y etiqueta `ON`; OFF = borde
discontinuo, icono tachado y `OFF`; el audio añade `MUTE` en ámbar. El audio
retenido por el navegador hasta el primer gesto es `armed` y se muestra ON; la
clave guardada pasa a `jonas-orbit:audio-on` para olvidar «apagados» viejos.

## EL SONIDO DEL SITIO (2026-09-22) — manda sobre todo lo anterior en qué suena, con qué peso y quién lo apaga

`docs/design/sonido-del-sitio.md`. Lo pidió el
dueño tras aprobar la travesía: sonido leve al apuntar los objetos de la
portada, agua en Miller, y carta blanca para el resto. **Un solo bus**
(`lib/audio-bus.ts`): un `AudioContext`, un maestro, un limitador y un único
sitio donde se mira si el visitante silenció; la travesía se refactorizó encima
sin cambiar ni una de sus voces. **Lo apaga el control de AUDIO y nadie más** —
el de MOVIMIENTO no entra, porque un sonido no se mueve; única excepción
razonada: el encendido de motores de la Ranger, que cuelga del mismo `data-boot`
que el vuelo. `lib/sfx.ts` son **catorce recetas y un renderizador**, sin un
solo archivo, con el criterio de un instrumento y no de una aplicación: **nada
suena como una notificación**. Cada receta trae su `gap` —cruzar el mapa no
puede ametrallar; los tres del encendido van a cero porque son UNA secuencia—.
`worldPitch` hace del mapa un instrumento: razones de entonación justa por orden
narrativo, con Gargantúa una cuarta por debajo; medido con 2 % de error. El mar
de Miller (`lib/ocean-ambience.ts`) es el único sonido sostenido y sus dos
lavados van a periodos **primos entre sí** (23 y 37 s) porque un mar no tiene
compás. Tres defectos que sólo aparecieron midiendo: **el primer sonido después
de que el bus duerma se pierde** —`resume()` es asíncrono y `currentTime` está
congelado, así que la envolvente caduca; la corrección es `WAKE_LOOKAHEAD` de
80 ms al despertar, y alargar el temporizador NO lo arregla—; **una Q alta sobre
ruido deja pasar muy poca energía**, que es lo que dejaba el barrido del anillo
a la mitad que un simple hover; y el limitador no es opcional porque el
visitante puede subir el volumen al 100 %. Y dos trampas de medición: **`next
start` no recoge una reconstrucción en caliente** (medir contra un servidor
viejo dio por buena una corrección no desplegada) y **con la ventana detrás no
se disparan los eventos `focus`** aunque `document.activeElement` sí cambie, así
que ahí se verifica por clic. **Segundo pase (§7 del documento), pedido por el
dueño de oído:** el mar de Miller sonaba a **plena escala** porque su entrada
larga llevaba `out.gain` a 1 y pisaba el peso declarado en `LEVEL` —una
constante muerta que ninguna medición cazó porque el mar se midió una vez y se
comparó consigo mismo; **un valor sólo está verificado cuando se ha comprobado
que MOVERLO mueve la medida**—, así que la rampa sube ahora hasta `LEVEL` y
`LEVEL` es 0,4, el 60 % menos que pidió (pico 0,223 → 0,083, RMS 0,046 → 0,019,
exacto porque el limitador no llega a actuar). Y el blip de apuntar la portada
se rehace entero: lo que lo hacía un AVISO no era el volumen sino el ataque de
4 ms (un clic), la onda triangular (armónicos impares donde el oído es más
sensible) y el chasquido de aire de encima (el «tick» de una interfaz); pasa a
seno, ataque de 16 ms, un rastro de aire y una quinta más grave —la escala del
mapa baja de 1110-2497 Hz a 785-1765—, con peso 0,2 → 0,07 y pico medido
0,0223 → 0,012. **Tercer pase (§8), y manda sobre los dos anteriores en qué
suena en la portada y en Miller:** el dueño rechazó también esa versión y trajo
**dos archivos** (`public/audio/hover.mp3` y `public/audio/miller-ocean.mp3`),
así que ahí se acabó la síntesis. **El principio de «cero bytes» era un medio y
no un fin** —era la forma de no arrastrar una licencia por un pitido—, y cuando
el dueño escucha dos versiones y ninguna le gusta, el equivocado es el
argumento. Los grabados viven APARTE (`lib/audio-samples.ts`), sin disfrazarse
de receta dentro de `sfx.ts`, y siguen colgando del bus. Con ellos se retiran
`worldPitch` y sus tres pruebas —**el mapa ya no es un instrumento**: la
grabación es la misma para los seis y afinarla por `playbackRate` le cambiaría
el largo; el sitio por donde volvería está señalado en `ping()`— y el mar
sintetizado entero con sus periodos primos. El mar **no se reproduce con
`loop`** porque el archivo entra desde el silencio y termina en el cero digital:
son DOS elementos que se cruzan con cinco segundos de solape, medido sin hueco.
El dueño oyó los dos archivos y pidió menos volumen en los dos, así que los
pesos bajan al **40 %**: blip **0,06** (pico medido 0,0072) y mar **1,6**
—mayor que uno porque la grabación viene a RMS 0,0071: el número no dice
cuánto suena, dice cuánto hay que levantarla— con salida medida en diez
segundos continuos pico 0,064 y RMS 0,0035, una quinta parte de RMS que el
sintetizado. Y dos trampas de medición, la segunda de las cuales **corrige por
escrito una nota anterior de este mismo párrafo**: el sitio tiene **DOS
`AudioContext`** —el bus para los efectos y el de `soundtrack.ts` para la
música, que en la portada es el que primero llega a la salida—, así que lo que
se anotó como «un `ScriptProcessor` dispersa sobre un golpe corto» (ocho
disparos entre 0,0033 y 0,0307) era la sonda midiendo LA MÚSICA: con una sonda
por contexto el mismo disparo mide 0,00722 cuatro veces seguidas, idéntico a
cinco decimales. Y **un limitador no es transparente por debajo de su umbral**:
reproducida la cadena en un `OfflineAudioContext` con un golpe a −44 dB, sin
limitador sale 0,00635 (la aritmética exacta), con él asentado 0,00722 (+1,1 dB
fijo) y en el primer medio segundo del contexto 0,00365, porque el detector
arranca frío. O sea: la aritmética predice el orden, no el dígito, y **el
primer sonido de una sesión no sirve de muestra**. **Queda abierto declarar la
procedencia y la licencia de los dos archivos.** Escena, cámara, materiales y
composición no cambian. Su valoración sonora queda abierta.


## Travesía — el sonido, el pestillo y el alabeo (2026-09-22)

El apartado
`Segundo pase — el sonido, el pestillo y el alabeo` de
`docs/design/travesia-espaciotemporal.md` manda sobre el resto de ese documento
en **qué se oye al viajar, quién lo apaga y qué hace la cámara durante la
distorsión**. Lo pidió el dueño: «algún sonido para la animación en 3D cuando
se le da click a un planeta». El sonido **se sintetiza y no se descarga**
(`lib/voyage-audio.ts`): sin licencia que justificar —la banda sonora ya
arrastra esa deuda—, cero bytes, y sobre todo porque hay SEIS destinos y
`VOYAGE_FLAVOURS` ya les da cuatro números; leyéndolos, **el sonido no acompaña
al efecto, sale de sus mismos números**. `voyageSoundFor(id, mode)` es una
función pura —la partitura— y el reproductor sólo la renderiza, igual que
`voyage.ts` con la línea de tiempo. Cuatro capas: pestillo, caída, distorsión y
cruce, con lente → el tono CAE (sólo Gargantúa) y el golpe pesa más; líquido →
Q 13 y vibrato; retícula → onda cuadrada y confirmación en octava; negro → el
filtro maestro se cierra. Lo apaga **el control de AUDIO, no el de movimiento**
—un solo mando para todo lo que suena—; medido con MUTE: cero `AudioContext` y
pico 0,000000. Una trampa que costó la entrega: **una exponencial que arranca
en épsilon no es un hinchado, es silencio** —de 0,0001 a 0,55 multiplica por
5 500, así que a mitad de camino lleva el 1,3 % y todo el rango audible se
apila en el último quinto; la caída entera medía RMS 0,0009—: los hinchados van
lineales en amplitud y las caídas exponenciales terminan en −34 dB del pico, no
en cero. Y dos trampas de MEDICIÓN nuevas: **un medidor por
`requestAnimationFrame` no sirve para medir audio** (con el panel oculto rAF se
para: 6 muestras en 4,5 s contra 352 bloques de un `ScriptProcessor`), y **la
escena no publica `data-scene-live` con el panel oculto**, así que sin empujar
pantallazos se acaba midiendo la travesía reducida. De la animación cambian dos
cosas: un **latido de exposición** en el pestillo (`4·u·(1−u)` sobre `uLock`,
pulso exacto sin residuo; NO es un aro, eso ya se rechazó) y **3,4° de alabeo**
del cuadro durante la distorsión, porque entre 1,35 s y el pico la cámara se
quedaba clavada. Cerrar más la distancia de parada queda **descartado con
números**: el anillo de Einstein va a 1,08 limbos y el limbo ya toca el borde
con la compresión del shader, así que acercarse lo echa fuera de pantalla; el
alabeo es el único grado de libertad gratis porque no cambia ni el tamaño
aparente ni el radio del anillo. **La composición NO alabea** —rueda la cámara,
el sistema no— o los cuerpos rodarían con ella y se moverían en el mundo a
mitad de viaje. Duración, fases, momento del cambio de ruta, versión reducida y
flavours no cambian. Su valoración visual y sonora queda abierta.


## Proyectos — la mesa de ingeniería (2026-09-21, plan aprobado, sin construir)

`docs/design/endurance-proyectos.md` manda sobre `WorldPage` + `ProjectGrid` en
**composición, interacción, contenido de arquitectura y límites de
`/es/proyectos`**. Dirección del dueño: una sala oscura con una mesa de
proyección donde el proyecto elegido se lee a tres profundidades —Resultado,
Diseño, Ingeniería— con los MISMOS objetos en tres disposiciones, no tres
pantallas. Tres principios: una sola escena y tres poses por pantalla movidas
por `data-layer`; la arquitectura es CONTENIDO (`architecture` en el frontmatter
del MDX, validado por Velite; el diagrama del boceto no es OMSTA y no se dibuja);
y las decisiones van pegadas a los nodos. Sin WebGL, sin arrastre, sin modo
cine; `endurance` entra en `COVERED_WORLDS`; capturas en peldaños WebP por
`tools/prepare-projects.mjs` a 1,5× lo pintado. Tres entregas y matriz P1-P12
en el documento. Abiertas para Jonás: Delicaté (F1B) en la mesa, confirmar los
borradores de arquitectura del §6, y la fotografía de la sala
(`assets/proyectos/FUENTES.md`). `/es/proyectos/[slug]` no cambia.


## Endurance — doce módulos de tres familias (2026-09-21)

El apartado
`Cuarto pase — doce módulos y tres siluetas` de `docs/design/endurance-jerarquia.md`
sustituye el tercer pase. El dueño pidió menos módulos y diferencias reales
según dos referencias nuevas. Doce: cuatro estaciones largas de doble panel
oscuro, cuatro hábitats con casetes y cuatro bodegas blancas cortas, anchas y
más profundas. Dieciséis caras térmicas, ninguna en las bodegas. Doce nudos
con escotillas circulares por ambas caras. Anillo 1.22, dos brazos, núcleo y
Rangers conservados. Cuatro draws, 12 123 vértices; radio medido 6.2575212966.
SVG, conteos y registro factual actualizados. Valoración visual pendiente.

## Endurance — catorce módulos y forma de referencia (2026-09-21)

El apartado
`Tercer pase — catorce módulos y cuerpos prismáticos` de
`docs/design/endurance-jerarquia.md` manda sobre el segundo pase. El dueño pide
retirar dos módulos y corregir su forma contra las mismas tres referencias.
Son 14, más largos y menos gruesos, con pie estrecho, hombros inclinados en
anchura y profundidad y cuerpo prismático. Paneles longitudinales de tres
franjas, seis aberturas en la zona de servicio y tres registros en la tapa.
`endurancePod` construye cuatro secciones reales; el bisel genérico queda para
las Rangers atracadas. 28 caras térmicas expuestas. Radio del anillo 1.22,
`boundsFill` 0.96 y cuatro draws conservados; radio físico medido 6.0906807906.
El SVG y los conteos reflejan los 14 módulos. Valoración visual pendiente.

## Endurance — segundo pase con referencias (2026-09-21)

El apartado
`Segundo pase — referencias de la Endurance` de `docs/design/endurance-jerarquia.md`
manda sobre el pase anterior. El dueño retiró explícitamente las alas térmicas
y pidió más módulos, menores, con un anillo mayor. Ahora son dieciséis, unidos
por cuellos cilíndricos; anillo de radio 1.22 frente a 0.88, dos tubos habitables,
núcleo corto con collar hueco y dos Rangers centrales. Paneles térmicos integrados
en ambas caras: 32, expuestos y comprobados con rayos. Fuera los dos rieles,
las alas y el muelle rectangular del anillo. Cuatro draws; radio físico
5.6365331193 y `boundsFill` 0.96, porque la envolvente ya no la fijan unas alas.
El SVG y `DATOS` reflejan la arquitectura. No cambia `placement`, la cámara del
mapa ni la luz compartida. Valoración visual pendiente de Jonás.

## Endurance — jerarquía y muelle de misión (2026-09-20)

`docs/design/endurance-jerarquia.md` manda sobre los pases anteriores en
geometría y materiales de la Endurance. Pedido explícito del dueño: mejorar
la nave, usando sus capturas del Observatorio como referencia. Doce módulos
tangenciales en tres familias, núcleo facetado con collar hueco, muelle de
misión en +X, dos alas térmicas y una Ranger atracada. Se retiran el cono,
mástil central, horquillas y bultos superpuestos. Cuatro draws y radio
6.2689430815 conservados; 32.6 % menos triángulos. Grafito y radiadores tienen
respuesta de reflejo propia; no se toca la luz común ni los otros cuerpos.
El esquema SVG refleja la misma arquitectura. No es la implementación de la
página Proyectos ni un despliegue interactivo de proyectos. Su valoración
visual queda pendiente de Jonás.

## Sobre mí — constelación personal (2026-09-14)

`docs/design/sobre-mi-constelacion.md` manda en contenido y composición de
`/es/sobre-mi`. El dueño aprobó la maqueta y pidió construir conservando la
navbar. Seis constelaciones, F40 como retrato central y F28 en Cómo soy,
fondo generado de cielo/montañas, fotos reales y textos breves. SiteShell y
navbar originales intactos; movimiento conectado al interruptor global. La
escena persistente duerme también en Gargantúa porque ahora la cubre el álbum.
No convertir las aficiones en CV ni publicar los detalles privados del sueño.
La autorización de publicación de E03/Bonao City sigue pendiente; ver las fuentes.

## Sobre mí — explorar una constelación (2026-09-15)

El apartado `Pase de
exploración` de `docs/design/sobre-mi-constelacion.md` manda en navegación,
copy, fotos y encaje del hero. Entrada sin capítulo abierto; un único slot,
índice contextual y seis hashes canónicos, también sin JS vía CSS `:target`.
Transición de 340 ms/10 px que obedece al interruptor global y, en esta página,
a reduced-motion por petición explícita. F02/F16 confirmadas como predicación;
F34/F15 en Mi gente; F20/F07 en disfrute; F11 sustituye a F13, retirada también
de public. Mantenimiento no se etiqueta como Betel: nuevas fotos pendientes.
Dos carruseles pequeños de portadas sin autoplay. Navbar, cierre y footer
conservados. Aprobación visual del pase pendiente del dueño.

## Sobre mí — revisión editorial (2026-09-15)

El apartado `Revisión editorial
del pase` de `docs/design/sobre-mi-constelacion.md` sustituye el pase inicial en
hero, fondos y carruseles. Título compacto sin subtítulo ni frase duplicada;
F23 mejorada de miniaturas sustituye a E03 (retirada de public); fuera F42/hielo
y desplegables redundantes. Cielo detrás de todos los capítulos. Carruseles
ampliados con autoplay de 5,5 s solicitado por el dueño: sólo visibles, pausa
al interactuar, interruptor global y reduced-motion. Retrato real de Zimmer con
crédito. Betel explicado. Navbar/cierre/footer intactos; aprobación visual pendiente.

## Experimentos — simplificación y silencio (2026-09-23)

`tesseract-experimentos.md` §«Pase de simplificación» manda en el pie de
`/es/experimentos` (una frase y su eco, sin hechos), en el estado de las filas
(sin «LISTO» en reposo) y en la pista táctil del visor. El Observatorio deja de
sonar: fuera `acquire`/`lock`/`mount`/`deploy`/`stow` y sus `detent`
(`sonido-del-sitio.md`). La bandeja de audio enseña «Haz clic / Toca para
escuchar» mientras la música espera el primer gesto. Aprobación visual
pendiente.

## Sonido — desbloqueo al primer gesto (2026-09-23)

`sonido-del-sitio.md`
§2 «Dice ON pero no suena». Rueda y puntero nunca desbloquean (política del
navegador); el primer toque en táctil sí se perdía y ya no: la banda sonora
escucha los cinco eventos de activación en captura. Un `<audio>` que suena en
un contexto suspendido cuenta como `armed`. Indicador de «esperando un clic»
pendiente de decisión del dueño.

## Sobre mí — pase de pulido (2026-09-22)

`Pase de pulido` en
`docs/design/sobre-mi-constelacion.md` manda en Raíces (dos columnas, F23 entera
y ampliable), copy de Mi gente, abuelos y Cómo soy, listas de gustos (sólo
artistas; 18 + 18; sin Fight Club ni Psycho-Pass) y cintas automáticas en CSS
sin botones. El retrato CC BY de Zimmer se sustituye por portada para poder
quitar el crédito. Las cintas y el centelleo corren con reduced-motion mientras
el interruptor esté encendido (restauración valor a valor, como Edmunds).
Aprobación visual pendiente.

## Sobre mí — simplificación (2026-09-15)

`Simplificación de recuerdos` en
`docs/design/sobre-mi-constelacion.md` manda en copy de vínculos, disfrute y
camino: frases breves, abuelos con foto mayor y planes a todo el ancho bajo las
fotos. No recuperar los párrafos retirados. Aprobación visual pendiente.

## Fuente de verdad

`docs/plans/jonas-orbit-v3-mission-endurance.md` (plan
aprobado con eng review CLEAR). No abras decisiones arquitectónicas nuevas sin
pasar por ese documento. La matriz de tests vive en su Appendix A.

## Página de Edmunds — cubierta de observación (2026-09-11)

`docs/design/edmunds-creatividad.md` documenta la segunda implementación de
`/es/creatividad`, pedida por el dueño el mismo día tras rechazar la primera
(«la galería 3D no me gusta, quiero que sea más inmersiva; el foco de toda la
página debe ser la galería 3D»). La página abre directamente sobre la galería,
que ocupa la primera pantalla ENTERA con el cromo superpuesto y lleva el
`h1`: anillo de obras en CSS 3D con suelo de rejilla, reflejos, nebulosa,
estrellas, polvo, luz ambiente de la obra activa y el limbo de Edmunds bajo el
horizonte; HUD con lecturas `OBRA / SECTOR / REGISTRO`; retículo sobre la obra
centrada; raíl de sectores; paralaje de ±2° con puntero fino. Sigue sin WebGL,
sin bucle y sin autoplay. El catálogo pasa de 60 a **90 obras en siete
sectores con Diseño primero** (Diseño, Horizontes, De cerca, Criaturas,
Retratos, Invierno, Después del sol), ordenadas como un viaje, con `caption` y
`medium` nuevos en el esquema de Velite. Dos reglas que costaron una entrega
cada una: **en un contexto 3D real el plano de la lista está en z = 0, delante
de toda obra empujada en Z, y se traga el puntero** — los contenedores llevan
`pointer-events: none` y sólo las obras lo reciben —, y **un suelo inclinado
dentro del mismo contexto 3D que las obras se levanta por delante de la activa
y pinta una franja sobre la foto** — el suelo vive en su propia perspectiva,
detrás. Un cuarto pase añade el **modo cine** —la instrumentación se atenúa
tras 3,5 s sin entrada y vuelve con cualquiera— y rehace el orden dentro de
cada sector con criterio (las más fuertes primero, «Fantasía» abre, el
homenaje a Interstellar cierra Diseño); las 90 obras se conservan porque la
curación manual la hará el dueño. Un quinto pase **simplifica**: la cabecera
es una sección propia que respira, la cubierta ocupa un viewport ella sola con
sólo filtros, flechas y título, y desaparecen lecturas, raíl, leyendas de obra,
cabeceras de sector y bitácora; el arrastre lleva el anillo con la mano. El
System Map, sus cuerpos, cámara y materiales no cambian. Su valoración visual
queda abierta.

## Página de Miller — océano en WebGL2 y formación en curso (2026-09-12)

la sección `Océano en WebGL2 y formación en curso` de
`docs/design/miller-formacion.md` manda sobre el resto de ese documento en
**cómo se anima el hero de `/es/formacion` y cómo se presenta lo que Jonás está
estudiando ahora**. El canvas 2D que desplazaba filas enteras —«gelatina», no
agua— se sustituye por un contexto WebGL2 propio que refracta la fotografía con
un campo de oleaje en perspectiva y luz desde la derecha; el cielo no se toca y
la foto sigue siendo el fallback. Se conservan consentimiento, pausa, 30 fps,
suspensión fuera de pantalla y reduced-motion; sin WebGL2 desaparecen canvas y
control. La escena persistente sigue dormida detrás: nunca hay dos contextos
dibujando. El esquema de Velite gana `education.inProgress` —sin `href` ni
`preview` a propósito— y la página lo muestra como «En curso» entre los
estudios y el punto de partida; cuando un curso tenga documento, la entrada se
MUEVE a `certificates`, no se duplica. La dirección de vídeo del hero queda
descartada. El System Map, sus cuerpos, cámara y materiales no cambian.

## Página de la Ranger — cabina de mando (2026-09-13)

La sección `Cabina de
mando` de `docs/design/ranger-contacto.md` manda sobre el resto de ese
documento en **composición, interacción y límites de `/es/contacto`**. El
dueño rechazó la cabina de comunicaciones del día anterior («no me gusta la
versión actual») y pidió algo totalmente distinto, «estar como dentro de una
nave espacial». Ahora el visitante va sentado DENTRO de la Ranger: ventanal en
WebGL2 propio sin ningún asset (estrellas en vuelo, nebulosa violeta y cian,
mundo azul con nubes y atmósfera, todo con paralaje de cabeza por planos),
casco en SVG con montante, HUD cian sobre el cristal con lecturas reales (hora
en Santo Domingo, rumbo = `placement.phase`) y un panel ámbar con los tres
canales como frecuencias, radar e interruptor de vuelo. La consola del
formulario mide la potencia de señal campo a campo y sus botones de misión
escriben en el `<select>` real. Tres reglas: **un solo estado gobierna todo lo
que se mueve** (consentimiento, pausa, reduced-motion, perfil ligero) y sin
WebGL2 el interruptor desaparece; **el encendido es aditivo** —nada se oculta
antes de animarse, el HTML servido ya está completo—; y **la escena persistente
duerme también en la Ranger** (`COVERED_WORLDS`). `public/images/ranger/` se
retira. El System Map, sus cuerpos, cámara y materiales no cambian. La
cabina quedó aprobada por el dueño el mismo día y un **segundo pase** (sección
`Vuelo`) hizo que el vuelo se sintiera como tal: el campo de estrellas se
indexa por DISTANCIA recorrida —los motores arrancan en 2,8 s y las estrellas
y el polvo cercano se estiran en estelas radiales según la velocidad—, la
nave alabea y deriva con armónicos lentos aplicados a toda la vista, la cinta
de rumbo sigue el mismo `yaw`, y el mundo gira bajo la nave con la distancia.
La búsqueda de estrellas es de cuatro celdas, exacta porque ninguna mide más
de media celda. Su valoración visual queda abierta.

## Experimentos — recepción y encendido del instrumento (2026-09-17)

La
sección `La recepción y el encendido del instrumento` de
`docs/design/tesseract-experimentos.md` manda sobre el §4 y el §5 de ese
documento en **cómo se entra al Observatorio**. Dirección fijada por el dueño:
*hay dos acciones distintas —viajar a Experimentos y operar Experimentos—*, así
que el viaje desde el System Map sigue siendo la travesía y entrar al
laboratorio NO es otro viaje, es encender un aparato. `/es/experimentos` deja de
ser ficha editorial y pasa a recepción instrumental (vestíbulo fotográfico
—ventanal, limbo, suelo y una figura que fija la escala; original e informe de
origen en `assets/experimentos/FUENTES.md`, copias por
`tools/prepare-experiments.mjs`— más índice de seis con `LISTO` / `SIN MONTAR`).
**La sala NO es una columna al lado del texto**: va espejada —medida la
luminancia, su arco sube a la derecha y su jamba encendida caía justo bajo el
catálogo—, ocupa el 58 % del ancho recortada del 12 % al 80 % de su alto, y se
funde a negro durante un tercio de su ancho para que las primeras filas caigan
sobre el limbo. La cabecera es una lectura de tres líneas que acaba en
`OBSERVATORIO EXPERIMENTAL · 02 / 06 MONTADOS`; la prosa del mundo baja al pie,
detrás del índice. Entra por la cascada de `[mundo]/page.tsx` como Miller y Edmunds,
sin tocar `BESPOKE_WORLD_IDS`. Elegir una muestra dispara `ACQUISITION LOCK`:
`ADQUIRIENDO → BLOQUEO → MONTANDO` en 1,08 s, navegación **por temporizador**, y
mientras tanto se descarga el módulo de la escena. En el laboratorio la cara
servida deja de ser un respaldo y es el estado en frío del aparato
—`INSTRUMENTO · EN ESPERA`, con el esquema de `FlatWorldBody` donde caerá el
espécimen— hasta que `onFirstFrame` publica `data-state="nominal"`. Tres reglas:
**el aviso de llegada va después de `composer.render()`, nunca en el `.then()`
del import**; **exactamente UNA de las dos superficies está viva** (la otra va
`inert`, o hay dos salidas y dos nombres accesibles); y **atenuar una capa la
vuelve translúcida, no oscura** — el vestíbulo se apaga contra un velo negro, su
pared es opaca porque un interior no tiene estrellas dentro, y en móvil se
oscurece con negro encima en vez de bajarle la opacidad. La sala se pinta a la
ALTURA de la ventana y deduce su ancho de la proporción del encuadre, que es lo
que la deja por debajo del 44 % donde arranca el índice; el degradado que funde
su canto derecho se mide EN LA IMAGEN y no en el viewport.
`lib/observatory-catalog.ts` es el catálogo único; el par instrumental del §14.1
vive en el MDX (`observatory.pair`) y `registro` es opcional. El tramo final de
cámara (fov 50→40 y barrido de fase) queda **aplazado a propósito** hasta el
veredicto visual. Su valoración visual queda abierta.

## Observatorio V1.5 — instrumentos, no interruptores (2026-09-17)

La sección
`V1.5 — de manipular un modelo a investigar un objeto` de
`docs/design/tesseract-experimentos.md` manda sobre el §5 y el §8 en **qué
instrumentos ofrece el Observatorio y qué puede enseñar como medido**. Cuatro
piezas nuevas y ninguna caja nueva: **vistas curadas** (`lib/observation-views.ts`),
que NO son encuadres sino otra geometría de luz resuelta por el mismo
`observationPlacement` —una vista puede ALEJARSE, nunca acercarse: la silueta del
Tesseracto respira treinta y un puntos y cualquier factor menor que uno la
recorta—; **telemetría** de azimut, elevación, distancia en radios del espécimen
y ángulo de clave, escrita en el DOM por referencia y no por estado de React;
**SONDA** sobre el Tesseracto (`lib/tesseract-probe.ts`), que nombra la arista, su
eje —X/Y/Z/W, verdad del hipercubo porque dos vértices adyacentes difieren en un
bit y ese bit ES el eje— y su profundidad en W, sin raycaster y re-evaluando
`sampleTesseract`, que es pura; y **comparación por pulsación sostenida** en
`BLOOM` y `MATERIAL`, donde `preventDefault` en `pointerup` NO cancela el clic y
el reloj es `performance.now()` porque el `timeStamp` sintético es de sólo
lectura. `DATOS` pasa a `OBJETO / OBSERVACIÓN / RENDER`, y el orden es la
lectura. **Gargantúa no tiene vistas**: las cuatro del §7 son especificación, no
código. Dos fallos preexistentes corregidos: `--obs-inset` vivía en las
escuadras, que son HERMANAS del raíl, así que el catálogo se pintaba pegado al
canto —una custom property sólo la ven los descendientes—; y el panel de lectura
se sentaba encima del raíl. `MEDIR` A→B y alambre/normales siguen aplazados. Su
valoración visual queda abierta.


## Observatorio V2 — dos modos y una luz que se mueve (2026-09-18)

La sección
`V2 — dos modos, y una luz que se puede mover` de
`docs/design/tesseract-experimentos.md` manda sobre `V1.5` y sobre el §5 en
**qué se ve al entrar al Observatorio y dónde vive cada mando**. Diagnóstico del
dueño sobre la V1.5: «hay mucha información y se siente ahora todo muy pesado».
La corrección no es quitar rótulos: es que **mirar** un espécimen y **medirlo**
son dos actividades y el aparato tenía las dos encendidas. `data-mode` reparte
el visor en **`OBSERVAR`** —reposo: espécimen, nombre, catálogo, salida y la
mano con el ratón— y **`ESTUDIO`**, que despliega la consola. La consola NO se
desmonta al plegarse: se va con `inert` + `visibility`, y eso hay que probarlo a
propósito porque **jsdom no implementa `inert`** y los mandos de una consola
plegada siguen apareciendo por rol. El modo cine pasa a existir **sólo en
`OBSERVAR`**. La cabecera baja de seis líneas a tres: `NOMINAL` se convierte en
un punto, `AZ/EL/DIST` bajan a la consola, `CLAVE` pasa a ser MANDO y la lectura
de la sonda se pega a la retícula. **Instrumento `LUZ`** (`lightGeometry` /
`lightPlacement` en `lib/observatory.ts`): no hay lámpara que arrastrar —la luz
es el origen— así que gira el ESPÉCIMEN alrededor del origen con la cámara
rígidamente enganchada; misma cara, mismo encuadre, misma distancia, otra luz, y
el espécimen no sale de su esfera de `ORIGIN_DISTANCE_RADII` para no cambiar el
carácter del haz. Sus dos números —`CLAVE` 0-180 y `GIRO` −180..180, medido en
PANTALLA— son a la vez lectura: orbitar los mueve solos. `lightPlacement` y
`lightGeometry` son inversas exactas, y **el desplazamiento cámara-espécimen se
reconstruye desde la esférica, nunca desde `camera.position`**, que sólo se
actualiza una vez por fotograma pintado: leyéndolo, el dial saltaba de 52° a 49°
en una pulsación. La sonda ya funcionaba —136 aciertos en un barrido de 288
posiciones— y lo que fallaba era que la lectura salía a seis líneas del punto
señalado. La sensación de nave sale de GEOMETRÍA, no de datos: alféizar,
velo —el espécimen se hunde detrás del panel, nunca se reencuadra—, bastidor con
regla vertical soldada por los bordes de los rótulos, diales con aguja de 2 px,
selector con muescas que crecen por `scaleY` (con `height` empujan la palabra) y
caída de luz en los bordes. Dos fallos de alcance corregidos: **la bandeja global
mide 293 px a 20 px del canto** y se comía `Reajustar`, así que la barra se
ordena a la izquierda y reserva su sitio; y entre 544 y 768 px no actuaba
ninguna reserva. En móvil el bastidor **se aprieta y no rueda**: con techo y
desbordamiento, `DATOS` y `REGISTRO` quedaban fuera y O10 bis los cazó —un mando
que hay que desplazar para tocar es un mando que no está—. Su valoración visual
queda abierta.

## Observatorio V3 — Gargantúa, el espécimen sin malla (2026-09-19)

La sección
`V3 — Gargantúa, el espécimen que no es una malla` de
`docs/design/tesseract-experimentos.md` manda sobre `V2`, el §6 y el §7 en **qué
ofrece el Observatorio a un objeto sin geometría y dónde viven los números que
lo dibujan**. El catálogo pasa a `03 / 06 MONTADOS`. `createBody` devuelve `null`
para ella, así que rompía tres contratos a la vez —la ruta leía
`preset.instruments` y Gargantúa no tiene preset a propósito (§6: ninguna luz
añadida), `specimenContract` recorre un objeto que no existe, y
`observationPlacement` mueve el espécimen alrededor de la lámpara cuando aquí el
espécimen ES la lámpara—. La salida es el §5 un nivel más abajo: **el
laboratorio adapta también su contrato de observación**. De los tres caminos
para el driver se eligió **extraer los DATOS y no la maquinaria**:
`components/scene/gargantua-render.ts` guarda nivel, bloom, exposición, Halton,
mezcla, guarda de sombra y fábrica de uniformes, y `system-scene.ts` sólo
cambia literales por importaciones — **el diff tiene que ser auditable de un
vistazo**. Verificado con captura antes/después: media |Δ| 0.157 contra un suelo
de ruido de 0.231, y las métricas reproducen el cierre del §14 duodecies.
`lib/gargantua-views.ts` declara las cuatro vistas con seis números de CÁMARA y
no dos de luz; sus distancias se calibran con aritmética —la sombra ocupa
`2.598/(d·tan(fov/2))` del alto, el disco `17/(d·tan(fov/2)·aspecto)` del
semiancho— porque estimarlas dejó `LENTE` y `SOMBRA` como una pared de crema, y
luego como la misma imagen. La canónica repite los cinco números de
`SYSTEM_POSE` porque el §2 prohíbe importarlo, y un test lee los dos archivos.
`LUZ`, `SONDA`, `MATERIAL` y la lectura `CLAVE` desaparecen; entran `DOPPLER`,
`SECUNDARIAS` y `LENTE`, que son ramas reales del fragmento medidas contra un
suelo de 0.0000 (26.4 / 1.3 / 3.5). El bucle sigue dibujando hasta asentarse
—48 fotogramas, medidos, no deducidos— y entonces para (O12). **Trampa de
medición: en Chromium headless rAF deja de dispararse si nada fuerza un
pintado**, así que esperar entre capturas no deja pasar fotogramas; hay que
capturar en cadena y leer el contador de `DATOS`. Tres defectos preexistentes
corregidos: **un clic no conmutaba el pestillo en un render lento** —medido
`pointerdown → pointerup` 742 ms en Gargantúa contra 113 ms en el Tesseracto,
así que todo clic pasaba por comparación; el gesto se mide ahora con
`event.timeStamp` y no con el reloj del manejador—; `Reajustar` devolvía la
cámara pero no el rótulo de la vista; y `FlatWorldBody` no dibujaba el agujero
negro, lo que dejaba la ruta sin cuerpo sin JS (O7/O8) — la exclusión se mudó a
`system-map.tsx`, que es donde está el motivo. En móvil el retroceso por aspecto
se topa en cuanto la sombra baja del 12 % del alto: perseguir que el disco
quepa entero llevaba la cámara a 145 radios y dejaba el espécimen en un borrón.
Herramientas: `observatory-shot.mjs` gana `--asentamiento`, `--vista=` y
`--movil` y **fija los mandos leyendo `aria-pressed`, no contando clics**;
`gargantua-metrics.mjs` gana `--centro`, `--radio` y `--encuadre`; nace
`tools/shot-diff.mjs`. Y se corrigió que `shot.mjs`, `composition.mjs` y
`stability.mjs` llevaban desde el 2026-09-13 capturando el perfil plano por una
clave de almacenamiento renombrada. El System Map, sus cuerpos, cámara y
materiales no cambian. **El `registro` de Gargantúa sigue en borrador,
pendiente de Jonás, y su valoración visual queda abierta.**

## Observatorio V4 — la Ranger, y el cuadro que nadie medía (2026-09-19)

La
sección `V4 — la Ranger, y el cuadro que nadie medía` de
`docs/design/tesseract-experimentos.md` manda sobre `V3`, el §5 y el §6 en
**cómo se ilumina y se encuadra un espécimen de malla**. El catálogo pasa a
`04 / 06 MONTADOS`. Montarla fue una línea en `OBSERVATORY_SLUGS`; lo que
destapó es que el laboratorio llevaba dos especímenes iluminados por donde
tocara y encuadrados por un solo eje. **La actitud de una nave no es suya, es de
su sitio**: `RANGER_ATTITUDE` es la solución de «encarar la luz y la cámara a la
vez» EN EL SYSTEM MAP, y aquí el espécimen se sienta en `(0,0,−D)` con la
lámpara en el origen, así que el dorso pasa de `+0.197` a `−0.088` —el arranque
del terminador— y ninguna cámara lo arregla porque la cámara no mueve la luz. El
barrido geométrico (2 184 triángulos sobre 36 × 72 direcciones) eligió `70/35`
maximizando área iluminada y **la captura lo rechazó**: la Ranger tiene bloque
propio en el shader (`uKind == 5`) escrito para contraluz, así que su identidad
la llevan la envoltura y el filo ámbar y no el difuso. Medido con el azimut
clavado en 80, la meseta `≥200` cae de 102 494 px (7.9 % del cuadro) a 13 298
mientras el brillo real `≥235` SUBE de 3 037 a 6 630: la luz deja de ser un
lavado y se concentra en cantos. Preset `135 / 80`, la vecindad de los 153° del
mapa. **`FOV` es el campo VERTICAL** y nadie miraba el otro: a 375 × 812 el
Tesseracto ocupaba el 181 % del ancho y la Endurance el 185 %, o sea que en
móvil los dos especímenes montados salían cortados — `framingFor(aspect)` toma
el eje que de verdad recorta y por construcción no mueve ni un píxel de lo
aprobado, porque con el cuadro apaisado el mínimo vuelve a ser el término de
siempre. De paso, `observatory-frames.test.ts` encontró que **dos vistas de la
Endurance se salían en ESCRITORIO** (`SILUETA` en −1.00 y `OPERACIONES` en
+1.06, justo la de las toberas): `distance` a 1.18 y 1.14. La pluma queda fuera
de la promesa a propósito —`modelRadius` la poda porque «una nave no ocupa más
espacio por encender un motor»— y lo que no puede salirse nunca es la chapa.
`boundsFill` 1.0 y no 1.15: con 1.15 son 78 % del alto en escritorio pero en
móvil se le sale el ala. Cuatro vistas —`CANÓNICA`, `PLANTA`, `PROPULSIÓN`,
`PERFIL`— y `rangerArchitecture` en el panel `DATOS`, con los conteos saliendo
de las mismas listas que construyen las piezas. **Segunda entrega el mismo día,
pedida por el dueño**: la pose por defecto baja de azimut 80 a **110** —a 0.74
de dorso la nave se leía picada y con el morro caído, el mismo defecto que la
fase 1 corrigió en el mapa; por encima de 115 el ala toca el borde en móvil— y
**el modelo sube de calidad porque de cerca se veía básico**. Tres frentes: la
TEXTURA de chapa pasa de 128 con paneles de 32 a **384 con paneles de 48** y
gana labio, junta intermedia y regueros —a 128 cada junta salía de seis píxeles
difuminados, o sea una franja pintada—; la TESELACIÓN sube donde se ve la
silueta (fuselaje a tres subdivisiones, proa a dieciséis caras, góndolas y
campanas a veintidós) sin mover un solo radio; y la CABINA se rehace —era una
esfera aplastada medio enterrada, y **una superficie recortada por otra no tiene
forma propia**— como cúpula facetada con marco en CHAPA, que es lo que pedía la
dirección de arte desde el primer pase. Más espina dorsal, escotilla, antenas,
puertos de maniobra, rejillas, vallas de ala, carenados e interior de campana.
Dos reglas: **un carenado es del mismo material que el casco** —puestos en el
metal oscuro de la estructura dejaban una franja negra de punta a punta del
lomo— y todo cabe dentro de la envolvente, así que **el radio del cuerpo sigue
siendo 2.5640** y ni el blanco de clic ni el encuadre se mueven. Las llamadas de
dibujo no cambian; el techo de VÉRTICES sube de 19 500 a 22 500 —tenía 139 de
margen— después de recortar 2 694 de los 5 306 que costó el pase. La Endurance
conserva su textura a 128. El System Map, sus cuerpos, cámara y materiales no
cambian. **El `registro` de la Ranger no está escrito: es la voz de Jonás. Su
valoración visual queda abierta.**

## Observatorio V5 — Miller, Edmunds y el laboratorio completo (2026-09-20)

La
sección `V5 — Miller y Edmunds, y el laboratorio completo` de
`docs/design/tesseract-experimentos.md` manda sobre `V4` y el §6 en **cómo se
ilumina y se encuadra un cuerpo esférico**, y sobre el §5 en **qué significa
`boundsFill`**. El catálogo pasa a `06 / 06 MONTADOS` y no queda ninguna muestra
sin puerta. Montarlos fueron dos líneas en `OBSERVATORY_SLUGS`; lo que costó fue
la captura que sus propios presets llevaban pidiendo por escrito desde la V1.
**Una esfera es su propia envolvente**, así que `boundsFill` deja de ser una
calibración y pasa a ser una lectura: la fracción del alto es
`tan(asin(boundsFill·sin(fov/2)))/tan(fov/2)` y la captura lo confirma —0.91
promete 90.0 % y mide 89.6; 0.78 promete 76.0 y mide 75.4, y el medio punto es
la teselación—. Los dos en **0.78**, mitad de la banda del §5, y son los
primeros que la cumplen sin nota al pie. **Los dos presets estaban mal por
motivos opuestos.** Miller decía 25° con una frase de óptica que este shader no
cumple: `oceanSheet` y `oceanGlint` son gaussianas sobre la separación respecto
de la DIRECCIÓN ESPECULAR, que existe a cualquier clave, y el destello se pesa
con `mix(0.86, 1.34, waterFresnel)`, o sea que el espejo devuelve más cuanto más
rasante. Medido, a 25° el camino de luz **no llega a blanco ni en un píxel** —la
lámina se extiende en meseta (18 537 px ≥200) en vez de concentrarse— y sin
terminador el cuerpo no tiene volumen; pasa a **`55 / 20`**. Edmunds decía 82° y
esa frase sí era verdad —una pendiente sólo se convierte en sombra larga con la
luz tangente— pero nadie había medido el precio: a 82° sólo el 39 % del ancho
del cuerpo lleva luz y la ocupación medida cae al 65.2 %, **por debajo del suelo
del 70 % del §5 sin que el encuadre tenga nada que ver**; pasa a **`55 / 10`**.
Los dos ángulos viejos no se tiran: bajan a las vistas `ESPEJO` y `RASANTE` —una
vista curada es para el extremo bajo demanda; un preset es lo que ve quien
entra—. **Ningún planeta admite contraluz en este laboratorio**, y no es de
grados: todos los términos de canto de `uKind == 0` y `uKind == 1` están
cerrados por `ndl` (`airLit`), así que lo que enciende su limbo es mirar a la
luz; a 160° Miller deja 94 px ≥200 y a 150° Edmunds 93, y lo que ocupa el cuadro
es el cielo del laboratorio por detrás. Seis vistas nuevas —`CANÓNICA`,
`ESPEJO`, `CORRIENTES` y `CANÓNICA`, `RASANTE`, `PROVINCIAS`— y **ninguna toca
`distance`**: una esfera no respira, así que el encuadre del preset vale para
las tres. `DATOS` se queda sin la familia `OBJETO` porque `specimenContract`
devuelve `null` para los dos: son una esfera con un material y su identidad vive
en GLSL, que se cita como contenido y no se disfraza de medición. **Edmunds es
el primer espécimen cuya imagen no cambia nunca** —media |Δ| 0.0007 en nueve
segundos contra 2.8241 de Miller— y el bucle le dibuja sesenta fotogramas por
segundo igual: no se toca, porque O12 sólo promete cero con el movimiento
apagado y el ahorro está identificado pero su precio no está calculado. Trampa
de medición anotada: el indicador del servidor de desarrollo (`NEXTJS-PORTAL`)
aporta 25 px por encima de 250 a CUALQUIER captura hecha contra `npm run dev`.
El System Map, sus cuerpos, cámara y materiales no cambian. **Los `registro` de
Miller y Edmunds no están escritos: son la voz de Jonás. Su valoración visual
—los dos presets y las seis vistas— queda abierta.**

## Observatorio V6 — el eje de la figura (2026-09-20)

La sección `V6 — el eje
de la figura, el tercer gesto` de `docs/design/tesseract-experimentos.md` manda
sobre `V2` y el §5 en **qué mandos ofrece la consola** y sobre el §6 en **qué
puede tocar el laboratorio de un espécimen**. Lo pidió el dueño: «un control
para la rotación de los objetos como endurance, miller, edmunds y ranger». El
laboratorio tenía dos gestos y **los dos cambiaban dos cosas a la vez**: el
arrastre mueve la cámara y, como la luz ES el origen del mundo, cambia la cara Y
el ángulo de clave; `LUZ` cambia la clave y conserva la cara. Faltaba el
tercero —**otra cara, la MISMA luz**— y es el único que no toca la geometría de
luz por construcción, porque `lightGeometry` se calcula con tres vectores del
mundo en los que la orientación del modelo no aparece. `SceneBody.turnTo` es la
primera mitad de `spinAt` sacada a la luz y usa el MISMO `spinAxis` del mapa
—polo en los mundos, eje del aro en la Endurance, proa-popa en la Ranger—: **no
se le inventa un segundo eje a ninguna figura**. No podía servir `spinAt`,
que multiplica por `SPIN_RATE` y vale cero para la Ranger. Dos ausencias de
distinta clase: Gargantúa no tiene malla, y el Tesseracto tiene su lectura
entera en la orientación de reposo —el eje de la recursión enfilado a la
cámara— así que girarlo no ofrece otra cara, le quita la suya; **la Ranger
también vale cero en `SPIN_RATE` y sí entra**, porque los dos ceros no dicen lo
mismo —uno niega que haya eje y el otro dice que una lanzadera girando sola es
«un modelo colgado de un hilo», y una vuelta PEDIDA no es una vuelta que se dé
sola—. El encuadre no se toca ni una línea: **el eje pasa por el origen de la
raíz y `modelRadius` mide desde ahí, así que la envolvente es invariante**. Lo
que sí se pasea es la silueta dentro de ella —medido a un grado, la Endurance
llega a 1.041 del semicuadro contra una envolvente de 1.175— y la conclusión que
hay que conservar es que **la promesa del §5 es la envolvente y cubre las poses
que el laboratorio ELIGE**, no la mano del visitante: el arrastre, que existe
desde la V1, ya llevaba su casco a **1.174**. Una vista curada NO devuelve la
cara —su corrección es la luz, porque sus ángulos se declaran contra la luz
canónica; el giro no entra en ninguna de esas cuentas— y `Reajustar` sí devuelve
las dos. Es el **único mando de la consola que no es además una lectura**, así
que no entra en la telemetría: nada más en el aparato cambia la orientación
propia de la figura. Dial de −180 a 180 para que el reposo caiga en el centro, y
la pista pasa a decir «arrastra para **orbitar**», que es lo que de verdad hace.
El System Map, sus cuerpos, cámara y materiales no cambian: `spinAt` da
exactamente lo mismo que antes. **Su valoración visual queda abierta**, con
cuatro barridos de seis ángulos enviados.

## UN SOLO INTERRUPTOR DE MOVIMIENTO (2026-09-13) — manda sobre todo lo anterior en consentimiento, pausa y perfil ligero

`docs/design/movimiento-unificado.md`. Un icono en la bandeja inferior
derecha (`components/motion-toggle.tsx`, junto a la banda sonora, en todas las
rutas) enciende y apaga TODO lo que se mueve: escena 3D y su polvo, cielo de
la cabecera, océano y corrientes de Miller, vuelo de la Ranger, cubierta de
Edmunds y las animaciones CSS (`html[data-motion="off"]`). **Por defecto
encendido**; `prefers-reduced-motion` ya no apaga nada por sí solo. Quedan
retirados «Activar animación 3D» del HUD, el `scene-toggle`, «Pausar océano»,
«Pausar vuelo» y «Pausar estrellas»: ninguna página guarda estado de pausa.
`lib/effects-mode.ts` tiene un solo valor con dos lecturas:
`useMotionEnabled()` (por defecto o a propósito; las páginas) y
`useForcedEffects()` (a propósito: icono pulsado o `?no3d=0`; sólo esa salta
por encima de reduced-motion y de las heurísticas de capacidad para montar la
escena). `?no3d=1` sigue siendo la puerta al perfil ligero y se persiste con
la clave de siempre. Cualquier texto anterior que describa botones de
consentimiento por página está obsoleto.

## Travesía espacio-temporal (2026-09-14) — manda sobre el §7 del pivote en duración, fases, momento del cambio de ruta y versión reducida de la transición de aproximación

`docs/design/travesia-espaciotemporal.md`. Al
activar un destino desde el System Map (proxy o raíl, clic o Enter) la
navegación es una travesía cinematográfica de 2,6 s en cuatro fases —bloqueo
de objetivo (0–0,4 s), aceleración con easing de potencia y campo de 35° a
50° (0,4–1,35 s), distorsión del espacio-tiempo alrededor del destino
PROYECTADO (1,05–2,05 s: lente de masa puntual con anillo de Einstein fuera
del limbo, centro comprimido, imagen duplicada, arcos rotos sobre borde
oscuro, aberración mínima) y cruce con compresión luminosa (1,85–2,6 s)—; no
es un túnel de hiperespacio. `lib/voyage.ts` es la línea de tiempo pura
(`sampleVoyage(t)` → `lock/approach/warp/flash`) y las huellas por mundo;
`lib/voyage-controller.ts` decide CUÁNDO navega el router —**por temporizador
en el pico, nunca desde un fotograma** (G10), cualquier tecla/clic/gesto
corta (G9), tope de llegada de 1,4 s— y publica `data-voyage` en `<html>`;
`components/scene/voyage-pass.ts` es el `ShaderPass` (deshabilitado en
reposo) y la escena mueve la cámara SOBRE la pose sin escribir en ella
(`setPose` termina la travesía). `components/voyage-layer.tsx` (layout) lleva
la luz del cruce y avisa de la llegada al cambiar el pathname. Sin escena
viva va la **versión reducida** de medio segundo en el DOM, que sustituye al
crossfade de 120 ms del §7 por decisión del dueño. Tres reglas que costaron
una prueba: **el anillo se mide sobre el limbo ya ampliado** por la
compresión del centro; **poco refuerzo al destino** (+15 % luz, +40 %
emisión) o sale lavado; **las trazas orbitales se retiran al caer**. Su
valoración visual queda abierta.

## Cabecera — observatorio y acento por mundo (2026-09-13)

La sección
`Observatorio y acento por mundo` de `docs/design/identity-gargantua.md`
manda sobre el resto de ese documento en **estado activo, línea viajera, CV y
cielo de la barra**. **La navbar es minimalista por decisión del dueño**:
rechazó una versión con segunda línea «índice · cuerpo» bajo cada destino
(«muy cargada») y quiere los seis nombres repartidos por el ancho como
estaban. Conserva marca, borde a borde sin marco, 67/63 px, una fila, control
de pausa, «Mapa estelar ↑» y menú «Explorar». Nuevo: el activo y el punto de
hover usan `--nav-accent` de su mundo; la línea del activo se mide en un
layout effect y VIAJA entre rutas por un recuerdo de módulo (cada página
monta su cabecera), con la línea por enlace del CSS para el primer pintado y
sin JavaScript; el CV es un `<details>` con **los dos CV, español e inglés**
(hay dos CV, siempre), con el glifo compartido `download-icon.tsx` que también
usan el hero de Miller y el registro de la Ranger; y el cielo pasa a
`voyage-sky.tsx`, un canvas 2D de observatorio —tres profundidades en un solo
sentido, magnitudes reales, centelleo, difracción, banda lechosa y meteoros—
con la textura SVG como fallback sin JavaScript, un solo fotograma cuando
está quieto y «Activar estrellas» como opt-in bajo reduced-motion o perfil
ligero (el dueño tiene movimiento reducido en su equipo y no veía nada). El
estado previo vive en
`output/archive/navbar-cristal-editorial-20260913-antes-instrumento.zip`.

## Edmunds — el mosaico en filas justificadas (2026-09-22)

La sección
`Noveno pase — el mosaico en filas justificadas` de
`docs/design/edmunds-creatividad.md` manda sobre el resto de ese documento en
**cómo se compone la vista Mosaico**. El dueño reportó huecos negros con cinco
capturas y pidió que no existan, sin igualar los tamaños. No era espaciado:
**CSS multi-columna no reparte obras, apila buscando columnas de la misma
altura**, y con fotos que no se pueden cortar y aspectos de 0.56 a 1.78 ese
equilibrio no existe. Ahora son filas justificadas —dentro de una fila el
factor de crecimiento es el aspecto y la base es sólo el marco, así que los
anchos son proporcionales, las alturas idénticas y la fila llena el ancho—, y
dónde se corta lo decide `lib/mosaic-rows.ts` con una programación dinámica
sobre el orden curado: **la última fila se decide con el mismo criterio que las
demás, así que no hay resto**. Tres reglas: **la altura de una fila la fija el
ancho disponible**, así que hay cinco bandas y sus cortes viajan todos en el
HTML servido (un elemento de ancho completo y alto cero con `data-at`), sin
medir en JavaScript; **cuando los factores de crecimiento de una línea suman
menos de uno, flexbox reparte sólo esa fracción del espacio libre** —una obra
sola de 0.87 se quedaba en 543 px de 619 y dejaba justo el hueco que el pase
venía a quitar—, así que el factor va ×10; y los topes son **penalizaciones y
no prohibiciones**, porque un sector puede no tener reparto que las cumpla.
Medido en diez anchos de 320 a 1905 px: holgura 0 px en todas las filas,
desalineación 0 px, sin desbordamiento. Cubierta 3D, visor, catálogo y paleta
no cambian. Su valoración visual queda abierta.

## Edmunds — sexto pase (2026-09-12)

La sección `Sexto pase` de
`docs/design/edmunds-creatividad.md` manda en **nitidez de las obras, gesto de
arrastre, transición del anillo y cielo de la cubierta**. Tres reglas que
costaron verificación: **un WebP visto a 1:1 se ve blando y el mismo archivo
reducido se ve nítido** —por eso cada contexto pide 1,5× los píxeles que pinta
sobre seis peldaños (320-1920)—; **el anillo se mueve con UN número**,
`--drag` en posiciones fraccionarias registrado con `@property`, y las obras
derivan giro, profundidad y luz de `--p = --o + --drag` con `abs()`: nunca se
vuelve a poner una transición sobre el `transform` de cada obra, ni un
`translate` plano durante el gesto; y **la luz ambiente funde sobre la anterior**,
no desde negro. El cielo es noche azul marino con auroras de degradado, sin
`filter`. La curación del catálogo sigue siendo del dueño.

## Pivote vigente (2026-08-06)

`docs/plans/sistema-gargantua.md` manda sobre el
plan principal en **arquitectura de rutas, contrato de cámara, capa visual,
transiciones y presupuestos**. En todo lo demás el plan principal sigue intacto.
Ante contradicción entre ambos, manda el pivote.

## Dirección artística del hero (2026-08-29)

`docs/design/hero-gargantua-direction.md` manda sobre los dos anteriores en
**composición del hero, identidad visible, diseño de los mundos, HUD, interacción,
escala de Gargantúa, posiciones de los cuerpos, motion en reposo, trayectorias,
etiquetas y estados**. Sus cambios centrales: **el sistema está quieto** — los
cuerpos no recorren su órbita — y el Hero **no muestra un bloque personal**. La
identidad profesional, rol, CTAs y CV siguen en el HTML semántico y metadata; la
marca visible del HUD es `JONAS ORBIT`. Cualquier texto anterior que describa
cuerpos orbitando continuamente, Endurance como toro o el
copy personal como bloque visible está obsoleto. El viaje continuo y
`SYSTEM MAP ↑` siguen diferidos en `docs/design/continuous-journey-phase.md`.

## Lenguaje visual de los mundos (2026-09-03)

`docs/design/world-visual-language.md` manda sobre los tres anteriores en
**material, iluminación y criterio de aceptación de los cinco cuerpos secundarios**. No toca
composición, cámara, HUD ni interacción, que siguen perteneciendo a la dirección
artística del hero. Congela el modelo de luz común —la misma luz toca materiales
diferentes— y define el bloom-off test: un cuerpo que pierde su identidad al
apagar el glow no está terminado. Gargantúa queda **congelada** durante la fase.
El `Rediseño imposible` del Tesseracto conserva su geometría y material.

## Revisión de Edmunds (2026-09-05)

La sección `Mundo mineral` de
`docs/design/world-visual-language.md` sustituye su material y su paleta por
petición del dueño: roca seca, ocre, arena y hierro, sin nubes ni apariencia
incandescente; provincias geológicas, crestas orientadas hacia Gargantúa y
atmósfera fina direccional. Posición, tamaño, órbita y el resto de los cuerpos
siguen intactos. Dos sitios de FBM, dos menos que antes. El apartado anterior
`Mundo habitable` queda como referencia histórica sustituida.

## Revisión de Miller (2026-09-05)

Las secciones `Océano global`,
`Corrientes y dirección de luz` y `Trenes largos y filo sin halo` de
`docs/design/world-visual-language.md` sustituyen su material, su paleta, su
modelo de reflejo y su atmósfera por petición del dueño: océano continuo azul
grisáceo con corrientes zonales, lámina de luz anisótropa en vez de foco
isótropo, y filo de aire asimétrico que nace
mirando a Gargantúa. La marejada baja a un tercio —su patrón de batido era lo
que producía las manchas blandas— y la banda latitudinal manda sobre el relieve.
El halo común de Miller queda casi apagado (0.09) porque, con exponente 2.2, por
construcción no puede ser direccional: todo el aire visible lo pone su filo
propio. Posición, tamaño, órbita, inclinación, cámara y el resto de los cuerpos
siguen intactos. Tres sitios de FBM, los mismos que antes.

## Revisión de Endurance (2026-09-05)

La sección `Endurance — peso, escala e
integración` de `docs/design/world-visual-language.md` sustituye su material,
núcleo y pose por petición del dueño: aluminio marfil apagado, luz facetada desde
Gargantúa, cavidades oscuras, eje esbelto, módulos en planos distintos, dos
radiadores más largos y 6.9° adicionales de yaw. Posición, escala del conjunto,
cámara, HUD, fallback plano y otros cuerpos siguen intactos. Cuatro draws.

## Revisión del Tesseracto (2026-09-05)

La sección `Umbral vivo` de
`docs/design/world-visual-language.md` sustituye sus límites anteriores de
deriva mínima y acabado por petición del dueño. Tres grupos interiores se
reconfiguran de forma perceptible; cáscara, posición, tamaño y cámara siguen
fijos. El Tesseracto usa cuatro draws con un material compartido.

## Pase de autoridad de Gargantúa (2026-09-05)

La sección `14 quáter` de
`docs/design/hero-gargantua-direction.md` sustituye la escala de los cinco
destinos secundarios por petición del dueño — Endurance −10 %, Miller y Edmunds
−8 %, Tesseracto −5.6 %, Ranger −3.5 %. Gargantúa no se toca. Posición, fase,
inclinación, cámara, material y HUD siguen intactos.

## Pase de respiración (2026-09-05)

La sección `14 quinquies` de
`docs/design/hero-gargantua-direction.md` mueve Miller (26/242/31 → 28/240/37) y
el Tesseracto (30/298/26 → 32/300/30) para despegarlos del arco brillante de
Gargantúa. No cambia tamaño, cámara ni los otros tres cuerpos. Sustituye radio,
fase e inclinación de esos dos en `docs/design/sistema-seis-destinos.md`.

## Pase de puntero (2026-09-05)

Las secciones `11 bis` y `11 ter` de
`docs/design/hero-gargantua-direction.md` sustituyen la figura del retículo y la
presencia del stardust en WebGL por petición del dueño. El retículo pasa de cruz
de cuatro trazos a anillo + núcleo + marcas laterales, con `target` abriendo el
anillo en arcos que barren. El stardust de WebGL sube alfa, capacidad, ráfaga,
tamaño y vida, y alarga la curva de apagado. No cambian el ámbito de la capa
—desktop fine-pointer dentro del System Map—, los cuatro estados, ni el perfil
`flat`, que sigue congelado. Un segundo pase (mismo día) alarga la permanencia
—exponente de apagado a 1,2— y añade un **segundo calibre**: motas finas con
sprite propio sembradas encima de las de cuerpo, no en su lugar.

## Segundo recorte de escala (2026-09-05)

La sección `14 sexies` de
`docs/design/hero-gargantua-direction.md` sustituye otra vez la escala de los
cinco destinos secundarios por petición del dueño — Endurance −2 %, Tesseracto
−1.5 %, Miller y Edmunds −1 %, Ranger −0.5 %. Gargantúa no se toca. Posición,
fase, inclinación, cámara, material y HUD siguen intactos. Sustituye la columna
de tamaño de `14 quáter` y la de `docs/design/sistema-seis-destinos.md`.

## Fase 1 — presencia, lectura y cine (2026-09-05)

La sección `9 bis` de
`docs/design/world-visual-language.md` manda sobre todo lo anterior en
**iluminación, material, silueta, acento de propulsión y pose de Endurance,
Edmunds y la Ranger**. No toca composición, cámara, HUD ni fallback plano, y no
toca a Miller ni al Tesseracto. Su principio es explícito y sustituye cualquier
lectura contraria: **no hacerlos más oscuros, hacerlos más intencionales** —el
cine sale de repartir el valor, no de bajar la exposición. Cambios centrales:
el suelo nocturno deja de ser un número por familia y pasa a depender de la
geometría de luz medida en cada sitio (Endurance 0.42 → 0.30, Edmunds 0.28 →
0.22); el filo cálido también (Endurance 0.18 → 0.50, Edmunds 0.12 → 0.34 del
común); las dos naves y el mundo mineral ganan contraste interno sin ganar
luminancia media; la Endurance estrena propulsión de maniobra visible y la
Ranger separa escape (blanco azulado) de baliza (violeta) por máscara de
vértice, sin un draw call más. Las poses de Endurance y Ranger cambian dentro
de las puertas que fija `bodies.test.ts`.

Una **segunda ronda** (mismo día, misma sección) añade **estela de propulsión**
a las dos naves y sustituye la solución de propulsión de la primera: la
maniobra de la Endurance se va del barril al **borde del aro** —cuatro toberas
entre grupos, dos encendidas y opuestas— porque en el barril no se leían. La
pluma no cuesta ningún draw: viaja en el material emisivo con la rampa dentro de
`aSurfaceMask` (base 8, por encima de las máscaras de casco), el emisivo pasa a
mezcla aditiva con las balizas compensadas a la mitad, y **`modelRadius` poda la
pluma** — una nave no ocupa más espacio por encender un motor, y contarla
hinchaba el blanco de clic y la distancia de encuadre. Edmunds gana una cuarta
macroforma (cuenca pálida) bajando la frecuencia de provincia de 1.62 a 1.28, y
la Ranger cambia su relleno plano por un **rebote dirigido**: ámbar hacia
Gargantúa, azul de campo estelar en la espalda.

## Raíl, atlas plano y Tesseracto (2026-09-06)

`docs/design/atlas-tesseract-reference.md` manda sobre los documentos anteriores
en **el orden visible de las etiquetas del raíl, la composición y el acabado del
mapa 2D, y la geometría del Tesseracto en las dos versiones**. El raíl nombra
primero el CONTENIDO —Historia, Desarrollo, Proyectos, Creatividad, Laboratorio,
Contacto— y revela el nombre cósmico al apuntar; el nombre accesible de cada
enlace pasa a ser «Contacto Ranger» y no al revés. El atlas plano tiene
composición propia en **tres** formatos —`wide`, `portrait` y `short`, este
último para el apaisado corto— en `lib/flat-composition.ts`, independiente de
los datos orbitales de WebGL. El Tesseracto sustituye la caja compacta por un
corredor de marcos entrelazados hacia un punto de fuga, con cuatro draws y un
solo material. No cambian posición, cámara ni datos orbitales de ningún cuerpo.
`e2e/atlas.spec.ts` comprueba los seis formatos: cuerpos dentro de pantalla y por
encima del raíl, enlaces y proxies de 44 px, centro de cada proxy alcanzable y
cero desbordamiento horizontal.

## Tercer recorte de escala (2026-09-06)

La sección `14 septies` de
`docs/design/hero-gargantua-direction.md` sustituye la columna de tamaño de
`14 sexies` para **tres** cuerpos y sólo tres — Endurance −3.5 % (4.547 →
4.388), Tesseracto −1.5 % (2.669 → 2.629), Ranger −0.5 % (1.92 → 1.9104).
Miller y Edmunds **no se tocan**, y esa asimetría es la decisión: son el
contrapeso del cuadro y encogerlos otra vez habría movido la composición, no la
escala. Gargantúa, posición, fase, inclinación, cámara, material y HUD siguen
intactos.

## El cielo deja de participar del remolino (2026-09-06)

La sección
`14 octies` de `docs/design/hero-gargantua-direction.md` manda sobre `6` en
**cuánto se estira el fondo estelar y dónde**. El estiramiento se reserva para
la vecindad del agujero —puerta por parámetro de impacto, entera hasta 17 rs y
cerrada en 30— y en la periferia pagan sólo las escalas gruesas; **el campo fino
(escala 520) no se toca**. Medido con `tools/star-streaks.mjs`: −31 % de
presencia luminosa en la periferia, 0 % de cambio en el anillo de 250-400 px. No
se toca el lensing del disco.

## El rastro del puntero vuelve a la cabina (2026-09-06)

La sección
`14 nonies` de `docs/design/hero-gargantua-direction.md` sustituye `11 ter` y
`11 quater` en **densidad, cola, calibre y color** del perfil `webgl` del
stardust: 21 % de la densidad anterior, cola un 65 % más corta, motas a la mitad
de radio y ventana de tonos en la mitad FRÍA de la paleta (cian, cian pálido,
blanco frío) — la navegación ya había convergido al cian y el rastro era la
única pieza que seguía hablando en magenta. El retículo de `11 bis` no se toca y
el perfil `flat` sigue congelado byte a byte.

## Miller — océano gigantesco (2026-09-06)

La sección `9 ter` de
`docs/design/world-visual-language.md` sustituye material, paleta e iluminación
de Miller. **Su posición no se toca**, por petición explícita del dueño. Cambios
centrales: ley difusa propia sin meseta de terminador, Fresnel de agua sobre la
lámina, camino de luz cálido contra sábana fría, agua honda más profunda y masas
pálidas retiradas, y suelo nocturno y filos propios en vez de los comunes. Ni un
sitio de FBM, ni una textura, ni un draw call nuevos.

## Miller — océano encendido y en movimiento (2026-09-06)

La sección
`9 quinquies` de `docs/design/world-visual-language.md` **revierte** la
dirección de `9 ter` para Miller y manda sobre `9`, `9 ter` y la parte de
`9 quater` que le toca, en **paleta, exposición, nubes, animación de superficie
y filo**. Posición, tamaño, órbita, inclinación, cámara, HUD, fallback plano y
el resto de los cuerpos siguen intactos.

El dueño rechazó el resultado acumulado de las cuatro revisiones anteriores —
«está muy apagado y oscuro»— y dio una referencia de mundo de agua **encendido**,
con nubes visibles y oleaje animado. El principio que sustituye al anterior:
**«océano» no es un nivel de exposición, es un comportamiento.** La identidad se
defiende con camino de luz que se desplaza, destellos que centellean, cresta con
espuma intermitente y una capa de nube que va a otra velocidad que el agua —
todo eso se lee igual de bien sobre un cuerpo brillante. Cualquier texto anterior
que justifique bajar la luz de Miller para que se lea como océano está obsoleto.

Cambios centrales: cinco tonos de agua en vez de tres grises azulados; el bajío
pasa de veta a provincia; las nubes vuelven a verse (tinte 5.5 % → 30 %) y se
mueven al doble del giro del cuerpo; tres escalas de oleaje animadas de verdad;
suelo difuso 0.10 → 0.19 y atmósfera 0.09 → 0.26.

La animación deja **dos reglas**, y las dos costaron una entrega. Primera: se
calibra en **píxeles por segundo, no en rad/s** — sobre un cuerpo que gira, un
campo animado no existe hasta que su velocidad de superficie es varias veces la
del giro. Miller gira a 2.35 px/s en su ecuador y todo su oleaje iba entre 0.5 y
2.5 px/s, o sea que era textura arrastrada. Segunda: **acelerar no basta si el
movimiento no tiene MARCHA** — con las velocidades ya subidas seguía sin verse,
porque los trenes iban en ejes distintos y a velocidades de superficie distintas
y se deslizaban unos a través de otros. Eso es hervor, no oleaje. Ahora los
cuatro trenes y la nube comparten **un solo eje y una sola velocidad de
superficie** (0.24 unidades/s, 11.3 px/s). Medido: el oleaje decide el 49 % del
disco por segundo contra el 13 % de la rotación, y **cuánto cambia no predice si
se ve; en qué dirección cambia, sí**.

El pase cierra además la última excepción de `9 quater`: Miller era el único
cuerpo con `focusTint` 1.0, y sobre un mundo que ya es cian eso no lo identifica,
le **dobla la luminancia de la cara noche** (p05 28 → 57) y le borra el
terminador. Baja a 0.20 con `focusGain` 0.15 y `focusEdge` 0.16. **Sobrevive la
cresta** de `9 quater`, que es lo único de aquel pase que el dueño aprobó y que
no dependía de que el cuerpo fuera oscuro. Presupuesto intacto: tres sitios de
FBM, una octava suelta, ni un draw call ni un uniforme nuevos. El movimiento no
toca accesibilidad: con reduced-motion no hay canvas.

## El foco no puede borrar el material (2026-09-06)

La sección `9 quater` de
`docs/design/world-visual-language.md` manda sobre la respuesta de adquisición
de los seis cuerpos. El tinte de navegación deja de ser uniforme y se reparte por
material: Edmunds al 8 % y Endurance al 16 %, con la diferencia devuelta en
ganancia propia y filo. Es la aplicación directa del criterio de la capa visual
—la misma luz toca materiales diferentes sin borrar su identidad— al único sitio
donde el sistema lo incumplía.

## Edmunds — geología, no textura (2026-09-07)

La sección `9 sexies` de
`docs/design/world-visual-language.md` manda sobre `8`, sobre el `Pase 2 ·
Edmunds` de `9 bis` y sobre `Edmunds: cuatro macroformas` en **campo geográfico,
relieve, paleta, ley difusa y filo de limbo** de Edmunds. **Tamaño y posición
quedan congelados por petición explícita del dueño** — Edmunds contrapesa a la
Endurance y forma con la Ranger la base inferior, y eso no se discute. Tampoco
cambian órbita, inclinación, cámara, HUD, fallback plano ni ningún otro cuerpo.

El diagnóstico que sustituye a cualquier lectura anterior: **una puerta estrecha
sobre una fbm de cuatro octavas no dibuja una macroforma, dibuja la octava
fina.** De ahí las manchas del mismo calibre. La geografía pasa a decidirse en
un campo ANALÍTICO de baja frecuencia —liso por construcción y con gradiente
gratis— y la fbm queda degradada a perturbación de la frontera. Con eso, color y
sombreado dejan de contar dos terrenos distintos: la misma función pinta la
provincia y la ilumina. La cordillera se define por PENDIENTE y no por altura,
lo que además retira el vocabulario de cráteres sin quitar ninguno —una puerta
sobre una fbm isótropa sólo sabe hacer manchas redondas—, y el carbón deja de
ser una máscara para ser el SUSTRATO, porque un fondo con frontera se lee como
un cráter difuminado. El terminador no se aclara: la ley difusa de la roca pasa
a exponente 1.35 sobre suelo 0.07 —contra el 0.55 sobre 0.19 del agua de
Miller—, así que la caída a oscuridad es material y no exposición. El filete
continuo del limbo se trocea con una máscara de cresta y gana destellos sueltos.
Seis minerales —ocre, cobre, carbón, arcilla, arena, oliva apagado— sin subir la
saturación media, porque Edmunds es Creatividad. Presupuesto intacto: dos sitios
de fbm, uno de noise, cero draws y cero uniformes nuevos.

## El marco del overlay (2026-09-08)

La sección `13` de
`docs/design/endurance-navigation-interface.md` manda sobre `7` y `12` en **en
qué espacio se miden las coordenadas del mapa**, y es la causa raíz de «el HUD
está descentrado» y «el hover sólo funciona en zonas muy específicas». La escena
publica `--map-x` / `--map-y` en píxeles del VIEWPORT —proyecta contra un canvas
`position: fixed; inset: 0`— pero `.system-map` era `position: absolute` dentro
de `.system-home`, que mide `min(100%, 92rem)` y va centrada. Por encima de
1472 px de ventana, cada destino quedaba desplazado (viewport − 1472)/2 a la
derecha: **+224 px a 1920 y +544 px a 2560**. Con la escena viva, `.system-map`
pasa a `fixed; inset: 0`; el atlas plano conserva su marco de columna, que es el
suyo. No hay ni un desfase por objeto: la proyección siempre estuvo bien y el
contenedor mal.

Sobrevivió por dos coincidencias que hay que recordar antes de dar por buena
cualquier prueba de la portada: **la suite entera vive en 1440 px**, justo por
debajo del umbral, y **ninguna prueba e2e montaba la escena viva** —toda la
cobertura usaba `?no3d=1`, donde el marco de columna es correcto—. La deuda la
cubre `e2e/scene-overlay.spec.ts`, que comprueba el contrato en 1440, 1920 y
2560 sin necesitar GPU. Se evaluó y se DESCARTÓ con números anclar el proxy en
el centro de un `Box3` en vez del pivote: Miller y Edmunds tienen desfase 0.0 %,
la Endurance 1.7 %, y en el Tesseracto el centro de la caja es peor ancla que el
pivote porque `sampleTesseract` ya normaliza sus vértices a radio 1.5 alrededor
de su centroide en cada fase.

## Pase de cierre del puntero (2026-09-08)

La sección `12` de
`docs/design/endurance-navigation-interface.md` manda sobre `6` y `7` del mismo
documento en **tamaño del raíl y condiciones bajo las que un cuerpo recibe el
puntero**. No toca composición, cámara, material, HUD ni el contrato
`idle → target → locked`. El «a veces el hover no funciona» eran **tres fallos
deterministas** que se disparaban en circunstancias distintas: el campo de
cuerpos desaparecía entero por debajo de 960 px CSS aunque la escena estuviera
viva —regla escrita para el atlas plano, aplicada también al 3D—; el proxy de
Gargantúa, que cubre el disco completo, subía por encima de sus vecinos al ser
apuntado y los dejaba inalcanzables en la franja de solape; y el paralaje seguía
moviendo el sistema bajo un cursor quieto, así que el planeta se escurría solo.
Ahora el campo vuelve con puntero fino y escena viva (sin los rótulos anclados,
que son lo que no cabe), el centro se queda por debajo de los cinco cuerpos —en
un mapa con blancos solapados gana siempre el más pequeño—, `setFocus` congela
el paralaje mientras hay destino adquirido, y soltar sólo apaga lo que uno
encendió. `.nav-rail__name` sube de 0.69 a 0.78 rem.

## El bloom no puede encender la sombra (2026-09-08)

La sección `14 undecies`
de `docs/design/hero-gargantua-direction.md` manda sobre `6` en **qué le está
permitido al halo dentro del disco de la sombra**. Es la única excepción a la
congelación de Gargantúa y la pidió el dueño. No se toca el bloom —ni fuerza, ni
radio, ni umbral—, ni el raymarch, ni la geodésica, ni la escala. Se guarda la
imagen previa al halo y se vuelve a ella dentro del disco de parámetro de
impacto crítico, con puerta de material para no apagar los arcos lensados que sí
viven ahí dentro. La regla: **el halo no puede encender lo que estaba apagado, y
no toca nada de lo que ya estaba encendido.** Medido: el núcleo de la sombra baja
de 106.8 a 18.2 y fuera del disco no cambia ni un dígito.

## Pase visual final de Gargantúa (2026-09-12)

La sección `14 duodecies` de
`docs/design/hero-gargantua-direction.md` manda sobre `4`, `6` y `14 undecies`
en **cómo se separan materia, luz y vacío en la sombra, cuánto blanco hay en el
disco y dónde, la estructura interna de las bandas, qué es el arco inferior y
cuánto se diferencian los dos lados**. Levanta la congelación de Gargantúa por
petición del dueño, con un diagnóstico de cinco puntos y la orden de hacer **un
solo pase y parar**. No toca `rs`, posición, inclinación, cámara, HUD, bloom
(fuerza, radio, umbral), raymarch ni geodésica. Cuatro reglas que costaron una
entrega cada una: **el parámetro de impacto se conoce antes de integrar**, así
que los rayos condenados a caer apagan lo que cruzan cerca del horizonte y el
interior de la sombra se vacía en el propio raymarch (negro real 92 → 113 px sin
glow, píxel central con glow 18 → 1); **el blanco se localiza bajando la rodilla
de altas luces (9.6 → 5.8), no la exposición**, y pasa a ser propiedad de unos
nudos; **el índice de orden no sabe qué es lensado** —los arcos de cobre bajo la
sombra eran orden 0, medido con un render de sólo orden 0— y la regla correcta
es geométrica: un cruce del plano hacia arriba es luz que ha dado la vuelta por
debajo; y **el desvanecido de las lensadas tiene que entrar en la emisión**,
porque los rayos rasantes saturan alpha y en la densidad sola no hace nada. La
guarda del bloom sube a `inner` 0.80 / `amount` 0.96. `tools/gargantua-metrics.mjs`
nace en este pase para medir anillos de la sombra, negro real, recorte blanco y
asimetría. Cero evaluaciones de ruido, uniformes o draws nuevos. El dueño
revisó el primer resultado («8.9-9/10 […] pulir 2 o 3 cosas concretas y parar»)
y la **ronda final** hizo exactamente sus cuatro retoques —arco inferior roto
por máscara sobre tejido y masas, borde del negro más apretado, algo más de
estructura en la masa crema y contraste extra en el lado que se aleja— y se
detuvo ahí. El pase queda cerrado salvo veredicto contrario.

## Pase de cohesión del disco de Gargantúa (2026-09-19)

La sección
`14 terdecies` de `docs/design/hero-gargantua-direction.md` manda sobre
`14 duodecies` en **cómo se muestrea la altura del disco, en qué familia de
tono vive su rampa, dónde entra la absorción del polvo y qué comparten los dos
lados y las dos caras**. El dueño lo abrió con carta blanca sobre el pase de
silueta (altura de escala + dos muestras por travesía) con un diagnóstico
claro: «se lee como varias capas superpuestas, y los dos lados no hablan el
mismo idioma». Tres hallazgos medidos que no se veían a ojo: **las dos
muestras de la travesía se desplazaban ±7.9 unidades EN RADIO en el eje
menor** —la misma textura dos veces, no volumen: el «abanico» y la neblina de
la banda frontal—, sustituidas por UNA muestra con cobertura analítica del
tramo dentro del anillo y un disco delgado que sólo se abocina en el borde;
**la rampa térmica cambiaba de familia de tono (oro 42° → óxido 16°) y ACES la
partía en beige sobre la rodilla y caqui bajo ella** —32 % de píxeles con tono
> 30° contra 1-2 % en la referencia—, ahora una sola familia crema→salmón→óxido
con la coordenada desplazada por masa, tejido y carril (`tCol`); y **la
absorción de los carriles entraba antes del rodillo de altas luces**, que la
comprimía, así que la masa crema era lisa por construcción: ahora `laneAbs`
multiplica después. La pila del lado que se aleja se afloja, el que se acerca
recibe el grano como polvo fino oscuro, la cresta se vuelve nube hacia fuera y
la cara lejana se desatura (`farFade`). Nacen `tools/gargantua-ab.mjs`
(A/B en laboratorio y portada con reloj clavado) y `tools/disk-cohesion.mjs`
(familia de tono, estratos, hf/coherencia por región); el Observatorio respeta
`bench.bloom`. Una llamada a `diskSample` por travesía, como antes del pase de
silueta; ni un ruido, uniforme ni draw nuevos. Exposición, rodilla, beaming,
bloom, `rs`, cámara y los cinco cuerpos no cambian. **Trampa de captura:** en
Chromium headless la acumulación sólo avanza si algo fuerza un pintado; el
laboratorio se empuja con pantallazos de 8 px y la portada no (tarda minutos
por fotograma): se espera. Su valoración visual queda abierta.

## Pase de gramática común del disco de Gargantúa (2026-09-20)

La sección
`14 quaterdecies` de `docs/design/hero-gargantua-direction.md` manda sobre
`14 terdecies` en **qué términos del material dependen del lado, cómo se
reparten cortes, grano y polvo entre sectores densos y vacíos, y cómo se
diagnostica el disco por separado de su luz**. El dueño dio por resuelto el
problema de capas y abrió otro: «la asimetría izquierda-derecha ya no es sólo
luminosa; es morfológica», con dos condiciones —**no espejo** y **misma
estadística material**— y una orden de método: diagnosticar antes de tocar.
El banco visual gana `diagnostico` (`uDiag`): gris de densidad, sólo
directa, sólo lensada; `gargantua-ab.mjs` los captura con `--diag=` y
apaga DOPPLER con `--doppler=0`. Tres resultados que hay que saber antes de
volver a tocar el disco: **el lensado no pone nada en los brazos** (densidad
y densidad-sólo-directa dan las mismas cifras a tres decimales); **los
modificadores por lado no eran la causa** (con `uDoppler` apagado el gris se
movía 0.93 niveles y la asimetría seguía); y **el campo base es ESTÁTICO**
—la realización de edad cero se repite cada `EPOCH` = 20 s, el material
respira en cizalla y nunca da la vuelta, así que 60, 200 y 400 s son la
misma imagen— y trataba valle y masa como dos materiales: cortes agrupados
donde el macro baja, grano por sector 0.55-1.0, suelo del valle modulado con
el grano lineal y, sobre todo, el campo de carriles con `macro·0.42`, que
hacía que el valle del ansa derecha perdiera densidad Y absorbiera como polvo
(una franja de 1.2 rs en la que el gris cae a la décima parte, casi todo por
`laneAbs`). Se retiran por principio los términos morfológicos por lado
(contraste, calibre, pozos, grano sólo al acercarse; el nudo pasa a perder
sólo luz, `knotLuz`) y se igualan los acoplamientos: cortes sin macro, grano
0.75-1.0, suelo con `streams`, polvo a medias con el macro
(`mix(macro, wb, 0.5)`; el macro fuera del todo bajaba el blanco recortado
de 2 411 a 578 px y se rechazó). Medido: la depresión derecha sube de 13-60 a
22-86 de gris, hf izq/der abajo 0.59 → 0.72, familia de tono intacta; **el
blanco recortado baja un 29 % de área** porque el grano y el polvo cruzan
ahora el crema (palanca: rango de `fine`). Cero ruidos nuevos, un uniforme;
exposición, rodilla, beaming, bloom, lensado, envolvente y cámara no cambian.
**Trampa:** el servidor de otra sesión murió dos veces a mitad de captura; las
capturas van contra un `next dev` propio. Una **segunda entrega** el mismo
día (`Segunda entrega: equilibrio de macro-densidad` en la misma sección)
atiende el encargo siguiente del dueño —«la mitad izquierda conserva una masa
continua muy fuerte mientras la derecha cae persistentemente en un valle
amplio»— y lo primero que midió cambió el objetivo: **el gran valle del ansa
derecha no es un hueco de densidad, es un carril de polvo ancho** (sin la
absorción, el gris de densidad sube de 22-86 a 71-192). Comprimir el macro no
lo movía (74 → 73) y cruzarlo con las corrientes tampoco. Lo que lo rellena es
físico y sin lado: **el polvo sigue a la masa** (`dustCol`: un carril en un
valle del macro absorbe la mitad; en una masa, igual que antes), más una
subida de SUELO del macro —y sólo del suelo, `max(macroRaw, mix(0.5, macroRaw,
0.68))`— porque la compresión simétrica apagaba las masas y bajaba el blanco
recortado de 1 715 a 1 319 px. Medido: valle derecho 22-86 → 49-143, blanco
1 715 → 1 756 px, familia de tono intacta, silueta intacta (`reach` lee el
macro crudo). Quedan abiertos, por orden del dueño, el núcleo blanco como
pulido posterior y la rotación lenta del macro sólo después de aprobar el
campo congelado. Una **tercera entrega** (2026-09-21, `Tercera entrega: el
borde, y la quiralidad de la espiral`) atiende «el borde izquierdo se ve
unificado, forma de disco; el derecho deformado»: envolvente, techo y suelo
exteriores del macro y cinco fases azimutales del campo se probaron y medidos
no movían la joroba del borde derecho más de tres puntos; **invertir el
enrollado la cambió de lado entera**. La deformación es la QUIRALIDAD de la
espiral trailing vista a 9°, y la palanca sin lado es el enrollado global:
`WIND_MEAN` 1.15 → 0.60 (0.43 → 0.22 vueltas), con la cizalla local intacta.
El blanco recortado vuelve a 2 177 px. Alternativa capturada a 0 (bandas
puras). `DISK_PHASE` queda como palanca documentada en 0. El dueño eligió
0.60 y pidió menos blanco: **la rodilla baja de 5.5 a 4.2** (blanco ≥ 250
2 177 → 1 268 px, meseta ≥ 235 6 009 → 4 745 px, todo a menos de 1.7 radios
de sombra del centro; no hay blanco puro en la cara lejana con ninguna
rodilla). Exposición y bloom intactos. Su valoración visual queda abierta.

## El cielo del mapa — menos trazo, más negro y un gas lejano (2026-09-21)

la sección `14 quindecies` de `docs/design/hero-gargantua-direction.md` manda
sobre `6` y sobre `14 octies` en **cuánto se estira el cielo y dónde, con qué
densidad y qué reparto de brillo se siembra el campo estelar, y cuánto pesa
cada banco de gas**, y sustituye la fila `Endurance` del recorte de escala del
mismo día (`size` 3.9492 → 3.6333, el 8 % de la banda 5-10 % que pidió el
dueño; ventaja aparente 1.6147). Diagnóstico del dueño: «muchas partículas
grandes y alargadas […] el cerebro interpreta warp speed», el banco morado
«demasiado presente […] se nota como una textura colocada detrás», el azul se
conserva tal cual, y la meta en cifras es 80 % negro / 12 % estrellas / 8 %
nebulosa contra un 60/20/20 percibido. Tres hallazgos medidos: **el residuo
del 25 % que dejó `14 octies` era el remolino entero** —tangencia 0.98 a
400-550 px contra un suelo de muestreo de 0.64, o sea firma del lente hasta
las esquinas—, así que la rampa pasa a llevar la mezcla de 1 a **0** entre 14
y 34 rs, con pendiente sólo 1.2 veces la anterior para no fabricar el
artefacto del jacobiano; **el campo estelar brillaba MÁS cerca del agujero**
—la escala gruesa llevaba dos factores atados a `presence`, +72 % la estrella
mediana y casi el triple la notable— y `presence` se invierte en `clearance`
(0 pegado al agujero, 1 lejos, rampa **3-12 rs**, suelo **0.45**), que es el
«negative space natural» pedido; y **el suelo de magnitud 0.30 era lo que impedía las
dos mitades del encargo** —baja a 0.13 y el reparto lo decide `pow(h.y, 9)`,
con las gruesas a −40 %/−30 % de densidad y las finas subiendo a 0.46 y 0.85—,
más un campo de vacíos que reutiliza el `warp` del gas. Dos reglas que costaron
una entrega cada una: **apretar la gaussiana de una capa SUBPÍXEL divide su
población por el CUADRADO del factor** (86 estrellas medidas contra 270: el
apriete es sólo para la escala gruesa) y **la distancia de una nebulosa la da
el GRANO, no el tamaño** (ensanchar las elipses subió el azul un 21 % y lo
convirtió en nube; lo que la aleja de verdad es perder la cuarta octava,
`fbm` → `fbm3`). El morado baja un 23.5 % medido y el azul se queda donde
estaba (+3 %). Nace `tools/sky-budget.mjs` (negro / energía de estrella /
nivel por tercio). Cero ruidos, uniformes o draws nuevos —el rayo que escapa
cuesta menos que antes—; `rs`, exposición, rodilla, bloom, cámara, HUD y el
material del disco no cambian. Y una TERCERA regla, que el
dueño cazó en la primera mirada —«¿por qué no hay estrellas cerca de Gargantúa
como antes?»— con el espacio negativo puesto en 5-22 rs: **un espacio negativo
que crece con la ventana no es espacio negativo, es un agujero en el cielo**.
La conversión de radios a píxeles va con el ALTO del viewport, así que 22 rs
son 440 px en el encuadre de captura y 540 en una pantalla de 1060 de alto, o
sea todo el hueco entre el Tesseracto y la Ranger; el cierre se ata ahora a
12 rs, dentro del radio del propio disco (`DISK_OUTER` = 17 rs) en cualquier
ventana. Medido al cerrar: energía de estrella 9.4 % → 9.0 %, negro 30.9 % →
33.6 %, trazos en el núcleo 14 → 2 y en la periferia 18 → 4, tangencia lejana
0.85 → 0.71. **Y el ratón arrastraba el cielo, que es la OTRA mitad
del «warp speed» y no vive en el shader:** la acumulación temporal sólo
declaraba en movimiento la travesía, pero el paralaje del puntero también
mueve la cámara —grado y medio con constante de 0.32 s—, así que el historial
se mezclaba al 82 % con la pose anterior y cada estrella arrastraba una cola
de unos siete píxeles; la corrección es una condición,
`temporalBlend(accumulated, voyage !== null || cameraMoved)`, con la bandera
levantada donde se reorienta y bajada al cerrar el fotograma (nunca tirar el
historial en cada `pointermove`: ése es el fallo contrario y deja a Gargantúa
granulada). Medido con `.shots/_scratch/paralaje.mjs`: la energía de estrella
caía de 11.2 % a 9.9 % sólo por mover el ratón, y ahora va de 11.6 % a 12.4 %.
**Y las nebulosas encogen** por segundo encargo del dueño: los cuatro semiejes
a 0.61 (−63 % de superficie por banco), y el morado otra vez a 0.61 sobre eso
—sólo él, porque el azul le gusta como está—, que es lo que cierra las cifras:
el cielo realmente negro sube de 30.9 % a **61.8 %**, la energía de estrella de
9.4 % a **14.5 %** y el núcleo morado cae un 57 %. **Dos trampas de lectura:** las
trazas orbitales del mapa son curvas finas que el segmentador de
`star-streaks.mjs` cuenta como manchas alargadas, así que el veredicto se lee
en el recorte de la banda encima de la sombra y no en la media del anillo de
400-550 px; y cualquier herramienta de captura nueva tiene que escribir
`jonas-orbit:reducir-efectos = "false"` en `localStorage` o sirve el perfil
plano y no mide la escena. Su valoración visual queda abierta.

## System Map — dos respuestas al puntero (2026-09-21)

La sección `14` de
`docs/design/endurance-navigation-interface.md` manda sobre `6`, `7` y `12` en
**qué ocurre al apuntar un destino**. Pedido del dueño: «quiero probar quitar
el target lock y esos efectos de hover […] guárdalo, no lo elimines». Apuntar
encendía SEIS cosas colgadas del mismo `data-target-state` —escuadras de
adquisición, nombre + etiqueta, lectura del HUD hasta `TARGET LOCKED`, raíl
resaltado, tinte `uFocus` del cuerpo (que además CONGELA el paralaje) y los
arcos del retículo—; ahora enciende una: **su nombre cósmico**, con el
trazo de 1 px bajo el rótulo dibujándose hacia fuera. `lib/map-hover.ts` tiene UNA constante,
`MAP_HOVER_MODE` (`instrumento` | `sencillo`, hoy `sencillo`), y nada se ha
borrado: las escuadras, el cableado del tinte y las reglas del HUD siguen
detrás de una condición. `SystemMap` la acepta además como propiedad, y eso no
es comodidad de tests — **es lo que impide que el camino apagado se pudra
mientras está apagado**: los cinco tests de adquisición siguen ejercitándola a
mano, cuatro nuevos cubren el modo sencillo y uno comprueba que los dos
caminos son EXCLUYENTES en el DOM. Dos reglas del pase: **el estado bloqueado
se sigue escribiendo y lo que se apaga es quien lo pinta** —`activate` lo
necesita y la travesía lo lee— y **el modo sencillo no añade ni un nodo al
cuadro**. Esto último es la segunda versión: la primera fue un aro de 1 px
sobre el cuerpo y el dueño la rechazó al verla, con razón, porque repetía el
error que la propia hoja ya había documentado al retirar el marcador —no se
dibuja un círculo de interfaz encima de un cuerpo iluminado de verdad, y menos
uno cuyo diámetro respira con la órbita—. Lo que se usa en su lugar ya estaba
escrito y **muerto**: el trazo de `.system-map__label::after` sólo se encendía
con `.system-map__body:hover`, y ese `:hover` no llega nunca desde que el
rótulo lleva `pointer-events: none`. El raíl conserva su revelado del nombre
cósmico, que es del §6 y no de la adquisición, y **Gargantúa recupera el suyo
al apuntarla** —su bloque lo prometía y la regla que lo oculta en reposo lleva
un atributo más que la que lo encendía, así que ganaba siempre—. En el mismo
pase se corrigió **la cruz que flotaba bajo el disco**, reportada por el dueño
como artefacto: la regla que devuelve el marcador de Gargantúa con la escena
viva dice «el punto del marcador, sin su aro» y quita el aro con
`border-color`, pero las cuatro barras del marcador son `linear-gradient` de
FONDO escritos por una regla posterior — dos reglas de momentos distintos que
se contradicen sin que ninguna esté mal por sí sola. Ahora es el punto de 3 px
que siempre dijo ser. **No se ha tocado el retículo del puntero**,
que sigue abriendo sus arcos sobre un cuerpo: es la sexta de la lista y sale
con una condición más en el mismo interruptor si el dueño lo quiere fuera.

## ARQUITECTURA NARRATIVA (2026-09-06) — manda sobre todo lo anterior en significado, etiquetas y rutas

`docs/design/arquitectura-narrativa.md` fija la
asociación canónica entre cuerpo y sección:

| `WorldId` | Significado | Ruta ES |
| --- | --- | --- |
| `gargantua` | Sobre mí | `/es/sobre-mi` |
| `miller` | Formación | `/es/formacion` |
| `endurance` | Proyectos | `/es/proyectos` |
| `edmunds` | Creatividad | `/es/creatividad` |
| `tesseract` | Experimentos | `/es/experimentos` |
| `ranger` | Contacto | `/es/contacto` |

Cualquier texto anterior que diga **Tesseracto = Sobre mí/Historia**, **Miller =
Desarrollo** o **Gargantúa = Laboratorio** está obsoleto. El nombre visible de
`tesseract` es `Experimentos`, nunca `Laboratorio`. `/es/desarrollo` y
`/es/laboratorio` responden 404, sin alias ni redirección.

Dos separaciones que hay que respetar al tocar esto:

1. **`order` es orden NARRATIVO, no posición.** Gobierna raíl, DOM, tabulador,
   vecinos y sitemap; la escena se indexa por `WorldId` vía `placement` y
   `lib/scene-depth.ts`. Reordenar la narrativa no mueve ningún cuerpo.
2. **El significado vive en el MDX, no en la estructura.** `worlds.data.ts`
   sigue sin una sola palabra visible: etiqueta, título y slug están en el
   frontmatter, y por eso este cambio no tocó routing.

Este documento **revoca el veto sobre `/es/formacion`** que estableció la
decisión del 2026-09-04 al retirar Cooper Station. Lo retirado entonces fue un
CUERPO y sigue retirado; lo que vuelve es un SIGNIFICADO sobre un cuerpo que ya
existía. Siguen siendo seis destinos.

## Tesseracto V4 — pase de pulido (2026-09-06)

La sección `V4 — pase de pulido
sobre la base canónica` de `docs/design/atlas-tesseract-reference.md` manda sobre
`Hipercubo de cristal` en **material de la arista, oclusión de cruces, ritmo de la
animación y tamaño de la punta**. V3 queda como BASE CANÓNICA por decisión del
dueño —la búsqueda conceptual está cerrada— y de aquí en adelante sólo se pule:
prohibido reabrir la matemática del 4-cubo, la estructura o la dirección visual.
Cambios: normales por esquina en vez de por faceta (sin eso el material de tres
niveles no se ve), punta un 20 % menor con la estela intacta, reloj deformado por
dos armónicos que frenan en las poses legibles y aceleran en las comprimidas, una
cuarta capa que sólo escribe profundidad para interrumpir la línea de detrás en
los cruces, y un 3.5 % de contaminación cálida de Gargantúa. **No se engordan las
aristas**: la presencia sale de contraste, oclusión y ritmo, nunca de masa. Cuatro
draws, los mismos que el corredor. La persistencia 4D queda sin implementar a
propósito: es una prueba A/B que sólo se puede juzgar en movimiento. Checkpoints
intactos en `output/archive/tesseract-crystal-v2-…zip` y `-v3-…zip`.
**Cuarto recorte de escala — sólo el Tesseracto (2026-09-06):** la sección
`14 decies` de `docs/design/hero-gargantua-direction.md` sustituye la fila
`Tesseracto` de `14 septies` y sólo esa: `size` 2.629 → 2.5764 (−2 %), radio
publicado 4.667 → 4.574 rs. Es la deuda que aquel pase dejó abierta — el dueño
había pedido entre 1 y 2 % y se aplicó 1.5 porque la banda dura de
`bodies.test.ts` no daba para más. Ahora pide el 2 completo, así que la banda
baja su suelo de 4.55 a 4.47 conservando el margen que tenía (0.117 → 0.104 rs).
No se toca ningún otro cuerpo, ni posición, fase, inclinación, cámara, material
o HUD, ni las cuatro guardas donde vive «ni mota ni inflado»: suelo aparente
0.035, Miller el menor, el Tesseracto por encima de Miller y la Ranger entre el
Tesseracto y el 65 % de la Endurance.

## Hipercubo de cristal (2026-09-06)

La sección `Hipercubo de cristal` de
`docs/design/atlas-tesseract-reference.md` manda sobre todo lo anterior en
**geometría, material y versión plana del Tesseracto**. Sustituye el corredor de
marcos por el 4-cubo real —dieciséis vértices, treinta y dos aristas y rotación
en cuatro dimensiones proyectada por perspectiva— recorrido por un trazo
luminoso en circuito euleriano, en cristal casi negro con acentos cian y
violeta. Un segundo pase (mismo día) corrige la primera versión, que salió
ilegible: la lectura no dependía de la exposición sino de la JERARQUÍA, así que
`sampleTesseract` publica la profundidad en W de cada vértice y con ella se
reparten luz y grosor de trazo entre las dos celdas del hipercubo — gruesa y
clara la cercana en la cuarta dimensión, fina y apagada la lejana. El perfil
plano comparte ese reparto en ancho de trazo y opacidad. Tres draws y **tres** materiales, uno menos y dos más que antes: la
diferencia entre capas es de MEZCLA, no de acabado. El Tesseracto sale del
material común de los cuerpos y con él se retiran sus ocho ramas `uKind == 2`.
No cambian posición, fase, inclinación, tamaño, cámara ni datos orbitales de
ningún cuerpo, y la envolvente se normaliza al mismo radio de antes. El corredor
anterior queda recuperable en `output/archive/` (ignorado por git) y vivo en el
historial. Las secciones `Profundidad contradictoria` y `Remodelado estructural`
del mismo documento quedan como referencia histórica sustituida. La sección
`V2 aprobada, y la deuda que deja para una V3` recoge la aprobación del dueño,
dos vetos —no se recupera nada del Tesseracto arquitectónico anterior y no se
añade nada alrededor: ni partículas, ni energía, ni rayos, ni esfera de glow— y
siete frentes abiertos por orden de techo. El checkpoint intacto de esa V2 vive
en `output/archive/tesseract-crystal-v2-2026-09-06.zip`.

## Decisión del dueño (2026-09-04)

`docs/design/sistema-seis-destinos.md`
manda sobre los documentos anteriores en catálogo y recomposición: seis destinos
(Tesseracto, Miller, Endurance, Edmunds, Gargantúa, Ranger), sin Cooper Station
ni su ruta de Formación. No se reasigna contenido. La composición nueva necesita
revisión visual del dueño; se conserva el contrato de cámara y Gargantúa.
