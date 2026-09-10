# Miller — formación sin punto final

Rediseño solicitado por el dueño el 2026-09-09. Miller representa un aprendizaje
que nunca deja de fluir: ciencias de la computación, estrategia y lenguaje visual.
La intervención pertenece a `/es/formacion`, servida por `[mundo]` y seleccionada
por `WorldId`. Conserva metadata, breadcrumb, navegación y vecinos canónicos.
No altera los cuerpos del atlas ni la composición o las poses de cámara.

## Experiencia

### Pase de cabina y agua (2026-09-10)

El dueño pide una experiencia menos convencional, espacial y fantástica,
manteniendo el AGUA como identidad principal. La navbar prueba la consola de
cabina; la página gana un marco de observación pequeño, botones con bisel y
lavado de luz, hitos de inmersión y corrientes luminosas que atraviesan las
secciones. El océano original y su oleaje siguen dominando el hero.

El archivo de certificados pasa a un módulo de a bordo: filtros empotrados,
indicadores de selección, registros M/01–M/23 y documentos dentro de visores
oscuros. Los números identifican el orden real del catálogo y se mantienen
al filtrar. No se recolorean, sustituyen ni inventan certificados. Cada vista
previa recibe un reflejo breve al apuntar o enfocar; sus PDF y nombres
accesibles se mantienen. El fondo del archivo reutiliza la imagen del océano.

`MillerWater` comparte consentimiento y pausa entre el océano y las corrientes.
El archivo ofrece un control de pausa propio que actúa sobre ambos. Las
corrientes sólo avanzan cuando su sección está visible y la página está en
primer plano. No se añade otro canvas ni un bucle JavaScript: la luz recorre
los trazos SVG con CSS. El perfil ligero parte en reposo; reduced-motion
apaga las animaciones decorativas y mantiene el opt-in del océano. Sin JS,
el contenido completo permanece visible y los controles inertes se ocultan.

La versión anterior de navbar y Miller está guardada en
`output/archive/navbar-cristal-miller-20260910-142134.zip`.

### Contenido y estructura

- Entrada de océano, horizonte distante y tipografía editorial. El guiño a
  Interstellar es espacial y atmosférico; la imagen es original.
- Una reflexión sobre el aprendizaje conecta con tres áreas: CS50, Marketing
  Digital y los estudios de Multimedia en ITLA. El bachillerato cierra el origen
  académico del recorrido.
- Galería de 23 certificados con imagen individual: tres programas, cinco roles
  y quince cursos. Todos se muestran al abrir el archivo; los filtros permiten
  consultar cada área por separado.
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
un enlace. Las 23 miniaturas son WebP de hasta 960 px generadas desde los PDF,
con carga diferida. La vista previa es obligatoria en el esquema de Velite.

## Movimiento y rendimiento

La imagen permanece en HTML y se sirve como WebP de 195.248 bytes, con precarga.
Un canvas 2D decorativo refracta únicamente la zona del agua. Ancho máximo de
1440 px, sin multiplicador de DPR, tope de 30 fps y dos ondas coherentes. El
pase de revisión sitúa el horizonte en el 24 % de la imagen, amplía el relieve
a 24 px en primer plano y avanza las crestas a aproximadamente 60 px/s en una
superficie de 700 px. Una segunda pasada screen hace que la luz siga la cresta
sobre los detalles reales del agua. No
añade dependencias, otro contexto WebGL ni acoplamiento entre scroll y cámara.

El botón «Pausar océano» retira el canvas y deja la imagen estática. El perfil
ligero y `prefers-reduced-motion` también lo retiran inicialmente, con un botón
«Activar océano» para el consentimiento explícito. IntersectionObserver y
`visibilitychange` detienen el bucle fuera de pantalla y en segundo plano.
Sin JavaScript siguen disponibles la imagen, la prosa y todos los PDF;
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

Pase de cabina y agua (2026-09-10): `npm run check` completo y 98 pruebas E2E
de `navbar`, `miller` y `smoke` pasan en Chromium de escritorio y móvil. La
cobertura añadida comprueba pausa compartida, consentimiento en perfil ligero,
reduced-motion y suspensión de corrientes fuera de pantalla y en segundo plano.
Revisión visual de hero, menú y archivo en producción a 1440 y 375 px.

Los scripts iniciales modernos de Formación suman ahora 166,47 KiB gzip,
frente a los 164,42 KiB registrados en la primera entrega y 164,35 KiB de la
portada actual. Medición sobre el HTML de producción, sumando cada `src` una
vez; excluye `nomodule`, cargas diferidas y prefetch. No se añaden dependencias
ni recursos gráficos; el archivo reutiliza la imagen de agua ya descargada.

`components/miller-page.test.tsx` cubre integridad del catálogo, archivos,
contenido académico y filtros. `e2e/miller.spec.ts` cubre teclado, PDF reales,
destinos, desbordamiento, movimiento/pausa, segundo plano, fuera de pantalla,
reduced-motion, HTML sin JavaScript y persistencia de la escena al salir.
Se conserva la matriz existente de rutas y banda sonora.

Resultado del pase de revisión: `npm run check` verde (205 tests unitarios y build estático); 88
pruebas E2E de Miller, rutas y música pasan en Chromium de escritorio y móvil.
Revisión visual sobre build de producción a 1440 px y 375 px, además de los
estados filtrados, imágenes individuales, menú móvil y acceso sin JavaScript.
La navbar y los tres conceptos de logo se documentan en
[Identidad de Gargantúa](identity-gargantua.md).

Revisión del bundle de la primera entrega, antes del pase de navbar: los scripts iniciales para navegadores
modernos suman 164,42 KiB gzip en Formación, frente a 164,35 KiB en la portada
actual. El chunk específico compartido por las rutas `[mundo]` pesa 10,05 KiB
gzip e incluye el océano y el archivo. Estas cifras excluyen el polyfill
`nomodule` y las cargas diferidas; no son una puntuación Lighthouse ni una
medición de toda la transferencia tras los prefetch de navegación. El fondo
WebP pesa 190,7 KiB. En el pase actual las 23 miniaturas suman 815 KiB antes de
la optimización de imágenes de Next y se cargan bajo demanda. No se incorporaron dependencias.
