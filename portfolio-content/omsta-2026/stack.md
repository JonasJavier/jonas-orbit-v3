<!-- portfolio-content/omsta-2026/stack.md -->
<!-- Fecha: 2026-09-25 · Repositorio CristecnoViajes_SRL · commit 3f5cea73 -->

# OMSTA: stack tecnológico verificado

Inventario de lo que el repositorio usa de verdad. Cada fila cita su archivo de
evidencia (ruta relativa a la raíz del repo). Las versiones salen de
`requirements.txt` (todas fijadas con `==`), de `package.json` y, cuando el
proyecto solo declara un rango, de la versión instalada en `node_modules` o en
`.codex_venv`, indicándolo con «rango → instalada».

Convenciones: «sin fijar» = el archivo no da versión; «pendiente» = no se pudo
verificar desde el repositorio.

---

## Lenguajes

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| Python | 3.12 (CI y objetivo de lint); 3.12.10 en el entorno local | Todo el backend Django, servicios, jobs y comandos | `.github/workflows/ci.yml:20`, `pyproject.toml:7,26` |
| TypeScript | rango `~6.0.3` → 6.0.3, modo `strict` | Toda la app móvil | `mobile/package.json:50`, `mobile/tsconfig.json:4` |
| JavaScript (sin transpilar) | — | Interactividad de las plantillas web por app | `static/common/js/`, `reservas/static/reservas/js/` |
| HTML + Django Template Language | Django 5.2.6 | Interfaz web renderizada en servidor | `templates/layouts/base_app.html` |
| CSS propio | — | Sistema tipográfico, layout y estilos del CRM | `static/common/css/typography.css`, `static/common/css/layout.css`, `crm/static/crm/css/crm_base.css` |
| PowerShell | — | Scripts de verificación, QA, instalación y respaldo | `scripts/agents/*.ps1`, `scripts/backup/*.ps1` |

## Backend

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| Django | 5.2.6 | Framework web: 19 apps de dominio y plataforma | `requirements.txt:25`, `CristecnoViajes_SRL/settings.py:72-115` |
| Gunicorn (worker `gthread`) | 23.0.0 | Servidor WSGI en producción | `requirements.txt:49`, `docs/operaciones/despliegue-railway.md:114-124` |
| WhiteNoise | 6.12.0 | Estáticos con hash y compresión (`CompressedManifestStaticFilesStorage`) | `requirements.txt:107`, `CristecnoViajes_SRL/settings.py:126,367-371` |
| django-filter | 25.1 | Filtros de listados y de la API | `requirements.txt:31`, `CristecnoViajes_SRL/settings.py:89,716` |
| django-select2 | 8.3.0 | Autocompletado de selects en formularios, vía AJAX | `requirements.txt:36`, `CristecnoViajes_SRL/urls.py:84` |
| django-widget-tweaks | 1.5.0 | Atributos y clases de campos desde plantillas | `requirements.txt:40`, `CristecnoViajes_SRL/settings.py:84` |
| django-countries | 7.6.1 | Campo país de clientes y suplidores | `requirements.txt:28`, `crm/models.py`, `reservas/models/suppliers.py` |
| django-cleanup | 9.0.0 | Borra archivos huérfanos al cambiar o eliminar registros | `requirements.txt:27`, `CristecnoViajes_SRL/settings.py:83` |
| django-resized + Pillow | 1.0.3 / 11.1.0 | Redimensionar avatares de usuario | `requirements.txt:35,68`, `usuarios/models.py:12,268` |
| django-user-agents | 0.4.0 | Detectar dispositivo y navegador en la bitácora | `requirements.txt:39`, `CristecnoViajes_SRL/settings.py:142` |
| django-crum / django-threadlocals | 0.7.9 / 0.10 | Usuario actual para auditoría de cambios | `requirements.txt:30,38`, `divisas/audit.py`, `crm/models.py` |
| bleach | 6.3.0 | Sanear HTML de plantillas de políticas | `requirements.txt:11`, `documentos/sanitizers.py:10` |
| python-dotenv | 1.1.1 | Cargar `.env` en desarrollo | `requirements.txt:78`, `CristecnoViajes_SRL/settings.py:9,27` |
| python-dateutil | 2.9.0.post0 | Cálculo de fechas y plazos | `requirements.txt:77` (7 módulos lo importan) |
| Zona horaria / idioma | `America/Santo_Domingo`, `es` | Localización para República Dominicana | `CristecnoViajes_SRL/settings.py:348-349` |

## Frontend web (plantillas, JS, CSS, UI y gráficos)

Todo se carga por CDN desde las plantillas base; no hay librerías vendorizadas
en `static/` ni empaquetador (sin webpack/vite).

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| Bootstrap (CSS + bundle JS) | 5.3.3 | Rejilla, componentes y modales de toda la web | `templates/layouts/base_app.html:17,410` |
| Bootstrap Icons | 1.11.3 | Iconografía de la interfaz | `templates/layouts/base_app.html:22` |
| jQuery | 3.7.1 | DOM, AJAX y base de Select2 | `templates/layouts/base_app.html:409` |
| Select2 + tema Bootstrap 5 | 4.1.0-rc.0 / 1.3.0 | Selects buscables (≈94 archivos lo referencian) | `templates/layouts/base_app.html:19-20,411` |
| HTMX | 2.0.0 | Feed de procesos en segundo plano (10 plantillas) | `templates/layouts/base_app.html:413`, `operations/templates/operations/includes/` |
| SweetAlert2 | CSS 11.12.4; JS rango `@11` | Alertas y confirmaciones | `templates/layouts/base_app.html:21,412` |
| flatpickr (+ locale `es`) | CSS 4.6.13; JS sin fijar | Selectores de fecha (21 archivos) | `templates/layouts/base_app.html:18,414-415` |
| Chart.js | 4.4.3 y 4.4.4; banco sin fijar | Gráficos de dashboards general, nómina, divisas y banco | `dashboard/templates/dashboard/dashboard.html:1006`, `divisas/templates/divisas/dashboard.html:655`, `banco/templates/banco/dashboard.html:212` |
| chartjs-adapter-date-fns / chartjs-plugin-zoom | rangos `@3` / `@2` | Eje temporal y zoom del histórico de tasas | `divisas/templates/divisas/dashboard.html:656-657` |
| Google Fonts (Inter, Plus Jakarta Sans) | — | Tipografía de la aplicación | `templates/layouts/base_app.html:24` |

## Móvil

App «Omsta Móvil» en `mobile/` (Expo managed + development build).

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| React Native | 0.86.3 | Runtime nativo Android/iOS | `mobile/package.json:34` |
| React | 19.2.3 | UI declarativa de la app | `mobile/package.json:33` |
| Expo SDK | rango `~57.0.24` → 57.0.24 | Plataforma, módulos nativos y tooling | `mobile/package.json:13` |
| Expo Router (rutas tipadas) | 57.0.22 | Navegación por archivos en `mobile/app/` | `mobile/package.json:28`, `mobile/app.json` (`experiments.typedRoutes`) |
| TanStack Query | 5.102.8 | Caché y sincronización de datos de la API | `mobile/package.json:11`, `mobile/app/_layout.tsx:2` |
| TanStack persist-client + sync-storage-persister | 5.102.8 | Caché persistida entre aperturas | `mobile/package.json:10,12`, `mobile/src/cache/persistencia.ts:9` |
| react-native-mmkv + react-native-nitro-modules | rango `^4.3.2` → 4.3.2 / 0.37.1 | Almacenamiento clave-valor rápido para la caché | `mobile/package.json:36-37`, `mobile/src/cache/persistencia.ts:11` |
| expo-secure-store + expo-crypto | 57.0.4 / 57.0.3 | Guardar tokens JWT en el llavero del sistema | `mobile/package.json:16,29`, `mobile/src/auth/almacen.ts:7-8` |
| expo-local-authentication | 57.0.3 | Desbloqueo con huella o Face ID | `mobile/package.json:25`, `mobile/src/auth/biometria.ts:2` |
| expo-location | 57.0.19 | Verificar ubicación al iniciar sesión | `mobile/package.json:26`, `mobile/src/ubicacion/gps.ts:2` |
| expo-image-picker + expo-image-manipulator | 57.0.19 / 57.0.19 | Fotografiar y comprimir comprobantes de pago | `mobile/package.json:22-23`, `mobile/src/ui/foto.ts:16-17` |
| expo-document-picker + expo-file-system | 57.0.2 / 57.0.7 | Adjuntar documentos y subirlos en multipart | `mobile/package.json:19-20`, `mobile/app/clientes/[tipo]/[id].tsx:7-8` |
| expo-web-browser | 57.0.3 | Abrir PDFs firmados en el navegador del sistema | `mobile/package.json:32`, `mobile/src/navegacion/abrir.ts:6` |
| @expo/vector-icons | rango `^15.0.2` → 15.1.1 | Iconos (Ionicons) | `mobile/package.json:8` |
| @expo-google-fonts/inter y /manrope | 0.4.2 | Tipografía del sistema de diseño móvil | `mobile/package.json:6-7`, `mobile/app/_layout.tsx:4` |
| react-native-gesture-handler / screens / safe-area-context | 2.32.0 / rango `~4.26.0` → 4.26.2 / 5.7.0 | Gestos, pantallas nativas y márgenes seguros | `mobile/package.json:35,38-39` |
| expo-dev-client | 57.0.19 | Build de desarrollo para probar en teléfono | `mobile/package.json:17`, `mobile/eas.json:8` |
| expo-splash-screen, expo-font, expo-status-bar, expo-constants, expo-application, expo-linking | 57.0.x | Arranque, fuentes, versión de app y deep links | `mobile/package.json:14-15,21,24,30-31` |

## Datos y colas

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| PostgreSQL | servidor: pendiente (dev pide ≥16) | Base de datos y fuente de verdad del negocio | `CristecnoViajes_SRL/settings.py:263-288`, `docs/operaciones/instalacion-desarrollo.md:34` |
| psycopg (+ psycopg-binary) | 3.3.3 | Driver PostgreSQL de Django | `requirements.txt:71-72` |
| SQLite | la de Python | Respaldo local cuando `USE_POSTGRES=False` | `CristecnoViajes_SRL/settings.py:290-295` |
| Redis | servidor: pendiente; cliente redis-py 6.1.0 + hiredis 3.3.1 | Broker de Django Q2, caché y sesiones | `requirements.txt:50,85`, `CristecnoViajes_SRL/settings.py:541-595,627-640` |
| Django Q2 | 1.9.0 | Cola de trabajos y tareas programadas (`Schedule`) | `requirements.txt:33`, `CristecnoViajes_SRL/settings.py:586-605`, `operations/lifecycle.py:32`, `core/signals.py:69` |
| Caché de Django | Redis / LocMem / DB según entorno | Caché, sesiones y control de intentos de login | `CristecnoViajes_SRL/settings.py:627-700` |
| django-storages (S3) + boto3 | 1.14.6 / 1.42.83 | Adjuntos y documentos en bucket privado con URL firmada | `requirements.txt:12,37`, `CristecnoViajes_SRL/settings.py:390-435` |

## API y contratos

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| Django REST Framework | 3.16.1 | API de la web (sesión) y API móvil | `requirements.txt:42`, `CristecnoViajes_SRL/settings.py:707-720` |
| djangorestframework-simplejwt (+ token_blacklist) | 5.5.1 | JWT por dispositivo con rotación y lista negra | `requirements.txt:43`, `CristecnoViajes_SRL/settings.py:92,738-755`, `movil/authentication.py:10` |
| drf-spectacular | 0.30.0 | Genera el esquema OpenAPI de `/api/movil/v1` | `requirements.txt:44`, `CristecnoViajes_SRL/settings.py:758-775`, `movil/openapi.py` |
| OpenAPI (esquema versionado) | 3.0.3 | Contrato único entre backend y app | `mobile/api/schema.yaml:1`, `docs/tecnica/api.md:594` |
| openapi-typescript | rango `^7.13.0` → 7.13.0 | Genera los tipos TS de la app desde el esquema | `mobile/package.json:49,59` |
| PyYAML | 6.0.3 | Test que valida el esquema commiteado | `requirements.txt:82`, `movil/tests/test_schema.py:14` |

## Integraciones

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| Google Places API (New), desde el servidor | API v1 vía `requests` 2.32.3 | Buscar hoteles en la app sin exponer la clave | `core/google_places.py:28,34,108-111`, `mobile/src/hoteles/BuscadorGoogle.tsx` |
| Google Maps JavaScript API (`places`, `marker`) | versión `weekly` | Buscador de hoteles web y mapa de sucursales | `reservas/templates/reservas/hoteles/hotel_form.html:1384`, `sucursales/templates/sucursales/branch_map.html:146`, `sucursales/templates/sucursales/branch_detail.html:791` |
| Correo SMTP (backend de Django) | Django 5.2.6; host por entorno | Envío de correos de reservas con adjuntos | `CristecnoViajes_SRL/settings.py:464-483`, `reservas/services/email_content.py:33,67` |
| IPinfo (API REST) | vía `requests` 2.32.3 | Geolocalización por IP de sesiones y bitácora | `usuarios/geoip.py:8,33`, `CristecnoViajes_SRL/settings.py:150` |
| Expo Push (solo registro del token) | — | El backend guarda y valida el `ExponentPushToken` | `movil/models.py:41`, `movil/serializers/auth.py:76-82`, `movil/services/dispositivos.py:204` |
| WeasyPrint | 65.1 | PDFs HTML→PDF (facturas, documentos) | `requirements.txt:105`, `core/pdf.py:15`, `railpack.json:4-19` |
| ReportLab | 4.4.3 | PDFs dibujados (recibos, nómina) | `requirements.txt:87`, `contabilidad/views/payments.py:2991`, `nomina/services.py:904` |
| qrcode | 8.0 | Códigos QR en PDFs de reservas | `requirements.txt:83`, `reservas/services/pdf.py:19` |
| openpyxl | 3.1.5 | Exportaciones xlsx (CRM, banco, contabilidad) | `requirements.txt:63`, `crm/services/exports.py:11`, `banco/services/exports.py:8` |
| XlsxWriter | 3.2.9 | Exportaciones xlsx de nómina | `requirements.txt:109`, `nomina/views/periods.py:9` |

## Infraestructura y despliegue

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| Railway | — (plataforma gestionada) | Web, worker, Postgres, Redis y dos buckets | `docs/operaciones/despliegue-railway.md:15-29` |
| Railpack | esquema `schema.railpack.com` | Construye la imagen Python con libs de WeasyPrint | `railpack.json:1-21` |
| Gunicorn `gthread` | 23.0.0 | Proceso web (workers × hilos por entorno) | `docs/operaciones/despliegue-railway.md:114-124` |
| Worker `qcluster` (Django Q2) | 1.9.0 | Servicio separado para jobs en segundo plano | `docs/operaciones/despliegue-railway.md:22,137` |
| Bucket S3-compatible de Railway | — | Media privada; otro bucket para PITR de Postgres | `docs/operaciones/despliegue-railway.md:26-29`, `docs/tecnica/variables-entorno.md:98` |
| pgBackRest (gestionado por Railway) | pendiente | WAL archivado y recuperación a un punto en el tiempo | `docs/operaciones/operacion-servidor.md:244` |
| Sonda de salud `/health/` | — | Comprobación HTTP del despliegue | `CristecnoViajes_SRL/urls.py:16,94` |
| Respaldo manual (`pg_dump -Fc`, `aws s3 sync`) | — | Copias locales de base de datos y media | `scripts/backup/backup-postgres.ps1:7-8`, `scripts/backup/backup-media.ps1:14` |

## Build y distribución móvil (EAS)

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| EAS Build | CLI requerida `>= 16.0.0`; instalada 24.3.0 | Builds en la nube de Android e iOS | `mobile/eas.json:3` |
| Perfil `development` | — | APK con dev client, distribución interna | `mobile/eas.json:7-14` |
| Perfil `preview` | — | APK interno contra producción | `mobile/eas.json:15-21` |
| Perfil `production` | — | AAB/IPA con build number autoincremental remoto | `mobile/eas.json:4,22-27` |
| EAS Submit | perfil vacío | Preparado para publicar en tiendas (sin usar aún) | `mobile/eas.json:29-31`, `docs/operaciones/app-movil.md:91-97` |
| Firma Android (keystore en EAS) | — | Firma de APK/AAB; no vive en el repo | `docs/operaciones/app-movil.md:21` |

## Testing y calidad

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| pytest + pytest-django | 8.4.2 / 4.11.1 | Suite backend (≈236 archivos `test_*.py`) | `requirements-dev.txt:2-3`, `pytest.ini` |
| coverage | sin fijar → 7.16.0 | Cobertura con umbral mínimo del 80 % en CI | `requirements-dev.txt:5`, `.github/workflows/ci.yml:58-61` |
| pypdf | rango `>=6,<7` → 6.18.0 | Leer PDFs generados en las pruebas | `requirements-dev.txt:8` |
| Ruff | 0.15.22 (hook) | Lint e imports (E, W, F, I, B, C4, DJ) | `.pre-commit-config.yaml:4-8`, `pyproject.toml:43-58` |
| Black | 23.12.1 | Formato del código Python | `.pre-commit-config.yaml:10-13`, `requirements-dev.txt:13` |
| pre-commit | sin fijar → 4.6.2 | Ruff y Black antes de cada commit | `requirements-dev.txt:4`, `.pre-commit-config.yaml` |
| Jest + jsdom (web) | 29.7.0 / rango `^29.7.0` → 29.7.0 | Pruebas del JS de las plantillas | `package.json:9-10`, `jest.config.js:3-12`, `jest.setup.js` |
| jest-expo + @react-native/jest-preset | 57.0.5 / 0.86.3 | Pruebas unitarias de la app móvil | `mobile/package.json:42,48,62-71` |
| ESLint + eslint-config-expo | 9.39.5 / 57.0.2 | Lint de la app móvil (flat config) | `mobile/package.json:45-46`, `mobile/eslint.config.js` |
| tsc (`--noEmit`) | TypeScript 6.0.3 | Verificación de tipos de la app | `mobile/package.json:56` |
| expo-doctor | pendiente (se ejecuta con `npx`) | Valida SDK, peers nativos y `app.json` | `.github/workflows/mobile.yml:110-111` |
| Playwright | rango `^1.61.1` → 1.61.1 | Capturas automáticas para tutoriales de usuario | `package.json:12`, `output/tutoriales/_capture/capture.py` |
| Django `check` y `makemigrations --check` | Django 5.2.6 | Configuración válida y sin migraciones pendientes | `.github/workflows/ci.yml:52-56` |

## CI

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| GitHub Actions (`CI`) | runner `ubuntu-latest` | Ruff, Black, checks de Django, pytest y cobertura | `.github/workflows/ci.yml` |
| GitHub Actions (`Mobile`) | runner `ubuntu-latest`, Node 24 | Tipos vs esquema, expo-doctor, tsc, ESLint, Jest | `.github/workflows/mobile.yml` |
| actions/checkout, setup-python, setup-node, cache, upload-artifact | v4, v5, v4, v4, v4 | Pasos estándar del pipeline | `.github/workflows/ci.yml:15-23,68`, `.github/workflows/mobile.yml:89-93` |
| Detección de deriva del contrato | — | Falla si `types.ts` no coincide con el esquema | `.github/workflows/mobile.yml:103-106` |

## Herramientas

| Tecnología | Versión | Para qué se usa en OMSTA | Evidencia |
| --- | --- | --- | --- |
| Git + GitHub | 2.54.0 (local) | Control de versiones, trabajo solo sobre `main` | `docs/agents/flujo-git.md` |
| Node.js / npm | 24.16.0 / 11.13.0 (local); Node 24 en CI | Tooling JS web y móvil | `.github/workflows/mobile.yml:94` |
| EAS CLI | 24.3.0 (local) | Lanzar builds y gestionar el proyecto EAS | `mobile/eas.json:3`, `docs/operaciones/app-movil.md:27` |
| Railway CLI | 5.23.1 (local) | Logs, variables y comandos por SSH en producción | `docs/operaciones/despliegue-railway.md` |
| Android Debug Bridge (adb) | 1.0.41 (local) | Pruebas en teléfono real por USB | `docs/operaciones/app-movil.md:197-222` |
| Metro (incluido en Expo) | con Expo 57.0.24 | Empaquetador JS en desarrollo | `docs/operaciones/app-movil.md:150-160` |
| Scripts de verificación PowerShell | — | Check, plantillas, tests dirigidos, lint, servidor QA | `scripts/agents/` |
| Agentes de código (Claude Code y Codex) | — | Desarrollo asistido con reglas versionadas | `AGENTS.md`, `CLAUDE.md`, `.codex/environments/environment.toml` |

---

## Línea para el CV

Python 3.12 · Django 5.2 · Django REST Framework · PostgreSQL · Redis · Django Q2 · JWT (simplejwt) · OpenAPI (drf-spectacular + openapi-typescript) · Bootstrap 5 · jQuery · HTMX · Chart.js · React Native 0.86 · Expo SDK 57 · Expo Router · TypeScript · TanStack Query · EAS Build · Google Places/Maps API · WeasyPrint · ReportLab · openpyxl · S3 (django-storages) · Railway · Gunicorn · GitHub Actions · pytest · Jest · Ruff · Black

---

## Lo que NO está en el stack

| Se podría suponer | Realidad | Evidencia de la ausencia |
| --- | --- | --- |
| Celery | No existe; la cola es Django Q2 por decisión documentada | `git grep -i celery` solo halla una variable heredada en `scripts/agents/_common.ps1:66` y config de agentes; nada en `requirements.txt` ni en código; `docs/tecnica/arquitectura.md:72` («Deliberadamente **no** se usa Celery») |
| Docker / docker-compose en producción | No hay `Dockerfile` ni `compose`; la imagen la construye Railpack | `git ls-files` sin `Dockerfile`, `docker-compose*`, `Procfile`, `nixpacks*` ni `railway.json/toml`; la única mención es un paso opcional en `.codex/environments/environment.toml:205` |
| GraphQL | No existe; la API es REST | `git grep -iE "graphql|graphene|strawberry"` → 0 resultados |
| Django Channels / WebSockets / ASGI en producción | No; se sirve por WSGI con Gunicorn | `git grep -iE "channels|daphne|uvicorn"` → 0; `WSGI_APPLICATION` en `CristecnoViajes_SRL/settings.py:258` |
| django-cors-headers | No instalado; la línea del middleware está comentada | `CristecnoViajes_SRL/settings.py:127` (comentada) y `:611` («solo tienen efecto si instalas…») |
| django-crispy-forms en uso | Está en `requirements.txt:29` pero no en `INSTALLED_APPS` ni en plantillas | `git grep crispy -- '*.html'` → 0; ausente de `settings.py:72-115` |
| Librerías declaradas sin import directo | pandas, numpy, SQLAlchemy, csvkit/agate, phonenumbers, xlrd, tenacity, aiohttp, django-ratelimit, ratelimit y el SDK `ipinfo` | `git grep -E "^\s*(import\|from) <paquete>"` → 0 para cada uno; IPinfo se consume con `requests` (`usuarios/geoip.py:33`) |
| Envío de push notifications | Solo se registra el token; no hay emisor ni llamada a la API de Expo | `movil/push.py` no existe; `git grep "exp.host"` → 0; `expo-notifications` y `expo-device` están en `mobile/package.json:18,27` pero ningún archivo de `mobile/app` o `mobile/src` los importa |
| @react-native-community/datetimepicker en uso | Declarado y como plugin, pero la app usa un calendario propio | Sin import en `mobile/app` ni `mobile/src`; calendario en `mobile/src/ui/calendario.tsx` |
| Brevo / SendGrid / Mailgun / SES | Ningún proveedor de correo con SDK; solo SMTP genérico de Django | `grep -iE "brevo|sendinblue|sendgrid|mailgun|amazon ses"` en código y `docs/` → 0 |
| Sentry u otro APM | No integrado | `git grep -i sentry` solo halla un patrón de Jest en `mobile/package.json:69` y una coincidencia no relacionada en `security/permissions.py` |
| Tailwind, React/Vue en la web, webpack/vite | La web es DTL + Bootstrap + jQuery por CDN, sin bundler | `git grep -iE "tailwind|webpack"` → 0; sin `vite.config` ni `webpack.config` |
| Redux / Zustand / Axios / NativeWind en la app | Estado de servidor con TanStack Query y `fetch` propio | `git grep -iE "zustand|axios|nativewind"` → 0; `mobile/src/api/cliente.ts` |
| Expo Updates (OTA) | No instalado | `git grep expo-updates` → 0 |
| Firebase / OneSignal | No integrados | `git grep -iE "firebase|onesignal"` → 0 |
| Kubernetes / Elasticsearch / MongoDB | No existen | `git grep -iE "kubernetes|elasticsearch|mongo"` → 0 |

---

## Pendientes

1. **Versión del servidor PostgreSQL de producción**: el repo solo dice «16 o superior» para desarrollo (`docs/operaciones/instalacion-desarrollo.md:34`).
2. **Versión del servidor Redis de producción**: solo consta «Redis 6+ con ACL» (`docs/tecnica/variables-entorno.md:70`).
3. **Versión de Python en Railway**: no hay `runtime.txt`, `.python-version` ni versión en `railpack.json`; la elige Railpack. CI y lint apuntan a 3.12.
4. **Proveedor SMTP real de producción**: el host se toma del entorno (por defecto uno de Gmail, `settings.py:468`); no se leyó `.env` ni variables de Railway. Brevo no aparece en el repo.
5. **Versión de expo-doctor**: se ejecuta con `npx` sin fijar.
6. **Versiones exactas en CDN sin fijar**: flatpickr JS, Chart.js del dashboard de banco y SweetAlert2 JS (`@11`) resuelven a «la última» en cada carga.
7. **Publicación en tiendas**: EAS Submit está configurado pero vacío; la doc sitúa App Store/Play en una fase posterior (`docs/operaciones/app-movil.md:91-97`). No se verificó ninguna publicación.
8. **Pool de conexiones de PostgreSQL**: `POSTGRES_POOL_ENABLED` activa `OPTIONS["pool"]` (`settings.py:287-288`), pero `psycopg-pool` no está en `requirements.txt`; no se verificó si se usa en producción.
9. **Versión de pgBackRest**: la gestiona Railway; no consta en el repo.
