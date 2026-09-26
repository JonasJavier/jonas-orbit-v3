<!-- portfolio-content/omsta-2026/excluded.md · 2026-09-25 · commit 3f5cea73 -->
# Excluido del paquete

Regla aplicada: si falla, se ve mal, parece sin terminar, sus cifras no cuadran o
se ve pobre por falta de datos, **no entra** en `principales/`. Nada de esto se
arregló (ni en código ni en datos): sólo se documenta para que decidas.

Entorno de la prueba: servidor local `127.0.0.1:8130`, BD aislada
`omsta_portfolio`, usuario `demo.admin` (rol admin), Chromium de Playwright
1.61.1 a 1440×900 ×2. Las capturas citadas están en `web/screenshots/raw/` y la
auditoría automática por pantalla en `web/screenshots/raw/audit.json`.

## 1. Web — fallos y errores

| Pantalla | URL | Motivo | Error exacto / evidencia |
| --- | --- | --- | --- |
| Balanza de comprobación | `/reportes/run/trial_balance/` | Error de JavaScript al cargar | `pageerror: r.GetData(...).destroy is not a function` (`audit.json` → `w110`) |
| Balance general | `/reportes/run/balance_sheet/` | Mismo error JS **y** cifras que no cuadran | Mismo `pageerror`; banner «El balance general no está cuadrado. Diferencia: 14864.41» (`w111`) |
| Estado de resultados | `/reportes/run/income_statement/` | Mismo error JS | `pageerror: r.GetData(...).destroy is not a function` (`w112`) |
| Alta de hotel con Google | `/reservas/agregar-hotel/` | Error JS al iniciar Places | `pageerror: initReservasHotelPlaces is not a function` (triaje `t022`) |
| Compensar saldo (modal) | `/reservas/reserva/<pk>/compensacion/` | Responde 409 al abrirlo sin reserva destino compatible | `409 Conflict`, código `RESERVATION_CREDIT_TRANSFER…` (triaje `t014`) |
| Reportes de nómina del registry | `/reportes/run/payroll-*` | No existen en ejecución | Definidos en `nomina/reporting/payroll.py:345-431` pero `reports/apps.py` no los registra (ver `web/modules.md` §5) |
| Permisos por rol | `/usuarios/config/permisos/` | 403 para el rol admin (sólo superadmin); no se capturó con superusuario | `403 Forbidden` (triaje `t158`) |

## 2. Web — maquetación rota o a medio aplicar

| Pantalla | URL | Motivo |
| --- | --- | --- |
| Nueva reserva de hotel | `/reservas/nueva/hotel/` | El título «Nueva Reserva» sale blanco sobre blanco (invisible); la barra de navegación rápida corta «Configuración» (`w18`) |
| Panel DGII | `/reportes/run/dgii/` | Título «Panel DGII» oscuro sobre fondo oscuro, ilegible (`w69`) |
| Formato 606 | `/reportes/run/dgii-606/` | Título ilegible y **se imprime un comentario de plantilla literal** `{# Primero revisar, después declarar… #}` (`w70`) |
| Formato 607 | `/reportes/run/dgii-607/` | Título «Formato 607» ilegible (oscuro sobre oscuro) (`w71`) |
| Panel bancario | `/banco/panel/` | Se imprime un comentario de plantilla literal `{# Hay movimientos cargados y ninguno conciliado… #}` (`w76`) |
| Monedas y tasas | `/divisas/` | Maquetación rota: el menú lateral del panel sale como una lista de enlaces sin estilo y un avatar vacío (`w94`) |
| Plan de cuentas | `/catalogo-cuentas/` | Desborde horizontal de 93 px: el filtro «Fiscal» y el orden quedan cortados (`audit.json` → `w62`) |
| Conceptos de nómina | `/nomina/empleados/<pk>/configurar/` | Tabla de conceptos con campos demasiado estrechos: valores cortados («Me», «/») (`w84`) |
| Reporte CxP | `/reportes/run/accounts-payable/` | Los montos de las tarjetas se parten en dos líneas («RD$1,129,388.0 / 0») (`w107`) |
| Reporte de ventas por sucursal | `/sucursales/reportes/general/` | Montos de las tarjetas truncados («RD$1,093,…») (`w100`) |
| CxC a 390 px | `/contabilidad/cuentas-por-cobrar/` | El título del resumen se parte en cuatro líneas y los botones de período se salen de la tarjeta (`w129`) |
| Rooming list | `/reservas/reserva/<pk>/rooming-list/` | El nombre del acompañante queda cortado en la celda («Acompañante 1 Estév») (`w17`) |
| Itinerario de crucero | pestaña Itinerario | Puertos sin ciudad muestran «, República Dominicana» con coma inicial (datos demo sin ciudad) (`w12`) |
| Editor de proforma | `/documentos/documento/proforma/` | La vista previa PDF queda en gris vacío en la captura headless (`net::ERR_ABORTED blob:…`) (`w102`) |
| Detalle de tutorial | `/tutoriales/<slug>/` | El visor del PDF queda vacío en la captura headless (`net::ERR_ABORTED …/ver/`) (`w124`) |

## 3. Web — cifras que no cuadran

| Pantalla | URL | Motivo |
| --- | --- | --- |
| Reporte de reservas | `/reportes/run/reservations/` | «Pagado» RD$13,855,140.00 sobre un «Total» de RD$1,278,200.00 (lo pagado es ~11× el total) y «Pendiente» RD$0.00 (`w109`) |
| Reserva anulada | `/reservas/reserva/15/` | La tarjeta dice «Balance pendiente RD$31,200.00» y la barra de cobro, «Saldo RD$0.00» (`w16`) |
| Balance general | ver §1 | Descuadre de 14 864,41 que la propia pantalla reconoce |

Observación (no excluye ninguna toma por sí sola): el listado de reservas suma
«Por cobrar» RD$745,310.00 y el dashboard y CxC, RD$714,110.00. La diferencia,
RD$31,200.00, es exactamente la reserva anulada #15. **Inferencia**: el listado
cuenta el saldo de las anuladas como por cobrar.

## 4. Web — pobres o vacías por falta de datos

No se sembraron datos para estas pantallas; se ven vacías o con marcadores.

| Pantalla | URL | Motivo |
| --- | --- | --- |
| Notas de crédito/débito (proveedor y cliente) | `/contabilidad/ap/notas/`, `/contabilidad/ar/notas/` | Tablas vacías (`w53`, `w54`) |
| Entradas de diario | `/contabilidad/entrada-diario/` | Estado vacío «No hay entradas de diario» (`w60`) |
| 606 manuales | `/contabilidad/configuracion/606-manuales/` | Vacía (`w74`) |
| Formatos 608 y 623 | `/reportes/run/dgii-608/`, `/reportes/run/dgii-623/` | Sin registros: sus semillas del repo (`seed_dgii_608_demo_data`, `seed_dgii_623_demo`) crean clientes con nombres artificiales («Cliente 202608») y no se usaron (`w72`, `w73`) |
| Licencias | `/nomina/leaves/licenses/` | Vacía (`w93`) |
| Sesiones de un usuario | `/usuarios/users/<pk>/sesiones/` | «Sin sesiones web activas» y «no ha registrado teléfonos» (`w116`) |
| Empresa y DGII | `/usuarios/config/empresa-dgii/` | Marcador «Aún no hay logo institucional» (`w117`) |
| Bitácora | `/usuarios/activity-log/` | La tarjeta dice «0 registros» con eventos existentes y la mitad superior queda vacía (`w118`) |
| Ficha de hotel | `/reservas/hoteles/<pk>/` | «Sin foto del hotel», «Sin ubicación exacta», 0 tarifas (`w26`) |
| Ficha de suplidor | `/reservas/suplidores/<pk>/` | 0 reservas, balance 0, «Contrato No firmado» pese a tener reservas vía su hotel (`w28`) |
| Período de nómina cerrado | `/nomina/periodos/<pk>/` | Banner rojo «Pago productivo temporalmente bloqueado» (bandera `PAYROLL_PAYMENT_ENABLED` apagada en el entorno local) (`w86`) |

## 5. Web — excluido por privacidad

| Pantalla | URL | Motivo |
| --- | --- | --- |
| Ficha de sucursal (bloque «Mapa y dirección») | `/sucursales/<pk>/` | Sin coordenadas, el mapa se centra en `DEFAULT_DETAIL_CENTER = {18.4861, -69.9312}` (`sucursales/static/sucursales/js/branch-detail.js:5`). Comprobado en solo lectura: **coincide a 0,0 km con las coordenadas de una sucursal real** de la BD de desarrollo (`w96`) |
| Alta/edición de sucursal | `/sucursales/crear/` | Mismo centro por defecto (`branch-form.js:7`); no se capturó |
| Mapa de sucursales | `/sucursales/mapa/` | Google Maps con ubicaciones; no se capturó |
| Perfil y usuarios en línea | `/usuarios/perfil/`, `/usuarios/online-users/` | Pueden mostrar ubicación/IP del usuario. `w121` (perfil) está en `raw/` y en su encuadre no aparece mapa ni IP (Playwright sin permiso de ubicación), pero no se pasó a `principales/`. `/usuarios/online-users/` no se capturó |

> Recomendación de privacidad (inferencia): antes de publicar cualquier captura
> futura de sucursales, cambia ese centro por defecto en el código o siembra
> coordenadas ficticias; tal como está, un mapa «vacío» enseña tu oficina.

## 6. Móvil

Capturas hechas el 2026-09-26 (detalle en `mobile/screenshots/manifest.md`).

| Pantalla | Ruta | Motivo |
| --- | --- | --- |
| Cobros | `/cobros` | Texto solapado: la etiqueta «Pago por verificar» pisa «Saldo · total RD$…» (`m30`) |
| Reportes | `/configuracion/reportes` | Vacía: «No hay reportes abiertos» (`m44`) |
| Ficha de reserva, bloque proveedor | `/reservas/[id]` | Incoherente: «Sin suplidor asignado» mientras la cuenta por pagar es de Coral Azul Resort & Spa (`m07`) |
| Asistente, paso Confirmar | `/reservas/nueva/[tipo]` | Comisión 0 % porque la toma se hizo con tarifa de venta y sin costo; se ve como error (`m25`) |
| Mi cuenta / cerrar sesión | `/perfil` | **Privacidad**: muestra la ubicación real del teléfono («Ubicación por actividad»). Las capturas se borraron |
| Dispositivos, sesiones, «Quién está conectado», Actividad | `/perfil/dispositivos`, `/configuracion/usuarios/…`, `/configuracion/actividad` | **Privacidad**: exponen ubicación o IP; no se capturaron |
| Cobro con comprobante adjunto | `/reservas/[id]/pagos/nuevo` | No capturada: exigía abrir el selector de archivos del teléfono, que muestra archivos personales |
| Bloqueo biométrico, sin conexión, «Actualiza la app» | `/bloqueo`, franja offline, `/actualizar` | No capturadas: el aviso biométrico sale negro (`FLAG_SECURE`) y cancelarlo cierra la app; sin conexión exige activar el modo avión (ajuste del teléfono); actualizar exige reiniciar servidor y app |

Hallazgo de privacidad (no es una pantalla): al iniciar sesión, la app envía la
ubicación del teléfono si el permiso ya estaba concedido, y la guarda también en
los metadatos del registro de auditoría, que por diseño no se puede editar. Por
eso, al terminar, la BD `omsta_portfolio` se **reconstruyó desde cero**. Verificado
después: 0 dispositivos y 0 coordenadas en la BD.

- iOS: no hay forma real de capturar (no existe build iOS ni TestFlight; ver
  `mobile/overview.md` §5). Lista de tomas en `mobile/screenshots/inbox-ios/`.

## 7. Tests que fallan

Ver `metrics.md` §3 («Tests: resultado») con la salida exacta.
