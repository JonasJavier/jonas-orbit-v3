# Network — stack completo

Todas las versiones son las **fijadas en el repositorio** (`requirements.txt` y
`package-lock.json`), no las que casualmente hubiera instaladas. Donde la instalación
local difiere, se indica.

Etiquetas: **comprobado** en todas las filas (cada una trae su archivo de evidencia).

---

## Lenguajes

| Tecnología | Versión | Evidencia |
| --- | --- | --- |
| Python | 3.13 (CI) · 3.12+ requerido · **3.14.5 en el `.venv` local** | `.github/workflows/ci.yml`, `README.md`, `python --version` |
| TypeScript | 6.0.3 | `frontend/package-lock.json` |
| JavaScript (ESM) | Node ≥ 20 declarado · **22 en CI** · 24.16.0 en local | `frontend/package.json:engines`, `ci.yml` |
| SQL | dialecto PostgreSQL 17 / SQLite 3 | `docker-compose.yml`, `backend/config/settings.py` |
| HTML / CSS | — | `frontend/index.html`, `frontend/src/index.css` |

---

## Frontend

| Tecnología | Versión | Para qué | Evidencia |
| --- | --- | --- | --- |
| React | 19.2.7 | biblioteca de UI | `package-lock.json` |
| React DOM | 19.2.7 | renderizado | `package-lock.json` |
| Vite | 8.0.16 | bundler y servidor de desarrollo | `package-lock.json`, `vite.config.ts` |
| `@vitejs/plugin-react` | 6.0.2 | Fast Refresh | `package-lock.json` |
| React Router | 7.18.4 | enrutado del SPA, rutas `lazy()` | `package-lock.json`, `src/App.tsx` |

---

## UI y estilos

| Tecnología | Versión | Para qué | Evidencia |
| --- | --- | --- | --- |
| Tailwind CSS | 4.3.1 | sistema de estilos | `package-lock.json`, `src/index.css` |
| `@tailwindcss/vite` | 4.3.1 | integración con Vite (sin PostCSS) | `package-lock.json`, `vite.config.ts` |
| lucide-react | 1.18.0 | iconografía | `package-lock.json` |
| `@fontsource-variable/inter` | 5.3.0 | tipografía Inter **auto-alojada** (sin peticiones a terceros) | `package-lock.json` |
| clsx | 2.1.1 | composición de clases | `package-lock.json`, `src/lib/utils.ts` |
| `prettier-plugin-tailwindcss` | 0.8.1 | orden canónico de clases | `package-lock.json`, `.prettierrc` |

---

## Estado y datos (cliente)

| Tecnología | Versión | Para qué | Evidencia |
| --- | --- | --- | --- |
| TanStack Query | 5.101.0 | estado de servidor, caché, scroll infinito, actualizaciones optimistas | `package-lock.json`, `src/hooks/` |
| Zustand | 5.0.14 | estado de cliente (sesión, tema, avisos) con `persist` | `package-lock.json`, `src/stores/` |
| Axios | 1.20.0 | cliente HTTP con interceptores de token y refresco | `package-lock.json`, `src/lib/api.ts` |

---

## Backend y API

| Tecnología | Versión | Para qué | Evidencia |
| --- | --- | --- | --- |
| Django | 6.0.7 *(instalado local: 6.0.6)* | framework web | `backend/requirements.txt` |
| Django REST Framework | 3.17.2 *(local: 3.17.1)* | capa de API | `requirements.txt` |
| drf-spectacular | 0.29.0 | esquema OpenAPI 3, Swagger, ReDoc | `requirements.txt`, `config/urls.py` |
| django-filter | 25.2 | backend de filtrado de DRF | `requirements.txt`, `settings.py` |
| django-cors-headers | 4.9.0 | CORS para el SPA | `requirements.txt` |
| Pillow | 12.3.0 *(local: 12.2.0)* | validación y procesado de imágenes | `requirements.txt`, `apps/core/images.py` |
| Gunicorn | 26.0.0 | servidor WSGI en producción | `requirements.txt`, `backend/Dockerfile` |
| WhiteNoise | 6.12.0 | estáticos servidos por la app | `requirements.txt`, `settings.py` |
| python-dotenv | 1.2.2 | carga de `.env` | `requirements.txt`, `settings.py` |

---

## Autenticación

| Tecnología | Versión | Para qué | Evidencia |
| --- | --- | --- | --- |
| djangorestframework-simplejwt | 5.5.1 | JWT de acceso y refresco | `requirements.txt`, `settings.py:SIMPLE_JWT` |
| `token_blacklist` (app de SimpleJWT) | — | lista negra tras rotación y al cerrar sesión | `settings.py:INSTALLED_APPS` |
| Backend propio `EmailOrUsernameBackend` | — | login con usuario o email | `apps/users/backends.py` |
| Validadores de contraseña de Django | — | similitud, longitud ≥ 8, comunes, sólo numéricas | `settings.py:AUTH_PASSWORD_VALIDATORS` |

---

## Base de datos y caché

| Tecnología | Versión | Para qué | Evidencia |
| --- | --- | --- | --- |
| PostgreSQL | **17-alpine** | base de datos de producción y del stack Compose | `docker-compose.yml` |
| SQLite | 3 (de Python) | base de datos por defecto en desarrollo | `settings.py` |
| psycopg (binary) | 3.3.4 | driver de PostgreSQL | `requirements.txt` |
| dj-database-url | 3.1.2 | `DATABASE_URL` → configuración de Django | `requirements.txt`, `settings.py` |
| Redis | **8-alpine** | caché de trending y de sugerencias | `docker-compose.yml` |
| django-redis | 7.0.0 | backend de caché, con `IGNORE_EXCEPTIONS` | `requirements.txt`, `settings.py` |
| redis (cliente Python) | 8.0.0 | — | `requirements.txt` |
| `LocMemCache` | — | fallback cuando no hay `REDIS_URL` | `settings.py` |
| django-storages\[s3\] | 1.14.6 | almacenamiento S3-compatible **opcional** | `requirements.txt`, `settings.py` |

---

## Infraestructura y contenedores

| Tecnología | Versión | Para qué | Evidencia |
| --- | --- | --- | --- |
| Docker | multi-stage, dos imágenes | API y web | `backend/Dockerfile`, `frontend/Dockerfile` |
| Docker Compose | servicios `db`, `redis`, `api`, `web` | stack local tipo producción | `docker-compose.yml` |
| nginx | imagen base del contenedor web | sirve el SPA, cabeceras de seguridad y **CSP**, gzip, fallback SPA | `frontend/nginx.conf.template` |
| Railway | configuración como código | plataforma de despliegue actual | `backend/railway.json`, `frontend/railway.json`, `docs/deployment-railway.md` |
| Health checks | `pg_isready`, `redis-cli ping`, `/health/`, `/healthz` | arranque ordenado y sondas de la plataforma | `docker-compose.yml`, `apps/core/views.py`, `nginx.conf.template` |
| Sentry SDK | 2.70.0 | monitorización de errores **opcional** (`SENTRY_DSN`) | `requirements.txt`, `settings.py` |

---

## Testing y calidad

| Tecnología | Versión | Para qué | Evidencia |
| --- | --- | --- | --- |
| Test runner de Django | integrado | 98 pruebas de backend | `logs/backend-tests.txt` |
| Vitest | 5.0.2 | 34 pruebas de frontend, 7 archivos | `package-lock.json`, `logs/frontend-tests.txt` |
| `@testing-library/react` | 16.3.3 | pruebas de componentes | `package-lock.json` |
| `@testing-library/jest-dom` | 7.0.1 | matchers de DOM | `package-lock.json` |
| `@testing-library/user-event` | 14.6.7 | simulación de interacción | `package-lock.json` |
| jsdom | 30.1.1 | entorno DOM de las pruebas | `package-lock.json` |
| `@vitest/coverage-v8` | 5.0.2 | cobertura (`npm run test:coverage`) | `package-lock.json` |
| ruff | 0.16.9 | linter y formateador de Python **(no instalado en el `.venv` local)** | `backend/requirements-dev.txt` |
| ESLint | 10.5.0 | linter de JS/TS | `package-lock.json`, `eslint.config.js` |
| typescript-eslint | 8.61.0 | reglas con tipos | `package-lock.json` |
| `eslint-plugin-react-hooks` | 7.1.1 | reglas de hooks | `package-lock.json` |
| `eslint-plugin-react-refresh` | 0.5.2 | reglas de Fast Refresh | `package-lock.json` |
| Prettier | 3.9.9 | formateo | `package-lock.json`, `.prettierrc` |
| GitHub Actions | 3 jobs (backend, frontend, docker) | CI en cada push y PR | `.github/workflows/ci.yml` |

---

## Herramientas

| Tecnología | Para qué | Evidencia |
| --- | --- | --- |
| Make | atajos de desarrollo (`make help`) | `Makefile` |
| EditorConfig | estilo homogéneo entre editores | `.editorconfig` |
| Plantillas de issue y PR | higiene del repositorio | `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md` |
| Keep a Changelog | formato del changelog | `CHANGELOG.md` |
| `manage.py seed` | datos demo idempotentes generados con Pillow | `apps/core/management/commands/seed.py` |
| Playwright | *sólo para este material de portafolio*, no del proyecto | `scripts/capture.mjs` |

---

## Línea de tecnologías para la ficha

Versión larga:

> React · TypeScript · Vite · Tailwind CSS · TanStack Query · Zustand · React Router ·
> Django · Django REST Framework · SimpleJWT · drf-spectacular · Pillow · PostgreSQL ·
> Redis · Docker · nginx · Gunicorn · GitHub Actions

Versión corta (6, como el `technologies:` actual del MDX):

> React · TypeScript · Django REST Framework · PostgreSQL · Redis · Docker
