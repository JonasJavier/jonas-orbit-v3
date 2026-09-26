# Flujo de datos

Diagramas: [diagrams/booking-flow.mmd](diagrams/booking-flow.mmd) (reserva), [diagrams/gallery-state.mmd](diagrams/gallery-state.mmd) (galería) y [diagrams/deploy.mmd](diagrams/deploy.mmd) (build y despliegue).

## 1. Carga de una página

1. El navegador pide `/projects`. Django no tiene esa ruta, así que el `re_path` final devuelve `index.html` (200). — comprobado (`urls.py`)
2. `index.html` carga `/static/assets/index-<hash>.js` y `.css` (WhiteNoise) y las fuentes de Google Fonts. — comprobado
3. React Router pinta `ProjectsPage`. La galería lee `?category=` y `?photo=` de la URL. — comprobado
4. Las miniaturas WebP se piden con `loading="lazy"` a medida que entran en pantalla. Cada celda ya tiene su proporción, así que nada salta. — comprobado (`ProjectGallery.jsx`)

## 2. Idioma

`LanguageProvider` elige el idioma en este orden: `localStorage["izak-lang"]`, el idioma del navegador si empieza por `es`, o inglés. Al cambiarlo, guarda la elección y actualiza `<html lang>`. Todos los textos pasan por `t({ en, es })`. — comprobado (`i18n.jsx`)

## 3. Galería y visor

- Filtro: `updateParams({ category, photo: null })` con `replace: true`. No llena el historial y la URL se puede compartir. — comprobado
- «Todo» reparte las fotos por series («como cartas»), para que la primera columna no sean sólo retratos. — comprobado (`interleave`)
- Abrir una foto escribe `?photo=<id>`. El visor mueve el foco a «Cerrar», bloquea el scroll del `body` y precarga las fotos vecinas. Muestra la miniatura (ya en caché) como fondo hasta que llega el JPEG completo. — comprobado
- Cerrar borra `photo` y devuelve el foco a la miniatura `[data-photo="<id>"]`. — comprobado (verificado con Playwright)

## 4. Solicitud de reserva

| Paso | Detalle | Evidencia |
| --- | --- | --- |
| Formulario | Estado local; elegir un paquete sincroniza el selector y el resumen | `BookingForm.jsx` |
| Envío | `fetch POST /api/contact/` con JSON (incluye el campo trampa `website`, vacío para las personas) | ídem |
| Límite | `ContactRateThrottle` (anónimo, `10/hour`) → 429 | `views.py`, `settings.py` |
| Trampa | Si `website` trae texto: 201 y no se guarda nada | `views.py`, `tests.py` |
| Validación | `BookingInquirySerializer`: `projectType`→`project_type`, `date`→`preferred_date`; nombre y correo obligatorios, correo válido | `serializers.py`, `models.py` |
| Respuesta | 201 `{status: "received", id, inquiry}` · 400 `{errors}` | `views.py` |
| Interfaz | 201 → confirmación con resumen de lo enviado (y scroll en móvil) · 400 → campos marcados · 429/5xx/sin red → mensaje | `BookingForm.jsx` |
| Gestión | El fotógrafo la ve en `/admin/api/bookinginquiry/`, la filtra y la marca como atendida | `admin.py` |

Datos personales guardados: nombre, correo, teléfono opcional, lugar y mensaje. No se reenvían a ningún servicio externo. — comprobado (no hay integraciones)

## 5. Fotos: de archivo a pantalla

`frontend/src/images/optimized/*.jpg` → `python scripts/optimize_images.py` → `thumbs/*.webp` (720 px) + `public/og-image.jpg` → `import.meta.glob` en `portfolio.js` → `vite build` las copia con hash → WhiteNoise las sirve. Una foto que falte en `optimized/` hace fallar el build. — comprobado (`image()` lanza un error)

## 6. Despliegue

Railway ejecuta el `buildCommand` de `railway.toml` (pip, `npm ci`, `vite build`, `collectstatic`), después `migrate` y luego Gunicorn. Si `/api/health/` falla, reinicia (hasta 10 veces). — comprobado (`railway.toml`). Que el despliegue se dispare con cada push a GitHub no está verificado. — pendiente
