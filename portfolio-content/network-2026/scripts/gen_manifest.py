"""Generate screenshots/manifest.md from a table of per-shot metadata."""

import pathlib

PC = pathlib.Path(
    r"C:\Users\savage\Documents\kimi\Workspaces\portafolio espacial"
    r"\jonas-orbit-v3\portfolio-content\network-2026"
)
RAW = PC / "screenshots" / "raw"
PRINC = {p.name for p in (PC / "screenshots" / "principales").glob("*.png")}

WEB = "http://127.0.0.1:5199"
API = "http://127.0.0.1:8001"

# slug -> (pantalla, ruta/URL, qué muestra, por qué importa, alt, caption)
M = {
    "login": (
        "Inicio de sesión",
        "/login",
        "Panel de marca a la izquierda con tres beneficios y formulario de acceso a la derecha.",
        "Es la primera pantalla de cualquier visitante y fija el tono visual del producto.",
        "Pantalla de inicio de sesión de Network con panel de marca morado y formulario de acceso",
        "El acceso presenta el producto antes de pedir nada.",
    ),
    "login-error": (
        "Inicio de sesión · error",
        "/login",
        "Credenciales inválidas con aviso en rojo bajo los campos, sin recargar la página.",
        "Demuestra que los estados de error están diseñados, no delegados al navegador.",
        "Formulario de acceso mostrando el aviso de credenciales inválidas",
        "El error aparece junto al formulario, nunca en una página aparte.",
    ),
    "register": (
        "Registro",
        "/register",
        "Alta con nombre, apellidos, usuario, email, contraseña y confirmación.",
        "Registrarse devuelve ya la sesión iniciada: una pantalla en vez de dos.",
        "Formulario de registro de Network con seis campos y botón de crear cuenta",
        "Crear la cuenta deja al usuario dentro, sin un segundo paso.",
    ),
    "feed": (
        "Feed · For you",
        "/",
        "Feed de tres columnas: perfil y navegación, publicaciones, descubrimiento.",
        "Es la vista central del producto y donde converge todo el modelo de datos.",
        "Feed principal de Network con editor, publicaciones, sugerencias y hashtags en tendencia",
        "Publicar, conversar y descubrir personas en una sola vista.",
    ),
    "feed-loading-skeleton": (
        "Feed · carga",
        "/",
        "Esqueletos con la geometría exacta de la tarjeta real mientras llega la primera página.",
        "El layout no salta al llegar el contenido: el hueco ya tiene el tamaño correcto.",
        "Feed de Network mostrando tres tarjetas esqueleto mientras cargan las publicaciones",
        "El esqueleto reserva el sitio exacto que ocupará la tarjeta.",
    ),
    "feed-infinite-scroll": (
        "Feed · scroll infinito",
        "/",
        "Segunda página cargada tras llegar al final, con repost y publicación original.",
        "La paginación por cursor mantiene el orden estable mientras se publica contenido nuevo.",
        "Feed de Network desplazado mostrando publicaciones de la segunda página cargada",
        "El cursor evita que la página dos repita lo ya leído.",
    ),
    "feed-following": (
        "Feed · Following",
        "/?feed=following",
        "Mismo feed filtrado a las personas seguidas, más las publicaciones propias.",
        "Separa descubrimiento de seguimiento sin cambiar de pantalla.",
        "Feed de Network con la pestaña Following activa",
        "La pestaña Following incluye también lo que publicas tú.",
    ),
    "composer-with-image": (
        "Crear publicación",
        "/",
        "Editor abierto con texto, hashtags e imagen adjunta en previsualización.",
        "La imagen se ve antes de enviar y el servidor la reescribe a WebP al recibirla.",
        "Editor de publicación de Network con texto y una imagen en previsualización",
        "La imagen se previsualiza antes de enviarla, con opción de quitarla.",
    ),
    "post-options-menu": (
        "Menú de publicación",
        "/profile/mira.kessel",
        "Menú contextual con copiar enlace, marcador, editar y borrar.",
        "Las acciones destructivas quedan fuera de la vista hasta que se piden.",
        "Menú contextual de una publicación con opciones de copiar enlace, marcador, editar y borrar",
        "Editar y borrar sólo aparecen sobre las publicaciones propias.",
    ),
    "post-editing": (
        "Editar publicación",
        "/profile/mira.kessel",
        "El contenido se sustituye por un área editable con Guardar y Cancelar, sin recargar.",
        "Es el requisito de edición sin recarga del enunciado original, resuelto dentro del SPA.",
        "Publicación en modo edición con área de texto, contador y botones de guardar y cancelar",
        "La edición ocurre en el sitio, sin abrir otra pantalla.",
    ),
    "post-delete-confirm": (
        "Borrar publicación",
        "/profile/mira.kessel",
        "Diálogo que nombra lo que se pierde: respuestas, likes y reposts.",
        "El diálogo informa de la consecuencia concreta en vez de preguntar si estás seguro.",
        "Diálogo de confirmación para borrar una publicación, indicando qué más se eliminará",
        "El diálogo nombra la consecuencia exacta, no sólo la acción.",
    ),
    "quote-modal": (
        "Citar publicación",
        "/post/:id",
        "Modal de cita con el original embebido debajo del área de texto.",
        "Repost y cita comparten modelo; la cita añade contenido propio sobre el original.",
        "Modal de cita de Network con la publicación original embebida bajo el campo de texto",
        "Al citar se ve el original completo, imagen incluida.",
    ),
    "post-likes-list": (
        "Quién dio like",
        "/post/:id",
        "Modal con las personas que dieron like, su relación contigo y el botón de seguir.",
        "Convierte un contador en una lista accionable de personas por descubrir.",
        "Modal Liked by con tres personas, su titular profesional y botones de seguimiento",
        "El contador de likes se abre como lista de personas.",
    ),
    "post-detail-comments": (
        "Publicación y comentarios",
        "/post/:id",
        "Detalle con la publicación completa, caja de comentario y el hilo debajo.",
        "Muestra la conversación entera, con respuestas anidadas de un nivel.",
        "Detalle de una publicación de Network con su imagen y el hilo de comentarios",
        "El detalle reúne la publicación y toda su conversación.",
    ),
    "post-detail-comment-deeplink": (
        "Comentario enlazado",
        "/post/:id?comment=:commentId",
        "El comentario de destino resaltado con un anillo tras llegar desde una notificación.",
        "El enlace profundo no deja al usuario buscando en el hilo: señala el comentario exacto.",
        "Hilo de comentarios con uno de ellos resaltado por haber llegado desde una notificación",
        "La notificación lleva al comentario exacto y lo resalta.",
    ),
    "comment-reply-composer": (
        "Responder a un comentario",
        "/post/:id",
        "Caja de respuesta abierta bajo el comentario, con la respuesta ya escrita.",
        "Las respuestas se escriben en su sitio, sin abrir otra vista ni perder el contexto.",
        "Caja de respuesta abierta bajo un comentario dentro del hilo de una publicación",
        "Responder ocurre bajo el comentario, sin salir del hilo.",
    ),
    "image-lightbox": (
        "Visor de imagen",
        "/post/:id",
        "Superposición a pantalla completa con la imagen de la publicación.",
        "Funciona, pero la imagen demo es un degradado abstracto y la captura no comunica nada.",
        "Visor de imagen a pantalla completa mostrando una imagen abstracta",
        "El visor ocupa la pantalla; se cierra con botón, clic fuera o Escape.",
    ),
    "profile-own": (
        "Perfil propio",
        "/profile/mira.kessel",
        "Portada, avatar, titular, biografía, ubicación, web, alta y tres contadores.",
        "Un perfil es identidad, relaciones y contenido en una sola pantalla.",
        "Perfil propio en Network con portada, datos, contadores y pestañas",
        "El perfil une identidad, relaciones y contenido publicado.",
    ),
    "profile-media-grid": (
        "Perfil · Media",
        "/profile/mira.kessel?tab=media",
        "Rejilla cuadrada de tres columnas con las imágenes publicadas por esa persona.",
        "Da una segunda forma de recorrer un perfil, visual en vez de cronológica.",
        "Rejilla de imágenes de un perfil de Network en tres columnas",
        "La pestaña Media recorre el perfil por imagen, no por fecha.",
    ),
    "profile-likes-tab": (
        "Perfil · Likes",
        "/profile/mira.kessel?tab=likes",
        "Las publicaciones a las que esa persona ha dado like.",
        "Convierte una acción privada en una señal pública de intereses.",
        "Pestaña Likes de un perfil de Network con las publicaciones que esa persona marcó",
        "Los likes de una persona también cuentan quién es.",
    ),
    "profile-edit-modal": (
        "Editar perfil",
        "/profile/mira.kessel",
        "Modal con portada, avatar, nombre, titular y biografía con contadores de caracteres.",
        "Toda la edición del perfil cabe en un modal, sin una pantalla de ajustes aparte.",
        "Modal de edición de perfil con portada, avatar y campos de texto con contadores",
        "Editar el perfil entero sin salir del perfil.",
    ),
    "profile-followers-modal": (
        "Seguidores",
        "/profile/mira.kessel?tab=followers",
        "Modal con la lista de seguidores, su relación contigo y su botón.",
        "Es enlazable por URL, así que una lista de personas se puede compartir.",
        "Modal de seguidores con siete personas, insignias Follows you y botones de seguimiento",
        "La lista de seguidores tiene URL propia y se puede compartir.",
    ),
    "profile-following-modal": (
        "Seguidos",
        "/profile/mira.kessel?tab=following",
        "Modal con las personas que ese perfil sigue.",
        "Cierra el grafo de relaciones en las dos direcciones desde el mismo sitio.",
        "Modal de personas seguidas con sus titulares profesionales y botones de seguimiento",
        "El grafo se recorre en las dos direcciones desde el perfil.",
    ),
    "profile-other-person": (
        "Perfil ajeno",
        "/profile/felix.nakamura",
        "Perfil de otra persona con botón Seguir y la insignia Follows you.",
        "La insignia responde a la pregunta que todo el mundo se hace al abrir un perfil.",
        "Perfil de otra persona en Network con botón de seguir y la insignia Follows you",
        "La insignia Follows you resuelve la relación de un vistazo.",
    ),
    "notifications": (
        "Notificaciones",
        "/notifications",
        "Los ocho tipos de actividad, cada uno con icono y color propios, y las no leídas destacadas.",
        "Es donde se ve que la actividad es un dominio propio y no un añadido al feed.",
        "Centro de notificaciones de Network con ocho tipos de actividad diferenciados por icono y color",
        "Cada tipo de actividad se distingue por icono, color y frase.",
    ),
    "notifications-clear-confirm": (
        "Vaciar notificaciones",
        "/notifications",
        "Confirmación antes de borrar toda la lista.",
        "La acción masiva pide confirmación y dice exactamente qué elimina.",
        "Diálogo de confirmación para borrar todas las notificaciones",
        "Vaciar la lista pide confirmación y explica su alcance.",
    ),
    "bookmarks": (
        "Marcadores",
        "/bookmarks",
        "Las publicaciones guardadas, con la aclaración de que la lista es privada.",
        "La única lista del producto que nadie más ve, y la interfaz lo dice.",
        "Página de marcadores de Network con las publicaciones guardadas",
        "La lista guardada es privada y la pantalla lo dice.",
    ),
    "search-idle-trending": (
        "Búsqueda · inicio",
        "/search",
        "Caja de búsqueda vacía con explicación de qué se puede buscar y los hashtags en tendencia.",
        "Una búsqueda vacía no está vacía: propone por dónde empezar.",
        "Página de búsqueda de Network sin consulta, con hashtags en tendencia",
        "La búsqueda sin consulta propone temas en vez de quedarse vacía.",
    ),
    "search-people": (
        "Búsqueda · personas",
        "/search?q=engineer",
        "Resultados de personas por nombre, usuario o titular, con contador en la pestaña.",
        "La búsqueda cubre el titular profesional, no sólo el nombre.",
        "Resultados de búsqueda de personas en Network con ocho perfiles y sus botones de seguimiento",
        "Buscar personas incluye el titular, no sólo el nombre.",
    ),
    "search-posts": (
        "Búsqueda · publicaciones",
        "/search?q=pagination",
        "Resultados por contenido de la publicación, en la pestaña Posts.",
        "Una sola caja resuelve dos tipos de resultado sin obligar a elegir antes.",
        "Resultados de búsqueda de publicaciones en Network para el término pagination",
        "La misma caja busca personas y contenido de publicaciones.",
    ),
    "search-hashtag": (
        "Búsqueda · hashtag",
        "/search?q=%23design",
        "Publicaciones etiquetadas con un hashtag, con encabezado propio.",
        "Escribir con # cambia el modo de búsqueda sin un control adicional.",
        "Resultados de publicaciones etiquetadas con el hashtag design en Network",
        "Escribir con # salta directamente a las publicaciones del tema.",
    ),
    "search-no-results": (
        "Búsqueda sin resultados",
        "/search?q=qwertzuiop",
        "Estado vacío con el término buscado y una sugerencia de qué probar.",
        "El vacío repite lo buscado y propone la siguiente acción.",
        "Estado vacío de búsqueda en Network indicando que no hay personas para ese término",
        "El vacío repite el término buscado y sugiere qué probar.",
    ),
    "account-menu": (
        "Menú de cuenta",
        "/",
        "Menú del avatar con perfil, marcadores, ajustes y cerrar sesión.",
        "En móvil es la vía de acceso a lo que no cabe en la barra inferior.",
        "Menú desplegable de cuenta con perfil, marcadores, ajustes y cerrar sesión",
        "El menú de cuenta reúne lo que no cabe en la navegación.",
    ),
    "settings": (
        "Ajustes",
        "/settings",
        "Perfil, apariencia, contraseña y zona peligrosa, en ese orden.",
        "Las opciones se ordenan de rutinarias a irreversibles.",
        "Página de ajustes de Network con secciones de perfil, apariencia y contraseña",
        "Los ajustes van de lo rutinario a lo irreversible.",
    ),
    "settings-delete-account-modal": (
        "Borrar cuenta",
        "/settings",
        "Diálogo que enumera lo que se pierde y exige la contraseña para confirmar.",
        "Lo irreversible se nombra con detalle y pide una prueba de identidad.",
        "Diálogo de borrado de cuenta que enumera lo que se elimina y pide la contraseña",
        "Borrar la cuenta enumera lo que se pierde y pide contraseña.",
    ),
    "not-found-404": (
        "Página no encontrada",
        "/a-page-that-does-not-exist",
        "Error 404 con la marca y un camino de vuelta.",
        "Hasta el error tiene diseño y una salida clara.",
        "Página 404 de Network con el logotipo y un botón para volver al feed",
        "El 404 mantiene la marca y ofrece una salida.",
    ),
    "empty-following-feed": (
        "Vacío · feed de seguidos",
        "/?feed=following",
        "Cuenta recién creada: el feed de seguidos explica qué irá ahí y cómo llenarlo.",
        "El primer día de un usuario es una pantalla vacía; aquí está diseñada.",
        "Feed de seguidos vacío en una cuenta nueva, con explicación y enlace para buscar personas",
        "El vacío explica qué irá ahí y enlaza a la acción.",
    ),
    "empty-bookmarks": (
        "Vacío · marcadores",
        "/bookmarks",
        "Marcadores sin nada guardado, indicando qué icono los crea.",
        "El vacío enseña el gesto que lo resuelve.",
        "Página de marcadores vacía indicando cómo guardar una publicación",
        "El vacío enseña el gesto exacto que lo resuelve.",
    ),
    "empty-notifications": (
        "Vacío · notificaciones",
        "/notifications",
        "Sin actividad todavía, enumerando qué tipos de aviso aparecerán.",
        "El vacío anticipa qué va a pasar en esa pantalla.",
        "Centro de notificaciones vacío en una cuenta nueva de Network",
        "El vacío anticipa qué avisos llegarán a esta pantalla.",
    ),
    "empty-own-profile": (
        "Vacío · perfil nuevo",
        "/profile/noah.fielding",
        "Perfil recién creado, sin avatar, sin portada y sin publicaciones.",
        "Un perfil vacío sigue siendo presentable y empuja a la primera publicación.",
        "Perfil recién creado en Network sin publicaciones, con avatar de iniciales",
        "Un perfil sin contenido sigue siendo presentable.",
    ),
    "feed-dark": (
        "Feed · modo oscuro",
        "/",
        "El mismo feed con el tema oscuro aplicado.",
        "El oscuro no es un filtro invertido: los bordes sustituyen a las sombras.",
        "Feed de Network en modo oscuro con publicaciones, sugerencias y tendencias",
        "En oscuro los bordes hacen el trabajo que hacían las sombras.",
    ),
    "post-detail-dark": (
        "Publicación · modo oscuro",
        "/post/:id",
        "Detalle de publicación y comentarios en tema oscuro.",
        "Confirma que la jerarquía de la conversación se mantiene al cambiar de tema.",
        "Detalle de una publicación de Network en modo oscuro con su hilo de comentarios",
        "La jerarquía del hilo se mantiene al cambiar de tema.",
    ),
    "profile-own-dark": (
        "Perfil · modo oscuro",
        "/profile/mira.kessel",
        "Perfil propio en tema oscuro.",
        "La portada en degradado sigue funcionando sobre fondo oscuro.",
        "Perfil propio de Network en modo oscuro con portada y contadores",
        "La portada en degradado también funciona sobre fondo oscuro.",
    ),
    "notifications-dark": (
        "Notificaciones · modo oscuro",
        "/notifications",
        "Los ocho verbos con sus colores adaptados al tema oscuro.",
        "Cada color de verbo tiene su variante oscura, no una opacidad rebajada.",
        "Centro de notificaciones de Network en modo oscuro con los ocho tipos de actividad",
        "Cada color de aviso tiene su propia variante oscura.",
    ),
    "search-hashtag-dark": (
        "Hashtag · modo oscuro",
        "/search?q=%23sre",
        "Resultados por hashtag en tema oscuro.",
        "Los enlaces de hashtag conservan contraste suficiente sobre fondo oscuro.",
        "Resultados de un hashtag en Network en modo oscuro",
        "Los enlaces de hashtag conservan contraste sobre fondo oscuro.",
    ),
    "settings-dark": (
        "Ajustes · modo oscuro",
        "/settings",
        "Ajustes en tema oscuro, con la opción Dark seleccionada.",
        "La propia pantalla que cambia el tema se ve en los dos temas.",
        "Página de ajustes de Network en modo oscuro con la opción Dark seleccionada",
        "La pantalla que cambia el tema, vista en ese mismo tema.",
    ),
    "bookmarks-dark": (
        "Marcadores · modo oscuro",
        "/bookmarks",
        "Lista de guardados en tema oscuro.",
        "Completa la cobertura del tema oscuro en las pantallas de lista.",
        "Página de marcadores de Network en modo oscuro",
        "Las pantallas de lista también están resueltas en oscuro.",
    ),
    "login-dark": (
        "Acceso · modo oscuro",
        "/login",
        "Pantalla de acceso con el tema oscuro aplicado.",
        "El tema se resuelve antes de montar React, así que no hay parpadeo en la primera pantalla.",
        "Pantalla de inicio de sesión de Network en modo oscuro",
        "El tema se aplica antes de montar React: sin parpadeo inicial.",
    ),
    "api-docs-swagger": (
        "API · Swagger UI",
        "/api/docs/",
        "Documentación interactiva generada del código, agrupada por dominio.",
        "Es la prueba de que la API está documentada y de que el esquema sale del código.",
        "Swagger UI de la API de Network mostrando los endpoints de autenticación y comentarios",
        "La documentación se genera del código y no puede quedarse vieja.",
    ),
    "api-docs-redoc": (
        "API · ReDoc",
        "/api/redoc/",
        "Misma especificación en formato de referencia, con esquemas y ejemplos de petición.",
        "Dos lecturas del mismo esquema: una para probar, otra para leer.",
        "ReDoc de la API de Network con la navegación por dominios y un ejemplo de petición",
        "El mismo esquema, en formato de referencia para leer.",
    ),
    "login-demo-accounts": (
        "Acceso · con cuentas demo",
        "/login",
        "Acceso con el ayudante de cuentas demo visible: cuatro atajos y la contraseña compartida.",
        "Es el estado por defecto del producto y el que ve cualquiera que abra la demo pública.",
        "Pantalla de acceso de Network con el recuadro de cuentas demo y su contraseña",
        "La demo pública ofrece cuentas de prueba con un solo clic.",
    ),
    "login-demo-accounts-dark": (
        "Acceso · con cuentas demo, oscuro",
        "/login",
        "La misma variante con el ayudante de cuentas demo, en tema oscuro.",
        "Confirma que el recuadro de cuentas demo también está resuelto en oscuro.",
        "Pantalla de acceso de Network en modo oscuro con el recuadro de cuentas demo",
        "El recuadro de cuentas demo también está resuelto en oscuro.",
    ),
}

# Mobile shots reuse the desktop metadata, with their own caption slant.
MOBILE_CAPTION = {
    "login": "El acceso cabe entero en pantalla, sin desplazamiento.",
    "register": "El alta se apila en una columna en pantalla estrecha.",
    "feed": "En móvil el feed es una columna y la navegación baja.",
    "feed-following": "La pestaña Following se mantiene en la versión móvil.",
    "composer-with-image": "El editor y su previsualización funcionan igual en móvil.",
    "quote-modal": "El modal de cita se convierte en hoja inferior en móvil.",
    "post-detail-comments": "El hilo completo se lee en una sola columna.",
    "comment-reply-composer": "Responder en móvil ocurre igualmente bajo el comentario.",
    "profile-own": "El perfil reordena portada, datos y pestañas en vertical.",
    "profile-media-grid": "La rejilla de medios pasa de tres columnas a dos.",
    "profile-followers-modal": "Las listas de personas suben como hoja inferior.",
    "profile-other-person": "El perfil ajeno conserva el botón de seguir en móvil.",
    "notifications": "Los ocho tipos siguen diferenciados en pantalla estrecha.",
    "bookmarks": "Los marcadores se leen igual de bien en una columna.",
    "search-idle-trending": "Los temas en tendencia se envuelven en varias líneas.",
    "search-people": "Los resultados de personas mantienen su botón de acción.",
    "search-hashtag": "La búsqueda por hashtag funciona igual en móvil.",
    "account-menu": "El menú de cuenta da acceso a lo que no cabe abajo.",
    "settings": "Los ajustes se apilan manteniendo el mismo orden.",
    "not-found-404": "El 404 se centra y mantiene su salida en móvil.",
    "empty-following-feed": "El vacío conserva su explicación en pantalla estrecha.",
    "empty-notifications": "El vacío de notificaciones también está diseñado en móvil.",
    "feed-dark": "Modo oscuro y móvil combinados, sin ajustes extra.",
    "profile-own-dark": "El perfil en oscuro y en móvil mantiene la jerarquía.",
    "notifications-dark": "Los colores de cada aviso resisten oscuro y pantalla estrecha.",
    "login-demo-accounts": "Las cuentas demo y su contraseña caben también en móvil.",
}

rows = []
for path in sorted(RAW.glob("*.png")):
    name = path.name
    stem = name[:-4]
    number, rest = stem.split("-", 1)
    if rest.endswith("-mobile"):
        slug, kind = rest[: -len("-mobile")], "mobile"
    else:
        slug, kind = rest[: -len("-desktop")], "desktop"
    meta = M[slug]
    caption = MOBILE_CAPTION.get(slug, meta[5]) if kind == "mobile" else meta[5]
    rows.append((number, name, slug, kind, meta, caption))

# Los archivos 76-78 se añadieron después del run principal, así que el orden
# alfabético mezclaría escritorio y móvil. Se agrupa por tipo y luego por número.
rows.sort(key=lambda r: (r[3] == "mobile", int(r[0])))


def viewport(kind):
    return "390 × 844 @2x" if kind == "mobile" else "1440 × 900 @2x"


out = []
out.append("# Network — manifiesto de capturas\n")
out.append(
    "78 capturas del **2026-09-26**, commit `e90c581`, contra la base de datos demo\n"
    "local descrita en `scripts/README.md`.\n"
)
out.append(
    "- **Escritorio**: 1440 × 900, `deviceScaleFactor: 2` → archivo de 2880 × 1800.\n"
    "- **Móvil**: 390 × 844, `deviceScaleFactor: 2` → archivo de 780 × 1688.\n"
    "- Animaciones y transiciones desactivadas, cursor de texto oculto, zona horaria UTC,\n"
    "  y espera a que las fuentes web estén listas antes de disparar.\n"
    "- Las URL son de la instancia local (`" + WEB + "` para la app, `" + API + "`\n"
    "  para la API). **No aparecen en ninguna imagen**: las capturas no incluyen el\n"
    "  cromo del navegador.\n"
)
out.append(
    "- Las 75 primeras son el run principal (`capture.mjs`). Las **76, 77 y 78** se\n"
    "  añadieron después con `capture-login-variants.mjs`: la pantalla de acceso **con**\n"
    "  el ayudante de cuentas demo visible, que Jonás ha decidido publicar.\n"
    "- `principales/` conserva los mismos nombres de archivo que `raw/`. Falta la 17,\n"
    "  y el motivo está en `excluded.md`.\n"
)
out.append("\n---\n")

current = None
for number, name, slug, kind, meta, caption in rows:
    pantalla, url, muestra, importa, alt, _ = meta
    section = "Escritorio" if kind == "desktop" else "Móvil"
    if section != current:
        out.append(f"\n## {section}\n")
        current = section
    in_princ = "sí" if name in PRINC else "**no** — ver `excluded.md`"
    out.append(f"\n### `{name}`\n")
    out.append(f"- **Pantalla**: {pantalla}")
    out.append(f"- **URL**: `{url}`")
    out.append(f"- **Viewport**: {viewport(kind)}")
    out.append(f"- **En `principales/`**: {in_princ}")
    out.append(f"- **Qué muestra**: {muestra}")
    out.append(f"- **Por qué importa**: {importa}")
    out.append(f"- **Alt**: {alt}")
    out.append(f"- **Caption**: {caption}")

(PC / "screenshots" / "manifest.md").write_text("\n".join(out) + "\n", encoding="utf-8")

# sanity: caption length
too_long = []
for number, name, slug, kind, meta, caption in rows:
    n = len(caption.split())
    if n > 15:
        too_long.append((name, n, caption))
print("capturas:", len(rows))
print("captions de más de 15 palabras:", too_long or "ninguna")
