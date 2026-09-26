# Decisiones de diseño y UX

Cada par tiene como máximo 20 palabras por lado. Las capturas están en `screenshots/principales/`.

| # | Problema | Decisión | Captura principal | Evidencia |
| --- | --- | --- | --- | --- |
| 1 | El sitio debe lucir el trabajo y, a la vez, llevar a reservar. | Hero a sangre con dos acciones; «Reserve» fijo en la cabecera de todas las páginas. | `01-home-desktop.png` | `PhotoCarousel.jsx`, `Navbar.jsx` |
| 2 | Cuarenta y dos fotos en cuatro series se vuelven una cuadrícula genérica. | Mosaico que intercala series, filtros con conteo y visor a pantalla completa con teclado. | `19-gallery-grid-desktop.png` | `ProjectGallery.jsx` (`interleave`) |
| 3 | No había forma de compartir ni enlazar una foto concreta. | La categoría y la foto abierta viven en la URL; cada foto tiene su enlace. | `26-lightbox-desktop.png` | `ProjectGallery.jsx` (`useSearchParams`) |
| 4 | En el móvil nunca se veían los títulos: sólo aparecían al pasar el ratón. | En pantallas táctiles, lugar y título quedan siempre visibles sobre cada foto. | `20-gallery-grid-mobile.png` | `Home.css` (`@media (hover: none)`) |
| 5 | La galería descargaba 9,3 MB de JPEG completos para miniaturas pequeñas. | Miniaturas WebP de 720 px; el JPEG completo sólo se carga en el visor. | `25-gallery-loading-mobile.png` | `scripts/optimize_images.py`, `portfolio.js` |
| 6 | En móvil, la confirmación de la reserva quedaba fuera de la pantalla. | Tras enviar, la página baja hasta la confirmación, que resume lo enviado. | `44-booking-success-mobile.png` | `BookingForm.jsx` (`scrollIntoView`, `submitted`) |
