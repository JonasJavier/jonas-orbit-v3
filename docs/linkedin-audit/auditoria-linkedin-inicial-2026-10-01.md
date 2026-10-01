# Auditoría de LinkedIn — Jonás Javier Encarnación

Fecha: 1 de octubre de 2026. Revisión previa a cambios. Objetivo provisional: empleo full-stack y clientes freelance con el mismo peso.

## Veredicto

**8/10. El perfil ya es profesional y sirve para presentarte a oportunidades.** La foto, el banner, las dos versiones del resumen y la experiencia están cuidados. La mejora principal consiste en hacer más fácil comprobar tu trabajo, corregir inconsistencias y añadir validación de clientes y compañeros. No hace falta rehacerlo ni llenarlo de más certificados.

Esta es una valoración editorial del perfil, no una nota de LinkedIn ni una evaluación de tu desempeño profesional. No acredita un nivel de seniority, ni garantiza entrevistas o ventas.

| Perspectiva | Nota | Lectura |
| --- | ---: | --- |
| Reclutador | 8,5/10 | Rol y tecnologías claros, trabajo en producción y formación presentada con honestidad. Falta una recomendación profesional y una mejor jerarquía de muestras. |
| Cliente | 7,5/10 | Hay una tienda para una clienta y un ERP operativo. Los servicios y el siguiente paso para contratarte quedan menos claros. Falta validación de quien recibió el trabajo. |
| Desarrollador | 8,5/10 | API tipada, pruebas, datos, despliegue y mantenimiento aportan evidencia. Conviene mostrar decisiones técnicas y el trabajo WebGL, además de enumerar herramientas. |

Rúbrica de la nota global: presentación 9 (15 %), posicionamiento 8,5 (15 %), evidencia de proyectos 9 (25 %), redacción 8,5 (15 %), organización 7,5 (10 %), validación y actividad 3,5 (10 %), consistencia y acceso 7 (10 %). Total ponderado: 7,95, redondeado a 8. La baja actividad describe el estado visible de esta cuenta; no mide tu capacidad.

## Qué revisé

- Foto, banner, titular, «Acerca de», experiencia en inglés y español y canales de contacto.
- Las tres entradas de educación, las cinco certificaciones, los cinco proyectos y las doce aptitudes mediante sus pantallas de detalle.
- Los tres destacados y el CV visible dentro del visor de LinkedIn.
- Actividad, idiomas y presencia de recomendaciones y servicios en el perfil cargado.
- Contenido MDX de Jonás Orbit, casos de estudio, README, tecnologías declaradas en package.json y la nota técnica de Gargantúa.
- Apertura real del caso público de OMSTA, del caso de Delicaté y de la demo de Network. Esta comprobación confirma que cargan, no es una prueba funcional completa.
- Comprobación directa del enlace de LinkedIn que figura en el README y en la imagen del CV.

No modifiqué LinkedIn ni el código del proyecto. No envié mensajes, solicitudes de recomendación ni invitaciones. No ejecuté los repositorios de los otros proyectos: las cifras de usuarios y pruebas están respaldadas por lo que declaran sus casos, no por una auditoría independiente de esas cifras. No hice una auditoría móvil ni una prueba de descarga/lectura ATS del CV: el destacado revisado se muestra como imagen. Tampoco cambié ni comprobé en detalle las preferencias de Open to Work o la visibilidad pública sin sesión.

## Lo que conservaría

**Foto y banner.** El retrato permite reconocerte, transmite cercanía y se ve profesional. El banner tiene identidad, buen contraste y relación con el portafolio. No necesitas otra foto ni un rediseño completo. La legibilidad de su letra pequeña en un teléfono queda por comprobar.

**OMSTA como prueba central.** Quince usuarios diarios, responsabilidad sobre arquitectura, implementación, mantenimiento y producción: eso cuenta mucho más que una lista de cursos. El sistema conecta operación y dinero, y tienes decisiones explicadas en el caso público.

**La distinción entre cliente y demostración.** Delicaté identifica un encargo real; Network se presenta como proyecto independiente y demo; Izak’s Photos declara que es un estudio de demostración. Esa transparencia suma credibilidad.

**La formación.** CS50 aparece como cursos sin titulación universitaria. ITLA indica estudios parciales. Mantendría esa precisión. La formación en marketing y UX complementa el desarrollo, sin convertir el perfil en cinco profesiones distintas.

**El tono.** El español es correcto y el inglés se entiende bien. No encontré un problema general de ortografía o un resumen lleno de frases vacías. La edición propuesta es de enfoque, fluidez y jerarquía.

## Hallazgos y prioridades

### 1. Corregir el enlace de LinkedIn del CV y del portafolio

El perfil activo es:

[Jonás Javier Encarnación](https://www.linkedin.com/in/jon%C3%A1s-javier-encarnaci%C3%B3n-247b50425/).

El enlace `https://www.linkedin.com/in/jonas-javier-247b50425/`, usado en el README y visible en el CV destacado, muestra **“This page doesn’t exist”** al abrirlo. No es sólo una preferencia por una URL más corta: actualmente interrumpe el contacto. Hay una captura de evidencia junto a este informe.

Primero hay que reemplazar los enlaces por el perfil que funciona. Si después quieres una URL breve, se debe comprobar su disponibilidad en LinkedIn y actualizar todos los lugares a la vez. No se debe asumir que `jonasjavier` está disponible.

### 2. Unificar los datos del CV con el sitio

| Dato | CV destacado, lectura visual | Contenido del sitio | Acción |
| --- | --- | --- | --- |
| Multimedia | “approx. 1 year” | Ocho meses de estudios parciales en ITLA | Confirmar y usar la duración exacta en ambos. |
| Bachillerato | 2024 | Año escolar 2021–2022 | Confirmar el año con el documento académico antes de corregirlo. |
| Ubicación | Bonao | Perfil: Santo Domingo Este; sitio: raíces en Bonao y trabajo en Santo Domingo | Distinguir lugar de origen y ubicación profesional actual. No necesariamente es un error. |
| Inicio en CristegnoViajes | Febrero de 2025 | Caso: primer commit en abril de 2025 | No son hechos equivalentes. Confirmar que febrero es el inicio de la relación profesional; abril puede ser el inicio del repositorio. |

El CV visible también describe con menos precisión a Izak’s Photos en la experiencia freelance, aunque lo identifica como demo en proyectos. Conviene mantener esa etiqueta en cada mención relevante. No presentar el estudio como cliente real.

### 3. Ordenar Destacados por capacidad de convencer

Ahora se ven Delicaté, OMSTA y el CV. Para el objetivo mixto, propongo:

1. **OMSTA:** sistema en uso diario y responsabilidad completa.
2. **Delicaté:** entrega para una clienta y adaptación a su forma de vender.
3. **Jonás Orbit:** diseño, frontend y gráficos 3D como diferenciador.
4. **CV descargable:** acceso sencillo al documento, con versión ES y EN.

LinkedIn permite reordenar Destacados e incluir documentos y enlaces. La recomendación del orden es editorial, apoyada en tus pruebas actuales, no una regla del algoritmo. Véase la [ayuda oficial de Destacados](https://www.linkedin.com/help/linkedin/answer/a552452).

Los títulos actuales se cortan en las tarjetas. “OMSTA — ERP usado a diario por 15 personas” y “Delicaté — tienda con pedidos por WhatsApp” comunican antes el motivo para abrirlas. Las capturas actuales son útiles; los subtítulos deben ser breves y los enlaces deben estar fáciles de usar. El CV actual se presenta como imagen de texto denso: mantendría un PDF real con texto seleccionable y un enlace directo, además de una portada legible si se necesita.

### 4. Añadir Jonás Orbit como proyecto, con sustancia técnica

El portafolio se menciona como enlace, pero no figura entre los cinco proyectos. Se pierde una muestra de Next.js, Three.js, WebGL2, GLSL, diseño visual y accesibilidad.

Lo añadiría como proyecto independiente: sitio bilingüe con contenido HTML accesible, escena progresiva y un observatorio de seis objetos. Gargantúa usa trazado de rayos en un shader propio; la nota técnica permite explicar las decisiones y las limitaciones. La formulación debe ser “interpretación interactiva”, sin venderlo como una simulación completa de Kerr ni afirmar rendimiento universal.

No pondría toda esa tecnología en el titular. El eje principal seguiría siendo full-stack; el proyecto 3D aportaría personalidad y diferenciación.

### 5. Mejorar el inicio y el cierre de «Acerca de»

El resumen actual ya está bien. El primer párrafo describe un proceso habitual de desarrollo; antes de desplegarlo, aún no se ve tu evidencia más importante. Pondría pronto que construyes sistemas para uso real y que desarrollaste OMSTA.

Al final, cambiaría la disponibilidad genérica por una invitación concreta: una oportunidad full-stack o un proyecto web/sistema de gestión; mensaje directo o formulario del portafolio. No añadiría tiempos de respuesta, precios ni promesas de resultados que no estén acordados.

Conservaría Python, Django, React, TypeScript y PostgreSQL como núcleo. Añadiría una frase sobre las experiencias 3D y recortaría el catálogo de proyectos para que el texto tenga respiración.

### 6. Redactar la experiencia con problema, decisión y resultado

La experiencia ya tiene cinco puntos pertinentes en OMSTA. El ajuste más valioso es explicar qué protegen las decisiones: reintentos de pagos, integridad contable, permisos y coherencia de la API móvil. Una cifra de 3.164 pruebas tiene contexto cuando se dice que cubren procesos críticos; no es por sí sola una medida de calidad ni cobertura.

La frase inglesa “Built independently an ERP” se puede mejorar a “Independently built an ERP” o “Designed and built an ERP as the sole developer”. “Administrable catalog” se entiende, pero “catalog managed through Django Admin” suena más natural. En el resumen español, “programa de Marketing Digital” evita que un lector interprete “carrera” como grado universitario; el nombre oficial puede conservarse en la credencial.

En Freelance destacaría el trabajo para Delicaté. Izak’s Photos puede seguir en proyectos como demostración. Así la experiencia cuenta encargos y la sección de proyectos reúne también trabajo independiente.

No añadiría mejoras porcentuales de ventas, ahorro de horas o reducción de errores: no hay mediciones de ese impacto en las fuentes revisadas.

### 7. Reordenar y completar aptitudes

El «Acerca de» ya tiene cinco aptitudes principales adecuadas: Python, Django, React.js, TypeScript y PostgreSQL. La lista general muestra **Git y REST APIs primero**. Alinearía ambos órdenes alrededor del núcleo técnico.

Después: Django REST Framework, Full-Stack Development, REST APIs, React Native, Docker, SQL, Redis, Git, pruebas automatizadas, CI/CD y UX/UI. Añadiría Next.js, Three.js, WebGL y GLSL asociadas a Jonás Orbit. GitHub Actions y accesibilidad web también están respaldadas por el proyecto. Deben elegirse los nombres disponibles en el selector de LinkedIn y asociarse a la experiencia o proyecto que los demuestra.

No recomiendo llenar la lista hasta el máximo. El objetivo es que cada aptitud importante tenga evidencia y una prioridad clara.

### 8. Conseguir recomendaciones de trabajo real

No apareció una sección de recomendaciones recibidas en el perfil revisado. Una recomendación del responsable de CristegnoViajes y otra de la clienta de Delicaté aportarían validación externa sobre responsabilidad, comunicación, utilidad y mantenimiento.

Pedir testimonios sobre lo que esas personas vieron directamente; que escriban o validen su propia experiencia. No inventar una recomendación ni pedir a un amigo que se haga pasar por cliente. La [guía oficial de LinkedIn](https://members.linkedin.com/en-gb/create-or-update-your-profile-on-linkedin) recomienda recomendaciones específicas de colegas, responsables o socios cercanos.

### 9. Actividad y red profesional

Estado visible: siete conexiones, siete seguidores, ninguna publicación; el panel mostraba ocho visitas, cero impresiones de publicaciones en los últimos siete días y cero apariciones en búsquedas. Son cifras de una cuenta todavía poco activa. Esta captura no demuestra un problema de palabras clave ni permite diagnosticar cómo funciona el algoritmo.

Empezaría con una publicación por semana durante cuatro semanas:

1. OMSTA: cómo una reserva termina en un cobro y un asiento, mostrando datos sintéticos.
2. Delicaté: por qué un pedido por WhatsApp encajaba mejor en el negocio.
3. Gargantúa: una captura o vídeo breve y una decisión técnica del shader.
4. Una decisión de ingeniería: idempotencia de pagos, contratos OpenAPI o búsqueda de Wikiverse.

Conectar con compañeros, personas con las que has trabajado y profesionales del entorno objetivo. Comentar con aportes concretos. No comprar seguidores ni enviar invitaciones o mensajes en masa. Evaluar conversaciones relevantes y oportunidades, además de visitas.

### 10. Servicios e idiomas

LinkedIn muestra la invitación “Add services”; no vi una sección de servicios activa. Para clientes propondría aplicaciones web y sistemas de gestión, tiendas/sitios administrables y desarrollo de interfaces. Móvil puede aparecer como capacidad respaldada por OMSTA, indicando el estado de ese trabajo. Diseño UX/UI debe estar vinculado a casos concretos.

La versión española del titular, resumen y experiencia está traducida y cuidada. Los proyectos y destacados siguen apareciendo en inglés. Antes de prometer duplicarlos, hay que verificar qué campos permite localizar LinkedIn. Para piezas compartidas, usar títulos comprensibles en ambos mercados y un enlace al portafolio con selector de idioma; el CV puede ofrecer ES y EN.

En certificaciones, marketing aparece en español en el perfil inglés. El nombre oficial de la credencial puede conservarse con una traducción breve. Añadir fechas de emisión cuando estén acreditadas, sin inferir fechas de UX Designer/Researcher. CS50 AI puede figurar como estudio en curso si sigue activo; no como certificación finalizada. El francés básico no necesita entrar en un perfil orientado a desarrollo si no aporta al objetivo.

## Orden de ejecución recomendado

**Primero:** arreglar el enlace roto y confirmar datos académicos; preparar un CV coherente y descargable.

**Después:** editar titular y resumen ES/EN; pulir OMSTA y Freelance; reordenar Destacados, incluir Jonás Orbit y ordenar aptitudes.

**Luego:** activar servicios con una oferta concreta, obtener recomendaciones auténticas y comenzar la actividad. Revisar qué genera conversaciones útiles tras unas semanas.

Foto y banner pueden quedarse. Tampoco hace falta Premium para empezar a mejorar la presentación del trabajo. La base permite presentar candidaturas desde ahora; no hay razón editorial para esperar a tener el perfil “perfecto”.

## Fuentes principales

- Perfil autenticado de Jonás Javier Encarnación, pantallas de detalles y visor de medios de LinkedIn, consultados el 1 de octubre de 2026.
- Casos MDX en `content/es/projects/`: OMSTA, Delicaté, Network, Wikiverse e Izak’s Photos; formación en `content/es/worlds/miller.mdx`.
- `content/es/articles/gargantua-webgl.mdx`, `README.md`, `package.json` y la entrada SEO del registro del 29 de septiembre.
- [Caso público de OMSTA](https://jonasjavier.dev/en/projects/omsta) y [caso de Delicaté](https://jonasjavier.dev/en/projects/delicate-4-0), verificados en navegador.
- [Ayuda de Destacados](https://www.linkedin.com/help/linkedin/answer/a552452) y [guía oficial de perfil y recomendaciones](https://members.linkedin.com/en-gb/create-or-update-your-profile-on-linkedin).

Los textos concretos para una siguiente edición están en `textos-propuestos.md`. Son borradores preparados para revisión; no están publicados.
