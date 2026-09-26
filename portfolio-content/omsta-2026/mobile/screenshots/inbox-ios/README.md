<!-- portfolio-content/omsta-2026/mobile/screenshots/inbox-ios/README.md · 2026-09-25 -->
# Bandeja para capturas de iPhone

**Hoy no hay forma real de llenarla.** El repositorio no tiene build de iOS, ni
TestFlight, ni cuenta de Apple Developer (`docs/operaciones/app-movil.md`: iOS
queda pendiente de la cuenta de Organización de Apple). No se simulan capturas.

Si más adelante existe una build de iOS (TestFlight en tu iPhone o un simulador
en una Mac), deja aquí los PNG con estos nombres, **tal cual los guarda el
iPhone** (sin marcos ni reescalado), y pídeme que los revise y los procese.

Preparación: servidor con la BD `omsta_portfolio` y el usuario `demo.admin`;
al entrar, **no permitir la ubicación**; barra de estado a las 9:41 si es
simulador (`xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100`).

| Archivo | Pantalla | Estado exacto | Qué datos deben verse |
| --- | --- | --- | --- |
| `i01-login.png` | Acceso | Campos vacíos, teclado cerrado | Marca OMSTA, sin usuario autocompletado |
| `i02-bloqueo-faceid.png` | Desbloquea Omsta | Tras cancelar el aviso de Face ID | Texto «Usa tu huella o Face ID para continuar» |
| `i03-inicio.png` | Inicio | Primer plano tras entrar | KPIs del mes con importes en RD$ y alertas |
| `i04-reservas.png` | Reservas | Listado sin filtros | Varias reservas con estados distintos (Confirmada, Voucher, En proceso) |
| `i05-reserva-ficha.png` | Ficha de reserva | Reserva de hotel #13 (Lucía Estévez Durán), pestaña Resumen | 70 % pagado, saldo RD$44,100 |
| `i06-reserva-pagos.png` | Ficha → Pagos | Misma reserva | Historial de pagos con comprobante |
| `i07-asistente-tipo.png` | Nueva reserva | Selector de tipo | Los productos disponibles |
| `i08-asistente-calendario.png` | Asistente de hotel → fechas | Hoja de rango abierta | Rango de 3-5 noches marcado |
| `i09-asistente-hotel.png` | Asistente → búsqueda de hotel | Hoja de búsqueda con resultados | Hoteles de la BD demo (Coral Azul, Bahía Dorada…) |
| `i10-asistente-confirmar.png` | Asistente → Confirmar | Resumen del servidor | Total y comisión calculados |
| `i11-clientes.png` | Clientes | Pestaña Personas | Clientes ficticios |
| `i12-cliente-ficha.png` | Ficha de cliente | Pestaña Info | Datos ficticios (@example.com) |
| `i13-cobros.png` | Cobros | Pestaña por defecto | Resumen y lista de cobros |
| `i14-registrar-cobro.png` | Registrar pago | Con comprobante adjunto | Monto en DOP y nombre del adjunto |
| `i15-avisos.png` | Avisos | Con alguno sin leer | Badge en la pestaña |
| `i16-perfil.png` | Mi cuenta | — | Adriana Mejía, Administrador |
| `i17-configuracion.png` | Configuración | Centro de configuración | Secciones (usuarios, sucursales, empresa y DGII…) |
| `i18-sin-conexion.png` | Inicio sin red | Modo avión con datos guardados | Franja «Sin conexión» |
