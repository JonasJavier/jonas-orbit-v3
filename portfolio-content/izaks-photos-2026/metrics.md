# Métricas comprobables

Sólo cifras reproducibles desde el repo (`38b4f3de` + sesión del 25-09-2026) o medidas hoy. No hay métricas de negocio (visitas, reservas, conversión): no existe analítica ni acceso a los datos de producción.

| Cifra | Valor | Cómo se obtuvo |
| --- | --- | --- |
| Pruebas automatizadas | **9, todas en verde** (antes 4) | `manage.py test api` → `Ran 9 tests … OK`, con DEBUG en `true` y en `false` |
| Migraciones pendientes | Ninguna | `makemigrations --check --dry-run` → «No changes detected» |
| CI | En verde para `38b4f3de` (backend + build del frontend) | API de GitHub `actions/runs` |
| Endpoints de la API | 3: `GET /api/health/`, `GET /api/photos/`, `POST /api/contact/` (+ `/admin/`) | `backend/backend/urls.py` |
| Modelos de datos | 1 (`BookingInquiry`, 10 campos) | `backend/api/models.py` |
| Límite de envíos | 10 solicitudes/h por cliente (configurable) | `settings.py` (`CONTACT_RATE_LIMIT`) |
| Rutas públicas | 4 páginas + 404 | `App.jsx` |
| Componentes React | 9 componentes + 5 páginas | `frontend/src/components`, `frontend/src/pages` |
| Fotos en la galería | **42 en 4 series** (Retratos 12 · Editorial 9 · Bodas 9 · Viajes 12) | `portfolio.js`; contador de la galería |
| Idiomas | 2 (EN/ES); 256 cadenas en español | `grep -c 'es: "'` en `frontend/src` |
| Peso de las fotos fuente | 43 JPEG = 8.986 KB | `scripts/optimize_images.py` |
| Peso de las miniaturas | 43 WebP de 720 px = 2.372 KB (**−74 %**) | ídem |
| Imágenes que descarga la galería completa (móvil, 390 px) | Producción 9.303 KB (44 fotos) → build nuevo **2.361 KB** (42 fotos): −75 %; por foto, de 211 a 56 KB | Playwright: suma de cuerpos de respuesta de tipo imagen tras recorrer `/projects` |
| Imágenes de la portada (1440 px) | 2.267 KB → 1.166 KB (−49 %) | ídem sobre `/` |
| JavaScript de producción | 243.996 B · **77.822 B con gzip** (producción actual: 229,32 kB · 74,73 kB gzip) | `vite build`; `gzip -c \| wc -c` |
| CSS de producción | 32.201 B · 7.306 B con gzip | ídem |
| Dependencias de ejecución del frontend | 6 (antes, en la versión 2024: 25) | `package.json` actual y de `34de48c6` |
| Paquetes npm totales (lockfile) | 52 | `package-lock.json` |
| Líneas de código | ≈ 3.833: frontend JS/JSX 1.796 · CSS 1.301 · backend Python sin migraciones 490 (90 de pruebas) · scripts 246 | `wc -l` |
| Commits | Historial actual público: 2 (reescrito el 25-09-2026). Historial anterior: 82 (72 tuyos, 10 de JobNacor; 61 en 2024 y 21 en 2026) | `git rev-list --count origin/main` / `main`; `git shortlog` |
| Fechas | Primer commit 11-05-2024 · reconstrucción 06–09-06-2026 · historial limpio y CI 25-09-2026 | `git log` |
| Producción | 200 en `/`, `/projects`, `/api/health/`, `/api/photos/` y `/admin/login/` | `curl`, 25-09-2026 23:41 (UTC−4) |
| Capturas | 63 en raw · 57 publicables | `screenshots/` |

## Propuesta para la tarjeta

1. **−74 % · peso de las miniaturas de la galería**
2. **42 · fotos en 4 series**
3. **9 · pruebas automatizadas en verde**

Alternativa, si prefieres destacar la experiencia: **2 · idiomas (EN/ES)**.
