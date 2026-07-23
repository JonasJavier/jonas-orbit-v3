<!-- portfolio-content/omsta/demo/capture-plan.md -->

# Plan de captura — OMSTA

> Cómo se generaron las capturas y cómo reproducirlas o ampliarlas.

## 1. Método

- **Herramienta:** Playwright (Chromium headless) vía
  `scripts/capture_screenshots.mjs`.
- **Login:** usuario demo `demo_portafolio` (superadmin) en `http://127.0.0.1:8000`.
- **Viewport:** 1440×900 (desktop), 390×844 (mobile), `deviceScaleFactor: 1`,
  `locale: es-DO`.
- **Estabilización:** `waitUntil: domcontentloaded` + `networkidle` + 1.6 s de
  asentamiento (para gráficos/animaciones).
- **Sin mutaciones:** el script solo hace GET; no envía formularios.

## 2. Requisitos para reproducir

1. Base de desarrollo `cristecno_db` migrada y sembrada (ver `demo-data.md`).
2. Servidor Django en `127.0.0.1:8000` (`manage.py runserver --noreload`).
3. Redis arriba (o `USE_REDIS_CACHE=False`).
4. Usuario `demo_portafolio` creado (script en `scripts/`).
5. Ejecutar:
   ```bash
   node "portfolio-content/omsta/scripts/capture_screenshots.mjs"
   ```
   (Playwright se resuelve desde el `node_modules` del repo OMSTA vía `createRequire`.)

## 3. Cobertura capturada

Dos pasadas: 26 rutas desktop + 4 mobile (2026-07-21) y 9 rutas de profundidad —
nómina, sucursales, usuarios, CRM — (2026-07-22, `scripts/capture_deep.mjs`, tras
sembrar `seed_nomina_demo`) = **38 capturas** (`screenshots/raw/`). Selección de
16 principales en `sanitized/` y 22 secundarias en `secondary/`. Detalle y captions
en `screenshots/manifest.md`.

## 4. Reglas de calidad aplicadas

- Tamaños consistentes; esperar carga; evitar spinners/tooltips accidentales.
- Datos de desarrollo coherentes y **sintéticos** (PII anonimizada previamente).
- Sin DevTools, sin barras de depuración, sin notificaciones técnicas.
- Nombres descriptivos y numerados por narrativa.

## 5. Capturas pendientes / ampliables (opcional, futuro)

- **Operaciones con contenido:** ejecutar un job real (p.ej. una exportación con el
  worker `qcluster` arriba) y capturar el *tray* de operaciones con estado
  en progreso/completado.
- **Recibo/factura PDF:** capturar un recibo generado **después** de neutralizar los
  datos de empresa (ya hecho en dev) — muestra la generación de documentos.
- **Reporte DGII 606/607:** una vista o export de reporte fiscal (con datos demo).
- **Estados vacíos y de error** de formularios clave (validaciones), para una
  galería de UX.
- **Roles distintos:** repetir capturas clave con un usuario de rol `reservas` o
  `contabilidad` (no superadmin) para evidenciar el control de acceso por módulo.
