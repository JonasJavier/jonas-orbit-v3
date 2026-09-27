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
| Demo de producción (web) | **viva y permanente**, HTTP 200 | `curl https://web-production-9475c.up.railway.app` · permanencia confirmada por Jonás |
| Demo de producción (API) | **viva**, `{"status":"ok","version":"3.1.0","checks":{"database":"ok","cache":"ok"}}` | `curl .../health/` |
| Swagger en producción | HTTP 200 | `curl .../api/docs/` |
| Repositorio público | sí, GPL-3.0, 0 estrellas | `gh repo view` |
| Placeholders / «TODO» en el código | **ninguno** | `grep -rniE "TODO\|FIXME\|coming soon\|not implemented"` sobre `backend/apps`, `backend/config`, `frontend/src` |

---

## 3. Índice de la carpeta

| Archivo | Qué contiene |
| --- | --- |
| `README.md` | este documento: fecha, estado, correcciones, decisiones tomadas |
| `overview.md` | qué es el proyecto, qué problema técnico resuelve, estado real |
| `case-notes.md` | notas factuales para que redactes el caso (contexto, decisiones, desafíos) |
| `features.md` | las 34 funciones y pantallas, una por una, con veredicto de publicable |
| `stack.md` | todas las tecnologías con versión exacta y archivo de evidencia |
| `excluded.md` | lo que queda fuera y por qué |
| `cv-notes.md` | viñetas de CV en ES y EN + línea de tecnologías |
| `metrics.md` | sólo cifras comprobables, con el comando que las produce |
| `design-decisions.md` | 6 pares problema → decisión, cada uno con su captura |
| `architecture/` | `system-overview.md`, `data-flow.md`, `diagrams/*.mmd`, `nodes.yaml` |
| `screenshots/raw/` | las 78 capturas (75 del run principal + 3 variantes de acceso) |
| `screenshots/principales/` | las 77 que pasan el filtro de calidad, en orden narrativo |
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
| 3 | `links: https://github.com/JonasJavier/Network-3.0` | El repositorio canónico es **`cs50w-network`**; la URL publicada sólo funciona por la redirección 301 que GitHub deja tras renombrar. **Decisión: cambiar el enlace a `cs50w-network`** (ver §6) | `curl -L` → `.../cs50w-network`, `gh repo view` |
| 4 | `technologies: [React, TypeScript, Django, DRF, PostgreSQL, Redis]` | Faltan piezas centrales: **Vite, Tailwind CSS 4, TanStack Query, Zustand, React Router 7, SimpleJWT, drf-spectacular, Pillow, Docker, nginx, Gunicorn, WhiteNoise** | `stack.md` |
| 5 | `highlights` y `summary` describen feed, imagen, likes, comentarios, perfiles, seguimiento, búsqueda y notificaciones | **No se menciona nada de**: reposts y citas, marcadores, hashtags con trending, @menciones, modo oscuro, PWA, pestaña de medios, pestaña de likes, lista de «a quién seguir», cambio de contraseña, borrado de cuenta, documentación OpenAPI | `features.md`, `CHANGELOG.md` |
| 6 | `statusLabel: Listo para producción` | Correcto **pero incompleto**: hoy además está *efectivamente desplegado*, con CI verde y health-check | §2 |
| 7 | «El feed usa paginación por cursor» | Correcto. Matiz: la paginación por cursor es sólo para timelines (`TimelineCursorPagination`); listas acotadas (personas, comentarios) usan paginación por número de página | `backend/apps/core/pagination.py` |
| 8 | Las 4 capturas publicadas | Se rehacen **todas**. Las actuales son de 2026-08-03 y muestran un conjunto de datos anterior; además el set nuevo cubre 35 pantallas en vez de 4 | `screenshots/` |
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

## 6. Decisiones tomadas (2026-09-26)

Respuestas de Jonás a las preguntas abiertas. Todo el material de esta carpeta ya
está actualizado en consecuencia.

| # | Pregunta | Decisión | Qué implicó |
| --- | --- | --- | --- |
| 1 | URL del repositorio | **Publicar `cs50w-network`**, sin renombrar | Ver el razonamiento debajo |
| 2 | ¿La demo de Railway es permanente? | **Sí** | Se puede enlazar como demo viva sin advertencias |
| 3 | ¿La demo pública mantiene cuentas con nombres reales? | **Sí** | La demo desplegada sigue con `ada`, `grace`, `linus`… Las capturas del portafolio siguen usando el elenco ficticio |
| 4 | ¿Publicamos la contraseña demo? | **Sí** | Se añadieron las capturas **76, 77 y 78** con el ayudante de cuentas demo visible, y las credenciales se documentan debajo |
| 5 | Tiempo dedicado | **Un par de semanas** | Recogido en `case-notes.md` §1 y disponible para `cv-notes.md` |
| 6 | ¿Usuarios o feedback real? | **No hay** | Confirma lo que ya decía `metrics.md`: cero cifras de uso |
| 7 | ¿Mencionar asistencia de IA? | **No** | No se menciona en ningún material destinado a publicación |
| 8 | ¿El proyecto sigue vivo tras 3.1.0? | **sin respuesta** | Ver §7 |

### Razonamiento de la decisión 1

Delegaste la elección, así que: **publicar `https://github.com/JonasJavier/cs50w-network`
tal cual, sin renombrar el repositorio.** Motivos:

- Es la URL canónica. La que publica hoy el portafolio (`Network-3.0`) sólo llega por
  una redirección 301, y un enlace de portafolio que rebota es peor que uno directo.
- El nombre está incrustado en sitios que yo no debo tocar: la insignia de CI del
  README, el enlace «Source» de la barra lateral de la propia aplicación
  (`frontend/src/components/layout/SidebarRight.tsx`) y los enlaces de `docs/`.
  Renombrar dejaría todos esos apuntando a una redirección.
- Renombrar es además una acción sobre tu cuenta de GitHub con efectos fuera de aquí
  (integración con Railway incluida); no es algo que deba hacer yo por iniciativa
  propia.

**Si más adelante prefieres renombrarlo** (a `network` o `network-3.0`, para que el
nombre no grite «trabajo de curso»), hay que actualizar tres sitios en el repositorio
después del renombrado:

1. `README.md` — insignia de CI y todos los enlaces `github.com/JonasJavier/cs50w-network`.
2. `frontend/src/components/layout/SidebarRight.tsx` — el enlace «Source» del pie.
3. `docs/*.md` — enlaces al repositorio.

El contrapeso al nombre lo pone el propio contenido: el README ya reencuadra el
proyecto («*designed to read like a real product, not a homework assignment*») y
`case-notes.md` §2 separa con evidencia qué pedía el enunciado y qué no.

### Credenciales de la demo pública (decisión 4)

Para poner junto al enlace de la demo en la ficha:

> **Demo**: https://web-production-9475c.up.railway.app
> Entra con `ada`, `grace`, `linus`, `margaret`, `alan`, `katherine`, `tim` o `hedy`.
> Contraseña para todas: `network123`. También puedes crear tu propia cuenta.

La pantalla de acceso ofrece además cuatro de esas cuentas con un solo clic; es lo que
muestran las capturas 76–78.

> **Ojo con una incoherencia deliberada**: las capturas del portafolio usan un elenco
> ficticio (Mira Kessel, Tobi Okonkwo…) y la demo pública usa el elenco real
> (Ada Lovelace, Grace Hopper…). Quien pase de las capturas a la demo verá nombres
> distintos. Es el precio de mantener la regla de privacidad en las imágenes y, a la
> vez, dejar la demo como está. Si te molesta, la salida limpia es ejecutar
> `scripts/seed_portfolio_demo.py` también contra la base de datos de Railway.

---

## 7. Lo único que sigue abierto

**¿El proyecto sigue vivo después de 3.1.0?** Es la pregunta 8, que quedó sin
responder.

Mientras no digas otra cosa, el material está redactado de forma neutra: presenta
Network como **terminado y en funcionamiento en la versión 3.1.0**, sin prometer
continuidad ni declararlo abandonado. Si hay algo planeado, dímelo y añado una línea
de «próximos pasos» en `overview.md` y en `case-notes.md` §8.
