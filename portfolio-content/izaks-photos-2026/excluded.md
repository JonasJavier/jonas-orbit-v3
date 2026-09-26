# Excluido

Regla aplicada: si falla, se ve mal, parece sin terminar, muestra cifras que no cuadran o se ve vacía, queda fuera. Todas las imágenes siguen en `screenshots/raw/`.

## Capturas excluidas (6)

| Captura raw | Pantalla | Motivo concreto |
| --- | --- | --- |
| `14-gallery-loading-desktop.png` | Estado de carga de la galería (escritorio) | **Se ve vacía:** en escritorio los títulos sólo salen con hover, así que el estado de carga son 8 rectángulos oscuros sin contexto. La versión móvil, con títulos, sí entra (`principales/25`). |
| `56-admin-login-desktop.png` | Login de Django Admin | Pantalla genérica de Django, casi vacía; no aporta. |
| `57-admin-index-desktop.png` | Portada del admin | Casi vacía («Recent actions: None available»); sólo enumera tres modelos. |
| `61-admin-login-mobile.png` | Login del admin (móvil) | Ídem al de escritorio. |
| `62-admin-index-mobile.png` | Portada del admin (móvil) | Ídem al de escritorio. |
| `63-admin-inquiries-mobile.png` | Lista de solicitudes (móvil) | **Desborde:** la tabla se corta a la derecha y sólo se ven nombre y correo; tipo, fecha, «atendida» y creación quedan fuera. |

## Defectos detectados durante la captura y corregidos antes de la captura final

El brief pide documentar sin arreglar, pero estos tres defectos estaban en código de la fase de mejoras o salieron al verificarla. Se corrigieron dentro de esa fase y se repitió toda la captura. Se registran aquí por transparencia.

| Defecto | Primera captura | Corrección | Etiqueta |
| --- | --- | --- | --- |
| El header no desenfocaba el fondo en Chrome ni Firefox: al hacer scroll, texto y fotos se leían nítidos bajo el logo. **También ocurre en producción** (`38b4f3de`). | `11-gallery-hover-desktop` y varias móviles | `Home.css`: sólo `backdrop-filter`, y el build añade el prefijo | comprobado (CSS compilado antes y después) |
| El visor medía 0×0 mientras cargaba el JPEG completo, así que la miniatura de fondo no se veía (esa función se añadió en esta sesión) | `lightbox-loading` (Playwright no encontraba la imagen visible) | `Home.css` + `ProjectGallery.jsx`: tamaño calculado a partir de la proporción | comprobado |
| Admin: columna «Created at» cortada (al añadir `location` a la lista en esta sesión) y título de cada solicitud con fecha UTC distinta de la local (**también en producción**) | `58-admin-inquiries-desktop`, `59-…` | `admin.py`: se quitó `location` de la lista; `models.py`: `timezone.localtime`; prueba nueva | comprobado |

## Contenido que entra con reservas

No se excluye porque la pantalla está terminada y se ve bien, pero **no está verificado** (Preguntas 1–3):

- Cifras del estudio (8+ años, 240 galerías, 48 h, 12 países): `principales/04`, `05`, `36`, `37`.
- Precios de los paquetes ($650, $1,250, $1,800): `principales/09`, `10`, `38`–`44`.
- Los 3 testimonios (Maya L., Amanda & James, Elena R.): `principales/13`, `14`.
- Las fotos en sí: no hay evidencia de que sean de Izak.

## Pantallas pedidas que no existen

| Pedido | Realidad | Evidencia |
| --- | --- | --- |
| Panel de carga o administración de fotos | No existe: las fotos son archivos del repo y el admin sólo gestiona solicitudes | `admin.py`; no hay `ImageField` |
| Álbumes | No existen; sólo 4 categorías fijas | `portfolio.js` |
| Galerías privadas o descargas para clientes | No existen | — |

## Estados que existen pero no se capturaron

| Estado | Motivo |
| --- | --- |
| Error del servidor (5xx) y límite de envíos (429) en el formulario | Habría que falsear la respuesta de la API; el mensaje existe en `BookingForm.jsx` y el 429 está cubierto por una prueba |
| Enlace «Saltar al contenido» | Sólo aparece con el teclado |
| Carrusel en marcha (barra de progreso avanzando) | Las capturas usan `prefers-reduced-motion`, así que el carrusel queda detenido en la primera foto para que el resultado sea determinista |
