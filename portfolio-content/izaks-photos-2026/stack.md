# Stack

Versiones exactas del código capturado (`38b4f3de` + sesión del 25-09-2026). El frontend tiene lockfile, así que sus versiones son las que instala `npm ci`. El backend **no** tiene lockfile: `requirements.txt` fija rangos y la versión exacta de producción no se puede ver desde fuera. Se indica el rango y la versión resuelta hoy en local.

## Lenguajes

| Tecnología | Versión | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| JavaScript (ES modules, JSX) | ES2020+ (`"type": "module"`) | `frontend/package.json` | comprobado |
| Python | Local 3.12.10 · CI 3.13 · README pide ≥ 3.11 · producción: la decide Railpack | `.github/workflows/ci.yml`, `package.json` (`engines`) | comprobado (producción: pendiente) |
| CSS | CSS propio, un solo archivo de 1.301 líneas | `frontend/src/Home.css` | comprobado |
| HTML | `index.html` de Vite + plantilla que Django sirve | `frontend/index.html` | comprobado |

## Frontend

| Tecnología | Versión | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| React / React DOM | 18.3.1 | `frontend/package-lock.json` | comprobado |
| React Router (`react-router-dom`) | 7.18.4 | `package-lock.json` | comprobado |
| Vite | 8.3.1 | `package-lock.json`; salida de `vite build` | comprobado |
| `@vitejs/plugin-react` | 6.1.1 | `package-lock.json` | comprobado |
| `import.meta.glob` (Vite) para resolver las fotos por nombre | — | `frontend/src/data/portfolio.js` | comprobado |

## UI y estilos

| Tecnología | Versión | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| CSS propio con variables (sin framework) | — | `Home.css` (`:root`) | comprobado |
| Google Fonts: Fraunces (títulos) y DM Sans (texto) | Servidas por CDN | `frontend/index.html` | comprobado |
| lucide-react (iconos) | 0.468.0 | `package-lock.json` | comprobado |
| Animaciones con `IntersectionObserver` que respetan `prefers-reduced-motion` | — | `components/Reveal.jsx` | comprobado |

## Estado y datos

| Tecnología | Uso | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| React state + Context | Idioma (`LanguageProvider`, `t()`) | `i18n.jsx` | comprobado |
| Parámetros de URL (React Router `useSearchParams`) | Categoría y foto abierta de la galería | `ProjectGallery.jsx` | comprobado |
| `localStorage` | Idioma elegido (`izak-lang`) | `i18n.jsx` | comprobado |
| Datos estáticos en un módulo | Fotos, servicios, testimonios y textos bilingües | `data/portfolio.js` | comprobado |
| `fetch` nativo | `POST /api/contact/` (`VITE_API_URL` o `/api`) | `BookingForm.jsx` | comprobado |

## Backend y API

| Tecnología | Rango en `requirements.txt` | Resuelta hoy (local) | Evidencia | Etiqueta |
| --- | --- | --- | --- | --- |
| Django | `>=5.0,<6.0` | 5.2.17 (la migración `0002` la generó 5.2.15) | `requirements.txt`, `pip freeze`, cabecera de `0002_…py` | comprobado |
| Django REST Framework | `>=3.15,<4.0` | 3.18.1 | ídem | comprobado |
| django-cors-headers | `>=4.3,<5.0` | 4.9.0 | ídem | comprobado |
| python-dotenv | `>=1.0,<2.0` | 1.2.3 | ídem | comprobado |
| Gunicorn | `>=22.0,<24.0` | 23.0.0 | ídem; `railway.toml` (`startCommand`) | comprobado |
| Throttling de DRF (`AnonRateThrottle`) | — | — | `views.py` (`ContactRateThrottle`) | comprobado |

## Base de datos y almacenamiento de imágenes

| Tecnología | Versión | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| SQLite | la de Python (por defecto, en local) | `settings.py` | comprobado |
| PostgreSQL vía `DATABASE_URL` + dj-database-url + psycopg2-binary | `>=2.2,<3.0` → 2.3.0 · `>=2.9,<3.0` → 2.9.13 | `settings.py`, `requirements.txt` | comprobado (que producción lo use: pendiente) |
| WhiteNoise (`CompressedManifestStaticFilesStorage`) | `>=6.7,<7.0` → 6.12.0 | `settings.py` | comprobado |
| Fotos como archivos del bundle | 43 JPEG (8.986 KB) + 43 WebP de 720 px (2.372 KB), con nombre con hash de Vite | `frontend/src/images/` | comprobado |
| Sin almacenamiento de medios subidos | No hay `MEDIA_ROOT` ni `ImageField` | `settings.py`, `models.py` | comprobado |

## Integraciones

| Integración | Detalle | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| Google Fonts | Única dependencia externa en tiempo de ejecución | `index.html` | comprobado |
| Correo, pagos, mapas, analítica, redes | No hay ninguna. El enlace genérico a Instagram y el `mailto:` a un dominio inexistente se retiraron en esta sesión | búsqueda en `src/` y `settings.py` | comprobado |

## Infraestructura y despliegue

| Tecnología | Detalle | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| Railway | Un servicio; builder **Railpack**; `preDeployCommand` = `migrate`; healthcheck `/api/health/`; reinicio `ON_FAILURE` (10 intentos) | `railway.toml`; cabeceras `railway-hikari` / `x-railway-edge` | comprobado |
| Nixpacks | Hay un `nixpacks.toml` (Python 3.11, Node 20), pero el builder declarado es Railpack | `nixpacks.toml`, `railway.toml` | inferencia: no se usa (Pregunta 11) |
| Dominio | `izaksphotos.jonasjavier.dev` (también en `ALLOWED_HOSTS`, CORS y CSRF) | `settings.py`; `curl` | comprobado |
| GitHub Actions | Job `backend` (Python 3.13, `manage.py test api`) y job `frontend` (Node 20, `npm ci` + build) | `.github/workflows/ci.yml`; run en verde para `38b4f3de` | comprobado |

## Testing y calidad

| Herramienta | Detalle | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| Django `TestCase` | 9 pruebas de la API y del modelo, todas en verde con DEBUG en `true` y en `false` | `backend/api/tests.py`; `manage.py test api` | comprobado |
| Pruebas del frontend | No hay | `package.json` sin `test` | comprobado |
| Linter | Hay un `.eslintrc.cjs`, pero `eslint` no está instalado ni hay script `lint` | `frontend/.eslintrc.cjs`, `package.json` | comprobado |
| `.editorconfig` | UTF-8, LF | `.editorconfig` | comprobado |

## Herramientas

| Herramienta | Versión | Uso | Etiqueta |
| --- | --- | --- | --- |
| npm | 11.13.0 (local) | `npm ci`, build | comprobado |
| Node | 24.16.0 local · 20 en CI | build | comprobado |
| Pillow | 12.3.0 (sólo en desarrollo, no está en `requirements.txt`) | `scripts/optimize_images.py` | comprobado |
| Playwright | 1.61.1 (de jonas-orbit-v3, **no** forma parte del repo) | Sólo para estas capturas | comprobado |

## Línea para el CV

React 18 · Vite 8 · React Router 7 · CSS propio · Django 5.2 · Django REST Framework · WhiteNoise · Gunicorn · Railway · GitHub Actions
