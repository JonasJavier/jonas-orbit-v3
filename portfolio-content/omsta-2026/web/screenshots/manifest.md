<!-- portfolio-content/omsta-2026/web/screenshots/manifest.md · 2026-09-25 · commit 3f5cea73 -->
# Manifest de capturas web

Playwright 1.61.1 (Chromium headless), 1440×900 con `deviceScaleFactor: 2` (PNG de 2880×1800);
las `responsive` a 390×844 ×2. Servidor local `127.0.0.1:8130`, BD aislada `omsta_portfolio`
con datos sintéticos, sesión de `demo.admin` (rol **admin**) salvo el login (sin sesión).
Script: `scripts/capture_web.mjs` + `scripts/web-shots.json`. Auditoría por toma: `raw/audit.json`.
Generado por `scripts/build_web_manifest.py`.

- `raw/`: 130 capturas. `principales/`: 47 (orden narrativo, renombradas).
- Excluidas por la regla principal: 34 (motivo completo en `../../excluded.md`).
- El resto de `raw/` es publicable pero redundante o secundario.

## Principales

| Archivo | Origen en raw | Módulo | URL | Qué muestra | Por qué importa | Rol | Alt | Caption |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `w01-login.png` | `w01-login.png` | Acceso | `/usuarios/login/` | Inicio de sesión | Primera impresión de la marca | sin sesión | Pantalla de acceso de OMSTA con panel oscuro de marca y formulario | Acceso único para todo el equipo de la agencia. |
| `w02-dashboard.png` | `w02-dashboard.png` | Dashboard | `/` | KPIs del mes y alertas operativas | Resume la operación en una vista | admin | Dashboard con reservas del mes, cobrado, comisión, saldo por cobrar y alertas | El mes de la agencia de un vistazo: ventas, cobros y alertas. |
| `w03-reservas-listado.png` | `w04-reservas-listado.png` | Reservas | `/reservas/` | Listado con totales, filtros y estados | Centro del trabajo diario | admin | Listado de reservas con cartera, cobrado, por cobrar y comisión | Cada reserva con su estado de venta y de cobro. |
| `w04-reserva-hotel-resumen.png` | `w05-reserva-hotel-resumen.png` | Reservas | `/reservas/reserva/13/` | Ficha de reserva de hotel | Venta, cobro, comisión y saldo juntos | admin | Ficha de reserva de hotel con 70 % pagado y escalera de estados | Una reserva: cuánto se vendió, cobró y falta. |
| `w05-reserva-agenda-pago-suplidor.png` | `w07-reserva-hotel-pagos.png` | Reservas | `/reservas/reserva/13/` | Pestaña Pagos con agenda de pago al suplidor | Pago al proveedor calculado desde la entrada | admin | Agenda de pago al suplidor programada 15 días antes de la entrada | La fecha de pago al hotel se calcula sola. |
| `w06-reserva-facturada-paquete-contable.png` | `w09-reserva-facturada.png` | Reservas | `/reservas/reserva/1/` | Pestaña Facturación de una reserva facturada | Factura, NCF y asientos enlazados | admin | Reserva en estado Voucher con factura, NCF y asientos publicados | Factura con NCF y sus asientos, desde la reserva. |
| `w07-reserva-historial-auditado.png` | `w10-reserva-actividad.png` | Reservas | `/reservas/reserva/1/` | Historial de 25 eventos de la reserva | Trazabilidad de cada cambio | admin | Historial detallado de la reserva con eventos auditados y financieros | Todo lo que pasó con la reserva, auditado. |
| `w08-reserva-paquete-componentes.png` | `w13-reserva-paquete-producto.png` | Reservas | `/reservas/reserva/24/` | Componentes de un paquete | Otro producto con su propio formulario | admin | Paquete con hotel, traslado y tour y sus subtotales | Paquetes armados por componentes, cada uno con su costo. |
| `w09-reserva-seguro-asegurados.png` | `w15-reserva-seguro-viajeros.png` | Reservas | `/reservas/reserva/26/` | Asegurados de un seguro de viaje | Cobertura de varios productos | admin | Seguro de viaje saldado con dos asegurados y su pasaporte | También seguros, cruceros, vuelos y otros servicios. |
| `w10-nueva-reserva-vuelo.png` | `w19-nueva-reserva-vuelo.png` | Reservas | `/reservas/nueva/vuelo/` | Alta de vuelo con resumen en vivo | Formulario guiado por secciones | admin | Formulario de reserva de vuelo con navegación rápida y resumen en vivo | Alta guiada con resumen de precio en vivo. |
| `w11-nueva-reserva-crucero.png` | `w21-nueva-reserva-crucero.png` | Reservas | `/reservas/nueva/crucero/` | Alta de crucero | Mismo patrón para cada producto | admin | Formulario de reserva de crucero con itinerario y pasajeros | Mismo patrón de alta para cada tipo de producto. |
| `w12-catalogo-aerolineas.png` | `w30-aerolineas-destinos.png` | Catálogos | `/reservas/vuelos/catalogo/?tab=airlines` | Catálogo de aerolíneas y destinos | Autocompletado de formularios | admin | Catálogo de 27 aerolíneas con código IATA y uso frecuente | Catálogos que alimentan el autocompletado de reservas. |
| `w13-crm-clientes.png` | `w33-crm-clientes.png` | CRM | `/crm/` | Listado de clientes | Base de clientes y empresas | admin | CRM con 26 clientes y 3 empresas | Clientes y empresas en un mismo CRM. |
| `w14-crm-empresa-ficha.png` | `w36-crm-empresa-ficha.png` | CRM | `/crm/entities/company/1/` | Ficha de empresa | Datos fiscales y de contacto | admin | Ficha de empresa con datos fiscales, representante y contacto | Ficha de empresa con RNC y régimen de facturación. |
| `w15-caja-pagos.png` | `w38-caja-pagos.png` | Cobros | `/contabilidad/pagos/` | Caja y pagos | Todos los cobros con soporte y estado | admin | Listado de pagos con método, estado y soporte cargado | Cada cobro con su método, estado y comprobante. |
| `w16-pago-protegido.png` | `w40-pago-protegido.png` | Cobros | `/contabilidad/pagos/1/editar/` | Pago contabilizado protegido | Historial financiero no editable | admin | Pago que no se edita directamente: comprobantes, corrección guiada o reembolso | Un pago contabilizado no se edita: se corrige o reembolsa. |
| `w17-reembolso-guiado.png` | `w41-reembolso.png` | Cobros | `/contabilidad/pagos/1/reembolso/` | Reembolso guiado | Reverso con trazabilidad contable | admin | Reembolso de un pago con su trazabilidad contable | Reembolso con reverso contable y motivo obligatorio. |
| `w18-cuentas-por-cobrar.png` | `w42-cxc.png` | Contabilidad | `/contabilidad/cuentas-por-cobrar/?tab=receivable` | Cuentas por cobrar | Cartera y comisión al día | admin | Cuentas por cobrar con cartera, comisión y pendiente | Cuentas por cobrar derivadas de reservas y pagos. |
| `w19-cuentas-por-pagar.png` | `w45-cxp.png` | Contabilidad | `/contabilidad/cuentas-por-pagar/?scope=reservas&state=payable` | Cuentas por pagar y agenda | Deuda con proveedores por vencimiento | admin | Cuentas por pagar con agenda de vencidas, hoy y próximas | Lo que se debe a proveedores, ordenado por vencimiento. |
| `w20-cxp-saldada.png` | `w48-cxp-detalle-pagada.png` | Contabilidad | `/contabilidad/cuentas-por-pagar/detalle/1/` | CxP saldada | Ciclo proveedor cerrado | admin | Cuenta por pagar saldada al 100 % | Del costo al pago: la cuenta por pagar se salda. |
| `w21-documento-fiscal-suplidor.png` | `w49-documento-fiscal-suplidor.png` | Fiscal | `/contabilidad/cuentas-por-pagar/documentos-proveedor/1/` | Documento fiscal del proveedor | Base del formato DGII 606 | admin | Documento fiscal del proveedor con NCF, tipo de gasto 606 y pago aplicado | La factura del proveedor alimenta el 606 de la DGII. |
| `w22-factura-paquete-contable.png` | `w44-factura-editar.png` | Fiscal | `/contabilidad/facturas/1/editar/` | Factura con su paquete contable | Emisión y contabilidad atómicas | admin | Factura con tres asientos publicados como paquete | Emitir la factura publica sus asientos como una unidad. |
| `w23-libro-diario.png` | `w55-libro-diario.png` | Ledger | `/ledger/entries/` | Libro diario | Partida doble con origen | admin | Libro diario con asientos cuadrados y su documento de origen | Cada asiento cuadra y sabe qué documento lo generó. |
| `w24-asiento-explicado.png` | `w56-asiento-detalle.png` | Ledger | `/ledger/entries/fe0c8951-8316-49a5-b2b0-898895150d20/` | Detalle de asiento | Contabilidad explicada | admin | Asiento con explicación de débito y crédito y trazabilidad | El asiento explica en español qué registra y por qué. |
| `w25-asientos-de-una-reserva.png` | `w57-asientos-de-reserva.png` | Ledger | `/ledger/reserva/1/entries/` | Asientos de una reserva | Ciclo contable completo por venta | admin | Seis asientos de una reserva: cobro, factura, costo y pago al proveedor | Toda la contabilidad de una venta en una tabla. |
| `w26-salud-contable.png` | `w59-salud-contable.png` | Contabilidad | `/contabilidad/salud-contable/` | Salud contable | Control interno de solo lectura | admin | Salud contable sin bloqueos de cierre e identidades 9/9 | Auditor interno: identidades contables que deben cuadrar. |
| `w27-cierre-de-periodo.png` | `w58-periodos-contables.png` | Contabilidad | `/ledger/periods/` | Checklist de cierre | Cierre mensual con verificaciones | admin | Checklist de cierre del período con advertencias | Antes de cerrar el mes, el sistema revisa todo. |
| `w28-configuracion-fiscal-itbis.png` | `w65-configuracion-fiscal.png` | Fiscal | `/contabilidad/configuracion/regimen-fiscal/` | Régimen de ITBIS por servicio | Reglas fiscales configurables | admin | Configuración de ITBIS por tipo de servicio con cuentas de ingreso y costo | ITBIS y cuentas por tipo de servicio, configurables. |
| `w29-secuencias-ncf.png` | `w66-secuencias-ncf.png` | Fiscal | `/contabilidad/configuracion/secuencias-ncf/` | Secuencias NCF | Numeración fiscal sin duplicados | admin | Rangos NCF autorizados con disponibilidad y vigencia | Numeración fiscal automática y sin duplicados. |
| `w30-mapa-de-cuentas.png` | `w64-mapa-de-cuentas.png` | Contabilidad | `/contabilidad/configuracion/mapa-de-cuentas/` | Mapa de cuentas del sistema | Qué cuenta usa cada operación | admin | Mapa de cuentas con débito y crédito por operación | Qué cuenta usa cada operación, y quién la decide. |
| `w31-banco-transacciones.png` | `w77-banco-transacciones.png` | Banco | `/banco/?tab=all` | Transacciones bancarias | Entradas y salidas en DOP | admin | Transacciones bancarias con entradas, salidas y flujo neto | Movimientos bancarios generados por cobros y pagos. |
| `w32-banco-conciliacion.png` | `w78-banco-conciliacion.png` | Banco | `/banco/conciliacion/` | Conciliación bancaria | Reglas antes de conciliar | admin | Conciliación bancaria que exige asiento antes de conciliar | Conciliación masiva con validaciones seguras. |
| `w33-nomina-resumen.png` | `w81-nomina-resumen.png` | Nómina | `/nomina/` | Resumen de nómina | RRHH dentro del mismo sistema | admin | Resumen de nómina con gráfico mensual y plantilla por departamento | Nómina dentro del ERP: empleados, períodos y pagos. |
| `w34-nomina-empleado.png` | `w83-nomina-empleado-detalle.png` | Nómina | `/nomina/empleados/1/` | Ficha de empleado | Salario, vacaciones y préstamos | admin | Ficha de empleada con salario, neto estimado, vacaciones y préstamos | Ficha del empleado con salario, neto y vacaciones. |
| `w35-nomina-retenciones-legales.png` | `w89-nomina-retenciones.png` | Nómina | `/nomina/configuracion/retenciones/` | Retenciones legales AFP/SFS/ISR | Ley dominicana configurable | admin | Retenciones AFP, SFS e ISR con su base de cálculo | AFP, SFS e ISR dominicanos, configurables sin código. |
| `w36-nomina-configuracion-contable.png` | `w90-nomina-contabilidad.png` | Nómina | `/nomina/configuracion/contabilidad/` | Configuración contable de nómina | Nómina que publica asientos | admin | Mapeo de cuentas de sueldos, banco y retenciones | Pagar la nómina publica su asiento automáticamente. |
| `w37-sucursales.png` | `w95-sucursales.png` | Sucursales | `/sucursales/` | Sucursales | Operación multi-sucursal | admin | Dos sucursales activas con empleados | Operación multi-sucursal con permisos por sucursal. |
| `w38-centro-de-documentos.png` | `w101-documentos.png` | Documentos | `/documentos/` | Centro de documentos | Proformas, recibos y vouchers configurables | admin | Centro de documentos con siete documentos configurables | Siete documentos para el cliente, configurables. |
| `w39-correos-automaticos.png` | `w104-correos-automaticos.png` | Documentos | `/documentos/correos-automaticos/` | Correos automáticos | Comunicación con el cliente | admin | Correos automáticos de confirmación y recordatorios | Correos al cliente que se encienden uno a uno. |
| `w40-centro-de-reportes.png` | `w105-reportes.png` | Reportes | `/reportes/` | Centro de reportes | Report registry único | admin | Centro de reportes operativos, contables y fiscales | Reportes operativos, contables y fiscales en un lugar. |
| `w41-notificaciones.png` | `w120-notificaciones.png` | Usuarios | `/usuarios/notificaciones/` | Notificaciones | Flujo entre reservas y contabilidad | admin | Notificaciones de pagos registrados y aplicados | Reservas registra el pago; contabilidad lo verifica. |
| `w42-usuarios.png` | `w114-usuarios.png` | Usuarios | `/usuarios/users/` | Usuarios y accesos | Roles y módulos | admin | Listado de usuarios con estado y rol | Usuarios con rol, estado y acciones de acceso. |
| `w43-evento-auditado.png` | `w119-bitacora-detalle.png` | Usuarios | `/usuarios/activity-log/40/` | Evento auditado | Bitácora inmutable | admin | Evento auditado inmutable: quién, qué, sobre qué registro | Cada cambio queda en una bitácora que no se edita. |
| `w44-tutoriales.png` | `w122-tutoriales.png` | Tutoriales | `/tutoriales/` | Centro de tutoriales | Formación dentro de la app | admin | Centro con 71 tutoriales por módulo | 71 tutoriales dentro del sistema, por módulo. |
| `w45-responsive-dashboard.png` | `w125-responsive-dashboard.png` | Responsive | `/` | Dashboard a 390 px | La web funciona en el móvil | admin | Dashboard en ancho de teléfono | La web también se adapta al teléfono. |
| `w46-responsive-reserva.png` | `w127-responsive-reserva-detalle.png` | Responsive | `/reservas/reserva/13/` | Ficha de reserva a 390 px | Detalle legible en pantalla chica | admin | Ficha de reserva en ancho de teléfono con 70 % pagado | La ficha de reserva, legible en pantalla chica. |
| `w47-responsive-crm.png` | `w128-responsive-crm.png` | Responsive | `/crm/` | CRM a 390 px en tarjetas | Tablas que pasan a tarjetas | admin | CRM en tarjetas en ancho de teléfono | Las tablas pasan a tarjetas bajo 768 px. |

## Todas las capturas de raw/

| Archivo | URL | HTTP | Estado en el paquete |
| --- | --- | --- | --- |
| `w01-login.png` | `/usuarios/login/` | 200 | principal → `w01-login.png` |
| `w02-dashboard.png` | `/` | 200 | principal → `w02-dashboard.png` |
| `w03-dashboard-alertas.png` | `/` | 200 | publicable, secundaria |
| `w04-reservas-listado.png` | `/reservas/` | 200 | principal → `w03-reservas-listado.png` |
| `w05-reserva-hotel-resumen.png` | `/reservas/reserva/13/` | 200 | principal → `w04-reserva-hotel-resumen.png` |
| `w06-reserva-hotel-alojamiento.png` | `/reservas/reserva/13/` | 200 | publicable, secundaria |
| `w07-reserva-hotel-pagos.png` | `/reservas/reserva/13/` | 200 | principal → `w05-reserva-agenda-pago-suplidor.png` |
| `w08-reserva-hotel-cxp.png` | `/reservas/reserva/13/` | 200 | publicable, secundaria |
| `w09-reserva-facturada.png` | `/reservas/reserva/1/` | 200 | principal → `w06-reserva-facturada-paquete-contable.png` |
| `w10-reserva-actividad.png` | `/reservas/reserva/1/` | 200 | principal → `w07-reserva-historial-auditado.png` |
| `w11-reserva-crucero.png` | `/reservas/reserva/23/` | 200 | publicable, secundaria |
| `w12-reserva-crucero-producto.png` | `/reservas/reserva/23/` | 200 | **excluida**: coma inicial por ciudad vacía |
| `w13-reserva-paquete-producto.png` | `/reservas/reserva/24/` | 200 | principal → `w08-reserva-paquete-componentes.png` |
| `w14-reserva-vuelo.png` | `/reservas/reserva/12/` | 200 | publicable, secundaria |
| `w15-reserva-seguro-viajeros.png` | `/reservas/reserva/26/` | 200 | principal → `w09-reserva-seguro-asegurados.png` |
| `w16-reserva-anulada.png` | `/reservas/reserva/15/` | 200 | **excluida**: cifras no cuadran |
| `w17-rooming-list.png` | `/reservas/reserva/13/rooming-list/` | 200 | **excluida**: texto cortado |
| `w18-nueva-reserva-hotel.png` | `/reservas/nueva/hotel/` | 200 | **excluida**: título invisible |
| `w19-nueva-reserva-vuelo.png` | `/reservas/nueva/vuelo/` | 200 | principal → `w10-nueva-reserva-vuelo.png` |
| `w20-nueva-reserva-paquete.png` | `/reservas/nueva/paquete/` | 200 | publicable, secundaria |
| `w21-nueva-reserva-crucero.png` | `/reservas/nueva/crucero/` | 200 | principal → `w11-nueva-reserva-crucero.png` |
| `w22-nueva-reserva-seguro.png` | `/reservas/nueva/seguro/` | 200 | publicable, secundaria |
| `w23-nueva-reserva-otro-servicio.png` | `/reservas/nueva/otro-servicio/` | 200 | publicable, secundaria |
| `w24-centro-productos.png` | `/reservas/productos/` | 200 | publicable, secundaria |
| `w25-hoteles.png` | `/reservas/hoteles/` | 200 | publicable, secundaria |
| `w26-hotel-detalle.png` | `/reservas/hoteles/1/` | 200 | **excluida**: pobre (sin foto ni tarifas) |
| `w27-suplidores.png` | `/reservas/suplidores/` | 200 | publicable, secundaria |
| `w28-suplidor-detalle.png` | `/reservas/suplidores/1/` | 200 | **excluida**: pobre (0 reservas) |
| `w29-suplidor-nuevo.png` | `/reservas/suplidores/nuevo/` | 200 | publicable, secundaria |
| `w30-aerolineas-destinos.png` | `/reservas/vuelos/catalogo/?tab=airlines` | 200 | principal → `w12-catalogo-aerolineas.png` |
| `w31-aerolinea-detalle.png` | `/reservas/vuelos/catalogo/aerolineas/1/` | 200 | publicable, secundaria |
| `w32-navieras-barcos.png` | `/reservas/cruceros/catalogo/?tab=lines` | 200 | publicable, secundaria |
| `w33-crm-clientes.png` | `/crm/` | 200 | principal → `w13-crm-clientes.png` |
| `w34-crm-empresas.png` | `/crm/` | 200 | publicable, secundaria |
| `w35-crm-cliente-ficha.png` | `/crm/entities/client/13/` | 200 | publicable, secundaria |
| `w36-crm-empresa-ficha.png` | `/crm/entities/company/1/` | 200 | principal → `w14-crm-empresa-ficha.png` |
| `w37-crm-nuevo-modal.png` | `/crm/` | 200 | publicable, secundaria |
| `w38-caja-pagos.png` | `/contabilidad/pagos/` | 200 | principal → `w15-caja-pagos.png` |
| `w39-registrar-pago.png` | `/contabilidad/pagos/nuevo/` | 200 | publicable, secundaria |
| `w40-pago-protegido.png` | `/contabilidad/pagos/1/editar/` | 200 | principal → `w16-pago-protegido.png` |
| `w41-reembolso.png` | `/contabilidad/pagos/1/reembolso/` | 200 | principal → `w17-reembolso-guiado.png` |
| `w42-cxc.png` | `/contabilidad/cuentas-por-cobrar/?tab=receivable` | 200 | principal → `w18-cuentas-por-cobrar.png` |
| `w43-cxc-cobradas.png` | `/contabilidad/cuentas-por-cobrar/?tab=collected` | 200 | publicable, secundaria |
| `w44-factura-editar.png` | `/contabilidad/facturas/1/editar/` | 200 | principal → `w22-factura-paquete-contable.png` |
| `w45-cxp.png` | `/contabilidad/cuentas-por-pagar/?scope=reservas&state=payable` | 200 | principal → `w19-cuentas-por-pagar.png` |
| `w46-cxp-pagadas.png` | `/contabilidad/cuentas-por-pagar/?scope=reservas&state=paid` | 200 | publicable, secundaria |
| `w47-cxp-detalle.png` | `/contabilidad/cuentas-por-pagar/detalle/13/` | 200 | publicable, secundaria |
| `w48-cxp-detalle-pagada.png` | `/contabilidad/cuentas-por-pagar/detalle/1/` | 200 | principal → `w20-cxp-saldada.png` |
| `w49-documento-fiscal-suplidor.png` | `/contabilidad/cuentas-por-pagar/documentos-proveedor/1/` | 200 | principal → `w21-documento-fiscal-suplidor.png` |
| `w50-documentos-proveedor-cxp.png` | `/contabilidad/cuentas-por-pagar/1/documentos-proveedor/` | 200 | publicable, secundaria |
| `w51-pago-suplidor-form.png` | `/contabilidad/proveedores/pagos/` | 200 | publicable, secundaria |
| `w52-compra-gasto-form.png` | `/contabilidad/ap/compras-gastos/nuevo/` | 200 | publicable, secundaria |
| `w53-notas-proveedor.png` | `/contabilidad/ap/notas/` | 200 | **excluida**: vacía |
| `w54-notas-cliente.png` | `/contabilidad/ar/notas/` | 200 | **excluida**: vacía |
| `w55-libro-diario.png` | `/ledger/entries/` | 200 | principal → `w23-libro-diario.png` |
| `w56-asiento-detalle.png` | `/ledger/entries/fe0c8951-8316-49a5-b2b0-898895150d20/` | 200 | principal → `w24-asiento-explicado.png` |
| `w57-asientos-de-reserva.png` | `/ledger/reserva/1/entries/` | 200 | principal → `w25-asientos-de-una-reserva.png` |
| `w58-periodos-contables.png` | `/ledger/periods/` | 200 | principal → `w27-cierre-de-periodo.png` |
| `w59-salud-contable.png` | `/contabilidad/salud-contable/` | 200 | principal → `w26-salud-contable.png` |
| `w60-entradas-diario.png` | `/contabilidad/entrada-diario/` | 200 | **excluida**: vacía |
| `w61-entrada-diario-nueva.png` | `/contabilidad/entrada-diario/nuevo/` | 200 | publicable, secundaria |
| `w62-plan-de-cuentas.png` | `/catalogo-cuentas/` | 200 | **excluida**: desborde horizontal |
| `w63-cuenta-nueva.png` | `/catalogo-cuentas/nuevo/` | 200 | publicable, secundaria |
| `w64-mapa-de-cuentas.png` | `/contabilidad/configuracion/mapa-de-cuentas/` | 200 | principal → `w30-mapa-de-cuentas.png` |
| `w65-configuracion-fiscal.png` | `/contabilidad/configuracion/regimen-fiscal/` | 200 | principal → `w28-configuracion-fiscal-itbis.png` |
| `w66-secuencias-ncf.png` | `/contabilidad/configuracion/secuencias-ncf/` | 200 | principal → `w29-secuencias-ncf.png` |
| `w67-catalogos.png` | `/contabilidad/catalogos/` | 200 | publicable, secundaria |
| `w68-catalogo-metodos-pago.png` | `/contabilidad/catalogos/clases/PAYMENT_METHOD/` | 200 | publicable, secundaria |
| `w69-panel-dgii.png` | `/reportes/run/dgii/` | 200 | **excluida**: título ilegible |
| `w70-dgii-606.png` | `/reportes/run/dgii-606/` | 200 | **excluida**: título ilegible y comentario de plantilla impreso |
| `w71-dgii-607.png` | `/reportes/run/dgii-607/` | 200 | **excluida**: título ilegible |
| `w72-dgii-608.png` | `/reportes/run/dgii-608/` | 200 | **excluida**: sin datos |
| `w73-dgii-623.png` | `/reportes/run/dgii-623/` | 200 | **excluida**: sin datos |
| `w74-606-manuales.png` | `/contabilidad/configuracion/606-manuales/` | 200 | **excluida**: vacía |
| `w75-623-registrar.png` | `/contabilidad/dgii/623/nuevo/` | 200 | publicable, secundaria |
| `w76-banco-panel.png` | `/banco/panel/` | 200 | **excluida**: comentario de plantilla impreso |
| `w77-banco-transacciones.png` | `/banco/?tab=all` | 200 | principal → `w31-banco-transacciones.png` |
| `w78-banco-conciliacion.png` | `/banco/conciliacion/` | 200 | principal → `w32-banco-conciliacion.png` |
| `w79-banco-cuentas.png` | `/banco/bancos/` | 200 | publicable, secundaria |
| `w80-banco-transaccion-nueva.png` | `/banco/transacciones/nueva/` | 200 | publicable, secundaria |
| `w81-nomina-resumen.png` | `/nomina/` | 200 | principal → `w33-nomina-resumen.png` |
| `w82-nomina-empleados.png` | `/nomina/empleados/` | 200 | publicable, secundaria |
| `w83-nomina-empleado-detalle.png` | `/nomina/empleados/1/` | 200 | principal → `w34-nomina-empleado.png` |
| `w84-nomina-conceptos.png` | `/nomina/empleados/1/configurar/` | 200 | **excluida**: campos cortados |
| `w85-nomina-periodos.png` | `/nomina/periodos/` | 200 | publicable, secundaria |
| `w86-nomina-periodo-detalle.png` | `/nomina/periodos/1/` | 200 | **excluida**: banner de pago bloqueado |
| `w87-nomina-vacaciones.png` | `/nomina/vacaciones/` | 200 | publicable, secundaria |
| `w88-nomina-vacaciones-calendario.png` | `/nomina/vacaciones/calendario/` | 200 | publicable, secundaria |
| `w89-nomina-retenciones.png` | `/nomina/configuracion/retenciones/` | 200 | principal → `w35-nomina-retenciones-legales.png` |
| `w90-nomina-contabilidad.png` | `/nomina/configuracion/contabilidad/` | 200 | principal → `w36-nomina-configuracion-contable.png` |
| `w91-nomina-reportes.png` | `/nomina/reportes/` | 200 | publicable, secundaria |
| `w92-nomina-importar.png` | `/nomina/importar/` | 200 | publicable, secundaria |
| `w93-nomina-licencias.png` | `/nomina/leaves/licenses/` | 200 | **excluida**: vacía |
| `w94-divisas.png` | `/divisas/?tab=fx-currencies` | 200 | **excluida**: maquetación rota |
| `w95-sucursales.png` | `/sucursales/` | 200 | principal → `w37-sucursales.png` |
| `w96-sucursal-detalle.png` | `/sucursales/1/` | 200 | **excluida**: privacidad (mapa) |
| `w97-sucursal-dashboard.png` | `/sucursales/1/dashboard/` | 200 | publicable, secundaria |
| `w98-sucursal-horarios.png` | `/sucursales/1/horarios/` | 200 | publicable, secundaria |
| `w99-sucursal-miembros.png` | `/sucursales/1/miembros/` | 200 | publicable, secundaria |
| `w100-reporte-ventas-sucursal.png` | `/sucursales/reportes/general/` | 200 | **excluida**: montos truncados |
| `w101-documentos.png` | `/documentos/` | 200 | principal → `w38-centro-de-documentos.png` |
| `w102-documento-proforma-editor.png` | `/documentos/documento/proforma/` | 200 | **excluida**: vista previa vacía |
| `w103-politicas.png` | `/documentos/politicas/` | 200 | publicable, secundaria |
| `w104-correos-automaticos.png` | `/documentos/correos-automaticos/` | 200 | principal → `w39-correos-automaticos.png` |
| `w105-reportes.png` | `/reportes/` | 200 | principal → `w40-centro-de-reportes.png` |
| `w106-reporte-cxc.png` | `/reportes/run/accounts-receivable/` | 200 | publicable, secundaria |
| `w107-reporte-cxp.png` | `/reportes/run/accounts-payable/` | 200 | **excluida**: montos partidos |
| `w108-reporte-caja-banco.png` | `/reportes/run/cash-bank/` | 200 | publicable, secundaria |
| `w109-reporte-reservas.png` | `/reportes/run/reservations/` | 200 | **excluida**: cifras no cuadran |
| `w110-balanza-comprobacion.png` | `/reportes/run/trial_balance/` | 200 | **excluida**: error JS |
| `w111-balance-general.png` | `/reportes/run/balance_sheet/` | 200 | **excluida**: error JS y descuadre |
| `w112-estado-resultados.png` | `/reportes/run/income_statement/` | 200 | **excluida**: error JS |
| `w113-config-resumen.png` | `/usuarios/config/` | 200 | publicable, secundaria |
| `w114-usuarios.png` | `/usuarios/users/` | 200 | principal → `w42-usuarios.png` |
| `w115-usuario-nuevo.png` | `/usuarios/users/create/` | 200 | publicable, secundaria |
| `w116-usuario-sesiones.png` | `/usuarios/users/2/sesiones/` | 200 | **excluida**: vacía |
| `w117-empresa-dgii.png` | `/usuarios/config/empresa-dgii/` | 200 | **excluida**: sin logo |
| `w118-bitacora.png` | `/usuarios/activity-log/` | 200 | **excluida**: «0 registros» incoherente |
| `w119-bitacora-detalle.png` | `/usuarios/activity-log/40/` | 200 | principal → `w43-evento-auditado.png` |
| `w120-notificaciones.png` | `/usuarios/notificaciones/` | 200 | principal → `w41-notificaciones.png` |
| `w121-perfil.png` | `/usuarios/perfil/` | 200 | publicable, secundaria |
| `w122-tutoriales.png` | `/tutoriales/` | 200 | principal → `w44-tutoriales.png` |
| `w123-tutoriales-asistente.png` | `/tutoriales/asistente/` | 200 | publicable, secundaria |
| `w124-tutorial-detalle.png` | `/tutoriales/que-es-un-asiento-contable/` | 200 | **excluida**: visor vacío |
| `w125-responsive-dashboard.png` | `/` | 200 | principal → `w45-responsive-dashboard.png` |
| `w126-responsive-reservas.png` | `/reservas/` | 200 | publicable, secundaria |
| `w127-responsive-reserva-detalle.png` | `/reservas/reserva/13/` | 200 | principal → `w46-responsive-reserva.png` |
| `w128-responsive-crm.png` | `/crm/` | 200 | principal → `w47-responsive-crm.png` |
| `w129-responsive-cxc.png` | `/contabilidad/cuentas-por-cobrar/?tab=receivable` | 200 | **excluida**: desborde a 390 px |
| `w130-responsive-nomina.png` | `/nomina/` | 200 | publicable, secundaria |
