# Métricas comprobables

Sólo cifras que se pueden reproducir desde el repo (commit `9f134109`) o desde producción el 25-09-2026. No hay métricas de negocio (ventas, visitas, conversión): no existe analítica ni evidencia.

| Cifra | Valor | Cómo se obtuvo |
| --- | --- | --- |
| Pruebas automatizadas | **18, todas en verde** (shop 7 · backend 5 · contact 4 · accounts 2) | `python manage.py test` → `Ran 18 tests … OK` |
| `manage.py check` / migraciones pendientes | 0 problemas / ninguna | `manage.py check`; `makemigrations --check --dry-run` |
| Lint del frontend | 0 errores | `npm run lint` |
| Endpoints de la API | 5: `GET /api/health/`, `GET /api/products/`, `GET /api/products/<slug>/`, `POST /api/contact/`, `POST /api/newsletter/` | `backend/*/urls.py` |
| Rutas adicionales | `/admin/`, `/media/…` y el build de React en `/` | `backend/backend/urls.py`, `settings.py` |
| Modelos de datos | 4: `Product`, `ContactMessage`, `NewsletterSubscription`, `CustomUser` | `*/models.py` |
| Migraciones | 16 | `git ls-files 'backend/*/migrations/0*.py'` |
| Modelos retirados de la versión 2024 | 4: `Cart`, `CartItem`, `Review`, `UserProfile` | `shop/0006…`, `accounts/0005…` |
| Componentes React | 6 (`App`, `Header`, `ProductGrid`, `ProductModal`, `CartDrawer`, `Footer`) + 8 íconos SVG + 1 hook (`useCart`) | `frontend/src/` |
| Secciones de la tienda | 9 (portada, valores, colección, historia, proceso, cita, preguntas, contacto, pie) + 3 capas (menú móvil, ficha, carrito) | `App.jsx` |
| Categorías de producto | 6 | `shop/models.py` (`Product.Category`) |
| Productos demo (y en producción hoy) | 10 | `seed_products.py`; `/api/products/` → `count: 10` |
| Dependencias de ejecución del frontend | 2 (`react`, `react-dom`) · eran 30 en 2024 | `package.json` actual y de `44f824fb` |
| Modelos 2024 → 2026 | 8 → 4 | `models.py` de `44f824fb` y actuales |
| Dependencias Python fijadas | 9 | `requirements.txt` |
| JavaScript de producción | 221.680 B · **68.470 B con gzip** | build `index-D1NGOVrl.js`, `gzip -c \| wc -c` |
| CSS de producción | 26.264 B · 6.062 B con gzip | build `index-U5ue34mc.css` |
| Líneas de código fuente | ≈ 2.595 (backend Python sin migraciones 1.230, incl. 227 de pruebas · `frontend/src` 1.365) | `wc -l` sobre `git ls-files` |
| Límites de frecuencia | 10 mensajes/h · 5 suscripciones/h · 1.000 peticiones/h por visitante | `settings.py` `DEFAULT_THROTTLE_RATES` |
| Tamaño máximo de imagen del catálogo | 5 MB (JPG, PNG, WebP) | `shop/models.py` |
| Commits | 26 (15 en 2024 · 11 en 2026) | `git rev-list --count HEAD` |
| Fechas | primer commit 29-08-2024 · reconstrucción 01-08-2026 · despliegue 25-09-2026 | `git log` |
| Producción | 200 en `/`, `/api/health/`, `/api/products/` | `curl` 25-09-2026 22:31 (UTC−4) |
| Capturas | 56 en raw · 42 publicables | `screenshots/` |

## Propuesta para la tarjeta

1. **18 · pruebas automatizadas en verde**
2. **0 · cuentas necesarias para comprar**
3. **68 KB · de JavaScript con gzip**
