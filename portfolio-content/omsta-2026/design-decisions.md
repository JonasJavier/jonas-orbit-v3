<!-- portfolio-content/omsta-2026/design-decisions.md · 2026-09-25 · commit 3f5cea73 -->
# Decisiones de diseño y UX (problema → decisión)

Cada lado tiene 20 palabras como máximo. Las capturas están en
`web/screenshots/principales/`. Las móviles, en
`mobile/screenshots/principales/`.

Honestidad: cada **decisión** está comprobada en la captura o el archivo citado.
Los **problemas** son una lectura razonada (inferencia) de la documentación y del
diseño; confírmalos antes de publicarlos como historia (ver «Preguntas para
Jonás» en `README.md`).

| # | Problema | Decisión | Captura / evidencia |
| --- | --- | --- | --- |
| 1 | El equipo no sabía en qué punto estaba cada reserva ni cuánto faltaba cobrar. | Ficha con escalera de estados, porcentaje cobrado y saldo en la cabecera, separando estado de venta y de cobro. | `w04-reserva-hotel-resumen.png` |
| 2 | Editar un pago ya contabilizado rompía banco, asientos y saldos. | El pago contabilizado no se edita: se gestionan comprobantes, se corrige de forma guiada o se reembolsa. | `w16-pago-protegido.png`, `w17-reembolso-guiado.png` |
| 3 | La contabilidad era una caja negra para quien vende. | Cada asiento explica en lenguaje llano qué registra, y la reserva muestra todos sus asientos. | `w24-asiento-explicado.png`, `w25-asientos-de-una-reserva.png` |
| 4 | Pagar tarde al hotel ponía en riesgo la reserva del cliente. | La fecha de pago al proveedor se calcula sola desde la entrada y se agenda por vencimiento. | `w05-reserva-agenda-pago-suplidor.png`, `w19-cuentas-por-pagar.png` |
| 5 | Los errores contables se descubrían al cerrar el mes, tarde y caros. | Pantalla de salud contable de solo lectura y checklist de cierre que bloquea con identidades rotas. | `w26-salud-contable.png`, `w27-cierre-de-periodo.png` |
| 6 | Seis tipos de producto con formularios distintos confundían al equipo. | Mismo patrón de alta para todos: navegación rápida por secciones y resumen de precio en vivo. | `w10-nueva-reserva-vuelo.png`, `w11-nueva-reserva-crucero.png` |
| 7 | Las tablas anchas eran ilegibles en el teléfono. | Bajo 768 px las tablas se convierten en tarjetas y los filtros se pliegan. | `w47-responsive-crm.png`, `w45-responsive-dashboard.png` |
| 8 | En la calle, un vendedor necesita consultar y cobrar sin la web. | App nativa con desbloqueo biométrico y datos guardados para consultar sin conexión, sin escribir sin red. | `m06-registrar-cobro.png`, `m10-asistente-calendario.png` (móvil); `mobile/native-capabilities.md` |
