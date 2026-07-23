<!-- portfolio-content/omsta/metrics/technical-inventory.md -->

# Inventario técnico — OMSTA (CristecnoViajes_SRL)

> **Fecha:** 2026-07-21 · **Commit (HEAD):** `da5a86b3` · rama `main`
> Todas las cifras indican cómo se obtuvieron. Salvo indicación, provienen de
> conteos directos sobre el árbol de trabajo (excluyendo `env/`, `.codex_venv/`,
> `node_modules/`, `__pycache__/` y, donde se indica, `migrations/`).

## 1. Stack verificado (con evidencia)

| Capa | Tecnología | Versión | Evidencia |
|---|---|---|---|
| Lenguaje | Python | 3.12.10 | `env/Scripts/python.exe -V`; `pyproject.toml` target `py312` |
| Framework | Django | 5.2.6 | `requirements.txt`; `django.get_version()` |
| API | Django REST Framework | 3.16.1 | `requirements.txt`; `REST_FRAMEWORK` en `settings.py` |
| Base de datos | PostgreSQL (psycopg 3) | psycopg 3.3.3 | `settings.py` (`USE_POSTGRES`); `.env` `POSTGRES_DB=cristecno_db` |
| Cache/colas | Redis (+ hiredis) | redis 6.1.0 | `settings.py` `_redis_config_from_env`, `Q_CLUSTER`, `CACHES` |
| Tareas en 2.º plano | **Django Q2** (`django_q`) | 1.9.0 | `INSTALLED_APPS`; `Q_CLUSTER`; `operations/lifecycle.py` |
| Autenticación | Usuario personalizado + backend usuario/email | — | `AUTH_USER_MODEL="usuarios.UsuarioPersonalizado"`; `usuarios/auth_backends.py` |
| Frontend | Django Templates + Bootstrap (Bootstrap Icons) + JS vanilla/jQuery | — | `templates/` (305 archivos); `bi bi-*`; `package.json` (`jquery`) |
| Formularios | crispy-forms, widget-tweaks, select2, django-filter | — | `requirements.txt`; `INSTALLED_APPS` |
| PDF | WeasyPrint + reportlab + qrcode | weasyprint 65.1 | `core.pdf.render_pdf_from_html`; `railpack.json` (libs Pango) |
| Reportes/Excel | pandas, numpy, openpyxl, xlsxwriter | — | `requirements.txt`; `reports/`, exportadores XLSX en `contabilidad/views` |
| Almacenamiento | django-storages + boto3 (S3-compatible), WhiteNoise | — | `settings.py` (`USE_S3_MEDIA`, `STORAGES`), middleware WhiteNoise |
| Email | SMTP (Django) | — | `settings.py` `EMAIL_BACKEND`; `.env` |
| Auditoría/seguridad | crum, threadlocals, django-user-agents, django-ratelimit, ipinfo | — | `INSTALLED_APPS`; middleware `security/`, `usuarios/` |
| Internacional | django-countries, django-phonenumbers, babel | — | `requirements.txt` |
| Servidor prod | Gunicorn (gthread) | 23.0.0 | `docs/agents/deployment-checks.md` |
| Despliegue | Railway (railpack) | — | `railpack.json`; menciones a Railway en settings/docs |
| Lint/format | Ruff + Black | — | `pyproject.toml`; `.pre-commit-config.yaml` |
| Tests | pytest + pytest-django (Python), Jest + Playwright (JS) | — | `pytest.ini`, `jest.config.js`, `package.json` |

> **Nota de higiene (del propio análisis del proyecto):** `celery`, `kombu`,
> `billiard` y `amqp` aparecen en `requirements.txt` pero **no se importan** en el
> código: el proyecto usa Django Q2, no Celery. Son dependencias muertas
> señaladas para retiro (ver `docs/architecture/arquitectura-grafo-2026-07-21.md`).

## 2. Tamaño y superficie del código

| Métrica | Valor | Cómo se obtuvo |
|---|---:|---|
| Aplicaciones Django locales | **18** | `INSTALLED_APPS` en `settings.py` |
| Apps de terceros | 11 | `INSTALLED_APPS` |
| Archivos Python (excl. migraciones y venvs) | ~**880** | `find . -name '*.py'` filtrado |
| LOC Python de negocio (excl. `migrations/`) | ~**219.000** | grafo `codebase-memory` (2026-07-21) + `find`/`wc` por app |
| Clases de modelo (`class X(...models.Model...)`) | ~**184** | `grep -E "class .+\(.*models\.Model"` |
| Clases DRF (ViewSet/APIView/Serializer) | ~**190** | `grep` sobre `--include=*.py` |
| Declaraciones de ruta (`path`/`re_path`) por apps | ~**490** | suma por app de `grep -E "path\(|re_path\("` |
| Migraciones | **126** | `find -path '*/migrations/0*.py'` |
| Management commands | **28** | `find -path '*/management/commands/*.py'` (sin `__init__`) |
| Plantillas HTML | **305** | `find -name '*.html'` (excl. venvs) |
| Archivos JS (grafo) / CSS estáticos | 155 / ~8+ | grafo 2026-07-21; `find static -name '*.css'` |
| Funciones de test (`def test_`) | ~**1.496** | `grep -hoE "def test_"` sobre código de apps |
| Commits (git) | **891** | `git rev-list --count HEAD` |

### Detalle por aplicación (modelos / rutas / tests / commands / migraciones)

Conteos por app (grep dirigido, 2026-07-21):

| App | Modelos* | Rutas | Tests | Cmds | Migr. |
|---|---:|---:|---:|---:|---:|
| contabilidad | 27 | 90 | 353 | 4 | 9 |
| reservas | 43 | 78 | 406 | 8 | 44 |
| usuarios | 11 | 62 | 164 | 5 | 23 |
| nomina | 1+ | 68 | 67 | 2 | 9 |
| sucursales | 1+ | 46 | 39 | 1 | 2 |
| crm | 8 | 16 | 89 | 0 | 4 |
| catalogs | 3 | 26 | 53 | 2 | 4 |
| coa | 3 | 13 | 37 | 0 | 2 |
| reports | 0 | 6 | 55 | 0 | 0 |
| banco | 4 | 19 | 16 | 0 | 4 |
| ledger | 4 | 13 | 30 | 3 | 3 |
| tutoriales | 3 | 14 | 43 | 1 | 1 |
| documentos | 5 | 11 | 38 | 0 | 16 |
| operations | 1 | 6 | 15 | 0 | 1 |
| divisas | 4 | 10 | 35 | 1 | 4 |
| dashboard | 0 | 1 | 19 | 0 | 0 |
| core | 0 | 0 | 29 | 1 | 0 |
| security | 0 | 7 | 8 | 0 | 0 |

\* Conteo por `grep` de clases con `models.Model` en la misma línea; algunos
modelos heredan de clases base y no se cuentan (subestima). El grafo reporta
`reservas` como el mayor agregado (~42–43 modelos concretos/derivados).

## 3. Integraciones externas (verificadas)

| Integración | Uso | Evidencia |
|---|---|---|
| PostgreSQL | Fuente de verdad transaccional | `settings.py`, `.env` |
| Redis | Broker de Django Q2 (DB 0) + cache/sesiones (DB 1) | `Q_CLUSTER`, `CACHES` |
| S3-compatible (boto3/django-storages) | Media/documentos/exports durables en prod | `settings.py` `USE_S3_MEDIA`, `STORAGES` |
| SMTP (Gmail) | Correos (recibos, avisos) | `settings.py` EMAIL_*; `PUBLIC_SITE_URL` para correos desde qcluster |
| ipinfo | Geolocalización de IP (gate de ubicación/auditoría) | `IPINFO_TOKEN`, `ipinfo` en requirements |
| Google Maps API | Mapas en UI | `GOOGLE_MAPS_API_KEY`, context processor |
| Railway | Hosting (web + worker + Postgres + Redis) | `railpack.json`, settings de proxy |
| DGII (fiscal RD) | Reportes 606/607/608/623 (formato, no API) | `contabilidad/reporting/dgii_*` |

## 4. Procesos en segundo plano (Django Q2)

- **28 archivos** referencian Django Q2 (`grep -l "async_task|django_q"`).
- Agendado central: `operations/lifecycle.py::schedule_django_q_job`, con un
  `_schedule_job` por app.
- Patrón de **jobs durables** por dominio: `CatalogJob`, `ChartAccountJob`,
  `CRMExportJob`, `FXExportJob`, `ReservationJob`, `UserExportJob`, jobs DGII.
- Estado durable en PostgreSQL; experiencia compartida en `operations` (feed,
  reintentos, descartes). `transaction.on_commit(...)` para trabajo post-commit.

## 5. Cobertura de pruebas — alcance y límites

- ~**1.496** funciones `def test_` en el código de apps (pytest + pytest-django).
- Pruebas JS con **Jest** (formularios de reservas/pagos) y **Playwright**.
- **No se midió cobertura de líneas** (`coverage`) en esta tarea: requeriría
  correr la suite completa contra PostgreSQL, fuera del alcance de captura.
  El número anterior es un **conteo de funciones de test**, no cobertura.
- No se ejecutó la suite en esta sesión (solo `manage.py check`, que pasó).

## 6. Cómo reproducir los conteos

```bash
# LOC/archivos Python (excl. venvs y migraciones)
find . -name "*.py" -not -path "./env/*" -not -path "./.codex_venv/*" \
  -not -path "*/__pycache__/*" -not -path "*/migrations/*" | wc -l

# Funciones de test
grep -rhoE "def test_" --include=*.py . | wc -l   # (filtrando venvs)

# Migraciones / commands / templates
find . -path "*/migrations/0*.py" | wc -l
find . -path "*/management/commands/*.py" ! -name "__init__.py" | wc -l
find . -name "*.html" | wc -l

# Commits
git rev-list --count HEAD
```
