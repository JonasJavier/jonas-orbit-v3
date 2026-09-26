# Network — manifiesto de capturas

78 capturas del **2026-09-26**, commit `e90c581`, contra la base de datos demo
local descrita en `scripts/README.md`.

- **Escritorio**: 1440 × 900, `deviceScaleFactor: 2` → archivo de 2880 × 1800.
- **Móvil**: 390 × 844, `deviceScaleFactor: 2` → archivo de 780 × 1688.
- Animaciones y transiciones desactivadas, cursor de texto oculto, zona horaria UTC,
  y espera a que las fuentes web estén listas antes de disparar.
- Las URL son de la instancia local (`http://127.0.0.1:5199` para la app, `http://127.0.0.1:8001`
  para la API). **No aparecen en ninguna imagen**: las capturas no incluyen el
  cromo del navegador.

- Las 75 primeras son el run principal (`capture.mjs`). Las **76, 77 y 78** se
  añadieron después con `capture-login-variants.mjs`: la pantalla de acceso **con**
  el ayudante de cuentas demo visible, que Jonás ha decidido publicar.
- `principales/` conserva los mismos nombres de archivo que `raw/`. Falta la 17,
  y el motivo está en `excluded.md`.


---


## Escritorio


### `01-login-desktop.png`

- **Pantalla**: Inicio de sesión
- **URL**: `/login`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Panel de marca a la izquierda con tres beneficios y formulario de acceso a la derecha.
- **Por qué importa**: Es la primera pantalla de cualquier visitante y fija el tono visual del producto.
- **Alt**: Pantalla de inicio de sesión de Network con panel de marca morado y formulario de acceso
- **Caption**: El acceso presenta el producto antes de pedir nada.

### `02-login-error-desktop.png`

- **Pantalla**: Inicio de sesión · error
- **URL**: `/login`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Credenciales inválidas con aviso en rojo bajo los campos, sin recargar la página.
- **Por qué importa**: Demuestra que los estados de error están diseñados, no delegados al navegador.
- **Alt**: Formulario de acceso mostrando el aviso de credenciales inválidas
- **Caption**: El error aparece junto al formulario, nunca en una página aparte.

### `03-register-desktop.png`

- **Pantalla**: Registro
- **URL**: `/register`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Alta con nombre, apellidos, usuario, email, contraseña y confirmación.
- **Por qué importa**: Registrarse devuelve ya la sesión iniciada: una pantalla en vez de dos.
- **Alt**: Formulario de registro de Network con seis campos y botón de crear cuenta
- **Caption**: Crear la cuenta deja al usuario dentro, sin un segundo paso.

### `04-feed-desktop.png`

- **Pantalla**: Feed · For you
- **URL**: `/`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Feed de tres columnas: perfil y navegación, publicaciones, descubrimiento.
- **Por qué importa**: Es la vista central del producto y donde converge todo el modelo de datos.
- **Alt**: Feed principal de Network con editor, publicaciones, sugerencias y hashtags en tendencia
- **Caption**: Publicar, conversar y descubrir personas en una sola vista.

### `05-feed-loading-skeleton-desktop.png`

- **Pantalla**: Feed · carga
- **URL**: `/`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Esqueletos con la geometría exacta de la tarjeta real mientras llega la primera página.
- **Por qué importa**: El layout no salta al llegar el contenido: el hueco ya tiene el tamaño correcto.
- **Alt**: Feed de Network mostrando tres tarjetas esqueleto mientras cargan las publicaciones
- **Caption**: El esqueleto reserva el sitio exacto que ocupará la tarjeta.

### `06-feed-infinite-scroll-desktop.png`

- **Pantalla**: Feed · scroll infinito
- **URL**: `/`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Segunda página cargada tras llegar al final, con repost y publicación original.
- **Por qué importa**: La paginación por cursor mantiene el orden estable mientras se publica contenido nuevo.
- **Alt**: Feed de Network desplazado mostrando publicaciones de la segunda página cargada
- **Caption**: El cursor evita que la página dos repita lo ya leído.

### `07-feed-following-desktop.png`

- **Pantalla**: Feed · Following
- **URL**: `/?feed=following`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Mismo feed filtrado a las personas seguidas, más las publicaciones propias.
- **Por qué importa**: Separa descubrimiento de seguimiento sin cambiar de pantalla.
- **Alt**: Feed de Network con la pestaña Following activa
- **Caption**: La pestaña Following incluye también lo que publicas tú.

### `08-composer-with-image-desktop.png`

- **Pantalla**: Crear publicación
- **URL**: `/`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Editor abierto con texto, hashtags e imagen adjunta en previsualización.
- **Por qué importa**: La imagen se ve antes de enviar y el servidor la reescribe a WebP al recibirla.
- **Alt**: Editor de publicación de Network con texto y una imagen en previsualización
- **Caption**: La imagen se previsualiza antes de enviarla, con opción de quitarla.

### `09-post-options-menu-desktop.png`

- **Pantalla**: Menú de publicación
- **URL**: `/profile/mira.kessel`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Menú contextual con copiar enlace, marcador, editar y borrar.
- **Por qué importa**: Las acciones destructivas quedan fuera de la vista hasta que se piden.
- **Alt**: Menú contextual de una publicación con opciones de copiar enlace, marcador, editar y borrar
- **Caption**: Editar y borrar sólo aparecen sobre las publicaciones propias.

### `10-post-editing-desktop.png`

- **Pantalla**: Editar publicación
- **URL**: `/profile/mira.kessel`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: El contenido se sustituye por un área editable con Guardar y Cancelar, sin recargar.
- **Por qué importa**: Es el requisito de edición sin recarga del enunciado original, resuelto dentro del SPA.
- **Alt**: Publicación en modo edición con área de texto, contador y botones de guardar y cancelar
- **Caption**: La edición ocurre en el sitio, sin abrir otra pantalla.

### `11-post-delete-confirm-desktop.png`

- **Pantalla**: Borrar publicación
- **URL**: `/profile/mira.kessel`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Diálogo que nombra lo que se pierde: respuestas, likes y reposts.
- **Por qué importa**: El diálogo informa de la consecuencia concreta en vez de preguntar si estás seguro.
- **Alt**: Diálogo de confirmación para borrar una publicación, indicando qué más se eliminará
- **Caption**: El diálogo nombra la consecuencia exacta, no sólo la acción.

### `12-quote-modal-desktop.png`

- **Pantalla**: Citar publicación
- **URL**: `/post/:id`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Modal de cita con el original embebido debajo del área de texto.
- **Por qué importa**: Repost y cita comparten modelo; la cita añade contenido propio sobre el original.
- **Alt**: Modal de cita de Network con la publicación original embebida bajo el campo de texto
- **Caption**: Al citar se ve el original completo, imagen incluida.

### `13-post-likes-list-desktop.png`

- **Pantalla**: Quién dio like
- **URL**: `/post/:id`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Modal con las personas que dieron like, su relación contigo y el botón de seguir.
- **Por qué importa**: Convierte un contador en una lista accionable de personas por descubrir.
- **Alt**: Modal Liked by con tres personas, su titular profesional y botones de seguimiento
- **Caption**: El contador de likes se abre como lista de personas.

### `14-post-detail-comments-desktop.png`

- **Pantalla**: Publicación y comentarios
- **URL**: `/post/:id`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Detalle con la publicación completa, caja de comentario y el hilo debajo.
- **Por qué importa**: Muestra la conversación entera, con respuestas anidadas de un nivel.
- **Alt**: Detalle de una publicación de Network con su imagen y el hilo de comentarios
- **Caption**: El detalle reúne la publicación y toda su conversación.

### `15-post-detail-comment-deeplink-desktop.png`

- **Pantalla**: Comentario enlazado
- **URL**: `/post/:id?comment=:commentId`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: El comentario de destino resaltado con un anillo tras llegar desde una notificación.
- **Por qué importa**: El enlace profundo no deja al usuario buscando en el hilo: señala el comentario exacto.
- **Alt**: Hilo de comentarios con uno de ellos resaltado por haber llegado desde una notificación
- **Caption**: La notificación lleva al comentario exacto y lo resalta.

### `16-comment-reply-composer-desktop.png`

- **Pantalla**: Responder a un comentario
- **URL**: `/post/:id`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Caja de respuesta abierta bajo el comentario, con la respuesta ya escrita.
- **Por qué importa**: Las respuestas se escriben en su sitio, sin abrir otra vista ni perder el contexto.
- **Alt**: Caja de respuesta abierta bajo un comentario dentro del hilo de una publicación
- **Caption**: Responder ocurre bajo el comentario, sin salir del hilo.

### `17-image-lightbox-desktop.png`

- **Pantalla**: Visor de imagen
- **URL**: `/post/:id`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: **no** — ver `excluded.md`
- **Qué muestra**: Superposición a pantalla completa con la imagen de la publicación.
- **Por qué importa**: Funciona, pero la imagen demo es un degradado abstracto y la captura no comunica nada.
- **Alt**: Visor de imagen a pantalla completa mostrando una imagen abstracta
- **Caption**: El visor ocupa la pantalla; se cierra con botón, clic fuera o Escape.

### `18-profile-own-desktop.png`

- **Pantalla**: Perfil propio
- **URL**: `/profile/mira.kessel`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Portada, avatar, titular, biografía, ubicación, web, alta y tres contadores.
- **Por qué importa**: Un perfil es identidad, relaciones y contenido en una sola pantalla.
- **Alt**: Perfil propio en Network con portada, datos, contadores y pestañas
- **Caption**: El perfil une identidad, relaciones y contenido publicado.

### `19-profile-media-grid-desktop.png`

- **Pantalla**: Perfil · Media
- **URL**: `/profile/mira.kessel?tab=media`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Rejilla cuadrada de tres columnas con las imágenes publicadas por esa persona.
- **Por qué importa**: Da una segunda forma de recorrer un perfil, visual en vez de cronológica.
- **Alt**: Rejilla de imágenes de un perfil de Network en tres columnas
- **Caption**: La pestaña Media recorre el perfil por imagen, no por fecha.

### `20-profile-likes-tab-desktop.png`

- **Pantalla**: Perfil · Likes
- **URL**: `/profile/mira.kessel?tab=likes`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Las publicaciones a las que esa persona ha dado like.
- **Por qué importa**: Convierte una acción privada en una señal pública de intereses.
- **Alt**: Pestaña Likes de un perfil de Network con las publicaciones que esa persona marcó
- **Caption**: Los likes de una persona también cuentan quién es.

### `21-profile-edit-modal-desktop.png`

- **Pantalla**: Editar perfil
- **URL**: `/profile/mira.kessel`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Modal con portada, avatar, nombre, titular y biografía con contadores de caracteres.
- **Por qué importa**: Toda la edición del perfil cabe en un modal, sin una pantalla de ajustes aparte.
- **Alt**: Modal de edición de perfil con portada, avatar y campos de texto con contadores
- **Caption**: Editar el perfil entero sin salir del perfil.

### `22-profile-followers-modal-desktop.png`

- **Pantalla**: Seguidores
- **URL**: `/profile/mira.kessel?tab=followers`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Modal con la lista de seguidores, su relación contigo y su botón.
- **Por qué importa**: Es enlazable por URL, así que una lista de personas se puede compartir.
- **Alt**: Modal de seguidores con siete personas, insignias Follows you y botones de seguimiento
- **Caption**: La lista de seguidores tiene URL propia y se puede compartir.

### `23-profile-following-modal-desktop.png`

- **Pantalla**: Seguidos
- **URL**: `/profile/mira.kessel?tab=following`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Modal con las personas que ese perfil sigue.
- **Por qué importa**: Cierra el grafo de relaciones en las dos direcciones desde el mismo sitio.
- **Alt**: Modal de personas seguidas con sus titulares profesionales y botones de seguimiento
- **Caption**: El grafo se recorre en las dos direcciones desde el perfil.

### `24-profile-other-person-desktop.png`

- **Pantalla**: Perfil ajeno
- **URL**: `/profile/felix.nakamura`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Perfil de otra persona con botón Seguir y la insignia Follows you.
- **Por qué importa**: La insignia responde a la pregunta que todo el mundo se hace al abrir un perfil.
- **Alt**: Perfil de otra persona en Network con botón de seguir y la insignia Follows you
- **Caption**: La insignia Follows you resuelve la relación de un vistazo.

### `25-notifications-desktop.png`

- **Pantalla**: Notificaciones
- **URL**: `/notifications`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Los ocho tipos de actividad, cada uno con icono y color propios, y las no leídas destacadas.
- **Por qué importa**: Es donde se ve que la actividad es un dominio propio y no un añadido al feed.
- **Alt**: Centro de notificaciones de Network con ocho tipos de actividad diferenciados por icono y color
- **Caption**: Cada tipo de actividad se distingue por icono, color y frase.

### `26-notifications-clear-confirm-desktop.png`

- **Pantalla**: Vaciar notificaciones
- **URL**: `/notifications`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Confirmación antes de borrar toda la lista.
- **Por qué importa**: La acción masiva pide confirmación y dice exactamente qué elimina.
- **Alt**: Diálogo de confirmación para borrar todas las notificaciones
- **Caption**: Vaciar la lista pide confirmación y explica su alcance.

### `27-bookmarks-desktop.png`

- **Pantalla**: Marcadores
- **URL**: `/bookmarks`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Las publicaciones guardadas, con la aclaración de que la lista es privada.
- **Por qué importa**: La única lista del producto que nadie más ve, y la interfaz lo dice.
- **Alt**: Página de marcadores de Network con las publicaciones guardadas
- **Caption**: La lista guardada es privada y la pantalla lo dice.

### `28-search-idle-trending-desktop.png`

- **Pantalla**: Búsqueda · inicio
- **URL**: `/search`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Caja de búsqueda vacía con explicación de qué se puede buscar y los hashtags en tendencia.
- **Por qué importa**: Una búsqueda vacía no está vacía: propone por dónde empezar.
- **Alt**: Página de búsqueda de Network sin consulta, con hashtags en tendencia
- **Caption**: La búsqueda sin consulta propone temas en vez de quedarse vacía.

### `29-search-people-desktop.png`

- **Pantalla**: Búsqueda · personas
- **URL**: `/search?q=engineer`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Resultados de personas por nombre, usuario o titular, con contador en la pestaña.
- **Por qué importa**: La búsqueda cubre el titular profesional, no sólo el nombre.
- **Alt**: Resultados de búsqueda de personas en Network con ocho perfiles y sus botones de seguimiento
- **Caption**: Buscar personas incluye el titular, no sólo el nombre.

### `30-search-posts-desktop.png`

- **Pantalla**: Búsqueda · publicaciones
- **URL**: `/search?q=pagination`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Resultados por contenido de la publicación, en la pestaña Posts.
- **Por qué importa**: Una sola caja resuelve dos tipos de resultado sin obligar a elegir antes.
- **Alt**: Resultados de búsqueda de publicaciones en Network para el término pagination
- **Caption**: La misma caja busca personas y contenido de publicaciones.

### `31-search-hashtag-desktop.png`

- **Pantalla**: Búsqueda · hashtag
- **URL**: `/search?q=%23design`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Publicaciones etiquetadas con un hashtag, con encabezado propio.
- **Por qué importa**: Escribir con # cambia el modo de búsqueda sin un control adicional.
- **Alt**: Resultados de publicaciones etiquetadas con el hashtag design en Network
- **Caption**: Escribir con # salta directamente a las publicaciones del tema.

### `32-search-no-results-desktop.png`

- **Pantalla**: Búsqueda sin resultados
- **URL**: `/search?q=qwertzuiop`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Estado vacío con el término buscado y una sugerencia de qué probar.
- **Por qué importa**: El vacío repite lo buscado y propone la siguiente acción.
- **Alt**: Estado vacío de búsqueda en Network indicando que no hay personas para ese término
- **Caption**: El vacío repite el término buscado y sugiere qué probar.

### `33-account-menu-desktop.png`

- **Pantalla**: Menú de cuenta
- **URL**: `/`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Menú del avatar con perfil, marcadores, ajustes y cerrar sesión.
- **Por qué importa**: En móvil es la vía de acceso a lo que no cabe en la barra inferior.
- **Alt**: Menú desplegable de cuenta con perfil, marcadores, ajustes y cerrar sesión
- **Caption**: El menú de cuenta reúne lo que no cabe en la navegación.

### `34-settings-desktop.png`

- **Pantalla**: Ajustes
- **URL**: `/settings`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Perfil, apariencia, contraseña y zona peligrosa, en ese orden.
- **Por qué importa**: Las opciones se ordenan de rutinarias a irreversibles.
- **Alt**: Página de ajustes de Network con secciones de perfil, apariencia y contraseña
- **Caption**: Los ajustes van de lo rutinario a lo irreversible.

### `35-settings-delete-account-modal-desktop.png`

- **Pantalla**: Borrar cuenta
- **URL**: `/settings`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Diálogo que enumera lo que se pierde y exige la contraseña para confirmar.
- **Por qué importa**: Lo irreversible se nombra con detalle y pide una prueba de identidad.
- **Alt**: Diálogo de borrado de cuenta que enumera lo que se elimina y pide la contraseña
- **Caption**: Borrar la cuenta enumera lo que se pierde y pide contraseña.

### `36-not-found-404-desktop.png`

- **Pantalla**: Página no encontrada
- **URL**: `/a-page-that-does-not-exist`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Error 404 con la marca y un camino de vuelta.
- **Por qué importa**: Hasta el error tiene diseño y una salida clara.
- **Alt**: Página 404 de Network con el logotipo y un botón para volver al feed
- **Caption**: El 404 mantiene la marca y ofrece una salida.

### `37-empty-following-feed-desktop.png`

- **Pantalla**: Vacío · feed de seguidos
- **URL**: `/?feed=following`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Cuenta recién creada: el feed de seguidos explica qué irá ahí y cómo llenarlo.
- **Por qué importa**: El primer día de un usuario es una pantalla vacía; aquí está diseñada.
- **Alt**: Feed de seguidos vacío en una cuenta nueva, con explicación y enlace para buscar personas
- **Caption**: El vacío explica qué irá ahí y enlaza a la acción.

### `38-empty-bookmarks-desktop.png`

- **Pantalla**: Vacío · marcadores
- **URL**: `/bookmarks`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Marcadores sin nada guardado, indicando qué icono los crea.
- **Por qué importa**: El vacío enseña el gesto que lo resuelve.
- **Alt**: Página de marcadores vacía indicando cómo guardar una publicación
- **Caption**: El vacío enseña el gesto exacto que lo resuelve.

### `39-empty-notifications-desktop.png`

- **Pantalla**: Vacío · notificaciones
- **URL**: `/notifications`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Sin actividad todavía, enumerando qué tipos de aviso aparecerán.
- **Por qué importa**: El vacío anticipa qué va a pasar en esa pantalla.
- **Alt**: Centro de notificaciones vacío en una cuenta nueva de Network
- **Caption**: El vacío anticipa qué avisos llegarán a esta pantalla.

### `40-empty-own-profile-desktop.png`

- **Pantalla**: Vacío · perfil nuevo
- **URL**: `/profile/noah.fielding`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Perfil recién creado, sin avatar, sin portada y sin publicaciones.
- **Por qué importa**: Un perfil vacío sigue siendo presentable y empuja a la primera publicación.
- **Alt**: Perfil recién creado en Network sin publicaciones, con avatar de iniciales
- **Caption**: Un perfil sin contenido sigue siendo presentable.

### `41-feed-dark-desktop.png`

- **Pantalla**: Feed · modo oscuro
- **URL**: `/`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: El mismo feed con el tema oscuro aplicado.
- **Por qué importa**: El oscuro no es un filtro invertido: los bordes sustituyen a las sombras.
- **Alt**: Feed de Network en modo oscuro con publicaciones, sugerencias y tendencias
- **Caption**: En oscuro los bordes hacen el trabajo que hacían las sombras.

### `42-post-detail-dark-desktop.png`

- **Pantalla**: Publicación · modo oscuro
- **URL**: `/post/:id`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Detalle de publicación y comentarios en tema oscuro.
- **Por qué importa**: Confirma que la jerarquía de la conversación se mantiene al cambiar de tema.
- **Alt**: Detalle de una publicación de Network en modo oscuro con su hilo de comentarios
- **Caption**: La jerarquía del hilo se mantiene al cambiar de tema.

### `43-profile-own-dark-desktop.png`

- **Pantalla**: Perfil · modo oscuro
- **URL**: `/profile/mira.kessel`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Perfil propio en tema oscuro.
- **Por qué importa**: La portada en degradado sigue funcionando sobre fondo oscuro.
- **Alt**: Perfil propio de Network en modo oscuro con portada y contadores
- **Caption**: La portada en degradado también funciona sobre fondo oscuro.

### `44-notifications-dark-desktop.png`

- **Pantalla**: Notificaciones · modo oscuro
- **URL**: `/notifications`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Los ocho verbos con sus colores adaptados al tema oscuro.
- **Por qué importa**: Cada color de verbo tiene su variante oscura, no una opacidad rebajada.
- **Alt**: Centro de notificaciones de Network en modo oscuro con los ocho tipos de actividad
- **Caption**: Cada color de aviso tiene su propia variante oscura.

### `45-search-hashtag-dark-desktop.png`

- **Pantalla**: Hashtag · modo oscuro
- **URL**: `/search?q=%23sre`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Resultados por hashtag en tema oscuro.
- **Por qué importa**: Los enlaces de hashtag conservan contraste suficiente sobre fondo oscuro.
- **Alt**: Resultados de un hashtag en Network en modo oscuro
- **Caption**: Los enlaces de hashtag conservan contraste sobre fondo oscuro.

### `46-settings-dark-desktop.png`

- **Pantalla**: Ajustes · modo oscuro
- **URL**: `/settings`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Ajustes en tema oscuro, con la opción Dark seleccionada.
- **Por qué importa**: La propia pantalla que cambia el tema se ve en los dos temas.
- **Alt**: Página de ajustes de Network en modo oscuro con la opción Dark seleccionada
- **Caption**: La pantalla que cambia el tema, vista en ese mismo tema.

### `47-bookmarks-dark-desktop.png`

- **Pantalla**: Marcadores · modo oscuro
- **URL**: `/bookmarks`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Lista de guardados en tema oscuro.
- **Por qué importa**: Completa la cobertura del tema oscuro en las pantallas de lista.
- **Alt**: Página de marcadores de Network en modo oscuro
- **Caption**: Las pantallas de lista también están resueltas en oscuro.

### `48-login-dark-desktop.png`

- **Pantalla**: Acceso · modo oscuro
- **URL**: `/login`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Pantalla de acceso con el tema oscuro aplicado.
- **Por qué importa**: El tema se resuelve antes de montar React, así que no hay parpadeo en la primera pantalla.
- **Alt**: Pantalla de inicio de sesión de Network en modo oscuro
- **Caption**: El tema se aplica antes de montar React: sin parpadeo inicial.

### `49-api-docs-swagger-desktop.png`

- **Pantalla**: API · Swagger UI
- **URL**: `/api/docs/`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Documentación interactiva generada del código, agrupada por dominio.
- **Por qué importa**: Es la prueba de que la API está documentada y de que el esquema sale del código.
- **Alt**: Swagger UI de la API de Network mostrando los endpoints de autenticación y comentarios
- **Caption**: La documentación se genera del código y no puede quedarse vieja.

### `50-api-docs-redoc-desktop.png`

- **Pantalla**: API · ReDoc
- **URL**: `/api/redoc/`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Misma especificación en formato de referencia, con esquemas y ejemplos de petición.
- **Por qué importa**: Dos lecturas del mismo esquema: una para probar, otra para leer.
- **Alt**: ReDoc de la API de Network con la navegación por dominios y un ejemplo de petición
- **Caption**: El mismo esquema, en formato de referencia para leer.

### `76-login-demo-accounts-desktop.png`

- **Pantalla**: Acceso · con cuentas demo
- **URL**: `/login`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: Acceso con el ayudante de cuentas demo visible: cuatro atajos y la contraseña compartida.
- **Por qué importa**: Es el estado por defecto del producto y el que ve cualquiera que abra la demo pública.
- **Alt**: Pantalla de acceso de Network con el recuadro de cuentas demo y su contraseña
- **Caption**: La demo pública ofrece cuentas de prueba con un solo clic.

### `77-login-demo-accounts-dark-desktop.png`

- **Pantalla**: Acceso · con cuentas demo, oscuro
- **URL**: `/login`
- **Viewport**: 1440 × 900 @2x
- **En `principales/`**: sí
- **Qué muestra**: La misma variante con el ayudante de cuentas demo, en tema oscuro.
- **Por qué importa**: Confirma que el recuadro de cuentas demo también está resuelto en oscuro.
- **Alt**: Pantalla de acceso de Network en modo oscuro con el recuadro de cuentas demo
- **Caption**: El recuadro de cuentas demo también está resuelto en oscuro.

## Móvil


### `51-login-mobile.png`

- **Pantalla**: Inicio de sesión
- **URL**: `/login`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Panel de marca a la izquierda con tres beneficios y formulario de acceso a la derecha.
- **Por qué importa**: Es la primera pantalla de cualquier visitante y fija el tono visual del producto.
- **Alt**: Pantalla de inicio de sesión de Network con panel de marca morado y formulario de acceso
- **Caption**: El acceso cabe entero en pantalla, sin desplazamiento.

### `52-register-mobile.png`

- **Pantalla**: Registro
- **URL**: `/register`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Alta con nombre, apellidos, usuario, email, contraseña y confirmación.
- **Por qué importa**: Registrarse devuelve ya la sesión iniciada: una pantalla en vez de dos.
- **Alt**: Formulario de registro de Network con seis campos y botón de crear cuenta
- **Caption**: El alta se apila en una columna en pantalla estrecha.

### `53-feed-mobile.png`

- **Pantalla**: Feed · For you
- **URL**: `/`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Feed de tres columnas: perfil y navegación, publicaciones, descubrimiento.
- **Por qué importa**: Es la vista central del producto y donde converge todo el modelo de datos.
- **Alt**: Feed principal de Network con editor, publicaciones, sugerencias y hashtags en tendencia
- **Caption**: En móvil el feed es una columna y la navegación baja.

### `54-feed-following-mobile.png`

- **Pantalla**: Feed · Following
- **URL**: `/?feed=following`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Mismo feed filtrado a las personas seguidas, más las publicaciones propias.
- **Por qué importa**: Separa descubrimiento de seguimiento sin cambiar de pantalla.
- **Alt**: Feed de Network con la pestaña Following activa
- **Caption**: La pestaña Following se mantiene en la versión móvil.

### `55-composer-with-image-mobile.png`

- **Pantalla**: Crear publicación
- **URL**: `/`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Editor abierto con texto, hashtags e imagen adjunta en previsualización.
- **Por qué importa**: La imagen se ve antes de enviar y el servidor la reescribe a WebP al recibirla.
- **Alt**: Editor de publicación de Network con texto y una imagen en previsualización
- **Caption**: El editor y su previsualización funcionan igual en móvil.

### `56-quote-modal-mobile.png`

- **Pantalla**: Citar publicación
- **URL**: `/post/:id`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Modal de cita con el original embebido debajo del área de texto.
- **Por qué importa**: Repost y cita comparten modelo; la cita añade contenido propio sobre el original.
- **Alt**: Modal de cita de Network con la publicación original embebida bajo el campo de texto
- **Caption**: El modal de cita se convierte en hoja inferior en móvil.

### `57-post-detail-comments-mobile.png`

- **Pantalla**: Publicación y comentarios
- **URL**: `/post/:id`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Detalle con la publicación completa, caja de comentario y el hilo debajo.
- **Por qué importa**: Muestra la conversación entera, con respuestas anidadas de un nivel.
- **Alt**: Detalle de una publicación de Network con su imagen y el hilo de comentarios
- **Caption**: El hilo completo se lee en una sola columna.

### `58-comment-reply-composer-mobile.png`

- **Pantalla**: Responder a un comentario
- **URL**: `/post/:id`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Caja de respuesta abierta bajo el comentario, con la respuesta ya escrita.
- **Por qué importa**: Las respuestas se escriben en su sitio, sin abrir otra vista ni perder el contexto.
- **Alt**: Caja de respuesta abierta bajo un comentario dentro del hilo de una publicación
- **Caption**: Responder en móvil ocurre igualmente bajo el comentario.

### `59-profile-own-mobile.png`

- **Pantalla**: Perfil propio
- **URL**: `/profile/mira.kessel`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Portada, avatar, titular, biografía, ubicación, web, alta y tres contadores.
- **Por qué importa**: Un perfil es identidad, relaciones y contenido en una sola pantalla.
- **Alt**: Perfil propio en Network con portada, datos, contadores y pestañas
- **Caption**: El perfil reordena portada, datos y pestañas en vertical.

### `60-profile-media-grid-mobile.png`

- **Pantalla**: Perfil · Media
- **URL**: `/profile/mira.kessel?tab=media`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Rejilla cuadrada de tres columnas con las imágenes publicadas por esa persona.
- **Por qué importa**: Da una segunda forma de recorrer un perfil, visual en vez de cronológica.
- **Alt**: Rejilla de imágenes de un perfil de Network en tres columnas
- **Caption**: La rejilla de medios pasa de tres columnas a dos.

### `61-profile-followers-modal-mobile.png`

- **Pantalla**: Seguidores
- **URL**: `/profile/mira.kessel?tab=followers`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Modal con la lista de seguidores, su relación contigo y su botón.
- **Por qué importa**: Es enlazable por URL, así que una lista de personas se puede compartir.
- **Alt**: Modal de seguidores con siete personas, insignias Follows you y botones de seguimiento
- **Caption**: Las listas de personas suben como hoja inferior.

### `62-profile-other-person-mobile.png`

- **Pantalla**: Perfil ajeno
- **URL**: `/profile/felix.nakamura`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Perfil de otra persona con botón Seguir y la insignia Follows you.
- **Por qué importa**: La insignia responde a la pregunta que todo el mundo se hace al abrir un perfil.
- **Alt**: Perfil de otra persona en Network con botón de seguir y la insignia Follows you
- **Caption**: El perfil ajeno conserva el botón de seguir en móvil.

### `63-notifications-mobile.png`

- **Pantalla**: Notificaciones
- **URL**: `/notifications`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Los ocho tipos de actividad, cada uno con icono y color propios, y las no leídas destacadas.
- **Por qué importa**: Es donde se ve que la actividad es un dominio propio y no un añadido al feed.
- **Alt**: Centro de notificaciones de Network con ocho tipos de actividad diferenciados por icono y color
- **Caption**: Los ocho tipos siguen diferenciados en pantalla estrecha.

### `64-bookmarks-mobile.png`

- **Pantalla**: Marcadores
- **URL**: `/bookmarks`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Las publicaciones guardadas, con la aclaración de que la lista es privada.
- **Por qué importa**: La única lista del producto que nadie más ve, y la interfaz lo dice.
- **Alt**: Página de marcadores de Network con las publicaciones guardadas
- **Caption**: Los marcadores se leen igual de bien en una columna.

### `65-search-idle-trending-mobile.png`

- **Pantalla**: Búsqueda · inicio
- **URL**: `/search`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Caja de búsqueda vacía con explicación de qué se puede buscar y los hashtags en tendencia.
- **Por qué importa**: Una búsqueda vacía no está vacía: propone por dónde empezar.
- **Alt**: Página de búsqueda de Network sin consulta, con hashtags en tendencia
- **Caption**: Los temas en tendencia se envuelven en varias líneas.

### `66-search-people-mobile.png`

- **Pantalla**: Búsqueda · personas
- **URL**: `/search?q=engineer`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Resultados de personas por nombre, usuario o titular, con contador en la pestaña.
- **Por qué importa**: La búsqueda cubre el titular profesional, no sólo el nombre.
- **Alt**: Resultados de búsqueda de personas en Network con ocho perfiles y sus botones de seguimiento
- **Caption**: Los resultados de personas mantienen su botón de acción.

### `67-search-hashtag-mobile.png`

- **Pantalla**: Búsqueda · hashtag
- **URL**: `/search?q=%23design`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Publicaciones etiquetadas con un hashtag, con encabezado propio.
- **Por qué importa**: Escribir con # cambia el modo de búsqueda sin un control adicional.
- **Alt**: Resultados de publicaciones etiquetadas con el hashtag design en Network
- **Caption**: La búsqueda por hashtag funciona igual en móvil.

### `68-account-menu-mobile.png`

- **Pantalla**: Menú de cuenta
- **URL**: `/`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Menú del avatar con perfil, marcadores, ajustes y cerrar sesión.
- **Por qué importa**: En móvil es la vía de acceso a lo que no cabe en la barra inferior.
- **Alt**: Menú desplegable de cuenta con perfil, marcadores, ajustes y cerrar sesión
- **Caption**: El menú de cuenta da acceso a lo que no cabe abajo.

### `69-settings-mobile.png`

- **Pantalla**: Ajustes
- **URL**: `/settings`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Perfil, apariencia, contraseña y zona peligrosa, en ese orden.
- **Por qué importa**: Las opciones se ordenan de rutinarias a irreversibles.
- **Alt**: Página de ajustes de Network con secciones de perfil, apariencia y contraseña
- **Caption**: Los ajustes se apilan manteniendo el mismo orden.

### `70-not-found-404-mobile.png`

- **Pantalla**: Página no encontrada
- **URL**: `/a-page-that-does-not-exist`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Error 404 con la marca y un camino de vuelta.
- **Por qué importa**: Hasta el error tiene diseño y una salida clara.
- **Alt**: Página 404 de Network con el logotipo y un botón para volver al feed
- **Caption**: El 404 se centra y mantiene su salida en móvil.

### `71-empty-following-feed-mobile.png`

- **Pantalla**: Vacío · feed de seguidos
- **URL**: `/?feed=following`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Cuenta recién creada: el feed de seguidos explica qué irá ahí y cómo llenarlo.
- **Por qué importa**: El primer día de un usuario es una pantalla vacía; aquí está diseñada.
- **Alt**: Feed de seguidos vacío en una cuenta nueva, con explicación y enlace para buscar personas
- **Caption**: El vacío conserva su explicación en pantalla estrecha.

### `72-empty-notifications-mobile.png`

- **Pantalla**: Vacío · notificaciones
- **URL**: `/notifications`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Sin actividad todavía, enumerando qué tipos de aviso aparecerán.
- **Por qué importa**: El vacío anticipa qué va a pasar en esa pantalla.
- **Alt**: Centro de notificaciones vacío en una cuenta nueva de Network
- **Caption**: El vacío de notificaciones también está diseñado en móvil.

### `73-feed-dark-mobile.png`

- **Pantalla**: Feed · modo oscuro
- **URL**: `/`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: El mismo feed con el tema oscuro aplicado.
- **Por qué importa**: El oscuro no es un filtro invertido: los bordes sustituyen a las sombras.
- **Alt**: Feed de Network en modo oscuro con publicaciones, sugerencias y tendencias
- **Caption**: Modo oscuro y móvil combinados, sin ajustes extra.

### `74-profile-own-dark-mobile.png`

- **Pantalla**: Perfil · modo oscuro
- **URL**: `/profile/mira.kessel`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Perfil propio en tema oscuro.
- **Por qué importa**: La portada en degradado sigue funcionando sobre fondo oscuro.
- **Alt**: Perfil propio de Network en modo oscuro con portada y contadores
- **Caption**: El perfil en oscuro y en móvil mantiene la jerarquía.

### `75-notifications-dark-mobile.png`

- **Pantalla**: Notificaciones · modo oscuro
- **URL**: `/notifications`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Los ocho verbos con sus colores adaptados al tema oscuro.
- **Por qué importa**: Cada color de verbo tiene su variante oscura, no una opacidad rebajada.
- **Alt**: Centro de notificaciones de Network en modo oscuro con los ocho tipos de actividad
- **Caption**: Los colores de cada aviso resisten oscuro y pantalla estrecha.

### `78-login-demo-accounts-mobile.png`

- **Pantalla**: Acceso · con cuentas demo
- **URL**: `/login`
- **Viewport**: 390 × 844 @2x
- **En `principales/`**: sí
- **Qué muestra**: Acceso con el ayudante de cuentas demo visible: cuatro atajos y la contraseña compartida.
- **Por qué importa**: Es el estado por defecto del producto y el que ve cualquiera que abra la demo pública.
- **Alt**: Pantalla de acceso de Network con el recuadro de cuentas demo y su contraseña
- **Caption**: Las cuentas demo y su contraseña caben también en móvil.
