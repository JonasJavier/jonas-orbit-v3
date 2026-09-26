# Stack

Versiones exactas del commit `9f134109`. Frontend: `frontend/package-lock.json`. Backend: `backend/requirements.txt` (versiones fijadas con `==`).

## Lenguajes

| Tecnología | Versión | Evidencia |
| --- | --- | --- |
| Python | 3.13 en producción (`python:3.13-slim`) · 3.14.5 en local | `Dockerfile`; `.venv` |
| JavaScript (ES módulos, JSX) | — | `frontend/package.json` (`"type": "module"`) |
| CSS | — | `frontend/src/styles.css` |
| HTML | — | `frontend/index.html` |

## Frontend

| Tecnología | Versión | Evidencia |
| --- | --- | --- |
| React | 19.2.8 | `package-lock.json` |
| React DOM | 19.2.8 | `package-lock.json` |
| Vite | 8.2.0 (empaqueta con Rolldown 1.2.1) | `package-lock.json` |
| @vitejs/plugin-react | 6.0.5 | `package-lock.json` |
| Node.js | ≥ 22.12.0 requerido · 24 en la imagen de build (`node:24-alpine`) | `package.json` `engines`; `Dockerfile` |

## UI y estilos

| Tecnología | Versión | Evidencia |
| --- | --- | --- |
| CSS propio (330 líneas), sin framework ni librería de componentes | — | `styles.css`; `package.json` sólo tiene `react` y `react-dom` como dependencias |
| Lightning CSS (minificado vía Vite) | 1.33.0 | `package-lock.json` |
| Tipografía | Georgia/serif del sistema y sans del sistema; no se descargan fuentes web | `styles.css` (`--serif`, `font-family`) |
| Íconos | 8 SVG en línea | `components/Icons.jsx` |
| Diálogo nativo `<dialog>` | API del navegador | `ProductModal.jsx` |

## Estado y datos (cliente)

| Tecnología | Versión | Evidencia |
| --- | --- | --- |
| `useReducer` + hook propio `useCart` | React 19.2.8 | `hooks/useCart.js` |
| `localStorage` (clave `delicate-cart-v4`) | API del navegador | `useCart.js` |
| `fetch` con `AbortController` y paginación | API del navegador | `api.js`, `ProductGrid.jsx` |

## Backend y API

| Tecnología | Versión | Evidencia |
| --- | --- | --- |
| Django | 5.2.16 | `requirements.txt` |
| Django REST Framework | 3.17.1 | `requirements.txt` |
| django-cors-headers | 4.9.0 | `requirements.txt` |
| Pillow (validación de imágenes) | 12.3.0 | `requirements.txt` |
| python-dotenv | 1.2.2 | `requirements.txt` |
| Gunicorn (workers gthread) | 23.0.0 | `requirements.txt`, `backend/gunicorn.conf.py` |
| WhiteNoise (estáticos del admin y build de React, gzip) | 6.12.0 | `requirements.txt`, `settings.py` |
| Django Admin | incluido en Django 5.2.16 | `shop/admin.py`, `contact/admin.py`, `accounts/admin.py` |

## Base de datos

| Tecnología | Versión | Evidencia |
| --- | --- | --- |
| PostgreSQL (producción, plantilla de Railway) | versión del servidor no verificada | `docs/DEPLOY_RAILWAY.md` |
| SQLite (desarrollo y capturas) | la del Python local | `settings.py` (`DJANGO_DB_PATH`) |
| psycopg (binario) | 3.3.4 | `requirements.txt` |
| dj-database-url | 3.1.2 | `requirements.txt` |

## Integraciones

| Tecnología | Versión | Evidencia |
| --- | --- | --- |
| WhatsApp mediante enlace `wa.me` con texto prearmado (sin API de WhatsApp) | — | `config.js` (`whatsappUrl`), `CartDrawer.jsx` |
| Open Graph / Twitter Card para vistas previas | — | `index.html`, `vite.config.js` |

## Infraestructura y despliegue

| Tecnología | Versión | Evidencia |
| --- | --- | --- |
| Docker (build multietapa Node → Python) | Docker 29.4.3 usado para la prueba local | `Dockerfile` |
| Railway (servicio web, PostgreSQL, volumen `/data`, dominio propio, migraciones *pre-deploy*, healthcheck) | Railway CLI 5.23.1 | `railway.json`, `docs/DEPLOY_RAILWAY.md` |
| Dominio `delicate.jonasjavier.dev` (DNS en Name.com, TLS de Railway) | — | `docs/DEPLOY_RAILWAY.md`; `curl` |
| GitHub (despliegue automático desde `main`) | — | `docs/DEPLOY_RAILWAY.md` |

## Testing y calidad

| Tecnología | Versión | Evidencia |
| --- | --- | --- |
| Django test runner + `APITestCase` de DRF | Django 5.2.16 / DRF 3.17.1 | `*/tests.py` (18 pruebas) |
| ESLint | 10.8.0 | `package-lock.json`, `eslint.config.js` |
| @eslint/js | 10.0.1 | `package-lock.json` |
| eslint-plugin-react-hooks | 7.1.1 | `package-lock.json` |
| globals | 16.5.0 | `package-lock.json` |
| `manage.py check --deploy` y `makemigrations --check` | Django 5.2.16 | `README.md` del repo |

## Herramientas

| Tecnología | Versión | Evidencia |
| --- | --- | --- |
| npm | 11.13.0 (local) | `npm --version` |
| Git | 26 commits (29-08-2024 → 25-09-2026) | `git log` |
| GitHub CLI | 2.100.0 (local) | `gh --version` |
| Playwright (sólo para estas capturas, no forma parte del proyecto) | 1.61.1 | `jonas-orbit-v3/node_modules/playwright` |
