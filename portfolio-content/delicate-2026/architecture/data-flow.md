# Flujo de datos

Commit `9f134109`. Diagrama de secuencia: [diagrams/order-flow.mmd](diagrams/order-flow.mmd).

## 1. Catálogo (lectura)

1. El equipo crea o edita productos en Django Admin → PostgreSQL; las fotos van al volumen. (C: `shop/admin.py`, `settings.py`)
2. La tienda pide `GET /api/products/?page_size=100&page=1` y sigue mientras la respuesta tenga `next`. (C: `api.js`)
3. La API devuelve sólo productos activos, ordenados por destacado y nombre, con la URL absoluta de la foto. (C: `shop/views.py`, `shop/models.py`)
4. Si una foto falla, la tienda usa una copia local empaquetada con el build. (C: `api.js`, `ProductGrid.jsx`)
5. Si la API falla: error con reintento en producción; catálogo demo sólo en desarrollo. (C: `ProductGrid.jsx`, `config.js`)

## 2. Carrito (sólo en el navegador)

1. Se lee `localStorage["delicate-cart-v4"]` al iniciar y se descartan entradas inválidas. (C: `useCart.js`)
2. Al llegar el catálogo, cada línea se cruza por `id` o `slug`: se toma el precio actual, la cantidad se limita a las existencias y se quitan los productos inexistentes o agotados. Si algo cambió, el cajón muestra un aviso. (C: `useCart.js` acción `sync`)
3. Cada cambio se guarda en `localStorage`; si el navegador lo bloquea, el carrito sigue funcionando durante la visita. (C: `useCart.js`)

## 3. Pedido y contacto (salida)

1. «Finalizar por WhatsApp» construye un texto con cada producto, cantidad, subtotal, total estimado y campos para nombre y modalidad de entrega. (C: `CartDrawer.jsx`)
2. Se abre `https://wa.me/18498625049?text=…`. El servidor no registra el pedido. (C)
3. El formulario de contacto hace lo mismo con nombre y consulta; tampoco llama a la API. (C: `App.jsx`)
4. Hallazgo: `wa.me` redirige a `api.whatsapp.com` y el emoji 👋 del saludo llega como «�». (C: `capture-report.json`)

Mensaje generado en la captura `18-cart-desktop.png` (texto real extraído del enlace; el emoji es el que envía el sitio):

```text
Hola Delicaté 👋
Quiero realizar este pedido:

• 2 × Avena Calma — RD$700
• 1 × Corazón de Lavanda — RD$425
• 1 × Café Despierto — RD$450

Total estimado: RD$1,575

Mi nombre es:
Prefiero: entrega / recoger

¿Me confirman disponibilidad y forma de entrega? Gracias.
```

## 4. Datos que guarda el servidor

| Dato | Dónde | Quién lo crea |
| --- | --- | --- |
| Productos y fotos | `shop_product`, volumen | Equipo (admin) o `seed_products` |
| Usuarios del equipo | `accounts_customuser` | `createsuperuser` / admin |
| Mensajes de contacto, suscripciones | `contact_*` | Sólo si alguien llama `POST /api/contact/` o `/api/newsletter/`; la tienda no lo hace |
| Pedidos, compradores, direcciones | **No se guardan** | — |
