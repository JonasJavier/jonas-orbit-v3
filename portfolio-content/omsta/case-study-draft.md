<!-- portfolio-content/omsta/case-study-draft.md -->
<!-- Borrador profesional del caso de estudio OMSTA para Jonás Orbit v3 (Endurance). -->
<!-- Voz: primera persona (Jonás). Basado en evidencia (ver evidence-map.md). -->
<!-- Antes de publicar, Jonás debe confirmar los puntos marcados [CONFIRMAR]. -->

# OMSTA — ERP para una agencia de viajes en producción

**Django · Django REST Framework · PostgreSQL · Redis · Django Q2 · Railway**
*Sistema real, en producción · Backend, arquitectura, contabilidad y mantenimiento.*

---

## 1. Contexto

OMSTA es el sistema de gestión de una agencia de viajes que opera en República
Dominicana con **dos sucursales: Santo Domingo y Santiago**. No es un proyecto de
práctica: está en producción, desplegado en la nube, y se usa para el trabajo
diario de vender viajes, cobrar, pagar a proveedores, pagar la nómina y llevar la
contabilidad formal del negocio.

Una agencia de viajes vive en la intersección de tres mundos que casi siempre
están separados: **la venta** (reservas de hotel, vuelo, crucero, paquetes y
seguros), **el dinero** (cobros a clientes, pagos a mayoristas, comisiones,
saldos) y **la contabilidad formal** (asientos, cuentas por cobrar y pagar,
impuestos). OMSTA existe para unir esos tres mundos en una sola plataforma.

<!-- [CONFIRMAR] nombre público del cliente, antigüedad en producción, tamaño del equipo. -->

## 2. Problema

Cuando esos tres mundos viven en herramientas distintas —una hoja de cálculo para
reservas, otra para cobros, un contador externo para los impuestos— aparecen los
problemas de siempre: se digita todo dos o tres veces, los saldos no cuadran, nadie
puede reconstruir qué pasó con un cobro, y el cumplimiento fiscal se vuelve una
carrera contra el reloj cada mes.

El reto real no era "hacer un CRUD de reservas". Era lograr que **cada operación
comercial tuviera automáticamente su consecuencia financiera y contable correcta**,
en varias monedas, con impuestos dominicanos, controlando quién puede hacer qué, y
sin volver el sistema imposible de usar para un asesor de viajes.

## 3. Objetivo

Construir y mantener un sistema donde:

- una reserva se convierte en cobro, el cobro en asiento contable y el asiento en
  reporte fiscal, sin re-digitación;
- el dinero se cuenta bien en cualquier moneda y en cualquier estado (pagado, con
  saldo, con excedente, reembolsado);
- cada usuario ve y hace solo lo que su rol y su sucursal permiten;
- y todo queda auditado.

## 4. Mi función y responsabilidades

Trabajé como **desarrollador full-stack y responsable de la arquitectura** del
sistema: modelé el dominio, construí el backend en Django/DRF, diseñé la capa de
servicios para los flujos de dinero, implementé la contabilidad de doble partida y
el cumplimiento fiscal, monté el despliegue en Railway y me hice cargo del
mantenimiento en producción, incluida la corrección de incidentes reales.

<!-- [CONFIRMAR] alcance exacto de la autoría: ¿desarrollador único? ¿principal con
apoyo de herramientas de IA? El historial git muestra a Jonás como autor de los
merges; parte del trabajo se hizo en ramas asistidas por agentes de código. Ajustar
esta sección a como Jonás quiera describirlo con honestidad. -->

## 5. Usuarios

- **Asesores de viajes:** crean y gestionan reservas, registran cobros, atienden
  a los clientes. Son quienes más tiempo pasan en el sistema.
- **Contabilidad y administración:** cobros y pagos, facturación, cuentas por
  cobrar y pagar, reportes DGII, banca.
- **Gerentes de sucursal:** la operación de su sucursal y sus métricas. La agencia
  opera dos sucursales (Santo Domingo y Santiago), y cada una se gestiona en el
  sistema como una unidad completa: equipo y roles, departamentos, horarios,
  métricas, documentos con vencimientos y su propio reporte comercial.
- **Superadministrador:** usuarios, roles, permisos y la configuración fiscal.

Los roles están modelados de forma explícita (`superadmin`, `admin`,
`contabilidad`, `reservas`, `clientes`) y determinan el acceso a cada módulo.

## 6. Restricciones

- **PostgreSQL es la única fuente de verdad**; Redis acelera y transporta colas,
  pero nunca guarda estado de negocio autoritativo.
- **Cumplimiento fiscal dominicano**: los reportes DGII 606/607/608/623 tienen
  formato y reglas propias.
- **Seguridad de lado servidor**: la visibilidad del frontend nunca es el único
  control; los permisos se imponen en el servidor.
- **Consistencia multimoneda**: cada pago guarda el snapshot de su tasa de cambio.
- **Producción en la nube**: el proceso web y el worker no comparten disco, así que
  los archivos durables van a almacenamiento S3-compatible.

## 7. Proceso

Abordé el sistema por dominios y en capas. Primero el modelo de datos del núcleo
(reservas, clientes, pagos), luego la capa de servicios para las transiciones de
dinero, después la contabilidad (libro mayor, perfiles de posteo) y encima la
reportería fiscal. Cada flujo de dinero se implementó como un **servicio explícito
y atómico**, no como lógica dispersa en vistas y plantillas.

A medida que el sistema creció, invertí en **documentación de arquitectura
versionada**: líneas base e instantáneas del grafo del código que me permiten
medir cómo evoluciona el acoplamiento y decidir dónde pagar deuda. Eso convirtió
el mantenimiento de un monolito grande en un proceso con datos, no a ciegas.

## 8. Decisiones importantes

- **Django Q2 en lugar de Celery** para las tareas en segundo plano, con un helper
  central de agendado y estado durable en PostgreSQL.
- **Servicios explícitos para el dinero**: los pagos, el posteo contable y las
  notas viven en funciones atómicas; las vistas de detalle actúan como
  despachadores delgados.
- **`ledger` como libro mayor neutral**: el motor de posteo por documento vive en
  `contabilidad`, y `ledger` solo define el contrato y guarda los asientos. Esto me
  permitió, en un refactor reciente, **romper el ciclo de dependencias entre
  contabilidad y ledger** sin romper una sola regla de negocio.
- **Snapshots de tasa en cada pago** para que la contabilidad multimoneda sea
  reproducible.
- **Seguridad por defecto en el servidor**: login obligatorio, verificación de
  ubicación y control de acceso por módulo/rol como middleware.

## 9. Arquitectura y stack

OMSTA es un **monolito Django modular** de 18 aplicaciones, con capas internas
(`views → services/selectors → models`) y las apps grandes partidas en paquetes
por dominio.

**Stack:** Python 3.12 · Django 5.2 · Django REST Framework · PostgreSQL (psycopg 3)
· Redis + Django Q2 · WeasyPrint/reportlab para PDF · pandas/openpyxl para
exportaciones · django-storages/boto3 (S3) · WhiteNoise · Gunicorn · Railway.

La **columna contable** es el corazón de la arquitectura:

> `reservas` genera el hecho económico → `contabilidad` lo factura, cobra/paga y
> **postea** (motor de posteo por documento con perfiles) → `ledger` guarda el
> asiento como libro mayor neutral → `reports`/DGII lo reportan.

*(Diagramas de contexto, contenedores, flujos y despliegue en `architecture/`.)*

## 10. Desafíos

1. **La integridad del dinero cruzando tres dominios** (reservas, contabilidad,
   ledger): un mismo pago se registra, se aplica, se puede revertir, puede generar
   excedente y debe postearse contablemente — todo con atomicidad e idempotencia.
2. **El cumplimiento fiscal dominicano**, con reportería DGII voluminosa y exigente.
3. **La deuda estructural natural de un monolito grande**: dos modelos (`Reserva`
   con 52 métodos, `Pago` con 32) concentran el núcleo transaccional, y algunas
   vistas crecieron demasiado.
4. **Comunicarle bien el dinero al usuario**, no solo calcularlo bien — lo que me
   enseñó el caso de la reserva #72.

## 11. Soluciones implementadas

- **Idempotencia y validez de pagos** (`Pago.valid()/voided()`, correcciones,
  reembolsos, asignaciones) para que reintentos y ediciones no dupliquen dinero.
- **Doble partida real**: cada operación genera un asiento balanceado (débito =
  crédito, diferencia 0.00), con estados de publicación y trazabilidad al origen.
- **Reclasificación contable automática**: una reserva no facturada registra el
  cobro como *anticipo de clientes*; al facturar, el sistema reclasifica a cuentas
  por cobrar sin intervención manual.
- **El caso de la reserva #72 — un problema real, resuelto de raíz.** Un cliente
  pagó el total y, tres días después, se le aplicó un descuento del 3 %. Como el
  dinero ya estaba cobrado, el descuento dejó un excedente a favor del cliente. El
  sistema lo contabilizó correctamente, **pero lo hacía en silencio** y el recibo
  declaraba menos de lo recibido. Lo corregí en tres frentes: (1) un aviso explícito
  al guardar cuando el nuevo total queda por debajo de lo ya cobrado; (2) un recibo
  que declara el monto realmente recibido, con el desglose de lo aplicado y el
  crédito a favor; y (3) un comando de diagnóstico de solo lectura
  (`diagnosticar_excedente_reserva`) para auditar cualquier reserva con excedente.
- **Refactor de deuda con pruebas**: saqué el motor de posteo (27 rutinas) de
  `ledger` a `contabilidad`, reduciendo `ledger/services/posting.py` de 96 KB a
  5,5 KB, y partí la reportería DGII (266 KB en dos archivos) en paquetes por
  responsabilidad — sin romper reglas de negocio.

## 12. Diseño y UX

La interfaz está pensada para gente que trabaja rápido y con dinero. El **panel
ejecutivo** resume en una vista las reservas del mes, los cobros, la comisión y el
saldo por cobrar, con **alertas operativas accionables** (pagos sin comprobante,
saldos vencidos, reservas sin abono). El **detalle de reserva** reúne en una sola
pantalla el estado, el porcentaje pagado, la comisión, el balance, las pestañas de
alojamiento/pagos/facturación/expediente y el **historial de auditoría**.

El **alta de reserva** es un formulario por pasos (cliente, fechas, huéspedes,
hotel, habitaciones, extras, mayorista, resumen) con reglas de negocio integradas
(por ejemplo, a partir de 10 habitaciones se trata como reserva grupal). Toda
validación crítica del frontend está respaldada por validación de servidor. El
sistema es **responsive**: los flujos clave funcionan en móvil.

El mismo patrón de "cockpit" se repite en los módulos administrativos: cada
**sucursal** tiene su panel con equipo, departamentos, horarios, métricas y
documentos; cada **período de nómina** guía el flujo completo (crear → generar →
revisar y pagar → cerrar) con totales de devengado, deducciones de ley
(AFP/SFS/ISR) y neto; y la ficha de cada **cliente del CRM** funciona como
expediente con documentos, notas y su relación con reservas y pagos.

Identidad: marca **OMSTA** con isotipo de avión dorado sobre una paleta azul
profunda; UI construida con Bootstrap y componentes compartidos.

## 13. Capturas / demo

Selección principal (16 capturas en `screenshots/sanitized/`, datos sintéticos):

1. Panel ejecutivo (dashboard).
2. Reservas: listado, detalle (cockpit financiero) y alta por pasos.
3. CRM: listado de entidades y ficha de cliente (expediente).
4. Contabilidad: Caja & Pagos, Cuentas por Cobrar y Libro diario (doble partida).
5. Nómina: dashboard y detalle de período (devengado/deducciones/neto).
6. Sucursales: listado y detalle de sucursal como unidad operativa.
7. Usuarios y seguridad: edición con roles y registro de auditoría.
8. Vista móvil del dashboard.

*(Guion de demostración de 60 s / 3 min / 7-10 min en `demo/demo-script.md`.)*

## 14. Resultados verificables

**Lo que se puede comprobar hoy en el código, la configuración y el historial:**

- Sistema **real en producción**, desplegado en Railway (web + worker + PostgreSQL
  + Redis).
- **Contabilidad de doble partida** con asientos balanceados y perfiles de posteo.
- **Cumplimiento fiscal dominicano** (DGII 606/607/608/623).
- **Multimoneda** con snapshots de tasa; **multisucursal** con permisos por rol.
- **Auditoría de actividad** e idempotencia de pagos.
- **Mantenimiento sostenido**: 891 commits en ~16 meses, PRs hasta el #199,
  incidentes documentados y deuda técnica pagada en iteraciones.
- **Suite de pruebas** con ~1.500 funciones de test (pytest) además de pruebas JS.

**Resultado cualitativo honesto:** el negocio opera reservas, cobros y contabilidad
formal desde una sola plataforma, con cumplimiento fiscal dominicano y trazabilidad
completa del dinero.

<!-- [CONFIRMAR] No se publican métricas de negocio (ventas, ahorro de tiempo,
reducción de errores, nº de usuarios/clientes reales) porque no hay evidencia en el
repositorio. Si Jonás dispone de datos reales y verificables, se pueden añadir aquí. -->

## 15. Aprendizajes

- **En software de dinero, comunicar el resultado es tan importante como
  calcularlo.** El sistema tenía razón con la reserva #72; lo que faltaba era que
  el usuario lo entendiera a tiempo. Esa corrección cambió recibos y avisos de todo
  el sistema.
- **Una capa de servicios seria es lo que hace posible refactorizar sin miedo.**
  Poder mover el motor de posteo entre módulos sin romper reglas fue consecuencia
  directa de haber aislado la lógica de dinero desde el principio.
- **La documentación de arquitectura viva convierte un monolito grande en algo
  mantenible**: medir el acoplamiento me dice dónde pagar deuda, en vez de adivinar.

## 16. Estado actual

En **producción y en mantenimiento activo**. La deuda estructural mayor (el ciclo
contabilidad↔ledger, la reportería DGII, los formularios de reservas) ya se pagó;
la agenda vigente es descomponer las vistas y modelos más grandes con pruebas
dirigidas. El producto está en la fase de "se mantiene bien", no de "recién
funciona".

## 17. Enlaces / CTA

- **Demo:** <!-- [CONFIRMAR] ¿demo pública, video, o recorrido guiado local? -->
- **Repositorio:** privado (sistema en producción de un cliente).
- **¿Trabajemos juntos?** Si necesitas un sistema que conecte tu operación con tu
  contabilidad de verdad, hablemos. → *(CTA a la sección de contacto del portafolio.)*

---
<!-- Checklist de publicación:
- [ ] Jonás confirma autoría (sección 4).
- [ ] Jonás confirma nombre público del cliente (secciones 1/17).
- [ ] Jonás confirma si hay métricas reales publicables (sección 14).
- [ ] Jonás confirma enlace/formato de demo (sección 17).
- [ ] Revisión final de privacidad de cada captura antes de publicar. -->
