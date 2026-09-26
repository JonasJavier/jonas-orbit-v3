<!-- portfolio-content/omsta-2026/mobile/overview.md · fecha 2026-09-25 · commit 3f5cea73 -->

# Omsta Móvil: visión general y estado real

Investigación de solo lectura sobre `mobile/` (app) y `movil/` (API Django) en el
commit `3f5cea73`. Cada afirmación lleva evidencia y una etiqueta:
**comprobado** (visto en código, configuración o salida de git), **inferencia**
(deducción razonable a partir de lo comprobado) o **pendiente** (no se puede
verificar desde el repositorio).

---

## 1. Qué es

| Afirmación | Evidencia | Etiqueta |
| --- | --- | --- |
| Es una app React Native + Expo (SDK 57), TypeScript y Expo Router con rutas tipadas. | `mobile/package.json:13,28,34` (`expo ~57.0.24`, `expo-router ~57.0.22`, `react-native 0.86.3`); `mobile/app.json:67-69` (`typedRoutes`); `mobile/AGENTS.md` («Expo SDK 57, React Native 0.86 y React 19») | comprobado |
| Consume solo la API `/api/movil/v1/`, montada en el backend Django del mismo repositorio. | `CristecnoViajes_SRL/urls.py:93`; `mobile/src/config.ts:11` (`API_PREFIJO`) | comprobado |
| Es un cliente fino: el backend manda importes ya formateados (`{amount, currency, display}`), estados con etiqueta y tono, y hasta la forma de los formularios del alta de reservas. | `mobile/AGENTS.md` («La app no calcula reglas de negocio ni formatea dinero»); `movil/services/alta_reserva.py:121-137,1233-1237` (pasos y bloques los describe el servidor) | comprobado |
| Cubre: panel de inicio, reservas (listado, ficha, alta y edición por pasos, pagos, documentos, cambio de estado, anulación con liquidación, compensación de saldo), CRM (personas y empresas, notas, documentos, PDF, exportación), cuentas por cobrar, avisos, catálogos de reservas (suplidores, hoteles, aerolíneas, aeropuertos, navieras, barcos), perfil y dispositivos, y una Configuración administrativa (usuarios, permisos, sesiones, bitácora, empresa y DGII, comprobantes NCF, sucursales, monedas y tasas, retenciones de nómina, reportes de fallos). | 57 archivos de ruta en `mobile/app/` (ver `modules.md`); 94 rutas en `movil/urls.py` | comprobado |
| Nombre visible «Omsta», slug `omsta-movil`, versión 1.0.0, solo vertical, tema claro. | `mobile/app.json:3-9` | comprobado |

## 2. Quién la usa y cómo se filtra por rol

- **Roles efectivos, no el rol «a pelo».** El login y `auth/me/` devuelven
  `roles_efectivos` (rol-tier más los módulos otorgados por el superadministrador)
  y `modulos`; la app decide qué enseñar con `tieneRol(...)`.
  Evidencia: `movil/serializers/perfil.py:43-50`; `mobile/src/auth/sesion.tsx:379-385`;
  `security/constants.py:16-31` (`user_has_role` usa roles efectivos y deja pasar
  al superusuario). **comprobado**
- **La autorización real es del servidor.** Toda vista hereda `MovilAPIView`
  con `RolePermission` y declara `required_roles` o `security_self_service`.
  Evidencia: `movil/views/base.py:28-47`; `security/permissions.py:20-60`. **comprobado**
- Filtros visibles en la app (comprobado):
  - Pestaña **Cobros** solo con `admin`, `contabilidad` o `cobros`
    (`mobile/app/(tabs)/_layout.tsx:12,40,89`). La guía dice «solo admin y
    contabilidad» (`docs/operaciones/app-movil.md:177`), pero el código incluye
    también `cobros`: la guía está desfasada.
  - **Catálogos**: suplidores con `admin|reservas|contabilidad`; hoteles con
    `admin|reservas`; aerolíneas, aeropuertos, navieras y barcos para todos los
    que llegan (`mobile/app/catalogos/index.tsx:66-84`).
  - **Configuración**: el único acceso está en Mi cuenta y solo para `admin`
    (`mobile/app/perfil/index.tsx:385-388`); dentro, Usuarios/En línea/Actividad/
    Empresa/Sucursales solo `admin`, Permisos solo superadministrador,
    Retenciones `admin|contabilidad` (`mobile/app/configuracion/index.tsx:54-150`).
  - Muchas acciones dependen de banderas que calcula el servidor
    (`puede_editar`, `puede_registrar`, `puede_gestionar`, `puede_cambiar_estado`…),
    p. ej. `mobile/app/reservas/[id]/pagos/index.tsx:61`.
- Roles del backend por grupo de endpoints (comprobado, ver `api-contract.md`):
  reservas → `admin, clientes, contabilidad, reservas`
  (`reservas/services/reservations.py:42-46`); pagos → `admin, contabilidad,
  reservas, cobros` (`contabilidad/services/payment_permissions.py:18`); CxC →
  `admin, contabilidad, cobros` (`security/access_policy.py:37`); CRM →
  `admin, clientes` (`movil/views/crm.py:40`).
- **Observación (inferencia):** la pestaña Clientes se muestra a todos, pero el
  backend exige `admin|clientes`; un usuario sin ese rol efectivo verá un error
  de permiso en esa pestaña. Evidencia: `mobile/app/(tabs)/_layout.tsx:78-84` (sin
  condición) frente a `movil/views/crm.py:40,84`.

## 3. Qué resuelve que la web no

| Aporte | Evidencia | Etiqueta |
| --- | --- | --- |
| La web es Django templates + HTMX/jQuery con sesión y CSRF; no había API apta para un cliente fuera del navegador. La app trajo una API con JWT por dispositivo. | `docs/architecture/plan-app-movil-2026-09.md:18-22`; `movil/authentication.py:64-92` | comprobado |
| Desbloqueo con huella o Face ID en lugar de escribir la contraseña. | `mobile/src/auth/biometria.ts:5-33`; `mobile/src/auth/sesion.tsx:246-248` | comprobado |
| Verificación de ubicación con GPS nativo, por dispositivo, con latido cada 10 min. | `mobile/src/ubicacion/gps.ts`; `mobile/src/auth/sesion.tsx:355-377`; `mobile/src/config.ts:20` | comprobado |
| Lectura sin conexión: caché cifrada de 24 h y franja «Sin conexión». | `mobile/src/cache/persistencia.ts`; `mobile/app/_layout.tsx:191-203`; `mobile/app/(tabs)/_layout.tsx:44` | comprobado |
| Enviar documentos al cliente por WhatsApp con el número ya normalizado por el backend, llamar o escribir desde la ficha. | `mobile/app/reservas/[id]/documentos.tsx:54-62`; `mobile/src/navegacion/abrir.ts:45-78` | comprobado |
| Revocar un teléfono perdido desde otro dispositivo o desde administración, con efecto inmediato. | `movil/services/dispositivos.py:301-347`; `mobile/app/perfil/dispositivos.tsx`; `mobile/app/configuracion/usuarios/[id]/sesiones.tsx` | comprobado |
| Asistente de alta de reservas por pasos pensado para pantalla pequeña, con borradores locales y calendario propio. | `mobile/src/reservas/Asistente.tsx:1-13`; `mobile/src/reservas/borradores.ts`; `mobile/src/ui/calendario.tsx` | comprobado |

## 4. Estado real

- Historia en git (comprobado):
  - `git log --oneline -- mobile/ | wc -l` → **52 commits**; primero
    `bac191cd 2026-09-11 movil: API de lectura con contrato OpenAPI (fase 1A)`
    (añade `mobile/api/schema.yaml`), app Expo creada en
    `659086c3 2026-09-11`; último `3f5cea73 2026-09-25`.
  - `git log --oneline -- movil/ | wc -l` → **37 commits**; primero
    `273780c4 2026-09-10 movil: cimentar la API móvil con JWT por dispositivo (fase 0)`;
    último `3f5cea73 2026-09-25`.
  - `git log --oneline -- mobile/ | grep -i -E "ios|iphone|testflight|eas|apple|build|android|play"`
    devuelve 8 líneas, pero 5 son falsos positivos («serv**ios**», «prec**ios**»). Con
    `grep -w` quedan 3, ninguna sobre iOS ni tiendas: `ed905f1f` (guía y reglas
    de build), `ba08e304` (registrar el proyecto EAS en el plan), `c99170d0`
    (vincular el proyecto EAS). En todo el repositorio (`git log --all`) ningún
    mensaje menciona iOS, iPhone, TestFlight, Apple, Xcode, App Store ni Play Store.
- Tamaño: 57 archivos de ruta (15 055 líneas) y 57 módulos en `mobile/src/` (22 323
  líneas, 8 630 de ellas de `types.ts` generado). Pruebas: 47 casos Jest en
  `mobile/src/**/__tests__` y 330 funciones `test_` en `movil/tests/`
  (conteo con `grep`, no ejecutadas en esta investigación). **comprobado**
- Madurez funcional: el plan documenta fases 0, 1A, 1B, 2 (parcial), 4A-4D y 5 de
  reservas cerradas con recorridos reales en un **Motorola Edge 2024 por adb**
  contra el servidor QA local (`docs/architecture/plan-app-movil-2026-09.md:434-436,888,1048`).
  **comprobado** (lo dice la documentación; no se repitió la prueba).
- **Push no está terminado.** `expo-notifications` está instalado pero ninguna
  pantalla lo importa; `registrarPush` existe en el cliente pero nadie lo llama;
  el backend solo guarda el token y `movil/tasks.py:1-6` dice que el envío «se
  añade en la Fase 2». **comprobado** (ver `native-capabilities.md`).
- Contrato: esquema OpenAPI commiteado (`mobile/api/schema.yaml`, 93 rutas, 122
  operaciones) y tipos TS generados con prueba de sincronía en backend y CI.
  **comprobado** (ver `api-contract.md`).

## 5. Builds, iOS y tiendas: sí / no / no se sabe

| Pregunta | Respuesta | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| ¿Build Android por EAS? | **Sí** (perfil `development`, APK con cliente de desarrollo). | Plan: la segunda build «produjo el APK de desarrollo» (`plan-app-movil-2026-09.md:424`); nueva build de desarrollo el 15-09-2026 verificada en el teléfono (`:635-650`); guía: «Instalar la build de desarrollo del 15-09-2026» (`docs/operaciones/app-movil.md:297`); perfil en `mobile/eas.json:7-14` (`developmentClient`, `distribution: internal`, `buildType: apk`). | comprobado (por documentación; el historial de EAS vive en la nube y no se consultó) |
| ¿Build Android `preview` o `production`? | **No se sabe.** Los perfiles existen, pero ningún documento ni commit registra haberlos construido. | `mobile/eas.json:15-27`; `docs/operaciones/app-movil.md:91-97` (descripción, no registro) | pendiente |
| ¿Build iOS por EAS? | **No** según el repositorio. | «Para iOS, cuando exista la cuenta de Apple: `--platform ios`» (`docs/operaciones/app-movil.md:88-89`); pendiente «Apple Developer Program (Organización, requiere D-U-N-S) para iOS» (`:24-25`); «iOS cuando exista la cuenta de Organización de Apple» (`plan-app-movil-2026-09.md:428`); ningún commit lo menciona. | comprobado para el repo; pendiente confirmar en el panel de EAS |
| ¿TestFlight? | **No.** | Solo aparece como plan de la fase 3 (`plan-app-movil-2026-09.md:42,287`; `docs/operaciones/app-movil.md:95-97`); la fase 3 está «bloqueada» sin cuentas (`plan:338`). | comprobado |
| ¿Probada en un iPhone real? | **No se sabe; no hay ninguna evidencia.** Todas las pruebas documentadas son en Android (Motorola Edge 2024). | `plan-app-movil-2026-09.md:434-436` y siguientes; `docs/operaciones/app-movil.md:225` | inferencia: muy improbable, porque un development build para iPhone exige la cuenta de Apple que sigue pendiente |
| ¿En simulador iOS? | **No se sabe; no hay evidencia.** `eas.json` no tiene perfil de simulador (`ios.simulator`) y el entorno documentado es Windows. | `mobile/eas.json:6-28`; `CLAUDE.md` (entorno Windows) | inferencia |
| ¿Publicada en App Store? | **No.** | La pantalla «Actualiza la app» apunta a un id de App Store de relleno (id formado solo por ceros, `mobile/app/actualizar.tsx:13`); sin cuenta de Apple (`docs/operaciones/app-movil.md:24-25`). | comprobado |
| ¿Publicada en Play Store? | **No.** | «Google Play Console para publicar en Play» figura como pendiente (`docs/operaciones/app-movil.md:24-25`); publicación prevista para la fase 3 (`:95-97`). El enlace de Play en `actualizar.tsx:14` solo se construye con el paquete; no prueba que exista la ficha. | comprobado para el repo |

Otros datos de configuración (comprobado):

- `mobile/eas.json`: `appVersionSource: remote` (`:4`); `development` y
  `preview` con `distribution: internal` y `buildType: apk` (`:7-21`);
  `production` con `autoIncrement: true` y sin `distribution` (tienda por defecto)
  (`:22-27`); `submit.production` vacío (`:29-31`). Cada perfil fija
  `EXPO_PUBLIC_API_URL` en su bloque `env`.
- iOS en `mobile/app.json:10-20`: `supportsTablet: false`, `bundleIdentifier`
  `app.omsta.movil`, `infoPlist` con `NSLocationWhenInUseUsageDescription`,
  `NSFaceIDUsageDescription`, `NSCameraUsageDescription`,
  `NSPhotoLibraryUsageDescription` e `ITSAppUsesNonExemptEncryption: false`.
  Plugin `expo-local-authentication` con `faceIDPermission` (`:47-52`).
- Android en `mobile/app.json:21-36`: paquete `app.omsta.movil`, icono
  adaptativo, permisos de ubicación y biometría; sin ubicación en segundo plano
  (`:44`).
- **No hay carpetas nativas** `mobile/ios` ni `mobile/android`: el proyecto es
  Expo gestionado y `mobile/.gitignore` las ignora como «generated native folders»
  (`/ios`, `/android`). `git ls-files mobile` no lista ningún archivo nativo.
- `npm run ios` existe (`mobile/package.json:55`), pero es el script por defecto
  de Expo (`expo start --ios`); no prueba que se haya usado.

## 6. Qué se puede afirmar sobre iPhone/iOS

Frases literales, cada una verificada:

1. «Omsta Móvil está construida con React Native y Expo, un stack que genera la
   app de iOS y la de Android desde el mismo código.»
   (`mobile/package.json:13,34`; `mobile/app.json:10-36`)
2. «El proyecto ya incluye la configuración de iOS: identificador de bundle,
   formato solo iPhone y los textos de permiso para ubicación, Face ID, cámara y
   fotos.» (`mobile/app.json:10-20`)
3. «El desbloqueo biométrico está programado para Face ID y huella con la misma
   pantalla.» (`mobile/src/auth/biometria.ts:5-33`; `mobile/app/bloqueo.tsx:41,48`
   en la numeración del archivo: «Usa tu huella o Face ID para continuar»)
4. «La app identifica la plataforma del dispositivo (iOS o Android) al registrarlo
   en el servidor.» (`mobile/src/auth/sesion.tsx:292`)
5. «La versión para iPhone está pendiente de la cuenta de Apple Developer de la
   empresa.» (`docs/operaciones/app-movil.md:24-25,88-89`)
6. «La app se ha probado de punta a punta en un teléfono Android real.»
   (`docs/architecture/plan-app-movil-2026-09.md:434-436`)

## 7. Qué NO se puede afirmar

- Que esté disponible en App Store, en Play Store o en TestFlight.
- Que exista una build de iOS (ni de desarrollo, ni de simulador, ni de tienda).
- Que se haya probado en un iPhone o en el simulador de iOS.
- Que Face ID funcione «probado»: está configurado y programado, no verificado en
  un dispositivo Apple.
- Que tenga notificaciones push: la dependencia está instalada, pero no hay
  registro del token desde la app ni envío desde el backend.
- Que la cámara sirva para fotografiar comprobantes de pago: el texto de permiso
  de iOS lo dice (`mobile/app.json:16`), pero en el código la cámara solo se usa
  para la foto de perfil, el logo de empresa y la captura de un reporte; los
  comprobantes se adjuntan con el selector de documentos del sistema
  (`mobile/src/ui/foto.ts:75-98` frente a `mobile/src/reservas/Adjuntos.tsx:42-52`).
- Que esté «en producción» para usuarios finales: no hay build `preview` ni
  `production` documentada.
- Que funcione sin conexión para escribir: la caché es solo de lectura por diseño
  (`mobile/AGENTS.md`: «Nada de escritura sin conexión»).
