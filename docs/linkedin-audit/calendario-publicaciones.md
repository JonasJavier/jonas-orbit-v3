# Calendario de publicaciones en LinkedIn — oct. y nov. de 2026

Español, martes y jueves a las 9:00 (hora de RD), seis semanas. Aprobado por Jonás el 2 de octubre («que sea bien bonito, con fotos y el link del portafolio»). Cada post cuenta **una** decisión concreta, lleva de 1 a 3 capturas reales del caso y termina con el enlace del caso y el del portafolio. Los datos salen de los casos de estudio y del blog; no hay cifras nuevas.

| # | Fecha | Tema | Fotos |
| ---: | --- | --- | --- |
| 0 | vie 2 oct (hoy) | Presentación del portafolio | Gargantúa · portada · panel de OMSTA |
| 1 | mar 6 oct | OMSTA: una venta se captura una sola vez | panel · factura · asientos |
| 2 | jue 8 oct | La idempotencia va antes que la validación | pago protegido · cobro en la app |
| 3 | mar 13 oct | Delicaté: por qué no le hice un checkout | portada · carrito · ficha |
| 4 | jue 15 oct | Gargantúa: no se dibuja, se sigue la luz | tres vistas del agujero negro |
| 5 | mar 20 oct | Wikiverse: buscar aunque escribas mal | búsqueda · autocompletado · artículo |
| 6 | jue 22 oct | La app móvil de OMSTA en 16 días | inicio · reserva · alta |
| 7 | mar 27 oct | Network: un feed que no repite publicaciones | feed claro · oscuro · móvil |
| 8 | jue 29 oct | Izak's Photos: de 9,3 MB a 2,4 MB | galería · visor · móvil |
| 9 | mar 3 nov | Un portafolio 3D que Google puede leer | sin JavaScript · con WebGL |
| 10 | jue 5 nov | Un sitio bilingüe en Next.js sin middleware | portada del artículo |
| 11 | mar 10 nov | Cómo elegir un desarrollador freelance en RD | servicios · proceso |
| 12 | jue 12 nov | Un teseracto 4D a partir de cuatro bits | portada · instantes |

**Estado (7 oct):** #0 publicado (2 oct) · #1 publicado (mar 6 oct, 9:00) · #2 programado para el jue 8 oct, 9:00 (creado de cero el 7 oct con 2 imágenes: pago protegido y registrar pago en la app; el borrador viejo del 2 oct sigue en LinkedIn sin usar) · #3–#12 pendientes. El 2 oct LinkedIn cortó a la tercera: «You've reached today's posting limit. Verify now…» (cuenta sin verificar). Programar también cuenta para el límite diario.

Las imágenes se generan desde `public/` (capturas de los casos y del blog) convertidas a JPG.

---

## 0 · Hoy — Presentación del portafolio

🚀 Terminé mi portafolio y quería compartirlo con ustedes.

Lo construí como un sistema solar inspirado en Interstellar: seis cuerpos alrededor de un agujero negro, y cada uno es una sección del sitio.

▸ El agujero negro, Gargantúa, no es una imagen. Un shader sigue la luz píxel a píxel alrededor de la masa, y de ahí salen el anillo de fotones, la lente y el disco.
▸ Si tu dispositivo no puede con WebGL, el sitio muestra una versión plana con el mismo contenido.
▸ Está completo en español y en inglés.

Lo 3D llama la atención, pero lo que más me importa está en Proyectos: OMSTA, el ERP que usan a diario 15 personas en CristegnoViajes, además de Delicaté, Network, Wikiverse e Izak's Photos. Cada caso cuenta el problema, las decisiones y lo que construí.

Hecho con Next.js, React, TypeScript, Three.js y GLSL.

Si buscas un desarrollador full-stack o tienes un proyecto en mente, escríbeme. Y si lo abres en el móvil, cuéntame cómo te va 🙌

🌐 Portafolio: https://jonasjavier.dev/es

#DesarrolloWeb #NextJS #ThreeJS #FullStack

## 1 · Mar 6 oct — OMSTA: una venta se captura una sola vez

💼 Una agencia de viajes junta tres mundos que casi nunca hablan entre sí: la venta, el dinero y la contabilidad.

Cuando cada uno vive en una herramienta distinta, el mismo dato se teclea tres veces y los saldos no cuadran.

En OMSTA, el ERP que construí para CristegnoViajes, una venta se captura una sola vez. De ahí salen, sin volver a escribir nada:
▸ el cobro,
▸ la factura con NCF,
▸ los asientos contables,
▸ la cuenta por pagar al proveedor,
▸ y los reportes 606, 607, 608 y 623 para la DGII.

La decisión que más problemas me ahorró: las reglas contables viven en el modelo y en la base de datos, no en los formularios. Un asiento publicado no se reescribe y un período cerrado no admite asientos, venga el cambio de donde venga.

Hoy lo usan 15 personas a diario. Las capturas usan datos sintéticos.

📄 Caso completo: https://jonasjavier.dev/es/proyectos/omsta
🌐 Portafolio: https://jonasjavier.dev/es

#Django #Python #DesarrolloDeSoftware

## 2 · Jue 8 oct — La idempotencia va antes que la validación

🐛 Un error de producción que me enseñó algo sobre el software que mueve dinero.

En OMSTA, la app móvil a veces reenviaba un pago cuando la conexión fallaba. Cada pago ya tenía una clave de idempotencia con una restricción única en la base de datos: si llega dos veces, se devuelve el pago que ya existe en lugar de crear otro.

Aun así, el reintento respondía «posible pago duplicado».

¿Por qué? El formulario validaba antes de que el servicio mirara la clave, así que el segundo envío parecía un duplicado y no un reintento.

✅ La corrección: cambiar el orden. Primero se resuelve la clave y sólo después se valida.

Desde entonces lo tengo como regla: la idempotencia va antes que la validación.

📄 Este y otros incidentes reales: https://jonasjavier.dev/es/proyectos/omsta
🌐 Portafolio: https://jonasjavier.dev/es

#Backend #Django #APIs

## 3 · Mar 13 oct — Delicaté: por qué no le hice un checkout

🧼 Delicaté es una marca dominicana de jabones artesanales que vende por conversación: el cliente pregunta, elige y coordina la entrega por WhatsApp.

La primera versión de su tienda tenía cuentas, carrito en el servidor, reseñas e historial de pedidos. Al reconstruirla me pregunté qué necesitaba de verdad el negocio.

La respuesta: mostrar bien los productos y recibir un pedido claro. Pedir registro para comprar un jabón sólo añade fricción, y un checkout que no puede cobrar es una promesa rota.

La versión nueva:
▸ no pide cuenta ni cobra en línea,
▸ guarda el carrito en el navegador y lo actualiza con los precios y existencias reales,
▸ y «Finalizar por WhatsApp» abre la conversación con el pedido ya escrito.

Pasó de ocho modelos a cuatro y de treinta dependencias en el frontend a dos.

📄 Caso completo: https://jonasjavier.dev/es/proyectos/delicate-4-0
🌐 Portafolio: https://jonasjavier.dev/es

#React #Django #UX

## 4 · Jue 15 oct — Gargantúa: no se dibuja, se sigue la luz

🕳️ La primera versión del agujero negro de mi portafolio era un truco de cinco capas: un disco, un halo y un anillo pintados sobre un plano. Se veía la costura, y una costura es justo lo que delata que algo está dibujado.

La versión actual hace lo contrario. Para cada píxel, un shader lanza un rayo desde la cámara y lo deja caer hacia el agujero negro siguiendo la ecuación de la luz alrededor de una masa:
▸ si el rayo cae, el píxel es negro;
▸ si escapa, toma las estrellas de la dirección en que salió;
▸ si cruza el disco, recoge su luz.

El anillo de fotones, la imagen secundaria y la lente no están programados aparte: salen solos de esa física.

📄 Cómo está hecho, con el código del shader: https://jonasjavier.dev/es/blog/como-hice-un-agujero-negro-en-webgl
🌐 Portafolio: https://jonasjavier.dev/es

#WebGL #ThreeJS #GLSL

## 5 · Mar 20 oct — Wikiverse: buscar aunque escribas mal

📚 Wikiverse empezó en 2024 como el proyecto «Wiki» de CS50W. Este año lo reconstruí como una enciclopedia completa con Django REST Framework, React y PostgreSQL, y escribí sus 63 artículos.

Una de las piezas que más disfruté fue la búsqueda:
▸ Un trigger de PostgreSQL mantiene un vector de texto con pesos distintos para el título, el resumen y el cuerpo.
▸ Si la búsqueda no encuentra nada, se repite con similitud trigram y propone el título más parecido.

Resultado: buscar con una errata sigue llevándote al artículo. Y todo sin un motor de búsqueda aparte, sólo con PostgreSQL.

📄 Caso completo: https://jonasjavier.dev/es/proyectos/wikiverse
🌐 Portafolio: https://jonasjavier.dev/es

#PostgreSQL #Django #React

## 6 · Jue 22 oct — La app móvil de OMSTA en 16 días

📱 Entre el 10 y el 25 de septiembre construí la API y la app móvil de OMSTA con React Native, Expo y TypeScript, sobre el mismo backend que ya usaba la web.

Dos decisiones hicieron posible ese ritmo:

▸ Un contrato. La API genera su esquema OpenAPI y los tipos TypeScript de la app salen de ese esquema. Si la API y la app dejan de coincidir, la integración continua falla antes de llegar a un teléfono.

▸ La app no calcula nada. El servidor le envía los importes ya formateados, los estados con su etiqueta y hasta la forma de los formularios. La regla de negocio existe en un solo sitio, y la web y la app no pueden contradecirse.

Hoy se prueba en un Android real, con reservas, clientes, cobros y avisos funcionando.

📄 Caso completo: https://jonasjavier.dev/es/proyectos/omsta
🌐 Portafolio: https://jonasjavier.dev/es

#ReactNative #TypeScript #OpenAPI

## 7 · Mar 27 oct — Network: un feed que no repite publicaciones

🔁 En una red social, el feed cambia mientras lo lees. Si paginas por número de página y alguien publica, la página siguiente se desplaza y vuelves a ver lo que ya habías leído.

En Network 3.0, la reescritura completa de mi proyecto de CS50W:
▸ Los timelines se paginan por cursor, ordenados por fecha y con el id como desempate. Publicar algo nuevo no mueve la página siguiente.
▸ Cada tarjeta trae sus likes, comentarios y reposts como subconsultas independientes, y cada «¿ya le di like?» es un EXISTS, en lugar de una consulta con varios JOIN.

Django REST Framework, React y TypeScript, con 132 pruebas automatizadas y demo pública.

📄 Caso completo: https://jonasjavier.dev/es/proyectos/network-3-0
🌐 Portafolio: https://jonasjavier.dev/es

#Django #React #TypeScript

## 8 · Jue 29 oct — Izak's Photos: de 9,3 MB a 2,4 MB

📸 Izak's Photos es un sitio de estudio fotográfico de demostración: el estudio es ficticio, pero el software es real y está en línea.

Revisándolo en un teléfono encontré que la galería descargaba los JPEG completos para pintar miniaturas pequeñas: 9,3 MB para recorrerla entera.

Lo que cambié:
▸ Un script genera miniaturas WebP de 720 px, un 74 % más ligeras.
▸ El JPEG completo sólo se pide al abrir una foto en el visor.
▸ Cada foto reserva su proporción real, así que la página no salta mientras carga.

Recorrer la galería en el teléfono pasó de 9,3 MB a 2,4 MB. Es el tipo de mejora que nadie pide y que todo el mundo nota con datos móviles.

📄 Caso completo: https://jonasjavier.dev/es/proyectos/izaks-photos
🌐 Portafolio: https://jonasjavier.dev/es

#Rendimiento #React #DesarrolloWeb

## 9 · Mar 3 nov — Un portafolio 3D que Google puede leer

🔍 Los portafolios 3D tienen mala fama por dos motivos justos: para un buscador suelen ser un canvas vacío, y en un teléfono, una pantalla negra que tarda en arrancar.

En el mío hay una regla que no se negocia: la escena nunca es el contenido.
▸ El HTML de cada página trae el texto real, sin JavaScript.
▸ El canvas va detrás, oculto para los lectores de pantalla y sin una sola palabra dentro.
▸ El nombre está en un h1 de verdad y los seis destinos son enlaces normales.

Si desactivas JavaScript, el sistema se dibuja con SVG y CSS, y todo el contenido sigue ahí (es la primera foto).

📄 Las reglas y las cifras medidas, incluido lo que aún no está resuelto: https://jonasjavier.dev/es/blog/portafolio-3d-webgl-seo-y-rendimiento
🌐 Portafolio: https://jonasjavier.dev/es

#WebGL #SEO #NextJS

## 10 · Jue 5 nov — Un sitio bilingüe en Next.js sin middleware

🌎 Mi portafolio está completo en español y en inglés, y lo hice sin librería de internacionalización y sin middleware, con el App Router de Next.js.

Tres decisiones lo ordenan todo:
▸ Cada idioma tiene su URL. Una página que cambia de idioma según quién pregunta no se puede cachear bien, y un buscador sólo ve uno de los dos.
▸ Las rutas se traducen: /es/sobre-mi y no /es/about, porque quien busca en español escribe en español.
▸ El idioma es el primer segmento de la ruta y ahí vive el layout raíz, así que el atributo lang sale en el HTML servido.

📄 El código real y el porqué de cada decisión: https://jonasjavier.dev/es/blog/sitio-bilingue-en-next-js-sin-middleware
🌐 Portafolio: https://jonasjavier.dev/es

#NextJS #React #SEO

## 11 · Mar 10 nov — Cómo elegir un desarrollador freelance en RD

🤝 Cada cierto tiempo me escribe alguien que pagó por una página o un sistema, recibió algo a medias y ahora no tiene ni el código ni el acceso a su dominio.

Casi nunca es un problema de talento. Es un problema de cómo se contrató: sin alcance escrito, sin avances que ver y sin dejar claro de quién es cada cosa.

Escribí una guía con lo que yo pediría si estuviera del otro lado de la mesa:
▸ qué preguntarte antes de buscar,
▸ por qué mirar casos completos y no capturas,
▸ y qué dejar por escrito antes de empezar.

Sirve para contratarme a mí y sirve igual para contratar a cualquier otro.

📄 La guía: https://jonasjavier.dev/es/blog/como-elegir-un-desarrollador-web-freelance-en-republica-dominicana
🌐 Portafolio: https://jonasjavier.dev/es

#Freelance #RepúblicaDominicana #DesarrolloWeb

## 12 · Jue 12 nov — Un teseracto 4D a partir de cuatro bits

🧊 En la sección de Experimentos de mi portafolio hay un teseracto: un hipercubo que gira en cuatro dimensiones y se proyecta, en cada fotograma, a las tres que la pantalla puede mostrar.

Mi parte favorita es cómo salen sus 16 vértices y 32 aristas:
▸ Cada vértice es un número del 0 al 15, y cada uno de sus cuatro bits dice de qué lado está en un eje: X, Y, Z o W.
▸ Dos vértices comparten arista exactamente cuando sus números difieren en un solo bit.
▸ Un XOR las encuentra todas sin buscar nada.

Dos bucles cortos para un objeto que no se puede imaginar, pero sí dibujar.

📄 Cómo está hecho: https://jonasjavier.dev/es/blog/teseracto-4d-en-three-js
🌐 Portafolio: https://jonasjavier.dev/es

#ThreeJS #WebGL #JavaScript
