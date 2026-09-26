# portfolio-content/omsta-2026/scripts/build_mobile_manifest.py
"""Copia las principales móviles y genera mobile/screenshots/manifest.md.

Curación manual: MOD (qué muestra cada toma), P (principales con alt y
caption ≤15 palabras) y EXCL (excluidas por la regla principal).
"""
import pathlib
import shutil

BASE = pathlib.Path(__file__).resolve().parent.parent / "mobile/screenshots"
RAW, PRIN = BASE / "raw", BASE / "principales"

# raw -> (módulo, ruta de Expo Router, qué muestra)
MOD = {
    "m01-login": ("Acceso", "/login", "Pantalla de acceso"),
    "m02-inicio": ("Inicio", "/", "KPIs del mes, alertas y finanzas"),
    "m03-inicio-actividad-alertas": ("Inicio", "/", "Actividad del mes y alertas operativas"),
    "m04-reservas-listado": ("Reservas", "/reservas", "Listado con búsqueda, filtros y estados"),
    "m05-reserva-ficha": ("Reservas", "/reservas/[id]", "Ficha: saldo, % cobrado y acciones rápidas"),
    "m06-reserva-estado-acciones": ("Reservas", "/reservas/[id]", "Escalera de estados y acciones"),
    "m07-reserva-fechas-proveedor": ("Reservas", "/reservas/[id]", "Fechas, cliente y proveedor"),
    "m08-reserva-resumen-financiero": ("Reservas", "/reservas/[id]", "Resumen financiero y cuenta por pagar"),
    "m09-reserva-pestana-hotel": ("Reservas", "/reservas/[id]", "Pestaña Hotel"),
    "m10-reserva-pestana-pagos": ("Reservas", "/reservas/[id]", "Pestaña Pagos con acciones por pago"),
    "m11-reserva-pestana-expediente": ("Reservas", "/reservas/[id]", "Pestaña Expediente"),
    "m12-registrar-cobro": ("Cobros", "/reservas/[id]/pagos/nuevo", "Registrar cobro «Por verificar»"),
    "m13-registrar-cobro-comprobante": ("Cobros", "/reservas/[id]/pagos/nuevo", "Bloque de comprobantes (sin adjunto)"),
    "m14-nueva-reserva-tipo-y-borrador": ("Asistente", "/reservas/nueva", "Tipo de producto y borrador guardado"),
    "m15-asistente-paso-cliente": ("Asistente", "/reservas/nueva/[tipo]", "Paso 1: cliente"),
    "m16-asistente-buscar-cliente": ("Asistente", "/reservas/nueva/[tipo]", "Hoja de búsqueda de cliente"),
    "m17-asistente-cliente-elegido": ("Asistente", "/reservas/nueva/[tipo]", "Cliente elegido"),
    "m18-asistente-paso-hotel": ("Asistente", "/reservas/nueva/[tipo]", "Paso 2: hotel, plan y moneda"),
    "m19-asistente-buscar-hotel": ("Asistente", "/reservas/nueva/[tipo]", "Hoja de búsqueda de hotel"),
    "m20-asistente-calendario": ("Asistente", "/reservas/nueva/[tipo]", "Calendario de rango con noches"),
    "m21-asistente-hotel-con-fechas": ("Asistente", "/reservas/nueva/[tipo]", "Paso 2 completo"),
    "m22-asistente-habitaciones": ("Asistente", "/reservas/nueva/[tipo]", "Paso 3: habitación y ocupación"),
    "m23-asistente-habitaciones-tarifa": ("Asistente", "/reservas/nueva/[tipo]", "Paso 3: acompañante y tarifa"),
    "m24-asistente-dinero": ("Asistente", "/reservas/nueva/[tipo]", "Paso 4: descuento, comisión, pago y plazos"),
    "m25-asistente-confirmar": ("Asistente", "/reservas/nueva/[tipo]", "Paso 5: resumen calculado por el servidor"),
    "m26-clientes-listado": ("Clientes", "/clientes", "Personas y empresas"),
    "m27-cliente-ficha": ("Clientes", "/clientes/persona/[id]", "Ficha con saldo y acciones de contacto"),
    "m28-cliente-ficha-datos": ("Clientes", "/clientes/persona/[id]", "Datos, contacto y registro"),
    "m29-cliente-formulario": ("Clientes", "/clientes/formulario", "Alta de cliente"),
    "m30-cobros": ("Cobros", "/cobros", "Cartera por cobrar"),
    "m31-avisos": ("Avisos", "/avisos", "Avisos de pagos registrados y aplicados"),
    "m32-catalogos": ("Catálogos", "/catalogos", "Índice de catálogos"),
    "m33-suplidores": ("Catálogos", "/catalogos/suplidores", "Suplidores"),
    "m34-hoteles": ("Catálogos", "/catalogos/hoteles", "Hoteles"),
    "m35-hotel-ficha": ("Catálogos", "/catalogos/hoteles/[id]", "Ficha de hotel"),
    "m36-aerolineas": ("Catálogos", "/catalogos/aerolineas", "Aerolíneas con código IATA"),
    "m37-navieras": ("Catálogos", "/catalogos/navieras", "Navieras"),
    "m38-configuracion": ("Configuración", "/configuracion", "Centro de configuración"),
    "m39-usuarios": ("Configuración", "/configuracion/usuarios", "Usuarios con presencia"),
    "m40-empresa-dgii": ("Configuración", "/configuracion/empresa", "Empresa y DGII"),
    "m41-sucursales": ("Configuración", "/configuracion/sucursales", "Sucursales"),
    "m42-monedas-y-tasas": ("Configuración", "/configuracion/divisas", "Monedas, tasas y convertidor"),
    "m43-retenciones-nomina": ("Configuración", "/configuracion/retenciones", "Retenciones AFP, SFS e ISR"),
    "m44-reportes": ("Configuración", "/configuracion/reportes", "Reportes de problemas"),
}

# raw -> (principal, alt, caption)
P = {
    "m01-login": ("m01-login", "Pantalla de acceso de la app Omsta con usuario y contraseña", "Acceso a la app del equipo, con desbloqueo biométrico después."),
    "m02-inicio": ("m02-inicio", "Inicio con pagos vencidos, check-ins, por cobrar, cobrado y comisión", "El mes de la agencia en el bolsillo."),
    "m04-reservas-listado": ("m03-reservas", "Listado de reservas con filtros, montos y estados", "Todas las reservas con su estado de venta y cobro."),
    "m05-reserva-ficha": ("m04-reserva-ficha", "Ficha de reserva con saldo pendiente, 70 % cobrado y acciones", "Saldo, vencimiento y acciones rápidas de una reserva."),
    "m10-reserva-pestana-pagos": ("m05-reserva-pagos", "Pestaña de pagos con recibo, WhatsApp y correo por pago", "Cada pago con su recibo, listo para enviar por WhatsApp."),
    "m12-registrar-cobro": ("m06-registrar-cobro", "Formulario de cobro que queda por verificar hasta que contabilidad lo aplica", "Cobrar desde la calle; contabilidad lo verifica después."),
    "m14-nueva-reserva-tipo-y-borrador": ("m07-nueva-reserva", "Selector de seis productos y un borrador para continuar", "Seis productos y borradores que no se pierden."),
    "m16-asistente-buscar-cliente": ("m08-asistente-cliente", "Hoja de búsqueda de clientes en el asistente", "Buscar cliente por nombre, cédula o teléfono."),
    "m19-asistente-buscar-hotel": ("m09-asistente-hotel", "Hoja de búsqueda de hoteles con ubicación y plan", "Elegir hotel desde el catálogo de la agencia."),
    "m20-asistente-calendario": ("m10-asistente-calendario", "Calendario de rango con entrada, salida y 4 noches", "Calendario propio: entrada, salida y noches de un toque."),
    "m23-asistente-habitaciones-tarifa": ("m11-asistente-habitaciones", "Paso de habitaciones con titular, acompañante y tarifa", "Habitaciones, huéspedes y tarifa, paso a paso."),
    "m24-asistente-dinero": ("m12-asistente-dinero", "Paso de dinero con descuento, comisión, pago inicial y plazos", "Descuento, comisión, pago inicial y plazos en un paso."),
    "m26-clientes-listado": ("m13-clientes", "Listado de clientes personas y empresas", "Clientes y empresas, con filtros por estado."),
    "m27-cliente-ficha": ("m14-cliente-ficha", "Ficha de cliente con saldo y botones de llamada, WhatsApp y correo", "Ficha del cliente: saldo y contacto en un toque."),
    "m31-avisos": ("m15-avisos", "Avisos de pagos registrados y verificados", "Avisos cuando contabilidad verifica un pago."),
    "m32-catalogos": ("m16-catalogos", "Índice de catálogos de proveedores, vuelos y cruceros", "Catálogos de proveedores, vuelos y cruceros."),
    "m35-hotel-ficha": ("m17-hotel-ficha", "Ficha de hotel con categorías, comisión y contacto", "Ficha de hotel con comisión y contacto directo."),
    "m38-configuracion": ("m18-configuracion", "Centro de configuración por secciones", "Administración completa también desde el teléfono."),
    "m43-retenciones-nomina": ("m19-retenciones", "Retenciones de nómina AFP, SFS e ISR activables", "Retenciones de ley configurables desde la app."),
}

EXCL = {
    "m30-cobros": "texto solapado: la etiqueta «Pago por verificar» pisa «Saldo · total»",
    "m44-reportes": "vacía («No hay reportes abiertos»)",
    "m07-reserva-fechas-proveedor": "incoherente: «Sin suplidor asignado» mientras la CxP es de Coral Azul",
    "m25-asistente-confirmar": "comisión 0 % (la toma se hizo sin tarifa de costo): se ve como un error",
}

PRIN.mkdir(exist_ok=True)
for f in PRIN.glob("*.png"):
    f.unlink()
for raw, (dst, _, _) in P.items():
    shutil.copy2(RAW / f"{raw}.png", PRIN / f"{dst}.png")

L = [
    "<!-- portfolio-content/omsta-2026/mobile/screenshots/manifest.md · 2026-09-26 · commit 3f5cea73 -->",
    "# Manifest de capturas móviles",
    "",
    "Motorola Edge 2024 (Android), PNG nativos de **1080×2400** con `adb exec-out screencap -p`, sin",
    "reescalar ni marcos. Barra de estado con el modo demo de System UI (9:41, batería 100 %, sin",
    "notificaciones). Build de desarrollo de la app contra el servidor local `127.0.0.1:8130`",
    "(BD aislada `omsta_portfolio`, datos sintéticos), usuario **`demo.admin`** (rol admin).",
    "Scripts: `scripts/capture_mobile.ps1`; este archivo lo genera `scripts/build_mobile_manifest.py`.",
    "",
    f"- `raw/`: {len(MOD)} capturas. `principales/`: {len(P)}. Excluidas: {len(EXCL)} (+ las de privacidad, que no se guardaron).",
    "- No se capturó: registro de cobro **con** comprobante adjunto (exigía abrir el selector de archivos",
    "  del teléfono, con archivos personales), bloqueo biométrico (el aviso del sistema sale negro y",
    "  cancelarlo cierra la app), estado sin conexión (requiere activar el modo avión, un ajuste del",
    "  teléfono) y pantalla «Actualiza la app» (requiere reiniciar el servidor y la app).",
    "- **Privacidad**: el login cargó la ubicación real del teléfono (la app ya tenía el permiso). Las",
    "  pantallas «Mi cuenta» y el diálogo de cerrar sesión la mostraban: esas capturas se **borraron**",
    "  y no están en el paquete. Tampoco se capturaron dispositivos, sesiones, «Quién está conectado»",
    "  ni Actividad. Después se reconstruyó la BD de portafolio para eliminar esa ubicación.",
    "- iOS: no hay build; lista de tomas en `inbox-ios/README.md`.",
    "",
    "## Principales",
    "",
    "| Archivo | Origen en raw | Módulo | Ruta | Qué muestra | Rol | Alt | Caption |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
]
for raw, (dst, alt, cap) in P.items():
    assert len(cap.split()) <= 15, cap
    mod, ruta, que = MOD[raw]
    L.append(f"| `{dst}.png` | `{raw}.png` | {mod} | `{ruta}` | {que} | admin | {alt} | {cap} |")
L += ["", "## Todas las capturas de raw/", "", "| Archivo | Módulo | Ruta | Qué muestra | Estado |", "| --- | --- | --- | --- | --- |"]
for raw, (mod, ruta, que) in MOD.items():
    assert (RAW / f"{raw}.png").exists(), raw
    est = f"principal → `{P[raw][0]}.png`" if raw in P else (f"**excluida**: {EXCL[raw]}" if raw in EXCL else "publicable, secundaria")
    L.append(f"| `{raw}.png` | {mod} | `{ruta}` | {que} | {est} |")
L += ["", "## Vídeo", "", "No grabado."]
(BASE / "manifest.md").write_text("\n".join(L) + "\n", encoding="utf-8")
print(len(MOD), len(P), len(EXCL))
