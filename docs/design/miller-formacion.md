# Miller — formación sin punto final

Rediseño solicitado por el dueño el 2026-09-09. Miller representa un aprendizaje
que nunca deja de fluir: ciencias de la computación, estrategia y lenguaje visual.
La intervención pertenece a `/es/formacion`, servida por `[mundo]` y seleccionada
por `WorldId`. Conserva metadata, breadcrumb, navegación y vecinos canónicos.
No altera los cuerpos del atlas ni la composición o las poses de cámara.

## Experiencia

- Entrada de océano, horizonte distante y tipografía editorial. El guiño a
  Interstellar es espacial y atmosférico; la imagen es original.
- Una reflexión sobre el aprendizaje conecta con tres áreas: CS50, Marketing
  Digital y los estudios de Multimedia en ITLA. El bachillerato cierra el origen
  académico del recorrido.
- Archivo con tres programas y cinco roles destacados. Los quince cursos se
  despliegan con un `details` nativo; los filtros muestran cada área completa.
  Los documentos abren como PDF en otra pestaña, indicado en el nombre accesible.
- Salida hacia los proyectos y enlaces a los dos destinos contiguos.

## Fuente y correcciones de contenido

La prosa y el catálogo viven en `content/es/worlds/miller.mdx`, validados por
Velite. Se contrastaron los documentos de `portfolio-content/estudios` mediante
extracción de texto y revisión visual de los certificados escaneados.

- CS50x: 2023. CS50W: 2024. Certificados de cursos de Harvard University;
  no se presentan como títulos universitarios.
- Carrera de Marketing Digital: 207 horas, EducaciónIT y Manhattan University,
  completada el 8 de octubre de 2024.
- Cinco roles de EducaciónIT: UX Designer, UX Researcher, Analista de Marketing
  Online, Content Manager y Community Manager. No se infieren fechas de los scans.
- Quince cursos únicos de EducaciónIT: se eliminaron las copias `(1)` y las
  versiones de imagen del mismo documento. La cifra anterior de dieciséis
  no estaba respaldada por esta carpeta. Google Ads y Analytics mantienen a
  EducaciónIT como emisor.
- ITLA: ocho meses de la carrera de Multimedia, sin titulación ni certificación,
  según información directa del dueño. No se inventa una fecha ni un PDF.
- Bachiller en Humanidades y Lenguas Modernas: año escolar 2021–2022.
  Julio de 2024 es la expedición del documento, no la finalización de los estudios.
  Se presenta el logro sin publicar su documento con identificadores personales.

Los 23 PDF públicos son copias íntegras, con nombres normalizados, en
`public/education/`. No se descargan al abrir la página; se solicitan al seguir
un enlace. Las tres miniaturas son WebP de 760 px generadas desde los PDF.

## Movimiento y rendimiento

La imagen permanece en HTML y se sirve como WebP de 195.248 bytes, con precarga.
Un canvas 2D decorativo refracta únicamente la zona del agua. Ancho máximo de
1440 px, sin multiplicador de DPR, tope de 30 fps y dos ondas coherentes. No
añade dependencias, otro contexto WebGL ni acoplamiento entre scroll y cámara.

El botón «Pausar océano» retira el canvas y deja la imagen estática. El perfil
ligero y `prefers-reduced-motion` también lo retiran. IntersectionObserver y
`visibilitychange` detienen el bucle fuera de pantalla y en segundo plano.
Sin JavaScript siguen disponibles la imagen, la prosa, los PDF y el desplegable;
los filtros se ocultan porque requieren JavaScript.

La escena persistente conserva su contexto al viajar a Miller, pero `setCovered`
detiene su render detrás de esta página opaca. Al salir recupera el bucle y la
pose de la nueva ruta. El control 3D global se oculta aquí: el control visible
corresponde al océano. El audio mantiene su instancia y su consentimiento.

## Asset original

Modo: generación nueva con la herramienta integrada de ImageGen, sin referencias.
Original conservado en la carpeta de imágenes generadas; copia optimizada en
`public/images/miller/ocean.webp`. Prompt:

> Create an original cinematic photorealistic alien ocean landscape website hero BACKGROUND ASSET. Widescreen 16:9. No typography, interface, logos, people or ships. Camera one meter above endless cold slate teal-blue ocean with long sculptural parallel swells and delicate silver foam. Horizon upper third. An immense distant tidal wave like a mountain on far RIGHT horizon, hazy clouds, a tiny crescent planet in high right sky. Water dominates frame. Darker less detailed left half for white typography. Right half beautiful detailed physically believable sea textures and silver reflections. Subtle warm distant glow on right horizon, palette midnight navy, slate blue, deep cyan, pale silver, never tropical turquoise. Premium photographic film still, quiet epic cosmic scale reminiscent of exploring an ocean planet, no copied movie frame. This is for education as water that never stops flowing.

## Verificación

`components/miller-page.test.tsx` cubre integridad del catálogo, archivos,
contenido académico y filtros. `e2e/miller.spec.ts` cubre teclado, PDF reales,
destinos, desbordamiento, movimiento/pausa, segundo plano, fuera de pantalla,
reduced-motion, HTML sin JavaScript y persistencia de la escena al salir.
Se conserva la matriz existente de rutas y banda sonora.

Resultado: `npm run check` verde (205 tests unitarios y build estático); 86
pruebas E2E de Miller, rutas y música pasan en Chromium de escritorio y móvil.
Revisión visual sobre build de producción a 1440 px y 375 px, además de los
estados filtrados y el desplegable sin JavaScript.

Revisión del bundle de producción: los scripts iniciales para navegadores
modernos suman 164,42 KiB gzip en Formación, frente a 164,35 KiB en la portada
actual. El chunk específico compartido por las rutas `[mundo]` pesa 10,05 KiB
gzip e incluye el océano y el archivo. Estas cifras excluyen el polyfill
`nomodule` y las cargas diferidas; no son una puntuación Lighthouse ni una
medición de toda la transferencia tras los prefetch de navegación. El fondo
WebP pesa 190,7 KiB; las tres miniaturas suman 96,2 KiB antes de la optimización
de imágenes de Next. No se incorporaron dependencias.
