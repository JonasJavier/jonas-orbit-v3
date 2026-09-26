<!-- portfolio-content/omsta-2026/case-notes.md · 2026-09-25 · commit 3f5cea73 -->
# OMSTA — notas del caso (factuales, con evidencia)

Notas en bruto para redactar el caso de estudio. Cada viñeta lleva su
evidencia (archivo del repo, documento o hash de commit). Etiquetas:
**[C]** comprobado en el repo · **[I]** inferencia · **[P]** pendiente.
Cifras: ver `metrics.md`.

---

## Contexto

- ERP de una agencia de viajes de **República Dominicana**; la marca visible
  del producto es **Omsta** (el paquete Python y el repo conservan el nombre
  legal de la empresa). [C] `docs/tecnica/arquitectura.md` §1;
  `docs/funcional/alcance-funcional.md` §1.
- Propósito declarado: vender el servicio, cobrarlo, facturarlo con validez
  fiscal, contabilizarlo, pagar al suplidor y declararlo a la DGII «sin salir
  del sistema y sin re-teclear el mismo dato dos veces». [C]
  `docs/funcional/alcance-funcional.md` §1.
- Principio de diseño: «un hecho económico se captura una sola vez y se
  propaga» (pago → movimiento bancario → asiento → cuota → recibo). [C] mismo doc.
- Historia: primer commit 2025-04-02 (`11fa52ee`); en producción en Railway;
  app móvil añadida en septiembre de 2026 (`273780c4`, `bac191cd`). [C] git.

## Problema

- La agencia necesitaba un solo sistema para ocho tipos de producto: hotel,
  vuelo, crucero, paquete internacional, seguro, tour, transporte y otros
  servicios. [C] `reservas/models/reservation.py` (`TipoReservaChoices`).
  (La doc habla de «seis verticales»; el código tiene 8 opciones. [I] la doc
  cuenta verticales con formulario propio.)
- El dinero cruza dominios: reserva → pago → factura con NCF → asiento →
  banco → CxP del suplidor → 606/607. Hace falta atomicidad real entre ellos.
  [C] `docs/tecnica/arquitectura.md` §8 y §12.
- Los vendedores necesitaban operar fuera de la oficina: registrar abonos con
  foto del comprobante, consultar reservas y clientes. [C]
  `docs/architecture/plan-app-movil-2026-09.md` §2 («Alcance v1»).

## Usuarios (roles)

- Cinco roles base: `superadmin`, `admin`, `contabilidad`, `reservas`,
  `clientes`. [C] `docs/funcional/roles-y-permisos.md` (tabla de roles).
- Segundo eje: **módulos** sueltos concedidos por el superadmin (`crm`,
  `reservas`, `cobros`, `contabilidad`); jerarquía
  `contabilidad ⊇ reservas ⊇ crm`; `cobros` registra pagos pero no aplica
  asientos ni factura. [C] mismo doc; `security.access_policy.roles_efectivos`.
- Acceso por prefijo de URL (`MODULE_ACCESS_RULES`) en
  `security.ModuleRoleAccessMiddleware`. [C] `docs/tecnica/arquitectura.md` §6–7.
- En la app, la guía dice que solo `admin` y `contabilidad` ven la pestaña
  Cobros (`docs/operaciones/app-movil.md` §4.4), pero el código incluye también
  el rol `cobros`. [C] ver `mobile/modules.md`. La guía está desfasada.

## Restricciones

- **Fiscal DGII**: formatos 606, 607, 608 y 623; el sistema prepara, valida y
  descarga TXT/XLSX, **no transmite** a la DGII (acción humana). [C]
  `docs/architecture/dgii-cycle.md` §1.
- **NCF**: numeración automática por rango autorizado, elegido por tipo de
  receptor, con unicidad en BD y auditoría; corrección de NCF emitido por
  comando que simula por defecto. [C] `docs/tecnica/numeracion-ncf.md`;
  `contabilidad/services/ncf_sequences.py`.
- **Multimoneda DOP/USD**: tasa congelada en el pago; cada capa cuadra contra
  su propio total; mapeo banco↔cuenta por empresa y moneda. [C]
  `docs/tecnica/arquitectura.md` §8 (invariante 6);
  `docs/funcional/alcance-funcional.md` (pagos y banco).
- **Sucursales**: la dirección y el contacto de cada documento salen de
  `reserva.sucursal`; RNC y razón social son globales. Permisos por usuario,
  rol, sucursal, departamento y propiedad. [C] `docs/tecnica/arquitectura.md`
  §10; `CLAUDE.md` §6.
- **Invariantes contables** defendidos en código: CxC nunca acreedora, CxP
  nunca deudora, anticipos (2201) en cero al facturar, asiento publicado no se
  reescribe, pago anulado = `VOIDED` en `Pago.save()`, período cerrado bloquea
  en `JournalEntry.post()`. [C] `docs/tecnica/arquitectura.md` §8.
- **Entorno Windows + PowerShell 5.1** como entorno principal de desarrollo
  (sin `&&`, rutas y encoding). [C] `CLAUDE.md` (cabecera);
  `docs/agents/windows-environment.md`; `docs/operaciones/app-movil.md` §6.
- **Equipo mínimo**: 3 identidades de autor, una con 1.128 de 1.139 commits.
  [C] `git shortlog -sn`. «Un único desarrollador»: **confirmado por Jonás** (2026-09-26): 100 % en solitario.
- **Infraestructura acotada**: Django Q2 en vez de Celery; PostgreSQL única
  fuente de verdad; Redis volátil. [C] `docs/tecnica/arquitectura.md` §2 y §12;
  `docs/architecture/redis-and-q2.md`.
- Datos sensibles (comprobantes con datos personales/financieros) → bucket S3
  privado con URL firmada. [C] `docs/tecnica/arquitectura.md` §12.

## Proceso (cómo se trabaja)

- **Solo `main`**, sin ramas ni worktrees salvo necesidad declarada; motivo:
  la auditoría del 2026-09-09 halló trabajo perdido en ramas borradas sin
  fusionar. [C] `docs/agents/flujo-git.md` §1 y §5.
- Historia anterior con PRs: 181 merges «Merge pull request», muchos desde
  ramas `codex/…`. [C] `git log --merges`. Hoy: commits directos en `main`
  (último merge `f182c1d1`, 2026-09-22). [C]
- **Desarrollo asistido por agentes** (Codex y Claude Code): reglas en
  `AGENTS.md` (15 archivos `AGENTS.md` versionados: raíz, 13 apps Django y `mobile/`), `CLAUDE.md`,
  `docs/agents/`; 113 commits con trailer `Co-Authored-By: Claude`. [C]
- Grafo de código (`codebase-memory-mcp`) consultado antes de búsquedas
  amplias; línea base arquitectónica levantada con ese grafo. [C]
  `docs/agents/codebase-memory.md`; `docs/architecture/codebase-baseline-2026-07.md` §3.
- **Verificación con scripts versionados**: `scripts/agents/django-check.ps1`,
  `verify-templates.ps1`, `test-targeted.ps1`, `test-full.ps1`,
  `verify-postgres.ps1`, `lint.ps1`, más scripts de certificación contable por
  fase. [C] `scripts/agents/`.
- Informe honesto al cerrar: pasada / fallida / bloqueada / no ejecutada. [C]
  `CLAUDE.md` §10.
- **CI**: GitHub Actions `ci.yml` (ruff, black, `manage.py check`,
  `makemigrations --check`, pytest con cobertura) y `mobile.yml` (tipos TS
  iguales al esquema OpenAPI, `expo-doctor`). [C] `.github/workflows/`.
- Auditores propios como comandos (`auditar_contabilidad`,
  `verificar_identidades_contables`, `auditar_seguridad`, `auditar_banco`…) y
  pantalla «Salud contable». [C] `docs/tecnica/arquitectura.md` §8.
- Auditoría contable por fases con evidencia en
  `docs/auditoria-contable-2026-09/` (fase 0 y 1 cerradas el 2026-09-25). [C]

## Decisiones de arquitectura

- **Monolito modular Django**, no microservicios: un equipo, transacciones que
  cruzan dominios. [C] `docs/tecnica/arquitectura.md` §12.
- **HTML renderizado en servidor**, sin SPA ni build step (WhiteNoise sirve
  CSS/JS tal cual). [C] mismo doc §1 y §11.
- **Capas**: `views/` orquesta, `services/` abre la transacción y emite el
  asiento, `selectors/` lee, invariantes en `Model.save()`. [C] mismo doc §4.
- **Fronteras protegidas por tests**: `ledger` no importa `contabilidad`
  (registro de fuentes `ledger/source_registry.py`); `reservas` habla con
  contabilidad por `core.contracts.accounting` (test
  `reservas/tests/test_accounting_boundary.py`); techo de superficie pública de
  `Reserva`/`Pago` que solo puede bajar (`reservas/tests/test_god_model_surface.py`,
  `contabilidad/tests/test_reservas_boundary.py`). [C]
  `docs/tecnica/arquitectura.md` §5; `docs/architecture/reservas-accounting-contract.md`.
- **Django Q2 y no Celery**; encolar en `transaction.on_commit(...)` cuando el
  job lee datos recién escritos; jobs idempotentes. [C]
  `docs/architecture/redis-and-q2.md`.
- **Redis DB 0 = cola Q2; DB 1 = caché y sesiones**. [C] mismo doc.
- **Recibos en vivo**, no PDF congelado; la factura con NCF es el único
  documento inmutable. [C] `docs/tecnica/arquitectura.md` §10.
- **Paquete contable de factura atómico**: venta, costo/CxP, anticipo de
  proveedor, anticipo de cliente y cobros en borrador en un solo servicio.
  [C] `contabilidad/services/posting/invoice_package.py` (docstring).
- **Snapshot fiscal inmutable** al contabilizar; los documentos fuente mandan
  sobre el mayor para 606/607. [C] `docs/architecture/dgii-cycle.md` §2.
- **App móvil como segundo cliente del mismo backend**: nueva app Django
  `movil/` con prefijo `/api/movil/v1/`, JWT por dispositivo (simplejwt con
  rotación y blacklist; access 15 min, refresh 30 días por defecto),
  middleware propio antes de `RequireLoginMiddleware`, contrato OpenAPI
  (`drf-spectacular`) → tipos TS generados. Motivo: la API existente era solo
  sesión+CSRF y el middleware bloqueaba clientes sin cookie. [C]
  `docs/architecture/plan-app-movil-2026-09.md` §1–2;
  `CristecnoViajes_SRL/settings.py` (`SIMPLE_JWT`, `MovilTokenAuthMiddleware`);
  `docs/operaciones/app-movil.md` §7.
- **La app no calcula saldos ni estados**: traduce su JSON al mismo
  `PaymentForm` web y llama al mismo servicio
  (`register_customer_payment`). [C] `movil/services/pagos.py` (docstring).
- Stack móvil: Expo SDK 57, React Native 0.86, Expo Router, TanStack Query,
  MMKV, SecureStore, biometría. [C] `mobile/package.json`.

## Desafíos

- `contabilidad` es el mayor integrador y hay ciclos
  `contabilidad↔reservas` y `contabilidad↔ledger`. [C]
  `docs/architecture/codebase-baseline-2026-07.md` §2 y §7.
- Hotspots: `reservas/models`, `CuentasPorPagarView` (~1.204 líneas),
  constructor 606 (~643 líneas), JS de formularios de hotel con complejidad
  cognitiva 128. [C] mismo doc §11.
- Pago distribuido entre tres dominios (reservas, contabilidad, ledger). [C]
  mismo doc §12.2.
- Sesiones de agentes paralelas sobre el mismo checkout (puertos compartidos,
  Metro desfasado). [C] `docs/operaciones/app-movil.md` §6 (filas de Metro y
  `runserver` en el mismo puerto).
- Builds nativas: cada dependencia nativa nueva exige un development build
  (~13 min de compilación). [C] `docs/operaciones/app-movil.md` §2–3.

## Incidentes reales resueltos (solo documentados)

- **Doble envío de pagos** → `Pago.idempotency_key` con constraint única
  parcial `uniq_pago_idempotency_key`; el choque con la constraint se trata
  como «ya existía». [C] `docs/tecnica/modelo-de-datos.md` (líneas 132 y 410);
  `reservas/models/payments.py`; constraint introducida en `fa0000df`
  (2026-07-18, `git log -S uniq_pago_idempotency_key`).
- **Reintento móvil devolvía «Posible pago duplicado» (400)** en vez de
  `duplicado=true`: `PaymentForm.clean()` corría antes que el servicio; ahora
  `movil/services/pagos.registrar` resuelve la clave primero. [C]
  `docs/operaciones/app-movil.md` §6; `2d029420` (2026-09-23).
- **Presencia duplicada → `MultipleObjectsReturned`** en `touch_presence`:
  constraint parcial `usr_presence_active_uniq` (una sesión activa por
  usuario+sesión). [C] comentario en `usuarios/models.py`; `e7f4141e`
  (2026-07-11). Que se manifestara como HTTP 500 en producción: [I].
- **GeoIP**: búsqueda por IP cacheada 24 h, caché negativa 1 h
  (`GEOIP_CACHE_KEY`). [C] `usuarios/services/__init__.py`; `5bbe8c12`
  (2026-07-01). La narrativa del incidente no está en `docs/`: [I].
- **Plantillas viejas servidas** por el cached template loader con
  `--noreload`: se declaran loaders explícitos en desarrollo. [C] comentario en
  `CristecnoViajes_SRL/settings.py`; `docs/agents/qa-navegador-local.md`;
  `2b717f09` (2026-09-15).
- **PDF roto en producción por librerías del sistema de WeasyPrint** →
  `railpack.json` con paquetes apt para build y runtime. [C]
  `docs/operaciones/despliegue-railway.md` §4.1; `8cae42dd` (2026-04-28).
- **Sonda de salud**: `/health/` exento de login y de la redirección HTTPS, o
  Railway marca caído un despliegue sano. [C] mismo doc §4.4; `c25e44d8`.
- **P0 contable H-06**: el comprobante del suplidor duplicaba costo y CxP en
  reservas facturadas antes de la cuenta 2107; corregido el mismo día. [C]
  `docs/auditoria-contable-2026-09/fase-0-linea-base.md` §6 y §9; `6892fcb8`.
- **H-09**: editar cualquier tipo de catálogo daba 500 desde 2026-06-20. [C]
  mismo doc §6; `457b5a94`.
- **Crédito a favor inesperado** (descuento aplicado después de saldar la
  reserva): el sistema actuó bien; se documentó para operación. [C]
  `docs/incidentes/2026-07-20-reserva-72-excedente.md`.
- Migración que mezclaba datos e índices rompía el despliegue → partida en
  dos. [C] `f6301f8e` (2026-05-01).

## Aprendizajes

- Invariantes en `Model.save()` y constraints de BD, no en formularios: los
  comandos y reparaciones no pasan por formularios. [C]
  `docs/tecnica/arquitectura.md` §4.
- Idempotencia antes de validar: el formulario ve el reintento como duplicado.
  [C] `movil/services/pagos.py` (comentario en `registrar`).
- Un patrón exento de login abre la puerta también a rutas futuras → comando
  `auditar_seguridad`. [C] `docs/tecnica/arquitectura.md` §6.
- Reutilizar el servicio web desde la API móvil evita dos reglas de negocio.
  [C] `contabilidad/services/receivables/payment_registration.py` (docstring).
- `expo-doctor` antes de cada build; `legacy-peer-deps` oculta peers
  faltantes. [C] `docs/operaciones/app-movil.md` §2.
- Git: trabajo perdido en ramas → política main-only. [C]
  `docs/agents/flujo-git.md`.
- La documentación deriva: `despliegue-railway.md` §7 dice que las
  migraciones no corren solas, pero el servicio web de producción las aplica en
  el pre-despliegue. **Confirmado por Jonás** (2026-09-26): «desde el push corre solo»; la doc está desfasada. — observación de una sesión del 2026-09-18, no
  documentada en el repo; el demo sí lo documenta
  (`docs/operaciones/demo-railway.md` §1).

## Estado actual (2026-09-25)

- **Uso**: en producción a diario con 15 usuarios (dato de Jonás, 2026-09-26).
- **Producción**: web + worker Django Q2 + PostgreSQL + Redis + bucket de media
  + bucket de respaldo PITR en Railway, despliegue automático desde `main`.
  [C] `docs/operaciones/despliegue-railway.md` §1 y §6 (estado verificado el
  2026-08-01; no reverificado hoy [P]).
- **Demo**: proyecto Railway aparte con datos ficticios (`seed_demo`,
  `DEMO_MODE`), reinicio nocturno 4:00 hora de Santo Domingo, mismo `main`.
  [C] `docs/operaciones/demo-railway.md`.
- **App móvil**: en desarrollo activo; development builds internas vía EAS
  (Android); tiendas pendientes (Apple Developer con D-U-N-S, Google Play
  Console). [C] `docs/operaciones/app-movil.md` §1 y §3. Fases completadas
  0 → reservas fase 5 (ciclo de vida) entre el 10 y el 25 de septiembre. [C]
  `docs/architecture/plan-app-movil-2026-09.md` §8–17.
- **Push**: **no está terminado**. El backend tiene el endpoint para guardar el
  token (`dispositivos/push-token/`) y el cliente tiene `registrarPush`, pero
  ninguna pantalla lo llama ni importa `expo-notifications`, y el backend no
  envía nada por Expo Push (`movil/tasks.py:1-6`: «se añade en la Fase 2»).
  [C] `mobile/native-capabilities.md`, `mobile/overview.md` §4.
- **Hallazgos de la captura del 2026-09-25** (BD aislada con datos sintéticos;
  detalle en `excluded.md`): 3 reportes financieros con error JS
  (`r.GetData(...).destroy is not a function`), balance general con descuadre
  de 14 864,41, reporte de reservas con «Pagado» ~11× el total, títulos
  ilegibles en el panel DGII, 606 y 607, comentarios de plantilla impresos en
  el panel bancario y el 606 (los detecta el test
  `test_no_hay_comentarios_multilinea`, que hoy falla), y el mapa de sucursal
  sin coordenadas centrado en la ubicación real de una sucursal. [C] capturas
  en `web/screenshots/raw/` y `metrics.md` §3.
- **Tests Python hoy**: 3.161 pasan, 3 fallan (ver `metrics.md` §3). [C]
- **Auditoría contable 2026-09**: fases 0 y 1 cerradas; abiertos H-14 (nunca
  se ha cerrado un período contable), H-22–H-24. [C]
  `docs/auditoria-contable-2026-09/fase-1-nucleo.md`.
- **Comercio B2C** (precio → pedido → reserva → pago → voucher, pasarela
  AZUL): fase de validación, especificación y prototipo de motor de precios
  sin commit; nada cambia el cálculo en producción. [C]
  `docs/architecture/comercio/README.md`.
