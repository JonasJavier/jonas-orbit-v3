<!-- portfolio-content/omsta-2026/mobile/screenshots/manifest.md · 2026-09-26 · commit 3f5cea73 -->
# Manifest de capturas móviles

Motorola Edge 2024 (Android), PNG nativos de **1080×2400** con `adb exec-out screencap -p`, sin
reescalar ni marcos. Barra de estado con el modo demo de System UI (9:41, batería 100 %, sin
notificaciones). Build de desarrollo de la app contra el servidor local `127.0.0.1:8130`
(BD aislada `omsta_portfolio`, datos sintéticos), usuario **`demo.admin`** (rol admin).
Scripts: `scripts/capture_mobile.ps1`; este archivo lo genera `scripts/build_mobile_manifest.py`.

- `raw/`: 44 capturas. `principales/`: 19. Excluidas: 4 (+ las de privacidad, que no se guardaron).
- No se capturó: registro de cobro **con** comprobante adjunto (exigía abrir el selector de archivos
  del teléfono, con archivos personales), bloqueo biométrico (el aviso del sistema sale negro y
  cancelarlo cierra la app), estado sin conexión (requiere activar el modo avión, un ajuste del
  teléfono) y pantalla «Actualiza la app» (requiere reiniciar el servidor y la app).
- **Privacidad**: el login cargó la ubicación real del teléfono (la app ya tenía el permiso). Las
  pantallas «Mi cuenta» y el diálogo de cerrar sesión la mostraban: esas capturas se **borraron**
  y no están en el paquete. Tampoco se capturaron dispositivos, sesiones, «Quién está conectado»
  ni Actividad. Después se reconstruyó la BD de portafolio para eliminar esa ubicación.
- iOS: no hay build; lista de tomas en `inbox-ios/README.md`.

## Principales

| Archivo | Origen en raw | Módulo | Ruta | Qué muestra | Rol | Alt | Caption |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `m01-login.png` | `m01-login.png` | Acceso | `/login` | Pantalla de acceso | admin | Pantalla de acceso de la app Omsta con usuario y contraseña | Acceso a la app del equipo, con desbloqueo biométrico después. |
| `m02-inicio.png` | `m02-inicio.png` | Inicio | `/` | KPIs del mes, alertas y finanzas | admin | Inicio con pagos vencidos, check-ins, por cobrar, cobrado y comisión | El mes de la agencia en el bolsillo. |
| `m03-reservas.png` | `m04-reservas-listado.png` | Reservas | `/reservas` | Listado con búsqueda, filtros y estados | admin | Listado de reservas con filtros, montos y estados | Todas las reservas con su estado de venta y cobro. |
| `m04-reserva-ficha.png` | `m05-reserva-ficha.png` | Reservas | `/reservas/[id]` | Ficha: saldo, % cobrado y acciones rápidas | admin | Ficha de reserva con saldo pendiente, 70 % cobrado y acciones | Saldo, vencimiento y acciones rápidas de una reserva. |
| `m05-reserva-pagos.png` | `m10-reserva-pestana-pagos.png` | Reservas | `/reservas/[id]` | Pestaña Pagos con acciones por pago | admin | Pestaña de pagos con recibo, WhatsApp y correo por pago | Cada pago con su recibo, listo para enviar por WhatsApp. |
| `m06-registrar-cobro.png` | `m12-registrar-cobro.png` | Cobros | `/reservas/[id]/pagos/nuevo` | Registrar cobro «Por verificar» | admin | Formulario de cobro que queda por verificar hasta que contabilidad lo aplica | Cobrar desde la calle; contabilidad lo verifica después. |
| `m07-nueva-reserva.png` | `m14-nueva-reserva-tipo-y-borrador.png` | Asistente | `/reservas/nueva` | Tipo de producto y borrador guardado | admin | Selector de seis productos y un borrador para continuar | Seis productos y borradores que no se pierden. |
| `m08-asistente-cliente.png` | `m16-asistente-buscar-cliente.png` | Asistente | `/reservas/nueva/[tipo]` | Hoja de búsqueda de cliente | admin | Hoja de búsqueda de clientes en el asistente | Buscar cliente por nombre, cédula o teléfono. |
| `m09-asistente-hotel.png` | `m19-asistente-buscar-hotel.png` | Asistente | `/reservas/nueva/[tipo]` | Hoja de búsqueda de hotel | admin | Hoja de búsqueda de hoteles con ubicación y plan | Elegir hotel desde el catálogo de la agencia. |
| `m10-asistente-calendario.png` | `m20-asistente-calendario.png` | Asistente | `/reservas/nueva/[tipo]` | Calendario de rango con noches | admin | Calendario de rango con entrada, salida y 4 noches | Calendario propio: entrada, salida y noches de un toque. |
| `m11-asistente-habitaciones.png` | `m23-asistente-habitaciones-tarifa.png` | Asistente | `/reservas/nueva/[tipo]` | Paso 3: acompañante y tarifa | admin | Paso de habitaciones con titular, acompañante y tarifa | Habitaciones, huéspedes y tarifa, paso a paso. |
| `m12-asistente-dinero.png` | `m24-asistente-dinero.png` | Asistente | `/reservas/nueva/[tipo]` | Paso 4: descuento, comisión, pago y plazos | admin | Paso de dinero con descuento, comisión, pago inicial y plazos | Descuento, comisión, pago inicial y plazos en un paso. |
| `m13-clientes.png` | `m26-clientes-listado.png` | Clientes | `/clientes` | Personas y empresas | admin | Listado de clientes personas y empresas | Clientes y empresas, con filtros por estado. |
| `m14-cliente-ficha.png` | `m27-cliente-ficha.png` | Clientes | `/clientes/persona/[id]` | Ficha con saldo y acciones de contacto | admin | Ficha de cliente con saldo y botones de llamada, WhatsApp y correo | Ficha del cliente: saldo y contacto en un toque. |
| `m15-avisos.png` | `m31-avisos.png` | Avisos | `/avisos` | Avisos de pagos registrados y aplicados | admin | Avisos de pagos registrados y verificados | Avisos cuando contabilidad verifica un pago. |
| `m16-catalogos.png` | `m32-catalogos.png` | Catálogos | `/catalogos` | Índice de catálogos | admin | Índice de catálogos de proveedores, vuelos y cruceros | Catálogos de proveedores, vuelos y cruceros. |
| `m17-hotel-ficha.png` | `m35-hotel-ficha.png` | Catálogos | `/catalogos/hoteles/[id]` | Ficha de hotel | admin | Ficha de hotel con categorías, comisión y contacto | Ficha de hotel con comisión y contacto directo. |
| `m18-configuracion.png` | `m38-configuracion.png` | Configuración | `/configuracion` | Centro de configuración | admin | Centro de configuración por secciones | Administración completa también desde el teléfono. |
| `m19-retenciones.png` | `m43-retenciones-nomina.png` | Configuración | `/configuracion/retenciones` | Retenciones AFP, SFS e ISR | admin | Retenciones de nómina AFP, SFS e ISR activables | Retenciones de ley configurables desde la app. |

## Todas las capturas de raw/

| Archivo | Módulo | Ruta | Qué muestra | Estado |
| --- | --- | --- | --- | --- |
| `m01-login.png` | Acceso | `/login` | Pantalla de acceso | principal → `m01-login.png` |
| `m02-inicio.png` | Inicio | `/` | KPIs del mes, alertas y finanzas | principal → `m02-inicio.png` |
| `m03-inicio-actividad-alertas.png` | Inicio | `/` | Actividad del mes y alertas operativas | publicable, secundaria |
| `m04-reservas-listado.png` | Reservas | `/reservas` | Listado con búsqueda, filtros y estados | principal → `m03-reservas.png` |
| `m05-reserva-ficha.png` | Reservas | `/reservas/[id]` | Ficha: saldo, % cobrado y acciones rápidas | principal → `m04-reserva-ficha.png` |
| `m06-reserva-estado-acciones.png` | Reservas | `/reservas/[id]` | Escalera de estados y acciones | publicable, secundaria |
| `m07-reserva-fechas-proveedor.png` | Reservas | `/reservas/[id]` | Fechas, cliente y proveedor | **excluida**: incoherente: «Sin suplidor asignado» mientras la CxP es de Coral Azul |
| `m08-reserva-resumen-financiero.png` | Reservas | `/reservas/[id]` | Resumen financiero y cuenta por pagar | publicable, secundaria |
| `m09-reserva-pestana-hotel.png` | Reservas | `/reservas/[id]` | Pestaña Hotel | publicable, secundaria |
| `m10-reserva-pestana-pagos.png` | Reservas | `/reservas/[id]` | Pestaña Pagos con acciones por pago | principal → `m05-reserva-pagos.png` |
| `m11-reserva-pestana-expediente.png` | Reservas | `/reservas/[id]` | Pestaña Expediente | publicable, secundaria |
| `m12-registrar-cobro.png` | Cobros | `/reservas/[id]/pagos/nuevo` | Registrar cobro «Por verificar» | principal → `m06-registrar-cobro.png` |
| `m13-registrar-cobro-comprobante.png` | Cobros | `/reservas/[id]/pagos/nuevo` | Bloque de comprobantes (sin adjunto) | publicable, secundaria |
| `m14-nueva-reserva-tipo-y-borrador.png` | Asistente | `/reservas/nueva` | Tipo de producto y borrador guardado | principal → `m07-nueva-reserva.png` |
| `m15-asistente-paso-cliente.png` | Asistente | `/reservas/nueva/[tipo]` | Paso 1: cliente | publicable, secundaria |
| `m16-asistente-buscar-cliente.png` | Asistente | `/reservas/nueva/[tipo]` | Hoja de búsqueda de cliente | principal → `m08-asistente-cliente.png` |
| `m17-asistente-cliente-elegido.png` | Asistente | `/reservas/nueva/[tipo]` | Cliente elegido | publicable, secundaria |
| `m18-asistente-paso-hotel.png` | Asistente | `/reservas/nueva/[tipo]` | Paso 2: hotel, plan y moneda | publicable, secundaria |
| `m19-asistente-buscar-hotel.png` | Asistente | `/reservas/nueva/[tipo]` | Hoja de búsqueda de hotel | principal → `m09-asistente-hotel.png` |
| `m20-asistente-calendario.png` | Asistente | `/reservas/nueva/[tipo]` | Calendario de rango con noches | principal → `m10-asistente-calendario.png` |
| `m21-asistente-hotel-con-fechas.png` | Asistente | `/reservas/nueva/[tipo]` | Paso 2 completo | publicable, secundaria |
| `m22-asistente-habitaciones.png` | Asistente | `/reservas/nueva/[tipo]` | Paso 3: habitación y ocupación | publicable, secundaria |
| `m23-asistente-habitaciones-tarifa.png` | Asistente | `/reservas/nueva/[tipo]` | Paso 3: acompañante y tarifa | principal → `m11-asistente-habitaciones.png` |
| `m24-asistente-dinero.png` | Asistente | `/reservas/nueva/[tipo]` | Paso 4: descuento, comisión, pago y plazos | principal → `m12-asistente-dinero.png` |
| `m25-asistente-confirmar.png` | Asistente | `/reservas/nueva/[tipo]` | Paso 5: resumen calculado por el servidor | **excluida**: comisión 0 % (la toma se hizo sin tarifa de costo): se ve como un error |
| `m26-clientes-listado.png` | Clientes | `/clientes` | Personas y empresas | principal → `m13-clientes.png` |
| `m27-cliente-ficha.png` | Clientes | `/clientes/persona/[id]` | Ficha con saldo y acciones de contacto | principal → `m14-cliente-ficha.png` |
| `m28-cliente-ficha-datos.png` | Clientes | `/clientes/persona/[id]` | Datos, contacto y registro | publicable, secundaria |
| `m29-cliente-formulario.png` | Clientes | `/clientes/formulario` | Alta de cliente | publicable, secundaria |
| `m30-cobros.png` | Cobros | `/cobros` | Cartera por cobrar | **excluida**: texto solapado: la etiqueta «Pago por verificar» pisa «Saldo · total» |
| `m31-avisos.png` | Avisos | `/avisos` | Avisos de pagos registrados y aplicados | principal → `m15-avisos.png` |
| `m32-catalogos.png` | Catálogos | `/catalogos` | Índice de catálogos | principal → `m16-catalogos.png` |
| `m33-suplidores.png` | Catálogos | `/catalogos/suplidores` | Suplidores | publicable, secundaria |
| `m34-hoteles.png` | Catálogos | `/catalogos/hoteles` | Hoteles | publicable, secundaria |
| `m35-hotel-ficha.png` | Catálogos | `/catalogos/hoteles/[id]` | Ficha de hotel | principal → `m17-hotel-ficha.png` |
| `m36-aerolineas.png` | Catálogos | `/catalogos/aerolineas` | Aerolíneas con código IATA | publicable, secundaria |
| `m37-navieras.png` | Catálogos | `/catalogos/navieras` | Navieras | publicable, secundaria |
| `m38-configuracion.png` | Configuración | `/configuracion` | Centro de configuración | principal → `m18-configuracion.png` |
| `m39-usuarios.png` | Configuración | `/configuracion/usuarios` | Usuarios con presencia | publicable, secundaria |
| `m40-empresa-dgii.png` | Configuración | `/configuracion/empresa` | Empresa y DGII | publicable, secundaria |
| `m41-sucursales.png` | Configuración | `/configuracion/sucursales` | Sucursales | publicable, secundaria |
| `m42-monedas-y-tasas.png` | Configuración | `/configuracion/divisas` | Monedas, tasas y convertidor | publicable, secundaria |
| `m43-retenciones-nomina.png` | Configuración | `/configuracion/retenciones` | Retenciones AFP, SFS e ISR | principal → `m19-retenciones.png` |
| `m44-reportes.png` | Configuración | `/configuracion/reportes` | Reportes de problemas | **excluida**: vacía («No hay reportes abiertos») |

## Vídeo

No grabado.
