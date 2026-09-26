<!-- portfolio-content/omsta-2026/overview.md · 2026-09-25 · commit 3f5cea73 -->
# OMSTA hoy

Etiquetas: **[C]** comprobado · **[I]** inferencia · **[P]** pendiente.

## Qué es

ERP web a medida para **Cristecno Viajes SRL**, agencia de viajes de República
Dominicana, con una app móvil propia para el equipo (nombre autorizado por Jonás,
2026-09-26; grafía tomada del repo). La marca visible es **OMSTA**; el repositorio
conserva el nombre legal de la empresa. [C] `docs/tecnica/arquitectura.md` §1,
`docs/funcional/alcance-funcional.md` §1.

## Para qué negocio y qué problema resuelve

- Negocio: venta de viajes (hotel, vuelo, paquete, crucero, seguro y otros
  servicios) con dos sucursales o más, cobro en DOP y USD y obligaciones
  fiscales ante la DGII. [C] `reservas/models/reservation.py`
  (`TipoReservaChoices`), `web/modules.md` §2.
- Problema: que una venta se capture **una sola vez** y de ahí salgan el cobro,
  la factura con NCF, los asientos, la cuenta por pagar al proveedor, el banco
  y los reportes fiscales (606/607/608/623), sin re-teclear. [C]
  `docs/funcional/alcance-funcional.md` §1; flujo completo en
  `architecture/data-flow.md`.
- La app móvil resuelve lo que la web no: consultar y dar de alta reservas,
  registrar cobros con comprobante y atender clientes fuera de la oficina, con
  desbloqueo biométrico y datos guardados sin conexión (solo lectura). [C]
  `mobile/overview.md` §3, `mobile/native-capabilities.md`.

## Quién lo usa (roles)

Cinco roles base — `superadmin`, `admin`, `contabilidad`, `reservas`,
`clientes` — más módulos sueltos (`crm`, `reservas`, `cobros`,
`contabilidad`) que amplían lo que ve cada usuario. El acceso se controla en el
servidor por prefijo de URL. [C] `docs/funcional/roles-y-permisos.md`,
`web/modules.md` §0. En producción lo usan **15 usuarios** (dato de Jonás, no
verificable desde el repo).

## Estado real

| Parte | Estado | Desde | Evidencia |
| --- | --- | --- | --- |
| Web (Django) | **En producción** en Railway, con despliegue automático desde `main`; además, instancia demo con datos ficticios | primer commit del repo `11fa52ee`, **2025-04-02** | [C] git; `docs/operaciones/despliegue-railway.md`, `docs/operaciones/demo-railway.md`. En uso diario (confirmado por Jonás, 2026-09-26); **15 usuarios** según Jonás [confirmado por Jonás] |
| API móvil (`movil/`) | En desarrollo activo; convive en el mismo backend de producción | primer commit `273780c4`, **2026-09-10** | [C] git |
| App móvil (`mobile/`) | **En desarrollo**: builds internas de desarrollo en Android por EAS, probada en un Android real; **sin publicar** en ninguna tienda y **sin build de iOS** | primer commit `bac191cd`, **2026-09-11** | [C] `mobile/overview.md` §4-5 |

Desarrollador: **Jonás, en solitario** (confirmado por Jonás; 1.128 de 1.139
commits son de su identidad principal).

Calidad hoy: 3.164 tests Python, **3.161 pasan y 3 fallan** (`metrics.md` §3).
La captura de hoy encontró pantallas con fallos que quedaron fuera del paquete
(`excluded.md`).

## Tamaño (resumen; detalle y comandos en `metrics.md`)

19 apps Django · 150 modelos · 556 vistas · 94 endpoints de la API móvil ·
54 pantallas en la app · 1.139 commits.
