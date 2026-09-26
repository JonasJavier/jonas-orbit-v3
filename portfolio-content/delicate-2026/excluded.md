# Excluido

Regla aplicada: si falla, se ve mal, parece sin terminar, tiene cifras que no cuadran o se ve vacía, queda fuera. No se arregló nada; sólo se documenta. Todas las imágenes siguen en `screenshots/raw/`.

## Capturas excluidas (14)

| Captura raw | Pantalla | Motivo concreto |
| --- | --- | --- |
| `01-home-desktop.png` | Portada a 1440 px sin desplazar | **Solape:** con la cabecera transparente, una hoja oscura de la foto queda detrás de «Hablemos» y «Ha» apenas se lee. Ocurre también en producción. La portada entra como `principales/01-home-desktop.png`, desplazada 40 px (cabecera con fondo). |
| `03-home-full-desktop.png` | Página completa en escritorio | Empieza con el mismo solape de «Hablemos». |
| `19-whatsapp-handoff-desktop.png` | Paso a WhatsApp (escritorio) | **Carácter roto:** WhatsApp muestra «Hola Delicaté �». La redirección `wa.me` → `api.whatsapp.com` convierte el emoji 👋 en `%EF%BF%BD`. Además, WhatsApp recorta el texto largo dentro de su burbuja. |
| `48-whatsapp-handoff-mobile.png` | Paso a WhatsApp (móvil) | Mismo «�» en la página de WhatsApp. |
| `24-admin-login-desktop.png` | Login del admin | Pantalla genérica de Django, casi vacía; no aporta. |
| `53-admin-login-mobile.png` | Login del admin (móvil) | Ídem. |
| `25-admin-index-desktop.png` | Portada del admin | Casi vacía («Ninguno disponible») y con encabezados de aplicación en inglés (ACCOUNTS, CONTACT, SHOP) en una interfaz en español. |
| `54-admin-index-mobile.png` | Portada del admin (móvil) | Ídem. |
| `55-admin-products-mobile.png` | Lista de productos del admin (móvil) | **Desborde:** la tabla se corta a la derecha; existencias, destacado y activo quedan fuera de la pantalla. |
| `29-admin-messages-desktop.png` | Mensajes de contacto (admin) | **Honestidad:** la tienda nunca crea estos registros (su formulario abre WhatsApp). Mostrarlo sugeriría una función que el sitio público no tiene. Datos demo. |
| `30-admin-newsletter-desktop.png` | Suscripciones al boletín (admin) | Ídem: no existe formulario de boletín en la tienda. Datos demo. |
| `36-quote-mobile.png` | Cita de marca (móvil) | **Solape:** el botón flotante de WhatsApp tapa el final del texto de la sección siguiente («escríbenos. No…»). |
| `40-catalog-mobile.png` | Encabezado del catálogo (móvil) | **Solape:** el botón flotante tapa el extremo derecho de «Agregar» en la primera tarjeta. El catálogo móvil queda cubierto por `07-catalog-filter-mobile` y `14-catalog-soldout-mobile`. |
| `56-not-found-desktop.png` | Ruta inexistente (producción) | **Sin terminar:** «Not Found» de Django, sin estilo y en inglés. |

## Pantallas pedidas que no existen

| Pedido | Realidad | Evidencia |
| --- | --- | --- |
| Búsqueda en el catálogo | No hay campo de búsqueda en la tienda; sólo la API acepta `?search=`. | `frontend/src/components/ProductGrid.jsx`, `backend/shop/views.py` |
| Variantes de producto | No existen: un precio, un peso y una foto por producto. | `backend/shop/models.py` |
| Panel de pedidos | No existe: los pedidos no pasan por el servidor, se cierran en WhatsApp. | Ningún modelo de pedido desde la migración `shop/0006` |
| Página de producto propia (URL) | No existe en la tienda: la ficha es un diálogo; sólo la API tiene `/api/products/<slug>/`. | `ProductModal.jsx`, `shop/urls.py` |

## Detalles aceptados con nota (entran en principales)

- `42-admin-product-edit-desktop.png`: el selector de archivo dice «Choose File / No file chosen». Es el control nativo del Chromium sin interfaz usado para capturar, que ignora `--lang`; en un navegador en español sale en español. La barra lateral también muestra CONTACT y SHOP en inglés.
- `40`/`41-admin-products*`: los mismos encabezados de aplicación en inglés en la barra lateral y en la miga de pan («Shop»).
- `06-catalog-filter-desktop.png`: «Jardín Botánico» aparece con la foto de un jabón de panal y abeja (ver Preguntas en README).
- Estados de carga, error y categoría vacía (`22`–`27`): la condición de red se **simuló** con `page.route` sobre el build real; el código que pintan es el de producción.
- `20`/`21-cart-updated-*`: el carrito desactualizado se simuló escribiendo `localStorage` antes de recargar.

## Otros hallazgos (no son capturas)

- Esta PC tiene variables globales `DJANGO_*` de otro proyecto (p. ej. `DJANGO_ALLOWED_HOSTS`, `DJANGO_MEDIA_ROOT`) que Delicaté lee al arrancar en local. Los scripts las descartan antes de iniciar.
