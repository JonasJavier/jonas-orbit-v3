# Vista de sistema

Commit `9f134109`. Diagrama: [diagrams/system.mmd](diagrams/system.mmd) · despliegue: [diagrams/deploy.mmd](diagrams/deploy.mmd) · nodos para el portafolio: [nodes.yaml](nodes.yaml).

## Piezas

| Pieza | Qué es | Evidencia |
| --- | --- | --- |
| Tienda | SPA de una sola página en React 19 (secciones con anclas, sin router). Estado del carrito en `useReducer` + `localStorage`. | `frontend/src/App.jsx`, `hooks/useCart.js` |
| API | DRF: `GET /api/products/` (paginada, filtros `category`, `featured`, `search`, `page_size` ≤ 100), `GET /api/products/<slug>/`, `POST /api/contact/`, `POST /api/newsletter/`, `GET /api/health/`. | `backend/*/urls.py` |
| Admin | Django Admin para productos, mensajes, suscripciones y usuarios del equipo. | `*/admin.py` |
| Apps Django | `shop` (catálogo, API, admin, `seed_products`), `contact` (mensajes y boletín), `accounts` (usuario por correo), `backend` (configuración, salud, media, cabeceras). | `backend/` |
| Servidor | gunicorn con workers gthread; WhiteNoise sirve el build de React en `/` y los estáticos del admin, comprimidos con gzip y con caché inmutable para archivos con hash. | `gunicorn.conf.py`, `settings.py` |
| Datos | PostgreSQL en producción (`DATABASE_URL`), SQLite en desarrollo. | `settings.py` |
| Fotos | `MEDIA_ROOT` en el volumen de Railway (`/data/media`), servido por Django con caché de 7 días. | `settings.py`, `backend/views.py` |
| WhatsApp | Enlace `wa.me/<número>?text=<pedido>`; no hay integración con su API. | `config.js` |

## En desarrollo y en producción

- **Desarrollo:** Vite en `:5173` hace de proxy de `/api` y `/media` hacia Django en `:8000`. (C: `vite.config.js`)
- **Producción:** una imagen Docker multietapa; Django sirve tienda, API, admin y fotos desde el mismo dominio. No se necesita CORS. (C: `Dockerfile`)
- **Railway:** PostgreSQL por red privada, volumen `/data`, migraciones *pre-deploy*, healthcheck con base de datos, despliegue automático desde `main` y dominio `delicate.jonasjavier.dev`. (C: `docs/DEPLOY_RAILWAY.md`)

## Seguridad (configuración, sin pantalla)

- `DEBUG=False` por defecto en la imagen; Django no arranca con la clave de desarrollo ni con un `MEDIA_ROOT` relativo. (C: `Dockerfile`, `settings.py`)
- CSP, Permissions-Policy y X-Frame-Options en todas las respuestas, también en las que sirve WhiteNoise. (C: `backend/middleware.py`)
- HTTPS obligatorio, HSTS de 1 año, cookies seguras; el healthcheck queda exento de la redirección. (C: `settings.py`)
- Límites de frecuencia (1.000/h general, 10/h contacto, 5/h boletín) contando la IP real detrás del proxy (`NUM_PROXIES`). (C: `settings.py`)
- Imágenes del catálogo validadas por extensión y peso (5 MB). (C: `shop/models.py`)
