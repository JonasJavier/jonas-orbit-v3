<!-- portfolio-content/omsta-2026/mobile/modules.md · fecha 2026-09-25 · commit 3f5cea73 -->

# Omsta Móvil: pantallas y módulos

Inventario de **todas** las rutas de Expo Router en `mobile/app/` y de los
módulos de `mobile/src/`. Método (comprobado): `find mobile/app -type f` (57
archivos), cruce de cada pantalla con los hooks de `mobile/src/datos/consultas.ts`
y las llamadas `api.*` de `mobile/src/api/endpoints.ts`, y de cada ruta HTTP con
`movil/urls.py` y el `required_roles` de su vista (`movil/views/*.py`).

Convenciones:

- Las rutas HTTP son relativas a `/api/movil/v1/`.
- «Rol» es el rol **efectivo** que exige el backend (rol-tier más módulos
  otorgados; el superusuario pasa siempre, `security/constants.py:27-28`).
  Grupos: **R** = `admin, clientes, contabilidad, reservas`
  (`reservas/services/reservations.py:42-46`); **P** = `admin, contabilidad,
  reservas, cobros` (`contabilidad/services/payment_permissions.py:18`); **C** =
  `admin, contabilidad, cobros` (`security/access_policy.py:37`); **L** =
  `superadmin, admin, reservas, contabilidad` (`reservas/services/cancellation.py:175`,
  `reservas/services/credit_transfers.py:77`); **CRM** = `admin, clientes`
  (`movil/views/crm.py:40`); **H** = `admin, reservas`
  (`reservas/services/hotel_catalog.py:36`); **S** = `admin, reservas,
  contabilidad` (`reservas/services/suplidores.py:35`); **A** = `admin`;
  **F** = `admin, contabilidad`; **SA** = `superadmin`; **Todos** = cualquier
  usuario autenticado (`security_self_service`).
- Etiqueta de toda la tabla: **comprobado** salvo nota.
- «Publicable» = estado de la captura para el portafolio.

## 1. Estructura de navegación

- `app/_layout.tsx` es un `Stack` cuyas pantallas se protegen con
  `Stack.Protected` según el estado de la sesión: `login` (anónimo o revocado),
  `bloqueo`, `ubicacion`, `actualizar` y, con sesión activa, `(tabs)` y el resto
  (`mobile/app/_layout.tsx:67-162`). La máquina de estados vive en
  `mobile/src/auth/sesion.tsx:49-56`.
- Grupo `(tabs)`: Inicio, Reservas, Clientes, Cobros (condicional) y Avisos
  (`mobile/app/(tabs)/_layout.tsx:62-102`).
- Modales (`presentation: "modal"`, 9): documentos de reserva, formulario de
  cliente, formulario de usuario, cambio de contraseña, nuevo reporte, editar
  mis datos, formulario de suplidor, de hotel y de catálogo
  (`mobile/app/_layout.tsx:91-160`).
- Rutas dinámicas: `reservas/[id]`, `reservas/nueva/[tipo]`,
  `clientes/[tipo]/[id]`, `catalogos/[tipo]` (`aerolineas`, `aeropuertos`,
  `navieras`, `barcos`; `movil/serializers/catalogos.py:493`),
  `configuracion/*/[id]`. Las carpetas estáticas `catalogos/hoteles` y
  `catalogos/suplidores` tienen prioridad sobre `catalogos/[tipo]`.

## 2. Pantallas (57 archivos)

| # | Archivo | Ruta | Qué hace | Endpoints | Rol | Publicable |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `app/_layout.tsx` | layout raíz | Fuentes, caché persistida cifrada, proveedor de sesión y pila protegida por estado. | Indirectos vía sesión: `POST auth/login/`, `GET auth/me/`, `POST auth/logout/`, `POST auth/refresh/`, `POST ubicacion/verificar/` | — | ver `screenshots/manifest.md` |
| 2 | `app/(tabs)/_layout.tsx` | layout de pestañas | Barra de 5 pestañas, avatar al perfil, badge de avisos, franja «Sin conexión». Oculta Cobros sin rol. | `GET notificaciones/badge/` | Todos | ver `screenshots/manifest.md` |
| 3 | `app/(tabs)/index.tsx` | `/` (Inicio) | Panel: saludo, «hoy» (pagos vencidos, check-ins), finanzas si `show_financials`, actividad del mes, alertas con destino, «Más del mes». | `GET panel/` | Todos (cifras por rol en el servidor) | ver `screenshots/manifest.md` |
| 4 | `app/(tabs)/reservas.tsx` | `/reservas` | Listado con búsqueda, chips de estado, filtros de producto y orden (`?sort=`), scroll infinito; botón flotante «Nueva reserva»; icono de Catálogos en la cabecera. | `GET reservas/`, `GET catalogos/estados-reserva/`, precarga `GET reservas/{id}/` | R | ver `screenshots/manifest.md` |
| 5 | `app/(tabs)/clientes.tsx` | `/clientes` | Directorio de Personas/Empresas con filtros (estado, crédito, proveedor, archivados), orden y exportación. | `GET clientes/{tipo}/`, `GET catalogos/crm/`, `POST clientes/{tipo}/exportar/`, `GET exportaciones/{id}/` | CRM | ver `screenshots/manifest.md` |
| 6 | `app/(tabs)/cobros.tsx` | `/cobros` | Cuentas por cobrar: pestañas Por cobrar, Sin abono, Abonadas, Cobradas, Todas; resumen (cobrado neto, pendiente, facturado, sin facturar). | `GET cxc/`, precarga `GET reservas/{id}/` | C (pestaña oculta sin rol) | ver `screenshots/manifest.md` |
| 7 | `app/(tabs)/avisos.tsx` | `/avisos` | Avisos con filtro Todos/No leídos/Leídos, marcar leído y marcar todos; cada aviso abre su `destino`. | `GET notificaciones/`, `GET notificaciones/badge/`, `POST notificaciones/{id}/leer/`, `POST notificaciones/leer-todas/` | Todos | ver `screenshots/manifest.md` |
| 8 | `app/+not-found.tsx` | cualquier ruta inexistente | Sustituye el «Unmatched Route» de expo-router. | — | — | ver `screenshots/manifest.md` |
| 9 | `app/login.tsx` | `/login` | Usuario/correo y contraseña; nota de que se pedirá la ubicación; errores por campo. | `POST auth/login/` (anónimo) | Anónimo | ver `screenshots/manifest.md` |
| 10 | `app/bloqueo.tsx` | `/bloqueo` | «Desbloquea Omsta»: un intento biométrico automático, botón «Usar huella / Face ID» y «Entrar con contraseña» (borra la sesión local). | Tras desbloquear, `GET auth/me/` | Sesión guardada | ver `screenshots/manifest.md` |
| 11 | `app/ubicacion.tsx` | `/ubicacion` | «Verifica tu ubicación»: pide GPS y sella el dispositivo; enlace a ajustes si falla. | `POST ubicacion/verificar/`, `GET auth/me/` | Usuarios no exentos con gate activo | ver `screenshots/manifest.md` |
| 12 | `app/actualizar.tsx` | `/actualizar` | «Actualiza la app» con versión instalada y mínima; botón a la tienda. | — (llega por `426 APP_DESACTUALIZADA` de `auth/login/` o `auth/me/`) | Todos | ver `screenshots/manifest.md` |
| 13 | `app/resumen.tsx` | `/resumen` | Resumen del mes: alertas, KPIs y datos secundarios con destino. | `GET panel/` | Todos | ver `screenshots/manifest.md` |
| 14 | `app/reservas/nueva/index.tsx` | `/reservas/nueva` | Rejilla de seis tipos (Hotel/Resort, Vuelo, Crucero, Paquete, Seguro de viaje, Otro servicio) y borradores guardados con progreso. | `GET reservas/tipos/` | R | ver `screenshots/manifest.md` |
| 15 | `app/reservas/nueva/[tipo].tsx` | `/reservas/nueva/{tipo}` | Asistente de alta (`src/reservas/Asistente.tsx`): pasos Cliente → producto → personas → Dinero → Confirmar, descritos por el servidor; buscadores en hoja, calendario propio, adjuntos y comprobante de pago inicial. | `GET`/`POST reservas/formulario/{tipo}/`, `GET reservas/tarifa-habitacion/`, `POST reservas/adjuntos/`, `GET hoteles/`, `GET hoteles/{id}/`, `GET clientes/{tipo}/`, `GET catalogo/{tipo}/` | R (buscador de hoteles: H; de clientes: CRM) | ver `screenshots/manifest.md` |
| 16 | `app/reservas/[id]/index.tsx` | `/reservas/{id}` | Ficha: hero con estado y cobro, acciones (Documentos, Editar, Llamar, WhatsApp, Correo), pestañas **Resumen · producto · Pagos · Expediente**; titulares, localizadores, cambio de estado, adjuntos y notas del expediente. | `GET reservas/{id}/`, `PATCH reservas/{id}/titulares/`, `PATCH reservas/{id}/localizadores/`, `POST reservas/{id}/estado/`, `POST reservas/{id}/expediente/`, `POST reservas/adjuntos/`, `POST reservas/{id}/enviar/` | R | ver `screenshots/manifest.md` |
| 17 | `app/reservas/[id]/editar.tsx` | `/reservas/{id}/editar` | El mismo asistente en modo edición. | `GET`/`PUT reservas/{id}/formulario/` y los auxiliares del alta | R | ver `screenshots/manifest.md` |
| 18 | `app/reservas/[id]/documentos.tsx` | `/reservas/{id}/documentos` (modal) | Proforma, voucher y recibos: ver PDF en el navegador embebido, enviar por WhatsApp (enlace público) o por correo. | `GET reservas/{id}/documentos/`, `POST reservas/{id}/enviar/` | R | ver `screenshots/manifest.md` |
| 19 | `app/reservas/[id]/pagos/index.tsx` | `/reservas/{id}/pagos` | Historial de pagos con filtros por estado, plan de cuotas y reenvío de recibo. | `GET reservas/{id}/pagos/`, `POST reservas/{id}/enviar/` | P | ver `screenshots/manifest.md` |
| 20 | `app/reservas/[id]/pagos/nuevo.tsx` | `/reservas/{id}/pagos/nuevo` | Registrar pago (`src/reservas/FormularioPago.tsx`): formulario descrito por el servidor, comprobantes adjuntos y clave de idempotencia. | `GET reservas/{id}/pagos/formulario/`, `POST reservas/adjuntos/`, `POST reservas/{id}/pagos/` | P | ver `screenshots/manifest.md` |
| 21 | `app/reservas/[id]/estado.tsx` | `/reservas/{id}/estado` | Historial de estado (estado actual y cambios manuales). | `GET reservas/{id}/` | R | ver `screenshots/manifest.md` |
| 22 | `app/reservas/[id]/anular.tsx` | `/reservas/{id}/anular` | Anular y liquidar (`src/reservas/FormularioLiquidacion.tsx`): el reparto lo previsualiza y calcula el servidor. | `GET`/`POST reservas/{id}/cancelacion/` (con `previsualizar`) | L | ver `screenshots/manifest.md` |
| 23 | `app/reservas/[id]/compensar.tsx` | `/reservas/{id}/compensar` | Llevar o traer saldo a favor entre reservas (`src/reservas/Compensacion.tsx`). | `GET`/`POST reservas/{id}/compensacion/` | L | ver `screenshots/manifest.md` |
| 24 | `app/clientes/[tipo]/[id].tsx` | `/clientes/{persona\|empresa}/{id}` | Ficha con pestañas **Info · Reservas · Pagos · Docs · Notas**; subir documento (selector del sistema), notas, PDF de ficha, archivar. | `GET clientes/{tipo}/{id}/`, `DELETE clientes/{tipo}/{id}/`, `POST`/`DELETE …/notas/`, `POST`/`DELETE …/documentos/`, `POST …/pdf/`, `GET catalogos/crm/` | CRM | ver `screenshots/manifest.md` |
| 25 | `app/clientes/formulario.tsx` | `/clientes/formulario` (modal) | Alta y edición de persona o empresa; puede volver al asistente con el cliente elegido. | `POST clientes/{tipo}/`, `PATCH clientes/{tipo}/{id}/`, `GET clientes/{tipo}/{id}/`, `GET catalogos/crm/` | CRM | ver `screenshots/manifest.md` |
| 26 | `app/catalogos/index.tsx` | `/catalogos` | Índice en mosaicos: Proveedores (Suplidores, Hoteles), Vuelos (Aerolíneas, Aeropuertos), Cruceros (Navieras, Barcos). | — | Filtra por S y H | ver `screenshots/manifest.md` |
| 27 | `app/catalogos/suplidores/index.tsx` | `/catalogos/suplidores` | Directorio con búsqueda, estado y tipo. | `GET suplidores/`, `GET catalogos/suplidores/` | S | ver `screenshots/manifest.md` |
| 28 | `app/catalogos/suplidores/[id].tsx` | `/catalogos/suplidores/{id}` | Ficha con pestañas Datos · Productos · Reservas · Finanzas. | `GET suplidores/{id}/` | S | ver `screenshots/manifest.md` |
| 29 | `app/catalogos/suplidores/formulario.tsx` | `/catalogos/suplidores/formulario` (modal) | Alta y edición de suplidor. | `POST suplidores/`, `PATCH suplidores/{id}/`, `GET catalogos/suplidores/` | S | ver `screenshots/manifest.md` |
| 30 | `app/catalogos/hoteles/index.tsx` | `/catalogos/hoteles` | Hoteles con foto, filtros de la web (activos, ubicación, plan). | `GET hoteles/`, `GET catalogos/hoteles/` | H | ver `screenshots/manifest.md` |
| 31 | `app/catalogos/hoteles/[id].tsx` | `/catalogos/hoteles/{id}` | Ficha con portada y pestañas Info · Habitaciones · Tarifas · Servicios. | `GET hoteles/{id}/` | H | ver `screenshots/manifest.md` |
| 32 | `app/catalogos/hoteles/formulario.tsx` | `/catalogos/hoteles/formulario` (modal) | Alta y edición; buscador de Google Places desde el servidor que rellena dirección, punto y foto. | `POST hoteles/`, `PATCH hoteles/{id}/`, `GET hoteles/lugares/`, `GET hoteles/lugares/{place_id}/`, `GET catalogos/hoteles/` | H | ver `screenshots/manifest.md` |
| 33 | `app/catalogos/[tipo]/index.tsx` | `/catalogos/{aerolineas\|aeropuertos\|navieras\|barcos}` | Listado común de los cuatro catálogos de viaje. | `GET catalogo/{tipo}/`, `GET catalogos/viajes/` | R | ver `screenshots/manifest.md` |
| 34 | `app/catalogos/[tipo]/formulario.tsx` | `/catalogos/{tipo}/formulario` (modal) | Alta, edición y borrado de un elemento. | `GET`/`PATCH`/`DELETE catalogo/{tipo}/{id}/`, `POST catalogo/{tipo}/`, `GET catalogos/viajes/` | R | ver `screenshots/manifest.md` |
| 35 | `app/perfil/index.tsx` | `/perfil` | Mi cuenta: foto (cámara o galería), actividad, contacto, trabajo, últimos movimientos, este dispositivo, accesos a Dispositivos y Reportes; barra fija con Configuración (solo admin) y Cerrar sesión. | `GET perfil/`, `POST`/`DELETE perfil/foto/` | Todos | ver `screenshots/manifest.md` |
| 36 | `app/perfil/editar.tsx` | `/perfil/editar` (modal) | Editar mis datos; los laborales solo si el servidor lo permite. | `GET`/`PATCH perfil/`, `GET catalogos/usuarios/` | Todos (catálogo: A; inferencia: solo se pide si hay campos laborales editables) | ver `screenshots/manifest.md` |
| 37 | `app/perfil/dispositivos.tsx` | `/perfil/dispositivos` | Mis teléfonos con sesión; revocar otro. | `GET dispositivos/`, `DELETE dispositivos/{uuid}/` | Todos | ver `screenshots/manifest.md` |
| 38 | `app/configuracion/index.tsx` | `/configuracion` | Centro de Configuración: Personas y accesos · Organización · Tu cuenta. | — | Entrada solo para A (`perfil/index.tsx:385`) | ver `screenshots/manifest.md` |
| 39 | `app/configuracion/usuarios/index.tsx` | `/configuracion/usuarios` | Directorio de cuentas con filtros y resumen de conectados. | `GET usuarios/`, `GET catalogos/usuarios/`, `GET usuarios/en-linea/` | A | ver `screenshots/manifest.md` |
| 40 | `app/configuracion/usuarios/en-linea.tsx` | `/configuracion/usuarios/en-linea` | «Quién está conectado»: presencia, tiempo y ubicación; se refresca sola. | `GET usuarios/en-linea/` | A | ver `screenshots/manifest.md` |
| 41 | `app/configuracion/usuarios/formulario.tsx` | `/configuracion/usuarios/formulario` (modal) | Alta y edición de cuenta. | `POST usuarios/`, `PATCH usuarios/{id}/`, `GET usuarios/{id}/`, `GET catalogos/usuarios/` | A | ver `screenshots/manifest.md` |
| 42 | `app/configuracion/usuarios/[id]/index.tsx` | `/configuracion/usuarios/{id}` | Ficha de cuenta: conexión, actividad, módulos efectivos y accesos a permisos, sesiones y contraseña. | `GET usuarios/{id}/` | A | ver `screenshots/manifest.md` |
| 43 | `app/configuracion/usuarios/[id]/password.tsx` | `/configuracion/usuarios/{id}/password` (modal) | Cambiar contraseña (también desde Mi cuenta si el servidor lo permite). | `POST usuarios/{id}/password/`, `GET usuarios/{id}/` | A | ver `screenshots/manifest.md` |
| 44 | `app/configuracion/usuarios/[id]/sesiones.tsx` | `/configuracion/usuarios/{id}/sesiones` | Sesiones web y teléfonos de una cuenta; cerrar sesiones y revocar dispositivos. | `GET`/`POST usuarios/{id}/sesiones/`, `DELETE usuarios/{id}/dispositivos/{uuid}/` | A | ver `screenshots/manifest.md` |
| 45 | `app/configuracion/permisos/index.tsx` | `/configuracion/permisos` | Directorio de cuentas con rol y módulos. | `GET usuarios/`, `GET catalogos/usuarios/` | Menú solo superadmin; la API usada exige A | ver `screenshots/manifest.md` |
| 46 | `app/configuracion/permisos/[id].tsx` | `/configuracion/permisos/{id}` | Rol-tier y módulos de una cuenta con acceso efectivo a la vista. | `GET`/`PUT usuarios/{id}/permisos/`, `GET catalogos/permisos/` | SA | ver `screenshots/manifest.md` |
| 47 | `app/configuracion/actividad/index.tsx` | `/configuracion/actividad` | Bitácora con buscador y filtros en hoja (acepta `?user_id=`). | `GET bitacora/`, `GET catalogos/bitacora/` | A | ver `screenshots/manifest.md` |
| 48 | `app/configuracion/actividad/[id].tsx` | `/configuracion/actividad/{id}` | Evento: qué, quién, dónde y qué cambió. | `GET bitacora/{id}/` | A | ver `screenshots/manifest.md` |
| 49 | `app/configuracion/empresa.tsx` | `/configuracion/empresa` | Empresa y DGII: datos fiscales, logo e imágenes, rangos NCF. | `GET`/`PATCH configuracion/empresa/`, `POST`/`DELETE configuracion/empresa/imagenes/{campo}/`, `GET catalogos/empresa/` | A | ver `screenshots/manifest.md` |
| 50 | `app/configuracion/comprobante.tsx` | `/configuracion/comprobante` | Registrar o corregir un rango NCF pegando sus extremos. | `POST configuracion/empresa/comprobantes/`, `PATCH …/{id}/`, `POST …/{id}/estado/`, `GET configuracion/empresa/`, `GET catalogos/empresa/` | F (lectura de empresa: A) | ver `screenshots/manifest.md` |
| 51 | `app/configuracion/sucursales/index.tsx` | `/configuracion/sucursales` | Sucursales al alcance del usuario, con resumen por estado. | `GET sucursales/`, `GET catalogos/sucursales/` | Todos (el servidor recorta) | ver `screenshots/manifest.md` |
| 52 | `app/configuracion/sucursales/[id].tsx` | `/configuracion/sucursales/{id}` | Ficha con pestañas Datos · Equipo · Horario; editar contacto y cambiar estado con motivo. | `GET`/`PATCH sucursales/{id}/`, `POST sucursales/{id}/estado/` | Todos para leer; estado: A | ver `screenshots/manifest.md` |
| 53 | `app/configuracion/divisas.tsx` | `/configuracion/divisas` | Monedas y tasas: equivalencia legible, convertidor, alta/edición de tasas y monedas. | `GET`/`POST configuracion/divisas/`, `PATCH …/config/`, `POST …/sembrar/`, `POST …/convertir/`, `PATCH`/`DELETE …/tasas/{id}/`, `POST …/monedas/`, `PATCH`/`DELETE …/monedas/{id}/`, `POST …/monedas/{id}/estado/`, `GET catalogos/divisas/` | Todos para leer; escribir según `puede_gestionar` del servidor | ver `screenshots/manifest.md` |
| 54 | `app/configuracion/retenciones.tsx` | `/configuracion/retenciones` | Retenciones legales de nómina (AFP, SFS, ISR…) con activar/desactivar. | `GET configuracion/retenciones/`, `POST configuracion/retenciones/{id}/estado/` | F | ver `screenshots/manifest.md` |
| 55 | `app/configuracion/reportes/index.tsx` | `/configuracion/reportes` | Mis reportes de fallos; bandeja completa para quien administra. | `GET reportes/`, `GET catalogos/reportes/` | Todos | ver `screenshots/manifest.md` |
| 56 | `app/configuracion/reportes/nuevo.tsx` | `/configuracion/reportes/nuevo` (modal) | Escribir un reporte con captura opcional (galería o cámara). | `POST reportes/` (JSON o multipart) , `GET catalogos/reportes/` | Todos | ver `screenshots/manifest.md` |
| 57 | `app/configuracion/reportes/[id].tsx` | `/configuracion/reportes/{id}` | Reporte con respuestas; triaje si se administra. | `GET reportes/{id}/`, `PATCH reportes/{id}/triaje/`, `POST reportes/{id}/respuestas/` | Todos (triaje según `puede_gestionar`) | ver `screenshots/manifest.md` |

Notas:

- Pasos del asistente por tipo (comprobado, `movil/services/alta_reserva.py:1233-1237,1246-1556`):
  Hotel/Resort: Cliente · Hotel · Habitaciones · Dinero · Confirmar; Vuelo:
  Cliente · Vuelo · Pasajeros · Dinero · Confirmar; Crucero: … · Crucero ·
  Pasajeros …; Paquete: … · Paquete · Viajeros …; Seguro de viaje: … · Póliza ·
  Asegurados …; Otro servicio: Cliente · Servicio · Dinero · Confirmar.
- Buscadores del asistente (comprobado, `movil/services/alta_reserva.py:1240-1305,1350-1450`;
  `mobile/src/reservas/Buscadores.tsx:14,103,127`): cliente, empresa, hotel,
  aerolínea, aeropuertos, naviera y barco.
- Endpoints que la app no llama (comprobado por búsqueda en `mobile/src` y
  `mobile/app`): `POST dispositivos/push-token/` (la función `registrarPush`
  existe en `mobile/src/api/endpoints.ts:142-146` pero no tiene llamadas) y
  `GET dispositivos/{uuid}/`. `GET archivos/{token}/` se usa indirectamente, al
  abrir enlaces firmados en el navegador.

## 3. Módulos de `mobile/src/`

| Módulo | Archivos | Qué hace |
| --- | --- | --- |
| `api/` | `cliente.ts` (312 líneas), `endpoints.ts` (491), `errores.ts` (139), `eventos.ts`, `tipos.ts` (alias sobre los generados), `types.ts` (8 630, generado), `__tests__/` (3 archivos, 29 casos) | Cliente HTTP único: Bearer, `X-Omsta-App-Version`, un solo refresh en vuelo, traducción del contrato de error a acciones (`refrescar`, `revocado`, `ubicacion`, `actualizar`…), subida nativa de archivos inyectada. Funciones tipadas por endpoint. |
| `auth/` | `almacen.ts`, `biometria.ts`, `sesion.tsx` (435) | SecureStore (tokens, uuid del dispositivo, último login, clave de la caché), biometría, máquina de estados de la sesión, reautenticación a los N días, latido de ubicación. |
| `cache/` | `persistencia.ts` | Persistidor de TanStack Query sobre MMKV cifrado. |
| `config.ts` | — | URL del API desde `EXPO_PUBLIC_API_URL`, prefijo, versión nativa, latido (10 min), TTL de caché (24 h), `CACHE_CONTRATO`. |
| `datos/` | `consultas.ts` (507) | Hooks de TanStack Query por pantalla (listas infinitas con cursor, fichas, catálogos). |
| `hoteles/` | `BuscadorGoogle.tsx` | Autocompletado de Google Places a través del servidor (la clave no está en la app). |
| `navegacion/` | `abrir.ts`, `destinos.ts`, `filtros.ts`, `__tests__/` | Traduce `destino` del backend a rutas; abre enlaces en navegador embebido, WhatsApp, `tel:` y `mailto:`. |
| `reservas/` | `Asistente.tsx` (1 149), `Campos.tsx`, `CampoDinamico.tsx`, `FormsetDinamico.tsx`, `Buscadores.tsx`, `esquema.ts`, `borradores.ts`, `clienteNuevo.ts`, `Huespedes.tsx`, `PlanCuotas.tsx`, `DetallePago.tsx`, `FilaPago.tsx`, `FormularioPago.tsx`, `FormularioLiquidacion.tsx`, `Compensacion.tsx`, `AccionesEstado.tsx`, `EditorLocalizadores.tsx`, `Adjuntos.tsx` | Todo el dominio de reservas en el teléfono: asistente guiado por esquema del servidor, pagos, liquidación, compensación, estado y adjuntos. |
| `ubicacion/` | `gps.ts` | Permiso «mientras se usa», lectura con tope de 15 s y última posición conocida como respaldo. |
| `ui/` | `tema.ts`, `componentes.tsx`, `ficha.tsx`, `formulario.tsx`, `hojas.tsx`, `calendario.tsx`, `fechas.ts`, `alertas.tsx`, `lista.tsx`, `tarjetas.tsx`, `reserva.tsx`, `foto.ts`, `visor.tsx`, `ubicacion.tsx`, `panel.ts`, `delta.ts`, `texto.ts`, `tiempo.ts`, `__tests__/` | Sistema de diseño (paleta navy, Manrope + Inter), componentes, hojas modales, calendario propio (fecha, rango, fecha y hora), alertas globales, selector de foto con compresión. |

## 4. Lista de tomas

Orden narrativo para el portafolio. Todas: **Publicable = ver `screenshots/manifest.md`**.
Preparación común (comprobado en `docs/operaciones/app-movil.md` §4): build de
desarrollo instalada, servidor QA local y `mobile/.env` con `EXPO_PUBLIC_API_URL`;
usuario de prueba con rol `admin` para ver todo (Cobros y Configuración), salvo
donde se indique. En Android la captura de un aviso biométrico del sistema sale
en negro porque es una ventana segura (`docs/operaciones/app-movil.md:236-242`).
Usar datos de prueba, nunca clientes reales.

| Toma | Pantalla | Ruta | Cómo llegar |
| --- | --- | --- | --- |
| m01-login | Acceso | `/login` | Abrir la app sin sesión (o tras «Cerrar sesión» en Mi cuenta). |
| m02-login-permiso-gps | Diálogo del sistema de permiso de ubicación | `/login` | Escribir credenciales y tocar «Entrar» la primera vez: la app pide ubicación siempre al entrar (`sesion.tsx:286`). |
| m03-ubicacion | Verifica tu ubicación | `/ubicacion` | Backend con `LOCATION_GATE_ENABLED=True` y un usuario que no sea `admin` ni `superadmin`; entrar denegando el permiso o sin GPS. |
| m04-bloqueo | Desbloquea Omsta | `/bloqueo` | Con sesión y huella/rostro registrados, cerrar la app del todo y abrirla; cancelar el aviso del sistema para que quede la pantalla de la app. No tocar «Entrar con contraseña» (borra la sesión). |
| m05-inicio | Inicio | `/` | Tras entrar; pestaña Inicio. |
| m06-resumen | Resumen del mes | `/resumen` | En Inicio, tocar «Más del mes» u otra sección que lleve al resumen. |
| m07-reservas-listado | Reservas | `/reservas` | Pestaña Reservas. |
| m08-reservas-filtros | Hoja de filtros y orden | `/reservas` | En Reservas, abrir «Filtros» (producto y «Ordenar por»). |
| m09-reserva-resumen | Ficha, pestaña Resumen | `/reservas/{id}` | Tocar una tarjeta del listado. |
| m10-reserva-producto | Ficha, pestaña de producto (Hotel, Vuelo…) | `/reservas/{id}` | Segunda pestaña de la ficha. |
| m11-reserva-pagos | Ficha, pestaña Pagos | `/reservas/{id}` | Tercera pestaña. |
| m12-reserva-expediente | Ficha, pestaña Expediente | `/reservas/{id}` | Cuarta pestaña. |
| m13-reserva-documentos | Documentos (modal) | `/reservas/{id}/documentos` | Acción «Documentos» de la ficha. |
| m14-reserva-historial-pagos | Historial de pagos | `/reservas/{id}/pagos` | Pestaña Pagos → «Historial y filtros». |
| m15-registrar-cobro | Registrar pago | `/reservas/{id}/pagos/nuevo` | Ficha → «Registrar pago» (usuario con rol de pagos). |
| m16-registrar-cobro-comprobante | Registrar pago con comprobante adjunto | `/reservas/{id}/pagos/nuevo` | «Adjuntar comprobante» → selector de documentos del sistema → elegir una imagen o PDF de prueba; capturar con el adjunto en la lista. |
| m17-reserva-estado | Historial de estado | `/reservas/{id}/estado` | En la ficha, «Historial de estado». |
| m18-anular-liquidar | Anular y liquidar | `/reservas/{id}/anular` | Acciones de estado → anular o «Liquidar lo cobrado» (reserva de prueba). |
| m19-compensar | Compensar saldo a favor | `/reservas/{id}/compensar` | Reserva con saldo a favor → «Llevar saldo a otra reserva». |
| m20-nueva-reserva | Nueva reserva: tipos y borradores | `/reservas/nueva` | Botón flotante «+» en Reservas. |
| m21-asistente-cliente | Paso Cliente con buscador | `/reservas/nueva/hotel` | Tocar «Hotel / Resort»; abrir el buscador de cliente. |
| m22-asistente-hotel-busqueda | Paso Hotel con búsqueda de hotel | `/reservas/nueva/hotel` | «Siguiente»; tocar el campo de hotel para abrir la hoja de búsqueda. |
| m23-asistente-calendario | Calendario de rango (estadía) | `/reservas/nueva/hotel` | En el paso Hotel, tocar las fechas: hoja `HojaRango` con noches. |
| m24-asistente-habitaciones | Paso Habitaciones | `/reservas/nueva/hotel` | «Siguiente». |
| m25-asistente-dinero | Paso Dinero con pago inicial | `/reservas/nueva/hotel` | «Siguiente»; activar pago inicial para ver el campo de comprobante. |
| m26-asistente-confirmar | Paso Confirmar con resumen del servidor | `/reservas/nueva/hotel` | «Siguiente». |
| m27-asistente-errores | Indicador de pasos con error en rojo | `/reservas/nueva/{tipo}` | Avanzar dejando un campo obligatorio vacío. |
| m28-clientes-listado | Clientes (Personas/Empresas) | `/clientes` | Pestaña Clientes (rol `admin` o `clientes`). |
| m29-cliente-ficha | Ficha de cliente con pestañas | `/clientes/persona/{id}` | Tocar un cliente; recorrer Info · Reservas · Pagos · Docs · Notas. |
| m30-cliente-formulario | Nuevo cliente (modal) | `/clientes/formulario` | Botón de alta en la cabecera de Clientes. |
| m31-cobros | Cobros | `/cobros` | Pestaña Cobros (roles `admin`, `contabilidad` o `cobros`). |
| m32-avisos | Avisos | `/avisos` | Pestaña Avisos (con alguno sin leer para ver el badge). |
| m33-catalogos | Índice de catálogos | `/catalogos` | Icono de la izquierda en la cabecera de Reservas. |
| m34-suplidores | Suplidores (listado y ficha) | `/catalogos/suplidores`, `/catalogos/suplidores/{id}` | Catálogos → Suplidores → un suplidor. |
| m35-hoteles | Hoteles (listado) | `/catalogos/hoteles` | Catálogos → Hoteles. |
| m36-hotel-ficha | Ficha de hotel | `/catalogos/hoteles/{id}` | Tocar un hotel. |
| m37-hotel-google | Formulario de hotel con Google | `/catalogos/hoteles/formulario` | Alta de hotel → buscar en Google (requiere clave configurada en el servidor). |
| m38-aerolineas | Aerolíneas | `/catalogos/aerolineas` | Catálogos → Aerolíneas (igual para Aeropuertos). |
| m39-navieras-barcos | Navieras y barcos | `/catalogos/navieras`, `/catalogos/barcos` | Catálogos → Navieras / Barcos. |
| m40-perfil | Mi cuenta | `/perfil` | Avatar de la cabecera en cualquier pestaña. |
| m41-perfil-editar | Editar mis datos (modal) | `/perfil/editar` | Mi cuenta → editar. |
| m42-dispositivos | Mis dispositivos | `/perfil/dispositivos` | Mi cuenta → «Mis dispositivos». |
| m43-configuracion | Centro de Configuración | `/configuracion` | Mi cuenta → «Configuración» (solo `admin`). |
| m44-usuarios | Usuarios | `/configuracion/usuarios` | Configuración → Usuarios. |
| m45-usuario-ficha | Ficha de cuenta | `/configuracion/usuarios/{id}` | Tocar un usuario. |
| m46-en-linea | Quién está conectado | `/configuracion/usuarios/en-linea` | Configuración → «Quién está conectado». |
| m47-sesiones | Sesiones y dispositivos de una cuenta | `/configuracion/usuarios/{id}/sesiones` | Ficha de cuenta → sesiones. |
| m48-permisos | Permisos | `/configuracion/permisos/{id}` | Configuración → Permisos (solo superadministrador). |
| m49-actividad | Actividad | `/configuracion/actividad` | Configuración → Actividad; tocar un evento para `/configuracion/actividad/{id}`. |
| m50-empresa | Empresa y DGII | `/configuracion/empresa` | Configuración → Empresa y DGII. |
| m51-comprobantes | Rango de comprobantes | `/configuracion/comprobante` | Empresa y DGII → añadir o tocar un rango. |
| m52-sucursales | Sucursales y ficha | `/configuracion/sucursales`, `/configuracion/sucursales/{id}` | Configuración → Sucursales → una sucursal. |
| m53-divisas | Monedas y tasas | `/configuracion/divisas` | Configuración → Monedas y tasas. |
| m54-retenciones | Retenciones de nómina | `/configuracion/retenciones` | Configuración → Retenciones de nómina. |
| m55-reportes | Reportes | `/configuracion/reportes` | Mi cuenta → «Reportar un problema». |
| m56-reporte-nuevo | Nuevo reporte (modal) | `/configuracion/reportes/nuevo` | Reportes → escribir uno. |
| m57-sin-conexion | Franja «Sin conexión» con datos guardados | `/` y pestañas | Con sesión y datos ya cargados, activar modo avión y reabrir la app (`docs/operaciones/app-movil.md:193-195`). |
| m58-actualizar | Actualiza la app | `/actualizar` | Arrancar el backend con `MOVIL_MIN_APP_VERSION` mayor que la versión instalada (1.0.0) y reabrir: `auth/me/` responde 426. |
| m59-no-encontrado | Ruta inexistente | cualquiera | Abrir un enlace `omsta://` a una ruta que no existe (opcional). |
