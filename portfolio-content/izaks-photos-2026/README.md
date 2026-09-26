# Izak's Photos — material de portafolio (2026)

| Dato | Valor |
| --- | --- |
| Fecha de la investigación | 25 de septiembre de 2026, 22:50–00:30 (UTC−4) |
| Código publicado (base) | `38b4f3def78cb969bdb5a6f3367fb36a18f8512f` en `origin/main` («fix: normalize footer component casing»). Es exactamente lo que sirve producción (ver [overview.md](overview.md)). |
| Código capturado | Rama local `portfolio-polish` = `38b4f3de` + mejoras de esta sesión **sin commit** (28 archivos modificados o borrados, 4 nuevos + 43 miniaturas WebP). Detalle en [case-notes.md](case-notes.md#sesión-del-25-09-2026). |
| Repositorio | `JonasJavier/IZAK-S-PHOTOS`, **público**, fork de `JobNacor/IZAK-S-PHOTOS` (API de GitHub: `"private": false`, `"fork": true`) |
| Producción | <https://izaksphotos.jonasjavier.dev>: responde 200 hoy en Railway. Todavía sirve `38b4f3de`, **sin** las mejoras de esta sesión. |
| Entorno de captura | Windows 11 · Python 3.12.10 (venv aparte) · Node 24.16.0 · npm 11.13.0 · Playwright 1.61.1 (Chromium) |
| Servidor de captura | Django `runserver` en `127.0.0.1:8000` sirviendo el build de producción de Vite, la API y el admin (mismo origen, como en Railway), con DEBUG |
| Datos | Base SQLite **local y desechable** en `%TEMP%/izaks-portfolio-demo`, sembrada con [scripts/seed_demo.py](scripts/seed_demo.py): 8 solicitudes ficticias y un admin sólo local |

En `jonas-orbit-v3` sólo se escribió dentro de esta carpeta y no se hizo ningún commit. En `IZAK-S-PHOTOS` tampoco hay commits. Las mejoras de la fase 1 quedaron sin commit en la rama `portfolio-polish` (tu `main` local no se tocó).

## Estado del material

| Entregable | Estado |
| --- | --- |
| Capturas en `screenshots/raw/` | 63 (escritorio 1440×900 y móvil 390×844, `deviceScaleFactor` 2) |
| Capturas publicables en `screenshots/principales/` | 57, en orden narrativo |
| Capturas excluidas | 6, con su motivo en [excluded.md](excluded.md) |
| Funciones documentadas | 39 en [features.md](features.md) (28 con captura publicable) |
| Pruebas del repo | 9/9 en verde (`manage.py test api`, con `DEBUG` en `true` y en `false`) |
| Build de producción | OK (`vite build`, 25-09-2026) |
| Scripts reproducibles | [scripts/](scripts/) (sembrado, servidor y captura) |

## Índice

- [overview.md](overview.md): qué es, para quién y estado real.
- [case-notes.md](case-notes.md): notas factuales para el caso, incluidas las mejoras de esta sesión.
- [features.md](features.md): todas las funciones y pantallas.
- [stack.md](stack.md): tecnologías con versión y evidencia.
- [design-decisions.md](design-decisions.md): 6 pares problema → decisión.
- [metrics.md](metrics.md): sólo cifras comprobables.
- [cv-notes.md](cv-notes.md): viñetas para el CV (ES/EN).
- [excluded.md](excluded.md): lo que quedó fuera y por qué.
- [architecture/](architecture/): `system-overview.md`, `data-flow.md`, `nodes.yaml` y `diagrams/`.
- [screenshots/manifest.md](screenshots/manifest.md): ficha de cada captura.
- [screenshots/capture-report.json](screenshots/capture-report.json): por captura, errores de consola, peticiones fallidas, imágenes rotas y desborde.

## Lo publicado que estaba mal o viejo

Fuente: `content/es/projects/izaks-photos.mdx` y `public/media/projects/izaks-photos/` en jonas-orbit-v3.

| # | Afirmación publicada | Realidad hoy | Evidencia | Etiqueta |
| --- | --- | --- | --- | --- |
| 1 | «La URL pública se añadirá cuando termine el despliegue; hasta entonces no se presenta una demo inexistente» | Ya está desplegado y en línea en `izaksphotos.jonasjavier.dev` | `curl` 200 en `/`, `/projects`, `/api/health/`, `/admin/login/`; cabeceras `Server: railway-hikari`, `x-railway-edge: mia1` | comprobado |
| 2 | «el despliegue **previsto** usa un solo servicio de Railway» | Ya no es un plan: producción sirve la SPA y la API desde el mismo origen | Las mismas respuestas 200 bajo un solo dominio; `railway.toml` | comprobado |
| 3 | «pasa las **cuatro** pruebas del backend» | En `38b4f3de` eran 4; hoy son **9** (honeypot, límite de envíos, mapeo de campos, correo inválido y fecha local del título) | `manage.py test api` → `Ran 9 tests … OK` | comprobado |
| 4 | «Imágenes optimizadas y espacio reservado para evitar saltos» | El espacio sí se reservaba (`aspect-ratio` por foto). Pero la galería descargaba los 44 JPEG a tamaño completo (**9.303 KB** en móvil) y cada miniatura tenía un marco irregular (el `<button>` conservaba `padding: 1px 6px`). | Medición con Playwright sobre producción; `getComputedStyle(.masonry-button).padding` | comprobado |
| 5 | Capturas publicadas (01–04, del 03-08-2026) | Muestran el marco irregular de las miniaturas y el selector de idioma flotante tapando una foto en móvil. Se rehicieron todas. | `public/media/projects/izaks-photos/02-gallery-desktop-960.webp`, `04-gallery-mobile-390.webp` | comprobado |
| 6 | No menciona a nadie más | El repo es un fork: `JobNacor` creó el proyecto el 11-05-2024 y tiene 10 de los 82 commits del historial anterior; tú tienes 72. El README público ya lo reconoce. | `git shortlog -sn main`; API de GitHub (`fork: true`) | comprobado |
| 7 | `eyebrow`: «Portafolio fotográfico **para cliente**» | No hay evidencia de que Izak sea un cliente real: el sitio está en tu dominio y el correo de contacto usaba un dominio que no existe | DNS de `izaksphotos.com`: NXDOMAIN; dominio `*.jonasjavier.dev` | pendiente |
| 8 | `problem`: «El fotógrafo necesitaba…» | Sin evidencia de un encargo o levantamiento con un fotógrafo real | — | pendiente |
| 9 | `links`: sólo el repositorio | Existe sitio en vivo que se puede enlazar | ídem #1 | comprobado |
| 10 | `technologies`: React, Vite, Django, DRF, Railway | Correcto pero incompleto: faltan React Router 7, WhiteNoise, Gunicorn y GitHub Actions (CI en verde) | [stack.md](stack.md) | comprobado |
| 11 | Faltan en lo publicado | Carrusel con pausa, filtros y foto abierta en la URL (enlaces compartibles), visor con teclado, foco y deslizamiento, 404 propia, admin de solicitudes, límite de envíos y honeypot | [features.md](features.md) | comprobado |

Afirmaciones publicadas que **sí** se verificaron: 4 series (Retratos, Editorial, Bodas, Viajes); interfaz en español e inglés con idioma persistente; formulario que guarda en Django (`BookingInquiry`); galería con visor a pantalla completa; Django sirve la API y el build de Vite; rutas de inicio, galería, perfil y reserva.

## Preguntas para Jonás

1. **¿Izak es un fotógrafo real (cliente, amigo o familiar) o una marca de portafolio?** No hay correo ni dominio reales, y el sitio vive en `jonasjavier.dev`.
2. **¿Las fotos son de Izak?** Si no lo son (por ejemplo, de bancos de imágenes), conviene decirlo en el caso y revisar las licencias. El README del repo ya advierte que los derechos de las fotos son aparte.
3. **¿Las cifras del sitio (8+ años, 240 galerías, 48 h, 12 países), los precios y los 3 testimonios son reales?** Se capturaron tal como están, pero no se pueden verificar.
4. **¿Quién es JobNacor y qué aportó?** Creó el repo y la primera versión en 2024 (10 commits); hace falta para describir tu rol con precisión.
5. **¿Qué base de datos usa producción?** El código acepta PostgreSQL por `DATABASE_URL`, pero no hay forma de verificarlo desde fuera. Si es SQLite dentro del contenedor, las solicitudes se pierden en cada despliegue.
6. **¿El `DJANGO_SECRET_KEY` de producción es distinto del que estuvo versionado?** El commit `3adcd999` (08-06-2026) subió al fork un `.env` con `DJANGO_SECRET_KEY`, y fue público hasta que reescribiste el historial hoy. En GitHub los commits antiguos pueden seguir accesibles por su SHA. Si esa clave llegó a producción, cámbiala. El `.env` del repo original (`JobNacor`) sólo trae `VITE_API_URL`.
7. **¿Existe un superusuario en producción y alguien revisa las solicitudes?** El sitio no avisa por correo: las solicitudes sólo aparecen en `/admin/`.
8. **¿Hay correo o Instagram reales del fotógrafo?** Se quitaron `hello@izaksphotos.com` (el dominio no existe) y el enlace genérico a instagram.com; si hay datos reales, se pueden volver a poner.
9. **¿Quieres mencionar la asistencia de IA?** Las mejoras de esta sesión las hizo Claude a petición tuya, sin commit. Además, `scripts/dev.py` busca un Node en `~/.cache/codex-runtimes`, lo que sugiere que en junio de 2026 se usó Codex.
10. **¿Vas a hacer commit y desplegar las mejoras?** Las capturas muestran la rama `portfolio-polish`; producción seguirá mostrando la versión anterior hasta que hagas push y Railway despliegue.
11. **¿Qué hacemos con `nixpacks.toml`?** `railway.toml` usa `builder = "RAILPACK"`, así que es probable que Railway lo ignore.
12. **¿Borramos el endpoint `/api/photos/`?** Devuelve una lista fija de 6 fotos que ninguna pantalla usa.
