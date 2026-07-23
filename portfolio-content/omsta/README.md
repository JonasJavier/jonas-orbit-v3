<!-- portfolio-content/omsta/README.md -->

# Paquete de caso de estudio — OMSTA

> **Proyecto principal de F1A / Endurance** en el portafolio Jonás Orbit v3.
> Todo el material para convertir OMSTA en el caso de estudio principal.

- **Fecha de generación:** 2026-07-21
- **Producto:** **OMSTA** — repositorio `CristecnoViajes_SRL`
- **Commit analizado (HEAD):** `da5a86b3` · rama `main`
- **Entorno inspeccionado:** desarrollo local (Windows 11 + PowerShell),
  PostgreSQL `cristecno_db`, Django 5.2.6 / Python 3.12.10, `http://127.0.0.1:8000`
  (usuario demo `demo_portafolio`). **No es producción.**

---

## Estado del paquete

| Área | Estado |
|---|---|
| Descubrimiento del stack | ✅ Verificado con archivos concretos |
| Inventario de módulos (18 apps) | ✅ Completo |
| Entorno levantado + recorrido | ✅ 38 capturas (2 pasadas) |
| Capturas raw / principales / secundarias | ✅ 38 / 16 / 22 |
| Profundidad nómina/sucursales/CRM/usuarios | ✅ Añadida 2026-07-22 a petición de Jonás |
| Manifest de capturas | ✅ Completo |
| Arquitectura + 4 diagramas Mermaid | ✅ Completo |
| Métricas verificables | ✅ Completo |
| Mapa de evidencia | ✅ Completo |
| Notas factuales | ✅ Completo |
| Borrador del caso de estudio | ✅ Completo (pendiente confirmación de Jonás) |
| Resumen para la tarjeta | ✅ Completo |
| Guion de demo (60 s / 3 min / 7-10 min) | ✅ Completo |
| Branding | ✅ Assets + guía |

### Qué está terminado
Investigación completa, capturas curadas y sanitizadas, arquitectura con diagramas,
métricas verificables, evidencia trazable y todo el contenido escrito (notas,
borrador, resumen, demo).

### Qué falta confirmar (Jonás) — ver `case-study-notes.md` §18
1. Cómo nombrar públicamente al cliente/negocio.
2. Cómo describir la autoría (único / principal / con agentes de IA).
3. Si hay **métricas de negocio reales** publicables (no se inventó ninguna).
   *Parcial: ✅ 2 sucursales reales (Santo Domingo y Santiago) — confirmado 2026-07-22.*
4. Formato del enlace/demo (pública, video, o recorrido local).
5. Política de backups / uptime en producción.

---

## Índice de documentos

### Caso de estudio
- [`case-study-notes.md`](case-study-notes.md) — volcado factual (18 secciones).
- [`case-study-draft.md`](case-study-draft.md) — **borrador profesional** (17 secciones).
- [`case-study-summary.md`](case-study-summary.md) — resumen + SEO/OG + 50/100/200 palabras.
- [`evidence-map.md`](evidence-map.md) — cada afirmación con su evidencia y etiqueta.

### Arquitectura ([`architecture/`](architecture/))
- [`system-overview.md`](architecture/system-overview.md) — visión general + contexto + contenedores.
- [`module-map.md`](architecture/module-map.md) — 18 apps, dependencias, ciclos.
- [`data-flow.md`](architecture/data-flow.md) — 4 flujos de extremo a extremo.
- [`deployment.md`](architecture/deployment.md) — Railway, procesos, variables.
- [`diagrams/`](architecture/diagrams/) — fuentes Mermaid (`.mmd`) exportables.

### Métricas ([`metrics/`](metrics/))
- [`technical-inventory.md`](metrics/technical-inventory.md) — stack y superficie con evidencia.
- [`repository-analysis.md`](metrics/repository-analysis.md) — git, actividad, evolución.
- [`verified-results.md`](metrics/verified-results.md) — comprobado / inferencia / pendiente.

### Capturas ([`screenshots/`](screenshots/))
- [`manifest.md`](screenshots/manifest.md) — catálogo completo con captions y alt.
- `raw/` (30) · `sanitized/` (16 principales) · `secondary/` (14).

### Demo ([`demo/`](demo/))
- [`demo-script.md`](demo/demo-script.md) — 3 guiones.
- [`demo-data.md`](demo/demo-data.md) — entorno, datos y cambios realizados.
- [`capture-plan.md`](demo/capture-plan.md) — método de captura.

### Branding y scripts
- [`branding/README.md`](branding/README.md) — logo, paleta, favicons.
- [`scripts/README.md`](scripts/README.md) — captura y utilidades.

---

## Los 5-7 pilares narrativos

1. **Operación centralizada** — dashboard ejecutivo con KPIs y alertas.
2. **Gestión integral de reservas** — hotel/vuelo/crucero/paquete/seguro, planes de pago.
3. **CRM conectado a la operación** — clientes que alimentan reservas y cobros.
4. **Motor financiero-contable de doble partida** — cobros, CxC/CxP, libro mayor, DGII.
5. **Multimoneda y multisucursal** — tasas con snapshot, permisos por sucursal.
6. **Seguridad, roles y auditoría** — acceso por módulo, gate de ubicación, bitácora.
7. **Nómina** — retenciones AFP/SFS/ISR en el mismo ERP.

---

## Top 5 capturas recomendadas
1. `sanitized/01-dashboard-panel-ejecutivo.png` — alcance en una imagen.
2. `sanitized/15-ledger-libro-diario.png` — el diferenciador (doble partida real).
3. `sanitized/04-reserva-detalle.png` — profundidad de producto.
4. `sanitized/31-nomina-periodo-detalle.png` — nómina real conectada a contabilidad.
5. `sanitized/33-sucursal-detalle.png` — la sucursal como unidad operativa completa.

---

## Próximos pasos (para integrar en Endurance)
1. Jonás revisa el borrador y confirma los 5 puntos pendientes (§ arriba).
2. Cerrar la privacidad final de cada captura principal (revisión de Jonás).
3. Definir el enlace/demo (o marcarlo como privado con recorrido guiado).
4. Con el borrador aprobado, construir la ficha/caso en la sección Endurance del
   nuevo portafolio (no se implementa aquí — es material de contenido).

---

## Garantías de esta tarea
- No se expusieron secretos (solo banderas de config no sensibles).
- No se modificó producción; todo fue en desarrollo local.
- No se inventaron funcionalidades ni métricas de negocio.
- PII real de la base de desarrollo anonimizada (documentado en `demo/demo-data.md`).
