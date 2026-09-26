# Vista del sistema

Diagrama: [diagrams/system.mmd](diagrams/system.mmd). Nodos para el portafolio: [nodes.yaml](nodes.yaml). Los 4 diagramas `.mmd` se validaron renderizándolos con Mermaid 11.

## Piezas

| Pieza | Qué es | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| SPA React | 4 rutas públicas + 404 (`/`, `/projects`, `/about`, `/booking`, `*`) con React Router 7; textos bilingües en un módulo de datos | `frontend/src/App.jsx`, `data/portfolio.js` | comprobado |
| Django + WhiteNoise | Sirve `frontend/dist/index.html` como plantilla para cualquier ruta que no sea `api/`, `admin/` ni `static/`, y los archivos del build bajo `/static/` con hash y compresión | `backend/backend/urls.py` (`re_path` final), `settings.py` (`TEMPLATES.DIRS`, `STATICFILES_DIRS`, `STORAGES`) | comprobado |
| API (DRF) | Tres vistas de función: salud, fotos destacadas (lista fija) y contacto | `backend/api/views.py` | comprobado |
| Admin | `BookingInquiryAdmin` con filtros, búsqueda, jerarquía de fechas, `list_editable` y 2 acciones | `backend/api/admin.py` | comprobado |
| Base de datos | Una tabla propia (`api_bookinginquiry`) + las de `auth`/`sessions`/`admin` de Django | `models.py`, migraciones `0001`–`0002` | comprobado |
| Fotos | Archivos importados por Vite: `optimized/*.jpg` (visor, hero) y `thumbs/*.webp` (cuadrículas, tarjetas, avatares) | `portfolio.js` (`import.meta.glob`) | comprobado |
| Railway | Un servicio; build con Railpack; `migrate` antes de publicar; healthcheck `/api/health/` | `railway.toml` | comprobado |
| CI | GitHub Actions en cada push a `main` y en cada PR | `.github/workflows/ci.yml` | comprobado |

## Mismo origen en producción, dos procesos en desarrollo

- **Producción:** el navegador sólo habla con `izaksphotos.jonasjavier.dev`. El formulario llama a `/api/contact/` (sin `VITE_API_URL`), así que no hace falta CORS. — comprobado (`BookingForm.jsx`: `import.meta.env.VITE_API_URL || "/api"`)
- **Desarrollo:** Vite en `:5173` y Django en `:8000` (`scripts/dev.py`); `frontend/.env` apunta `VITE_API_URL` a `:8000` y CORS permite `:5173`. — comprobado (`.env.example`, `settings.py`)
- Consecuencia: el build usa `base: '/static/'` sólo al compilar, para que WhiteNoise encuentre los archivos. — comprobado (`vite.config.js`)

## Seguridad

| Medida | Evidencia | Etiqueta |
| --- | --- | --- |
| `ALLOWED_HOSTS`, CORS y `CSRF_TRUSTED_ORIGINS` con lista blanca (dominio propio y `*.railway.app`) | `settings.py` | comprobado |
| `SECURE_PROXY_SSL_HEADER` detrás del proxy de Railway | `settings.py` | comprobado |
| Cookies de sesión y CSRF `Secure` y API navegable desactivada fuera de DEBUG (nuevo) | `settings.py` | comprobado |
| Límite de 10 solicitudes/h por cliente en `/api/contact/` y campo trampa (nuevo) | `views.py`, `tests.py` | comprobado |
| `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `COOP: same-origin` | `curl -I` a producción | comprobado |
| Sin redirección HTTPS forzada en Django (Railway termina TLS) | `settings.py`; comentario del código | comprobado |
| Sin CSP | No hay cabecera `Content-Security-Policy` | comprobado |

## Lo que no hay

Cuentas de usuario públicas, subida de fotos, correo saliente, pagos, analítica, caché compartida (el límite de envíos usa la caché en memoria de cada proceso de Gunicorn) ni pruebas del frontend. — comprobado
