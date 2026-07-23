<!-- portfolio-content/omsta/metrics/repository-analysis.md -->

# Análisis del repositorio — OMSTA (CristecnoViajes_SRL)

> **Fecha:** 2026-07-21 · **HEAD:** `da5a86b3` · rama `main`
> Fuente: `git` local + documentos de arquitectura versionados del propio repo.

## 1. Estructura del repositorio

Monolito Django modular. Cada aplicación de negocio adopta capas internas
(`views/ → services/`/`selectors/ → models/`, con `forms/`, `urls/`, `templates/`,
`static/` y `tests/`). Las apps grandes (`contabilidad`, `reservas`) ya están
partidas en paquetes por dominio.

```
CristecnoViajes_SRL/
├── CristecnoViajes_SRL/        # settings, urls, wsgi/asgi, logging
├── security/ core/ operations/ # base transversal (gates, adjuntos, jobs)
├── usuarios/ sucursales/       # identidad, roles, organización
├── crm/ reservas/ documentos/  # clientes y núcleo de negocio
├── contabilidad/ ledger/ coa/  # columna contable (CxC/CxP, libro mayor, plan)
│   banco/ divisas/ reports/
├── nomina/ catalogs/ tutoriales/ dashboard/
├── templates/ static/ media/   # UI compartida
├── scripts/agents/ tools/       # automatización y verificación
└── docs/                        # agentes + arquitectura (líneas base versionadas)
```

Señal de madurez poco común: el repo mantiene **documentos de arquitectura
versionados y con seguimiento de ítems aplicados** (`docs/architecture/`), incluida
una línea base y tres instantáneas de grafo fechadas (2026-07-18/20/21).

## 2. Áreas más activas (commits que tocan cada ruta)

| Área | Commits | Lectura |
|---|---:|---|
| `contabilidad` | 250 | Mayor integrador; CxC/CxP, pagos, posteo, DGII |
| `reservas` | 244 | Núcleo de negocio; reservas, pagos, planes |
| `templates` | 173 | UI compartida en evolución continua |
| `static` | 119 | JS/CSS de formularios financieros |
| `usuarios` | 101 | Identidad, roles, auditoría, presencia |
| `nomina` | 84 | Nómina con retenciones de ley |
| `crm` | 77 | Clientes/empresas |
| `ledger` | 68 | Libro mayor y perfiles de posteo |
| `sucursales` | 61 | Multisucursal, membresías, API |

(`git log --oneline -- <ruta> | wc -l`, 2026-07-21.)

La concentración en `contabilidad` + `reservas` coincide con el análisis del grafo:
esas dos apps son **~51 %** del código de negocio (~112.800 de ~219.000 LOC).

## 3. Historial y ritmo (891 commits)

- **Inicio:** 2025-04-02 (*Initial commit*). **Último:** 2026-07-21.
- **~16 meses** de desarrollo. Arranque exploratorio (abr–sep 2025, pocos commits/mes)
  y **fase intensiva sostenida** desde octubre 2025:

| Mes | Commits | | Mes | Commits |
|---|---:|---|---|---:|
| 2025-10 | 111 | | 2026-02 | 137 |
| 2025-11 | 136 | | 2026-05 | 61 |
| 2025-12 | 72 | | 2026-06 | 109 |
| 2026-01 | 54 | | 2026-07 | 124 |

- **Flujo de PRs real** hasta `#199`, con ramas descriptivas por tipo de trabajo:
  - `fix/recibo-excedente-reserva-72` → corrección derivada de un caso real de producción.
  - `codex/catalogs-production-readiness`, `codex/coa-guided-catalog`,
    `codex/add-accounts-payable-report-implementation` → features y *production-readiness*.
  - `railway/fix-deploy-*`, `railway/code-change-*` → integración con despliegue Railway.

## 4. Evolución observable de módulos (del grafo versionado)

Las instantáneas de grafo documentan refactors ejecutados y verificados en días
recientes (evidencia de **deuda que se paga, no que se acumula**):

- **Ruptura del ciclo `ledger ↔ contabilidad`:** el motor de posteo por documento
  (27 rutinas) salió de `ledger` a `contabilidad/services/posting/`;
  `ledger/services/posting.py` pasó de **96 KB a 5.5 KB** (10 primitivas
  genéricas). `ledger/{models,forms,services}` quedó con **cero imports** de
  contabilidad; la sincronización se invirtió vía `ledger/source_registry.py`.
- **Partición de reportería DGII:** `dgii_606.py` (139 KB) y `dgii.py` (127 KB) →
  paquetes de 10 y 14 módulos; ningún archivo DGII supera 22 KB (antes dos
  sumaban 266 KB).
- **Partición de `reservas/forms.py`** (109 KB) en paquete por responsabilidad.
- **Eliminación de la inversión `services → views`** (permisos de pago movidos a
  `contabilidad/services/payment_permissions.py`).

## 5. Complejidad y hotspots (señales, no defectos)

Del grafo 2026-07-21 (complejidad cognitiva/ciclomática):

| Símbolo | Archivo | Líneas | Cognit. |
|---|---|---:|---:|
| `reservas_home` | `reservas/views/public.py` | 683 | 101 |
| `import_chart_accounts` | `coa/services/importer.py` | 317 | 86 |
| `CuentasPorPagarView.get_context_data` | `contabilidad/views/payables.py` | 766 | 57 |
| `export_reservation_payments_xlsx` | `contabilidad/views/payments.py` | 310 | 54 |
| `build_dgii_606_queryset` | `contabilidad/reporting/dgii_606/build.py` | 695 | 48 |

Los **god-models** son `Reserva` (52 métodos) y `Pago` (32): concentran la lógica
transaccional. La agenda vigente del propio proyecto prioriza descomponer estas
vistas/modelos con pruebas dirigidas.

## 6. Señales de mantenimiento en producción

- Reportes de incidentes documentados (`docs/incidentes/2026-07-20-reserva-72-excedente.md`),
  con cronología de auditoría, corrección de UX del recibo y del aviso de crédito.
- Comandos de diagnóstico de solo lectura (`diagnosticar_excedente_reserva`).
- Referencias a "reportes" numerados en el código (p.ej. gate de ubicación
  "reporte #83") → seguimiento formal de hallazgos.
- Ramas y PRs de *production-readiness* y *fix-deploy* de Railway.

## 7. Higiene pendiente (honesta)

- Historial con commits `xd` en tramos recientes: una convención mínima
  (`app: resumen imperativo`) recuperaría el valor del historial y del análisis de
  co-cambio (lo señala el propio documento de arquitectura del repo).
- Dependencias muertas de Celery/kombu/billiard/amqp por retirar de
  `requirements.txt`.
