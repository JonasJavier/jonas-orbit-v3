<!-- portfolio-content/omsta-2026/mobile/native-capabilities.md · fecha 2026-09-25 · commit 3f5cea73 -->

# Omsta Móvil: capacidades nativas reales

Solo lo que existe en el código del commit `3f5cea73`, con el archivo que lo
prueba. Método (comprobado): búsqueda de todos los `import` de módulos `expo-*`,
`react-native-mmkv` y `@react-native-community/*` en `mobile/app` y `mobile/src`,
cruzada con `mobile/package.json` y `mobile/app.json`. Ninguna de estas
capacidades se probó en esta investigación: lo que se dice de pruebas en
teléfono sale de la documentación del repositorio.

## 1. Biometría (huella / Face ID) — existe

- **Qué hace.** Si hay tokens guardados y el teléfono tiene hardware biométrico
  con al menos una huella o rostro registrado, la app arranca en `bloqueado` y
  la pantalla `/bloqueo` lanza un intento automático.
  `mobile/src/auth/biometria.ts:5-15` (`hasHardwareAsync`, `isEnrolledAsync`),
  `:18-33` (`authenticateAsync` con `disableDeviceFallback: true`: sin PIN del
  sistema como alternativa); `mobile/src/auth/sesion.tsx:246-248`;
  `mobile/app/bloqueo.tsx:24-33`. **comprobado**
- **Cuándo se activa.** Solo al montar el proveedor de sesión, es decir, en un
  arranque en frío (o si un cambio remonta la raíz en desarrollo). No hay bloqueo
  al volver del segundo plano ni por inactividad: el único `AppState` de la
  sesión reintenta el perfil sin conexión y el latido de GPS
  (`mobile/src/auth/sesion.tsx:227-257,345-377`). **comprobado**
- **Cómo evitarlo para capturar.** No existe un interruptor en la app para
  desactivarlo (búsqueda de «biometr|huella|face id» en `app/` y `src/`: solo
  aparece en `bloqueo.tsx`). Opciones: usar un teléfono o emulador sin huella ni
  rostro registrados (entonces `biometriaDisponible()` es `false` y se entra
  directo, `sesion.tsx:246-250`); desbloquear a mano una vez y no cerrar la app
  entre tomas; o, para fotografiar la pantalla de bloqueo, cancelar el aviso del
  sistema (queda «Desbloquea Omsta»). «Entrar con contraseña» borra tokens y
  caché (`sesion.tsx:315-319`). **comprobado** (opciones derivadas del código)
- Configuración nativa: plugin `expo-local-authentication` con texto de Face ID
  (`mobile/app.json:47-52`), `NSFaceIDUsageDescription` (`:15`), permisos Android
  `USE_BIOMETRIC` y `USE_FINGERPRINT` (`:32-33`). **comprobado**
- Reautenticación obligatoria: pasado `reautenticar_dias` (por defecto 30; lo fija
  el servidor con `MOVIL_REAUTH_DAYS`) se exige la contraseña aunque haya
  biometría (`sesion.tsx:94-98,164-176`; `CristecnoViajes_SRL/settings.py:730`).
  **comprobado**

## 2. SecureStore — existe

- Tokens `access` y `refresh`, uuid del dispositivo, fecha del último login y
  clave de cifrado de la caché, con `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`
  (`mobile/src/auth/almacen.ts:12-18,28-32`). El uuid sobrevive al cierre de
  sesión (`:56-63,87-91`). Plugin en `mobile/app.json:39`. **comprobado**

## 3. MMKV y uso sin conexión — existe (solo lectura)

- **Caché persistida cifrada.** TanStack Query se persiste en MMKV con
  `encryptionKey` de 16 caracteres guardada en SecureStore
  (`mobile/src/cache/persistencia.ts:18-38`; `mobile/src/auth/almacen.ts:77-85`).
  `maxAge` 24 h y `buster: CACHE_CONTRATO` (`mobile/app/_layout.tsx:191-202`;
  `mobile/src/config.ts:23,36`, valor actual `"9"`). Consultas en modo
  `offlineFirst` (`mobile/app/_layout.tsx:31-38`). **comprobado**
- **`CACHE_CONTRATO`.** Versión de la forma de las respuestas guardadas: subirla
  descarta la caché vieja para que una pantalla nueva no lea una respuesta sin el
  campo nuevo (`mobile/src/config.ts:25-36`). **comprobado**
- **Arranque sin red.** Si `auth/me/` falla por red, se entra con el último perfil
  guardado (sin tokens) y se marca `sinConexion`; al volver al primer plano se
  reintenta (`mobile/src/auth/sesion.tsx:210-219,345-353`). Franja global «Sin
  conexión con el servidor. Se muestran los datos guardados.»
  (`mobile/app/(tabs)/_layout.tsx:44`). **comprobado**
- **Purga.** Al cerrar sesión, al pulsar «Entrar con contraseña» y ante
  `DISPOSITIVO_REVOCADO` (`sesion.tsx:156-162,262-271`;
  `persistencia.ts:41-43`). **comprobado**
- **Sin escritura sin conexión**, por decisión (`mobile/AGENTS.md`: «Nada de
  escritura sin conexión»; plan: pagos sin conexión → v1.2,
  `docs/architecture/plan-app-movil-2026-09.md:44`). **comprobado**
- Excepción declarada: consultas con `meta.persistir: false` (p. ej. sugerencias
  de Google) no se guardan (`mobile/app/_layout.tsx:197-201`). **comprobado**

## 4. Geolocalización en el login — existe

- Al tocar «Entrar», la app **siempre** pide el permiso de ubicación «mientras se
  usa» y lee una posición (tope 15 s, respaldo con la última posición de ≤ 5
  min); si no hay permiso o señal, entra igualmente con `ubicacion: null`
  (`mobile/src/auth/sesion.tsx:283-305`; `mobile/src/ubicacion/gps.ts:11-13,38-71`).
  La pantalla lo avisa: «Al entrar, la app pedirá tu ubicación»
  (`mobile/app/login.tsx:88-89`). **comprobado**
- El backend sella el dispositivo con esas coordenadas en el mismo login
  (`movil/services/autenticacion.py:141-152`). **comprobado**
- **Gate de ubicación.** La pantalla `/ubicacion` aparece solo si el servidor dice
  `ubicacion_requerida` (gate activo y usuario no exento) y el dispositivo no está
  verificado, o si una petición recibe `403 LOCATION_REQUIRED`
  (`mobile/src/auth/sesion.tsx:100-102,272-274`; `movil/serializers/perfil.py:50`;
  `security/middleware.py:187-197`). Exentos: superusuario, `superadmin` y `admin`
  (`usuarios/services/location_gate.py:45-49`). El gate vale `not DEBUG` por
  defecto, así que en desarrollo está apagado salvo `LOCATION_GATE_ENABLED=True`
  (`CristecnoViajes_SRL/settings.py:666`; `docs/operaciones/app-movil.md:130-132`).
  **comprobado**
- **Latido.** Con el gate activo, `POST ubicacion/verificar/` cada 10 min y al
  volver al primer plano (`sesion.tsx:355-377`; `mobile/src/config.ts:20`).
  **comprobado**
- Configuración: plugin `expo-location` sin segundo plano (`mobile/app.json:40-46`),
  `NSLocationWhenInUseUsageDescription` (`:14`), permisos Android de ubicación
  fina y aproximada (`:30-31`). **comprobado**

## 5. Cámara y galería (`expo-image-picker` + `expo-image-manipulator`) — existe, con alcance limitado

- `elegirFoto(origen, uso)` pide permiso en el momento, abre cámara o galería con
  recorte y reduce la imagen (640 px JPEG para avatar, 1 400 px PNG para logos)
  (`mobile/src/ui/foto.ts:52-98`). **comprobado**
- Usos reales: foto de perfil (`mobile/app/perfil/index.tsx:118,423-439`), logo e
  imágenes de la empresa (`mobile/app/configuracion/empresa.tsx:279`) y captura de
  un reporte de fallo (`mobile/app/configuracion/reportes/nuevo.tsx:63,204-208`).
  **comprobado**
- **Los comprobantes de pago no usan la cámara**: se adjuntan con el selector de
  documentos (sección 6). El texto de permiso de iOS dice lo contrario
  (`mobile/app.json:16-17`). **comprobado**

## 6. Selector de documentos (`expo-document-picker`) — existe

- `elegirArchivo()` acepta PDF, imágenes, Word, Excel y PowerPoint, copia a caché
  y devuelve uri, nombre y MIME (`mobile/src/reservas/Adjuntos.tsx:31-52`).
- Usos: comprobantes del registro de pago y del pago inicial del asistente
  (`mobile/src/reservas/FormularioPago.tsx:42,55,129-132`;
  `mobile/src/reservas/Asistente.tsx:1031`), adjuntos del expediente de reserva
  (`Adjuntos.tsx:55-72`) y documentos del CRM
  (`mobile/app/clientes/[tipo]/[id].tsx:301,358`). **comprobado**

## 7. Subida de archivos (`expo-file-system`) — existe

- Subida multipart nativa en streaming con `new File(uri).upload(...)`, inyectada
  en el cliente HTTP (`mobile/src/auth/sesion.tsx:104-128`). Motivo documentado: RN
  0.86 rechaza la parte `{uri, name, type}` en `FormData`
  (`docs/operaciones/app-movil.md:298`). **comprobado**
- Flujo de comprobante: `POST reservas/adjuntos/` devuelve un id temporal que
  viaja en `adjuntos` del `POST reservas/{id}/pagos/`, con `idempotency_key`
  generada con `expo-crypto` (`mobile/src/api/endpoints.ts:199-203`;
  `mobile/src/reservas/FormularioPago.tsx:48-56`; `movil/services/pagos.py:306-367`).
  **comprobado**

## 8. Enlaces profundos y destinos — existe

- Esquema `omsta` (`mobile/app.json:6`; `mobile/src/config.ts:17`). Expo Router
  resuelve `omsta://<ruta>` a la pantalla; la guía lo usa para abrir una reserva
  por adb (`docs/operaciones/app-movil.md:224`). **comprobado** (declaración y uso
  documentado; no probado aquí)
- **Destinos del servidor.** Alertas y avisos traen `destino {pantalla, params}`
  que la app traduce a rutas o abre en el navegador (`mobile/src/navegacion/destinos.ts:20-60`;
  `movil/deeplinks.py:51-78`). **comprobado**

## 9. Pantalla de actualización (chequeo de versión) — existe, sin `expo-updates`

- El backend compara la versión nativa enviada en el login (y guardada en el
  dispositivo para `auth/me/`) con `MOVIL_MIN_APP_VERSION` y responde
  `426 APP_DESACTUALIZADA` (`movil/views/auth.py:47,117`;
  `movil/services/version.py:20-60`; `CristecnoViajes_SRL/settings.py:734-736`).
  La app pasa a `/actualizar` (`mobile/src/api/cliente.ts:255-260`;
  `mobile/app/actualizar.tsx`). **comprobado**
- La versión sale de `expo-application` (`mobile/src/config.ts:13-15`).
- El botón «Ir a la tienda» usa un id de App Store de relleno
  (`mobile/app/actualizar.tsx:11-14`). **comprobado**

## 10. Navegador embebido, llamadas, WhatsApp y correo — existe

- `abrirEnlace` abre `http(s)` en el navegador embebido (`expo-web-browser`) y
  manda WhatsApp, `tel:` y `mailto:` al sistema con `expo-linking`
  (`mobile/src/navegacion/abrir.ts:45-78`). Se usa para ver PDF de proforma,
  voucher, recibos, ficha de cliente y exportaciones con enlace firmado
  (`mobile/app/reservas/[id]/documentos.tsx:54-62`; `movil/archivos.py:81-96,141`).
  **comprobado**

## 11. Otras piezas nativas presentes

- `expo-crypto`: uuid del dispositivo, clave de caché, clave de idempotencia y
  sesión del buscador de Google (`mobile/src/auth/almacen.ts`,
  `mobile/src/reservas/FormularioPago.tsx:11,48`, `mobile/src/hoteles/BuscadorGoogle.tsx`).
- `expo-constants` / `expo-application`: nombre del dispositivo y versión
  (`mobile/src/auth/sesion.tsx:293-295`; `mobile/src/config.ts:2-15`).
- `expo-splash-screen`, `expo-font` con Manrope e Inter, `expo-status-bar`
  (`mobile/app.json:54-63`; `mobile/app/_layout.tsx:4-8,171-178`).
- `react-native-gesture-handler`, `react-native-safe-area-context`
  (`mobile/app/_layout.tsx:10-11,189-190`).
- `expo-dev-client`: la app se prueba con development build, no con Expo Go
  (`mobile/app.json:53`; `mobile/README.md`). **comprobado**

## 12. No existe

| Capacidad | Evidencia de ausencia | Etiqueta |
| --- | --- | --- |
| **Notificaciones push** | `expo-notifications` y `expo-device` están en `mobile/package.json:18,27`, pero ningún archivo de `app/` o `src/` los importa; `registrarPush` (`mobile/src/api/endpoints.ts:142-146`) no tiene llamadas; `expo-notifications` no figura en `plugins` de `mobile/app.json`; en el backend solo existen el endpoint que guarda el token y el modelo `TicketPush` (`movil/views/dispositivos.py:114`, `movil/models.py:130`), y `movil/tasks.py:1-6` dice que el envío «se añade en la Fase 2». `MOVIL_PUSH_ENABLED` vale `False` por defecto (`CristecnoViajes_SRL/settings.py:729`). | comprobado |
| Bloqueo por inactividad o al pasar a segundo plano | Solo hay bloqueo en arranque en frío (sección 1). | comprobado |
| `expo-updates` (actualizaciones OTA) | No está en `mobile/package.json`; el chequeo de versión es del servidor. | comprobado |
| Háptica (`expo-haptics`) | No está en dependencias ni en imports. | comprobado |
| Compartir nativo (`expo-sharing`, `Share` de RN) o descarga de PDF al teléfono | Sin imports; los PDF se abren en el navegador embebido y se envían por enlace. | comprobado |
| Impresión (`expo-print`) | No está en dependencias. | comprobado |
| Mapas embebidos | No hay `react-native-maps` ni imágenes de mapa; el formulario de hotel solo abre un enlace externo con el punto. | comprobado |
| Cámara dedicada (`expo-camera`) o escaneo de documentos | No está en dependencias; el escaneo de pasaportes es v1.1 del plan (`plan-app-movil-2026-09.md:44,292`). | comprobado |
| Ubicación en segundo plano | `isAndroidBackgroundLocationEnabled: false` (`mobile/app.json:44`); solo permiso «mientras se usa». | comprobado |
| Selector de fecha nativo | `@react-native-community/datetimepicker` está en dependencias y plugins, pero ya no se importa: las fechas usan un calendario propio en JS (`mobile/src/ui/calendario.tsx`; `plan-app-movil-2026-09.md:1740-1751`). | comprobado |
| Portapapeles, contactos, calendario del sistema, NFC, Bluetooth | Sin dependencias ni imports. | comprobado |
