# Notas del caso (factuales)

Notas en viñetas para que Jonás escriba la prosa. Etiquetas: **C** comprobado · **I** inferencia · **P** pendiente. Commit `9f134109`.

## Contexto

- Marca de jabones artesanales de República Dominicana; la venta se coordina por WhatsApp. (C: copy del sitio, `README.md`)
- El README del repo lo describe como «Proyecto de portafolio personal». (C) Si hay un negocio real detrás: (P, Pregunta 1)
- Dos generaciones en Git: tienda convencional en 2024 (15 commits, ago–dic) y reconstrucción en 2026 (11 commits, ago–sep). (C: `git log`)
- Versión 2024: registro, login de Google, carrito en servidor, reseñas, historial de pedidos, blog y gestión de productos desde React. (C: árbol de `44f824fb`)

## Problema

- La versión 2024 prometía cuentas, carrito en servidor y pedidos, una operación que el canal de venta real (WhatsApp) no necesita. (I: comparación de las dos versiones y README «Decisiones de experiencia»)
- El README del repo lo justifica: el registro «añade fricción sin aportar valor» y el sitio «no realiza cobros». (C)

## Usuarios

- Comprador sin cuenta: explora, filtra, abre fichas, arma el carrito y envía el pedido por WhatsApp. (C)
- Equipo del negocio: administra productos, precios, existencias, fotos, destacados y visibilidad en Django Admin. (C: `shop/admin.py`)
- No se guardan perfiles, direcciones ni datos de facturación de compradores. (C) Matiz: los endpoints públicos de contacto y boletín sí guardan nombre, correo y teléfono si se usan, aunque la tienda no los llama. (C)

## Restricciones

- Sin pagos en línea, sin logística y sin existencias en tiempo real garantizadas: el total es «estimado». (C: `CartDrawer.jsx`)
- Catálogo editable sin recompilar el frontend: se lee de la API en cada visita. (C: `api.js`)
- Uso principal en teléfono (I: diseño móvil detallado en `styles.css`, captura del flujo completo en 390 px).
- Número de WhatsApp y URL pública se incrustan al construir (`VITE_*`). (C: `Dockerfile`, `config.js`)

## Proceso

- 01-08-2026 · `fbf22e62` «remodelacion del sistema»: nueva tienda de marca con pedido por WhatsApp. (C)
- 02-08-2026 · `226fe32e` validación, preparación para producción y UI; `65a15e7b` catálogo ampliado a 10 productos. (C)
- 25-09-2026 · `41d3654b` licencia propietaria. (C)
- 25-09-2026 · 7 commits con `Co-Authored-By: Claude`: dejar de versionar `.env`, endurecer Django, carrito sincronizado, Docker/Railway, tipo MIME del manifest, fotos en volumen, dominio propio. (C)
- Migraciones explícitas eliminan `Cart`, `CartItem`, `Review` y `UserProfile`, y una migración de datos da slug único a cada producto. (C: `shop/0006`, `shop/0007`, `accounts/0005`)

## Decisiones técnicas

- Sin cuentas de cliente; `CustomUser` (login por correo) sólo para el equipo. (C: `accounts/models.py`)
- API pública de sólo lectura para el catálogo; la escritura va por el admin. (C: `shop/views.py` usa `ListAPIView`/`RetrieveAPIView`)
- El frontend lee todas las páginas de la API (`page_size` hasta 100). (C: `api.js`, `shop/pagination.py`)
- Carrito en `localStorage` con `useReducer`; al cargar el catálogo se sincroniza (precio, stock, productos retirados) y avisa. (C: `useCart.js`)
- Pedido y contacto salen como texto prearmado en `wa.me`; no hay integración con la API de WhatsApp. (C)
- Catálogo demo de respaldo sólo en desarrollo o por bandera; en producción, error con reintento. (C: `config.js`)
- Producción en un solo contenedor: Django sirve API, admin y el build de React (WhiteNoise); mismo origen, sin CORS. (C: `Dockerfile`, `settings.py`)
- Fotos subidas en un volumen persistente; `MEDIA_ROOT` se deriva del volumen de Railway y se rechaza si es relativo. (C: `settings.py`, commit `6425386d`)
- Migraciones como *pre-deploy* y publicación sólo si `/api/health/` (que consulta la base) responde 200. (C: `railway.json`, `docs/DEPLOY_RAILWAY.md`)
- Seguridad: CSP, Permissions-Policy, X-Frame-Options, HSTS de 1 año, cookies seguras, límites de frecuencia con la IP real tras el proxy. (C: `settings.py`, `middleware.py`)

## Desafíos

- Una experiencia de compra creíble sin fingir pagos ni logística. (I)
- Mantener coherentes catálogo, filtros, ficha y un carrito que sobrevive entre visitas cuando cambian precios o existencias. (C: motivo del commit `1cbc0c3d`)
- En el despliegue: Railway no aplicó `railway.json` al servicio creado por CLI y la primera versión salió sin migraciones; se fijó la configuración en el servicio. (C: `docs/DEPLOY_RAILWAY.md`)
- Git Bash convirtió `/data/media` en una ruta de Windows y las fotos se perdieron en un redeploy; se corrigió y se añadió una validación. (C: commit `6425386d`)
- Al añadir el dominio propio, Railway dejó de exponer la URL `*.up.railway.app`; se autorizaron ambos hosts explícitamente. (C: commit `9f134109`)

## Aprendizajes

- A redactar por Jonás. Hechos disponibles: la versión 2026 tiene 4 modelos frente a 8 en 2024, y 2 dependencias de ejecución en el frontend frente a 30. (C: `models.py` y `frontend/package.json` de `44f824fb` y actuales)

## Estado

- En producción en <https://delicate.jonasjavier.dev> (200 el 25-09-2026). (C)
- Salida comercial: la lista `docs/GO_LIVE.md` (políticas, prueba en teléfonos, respaldos, monitoreo) no consta como completada. (P)
- Defectos abiertos detectados hoy: «Hablemos» ilegible sobre la foto a 1440 px, emoji «�» en WhatsApp, 404 sin estilo, tabla del admin cortada en móvil, encabezados del admin en inglés. (C: [excluded.md](excluded.md))
- Siguiente línea especificada, no implementada: configurador de jabón personalizado «Atelier Delicaté». (C: `docs/ATELIER_JABON_PERSONALIZADO.md`)
