# Notas del caso (factuales)

Hechos para que redactes el caso. Cada punto lleva evidencia y etiqueta.

## Contexto

- Proyecto nacido en mayo de 2024 como fork de `JobNacor/IZAK-S-PHOTOS`. La versión 2024 usaba React 18 + Bootstrap, 25 dependencias de ejecución y 7 páginas (Home, Portfolio, About, Contact, Wedding Photography, Wedding Videography, Travel/Lifestyle), con un modelo `Contact` de 4 campos. — comprobado (`git show 34de48c6:frontend/package.json`, árbol de `34de48c6`)
- En junio de 2026 se reconstruyó desde cero: 6 dependencias de ejecución, 4 páginas, interfaz bilingüe y modelo `BookingInquiry` con 10 campos. — comprobado (`frontend/package.json`, `backend/api/models.py`, migración `0002` del 09-06-2026)
- El 25-09-2026 se publicó un historial limpio: sin el virtualenv versionado (`env/`, 6.378 archivos), sin `.env` ni `db.sqlite3`, y con CI de GitHub Actions. — comprobado (`git diff --stat main origin/main`)

## Problema

- Un archivo de 42 fotos en 4 series tiende a convertirse en una cuadrícula genérica; el sitio también tiene que llevar a una solicitud de reserva. — inferencia (del producto; no hay brief)
- Qué necesitaba el fotógrafo, si es que existe: sin evidencia. — pendiente (Pregunta 1)

## Usuarios

- Visitante que explora y reserva: sin cuenta, desde móvil o escritorio, en inglés o español. — comprobado
- El fotógrafo, que revisa solicitudes en Django Admin. — comprobado
- No hay datos de uso ni analítica. — comprobado (no hay scripts de analítica en `index.html` ni en `src/`)

## Restricciones

- Un solo servicio en Railway: Django sirve la API, el admin y el build de Vite (`base: '/static/'` al compilar). — comprobado (`vite.config.js`, `railway.toml`, `settings.py`)
- Sin almacenamiento de medios subidos: las fotos son archivos estáticos del bundle de Vite, así que añadir una foto requiere un despliegue. — comprobado (no hay `MEDIA_ROOT` ni `ImageField`)
- Sin envío de correo: las solicitudes sólo quedan en la base y en el admin. — comprobado (no hay configuración de `EMAIL_*`)
- Contenido bilingüe escrito a mano en `data/portfolio.js` y en los componentes, con `t({ en, es })`: 256 cadenas en español. — comprobado (`grep -c 'es: "'`)

## Proceso

- 2024-05 y 2024-06: 61 commits (subidas y reorganización, sobre todo por la interfaz web de GitHub: «Add files via upload»). — comprobado (`git log`)
- 2026-06-06 a 2026-06-09: 21 commits de reconstrucción con mensajes «xd»; el historial no documenta las decisiones. — comprobado
- 2026-09-25: historial limpio, 2 commits, CI en verde. — comprobado
- 2026-09-25, esta sesión: revisión en 5 anchos (1440, 1024, 768, 390 y 360 px) y en los dos idiomas, mejoras, 63 capturas y esta documentación. — comprobado

## Decisiones técnicas

| Decisión | Evidencia | Etiqueta |
| --- | --- | --- |
| Un solo origen en producción: Django + WhiteNoise sirven el build (`CompressedManifestStaticFilesStorage`) y un `re_path` final devuelve `index.html` para las rutas de React | `backend/backend/urls.py`, `settings.py` | comprobado |
| i18n propio mínimo: un Context con `t()` que acepta `{ en, es }`; el idioma se guarda en `localStorage`, se detecta del navegador y actualiza `<html lang>` | `frontend/src/i18n.jsx` | comprobado |
| Espacio reservado por foto (`aspect-ratio` con el ancho y alto reales), sin saltos al cargar | `ProjectGallery.jsx`, `portfolio.js` (`w`, `h`) | comprobado |
| Serializer que traduce los nombres camelCase del formulario (`projectType`, `date`) a los campos del modelo | `backend/api/serializers.py` | comprobado |
| Migraciones antes de publicar y healthcheck en `/api/health/` | `railway.toml` | comprobado |
| (Esta sesión) Estado de la galería en la URL: `?category=` y `?photo=` | `ProjectGallery.jsx` (`useSearchParams`) | comprobado |
| (Esta sesión) Miniaturas WebP de 720 px generadas por script; el JPEG completo sólo se usa en el visor y en el hero | `scripts/optimize_images.py`, `portfolio.js` (`import.meta.glob`) | comprobado |
| (Esta sesión) Límite de envíos por cliente y campo trampa en la API de contacto | `views.py` (`ContactRateThrottle`), `settings.py` (`CONTACT_RATE_LIMIT`) | comprobado |

## Desafíos encontrados (y resueltos en esta sesión)

| Hallazgo | Causa | Evidencia |
| --- | --- | --- |
| Marco oscuro irregular y hueco de ~22 px bajo cada foto de la galería | El `<button>` de cada miniatura conservaba el `padding: 1px 6px` del navegador | `getComputedStyle` en producción: foto de 263 px dentro de una celda de 276 px |
| Bloque de cifras de About dentro de un panel gris grande | `section-shell` (padding) combinado con el fondo de las líneas de la cuadrícula | Captura de producción a 1440 y 390 px |
| El header nunca desenfocaba el fondo en Chrome ni Firefox | Con las dos formas escritas en `Home.css`, el minificador de Vite 8 (Lightning CSS) dejaba sólo `-webkit-backdrop-filter` | CSS de producción `index-Or_Bs73z.css`: `.site-header:before{…-webkit-backdrop-filter…}` sin la versión estándar |
| Botón «Reserve» aplastado en el menú móvil | `.site-nav a` (más específico) pisaba el padding de `.nav-reserve` | Captura de producción a 390 px |
| Títulos de las fotos invisibles en táctil | Sólo aparecían con `:hover` | CSS y capturas móviles de producción |
| Selector de idioma flotante que tapaba fotos, paquetes y el panel de confirmación | `position: fixed` abajo a la derecha | Capturas de producción |
| En móvil, la confirmación de reserva quedaba debajo del botón, fuera de la pantalla | El panel está después del formulario en una sola columna | Captura de producción a 390 px |
| El correo de contacto no existía | El dominio `izaksphotos.com` da NXDOMAIN | `dns.google` |
| La foto «Waterfall / Cavern Light» es una luna llena sobre un campo | Etiqueta equivocada | Hoja de contactos de las 43 fotos |
| About decía «una década después» y las cifras «8+ años» | Textos incoherentes | `portfolio.js` |
| El título de cada solicitud en el admin usaba la fecha en UTC | `__str__` formateaba `created_at` sin pasarlo a hora local | Admin: título «(2026-09-26)» junto a «Created at: Sept. 25, 2026, 11:48 p.m.» |
| La API de reserva no tenía ningún límite | No había throttling | `views.py` en `38b4f3de` |

Los dos últimos defectos del header y del admin, y el tamaño del visor mientras carga, se detectaron **durante la captura** y se corrigieron antes de la captura final (ver sección siguiente).

## Sesión del 25-09-2026

Mejoras sin commit en la rama `portfolio-polish` (base `38b4f3de`). Todo verificado con build de producción, 9 pruebas en verde y revisión visual en 5 anchos.

**UX / UI**
- Galería: miniaturas sin marco, conteo por categoría, «Todo» intercalado por series, títulos visibles en táctil y marcador de posición mientras cargan.
- Visor: foco dentro del diálogo y de vuelta a la miniatura al cerrar, deslizamiento táctil, precarga de las vecinas, miniatura de fondo mientras carga el JPEG completo y marco dimensionado antes de cargar.
- Enlaces compartibles: `?category=` y `?photo=`. Las fotos destacadas de la portada abren directamente esa foto en el visor.
- Carrusel: botón de pausa/reproducción (WCAG 2.2.2); sin autoplay con `prefers-reduced-motion`; pausa al recibir foco; deslizamiento táctil. En táctil, tocarlo ya no lo pausa para siempre.
- Selector de idioma dentro del header (escritorio) y del menú (móvil); ya no tapa contenido.
- Menú móvil: se cierra con Escape, la marca queda visible y «Reserve» recupera su tamaño.
- About: foto principal rotulada «From the portfolio · Winter Gaze» (ya no se presenta a nadie como Izak); bloque de cifras corregido; textos coherentes.
- Reservas: errores por campo que devuelve la API (`aria-invalid`), resumen de lo enviado tras el éxito y desplazamiento hasta la confirmación en móvil. También se añadieron mensaje para el límite de envíos (429), campo trampa, `autocomplete` y teléfono de ejemplo con prefijo 555.
- 404 propia (antes, cualquier URL desconocida redirigía en silencio a la portada), título de pestaña por ruta, enlace «Saltar al contenido», anillo de foco visible e imagen Open Graph.
- Espaciado vertical más contenido; CTA final con separación entre título y texto; cifras en 2×2 en móvil; botones del hero a ancho completo en móvil.

**Contenido**
- Se retiraron 3 fotos que ya habías borrado en tu copia local: un fotógrafo callejero presentado como Izak, una portada de Vogue con productos Dior y «Crimson». Galería: 44 → 42 fotos.
- Se quitó el correo inexistente y el enlace genérico a Instagram; el footer lleva al formulario.
- «Waterfall» pasó a «Moonrise / Salida de la Luna» y se renombró el archivo.

**Rendimiento**
- 43 miniaturas WebP de 720 px: 8.986 KB de JPEG → 2.372 KB (−74 %). Galería completa en móvil: 9.303 KB → 2.361 KB.

**Backend**
- Límite de 10 solicitudes/h por cliente (`CONTACT_RATE_LIMIT`), honeypot, cookies `Secure` fuera de DEBUG y API navegable de DRF sólo en DEBUG.
- Admin con acciones «marcar como atendidas» y «reabrir»; título de cada solicitud con fecha local.
- Pruebas: 4 → 9.

**Documentación del repo**
- README actualizado; capturas de `docs/screenshots` regeneradas (las anteriores mostraban el marco de la galería); `.env.example` con `CONTACT_RATE_LIMIT`.

## Aprendizajes (factuales)

- Un reset CSS de `button` que no incluye `padding: 0` se nota en cualquier botón que envuelve una imagen. — comprobado
- Escribir `backdrop-filter` y `-webkit-backdrop-filter` a la vez rompe el desenfoque con el minificador de Vite 8: hay que escribir sólo la forma estándar. — comprobado (CSS compilado antes y después)
- `width` y `height` en un `<img>` no reservan espacio si el CSS pone `width: auto; height: auto`: el visor medía 0×0 hasta que cargaba el archivo. — comprobado (captura con la foto retenida)
- Las capturas de Playwright sacaron a la luz 3 defectos que la revisión a ojo no vio. — comprobado

## Estado

- Producción estable en `38b4f3de`; las mejoras esperan commit y despliegue. — comprobado
- Pendiente de tu lado: el origen de las fotos y los textos, la base de datos de producción, el superusuario y rotar la clave si hace falta. — pendiente (Preguntas)
