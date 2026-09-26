# Overview

## Qué es

Sitio y portafolio bilingüe (inglés y español) de un fotógrafo de retrato, bodas, editorial y viajes llamado «Izak», con base en Santo Domingo. Tiene cuatro páginas públicas: portada, galería, sobre mí y reservas, más una 404 propia. También incluye un formulario de reserva que guarda cada solicitud en Django y un panel de Django Admin para gestionarlas.

- Frontend: React 18 + Vite 8, en `frontend/`. Backend: Django 5 + Django REST Framework, en `backend/`. — comprobado (`frontend/package.json`, `requirements.txt`)
- En producción es **un solo servicio**: Django sirve la API, el admin y el build de Vite desde el mismo origen. — comprobado (`backend/backend/urls.py`, `settings.py` `STATICFILES_DIRS`/`TEMPLATES`; en producción `/`, `/api/health/` y `/admin/login/` responden desde el mismo dominio)

## Para quién

- **Visitantes:** personas que buscan una sesión de retrato, una boda o fotos de marca. Ven el trabajo, eligen un paquete y envían una solicitud. — comprobado (rutas y copy del sitio)
- **El fotógrafo:** revisa las solicitudes en Django Admin, las filtra y las marca como atendidas. — comprobado (`backend/api/admin.py`)
- No hay cuentas de cliente, galerías privadas ni pagos. — comprobado (no hay modelos ni rutas para eso)

## Qué problema resuelve

Presentar un archivo amplio de fotografías (42 en 4 series) sin que se convierta en una cuadrícula genérica, y llevar al visitante de «me gusta este trabajo» a «envío una solicitud» sin salir del sitio. — inferencia (se deduce del producto; no hay un brief del cliente en el repo)

## Estado real (25-09-2026)

| Pregunta | Respuesta | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| ¿Está desplegado en Railway? | Sí | Cabeceras `Server: railway-hikari`, `x-railway-edge: mia1`, `x-railway-request-id`; `railway.toml` (`builder = "RAILPACK"`, `healthcheckPath = "/api/health/"`, `preDeployCommand = migrate`) | comprobado |
| ¿Hay URL de producción que responda hoy? | Sí: <https://izaksphotos.jonasjavier.dev>. 200 en `/`, `/projects`, `/api/health/` (`{"status":"ok"}`), `/api/photos/` y `/admin/login/` (25-09-2026, 23:41 UTC−4) | `curl` | comprobado |
| ¿Qué versión corre producción? | Exactamente `38b4f3de` (`origin/main`): al compilar ese commit se obtiene el mismo `index-Br-2yqH6.js` e `index-Or_Bs73z.css` que sirve producción | `git archive origin/main` + `vite build` en una carpeta temporal | comprobado |
| ¿Incluye producción las mejoras de esta sesión? | No. Están sin commit en la rama local `portfolio-polish` | `git status` | comprobado |
| ¿CI en verde? | Sí en `38b4f3de` (workflow «CI», 25-09-2026 21:36 UTC). El commit anterior, `b1faaa8c`, falló. | API de GitHub `actions/runs` | comprobado |
| ¿Por qué falló `b1faaa8c`? | Probablemente por el nombre `footer.jsx`/`Footer.jsx` (Linux distingue mayúsculas); `38b4f3de` lo normaliza | Mensaje del commit, `git diff --stat` | inferencia |
| ¿Cliente real o proyecto propio? | Sin evidencia de cliente real: el dominio es tuyo (`jonasjavier.dev`) y el correo de contacto usaba `izaksphotos.com`, que no existe | DNS NXDOMAIN (`dns.google`) | pendiente (Pregunta 1) |
| ¿Repo público o privado? | Público. `JonasJavier/IZAK-S-PHOTOS` es fork de `JobNacor/IZAK-S-PHOTOS` (también público) | API de GitHub | comprobado |
| ¿Hay datos reales en producción? | Desconocido: no se envió nada a producción y no hay analítica | — | pendiente (Preguntas 5 y 7) |
| ¿Qué base de datos usa producción? | Desconocido. El código usa SQLite si no hay `DATABASE_URL` y PostgreSQL si la hay (`psycopg2-binary` instalado) | `settings.py` | pendiente (Pregunta 5) |

## Autoría

- 2024: `JobNacor` crea el repositorio (11-05-2024). Tú subes y reorganizas el proyecto React + Django en mayo y junio. Historial de 82 commits: 72 tuyos y 10 de `JobNacor`. — comprobado (`git shortlog -sn main`)
- 2026-06: reconstrucción completa (21 commits entre el 06 y el 09-06-2026): interfaz bilingüe, `BookingInquiry` y despliegue. — comprobado (`git log main --since=2026-01-01`)
- 2026-09-25: publicas un historial limpio de 2 commits en `origin/main` (sin `env/`, `.env` ni base de datos, con CI). — comprobado
- 2026-09-25 (esta sesión): mejoras de UX, accesibilidad, rendimiento y backend hechas por Claude a petición tuya, **sin commit**. — comprobado
