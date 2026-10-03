# QA para premios — Awwwards, CSS Design Awards y The FWA (2026-10-02)

Revisión completa del sitio como jurado, antes de enviarlo a los tres premios.
Encargo del dueño: línea base, QA, arreglar todo lo que se pueda, publicar y
preparar capturas de portada. Lo que cambia reglas vigentes está en el registro
(«QA para premios — precarga diferida, páginas de lectura y pulido»).

Punto de partida: `main` en `49d0e13`, etiquetado `pre-qa-premios`. Todo lo de
este pase son commits pequeños encima, en `main`.

## 1. Cómo se midió

- Build de producción servido con `next start` en el puerto 3100 (nunca
  `npm run dev`, ver «Trampas de medición» de `AGENTS.md`).
- Inventario: las 54 URL del sitemap (27 páginas × 2 idiomas) más la página
  de gracias en los dos idiomas, dos 404 y los dos CV en PDF. 58 rutas.
- Capturas de las 58 rutas a 1440×900, 1920×1080 y 390×844 (DPR 2), con
  `jonas-orbit:reducir-efectos = "false"` y reduced-motion en
  `no-preference`, en Chromium headless con SwiftShader (`tools/shot.mjs`
  hace lo mismo). 174 capturas, cero errores de página, cero peticiones
  fallidas salvo las dos 404 pedidas a propósito. En `output/qa-premios/base/`
  (ignorado por git).
- Consola y red registradas en cada carga; enlaces internos (68) y recursos
  (607) comprobados contra el servidor; los 53 enlaces externos con HEAD/GET.
- Lighthouse 13.5 local, Chromium de Playwright con SwiftShader: medianas de
  3 pasadas en ocho rutas clave (móvil, 4G simulada y CPU ×4) y cinco
  (escritorio), con `?no3d=1` y con la escena; y una pasada de
  accesibilidad, buenas prácticas y SEO en las 58 rutas. SwiftShader compila
  los shaders en CPU, así que el TBT con escena está inflado respecto a una
  GPU real: las cifras valen como A/B entre sí, no como lo que verá un jurado
  con GPU.
- Producción (`https://jonasjavier.dev`) comprobada con `curl`: códigos de
  estado, cabeceras, redirecciones, compresión y caché.

## 2. Línea base frente a final

### Lighthouse móvil (mediana de 3, 4G simulada, SwiftShader)

| Ruta | Perf base → final | LCP base → final | TBT base → final | Transferido base → final |
| --- | --- | --- | --- | --- |
| `/en` (escena) | 66 → 65 | 2,63 → 2,65 s | 2 775 → 2 611 ms | 861 → 228 KB |
| `/en?no3d=1` (el perfil que audita CI) | 78 → **95** | 2,64 → 2,64 s | 711 → **79 ms** | 861 → 228 KB |
| `/en/about` | 71 → 74 | 4,29 → 4,26 s | 543 → 438 ms | 610 → 589 KB |
| `/en/projects` | 60 → 65 | 4,10 → 4,20 s | 1 289 → 802 ms | 908 → 752 KB |
| `/en/projects/omsta` | 64 → 68 | 4,51 → 3,48 s | 785 → 1 018 ms | 569 → 396 KB |
| `/en/experiments/observatory/gargantua` | 81 → 82 | 2,97 → 2,92 s | 587 → 523 ms | 542 → 229 KB |
| `/en/contact` | 68 → 67 | 3,07 → 3,22 s | 1 384 → 1 366 ms | 510 → 454 KB |
| `/en/blog/how-i-built-a-black-hole-in-webgl` | 71 → 72 | 3,02 → 2,80 s | 1 165 → 1 254 ms | 315 → 272 KB |

Lectura: lo que movió la medida fue la precarga. En `/en?no3d=1` —sin
escena, el perfil que CI audita— el TBT pasa de 711 a 79 ms y la nota de 78
a 95: esos ~630 ms eran el navegador analizando el RSC de seis rutas que
nadie había pedido. Con escena, el TBT que queda es SwiftShader compilando
shaders en la CPU (con GPU real no existe) y el LCP es el rótulo del HUD a
~2,6 s bajo 4G simulada; por eso la nota de la home con escena no se mueve
aunque transfiera 633 KB menos. Las imágenes ajenas (403 KB en la home)
desaparecen; el peso de JS inicial baja de 247 a 181 KB en la home.

Accesibilidad, buenas prácticas y SEO: 100 en las 58 rutas en la línea base,
con dos matices: la auditoría `label-content-name-mismatch` (WCAG 2.5.3)
fallaba en 56 rutas sin bajar la nota (peso cero en Lighthouse, «serio» en
axe DevTools) y las dos páginas de gracias dan SEO 63 por `noindex`, que es
lo decidido.

### Lighthouse escritorio (mediana de 3, SwiftShader)

| Ruta | Perf base → final | LCP base → final | TBT base → final | Transferido base → final |
| --- | --- | --- | --- | --- |
| `/en` (escena) | 70 → 70 | 591 → 584 ms | 813 → 791 ms | 1 022 → 228 KB |
| `/en?no3d=1` | 76 → **99** | 586 → 583 ms | 539 → **0 ms** | 1 022 → 228 KB |
| `/en/projects` | 72,5 → 73 | 889 → 898 ms | 685 → 661 ms | 1 572 → 773 KB |
| `/en/about` | 90 → 88 | 1 009 → 986 ms | 246 → 270 ms | 1 083 → 729 KB |
| `/en/contact` | 75 → 75 | 981 → 1 008 ms | 536 → 532 ms | 1 229 → 454 KB |

Accesibilidad, buenas prácticas y SEO siguen en 100 en las rutas clave y
`label-content-name-mismatch` ya no salta en ninguna.

### Consola (línea base: 174 cargas; final: 45 cargas de 15 rutas clave)

| Aviso | Base (por carga) | Final (por carga) |
| --- | --- | --- |
| «preloaded using link preload but not used» | 1 830 (10,5) | 0 |
| «The AudioContext was not allowed to start» | 168 (0,97) | 0 |
| `GL_INVALID_FRAMEBUFFER_OPERATION` (privacidad) | 24 | 0 |
| Errores de página / peticiones fallidas | 0 / 0 | 0 / 0 (sólo el 404 pedido a propósito) |

### La home en frío (Chromium, `next start`, 8 s)

| | Base | Final |
| --- | --- | --- |
| Peticiones | 48 | 22 |
| Transferido (sin comprimir) | 3 151 KB | 1 626 KB |
| Imágenes de otras páginas | 554 KB | 0 |
| RSC de otras rutas | 565 KB | 0 |
| CSS de otras rutas | ~210 KB | 0 |
| Momento en que llega el chunk de three.js (872 KB) | 2,63 s | 2,08 s |

### Los primeros segundos con GPU real (AMD Radeon integrada, ventana visible)

- **Fibra:** primera pintura a 0,73 s con el atlas plano completo (los seis
  cuerpos en SVG, HUD y raíl); la escena WebGL dibuja a los 2 s y a los 5 s
  está asentada. No hay pantalla vacía ni parpadeo: el atlas es la primera
  imagen y la escena lo sustituye.
- **4G lenta (400 kb/s, CPU ×4):** primera pintura a 2,5 s con el atlas,
  `load` a 5,4 s; el chunk de three.js tarda ~17 s a ese ancho de banda, así
  que la escena llega después. Mientras tanto el atlas es la portada, con el
  HUD en «SYSTEM STANDBY» hasta hidratar. Un jurado en escritorio con fibra
  ve la escena a los 2 s.

### Otros navegadores

Firefox y WebKit (GL por software) y Chromium sin WebGL: las 15 rutas
clave cargan sin un solo error de consola; la escena arranca en `orbit` en
Firefox y WebKit y el atlas plano sirve de portada sin WebGL. Única
diferencia visible: en WebKit la mesa de Proyectos pierde parte de la
perspectiva (el cristal se ve menos en trapecio); no afecta a la lectura.

### Interacción (Chromium, SwiftShader)

- Teclado: salto al contenido → idioma → los seis destinos del raíl →
  MOVIMIENTO → AUDIO, todos con anillo de foco visible (el raíl, con
  escuadras y subrayado). Enter en el raíl viaja.
- Travesía home → Proyectos: `depart` a los 2,3 s y ruta nueva antes de los
  3,8 s; atrás devuelve a la home con la escena viva; adelante vuelve al
  mundo. Interrumpida con Escape a los 600 ms: navega al instante. Dos clics
  seguidos: viaja el primero.
- Zoom 200 % (720 px CSS): sin desbordamiento horizontal en home, Sobre mí,
  Proyectos, Contacto y el Observatorio. Reduced-motion sin activación: atlas
  plano, sin escena.

## 3. Hallazgos

Severidad: **A** se rompe o el jurado lo ve en los primeros segundos; **M**
lo ve en una página interior o en consola; **B** detalle.

| # | Sev. | Hallazgo | Estado |
| --- | --- | --- | --- |
| 1 | A | La home pedía en los primeros 3 s 1,3 MB de OTRAS páginas (RSC de los seis mundos, fotos de Sobre mí, sala, ventanal, cuatro CSS) por el prefetch de `<Link>` en el raíl, antes que el chunk de three.js; ~10 avisos de consola por ruta en todo el sitio. | Arreglado: `lib/world-prefetch.ts`, `IntentLink`, `DestinationsPrefetch` (registro). |
| 2 | A | `/en/privacy` y `/es/privacidad` con el sistema entero animado detrás de un titular de tres líneas y 24 avisos de WebGL por carga. | Arreglado: página de lectura cubierta con el cielo del blog. |
| 3 | M | «TESSERACTO» en páginas inglesas (Experimentos, raíl, HUD, Observatorio, pie). | Arreglado: «Tesseract» en inglés. |
| 4 | M | «The AudioContext was not allowed to start» en cada carga. | Arreglado: la banda sonora se arma sin contexto hasta el primer gesto. |
| 5 | M | axe `label-content-name-mismatch` en 56 rutas: el `aria-label` del resumen de AUDIO, del interruptor de MOVIMIENTO, de la marca de la cabecera y del pie no contenía el texto pintado. | Arreglado: nombre por contenido oculto, sin `aria-label`. |
| 6 | M | `og:image` de las entradas del blog en WebP: LinkedIn no pinta la tarjeta. | Arreglado: `-og.jpg` por portada (`tools/prepare-article-og.mjs`). |
| 7 | M | Señal «Dive in / Descender» de Formación tapada por la bandeja de AUDIO y su rótulo (1440×900 y teléfono). | Arreglado: a la izquierda. |
| 8 | B | La 404 global (sin layout) sobre fondo liso, sin cielo. | Arreglado: cielo del blog. |
| 9 | B | Sin manifiesto web ni `theme-color`: marco blanco en el móvil. | Arreglado. |
| 10 | B | Entradas inglesas del blog en ortografía británica (centre, colour…) con la interfaz en americana. | Arreglado. |
| 11 | B | La burbuja «CLICK TO LISTEN / TAP TO LISTEN» tapa texto en el teléfono hasta el primer toque (p. ej. el título de la primera entrada del blog). | Descartado: desaparece con el primer gesto y explica el estado `armed` del audio, que es decisión vigente; moverla taparía otra cosa. |
| 12 | B | Tres grafías de la marca: `JONAS ORBIT` (HUD de la home), `JONÁS ØRBIT` (cabecera y pie) y «Jonás Orbit» (texto). | Propuesto a Jonás: el HUD está así por la dirección del hero (§«identidad visible»); unificar es decisión suya. |
| 13 | B | Títulos de cine en español dentro de la página inglesa de Sobre mí («El Rey León», «La isla siniestra»). | Propuesto: es curación de Jonás. |
| 14 | B | Tipografía del sistema (Bahnschrift primero): un jurado en macOS ve Avenir Next Condensed, en Linux Noto Sans. Decisión WP0 vigente. | Propuesto: una fuente variable autoalojada daría la misma identidad en todas partes; cambia medidas y pesa ~40 KB. |
| 15 | B | `unused-javascript`: 48 KB de un chunk compartido (AboutExperience + Turnstile) en la home. | Mitigado por el #1 (llegaba con el prefetch); queda como nota. |
| 16 | M | Primer intento del #2 (hoja del cielo importada por la 404 de cada idioma): la 404 forma parte del árbol de TODAS las rutas y Chrome precargaba esa hoja en cada página con un aviso por carga. | Arreglado: el cielo vive en `globals.css`. |
| 17 | B | En 4G lenta, antes de hidratar, el HUD dice «SYSTEM STANDBY» y la bandeja de AUDIO pinta OFF; al hidratar pasan a NOMINAL / ON. | Descartado: es el estado servido y dura lo que tarda el JS (en fibra, <1 s); cambiar el estado servido invertiría el parpadeo para quien apagó el audio. |
| 18 | B | WebKit pierde parte de la perspectiva de la mesa de Proyectos (el cristal se ve menos en trapecio). | Observado, sin cambio: lectura intacta; la suite e2e corre en WebKit sin GPU y no lo reproduce igual que Safari con GPU. |
| 19 | B | Nombre accesible del botón de idioma, del raíl y de la bandeja: coherentes; orden de tabulación de la home: salto, idioma, seis destinos, MOVIMIENTO, AUDIO. | Comprobado, sin hallazgo. |

## 4. Decisiones que cambian

Una entrada en el registro («QA para premios — precarga diferida, páginas de
lectura y pulido», 2026-10-02) y su línea en `AGENTS.md`:

1. Los seis destinos no se precargan por estar a la vista: el apuntado al
   momento, los seis cuando la escena dibuja o 6 s tras el ocio. El §7 del
   pivote sigue (se precarga antes de viajar); cambia el cuándo.
2. Privacidad y 404 son páginas de lectura: cielo del blog y escena dormida.
3. «Tesseract» en inglés.
4. La banda sonora se arma sin `AudioContext`.

## 5. Lo que queda para Jonás

- Decidir sobre #12 (grafía única de la marca), #13 (títulos de cine en
  inglés) y #14 (fuente autoalojada).
- Enviar los formularios y pagar (Awwwards 65 USD, CSS Design Awards
  50 USD; The FWA cobra por envío: comprobar la tarifa en el formulario).
- El formulario de The FWA no se pudo leer desde aquí (la página de envío
  carga vacía sin sesión): comprobar en el propio formulario los tamaños de
  imagen que pide antes de recortar.

### Gates y suites

- `npm run check` (lint, typecheck, knip, 621 tests, build): verde.
- `npm run test:e2e` (Chromium + móvil): 370 de 372. Los dos fallos eran
  `miller.spec` (vista previa de un certificado con `naturalWidth 0`): el
  optimizador servía un WebP corrupto desde `.next/cache/images`, dañado al
  matar `next start` a medias durante el QA; borrada la caché, 14/14 en los
  dos proyectos. No es código.
- `smoke.spec` en Firefox y WebKit: 62 de 64. Firefox: un `goto` que agotó
  los 30 s (GL por software) y pasó al repetir. WebKit: A29 (viaje sólo con
  teclado) no llega al raíl porque WebKit de Playwright no tabula a los
  `<a>`, sólo a botones y `summary`; la matriz cubre A29 en Chromium y era
  así antes de este pase.

## 6. Notas por criterio de Awwwards (del 1 al 10, como jurado)

- **Diseño (40 %): 8,5.** La portada es una pieza: Gargantúa trazada por
  píxel, los cinco cuerpos con material propio, HUD y raíl con una sola
  tipografía de instrumento. Las interiores están a la altura —constelación
  de Sobre mí, océano de Miller, mesa de Proyectos, ventanal de
  Experimentos, agujero de gusano de Contacto— y comparten paleta, cabecera
  y pie. Le quita el 10: el salto de identidad entre `JONAS ORBIT` (HUD),
  `JONÁS ØRBIT` (cabecera) y «Jonás Orbit» (texto), y que la tipografía
  dependa del sistema (un jurado en macOS no ve Bahnschrift).
- **Usabilidad (30 %): 8.** Seis destinos siempre a la vista, teclado
  completo con foco visible, travesía interrumpible, atrás/adelante
  correctos, sin desbordes a 200 %, atlas plano idéntico sin WebGL, dos
  idiomas con ruta propia, 100 en accesibilidad en 58 rutas. Le quita: la
  escena tarda 2 s en fibra (el atlas cubre, pero el cambio se nota), el
  audio arranca ON (decisión vigente; la burbuja lo explica) y en 4G lenta
  la escena llega tarde.
- **Creatividad (20 %): 9.** Un portafolio que es un lugar: raymarch de
  Schwarzschild en tiempo real, travesía con sonido sintetizado, un
  Observatorio con seis especímenes y dos modos, y una 2D que no es un
  fallback pobre sino otra ilustración. Pocos portafolios personales llegan
  aquí.
- **Contenido (10 %): 8.** Cinco casos completos con producto, diseño e
  ingeniería reales, blog técnico con cifras, CV en dos idiomas, sin
  métricas inventadas. Le quita: los registros de los especímenes siguen en
  borrador (voz de Jonás) y algunos títulos de cine en español en la versión
  inglesa.

Nota global estimada: **8,4**. Por encima del 6,5 de Mención Honorífica;
SOTD depende del día y del resto de candidatos. Developer Award: semántica,
SEO, accesibilidad y rendimiento en verde; el punto flaco es el peso de JS
inicial (~250 KB gz) que Next 16 impone.

## 7. Orden de envío

1. **Awwwards** primero: es el que más pesa en visibilidad y el que puntúa
   justo lo que este sitio hace bien (Diseño + Creatividad = 60 %); su ficha
   publicada es un enlace permanente aunque no gane. Imagen principal
   1600 × 1200 + el vídeo.
2. **CSS Design Awards** la misma semana: formulario corto (una captura de
   1068 × 646 JPG) y jurado en 24 h; sus premios de UI/UX/Innovation encajan
   con el Observatorio y la travesía.
3. **The FWA** al final: busca «experiencias que empujen la web», y conviene
   enviarlo con la ficha de Awwwards ya pública y el vídeo; comprobar en su
   formulario los tamaños de imagen antes de recortar.
