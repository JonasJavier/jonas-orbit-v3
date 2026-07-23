<!-- portfolio-content/omsta/case-study-notes.md -->

# Notas factuales — OMSTA (volcado de investigación)

> **Fecha:** 2026-07-21 · **HEAD:** `da5a86b3` · rama `main`
> Volcado detallado y verificable **antes** de convertirlo en copy. Cada dato
> tiene su fuente. Las incógnitas están marcadas `[REQUIERE CONFIRMACIÓN]`.

## 1. Resumen

OMSTA (repo `CristecnoViajes_SRL`) es un **ERP para una agencia de viajes en
República Dominicana**, en producción, desplegado en Railway. Monolito Django
5.2.6 modular (18 apps), ~219.000 LOC de negocio, con contabilidad de doble
partida, cumplimiento fiscal DGII, multimoneda, nómina, banca, CRM y operación
multisucursal. Marca del producto: **OMSTA** (isotipo de avión dorado).

## 2. Contexto

- Sector: agencias de viajes (RD). Moneda base DOP; multimoneda (USD, etc.).
- **[CONFIRMADO POR JONÁS 2026-07-22]** El negocio opera **2 sucursales reales:
  Santo Domingo y Santiago**. La capacidad multisucursal del sistema
  (sucursales, departamentos, membresías con rol, horarios, métricas) soporta esa
  operación.
- Operación real: reservas de hotel/vuelo/crucero/paquete/seguro, cobros a
  clientes, pagos a mayoristas/suplidores, contabilidad y cumplimiento fiscal.
- El sistema centraliza en una sola plataforma lo que normalmente se dispersa en
  hojas de cálculo, sistemas de reservas y contabilidad separada. `[INFERENCIA]`
- `[REQUIERE CONFIRMACIÓN]` nombre público del cliente, antigüedad en producción,
  tamaño del equipo usuario.

## 3. Problema

Una agencia con operación real necesita conectar tres mundos que suelen vivir
separados: **la venta** (reservas y clientes), **el dinero** (cobros, pagos,
comisiones, saldos) y **la contabilidad formal** (asientos, CxC/CxP, impuestos
DGII). Sin integración: doble digitación, descuadres, falta de trazabilidad y
riesgo fiscal.

## 4. Objetivo

Construir y mantener un sistema donde cada operación comercial fluya
automáticamente a su consecuencia financiera y contable, con controles de acceso,
auditoría y cumplimiento fiscal dominicano — sin sacrificar la usabilidad para el
asesor de viajes.

## 5. Función de Jonás `[REQUIERE CONFIRMACIÓN del alcance exacto]`

- Autor de los merges/PRs en git (`JonasJavier`, `Jonasavage01`).
- Desarrollo full-stack (Django/DRF + frontend), arquitectura, modelado de datos,
  contabilidad, despliegue en Railway, mantenimiento y corrección de incidentes.
- Trabajo asistido por agentes de código (ramas `codex/*`) — conviene que Jonás
  precise cómo describir la autoría (p.ej. "desarrollador principal con apoyo de
  herramientas de IA").

## 6. Usuarios

- **Asesor de viajes:** crea/gestiona reservas, registra cobros, atiende clientes.
- **Contabilidad/administración:** cobros/pagos, facturación, CxC/CxP, DGII, banca.
- **Gerente de sucursal:** operación de su sucursal, métricas.
- **Superadministrador:** usuarios, roles, permisos, configuración fiscal.
- Roles reales del modelo: `superadmin`, `admin`, `contabilidad`, `reservas`,
  `clientes` (`UsuarioPersonalizado.Roles`).

## 7. Restricciones

- Fuente de verdad en PostgreSQL; Redis nunca guarda estado autoritativo.
- Cumplimiento fiscal RD (DGII 606/607/608/623).
- Seguridad de lado servidor (login obligatorio, gate de ubicación, acceso por
  módulo/rol); frontend nunca es el único control.
- Multimoneda con consistencia contable (snapshots de tasa).
- Dominio en español; TZ `America/Santo_Domingo`.
- Web y worker no comparten disco efímero → almacenamiento durable S3.

## 8. Stack (verificado)

Python 3.12.10 · Django 5.2.6 · DRF 3.16.1 · PostgreSQL (psycopg 3) · Redis +
Django Q2 · WeasyPrint/reportlab (PDF) · pandas/openpyxl/xlsxwriter (Excel) ·
django-storages/boto3 (S3) · WhiteNoise · Gunicorn (gthread) · Railway ·
crispy-forms/select2/widget-tweaks/django-filter · crum/threadlocals/
django-user-agents/django-ratelimit/ipinfo · Bootstrap + JS (jQuery) · Ruff+Black
· pytest/pytest-django + Jest/Playwright. (Detalle: `metrics/technical-inventory.md`.)

## 9. Funcionalidades (inventario resumido)

Dashboard ejecutivo · Reservas multi-producto (hotel/vuelo/crucero/paquete/seguro)
con planes de pago y comprobantes · CRM (clientes/empresas, notas, documentos) ·
Caja & Pagos · Cuentas por Cobrar · Cuentas por Pagar · Notas AR/AP · Pagos a
suplidores · Libro diario (doble partida) · Plan de cuentas (COA) · Banco
(transacciones, conciliación, transferencias) · Divisas · Nómina (AFP/SFS/ISR,
vacaciones/licencias) · Sucursales/Departamentos · Usuarios/Roles/Permisos ·
Auditoría de actividad · Reportes (report registry + DGII) · Operaciones (jobs) ·
Documentos/políticas · Tutoriales in-app · Configuración empresa/DGII.

## 10. Arquitectura

- Monolito Django modular; capas por app: `views → services/selectors → models`.
- **Columna contable:** `reservas` genera hechos → `contabilidad` factura/cobra/
  paga y **postea** (motor de posteo por documento, `PostingProfile`) → `ledger`
  guarda el asiento como libro mayor neutral → `reports`/DGII reportan.
- `ledger` es efectivamente una **hoja** de posteo (contrato en
  `ledger/source_registry.py`; `contabilidad` registra sus documentos en
  `ContabilidadConfig.ready()`).
- Async: Django Q2 + Redis; experiencia compartida en `operations`.
- Seguridad transversal en middleware. (Detalle: `architecture/`.)

## 11. Flujos (verificados)

1. **Cobro de reserva → asiento → CxC:** `create_reservation_payment` →
   `post_customer_payment` (snapshot de tasa, excedentes como depósito) →
   `build_payment_health` → dashboard/CxC. Reserva no facturada = cobro a
   **anticipos de clientes (2201)**; al facturar, reclasifica automáticamente.
2. **Descuento sobre reserva pagada → crédito a favor (reserva #72).**
3. **Autenticación → acceso por rol/sucursal/módulo** (cadena de middleware).
4. **Exportación asíncrona** (Django Q2 + operations feed).
   (Detalle: `architecture/data-flow.md`.)

## 12. Desafíos (verificables)

- **Integridad del dinero entre 3 dominios** (`reservas ↔ contabilidad ↔ ledger`):
  pagos, aplicación, reversión, excedentes y posteo con atomicidad e idempotencia.
- **Cumplimiento fiscal DGII** (606/607/608/623) con reportería voluminosa.
- **Multimoneda consistente** (snapshots de tasa por pago).
- **Permisos finos** (rol/sucursal/módulo/propiedad) como defensa en profundidad.
- **Deuda estructural de un monolito grande** (`Reserva`/`Pago` god-models; vistas
  gigantes) gestionada con refactors incrementales y pruebas.
- **Comunicar el dinero al usuario** (el caso #72: el sistema tenía razón, pero no
  avisaba ni lo reflejaba bien en el recibo).

## 13. Decisiones (verificadas)

- Django Q2 en vez de Celery.
- Servicios explícitos y atómicos para el dinero; vistas como despachadores.
- `ledger` neutral + motor de posteo por documento en `contabilidad`.
- Snapshots de moneda en el pago.
- Seguridad de lado servidor por defecto.
- Almacenamiento durable desacoplado (S3).
- Documentación de arquitectura versionada con seguimiento de deuda.

## 14. Producción

- Railway: web (Gunicorn gthread) + worker (`qcluster`) + PostgreSQL + Redis + S3.
- `railpack.json` instala libs de Pango para WeasyPrint.
- Seeds/bootstrap: `seed_catalogs`, `ledger_bootstrap`, `seed_*_demo`.
- Health check `/health/` exento de redirección HTTPS.
- 891 commits (~16 meses), PRs hasta #199, ramas de production-readiness y
  fix-deploy de Railway; incidentes documentados.

## 15. Resultados

**Comprobados:** sistema real en producción; doble partida balanceada; DGII;
multimoneda; multisucursal; auditoría; idempotencia de pagos; corrección del caso
#72 (aviso + recibo + diagnóstico); refactor de deuda ejecutado; ~1.496 tests.

**Cualitativos honestos:** el negocio opera reservas, cobros y contabilidad desde
una sola plataforma con contabilidad formal y cumplimiento fiscal dominicano.

**`[REQUIERE CONFIRMACIÓN]`:** ventas, ahorro de tiempo, reducción de errores,
usuarios/clientes reales, antigüedad, impacto económico. No inventar.

## 16. Aprendizajes (marco; a validar con Jonás)

- En software de dinero, **comunicar** el resultado (avisos, recibos) importa tanto
  como calcularlo bien (caso #72). `[INFERENCIA sobre el aprendizaje personal]`
- Una **capa de servicios seria** es lo que permite refactorizar sin romper reglas.
- La **documentación de arquitectura viva** convierte un monolito grande en algo
  mantenible.

## 17. Evidencia disponible

- 30 capturas (16 principales) — `screenshots/`.
- Arquitectura + diagramas — `architecture/`.
- Métricas — `metrics/`.
- Mapa de evidencia — `evidence-map.md`.
- Incidente real — `docs/incidentes/2026-07-20-reserva-72-excedente.md` (repo OMSTA).
- Documentos de arquitectura versionados del repo (baseline + grafos fechados).

## 18. Confirmaciones de Jonás

> **Fecha de confirmación:** 22 de julio de 2026.

### 1. Nombre público del producto y del cliente

* El producto se llama **OMSTA**.
* El cliente puede identificarse públicamente como **CrisgnoViajes**.
* Se autoriza mencionar ambos nombres dentro del caso de estudio.

### 2. Autoría y función en el proyecto

Fui el **único desarrollador de OMSTA** y el responsable de su arquitectura, implementación, despliegue y mantenimiento.

Durante el desarrollo utilicé herramientas de inteligencia artificial como apoyo para algunas tareas. Sin embargo, las decisiones técnicas y de producto, la revisión del código, las integraciones y la responsabilidad final del sistema estuvieron bajo mi dirección.

Para el contenido público del portafolio, mi función puede describirse como:

> **Desarrollador full-stack y responsable de la arquitectura de OMSTA.**

No es necesario mencionar el uso de herramientas de IA dentro del caso público, salvo que sea relevante en una entrevista o conversación técnica.

### 3. Métricas reales publicables

Existen métricas reales de uso, operación y volumen, pero **no pueden divulgarse porque forman parte de la información privada del cliente**.

Sí puede publicarse que:

* el sistema está en producción;
* se utiliza en la operación real del negocio;
* soporta dos sucursales reales: Santo Domingo y Santiago;
* centraliza reservas, cobros, pagos y procesos contables.

No deben publicarse cifras sobre usuarios, clientes, reservas, ventas, volumen de pagos, ahorro de tiempo ni impacto económico.

### 4. Demo pública

Actualmente no existe una demo pública.

Más adelante se preparará un entorno de demostración con:

* datos completamente ficticios;
* una URL pública;
* credenciales de acceso para visitantes;
* aislamiento total respecto a los datos y servicios de producción.

Por ahora, el portafolio puede presentar la demo como una funcionalidad futura. Durante la implementación se pueden utilizar textos provisionales o datos de ejemplo, pero no debe publicarse una URL ni credenciales inexistentes.

Texto provisional recomendado:

> **Demo interactiva próximamente. Actualmente disponible mediante recorrido privado.**

### 5. Backups y disponibilidad

Actualmente no existe información suficientemente documentada o verificable sobre:

* política formal de backups;
* porcentaje de disponibilidad;
* uptime;
* recuperación ante desastres.

Estos puntos deben omitirse del caso de estudio hasta contar con datos reales y verificables.

### 6. Uso de la marca y el logo

Se autoriza mostrar públicamente:

* el nombre **OMSTA**;
* el logo de OMSTA;
* la identidad visual del producto;
* capturas sanitizadas de la aplicación;
* funcionalidades, arquitectura y decisiones técnicas autorizadas.

Todas las capturas deben pasar por una última revisión visual de privacidad antes de publicarse.

