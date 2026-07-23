<!-- portfolio-content/omsta/scripts/README.md -->

# Scripts — paquete OMSTA

Scripts auxiliares usados para investigar y capturar OMSTA. Los que están en esta
carpeta son **permanentes y reutilizables**; los de un solo uso (creación del
usuario demo, anonimización, sondeos de BD) se ejecutaron desde el scratchpad y se
documentan aquí para trazabilidad.

## Incluidos aquí

### `capture_screenshots.mjs`
Captura automatizada con Playwright (Chromium headless). Inicia sesión con el
usuario demo y recorre las rutas reales de OMSTA tomando capturas 1440×900 (desktop)
y 390×844 (mobile). **No muta datos** (solo GET).

```bash
# Requiere el servidor Django en 127.0.0.1:8000 y el usuario demo creado.
node "portfolio-content/omsta/scripts/capture_screenshots.mjs"
```
Variables opcionales: `OMSTA_BASE_URL`, `OMSTA_DEMO_USER`, `OMSTA_DEMO_PASS`,
`OMSTA_OUT_DIR`, `OMSTA_REPO` (para resolver `playwright` desde el node_modules del
repo OMSTA vía `createRequire`).

### `capture_deep.mjs`
Segunda pasada de captura (2026-07-22) con las pantallas de **profundidad**:
nómina (dashboard con datos, empleados, períodos, detalle de período `/nomina/periodos/14/`,
retenciones), sucursal detalle/reporte (`/sucursales/170/`), formulario de usuario
con roles (`/usuarios/users/363/edit/`) y ficha de empresa CRM. Requiere haber
ejecutado antes `python manage.py seed_nomina_demo` (ver `../demo/demo-data.md`).
Los IDs (14, 170, 363) corresponden a la base de desarrollo actual; ajustar si se
resiembra.

## Scripts de un solo uso (ejecutados desde scratchpad, documentados)

| Script | Qué hizo |
|---|---|
| `probe_db.py` | Conteo de solo lectura de usuarios, reservas, pagos, clientes, sucursales, asientos, etc. |
| `create_demo_user.py` | Creó el superusuario demo `demo_portafolio` (idempotente). |
| `pii_scan.py` | Escaneó correos/teléfonos/nombres reales en la base de desarrollo. |
| `anonymize_dev.py` | Neutralizó a valores ficticios el `CompanySettings` (RNC/tel/email), un cliente y un email de usuario. |
| `recapture_ops.mjs` | Recaptura puntual (obsoleto: la ruta de operaciones es un fragmento HTMX). |

> Reproducirlos requiere: venv `env/` del repo OMSTA, `PYTHONPATH` = raíz del repo,
> `DJANGO_SETTINGS_MODULE=CristecnoViajes_SRL.settings`. Ver `../demo/demo-data.md`.

## Sanitización de imágenes (Pillow) — no fue necesaria

La sanitización a nivel de píxel **no se necesitó**: toda la PII se neutralizó en la
base de datos **antes** de recapturar, de modo que las imágenes ya nacen limpias. Si
en el futuro hiciera falta redactar una región de una captura, el patrón recomendado
es un script con Pillow que:

1. lea de `screenshots/raw/`,
2. dibuje rectángulos opacos sobre las regiones sensibles,
3. escriba en `screenshots/sanitized/` (nunca sobre el original),
4. documente qué regiones se ocultaron en `screenshots/manifest.md`.
