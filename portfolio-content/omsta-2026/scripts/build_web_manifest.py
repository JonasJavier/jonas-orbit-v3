# portfolio-content/omsta-2026/scripts/build_web_manifest.py
"""Genera web/screenshots/manifest.md a partir de web-shots.json, raw/audit.json
y la curación manual de abajo (PRINCIPALES y EXCLUIDAS).

Uso: python build_web_manifest.py   (cualquier intérprete Python 3.10+)
"""
import json
import pathlib

BASE = pathlib.Path(__file__).resolve().parent.parent
shots = json.loads((BASE / "scripts/web-shots.json").read_text(encoding="utf-8-sig"))
audit = json.loads((BASE / "web/screenshots/raw/audit.json").read_text(encoding="utf-8"))

# raw -> (principal, módulo, qué muestra, por qué importa, alt, caption ≤15 palabras)
P = {
    "w01-login": ("w01-login", "Acceso", "Inicio de sesión", "Primera impresión de la marca", "Pantalla de acceso de OMSTA con panel oscuro de marca y formulario", "Acceso único para todo el equipo de la agencia."),
    "w02-dashboard": ("w02-dashboard", "Dashboard", "KPIs del mes y alertas operativas", "Resume la operación en una vista", "Dashboard con reservas del mes, cobrado, comisión, saldo por cobrar y alertas", "El mes de la agencia de un vistazo: ventas, cobros y alertas."),
    "w04-reservas-listado": ("w03-reservas-listado", "Reservas", "Listado con totales, filtros y estados", "Centro del trabajo diario", "Listado de reservas con cartera, cobrado, por cobrar y comisión", "Cada reserva con su estado de venta y de cobro."),
    "w05-reserva-hotel-resumen": ("w04-reserva-hotel-resumen", "Reservas", "Ficha de reserva de hotel", "Venta, cobro, comisión y saldo juntos", "Ficha de reserva de hotel con 70 % pagado y escalera de estados", "Una reserva: cuánto se vendió, cobró y falta."),
    "w07-reserva-hotel-pagos": ("w05-reserva-agenda-pago-suplidor", "Reservas", "Pestaña Pagos con agenda de pago al suplidor", "Pago al proveedor calculado desde la entrada", "Agenda de pago al suplidor programada 15 días antes de la entrada", "La fecha de pago al hotel se calcula sola."),
    "w09-reserva-facturada": ("w06-reserva-facturada-paquete-contable", "Reservas", "Pestaña Facturación de una reserva facturada", "Factura, NCF y asientos enlazados", "Reserva en estado Voucher con factura, NCF y asientos publicados", "Factura con NCF y sus asientos, desde la reserva."),
    "w10-reserva-actividad": ("w07-reserva-historial-auditado", "Reservas", "Historial de 25 eventos de la reserva", "Trazabilidad de cada cambio", "Historial detallado de la reserva con eventos auditados y financieros", "Todo lo que pasó con la reserva, auditado."),
    "w13-reserva-paquete-producto": ("w08-reserva-paquete-componentes", "Reservas", "Componentes de un paquete", "Otro producto con su propio formulario", "Paquete con hotel, traslado y tour y sus subtotales", "Paquetes armados por componentes, cada uno con su costo."),
    "w15-reserva-seguro-viajeros": ("w09-reserva-seguro-asegurados", "Reservas", "Asegurados de un seguro de viaje", "Cobertura de varios productos", "Seguro de viaje saldado con dos asegurados y su pasaporte", "También seguros, cruceros, vuelos y otros servicios."),
    "w19-nueva-reserva-vuelo": ("w10-nueva-reserva-vuelo", "Reservas", "Alta de vuelo con resumen en vivo", "Formulario guiado por secciones", "Formulario de reserva de vuelo con navegación rápida y resumen en vivo", "Alta guiada con resumen de precio en vivo."),
    "w21-nueva-reserva-crucero": ("w11-nueva-reserva-crucero", "Reservas", "Alta de crucero", "Mismo patrón para cada producto", "Formulario de reserva de crucero con itinerario y pasajeros", "Mismo patrón de alta para cada tipo de producto."),
    "w30-aerolineas-destinos": ("w12-catalogo-aerolineas", "Catálogos", "Catálogo de aerolíneas y destinos", "Autocompletado de formularios", "Catálogo de 27 aerolíneas con código IATA y uso frecuente", "Catálogos que alimentan el autocompletado de reservas."),
    "w33-crm-clientes": ("w13-crm-clientes", "CRM", "Listado de clientes", "Base de clientes y empresas", "CRM con 26 clientes y 3 empresas", "Clientes y empresas en un mismo CRM."),
    "w36-crm-empresa-ficha": ("w14-crm-empresa-ficha", "CRM", "Ficha de empresa", "Datos fiscales y de contacto", "Ficha de empresa con datos fiscales, representante y contacto", "Ficha de empresa con RNC y régimen de facturación."),
    "w38-caja-pagos": ("w15-caja-pagos", "Cobros", "Caja y pagos", "Todos los cobros con soporte y estado", "Listado de pagos con método, estado y soporte cargado", "Cada cobro con su método, estado y comprobante."),
    "w40-pago-protegido": ("w16-pago-protegido", "Cobros", "Pago contabilizado protegido", "Historial financiero no editable", "Pago que no se edita directamente: comprobantes, corrección guiada o reembolso", "Un pago contabilizado no se edita: se corrige o reembolsa."),
    "w41-reembolso": ("w17-reembolso-guiado", "Cobros", "Reembolso guiado", "Reverso con trazabilidad contable", "Reembolso de un pago con su trazabilidad contable", "Reembolso con reverso contable y motivo obligatorio."),
    "w42-cxc": ("w18-cuentas-por-cobrar", "Contabilidad", "Cuentas por cobrar", "Cartera y comisión al día", "Cuentas por cobrar con cartera, comisión y pendiente", "Cuentas por cobrar derivadas de reservas y pagos."),
    "w45-cxp": ("w19-cuentas-por-pagar", "Contabilidad", "Cuentas por pagar y agenda", "Deuda con proveedores por vencimiento", "Cuentas por pagar con agenda de vencidas, hoy y próximas", "Lo que se debe a proveedores, ordenado por vencimiento."),
    "w48-cxp-detalle-pagada": ("w20-cxp-saldada", "Contabilidad", "CxP saldada", "Ciclo proveedor cerrado", "Cuenta por pagar saldada al 100 %", "Del costo al pago: la cuenta por pagar se salda."),
    "w49-documento-fiscal-suplidor": ("w21-documento-fiscal-suplidor", "Fiscal", "Documento fiscal del proveedor", "Base del formato DGII 606", "Documento fiscal del proveedor con NCF, tipo de gasto 606 y pago aplicado", "La factura del proveedor alimenta el 606 de la DGII."),
    "w44-factura-editar": ("w22-factura-paquete-contable", "Fiscal", "Factura con su paquete contable", "Emisión y contabilidad atómicas", "Factura con tres asientos publicados como paquete", "Emitir la factura publica sus asientos como una unidad."),
    "w55-libro-diario": ("w23-libro-diario", "Ledger", "Libro diario", "Partida doble con origen", "Libro diario con asientos cuadrados y su documento de origen", "Cada asiento cuadra y sabe qué documento lo generó."),
    "w56-asiento-detalle": ("w24-asiento-explicado", "Ledger", "Detalle de asiento", "Contabilidad explicada", "Asiento con explicación de débito y crédito y trazabilidad", "El asiento explica en español qué registra y por qué."),
    "w57-asientos-de-reserva": ("w25-asientos-de-una-reserva", "Ledger", "Asientos de una reserva", "Ciclo contable completo por venta", "Seis asientos de una reserva: cobro, factura, costo y pago al proveedor", "Toda la contabilidad de una venta en una tabla."),
    "w59-salud-contable": ("w26-salud-contable", "Contabilidad", "Salud contable", "Control interno de solo lectura", "Salud contable sin bloqueos de cierre e identidades 9/9", "Auditor interno: identidades contables que deben cuadrar."),
    "w58-periodos-contables": ("w27-cierre-de-periodo", "Contabilidad", "Checklist de cierre", "Cierre mensual con verificaciones", "Checklist de cierre del período con advertencias", "Antes de cerrar el mes, el sistema revisa todo."),
    "w65-configuracion-fiscal": ("w28-configuracion-fiscal-itbis", "Fiscal", "Régimen de ITBIS por servicio", "Reglas fiscales configurables", "Configuración de ITBIS por tipo de servicio con cuentas de ingreso y costo", "ITBIS y cuentas por tipo de servicio, configurables."),
    "w66-secuencias-ncf": ("w29-secuencias-ncf", "Fiscal", "Secuencias NCF", "Numeración fiscal sin duplicados", "Rangos NCF autorizados con disponibilidad y vigencia", "Numeración fiscal automática y sin duplicados."),
    "w64-mapa-de-cuentas": ("w30-mapa-de-cuentas", "Contabilidad", "Mapa de cuentas del sistema", "Qué cuenta usa cada operación", "Mapa de cuentas con débito y crédito por operación", "Qué cuenta usa cada operación, y quién la decide."),
    "w77-banco-transacciones": ("w31-banco-transacciones", "Banco", "Transacciones bancarias", "Entradas y salidas en DOP", "Transacciones bancarias con entradas, salidas y flujo neto", "Movimientos bancarios generados por cobros y pagos."),
    "w78-banco-conciliacion": ("w32-banco-conciliacion", "Banco", "Conciliación bancaria", "Reglas antes de conciliar", "Conciliación bancaria que exige asiento antes de conciliar", "Conciliación masiva con validaciones seguras."),
    "w81-nomina-resumen": ("w33-nomina-resumen", "Nómina", "Resumen de nómina", "RRHH dentro del mismo sistema", "Resumen de nómina con gráfico mensual y plantilla por departamento", "Nómina dentro del ERP: empleados, períodos y pagos."),
    "w83-nomina-empleado-detalle": ("w34-nomina-empleado", "Nómina", "Ficha de empleado", "Salario, vacaciones y préstamos", "Ficha de empleada con salario, neto estimado, vacaciones y préstamos", "Ficha del empleado con salario, neto y vacaciones."),
    "w89-nomina-retenciones": ("w35-nomina-retenciones-legales", "Nómina", "Retenciones legales AFP/SFS/ISR", "Ley dominicana configurable", "Retenciones AFP, SFS e ISR con su base de cálculo", "AFP, SFS e ISR dominicanos, configurables sin código."),
    "w90-nomina-contabilidad": ("w36-nomina-configuracion-contable", "Nómina", "Configuración contable de nómina", "Nómina que publica asientos", "Mapeo de cuentas de sueldos, banco y retenciones", "Pagar la nómina publica su asiento automáticamente."),
    "w95-sucursales": ("w37-sucursales", "Sucursales", "Sucursales", "Operación multi-sucursal", "Dos sucursales activas con empleados", "Operación multi-sucursal con permisos por sucursal."),
    "w101-documentos": ("w38-centro-de-documentos", "Documentos", "Centro de documentos", "Proformas, recibos y vouchers configurables", "Centro de documentos con siete documentos configurables", "Siete documentos para el cliente, configurables."),
    "w104-correos-automaticos": ("w39-correos-automaticos", "Documentos", "Correos automáticos", "Comunicación con el cliente", "Correos automáticos de confirmación y recordatorios", "Correos al cliente que se encienden uno a uno."),
    "w105-reportes": ("w40-centro-de-reportes", "Reportes", "Centro de reportes", "Report registry único", "Centro de reportes operativos, contables y fiscales", "Reportes operativos, contables y fiscales en un lugar."),
    "w120-notificaciones": ("w41-notificaciones", "Usuarios", "Notificaciones", "Flujo entre reservas y contabilidad", "Notificaciones de pagos registrados y aplicados", "Reservas registra el pago; contabilidad lo verifica."),
    "w114-usuarios": ("w42-usuarios", "Usuarios", "Usuarios y accesos", "Roles y módulos", "Listado de usuarios con estado y rol", "Usuarios con rol, estado y acciones de acceso."),
    "w119-bitacora-detalle": ("w43-evento-auditado", "Usuarios", "Evento auditado", "Bitácora inmutable", "Evento auditado inmutable: quién, qué, sobre qué registro", "Cada cambio queda en una bitácora que no se edita."),
    "w122-tutoriales": ("w44-tutoriales", "Tutoriales", "Centro de tutoriales", "Formación dentro de la app", "Centro con 71 tutoriales por módulo", "71 tutoriales dentro del sistema, por módulo."),
    "w125-responsive-dashboard": ("w45-responsive-dashboard", "Responsive", "Dashboard a 390 px", "La web funciona en el móvil", "Dashboard en ancho de teléfono", "La web también se adapta al teléfono."),
    "w127-responsive-reserva-detalle": ("w46-responsive-reserva", "Responsive", "Ficha de reserva a 390 px", "Detalle legible en pantalla chica", "Ficha de reserva en ancho de teléfono con 70 % pagado", "La ficha de reserva, legible en pantalla chica."),
    "w128-responsive-crm": ("w47-responsive-crm", "Responsive", "CRM a 390 px en tarjetas", "Tablas que pasan a tarjetas", "CRM en tarjetas en ancho de teléfono", "Las tablas pasan a tarjetas bajo 768 px."),
}

EXCL = {
    "w12-reserva-crucero-producto": "coma inicial por ciudad vacía",
    "w16-reserva-anulada": "cifras no cuadran",
    "w17-rooming-list": "texto cortado",
    "w18-nueva-reserva-hotel": "título invisible",
    "w26-hotel-detalle": "pobre (sin foto ni tarifas)",
    "w28-suplidor-detalle": "pobre (0 reservas)",
    "w53-notas-proveedor": "vacía",
    "w54-notas-cliente": "vacía",
    "w60-entradas-diario": "vacía",
    "w62-plan-de-cuentas": "desborde horizontal",
    "w69-panel-dgii": "título ilegible",
    "w70-dgii-606": "título ilegible y comentario de plantilla impreso",
    "w71-dgii-607": "título ilegible",
    "w72-dgii-608": "sin datos",
    "w73-dgii-623": "sin datos",
    "w74-606-manuales": "vacía",
    "w76-banco-panel": "comentario de plantilla impreso",
    "w84-nomina-conceptos": "campos cortados",
    "w86-nomina-periodo-detalle": "banner de pago bloqueado",
    "w93-nomina-licencias": "vacía",
    "w94-divisas": "maquetación rota",
    "w96-sucursal-detalle": "privacidad (mapa)",
    "w100-reporte-ventas-sucursal": "montos truncados",
    "w102-documento-proforma-editor": "vista previa vacía",
    "w107-reporte-cxp": "montos partidos",
    "w109-reporte-reservas": "cifras no cuadran",
    "w110-balanza-comprobacion": "error JS",
    "w111-balance-general": "error JS y descuadre",
    "w112-estado-resultados": "error JS",
    "w116-usuario-sesiones": "vacía",
    "w117-empresa-dgii": "sin logo",
    "w118-bitacora": "«0 registros» incoherente",
    "w124-tutorial-detalle": "visor vacío",
    "w129-responsive-cxc": "desborde a 390 px",
}

lines = [
    "<!-- portfolio-content/omsta-2026/web/screenshots/manifest.md · 2026-09-25 · commit 3f5cea73 -->",
    "# Manifest de capturas web",
    "",
    "Playwright 1.61.1 (Chromium headless), 1440×900 con `deviceScaleFactor: 2` (PNG de 2880×1800);",
    "las `responsive` a 390×844 ×2. Servidor local `127.0.0.1:8130`, BD aislada `omsta_portfolio`",
    "con datos sintéticos, sesión de `demo.admin` (rol **admin**) salvo el login (sin sesión).",
    "Script: `scripts/capture_web.mjs` + `scripts/web-shots.json`. Auditoría por toma: `raw/audit.json`.",
    "Generado por `scripts/build_web_manifest.py`.",
    "",
    f"- `raw/`: {len(shots)} capturas. `principales/`: {len(P)} (orden narrativo, renombradas).",
    f"- Excluidas por la regla principal: {len(EXCL)} (motivo completo en `../../excluded.md`).",
    "- El resto de `raw/` es publicable pero redundante o secundario.",
    "",
    "## Principales",
    "",
    "| Archivo | Origen en raw | Módulo | URL | Qué muestra | Por qué importa | Rol | Alt | Caption |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
]
urls = {s["name"]: s["url"] for s in shots}
for raw, (dst, mod, que, porque, alt, cap) in P.items():
    assert len(cap.split()) <= 15, cap
    rol = "sin sesión" if raw == "w01-login" else "admin"
    lines.append(f"| `{dst}.png` | `{raw}.png` | {mod} | `{urls[raw]}` | {que} | {porque} | {rol} | {alt} | {cap} |")

lines += ["", "## Todas las capturas de raw/", "",
          "| Archivo | URL | HTTP | Estado en el paquete |", "| --- | --- | --- | --- |"]
for s in shots:
    n = s["name"]
    a = audit.get(n, {})
    if n in P:
        estado = f"principal → `{P[n][0]}.png`"
    elif n in EXCL:
        estado = f"**excluida**: {EXCL[n]}"
    else:
        estado = "publicable, secundaria"
    lines.append(f"| `{n}.png` | `{s['url']}` | {a.get('status', '—')} | {estado} |")

(BASE / "web/screenshots/manifest.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(len(P), len(EXCL), len(shots))
