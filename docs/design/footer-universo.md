# Footer — el viaje continúa

2026-09-21. Petición de Jonás: un footer más espacial, completo y profesional,
con mejor diseño y UX. Sustituye el pie compacto anterior en las páginas que
comparten `SiteShell`.

## Composición

- Cielo oscuro, estrellas discretas, horizonte planetario y trazas orbitales.
  Decoración estática en CSS/SVG, oculta a tecnologías de asistencia.
- Invitación principal: «Tu próxima idea, un nuevo universo», con acceso a
  Contacto. En Contacto, el botón abre el email para evitar un enlace circular.
- Identidad profesional, ubicación y perfiles desde `SITE_PROFILE`.
- Seis destinos en orden narrativo desde `getWorldNavItems`, con nombre humano
  antes del nombre cósmico. La sección activa se indica mediante `aria-current`.
- Accesos a mapa, privacidad y regreso al contenido; contexto de ruta al pie.

## Contratos

`SiteFooter` se sirve como HTML, sin estado cliente, imágenes adicionales,
canvas ni bucle de animación. Los destinos no se precargan desde el footer.
Se conserva el espacio inferior para los controles globales de audio y movimiento.
Todos los enlaces tienen al menos 44 px de alto y foco visible. La composición
pasa de identidad y directorio en paralelo a una columna; destinos en tres
columnas en escritorio ancho y dos en tamaños menores. Los enlaces externos
conservan la navegación habitual en la misma pestaña.

No cambia la portada del System Map ni las escenas de los mundos.
La valoración estética final queda abierta a Jonás.
