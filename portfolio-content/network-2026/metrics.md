# Network — métricas comprobables

Sólo cifras que se pueden reproducir con un comando. **Nada de usuarios, tráfico,
rendimiento medido en producción o impacto de negocio: no existen esos datos.**

Medido el 2026-09-26 sobre el commit `e90c581`.

---

## Código

| Métrica | Valor | Comando |
| --- | --- | --- |
| Líneas de Python de aplicación | **2 857** | `find backend/apps backend/config -name '*.py' -not -path '*/migrations/*' -not -path '*/tests/*' -not -name 'tests.py' \| xargs wc -l` |
| Líneas de pruebas de backend | **992** | `find backend \( -name 'tests.py' -o -path '*/tests/*.py' \) \| xargs wc -l` |
| Líneas de TypeScript/CSS del frontend | **6 732** | `find frontend/src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) \| xargs wc -l` |
| Total aproximado | **~10 600** | suma de las tres |

## Backend

| Métrica | Valor | Comando / archivo |
| --- | --- | --- |
| Modelos de Django | **8** (`User`, `Follow`, `Post`, `PostLike`, `Bookmark`, `Comment`, `Hashtag`, `Notification`) | `grep -hE '^class ' backend/apps/*/models.py` |
| Aplicaciones Django propias | **4** (`core`, `users`, `posts`, `notifications`) | `settings.py:INSTALLED_APPS` |
| Migraciones | **8** | `find backend -path '*/migrations/*.py' -not -name '__init__.py'` |
| Rutas de la API | **28** | `manage.py spectacular` → `len(paths)` |
| Operaciones de la API | **37** | idem, contando métodos HTTP |
| Componentes del esquema OpenAPI | **36** | idem, `components.schemas` |
| Verbos de notificación | **8** | `apps/notifications/models.py:Notification.Verb` |
| Operaciones por dominio | posts 10 · users 10 · comments 6 · auth 5 · notifications 5 · ops 1 | esquema OpenAPI |

## Frontend

| Métrica | Valor | Comando |
| --- | --- | --- |
| Páginas (rutas) | **11** | `find frontend/src/pages -name '*.tsx' -not -name '*.test.tsx'` |
| Componentes | **31** | `find frontend/src/components -name '*.tsx' -not -name '*.test.tsx'` |
| Hooks propios | **11** | `ls frontend/src/hooks` |
| Stores de Zustand | **3** | `ls frontend/src/stores/*.ts` (sin tests) |
| Tamaño del bundle principal | **225,17 kB → 70,19 kB gzip** | `npm run build`, `logs/frontend-quality.txt` |
| CSS | **63,43 kB → 11,04 kB gzip** | idem |
| Tiempo de build | **447 ms** | idem |
| Chunks generados | 20 JS + 1 CSS + 2 fuentes | idem |

## Pruebas y calidad

| Métrica | Valor | Evidencia |
| --- | --- | --- |
| Pruebas de backend | **98, todas en verde** (52,2 s) | `logs/backend-tests.txt` |
| Pruebas de frontend | **34, todas en verde** en 7 archivos (13,0 s) | `logs/frontend-tests.txt` |
| **Total de pruebas** | **132 en verde** | suma |
| ESLint | pasa | `logs/frontend-quality.txt` |
| TypeScript estricto | pasa | idem |
| Build de producción | pasa | idem |
| `prettier --check` | falla en local por finales de línea CRLF de Windows; **pasa en CI** | idem, `README.md` §4 |
| Jobs de CI | **3** (backend, frontend, docker) | `.github/workflows/ci.yml` |
| Último run de CI en `main` | **verde**, 2026-09-26 20:23 UTC | `gh run list` |
| `TODO` / `FIXME` en el código | **0** | `grep -rniE "TODO\|FIXME" backend/apps backend/config frontend/src` |

## Repositorio

| Métrica | Valor | Comando |
| --- | --- | --- |
| Commits | **19** | `git rev-list --count HEAD` |
| Pull requests fusionados | **2** (#8, #9) | `git log` |
| Primer commit | **2024-05-05** | `git log --reverse` |
| Último commit | **2026-09-26** | `git log -1` |
| Días con actividad | **4** (2024-05-05, 2026-06-12, 2026-09-25, 2026-09-26) | `git log --date=short --format=%ad \| sort -u` |
| Visibilidad | **público** | `gh repo view` |
| Licencia | **GPL-3.0** | `gh repo view`, `LICENSE` |
| Estrellas | **0** | `gh repo view` |

## Producción

| Métrica | Valor | Comando |
| --- | --- | --- |
| Web responde | **HTTP 200**, despliegue permanente | `curl -o /dev/null -w '%{http_code}' https://web-production-9475c.up.railway.app` |
| API health | **`{"status":"ok","version":"3.1.0","checks":{"database":"ok","cache":"ok"}}`** | `curl .../health/` |
| Swagger responde | **HTTP 200** | `curl .../api/docs/` |
| Servicios desplegados | **2** (web + API) más PostgreSQL y Redis gestionados | health-check y `docs/deployment-railway.md` |

## Cobertura de este material

| Métrica | Valor |
| --- | --- |
| Funciones documentadas | **48** (35 con captura propia) |
| Capturas totales | **78** en `raw/` |
| Capturas que pasan el filtro | **77** en `principales/` |
| Pantallas distintas cubiertas | **35** |
| Capturas de escritorio (1440×900 @2x) | **52** |
| Capturas de móvil (390×844 @2x) | **26** |
| Capturas en modo oscuro | **12** |

---

## Las 3 propuestas para la tarjeta

Elegidas por ser comprobables de un vistazo, no inflables y representativas de lo que
distingue al proyecto.

| Valor | Etiqueta corta |
| --- | --- |
| **132** | pruebas automatizadas en verde |
| **37** | operaciones de API documentadas |
| **Cursor** | paginación estable del feed |

### Alternativas, por si prefieres otro ángulo

| Valor | Etiqueta corta | Por qué |
| --- | --- | --- |
| **8** | modelos de dominio | habla del modelado, no del volumen |
| **2** | servicios desplegados en producción | subraya que está vivo, no en el cajón |
| **34** | pantallas terminadas | subraya el alcance de producto |
| **JWT** | rotación de refresh y lista negra | subraya el criterio de seguridad |

### Cifras que **no** debes usar

- Cualquier número de usuarios, visitas, descargas o retención: **no existen**
  (confirmado por Jonás: nadie externo lo ha usado).
- Mejoras de rendimiento en porcentaje: no hay mediciones antes/después.
- «98 % de cobertura» o similar: hay pruebas, pero **no se midió la cobertura**.
- Duración deducida del historial de git: los 19 commits caben en 4 días y eso **no**
  es el tiempo de trabajo. El dato real es «alrededor de dos semanas», y viene de
  Jonás, no del repositorio; si lo usas, dilo como aproximación.
- Las cifras que aparecen *dentro* de las capturas (likes, seguidores, publicaciones)
  son datos demo sintéticos y no deben presentarse como métricas de nada.
