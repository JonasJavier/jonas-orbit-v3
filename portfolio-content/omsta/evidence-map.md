<!-- portfolio-content/omsta/evidence-map.md -->

# Mapa de evidencia — OMSTA

> **Fecha:** 2026-07-21 · **HEAD:** `da5a86b3`
> Cada afirmación importante del caso de estudio se enlaza a su evidencia y se
> etiqueta. **Regla:** el caso final no presenta una inferencia como hecho probado.

**Etiquetas:** `VERIFICADO` (código/config/git/docs) · `INFERENCIA` (juicio
profesional fundado) · `REQUIERE CONFIRMACIÓN` (dato de negocio sin evidencia en el
repo) · `NO DEMOSTRADO` (fuera de alcance de esta tarea).

| # | Afirmación | Tipo | Evidencia | Ruta/archivo | Confianza |
|---|---|---|---|---|---|
| 1 | OMSTA es un ERP real de agencia de viajes en producción | Producto | Título de UI «OMSTA», despliegue Railway, incidentes | UI; `railpack.json`; `docs/incidentes/` | Alta · VERIFICADO |
| 2 | Stack: Django 5.2.6 + DRF 3.16.1 | Técnica | requirements + versión en runtime | `requirements.txt`; `settings.py` | Alta · VERIFICADO |
| 3 | PostgreSQL es la fuente de verdad (SQLite solo fallback) | Técnica | Config de BD | `settings.py` (`USE_POSTGRES`); `docs/architecture/postgres.md` | Alta · VERIFICADO |
| 4 | Redis para colas (Q2, DB0) y cache/sesión (DB1), con fallback | Técnica | Config Redis/Q2/cache | `settings.py` `_redis_config_from_env`, `Q_CLUSTER`, `CACHES` | Alta · VERIFICADO |
| 5 | Tareas en 2.º plano con Django Q2 (no Celery) | Técnica | app + cluster + servicio | `INSTALLED_APPS`; `operations/lifecycle.py`; regla en `AGENTS.md` | Alta · VERIFICADO |
| 6 | Contabilidad de doble partida con perfiles de posteo | Técnica/Producto | Modelos + UI de asientos balanceados | `ledger/` (`JournalEntry/Line`, `PostingProfile`); captura `15` | Alta · VERIFICADO |
| 7 | Cumplimiento fiscal DGII 606/607/608/623 | Producto | Módulos y modelos DGII, seeds demo | `contabilidad/reporting/dgii_*`; `seed_dgii_*` | Alta · VERIFICADO |
| 8 | Multimoneda con snapshots de tasa en el pago | Técnica | Modelos divisas + snapshots en `Pago` | `divisas/`; `reservas/models/payments.py` | Alta · VERIFICADO |
| 9 | Reserva multi-producto (hotel, vuelo, crucero, paquete, seguro) | Producto | Modelos verticales | `reservas/models/` | Alta · VERIFICADO |
| 10 | Idempotencia y validez de pagos, correcciones y reembolsos | Técnica | Métodos y modelos de pago | `reservas/models/payments.py` (`Pago.valid()/voided()`) | Alta · VERIFICADO |
| 11 | Capa de servicios explícita para el dinero | Técnica | Servicios de posteo/planes/salud de pagos | `contabilidad/services/`; `reservas/services/`; `ledger/services/posting.py` | Alta · VERIFICADO |
| 12 | Permisos por usuario/rol/sucursal/módulo/propiedad | Seguridad | Política + middleware + modelo | `security/access_policy.py`; `ModuleRoleAccessMiddleware`; `UsuarioPersonalizado` | Alta · VERIFICADO |
| 13 | Auditoría de actividad y gate de ubicación | Seguridad | Modelos + middleware | `usuarios` (`UserActivityLog`); `security/middleware.py` | Alta · VERIFICADO |
| 14 | Multisucursal con membresías por rol | Producto | Modelos + API | `sucursales/` (`SucursalMembership`) | Alta · VERIFICADO |
| 15 | Generación de PDF (recibos/reportes) con WeasyPrint | Técnica | Servicio PDF + libs de build | `core.pdf`; `reservas/services/pdf.py`; `railpack.json` | Alta · VERIFICADO |
| 16 | Almacenamiento S3-compatible desacoplado del disco local | Técnica | Config storages | `settings.py` `USE_S3_MEDIA`, `STORAGES`; `docs/architecture/storage.md` | Alta · VERIFICADO |
| 17 | Resolvió un error real de negocio (reserva #72: excedente→crédito) | Resultado | Incidente + PR + comando de diagnóstico | `docs/incidentes/2026-07-20-reserva-72-excedente.md`; PR `fix/recibo-excedente-reserva-72`; `diagnosticar_excedente_reserva` | Alta · VERIFICADO |
| 18 | Mantenimiento en producción con disciplina (891 commits, ~16 meses, PRs hasta #199) | Proceso | Historial git | `git log`, `git rev-list --count` | Alta · VERIFICADO |
| 19 | Refactor de deuda ejecutado (ruptura del ciclo ledger↔contabilidad, partición DGII) | Proceso | Documentos de arquitectura versionados | `docs/architecture/arquitectura-grafo-2026-07-21.md` | Alta · VERIFICADO |
| 20 | Suite de pruebas sustancial (~1.496 `def test_` + Jest) | Calidad | Conteo + config | `grep`; `pytest.ini`; `jest.config.js` | Media-alta · VERIFICADO (conteo, no cobertura) |
| 21 | Despliegue en Railway con web + worker separados | Técnica | Config despliegue | `railpack.json`; `docs/agents/deployment-checks.md` | Alta · VERIFICADO |
| 22 | El sistema centraliza reservas, cobros, contabilidad, nómina y banca | Producto | Apps + URLs | `INSTALLED_APPS`; `urls.py` | Alta · VERIFICADO |
| 23 | Nivel de decisiones por encima de la media para su porte | Calidad | Juicio (coincide con opinión del grafo, que es juicio) | `docs/architecture/arquitectura-grafo-2026-07-21.md` §9 | Media · INFERENCIA |
| 24 | El sistema reemplaza hojas de cálculo/sistemas separados en la operación | Producto | Alcance del sistema | apps de dominio | Media · INFERENCIA |
| 25 | Redujo errores operativos / ahorró tiempo / aumentó ventas | Resultado | — | — | Pendiente · REQUIERE CONFIRMACIÓN |
| 26a | El negocio opera 2 sucursales reales: Santo Domingo y Santiago | Contexto | **Confirmado por Jonás (2026-07-22)** en conversación | — | Alta · CONFIRMADO POR JONÁS |
| 26b | Nº real de usuarios/clientes/reservas en producción | Resultado | Solo datos de dev (sintéticos) | `demo/demo-data.md` | Pendiente · REQUIERE CONFIRMACIÓN |
| 27 | Rol/autoría exacta de Jonás (único, líder, con agentes) | Contexto | Autor de merges en git | `git log` (`JonasJavier`/`Jonasavage01`) | Pendiente · REQUIERE CONFIRMACIÓN |
| 28 | Nombre real del cliente / grado de identificación pública | Contexto | `CompanySettings` (anonimizado en dev) | `../demo/demo-data.md` | Pendiente · REQUIERE CONFIRMACIÓN |
| 29 | Cobertura de líneas de test | Calidad | No ejecutada | — | NO DEMOSTRADO |
| 30 | Rendimiento / uptime / escala en producción | Operación | No medido | — | NO DEMOSTRADO |
| 31 | Política de backups en producción | Operación | No hay scripts en repo | — | REQUIERE CONFIRMACIÓN |

## Cómo usar este mapa al redactar

- Toda afirmación del `case-study-draft.md` debe poder rastrearse a una fila
  `VERIFICADO` o marcarse explícitamente como inferencia.
- Las filas `REQUIERE CONFIRMACIÓN` **no** se publican como hechos; o se omiten o se
  formulan como preguntas a Jonás (ver §"Dudas" en `case-study-notes.md`).
- Las cifras de negocio (ventas, ahorro, usuarios) **no se inventan**: sin dato real
  y verificable, se usa un resultado cualitativo honesto.
