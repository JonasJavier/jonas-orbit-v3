# Network — material de portafolio (revisión 2026-09-26)

Carpeta de trabajo para ampliar la ficha de **Network** en Jonás Orbit. Todo lo que
hay aquí se produjo investigando el repositorio tal y como está hoy, ejecutándolo en
local y fotografiándolo con Playwright.

> **Nada de este material está publicado todavía.** La selección final de capturas y
> la redacción en prosa las haces tú; aquí sólo hay hechos, evidencia y material bruto.

---

## 1. Datos de la revisión

| | |
| --- | --- |
| **Fecha de la revisión** | 2026-09-26 |
| **Repositorio** | `C:/Users/savage/Documents/GitHub/Network-3.0` |
| **Remoto** | https://github.com/JonasJavier/cs50w-network (**público**, GPL-3.0) |
| **Commit HEAD** | `e90c5814b88cc93482e87a9732975d8243f5130a` |
| **Mensaje HEAD** | *Merge pull request #9: production follow-ups (volume permissions, seed-on-start, migration check, live demo link)* |
| **Fecha del HEAD** | 2026-09-26 16:23:18 -0400 |
| **Rama** | `main`, árbol de trabajo limpio (sin cambios sin confirmar) |
| **Versión declarada** | `3.1.0` (`backend/config/settings.py:APP_VERSION`, `frontend/package.json`, `CHANGELOG.md`) |

**No se modificó ni un archivo del repositorio de Network y no se hizo ningún commit,
ni allí ni en `jonas-orbit-v3`.** Lo único que se tocó fuera de esta carpeta fue
`frontend/node_modules/` (un `npm ci`, directorio ignorado por git), necesario para
poder ejecutar el proyecto.

### Entorno de ejecución

| | |
| --- | --- |
| Sistema | Windows 11 Pro 10.0.26200 |
| Python | 3.14.5 (`.venv` del repositorio) |
| Node / npm | v24.16.0 / 11.13.0 |
| API | `http://127.0.0.1:8001` (el 8000 está ocupado por otro servicio de esta máquina) |
| Frontend | `http://127.0.0.1:5199` (el 5173 lo ocupa otro proyecto, «Wikiverse») |
| Base de datos | SQLite **aparte**, fuera del repositorio, sembrada sólo para las capturas |
| Caché | `LocMemCache` (sin Redis; el proyecto cae a memoria local cuando no hay `REDIS_URL`) |
| Navegador | Chromium de Playwright, 1440×900 y 390×844, `deviceScaleFactor: 2` |

---

## 2. Tabla de estado

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Tests backend | **98 / 98 en verde** (52 s) | `logs/backend-tests.txt` — `python manage.py test --parallel 1` |
| Tests frontend | **34 / 34 en verde**, 7 archivos | `logs/frontend-tests.txt` — `npm test` (Vitest 5) |
| ESLint | pasa | `logs/frontend-quality.txt` |
| TypeScript (`tsc -b --noEmit`) | pasa | `logs/frontend-quality.txt` |
| Build de producción | pasa (447 ms, bundle principal 225 kB → 70 kB gzip) | `logs/frontend-quality.txt` |
| `prettier --check` | **falla en local, pasa en CI** — artefacto de Windows, ver §4 | `logs/frontend-quality.txt` |
| `ruff` | **no ejecutado**: no está instalado en el `.venv` local | — |
| CI en GitHub Actions | **verde** en el último run de `main` (2026-09-26 20:23 UTC) | `gh run list --repo JonasJavier/cs50w-network` |
| Demo de producción (web) | **viva**, HTTP 200 | `curl https://web-production-9475c.up.railway.app` |
| Demo de producción (API) | **viva**, `{"status":"ok","version":"3.1.0","checks":{"database":"ok","cache":"ok"}}` | `curl .../health/` |
| Swagger en producción | HTTP 200 | `curl .../api/docs/` |
| Repositorio público | sí, GPL-3.0, 0 estrellas | `gh repo view` |
| Placeholders / «TODO» en el código | **ninguno** | `grep -rniE "TODO\|FIXME\|coming soon\|not implemented"` sobre `backend/apps`, `backend/config`, `frontend/src` |

---

## 3. Índice de la carpeta

| Archivo | Qué contiene |
| --- | --- |
| `README.md` | este documento: fecha, estado, correcciones y preguntas |
| `overview.md` | qué es el proyecto, qué problema técnico resuelve, estado real |
| `case-notes.md` | notas factuales para que redactes el caso (contexto, decisiones, desafíos) |
| `features.md` | las 34 funciones y pantallas, una por una, con veredicto de publicable |
| `stack.md` | todas las tecnologías con versión exacta y archivo de evidencia |
| `excluded.md` | lo que queda fuera y por qué |
| `cv-notes.md` | viñetas de CV en ES y EN + línea de tecnologías |
| `metrics.md` | sólo cifras comprobables, con el comando que las produce |
| `design-decisions.md` | 6 pares problema → decisión, cada uno con su captura |
| `architecture/` | `system-overview.md`, `data-flow.md`, `diagrams/*.mmd`, `nodes.yaml` |
| `screenshots/raw/` | las 75 capturas del run completo |
| `screenshots/principales/` | las 74 que pasan el filtro de calidad, en orden narrativo |
| `screenshots/manifest.md` | una ficha por captura: archivo, pantalla, URL, qué muestra, alt, caption |
| `scripts/` | sembrado y captura, reproducibles (`scripts/README.md` explica cómo) |
| `logs/` | salida cruda de los tests y de las comprobaciones de calidad |

Las capturas de `principales/` conservan **el mismo nombre** que en `raw/`, así que la
numeración tiene un hueco (falta la 17). El hueco está explicado en `excluded.md`;
se prefirió mantener la trazabilidad 1:1 antes que renumerar.

---

## 4. Lo publicado hoy que está mal o viejo

Lo actual vive en `content/es/projects/network.mdx` y en
`public/media/projects/network/` de este mismo repositorio de portafolio. Contrastado
línea a línea con el código de hoy:

| # | Lo que dice lo publicado | Realidad comprobada | Evidencia |
| --- | --- | --- | --- |
| 1 | `scope: "32" — pruebas de backend en verde` y «Las 32 pruebas de backend pasan» | Son **98** pruebas de backend, más **34** de frontend que el texto ni menciona | `logs/backend-tests.txt`, `logs/frontend-tests.txt` |
| 2 | «La demo pública se enlazará después del despliegue» | **Ya está desplegada y responde hoy**: web y API en Railway, con Swagger y `/health/` | §2 de este documento |
| 3 | `links: https://github.com/JonasJavier/Network-3.0` | El repositorio canónico es **`cs50w-network`**; la URL publicada sólo funciona por la redirección 301 que GitHub deja tras renombrar | `curl -L` → `.../cs50w-network`, `gh repo view` |
| 4 | `technologies: [React, TypeScript, Django, DRF, PostgreSQL, Redis]` | Faltan piezas centrales: **Vite, Tailwind CSS 4, TanStack Query, Zustand, React Router 7, SimpleJWT, drf-spectacular, Pillow, Docker, nginx, Gunicorn, WhiteNoise** | `stack.md` |
| 5 | `highlights` y `summary` describen feed, imagen, likes, comentarios, perfiles, seguimiento, búsqueda y notificaciones | **No se menciona nada de**: reposts y citas, marcadores, hashtags con trending, @menciones, modo oscuro, PWA, pestaña de medios, pestaña de likes, lista de «a quién seguir», cambio de contraseña, borrado de cuenta, documentación OpenAPI | `features.md`, `CHANGELOG.md` |
| 6 | `statusLabel: Listo para producción` | Correcto **pero incompleto**: hoy además está *efectivamente desplegado*, con CI verde y health-check | §2 |
| 7 | «El feed usa paginación por cursor» | Correcto. Matiz: la paginación por cursor es sólo para timelines (`TimelineCursorPagination`); listas acotadas (personas, comentarios) usan paginación por número de página | `backend/apps/core/pagination.py` |
| 8 | Las 4 capturas publicadas | Se rehacen **todas**. Las actuales son de 2026-08-03 y muestran un conjunto de datos anterior; además el set nuevo cubre 34 pantallas en vez de 4 | `screenshots/` |
| 9 | `seoDescription` menciona «likes y notificaciones» | Correcto, pero se queda corto frente a lo que hoy existe | `features.md` |

### Imprecisiones menores en el propio repositorio (no en el portafolio)

- `README.md` dice «**97 tests**» de backend; hoy son **98**. También `CHANGELOG.md` 3.1.0 dice 97.
- El `README.md` describe la aplicación como **PWA**. Es exacto en el sentido de
  «instalable»: hay `manifest.webmanifest`, iconos 192/512/maskable, `theme-color` y
  metas de Apple. **No hay service worker**, así que no hay funcionamiento offline ni
  caché de assets propia. Conviene decir «manifest instalable», no «PWA offline».
- El `README.md` agrupa «HSTS/CSP/security headers» como endurecimiento del backend.
  Matiz: **HSTS, nosniff, referrer-policy y X-Frame-Options los pone Django**;
  la **CSP la pone nginx** en el contenedor del frontend (`frontend/nginx.conf.template`).

---

## 5. Observaciones de producto encontradas al capturar

Ninguna de estas se ha tocado — sólo se documentan.

1. **El feed no deduplica reposts.** Un repost se guarda como una fila `Post` propia y
   se pinta como una copia completa del original con la cabecera «X reposted». Si el
   repost y el original quedan cerca en el tiempo, aparecen dos tarjetas seguidas con
   el mismo contenido. Se ve claramente en `backend/apps/posts/views.py:get_queryset`,
   que no excluye el original cuando ya hay un repost en la misma página.
   *Los datos demo se distribuyeron en el tiempo para no provocar el caso extremo; el
   comportamiento sigue ahí.*
2. **«Trending this week» sale dos veces en `/search`** cuando no hay consulta: una en
   la columna central y otra en la barra derecha (`SearchPage.tsx` + `SidebarRight.tsx`).
3. **El contador del editor de post muestra un número desnudo** («1806») sin etiqueta;
   se entiende como caracteres restantes sólo por contexto (`PostCard.tsx`).
4. **El texto de las notificaciones se corta a 80 caracteres** y la comilla de cierre
   queda pegada a la palabra partida (`NotificationSerializer.get_post_preview`).
5. **No hay `.gitattributes`.** En Windows con `core.autocrlf=true` el checkout deja
   CRLF y `prettier --check` marca los 80 archivos. En CI (Linux, LF) pasa. Es la causa
   del único fallo local de la tabla de estado.

---

## 6. Preguntas para Jonás

1. **¿Qué URL quieres publicar como repositorio?** La del portafolio apunta a
   `Network-3.0`, que hoy sólo resuelve por redirección. ¿Cambiamos a
   `cs50w-network`, o prefieres renombrar el repo en GitHub para que la URL bonita sea
   la real?
2. **¿La demo de Railway es permanente?** Hoy responde, pero si es un plan de prueba
   conviene saber cuánto durará antes de enlazarla desde el portafolio como demo viva.
3. **¿Quieres que la demo pública siga mostrando cuentas con nombres de personas
   reales?** El `seed` del repositorio crea `ada`, `grace`, `linus`, `margaret`, `alan`,
   `katherine`, `tim` y `hedy` — figuras históricas reales. Para las capturas se sembró
   un elenco ficticio aparte; la demo desplegada sigue usando el elenco real.
4. **¿Publicamos la contraseña de las cuentas demo en el portafolio?** El README del
   repo la muestra (`network123`) y la pantalla de login trae un ayudante con las
   cuentas. En las capturas se desactivó con el flag documentado
   `VITE_SHOW_DEMO_ACCOUNTS=0`. Dime si la prefieres visible.
5. **¿Cuánto tiempo real dedicaste?** No hay forma de deducirlo del repositorio: los
   19 commits se concentran en 3 días (2024-05-05, 2026-06-12, 2026-09-25/26), lo que
   casi seguro no refleja el trabajo real. Sin ese dato no puedo poner nada de duración.
6. **¿Hubo usuarios o feedback real?** No hay analítica, ni issues, ni estrellas. Si
   alguien lo probó y te dijo algo, es material de caso que no está en el código.
7. **¿Quieres contar que parte del desarrollo fue asistido por IA?** Varios commits
   llevan `Co-Authored-By: Claude`. Es tu decisión contarlo o no; sólo lo señalo para
   que no te pille por sorpresa si un reclutador mira el historial.
8. **¿El proyecto sigue vivo?** ¿Hay algo planeado después de 3.1.0, o la ficha debe
   presentarlo como terminado?
