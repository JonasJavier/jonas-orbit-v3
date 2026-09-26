# Funciones y pantallas

Estado del código capturado: `38b4f3de` + mejoras de la sesión del 25-09-2026 (sin commit). «Nueva» indica que la función no existe en producción hasta que se despliegue. Las capturas están en `screenshots/principales/`.

## Sitio público

| # | Función | Qué hace | Publicable | Captura / motivo | Evidencia |
| --- | --- | --- | --- | --- | --- |
| F01 | Cabecera fija | Marca, Inicio · Galería · Sobre mí y botón «Reserve» siempre visible; fondo translúcido con desenfoque | sí | `01-home-desktop.png` | `Navbar.jsx` |
| F02 | Selector de idioma EN/ES | En el header (escritorio) y dentro del menú (móvil); recuerda la elección y detecta el idioma del navegador | sí | `48-home-es-desktop.png`, `50-menu-es-mobile.png` | `LanguageToggle.jsx`, `i18n.jsx` |
| F03 | Menú móvil | Panel a pantalla completa con enlaces, «Reserve» e idioma; se cierra con Escape o al navegar | sí | `03-menu-mobile.png` | `Navbar.jsx` |
| F04 | Enlace «Saltar al contenido» | Primer elemento enfocable con Tab; lleva al `<main>` | no | Sólo aparece al usar el teclado; no aporta como imagen | `App.jsx` |
| F05 | Título de pestaña por ruta | «Gallery — Izak's Photos», etc., en el idioma activo (nueva) | no | No es visual | `App.jsx` (`RouteEffects`) |
| F06 | Hero con carrusel | 4 fotos con fundido y zoom lento; autoplay de 6,5 s con barra de progreso; pausa con hover o foco; botón pausa/reproducir (nuevo); sin autoplay con `reduced-motion`; deslizamiento táctil (nuevo) | sí | `01-home-desktop.png`, `02-home-mobile.png` | `PhotoCarousel.jsx` |
| F07 | Manifiesto y cifras del estudio | Frase de posicionamiento y 4 cifras (8+ años, 240 galerías, 48 h, 12 países) | sí (cifras no verificadas) | `04-home-intro-desktop.png`, `05-home-intro-mobile.png` | `HomePage.jsx`, `portfolio.js` (`studioStats`) |
| F08 | Trabajo seleccionado | Mosaico asimétrico de 5 fotos; cada una abre esa foto en el visor de la galería (nuevo) | sí | `06-…`, `07-home-featured-hover-desktop.png`, `08-home-featured-mobile.png` | `FeaturedWork.jsx` |
| F09 | Servicios y paquetes | 3 paquetes con foto, duración, resumen, 3 detalles, precio «desde» y enlace a reservar | sí (precios no verificados) | `09-home-services-desktop.png`, `10-home-services-mobile.png` | `HomePage.jsx`, `portfolio.js` (`services`) |
| F10 | Proceso | 4 pasos: Conectar, Planear, Crear, Entregar | sí | `11-…`, `12-home-process-mobile.png` | `HomePage.jsx` |
| F11 | Testimonios | 3 citas con 5 estrellas, nombre y tipo de sesión | sí (contenido no verificado) | `13-…`, `14-home-testimonials-mobile.png` | `Testimonials.jsx` |
| F12 | Llamada final y pie | «Ready to build the next gallery?» + pie con navegación, ubicación y enlace a la solicitud | sí | `15-…`, `16-home-cta-footer-mobile.png` | `HomePage.jsx`, `Footer.jsx` |
| F13 | Galería filtrable | 42 fotos en 4 series; filtros con conteo; «Todo» intercala las series (nuevo); contador «42 photographs» | sí | `17-gallery-desktop.png` a `24-gallery-travel-desktop.png` | `ProjectGallery.jsx` |
| F14 | Filtro en la URL | `/projects?category=weddings` abre directamente la serie (nuevo) | sí | `22-gallery-weddings-desktop.png` | `ProjectGallery.jsx` (`useSearchParams`) |
| F15 | Mosaico con espacio reservado | Columnas tipo masonry con proporción fija por foto; miniaturas WebP de 720 px (nuevo) que aparecen con un fundido | sí | `19-gallery-grid-desktop.png`, `20-gallery-grid-mobile.png` | `ProjectGallery.jsx`, `Home.css` |
| F16 | Estado de carga de la galería | Marcadores del tamaño exacto de cada foto (con título en táctil) mientras llegan las miniaturas (nuevo) | sí (móvil) | `25-gallery-loading-mobile.png`; la de escritorio se excluyó | `Home.css` (`.masonry-item`, `shimmer`) |
| F17 | Títulos en hover o táctil | Lugar y título aparecen al pasar el ratón; en táctil están siempre visibles (nuevo) | sí | `21-gallery-hover-desktop.png`, `20-…` | `Home.css` (`@media (hover: none)`) |
| F18 | Visor de fotos (lightbox) | Pantalla completa con título, lugar y contador «02 / 42»; flechas en pantalla y de teclado; Escape y fondo para cerrar | sí | `26-lightbox-desktop.png`, `27-lightbox-mobile.png`, `28-…`, `29-…` | `ProjectGallery.jsx` |
| F19 | Accesibilidad del visor | Foco en «Cerrar» al abrir, foco atrapado con Tab y devuelto a la miniatura al cerrar (nuevo) | no | No es visual; verificado con Playwright | `ProjectGallery.jsx` |
| F20 | Deslizar entre fotos | Gesto horizontal en el visor y en el hero (nuevo) | no | Un gesto no se ve en una captura; verificado en código | `ProjectGallery.jsx`, `PhotoCarousel.jsx` |
| F21 | Foto compartible | `/projects?photo=red-motion` abre esa foto en el visor; la URL cambia al navegar (nuevo) | sí | `26-lightbox-desktop.png` (URL directa) | `ProjectGallery.jsx` |
| F22 | Carga progresiva del visor | Marco dimensionado antes de cargar, con la miniatura de fondo hasta que llega el JPEG completo; precarga de las vecinas (nuevo) | sí | `30-lightbox-loading-desktop.png` | `ProjectGallery.jsx`, `Home.css` |
| F23 | Sobre mí | Hero con foto rotulada «From the portfolio», historia, cita, 3 principios, cifras, proceso y testimonios | sí | `31-about-desktop.png` a `37-about-stats-mobile.png` | `AboutPage.jsx` |
| F24 | Elección de paquete | 3 tarjetas con precio; la elegida se sincroniza con el selector del formulario y con el resumen | sí | `38-booking-desktop.png`, `40-booking-packages-mobile.png` | `BookingForm.jsx` |
| F25 | Formulario de reserva | Nombre, correo, teléfono opcional, tipo, fecha, lugar, cómo me encontraste y mensaje; `autocomplete` (nuevo) | sí | `41-booking-filled-desktop.png`, `42-booking-form-mobile.png` | `BookingForm.jsx` |
| F26 | Resumen en vivo | El panel de confirmación muestra paquete, precio, fecha, lugar y correo mientras se escribe | sí | `41-…` | `BookingForm.jsx` |
| F27 | Confirmación | Estado «You're all set» con el resumen de lo enviado (nuevo) y «Saved to the studio inbox»; en móvil la página baja hasta él (nuevo) | sí | `43-booking-success-desktop.png`, `44-booking-success-mobile.png` | `BookingForm.jsx` |
| F28 | Errores por campo | Si la API rechaza un campo (400), se marca con `aria-invalid` y un mensaje traducido (nuevo) | sí | `45-booking-validation-desktop.png`, `46-…` | `BookingForm.jsx` |
| F29 | Error sin conexión | Mensaje que conserva los datos escritos | sí | `47-booking-offline-desktop.png` (red cortada con `page.route`) | `BookingForm.jsx` |
| F30 | Error del servidor y límite (429) | Mensajes propios para 5xx y para demasiadas solicitudes (nuevo) | no | No se capturaron; forzarlos exigiría falsear respuestas | `BookingForm.jsx` |
| F31 | Página 404 | «This frame didn't make the final edit.» con enlaces a la galería y al inicio; antes redirigía en silencio a la portada (nuevo) | sí | `53-not-found-desktop.png`, `54-not-found-mobile.png` | `NotFoundPage.jsx`, `App.jsx` |
| F32 | Vista previa al compartir | `og:image` de 1200×630 y `twitter:image` (nuevo) | no | No es una pantalla; archivo `frontend/public/og-image.jpg` | `index.html` |

## Backend, API y administración

| # | Función | Qué hace | Publicable | Captura / motivo | Evidencia |
| --- | --- | --- | --- | --- | --- |
| F33 | `POST /api/contact/` | Valida con el serializer y guarda `BookingInquiry` (201). Devuelve 400 con los errores por campo, ignora en silencio el campo trampa (nuevo) y admite 10 solicitudes/h por cliente, después 429 (nuevo) | sí (vía el formulario) | `43-…` (guardado en la base demo) | `views.py`, `serializers.py`, `tests.py` |
| F34 | `GET /api/health/` | `{"status":"ok"}`; lo usa el healthcheck de Railway | no | No es visual | `views.py`, `railway.toml` |
| F35 | `GET /api/photos/` | Lista fija de 6 fotos destacadas | no | Ninguna pantalla la usa (Pregunta 12) | `views.py` |
| F36 | Admin de solicitudes | Lista con búsqueda (nombre, correo, mensaje, lugar), filtros (atendida, tipo, referencia, fecha), navegación por fechas, casilla «atendida» editable en la lista y acciones «marcar como atendidas» y «reabrir» (nuevas) | sí (escritorio) | `55-admin-inquiries-desktop.png`, `56-…`, `57-admin-inquiries-handled-desktop.png` | `admin.py` |
| F37 | Admin: login, portada y versión móvil | Pantallas estándar de Django | no | Genéricas o casi vacías; en móvil la tabla se corta (ver excluded.md) | — |
| F38 | Un solo origen | Django sirve `index.html` para cualquier ruta que no sea `api/`, `admin/` ni `static/`; WhiteNoise sirve los archivos con hash y comprimidos | no | Infraestructura | `urls.py`, `settings.py` |
| F39 | Seguridad de despliegue | CORS y CSRF con lista blanca; cookies `Secure` y sin API navegable fuera de DEBUG (nuevo); cabeceras `X-Frame-Options: DENY` y `nosniff` (medidas en producción) | no | Infraestructura | `settings.py`; `curl -I` |

## Herramientas del repo (no son pantallas)

- `scripts/dev.py`: arranca Django y Vite a la vez. — comprobado
- `scripts/optimize_images.py`: genera las miniaturas WebP y la imagen Open Graph (nuevo). — comprobado
- CI en GitHub Actions: pruebas del backend y build del frontend en cada push. — comprobado (`.github/workflows/ci.yml`)

## Pedidas en el brief que no existen

| Pedido | Realidad | Evidencia |
| --- | --- | --- |
| Panel de carga o administración de fotos | No existe. Las fotos son archivos en `frontend/src/images/`: se añaden a mano, se regeneran las miniaturas con el script, se registran en `portfolio.js` y se despliega. El admin sólo gestiona solicitudes. | No hay `ImageField` ni `MEDIA_ROOT`; `admin.py` |
| Álbumes | No hay álbumes, sólo 4 categorías fijas | `portfolio.js` (`categories`) |
| Galerías privadas para clientes o descargas | No existen (los servicios las mencionan como parte de la entrega, no como función del sitio) | — |
| Aviso por correo al recibir una solicitud | No existe | No hay `EMAIL_*` en `settings.py` |
