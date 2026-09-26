# Notas para el CV

Sin métricas de negocio: no hay evidencia de visitas ni de reservas. Cada viñeta se apoya en el repo o en producción.

## Español

- Reconstruí el sitio bilingüe (EN/ES) de un fotógrafo con React 18, Vite 8 y Django 5.2: galería filtrable de 42 fotos con enlaces compartibles, visor accesible con teclado y reservas guardadas vía API.
- Reduje un 74 % el peso de la galería con miniaturas WebP y lo desplegué en Railway como un solo servicio (Django sirve API y frontend), con límite de envíos y CI.

**Tecnologías:** React 18 · Vite 8 · React Router 7 · CSS propio · Django 5.2 · Django REST Framework · WhiteNoise · Gunicorn · Railway · GitHub Actions

## English

- Rebuilt a photographer's bilingual (EN/ES) site with React 18, Vite 8 and Django 5.2: a 42-photo filterable gallery with shareable links, a keyboard-accessible lightbox and API-backed booking requests.
- Cut gallery image weight by 74% with WebP previews and shipped it to Railway as a single service (Django serves API and frontend), with rate limiting and CI.

**Technologies:** React 18 · Vite 8 · React Router 7 · custom CSS · Django 5.2 · Django REST Framework · WhiteNoise · Gunicorn · Railway · GitHub Actions

## Notas de honestidad

- «Un fotógrafo» y no «un cliente»: no está verificado que Izak sea un cliente real (Pregunta 1).
- El 74 % mide las miniaturas: 8.986 KB de JPEG frente a 2.372 KB de WebP. Descargando la galería completa en móvil, la reducción es del 75 % (9.303 → 2.361 KB), pero la versión nueva tiene 2 fotos menos.
- Las miniaturas WebP, el límite de envíos y el enlace compartible son de la sesión del 25-09-2026 (hecha con Claude y todavía sin commit ni despliegue). Hasta que despliegues, producción no los tiene.
- El proyecto empezó como colaboración: `JobNacor` creó el repositorio en 2024 (Pregunta 4).
