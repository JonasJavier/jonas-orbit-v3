# Funciones y pantallas

Commit `9f134109`. «Publicable» = hay al menos una captura en `screenshots/principales/` que pasa la regla. Etiquetas: **C** comprobado · **I** inferencia · **P** pendiente.

## Tienda pública (React)

| # | Función / pantalla | Qué hace | Evidencia | Publicable | Motivo si no |
| --- | --- | --- | --- | --- | --- |
| 1 | Portada (hero) | Titular editorial, subtítulo y dos llamadas: «Descubrir la colección» y «Conoce nuestra historia». | `App.jsx` · `01-home-desktop`, `02-home-mobile` (C) | Sí | La versión sin desplazar en escritorio queda fuera (ver excluded.md) |
| 2 | Cabecera fija con dos estados | Transparente arriba; al bajar 12 px toma fondo, borde y sombra. | `Header.jsx` (`scrollY > 12`) · `01-home-desktop` (C) | Sí | — |
| 3 | Enlace «Saltar al contenido» | Primer foco del teclado, lleva a `#contenido`. | `Header.jsx`, `styles.css .skip-link` (C) | No | Sólo visible con foco de teclado; no se capturó |
| 4 | Menú móvil | Panel desplegable; se cierra con Escape o al elegir un enlace; bloquea el scroll del fondo. | `Header.jsx` · `03-menu-mobile` (C) | Sí | — |
| 5 | Franja de valores | Tres promesas de marca con ícono. | `App.jsx features` · `04-values-desktop` (C) | Sí | — |
| 6 | Catálogo desde la API | Pide `/api/products/?page_size=100` y sigue `next` hasta tener todas las páginas. | `api.js` · `05-catalog-desktop` (C) | Sí | — |
| 7 | Filtros por categoría | «Todos» + 6 categorías, en cliente, con `aria-pressed`; en móvil se desplazan en una fila. | `ProductGrid.jsx` · `06`, `07` (C) | Sí | — |
| 8 | Búsqueda en la tienda | **No existe en la interfaz.** Sólo la API acepta `?search=`. | `ProductGrid.jsx` sin campo de búsqueda; `shop/views.py` (C) | No | La función no existe en la UI |
| 9 | Tarjeta de producto | Foto, «Favorito», categoría, nombre, precio, «Ideal para», peso y enlace a la ficha. | `ProductGrid.jsx` · `05`, `06` (C) | Sí | — |
| 10 | Botón «Agregar» en la foto | En escritorio aparece con hover o foco; en táctil está siempre visible (`hover: none`). | `styles.css` · `08-product-hover-desktop`, `07-catalog-filter-mobile` (C) | Sí | — |
| 11 | Ficha de producto | `<dialog>` nativo: foto, categoría, precio, existencias, beneficio, tipo de piel, ingredientes, peso y aviso cosmético. | `ProductModal.jsx` · `09`, `10`, `11` (C) | Sí | — |
| 12 | Variantes de producto | **No existen** (ni tamaños ni aromas seleccionables). | `shop/models.py` sin variantes (C) | No | La función no existe |
| 13 | Galería de imágenes por producto | **No existe**: una foto por producto. | `Product.image` único (C) | No | La función no existe |
| 14 | Producto agotado | Tarjeta con «Agotado» deshabilitado y ficha con «Temporalmente agotado». | `ProductGrid.jsx`, `ProductModal.jsx` · `12`–`15` (C, datos demo) | Sí | — |
| 15 | Imagen de respaldo | Si una foto de la API falla, carga la copia local empaquetada. | `onError` en `ProductGrid.jsx`/`ProductModal.jsx` (C) | No | No produce una diferencia visible que capturar |
| 16 | Estado de carga | Tres tarjetas esqueleto animadas mientras llega la API. | `ProductGrid.jsx` · `22`, `23` (C, simulado) | Sí | — |
| 17 | Estado de error con reintento | Mensaje y botón «Volver a intentar» si la API falla. | `ProductGrid.jsx` · `24`, `25` (C, simulado) | Sí | — |
| 18 | Categoría vacía | Mensaje y enlace «Ver todos». | `ProductGrid.jsx` · `26`, `27` (C, simulado) | Sí | — |
| 19 | Catálogo demo de respaldo | Sólo en desarrollo o con `VITE_ENABLE_DEMO_CATALOG=true`, con aviso visible. | `config.js`, `ProductGrid.jsx` (C) | No | Desactivado en producción; no es una pantalla del producto real |
| 20 | Carrito lateral vacío | Invitación a elegir y enlace a la colección. | `CartDrawer.jsx` · `16`, `17` (C) | Sí | — |
| 21 | Carrito con productos | Cantidades ±, quitar, total estimado y «No se realizará ningún cobro». Atrapa el foco y cierra con Escape. | `CartDrawer.jsx` · `18`, `19` (C) | Sí | — |
| 22 | Apertura automática del carrito | Al agregar un producto el cajón se abre para confirmar. | `App.jsx addToCart` (C) | Sí (implícita en `18`) | — |
| 23 | Carrito persistente | Se guarda en `localStorage` (`delicate-cart-v4`) y sobrevive a la recarga. | `useCart.js` (C) | Sí (implícita en `20`) | — |
| 24 | Sincronización del carrito | Al cargar el catálogo actualiza precios, limita cantidades a existencias, retira productos que ya no existen y avisa. | `useCart.js` (`sync`) · `20`, `21` (C) | Sí | — |
| 25 | Pedido prearmado por WhatsApp | «Finalizar por WhatsApp» abre `wa.me` con productos, cantidades, total y campos para nombre y entrega. | `CartDrawer.jsx` · mensaje en `capture-report.json` (C) | No (paso final) | La página de WhatsApp muestra el emoji como «�»; la captura del carrito sí es publicable |
| 26 | Formulario de contacto | Nombre y consulta; abre WhatsApp con el texto prearmado (no guarda nada en el servidor). | `App.jsx handleContact` · `35`, `36` (C) | Sí | — |
| 27 | Botón flotante de WhatsApp | Acceso directo a la conversación desde cualquier punto. | `App.jsx` · visible en casi todas (C) | Sí | — |
| 28 | Historia de la marca | Foto de proceso, sello «Hecho con amor» y tres datos. | `App.jsx` · `28`, `29` (C) | Sí | — |
| 29 | Cómo pedir en 3 pasos | Encuentra, prepara y coordinamos. | `App.jsx` · `30`, `31` (C) | Sí | — |
| 30 | Cita de marca | Bloque verde con frase de marca. | `App.jsx` · `32-quote-desktop` (C) | Sí | La versión móvil queda fuera |
| 31 | Preguntas frecuentes | 5 preguntas con `<details>`; la primera abierta. | `App.jsx faqs` · `33`, `34` (C) | Sí | — |
| 32 | Pie de página | Marca, navegación, ayuda y WhatsApp. | `Footer.jsx` · `37`, `38` (C) | Sí | — |
| 33 | Página completa en móvil | Recorrido vertical de toda la tienda. | `39-home-full-mobile` (C) | Sí | — |
| 34 | Vista previa al compartir | `og:image` JPG 1200×630 absoluto, `og:url` y `canonical` desde `VITE_SITE_URL`. | `index.html`, `vite.config.js` (C) | No | No es una pantalla del sitio |
| 35 | Movimiento reducido | Respeta `prefers-reduced-motion`. | `styles.css` (C) | No | No es visible en una captura |
| 36 | Página 404 | Django responde «Not Found» sin estilo y en inglés. | `raw/56-not-found-desktop.png` (C) | No | Sin terminar (ver excluded.md) |

## Administración y backend (Django)

| # | Función / pantalla | Qué hace | Evidencia | Publicable | Motivo si no |
| --- | --- | --- | --- | --- | --- |
| 37 | Lista de productos editable | Precio, existencias, destacado y activo se editan en la tabla; filtros por categoría, destacado y activo; búsqueda. | `shop/admin.py` · `40`, `41` (C) | Sí | La versión móvil queda fuera |
| 38 | Edición de producto | Formulario en secciones (información, venta, detalles, registro) con subida de imagen validada (JPG/PNG/WebP, 5 MB). | `shop/admin.py`, `shop/models.py` · `42` (C) | Sí | — |
| 39 | Login y portada del admin | Acceso por correo del equipo. | `accounts/models.py` · `raw/24`, `raw/25` (C) | No | Pantallas genéricas de Django, casi vacías |
| 40 | Mensajes de contacto y suscripciones | Listados con estado del mensaje (nuevo, contactado, cerrado). | `contact/admin.py` · `raw/29`, `raw/30` (C, datos demo) | No | Ninguna pantalla de la tienda genera esos datos |
| 41 | API pública del catálogo | `GET /api/products/` (paginada, `category`, `featured`, `search`, `page_size` ≤ 100) y `GET /api/products/<slug>/`. | `shop/urls.py`, `shop/views.py`, `shop/pagination.py` (C) | No | API sin pantalla |
| 42 | API de contacto y boletín | `POST /api/contact/` (10/h) y `POST /api/newsletter/` (5/h) con validación. | `contact/views.py`, `settings.py` (C) | No | API sin pantalla y sin uso en la tienda |
| 43 | Healthcheck | `GET /api/health/` consulta la base de datos; 503 si no responde. Railway sólo publica si da 200. | `backend/views.py`, `docs/DEPLOY_RAILWAY.md` (C) | No | API sin pantalla |
| 44 | Comando `seed_products` | Crea o actualiza 10 productos demo, copia sus fotos al almacenamiento y rechaza fotos repetidas o ausentes. | `shop/management/commands/seed_products.py` (C) | No | Herramienta de línea de comandos |

Funciones transversales sin pantalla, documentadas en [case-notes.md](case-notes.md) y [stack.md](stack.md): cabeceras de seguridad (CSP, Permissions-Policy, X-Frame-Options, HSTS), límites de frecuencia con IP real tras el proxy, slugs únicos automáticos, logs de errores a stdout, servicio de fotos con caché de 7 días y despliegue con migraciones previas.

**Total: 44 funciones documentadas · 28 con captura publicable · 16 sin captura publicable** (12 no existen, no son pantallas o no se ven en una captura; 4 excluidas por calidad o por honestidad: #25, #36, #39, #40).
