# Overview

Etiquetas: **comprobado** · **inferencia** · **pendiente**.

## Qué es

Tienda en línea y sitio de marca para jabones artesanales. El catálogo se administra en Django. La tienda en React permite explorar y filtrar productos, ver su ficha y armar un carrito sin cuenta. El pedido se envía como mensaje prearmado por WhatsApp; el sitio no cobra.
— comprobado: `README.md` del repo, `frontend/src/`, `backend/`.

## Para quién

- **Comprador:** explora, elige y envía el pedido sin registrarse. — comprobado (no hay registro ni login de clientes: `accounts/models.py` sólo sirve al admin).
- **Equipo del negocio:** mantiene productos, precios, existencias, fotos y destacados desde Django Admin. — comprobado (`shop/admin.py`).

## Qué problema resuelve

Presenta un catálogo con identidad propia y entrega pedidos legibles al canal donde el negocio ya confirma, cobra y entrega (WhatsApp), sin simular pagos ni logística. — inferencia a partir del código (no hay pagos, pedidos ni envíos en el backend) y del README del repo («Decisiones de experiencia»).

## Estado real (25-09-2026)

| Pregunta | Respuesta | Evidencia | Etiqueta |
| --- | --- | --- | --- |
| ¿Desplegado? | Sí, en Railway: un servicio Docker, PostgreSQL y un volumen para fotos. | `Dockerfile`, `railway.json`, `docs/DEPLOY_RAILWAY.md`; commit `25b8b833` | comprobado |
| ¿URL de producción que responda hoy? | <https://delicate.jonasjavier.dev> → 200 en `/`, `/api/health/` y `/api/products/` (10 productos). | `curl` el 25-09-2026 22:31 (UTC−4) | comprobado |
| ¿HTTPS? | Sí; `http://` redirige a `https://` (301) y el certificado verifica. | `curl` (`ssl_verify_result 0`) | comprobado |
| ¿Cliente real o proyecto propio? | El README lo presenta como «Proyecto de portafolio personal». El número de WhatsApp es comercial y el sitio es público. | `README.md` del repo | pendiente (Pregunta 1) |
| ¿Catálogo real? | Producción tiene los 10 productos del comando demo. | `/api/products/` → `count: 10`; `seed_products.py` | pendiente (Pregunta 2) |
| ¿Repo público o privado? | Privado. | `gh repo view` → `"visibility":"PRIVATE"` | comprobado |
| ¿Salida comercial completa? | No consta: la lista `docs/GO_LIVE.md` (políticas, pruebas en teléfonos, respaldos) sigue sin marcar. | `docs/GO_LIVE.md` | pendiente |
| ¿Pruebas? | 18/18 en verde; `check` y migraciones sin cambios pendientes; lint y build OK. | `manage.py test`, `npm run lint`, build en `serve_demo.sh` | comprobado |
| ¿Ventas o uso medido? | Sin evidencia; el código no tiene analítica. | búsqueda en `frontend/src` | pendiente |

## Historia en dos generaciones

- **2024 (ago–dic, 15 commits):** tienda convencional con registro, login de Google, carrito en servidor, reseñas, historial de pedidos, blog y gestión de productos en React. — comprobado (árbol de `44f824fb`).
- **2026 (ago–sep, 11 commits):** reconstrucción como tienda de marca con pedido por WhatsApp (`fbf22e62`, 01-08-2026), catálogo ampliado a 10 productos, endurecimiento para producción y despliegue con dominio propio (25-09-2026). — comprobado (`git log`).
