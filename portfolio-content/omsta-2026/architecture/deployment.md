<!-- portfolio-content/omsta-2026/architecture/deployment.md · 2026-09-25 · commit 3f5cea73 -->
# OMSTA — despliegue

Sin identificadores de Railway, dominios, IPs ni secretos. Diagrama:
`diagrams/deployment.mmd`. Fuentes: `docs/operaciones/despliegue-railway.md`,
`docs/operaciones/demo-railway.md`, `docs/operaciones/app-movil.md`,
`docs/agents/deployment-checks.md`, `docs/operaciones/respaldo-y-restauracion.md`.

---

## 1. Producción (Railway)

Un proyecto con cuatro servicios y dos buckets:

| Pieza | Tipo | Responsabilidad |
| --- | --- | --- |
| Web | Aplicación | Gunicorn `gthread` (`WEB_CONCURRENCY` workers × `GUNICORN_THREADS` hilos, `--max-requests` con jitter): HTML, APIs web y `/api/movil/v1/`, comandos administrativos por SSH |
| Worker | Aplicación | `python manage.py qcluster` (Django Q2): correos, PDFs, exportaciones, alertas, import 623. Sin red pública; no corre migraciones como arranque |
| PostgreSQL | Base de datos | Única fuente de verdad |
| Redis | Caché | DB 0 cola de Q2; DB 1 caché y sesiones `cached_db` |
| Bucket de media (S3-compatible) | Almacenamiento | Adjuntos, comprobantes, documentos generados; privado con URL firmada |
| Bucket de respaldo | Almacenamiento | Respaldo de PostgreSQL con recuperación a un punto en el tiempo (PITR) |

- **Web y worker comparten configuración**: misma BD, mismo Redis, misma
  clave secreta, mismo almacenamiento. Si divergen, el worker produce archivos
  que la web no encuentra. PostgreSQL y Redis se conectan por **referencias
  entre servicios** de Railway, no por valores copiados.
- **Build**: `railpack.json` (proveedor Python) declara las librerías del
  sistema que WeasyPrint necesita para los PDF, en build y en runtime.
- **Sonda de salud**: `/health/` → 200 `{"status": "ok"}`; exenta de login y
  de la redirección HTTPS, porque la sonda interna entra por HTTP.
- **Despliegue**: automático desde la rama `main` de GitHub a web y worker;
  no se usa `railway up`. Cierre: web y worker en `SUCCESS` con el **mismo
  hash**.
- **Migraciones**: la doc de producción (§7) describe un `migrate` manual por
  `railway ssh`; una observación del 2026-09-18 indica que el servicio web ya
  tiene `migrate` como **comando de pre-despliegue** (la migración apareció
  aplicada sin intervención). **Confirmado por Jonás (2026-09-26)**: desde el push
  las migraciones corren solas. La §7 de `despliegue-railway.md` está desfasada
  (la configuración vive en Railway; no hay `railway.toml` versionado).
  El demo sí lo documenta (ver 2).
- **Verificación posterior**: `/health/`, `manage.py check`,
  `makemigrations --check --dry-run`, configuración activa sin secretos
  (`DEBUG=False`, motor PostgreSQL, sesiones `cached_db`, S3 activo),
  `auditar_seguridad`, `verificar_identidades_contables`.
- **Operación por riesgo**: R0 observación → R1 solo lectura → R2 simulación
  (`reparar_*` sin `--apply`) → R3 escritura autorizada → R4 infraestructura.
  Fuente: `docs/operaciones/despliegue-railway.md` §9.
- **CI previo** (GitHub Actions `ci.yml`): ruff, black, `check`,
  `makemigrations --check`, pytest con cobertura.

## 2. Instancia demo

- Proyecto de Railway **aparte**, con su propio PostgreSQL, Redis y bucket;
  no comparte secretos ni datos con producción.
- Servicios: web (igual que producción, **`migrate` en el pre-despliegue**,
  sonda `/health/`, se duerme sin tráfico) y worker `qcluster` con clúster
  propio.
- **Cada push a `main` despliega a la vez producción y demo**; cada uno
  aplica sus migraciones sobre su propia base.
- Diferencias: `DEMO_MODE=True` (habilita `seed_demo`; nunca en producción),
  correo a consola, gate de ubicación y GeoIP apagados, sin llave de Google
  Maps, prefijos de caché y clúster Q2 propios.
- Datos ficticios: `seed_demo` pasa por los servicios reales de alta, pago y
  aplicación (CxC, CxP y asientos cuadran); usuarios de prueba con correos
  `@example.com`.
- **Reinicio nocturno** a las 4:00 (hora de Santo Domingo) por el worker
  (`core.tasks.reset_demo_data`): borra lo transaccional, reactiva la semilla y
  restablece contraseñas. La programación solo existe si `DEMO_MODE=True`.
- Franja «DEMO» visible en todas las pantallas
  (`templates/layouts/_demo_banner.html`).

## 3. App móvil (EAS)

- Proyecto EAS enlazado desde `mobile/app.json`; perfiles en `mobile/eas.json`:
  - `development`: development build con `expo-dev-client`, distribución
    interna, para probar en teléfono físico contra el servidor local (Metro).
  - `preview`: APK instalable de distribución interna apuntando a producción.
  - `production`: AAB (Play) / IPA (App Store) con `autoIncrement` del número
    de build.
- Keystore de Android custodiado por EAS, fuera del repo.
- Reglas: `npx expo-doctor` antes de cada build; una dependencia nativa nueva
  exige build nueva (los cambios JS/TS llegan por Metro). Compilación
  observada ~13 min.
- Estado: builds de desarrollo Android en uso; **publicación en tiendas
  pendiente** (requiere Apple Developer Program con D-U-N-S y Google Play
  Console, a cargo del negocio).
- CI móvil (`.github/workflows/mobile.yml`): `npm ci`, tipos TS iguales al
  esquema OpenAPI, `expo-doctor`.
- **El backend de la app se despliega con la web**: la API `/api/movil/v1/`
  vive en el mismo servicio web de Railway; el mismo push a `main` la publica.
  Variables relevantes: `MOVIL_MIN_APP_VERSION` (fuerza actualizar la app) y
  `LOCATION_GATE_*`.
- Push remoto: **no implementado**. El backend expone
  `dispositivos/push-token/` para guardar el token, pero la app no lo envía
  todavía y el backend no manda nada por Expo Push.

## 4. Desarrollo local (contexto)

- Windows + PowerShell 5.1; entorno virtual `.codex_venv`; servidor QA
  (`scripts/agents/qa-server.ps1`, puerto 8123) sin Redis y con jobs
  síncronos (`DJANGO_Q_ASYNC=False` → broker ORM).
- La app se prueba en un teléfono físico por Wi-Fi o `adb reverse`.
