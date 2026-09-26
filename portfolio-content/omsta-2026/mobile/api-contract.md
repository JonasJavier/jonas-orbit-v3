<!-- portfolio-content/omsta-2026/mobile/api-contract.md · fecha 2026-09-25 · commit 3f5cea73 -->

# Omsta Móvil: contrato de la API `/api/movil/v1/`

Backend: app Django `movil/`, montada en `CristecnoViajes_SRL/urls.py:93` con
namespace `movil`. Versiones: `djangorestframework==3.16.1`,
`djangorestframework-simplejwt==5.5.1`, `drf-spectacular==0.30.0`
(`requirements.txt`); `openapi-typescript` 7.13.0 instalado
(`mobile/node_modules/openapi-typescript/package.json`). Todo **comprobado**
leyendo código salvo donde se indique; en esta investigación no se ejecutó
ningún test ni comando de Django.

## 1. Autenticación: JWT por dispositivo (simplejwt)

### Emisión

- `POST auth/login/` (`movil/views/auth.py:32-63`) recibe `usuario`, `password`,
  `dispositivo {uuid, plataforma, modelo, nombre, app_version}` y `ubicacion`
  opcional. Orden: comprueba la versión mínima **antes** de tocar credenciales
  (`:46-47`) y luego llama a `iniciar_sesion`
  (`movil/services/autenticacion.py:66-156`): `login_throttle.check` →
  `authenticate()` → en fallo `record_failure` e `incrementar_intentos_login`; en
  éxito `clear_success`, alta o reutilización del dispositivo por
  `(usuario, uuid)`, sello de ubicación si llegan coordenadas y emisión de
  tokens. **comprobado**
- `emitir_tokens` (`movil/authentication.py:95-114`): `RefreshToken.for_user` con
  dos claims propios, `device` (uuid) y `auth_version` (`movil/constants.py:12-13`);
  reescribe el `OutstandingToken` para que la revocación pueda leer el claim
  (arreglo de un fallo real de simplejwt 5.5.1 documentado en
  `docs/architecture/plan-app-movil-2026-09.md:367`). Devuelve `access`,
  `refresh`, `access_expira_en` y `refresh_expira_en`. **comprobado**
- La respuesta incluye perfil, `roles_efectivos`, `modulos`, `es_superadmin`,
  `ubicacion_requerida`, el dispositivo y la configuración del cliente
  (`reautenticar_dias`, `min_app_version`, validez de la ubicación)
  (`movil/serializers/perfil.py:43-99`). **comprobado**

### Vida y rotación

- `SIMPLE_JWT` (`CristecnoViajes_SRL/settings.py:738-756`): access de 15 min
  (`MOVIL_ACCESS_TOKEN_MINUTES`), refresh de 30 días (`MOVIL_REFRESH_TOKEN_DAYS`),
  `ROTATE_REFRESH_TOKENS` y `BLACKLIST_AFTER_ROTATION` activos, HS256, clave
  `SIMPLE_JWT_SIGNING_KEY` o `SECRET_KEY`, cabecera `Bearer`, `UPDATE_LAST_LOGIN`
  apagado. App `rest_framework_simplejwt.token_blacklist` instalada (`:92`).
  **comprobado**
- `POST auth/refresh/` (`movil/views/auth.py:66-81`) usa
  `MovilTokenRefreshSerializer` (`movil/serializers/auth.py:87-124`): decodifica el
  refresh y exige un dispositivo vigente con el mismo `auth_version` antes de
  delegar en simplejwt, para que un teléfono revocado reciba
  `DISPOSITIVO_REVOCADO` aunque su refresh ya esté en lista negra. **comprobado**
- La app exige de nuevo la contraseña pasados `reautenticar_dias` (por defecto
  30, `MOVIL_REAUTH_DAYS`, `settings.py:730`; `mobile/src/auth/sesion.tsx:94-98`).
  **comprobado**

### Validación en cada petición

- `MovilTokenAuthMiddleware` (`movil/middleware.py:43-87`), registrado antes de
  `RequireLoginMiddleware` y `LocationVerificationMiddleware`
  (`settings.py:135-137`), valida el Bearer una vez y fija `request.user` y
  `request.dispositivo_movil`; login y refresh se saltan aunque lleven un Bearer
  viejo (`:34`). Así los guards de sesión, el gate de ubicación y la presencia
  funcionan sin cambios. **comprobado**
- `MovilJWTAuthentication` (`movil/authentication.py:64-92`) es la **única**
  autenticación de las vistas: sin `SessionAuthentication` no hay cookie ni CSRF
  que forjar (`movil/views/base.py:28-41`). `resolver_dispositivo` (`:24-61`)
  rechaza tokens sin claims, dispositivos inexistentes o revocados
  (`dispositivo_revocado`) y `auth_version` atrasado (`sesion_invalidada`, por
  ejemplo tras un cambio de contraseña). Registra el acceso y la IP del
  dispositivo. **comprobado**
- Rutas anónimas en `LOGIN_EXEMPT_URLS`: solo `auth/login/`, `auth/refresh/` y
  `archivos/<token>/` (enlaces firmados) (`settings.py:327-342`). **comprobado**

### Cierre de sesión y revocación

- `POST auth/logout/` (`movil/views/auth.py:84-107`): lista negra del refresh
  actual, borra el push token y sella el cierre; el dispositivo sigue siendo de
  confianza (`movil/services/dispositivos.py:224-270`). **comprobado**
- Revocar (`DELETE dispositivos/{uuid}/` desde otro teléfono propio, o
  `DELETE usuarios/{id}/dispositivos/{uuid}/` como admin):
  `revocar_dispositivo` (`movil/services/dispositivos.py:301-347`) incrementa
  `auth_version` con `select_for_update`, sella `revocado_en/por`, borra el push
  token, pone en lista negra todos los refresh vigentes cuyo claim `device`
  coincide (`:272-298`), invalida la caché del dispositivo y deja rastro en la
  bitácora. El access vivo muere en la siguiente petición por el
  `auth_version`. **comprobado**
- Limpieza de tokens caducados con la tarea `limpiar_tokens_expirados`
  (`movil/tasks.py:15`), programada en `post_migrate` (`movil/signals.py:71`).
  **comprobado**

### Cabeceras

- La app envía `Accept: application/json`, `Authorization: Bearer <access>` y
  `X-Omsta-App-Version` (`mobile/src/api/cliente.ts:204-214`). **comprobado**
- **Sorpresa:** el backend no lee `X-Omsta-App-Version` (`grep -rni
  "omsta-app-version\|HTTP_X_OMSTA"` sobre el código Python: sin resultados). La
  versión que cuenta es `dispositivo.app_version` del cuerpo del login, guardada
  en la fila del dispositivo y revisada en `auth/me/`
  (`movil/views/auth.py:47,117`). **comprobado**
- Respuestas: `Cache-Control: no-store` en toda vista móvil
  (`movil/views/base.py:74-78`); `WWW-Authenticate: Bearer realm="omsta-movil"`
  en los 401 de token (`movil/views/base.py:83-87`; `movil/middleware.py`).
  **comprobado**

### Throttling

- **Login:** `usuarios.services.login_throttle`, el mismo de la web, con
  contadores por identificador+IP, identificador e IP; al bloquear responde
  `429 LOGIN_BLOQUEADO` con `details.scope` y lo audita
  (`movil/services/autenticacion.py:83-94`; `movil/services/errores.py:45-50`).
  Caché propia configurable (`settings.py:686-700`). **comprobado**
- **Google Places:** `_LugaresThrottle(UserRateThrottle)`, `90/min` por usuario,
  en `hoteles/lugares/` y `hoteles/lugares/{place_id}/`
  (`movil/views/catalogos.py:245-256,260,287`). **comprobado**
- No hay `DEFAULT_THROTTLE_CLASSES` en `REST_FRAMEWORK` (`settings.py:707-722`):
  el resto de endpoints no tiene límite de tasa de DRF. **comprobado**

## 2. Permisos

- Base `MovilAPIView`: `permission_classes = [RolePermission]` y `required_roles`
  por vista; `security_self_service = True` declara ante la auditoría de acceso
  que la vista solo toca datos propios o que la autorización está en el servicio
  (`movil/views/base.py:28-47`). `RolePermission` exige autenticación y, si hay
  requisitos, cualquier rol efectivo coincidente (`security/permissions.py:20-60`);
  el superusuario pasa siempre (`security/constants.py:27-28`). **comprobado**
- Regla adicional de módulo: `/api/movil/v1/cxc/` exige `RECEIVABLES_READ_ROLES`
  también en la política de acceso (`security/access_policy.py:85`). **comprobado**
- Leyenda de la columna «Permiso»: **R** `admin, clientes, contabilidad,
  reservas` (`reservas/services/reservations.py:42-46`); **P** `admin,
  contabilidad, reservas, cobros` (`contabilidad/services/payment_permissions.py:18`);
  **C** `admin, contabilidad, cobros` (`security/access_policy.py:37`); **L**
  `superadmin, admin, reservas, contabilidad`
  (`reservas/services/cancellation.py:175`, `reservas/services/credit_transfers.py:77`);
  **CRM** `admin, clientes` (`movil/views/crm.py:40`); **H** `admin, reservas`
  (`reservas/services/hotel_catalog.py:36`); **S** `admin, reservas,
  contabilidad` (`reservas/services/suplidores.py:35`); **A** `admin`; **F**
  `admin, contabilidad`; **SA** `superadmin` (`movil/views/seguridad.py:35`);
  **Todos** = autenticado con `security_self_service`.

## 3. Endpoints

**Conteo (comprobado):**

- `grep -c -E '^\s+path\(' movil/urls.py` → **94 rutas**.
- Análisis AST de cada vista enlazada en `movil/urls.py` (métodos
  `get/post/put/patch/delete` definidos en la clase o heredados de una base
  propia) → **123 operaciones** (método × ruta).
- `mobile/api/schema.yaml` cargado con PyYAML → **93 rutas y 122 operaciones**
  (GET 56 · POST 39 · PATCH 15 · DELETE 10 · PUT 2). La diferencia es
  `GET archivos/{token}/`, una `View` de Django (no DRF) que el esquema no
  incluye (`movil/archivos.py:141`).

Rutas relativas a `/api/movil/v1/`; la tabla sale del mismo análisis AST.

| Método | Ruta | Vista | Permiso |
| --- | --- | --- | --- |
| GET | `panel/` | `PanelView` (`movil/views/lectura.py:40`) | Todos |
| GET | `reservas/` | `ReservasView` (`movil/views/lectura.py:51`) | R |
| GET | `reservas/tipos/` | `TiposReservaView` (`movil/views/alta.py:34`) | R |
| POST | `reservas/adjuntos/` | `AdjuntoReservaView` (`movil/views/alta.py:127`) | R |
| GET | `reservas/tarifa-habitacion/` | `TarifaHabitacionView` (`movil/views/alta.py:89`) | R |
| GET · POST | `reservas/formulario/{tipo}/` | `FormularioReservaView` (`movil/views/alta.py:49`) | R |
| GET · PUT | `reservas/{pk}/formulario/` | `FormularioReservaEdicionView` (`movil/views/alta.py:156`) | R |
| GET | `reservas/{pk}/` | `ReservaDetalleView` (`movil/views/lectura.py:112`) | R |
| GET | `reservas/{pk}/documentos/` | `ReservaDocumentosView` (`movil/views/lectura.py:151`) | R |
| GET · POST | `reservas/{pk}/pagos/` | `PagosReservaView` (`movil/views/pagos.py:33`) | P |
| GET | `reservas/{pk}/pagos/formulario/` | `FormularioPagoView` (`movil/views/pagos.py:82`) | P |
| POST | `reservas/{pk}/enviar/` | `EnviarDocumentoView` (`movil/views/pagos.py:98`) | R |
| POST | `reservas/{pk}/expediente/` | `ExpedienteReservaView` (`movil/views/pagos.py:126`) | R |
| PATCH | `reservas/{pk}/titulares/` | `ReservaTitularesView` (`movil/views/lectura.py:129`) | R |
| POST | `reservas/{pk}/estado/` | `EstadoReservaView` (`movil/views/ciclo_vida.py:33`) | R |
| PATCH | `reservas/{pk}/localizadores/` | `LocalizadoresReservaView` (`movil/views/ciclo_vida.py:62`) | R |
| GET · POST | `reservas/{pk}/cancelacion/` | `LiquidacionReservaView` (`movil/views/ciclo_vida.py:86`) | L |
| GET · POST | `reservas/{pk}/compensacion/` | `CompensacionReservaView` (`movil/views/ciclo_vida.py:127`) | L |
| GET · POST | `suplidores/` | `SuplidoresView` (`movil/views/catalogos.py:86`) | S |
| GET · PATCH | `suplidores/{pk}/` | `SuplidorDetalleView` (`movil/views/catalogos.py:121`) | S |
| GET | `catalogos/suplidores/` | `CatalogoSuplidoresView` (`movil/views/catalogos.py:151`) | S |
| GET · POST | `hoteles/` | `HotelesView` (`movil/views/catalogos.py:167`) | H |
| GET · PATCH | `hoteles/{pk}/` | `HotelDetalleView` (`movil/views/catalogos.py:202`) | H |
| GET | `hoteles/lugares/` | `LugaresHotelView` (`movil/views/catalogos.py:260`) | H · 90/min |
| GET | `hoteles/lugares/{place_id}/` | `LugarHotelView` (`movil/views/catalogos.py:287`) | H · 90/min |
| GET | `catalogos/hoteles/` | `CatalogoHotelesView` (`movil/views/catalogos.py:232`) | H |
| GET · POST | `catalogo/{tipo}/` | `ElementosCatalogoView` (`movil/views/catalogos.py:319`) | R |
| GET · PATCH · DELETE | `catalogo/{tipo}/{pk}/` | `ElementoCatalogoView` (`movil/views/catalogos.py:355`) | R |
| GET | `catalogos/viajes/` | `CatalogoViajesView` (`movil/views/catalogos.py:393`) | R |
| GET · POST | `clientes/{tipo}/` | `ClientesView` (`movil/views/crm.py:80`) | CRM |
| GET · PATCH · DELETE | `clientes/{tipo}/{pk}/` | `ClienteDetalleView` (`movil/views/crm.py:127`) | CRM |
| POST | `clientes/{tipo}/{pk}/notas/` | `ClienteNotasView` (`movil/views/crm.py:182`) | CRM |
| DELETE | `clientes/{tipo}/{pk}/notas/{nota_id}/` | `ClienteNotaView` (`movil/views/crm.py:203`) | CRM |
| POST | `clientes/{tipo}/{pk}/documentos/` | `ClienteDocumentosView` (`movil/views/crm.py:219`) | CRM |
| DELETE | `clientes/{tipo}/{pk}/documentos/{documento_id}/` | `ClienteDocumentoView` (`movil/views/crm.py:247`) | CRM |
| POST | `clientes/{tipo}/{pk}/pdf/` | `ClientePdfView` (`movil/views/crm.py:265`) | CRM |
| POST | `clientes/{tipo}/exportar/` | `ClientesExportarView` (`movil/views/crm.py:311`) | CRM |
| GET | `exportaciones/{pk}/` | `ExportacionView` (`movil/views/crm.py:336`) | Todos |
| GET | `catalogos/crm/` | `CatalogoCRMView` (`movil/views/crm.py:352`) | CRM |
| GET · PATCH | `perfil/` | `PerfilView` (`movil/views/perfil.py:48`) | Todos |
| POST · DELETE | `perfil/foto/` | `PerfilFotoView` (`movil/views/perfil.py:79`) | Todos |
| GET · POST | `usuarios/` | `UsuariosView` (`movil/views/usuarios.py:47`) | A |
| GET | `usuarios/en-linea/` | `UsuariosEnLineaView` (`movil/views/usuarios.py:166`) | A |
| GET · PATCH | `usuarios/{pk}/` | `UsuarioDetalleView` (`movil/views/usuarios.py:112`) | A |
| POST | `usuarios/{pk}/password/` | `UsuarioPasswordView` (`movil/views/usuarios.py:146`) | A |
| GET | `catalogos/usuarios/` | `CatalogoUsuariosView` (`movil/views/usuarios.py:186`) | A |
| GET · PUT | `usuarios/{pk}/permisos/` | `PermisosUsuarioView` (`movil/views/seguridad.py:52`) | SA |
| GET · POST | `usuarios/{pk}/sesiones/` | `SesionesUsuarioView` (`movil/views/seguridad.py:98`) | A |
| DELETE | `usuarios/{pk}/dispositivos/{uuid}/` | `DispositivoUsuarioView` (`movil/views/seguridad.py:133`) | A |
| GET | `bitacora/` | `BitacoraView` (`movil/views/seguridad.py:160`) | A |
| GET | `bitacora/{pk}/` | `BitacoraDetalleView` (`movil/views/seguridad.py:194`) | A |
| GET | `catalogos/permisos/` | `CatalogoPermisosView` (`movil/views/seguridad.py:85`) | SA |
| GET | `catalogos/bitacora/` | `CatalogoBitacoraView` (`movil/views/seguridad.py:217`) | A |
| GET · PATCH | `configuracion/empresa/` | `EmpresaView` (`movil/views/configuracion.py:68`) | A |
| POST | `configuracion/empresa/comprobantes/` | `ComprobantesView` (`movil/views/configuracion.py:139`) | F |
| PATCH | `configuracion/empresa/comprobantes/{pk}/` | `ComprobanteDetalleView` (`movil/views/configuracion.py:166`) | F |
| POST | `configuracion/empresa/comprobantes/{pk}/estado/` | `ComprobanteEstadoView` (`movil/views/configuracion.py:190`) | F |
| POST · DELETE | `configuracion/empresa/imagenes/{campo}/` | `EmpresaImagenView` (`movil/views/configuracion.py:97`) | A |
| GET | `catalogos/empresa/` | `CatalogoEmpresaView` (`movil/views/configuracion.py:210`) | A |
| GET | `sucursales/` | `SucursalesView` (`movil/views/configuracion.py:223`) | Todos |
| GET · PATCH | `sucursales/{pk}/` | `SucursalDetalleView` (`movil/views/configuracion.py:256`) | Todos |
| POST | `sucursales/{pk}/estado/` | `SucursalEstadoView` (`movil/views/configuracion.py:293`) | A |
| GET | `catalogos/sucursales/` | `CatalogoSucursalesView` (`movil/views/configuracion.py:318`) | Todos |
| GET · POST | `configuracion/divisas/` | `DivisasView` (`movil/views/configuracion.py:331`) | Todos |
| PATCH | `configuracion/divisas/config/` | `DivisasConfigView` (`movil/views/configuracion.py:461`) | Todos |
| POST | `configuracion/divisas/sembrar/` | `DivisasSembrarView` (`movil/views/configuracion.py:477`) | Todos |
| POST | `configuracion/divisas/convertir/` | `DivisasConvertirView` (`movil/views/configuracion.py:490`) | Todos |
| PATCH · DELETE | `configuracion/divisas/tasas/{pk}/` | `TasaDetalleView` (`movil/views/configuracion.py:377`) | Todos |
| POST | `configuracion/divisas/monedas/` | `MonedasView` (`movil/views/configuracion.py:403`) | Todos |
| PATCH · DELETE | `configuracion/divisas/monedas/{pk}/` | `MonedaDetalleView` (`movil/views/configuracion.py:419`) | Todos |
| POST | `configuracion/divisas/monedas/{pk}/estado/` | `MonedaEstadoView` (`movil/views/configuracion.py:445`) | Todos |
| GET | `catalogos/divisas/` | `CatalogoDivisasView` (`movil/views/configuracion.py:510`) | Todos |
| GET | `configuracion/retenciones/` | `RetencionesView` (`movil/views/configuracion.py:523`) | F |
| POST | `configuracion/retenciones/{pk}/estado/` | `RetencionEstadoView` (`movil/views/configuracion.py:539`) | F |
| GET · POST | `reportes/` | `ReportesView` (`movil/views/reportes.py:42`) | Todos |
| GET | `reportes/{pk}/` | `ReporteDetalleView` (`movil/views/reportes.py:110`) | Todos |
| PATCH | `reportes/{pk}/triaje/` | `ReporteTriajeView` (`movil/views/reportes.py:131`) | Todos |
| POST | `reportes/{pk}/respuestas/` | `ReporteRespuestaView` (`movil/views/reportes.py:161`) | Todos |
| GET | `catalogos/reportes/` | `CatalogoReportesView` (`movil/views/reportes.py:189`) | Todos |
| GET | `archivos/{token}/` | `ArchivoFirmadoView` (`movil/archivos.py:141`) | Enlace firmado (sin Bearer) |
| GET | `cxc/` | `CuentasPorCobrarView` (`movil/views/lectura.py:164`) | C |
| GET | `notificaciones/` | `NotificacionesView` (`movil/views/lectura.py:208`) | Todos |
| GET | `notificaciones/badge/` | `NotificacionesBadgeView` (`movil/views/lectura.py:232`) | Todos |
| POST | `notificaciones/leer-todas/` | `NotificacionesLeerTodasView` (`movil/views/lectura.py:259`) | Todos |
| POST | `notificaciones/{pk}/leer/` | `NotificacionLeerView` (`movil/views/lectura.py:241`) | Todos |
| GET | `catalogos/estados-reserva/` | `CatalogoEstadosView` (`movil/views/lectura.py:281`) | Todos |
| POST | `auth/login/` | `LoginView` (`movil/views/auth.py:32`) | Anónimo (AllowAny) |
| POST | `auth/refresh/` | `RefreshView` (`movil/views/auth.py:66`) | Anónimo (AllowAny) |
| POST | `auth/logout/` | `LogoutView` (`movil/views/auth.py:84`) | Todos |
| GET | `auth/me/` | `MeView` (`movil/views/auth.py:110`) | Todos |
| GET | `dispositivos/` | `DispositivosView` (`movil/views/dispositivos.py:43`) | Todos |
| POST | `dispositivos/push-token/` | `PushTokenView` (`movil/views/dispositivos.py:114`) | Todos |
| GET · DELETE | `dispositivos/{uuid}/` | `DispositivoDetalleView` (`movil/views/dispositivos.py:66`) | Todos |
| POST | `ubicacion/verificar/` | `UbicacionVerificarView` (`movil/views/dispositivos.py:137`) | Todos |

Notas sobre la columna «Permiso» (comprobado):

- Las escrituras de monedas y tasas (`configuracion/divisas/*` salvo
  `convertir/`) heredan `_DivisasEscrituraView`: la vista declara
  `security_self_service` y el rol (`admin` o `contabilidad`) lo comprueba el
  servicio (`movil/views/configuracion.py:364-374`). El `POST
  configuracion/divisas/` (registrar tasa) también figura como «Todos» en la
  vista.
- `PATCH sucursales/{pk}/`, `PATCH reportes/{pk}/triaje/` y la parte laboral de
  `PATCH perfil/` dependen de banderas que calcula el servicio
  (`puede_gestionar`, `puede_editar_laborales`), no de `required_roles`.
- `GET archivos/{token}/` no lleva Bearer: el token es un enlace firmado que
  caduca en 1 h o 24 h (`movil/archivos.py:26-27,81-96`).

## 4. Paginación

- Tipo: `CursorPagination` de DRF (`movil/pagination.py:18-22`): 25 por página,
  `?page_size=` hasta 100, orden por defecto `-id`. Motivo: es estable ante
  inserciones y no cuesta un `COUNT` por página (`:2-7`). La paginación global de
  DRF está apagada (`settings.py:720-721`). **comprobado**
- Respuesta: `{results, next, previous}`, con `next` como URL absoluta que la app
  sigue tal cual (`mobile/src/api/endpoints.ts:120-128`), más campos extra por
  listado (`respuesta_paginada(..., extra=...)`, `movil/pagination.py:37-58`),
  por ejemplo `total_count` en reservas (`movil/views/lectura.py:106`).
  **comprobado**
- Paginadores por listado (comprobado): reservas y CxC con
  `ReservasCursorPagination` (`-fecha_creacion, -id`, `movil/pagination.py:25-34`;
  `movil/views/lectura.py:104,203`); notificaciones con el genérico
  (`lectura.py:228`); suplidores, hoteles y catálogos de viaje con el orden de
  `?orden=` (`movil/views/catalogos.py:34-39,99-103,180-184,334-338`); CRM igual
  (`movil/views/crm.py:72-98`); sucursales (`orden, nombre, id`,
  `movil/views/configuracion.py:64-65`); reportes (`-created_at, -id`,
  `movil/views/reportes.py:31-32`); bitácora (`-timestamp, -id`,
  `movil/views/seguridad.py:156-157`); usuarios (`movil/views/usuarios.py:41,80`).
- **`?sort=` en reservas:** una clave de `ordenes_reserva` del catálogo de
  estados («las mismas que el web»), resuelta a campos con
  `reservas.orden_listado` y pasada al cursor, que manda sobre el `order_by` del
  queryset (`movil/views/lectura.py:69-75,104-106`; `movil/pagination.py:25-34`).
  También se aceptan los filtros del listado web que traen los `destino`
  (`next_payment_overdue`, `sin_pago`, `checkin_scope`, `created_from`…)
  (`lectura.py:76-86`). **comprobado**

## 5. Manejo de errores

- **Forma única** `{message, code, field_errors, details}`
  (`crm/api/responses.py:9-24`), aplicada por el `EXCEPTION_HANDLER` global
  (`settings.py:718`) y por `MovilAPIView.handle_exception`
  (`movil/views/base.py:80-88`). Éxitos de acción: `{message, code,
  field_errors: {}}` (`crm/api/responses.py:27-35`). **comprobado**
- Errores propios de la API móvil:

  | Código | HTTP | Origen |
  | --- | --- | --- |
  | `CREDENCIALES_INVALIDAS` | 401 | `movil/services/errores.py:53-56` |
  | `LOGIN_BLOQUEADO` | 429 | `movil/services/errores.py:45-50` |
  | `DISPOSITIVO_REVOCADO` | 403 en el login; 401 si lo detecta la validación del token | `movil/services/errores.py:59-65,107-121` |
  | `TOKEN_NO_VALIDO` | 401 | `movil/services/errores.py:107-121` |
  | `NOT_FOUND` (dispositivo) | 404 | `movil/services/errores.py:68-72` |
  | `APP_DESACTUALIZADA` | 426 | `movil/services/version.py:20-25` |
  | `LOCATION_REQUIRED` | 403, con forma `{success, code, message, gate_url}` | `security/middleware.py:187-197` |
  | `GOOGLE_NO_CONFIGURADO`, `GOOGLE_NO_DISPONIBLE` | según la vista | `movil/services/hoteles.py:202,208` |

- **En la app** (`mobile/src/api/errores.ts`): `parsearError` normaliza también la
  forma del gate de ubicación (`:78-99`); sin `code`, lo deduce del estado HTTP
  (`:68-75`); un fallo de red es `status 0` con `SIN_CONEXION` (`:101-110`).
  Acción fija por código (`accionPara`, `:113-128`): `TOKEN_NO_VALIDO` → refrescar
  una vez y reintentar; `DISPOSITIVO_REVOCADO` → borrar tokens y volver al login
  con explicación; `LOCATION_REQUIRED` → `/ubicacion`; `APP_DESACTUALIZADA` →
  `/actualizar`; `AUTHENTICATION_REQUIRED` con 401 → cerrar sesión; el resto se
  muestra. El refresh es **único en vuelo** para todas las peticiones que fallan
  a la vez (`mobile/src/api/cliente.ts:192-201,231-260`). Los errores por campo
  van bajo cada input (`ApiError.campo`, `errores.ts:56-59`). Una página HTML
  (502 de un proxy) o un volcado técnico no se enseñan como mensaje
  (`mobile/src/api/cliente.ts:113-127`). **comprobado**

## 6. Contrato OpenAPI tipado de punta a punta

### 6.1 Generación del esquema (backend)

- Herramienta: **drf-spectacular** (`DEFAULT_SCHEMA_CLASS`, `settings.py:719`;
  app instalada, `:93`). **comprobado**
- `SPECTACULAR_SETTINGS` (`settings.py:758-777`): título «OMSTA API móvil»,
  versión 1.0.0, `SCHEMA_PATH_PREFIX` de la API móvil, `COMPONENT_SPLIT_REQUEST`,
  `ENUM_NAME_OVERRIDES` para cuatro enums y el *preprocessing hook*
  `movil.openapi.solo_api_movil`, que deja solo las rutas bajo `/api/movil/`
  (`movil/openapi.py:26-33`). La extensión `MovilJWTScheme` declara el esquema
  `BearerAuth` (http bearer, JWT) (`movil/openapi.py:16-23`). **comprobado**
- Cada vista declara `@extend_schema` con `operation_id`, serializers de entrada
  y salida, parámetros y `tags` (por ejemplo `movil/views/auth.py:35-41`).
  **comprobado**
- Comando: `python manage.py spectacular --validate --file mobile/api/schema.yaml`
  (`movil/tests/test_schema.py:5-7`; `docs/operaciones/app-movil.md` §7;
  `mobile/README.md`). Resultado commiteado: `mobile/api/schema.yaml` (OpenAPI
  3.0.3, 13 425 líneas). **comprobado**

### 6.2 Generación de los tipos (app)

- Herramienta: **openapi-typescript** (`mobile/package.json:49`).
- Script: `"types": "openapi-typescript api/schema.yaml -o src/api/types.ts"`
  (`mobile/package.json:59`).
- Archivo generado: `mobile/src/api/types.ts` (8 630 líneas, con la cabecera «This
  file was auto-generated by openapi-typescript»). `mobile/src/api/tipos.ts`
  define alias legibles sobre `components["schemas"]` (`:6`) y `endpoints.ts` los
  usa en cada función. **comprobado**

### 6.3 Las pruebas que obligan a regenerar

- **Backend:** `movil/tests/test_schema.py:40-57`,
  `test_el_esquema_commiteado_esta_al_dia`. Carga `mobile/api/schema.yaml`, genera
  el esquema actual con `movil.openapi.generar_esquema()` y compara:
  1. las **claves de `paths`** (`:48-52`; mensaje «Cambiaron las rutas de la API
     móvil: regenera mobile/api/schema.yaml»), y
  2. las **claves de `components.schemas`** (`:53-57`; «Cambiaron los tipos de la
     API móvil…»).

  Las otras dos pruebas del archivo comprueban que el esquema solo contiene rutas
  móviles (`:24-30`) y que el listado de reservas responde con `PaginaReservas`
  (`:32-38`). **comprobado**
- **Límite de esa prueba** (comprobado por lectura): compara nombres de rutas y
  de componentes, no su contenido. Un campo nuevo dentro de un serializer
  existente, o un método nuevo en una ruta existente, no la hacen fallar.
- **App / CI:** `.github/workflows/mobile.yml:31-34`, paso «Types match schema»:
  `npm run types` y `git diff --exit-code -- src/api/types.ts`; si los tipos no
  coinciden con el YAML commiteado, el job falla. Después corren
  `npx expo-doctor`, `typecheck`, `lint` y `jest` (`:36-48`). Se dispara con
  cambios en `mobile/**` (`:3-8`). **comprobado**
- Cadena completa: vista Django → `spectacular` → `schema.yaml` (prueba de
  backend) → `npm run types` → `types.ts` (CI) → `tipos.ts` y `endpoints.ts` →
  `tsc --noEmit`. **comprobado**
