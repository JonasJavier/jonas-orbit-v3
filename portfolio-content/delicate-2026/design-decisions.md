# Decisiones de diseño y UX

Cada par tiene como máximo 20 palabras por lado. Las capturas están en `screenshots/principales/`.

| # | Problema | Decisión | Captura principal | Evidencia |
| --- | --- | --- | --- | --- |
| 1 | El precio de un jabón artesanal se sostiene con la marca, no con un listado. | La portada presenta la marca antes que la tienda, con una sola acción principal. | `01-home-desktop.png` | `App.jsx` (hero) |
| 2 | Antes de comprar, el cliente pregunta por beneficio, tipo de piel e ingredientes. | La ficha lo responde en un diálogo nativo, sin salir del catálogo. | `09-product-detail-desktop.png` | `ProductModal.jsx` |
| 3 | Un checkout que no puede cobrar es una promesa rota. | El carrito arma el pedido, aclara que no cobra y lo cierra en WhatsApp. | `18-cart-desktop.png` | `CartDrawer.jsx` |
| 4 | Un carrito guardado días antes puede enviar precios viejos o cantidades sin existencias. | Al volver, el carrito se actualiza con el catálogo real y avisa del cambio. | `20-cart-updated-desktop.png` | `useCart.js` (`sync`) |
| 5 | En una pantalla táctil no hay hover que descubra el botón de compra. | En táctil «Agregar» queda siempre visible y los filtros se desplazan en una fila. | `07-catalog-filter-mobile.png` | `styles.css` (`@media (hover: none)`) |
| 6 | Si la API falla, mostrar productos inventados engaña al comprador. | Producción muestra un error con reintento; el catálogo demo sólo existe en desarrollo. | `24-error-desktop.png` | `ProductGrid.jsx`, `config.js` |
