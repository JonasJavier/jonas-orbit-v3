# Network — todas las funciones y pantallas

34 entradas. Cada una: qué hace, dónde vive en el código, si es publicable y, si no,
por qué. Los números de captura remiten a `screenshots/raw/` (y a
`screenshots/principales/`, que conserva los mismos nombres).

Etiquetas: **comprobado** salvo donde se indique otra cosa.

---

## Autenticación y cuenta

### 1. Registro
Formulario con nombre, apellidos, usuario, email, contraseña y confirmación. Al crear
la cuenta la API devuelve directamente el par de tokens, así que el usuario entra sin
un segundo paso. Errores por campo. Usuario validado por expresión regular (3–30
caracteres, letras, números, puntos y guiones bajos) y contra una lista de 22 nombres
reservados. Unicidad de usuario y email insensible a mayúsculas.
`apps/users/views.py:RegisterView` · `apps/users/serializers.py` · `pages/RegisterPage.tsx`
**Publicable: sí** — `03`, `52`

### 2. Inicio de sesión con usuario **o** email
Backend de autenticación propio que resuelve ambos. Limitado a 10 peticiones por
minuto y por IP.
`apps/users/backends.py:EmailOrUsernameBackend` · `apps/core/throttling.py`
**Publicable: sí** — `01`, `48` (oscuro), `51` (móvil)

### 3. Estado de error de credenciales
Mensaje en `role="alert"` dentro de la tarjeta, sin recargar.
`pages/LoginPage.tsx`
**Publicable: sí** — `02`

### 4. Ayudante «Try a demo account»
Chips con cuatro cuentas demo y la contraseña en claro, controlado por
`VITE_SHOW_DEMO_ACCOUNTS`.
**Publicable: no** — se desactivó a propósito para las capturas. Dos motivos: muestra
una contraseña en pantalla, y las cuentas que precarga (`ada`, `grace`, `linus`, `tim`)
son personas reales. Ver `excluded.md`.

### 5. Cierre de sesión
Envía el refresh a `auth/logout/`, que lo pone en lista negra, limpia la caché de
TanStack Query y redirige a login.
`hooks/useAuth.ts:useLogout` · `apps/users/urls.py`
**Publicable: sí**, como parte del menú de cuenta — `33`, `68`

### 6. Cambio de contraseña
Tres campos con verificación de coincidencia en cliente. Al cambiarla, el servidor
pone en lista negra **todos** los refresh del usuario y emite un par nuevo para la
sesión actual: cambiar la contraseña cierra el resto de dispositivos.
`apps/users/views.py:PasswordChangeView`
**Publicable: sí**, dentro de Ajustes — `34`, `46`, `69`

### 7. Borrado de cuenta
Diálogo que nombra la consecuencia («This permanently removes your profile, posts,
comments, likes and followers») y exige la contraseña.
`apps/users/views.py:MeView.destroy` · `pages/SettingsPage.tsx:DeleteAccount`
**Publicable: sí** — `35`

---

## Feed

### 8. Feed «For you»
Todas las publicaciones, más recientes primero, paginadas por cursor de 10 en 10.
`apps/posts/views.py:PostViewSet` · `components/posts/PostFeed.tsx`
**Publicable: sí** — `04`, `41` (oscuro), `53`, `73` (móvil oscuro)

### 9. Feed «Following»
Publicaciones de las personas seguidas **más las propias**. Pestaña en la misma vista.
`get_queryset`: `Q(author_id__in=followed) | Q(author=user)`
**Publicable: sí** — `07`, `54`

### 10. Scroll infinito
`IntersectionObserver` sobre un centinela al final de la lista; carga la página
siguiente y muestra un spinner. Cuando no hay más, aparece «You're all caught up».
`hooks/useInfiniteScroll.ts` · `components/posts/PostFeed.tsx`
**Publicable: sí** — `06`

### 11. Esqueletos de carga
`FeedSkeleton` con `role="status"` y `aria-label="Loading posts"`; tres tarjetas
fantasma con la misma geometría que las reales, así el layout no salta.
`components/ui/PostSkeleton.tsx`
**Publicable: sí** — `05`

---

## Publicaciones

### 12. Crear publicación
Hasta 2 000 caracteres, con imagen opcional por selector, arrastrar-y-soltar o pegado.
Previsualización con botón de quitar y contador de caracteres.
`components/posts/PostComposer.tsx`
**Publicable: sí** — `08`, `55`
*Nota: el contador aparece como número desnudo, sin etiqueta. Ver `README.md` §5.*

### 13. Editar publicación propia
El contenido se sustituye por un textarea en el sitio, con Guardar/Cancelar y atajo
Ctrl/Cmd+Enter. Sin recarga. Permiso a nivel de objeto en el servidor.
`components/posts/PostCard.tsx` · `apps/core/permissions.py:IsAuthorOrReadOnly`
**Publicable: sí** — `10`

### 14. Marca «edited»
El serializador la calcula como `updated_at - created_at > 2 s`.
`apps/posts/serializers.py:get_is_edited`
**Publicable: no como captura propia** — es un detalle de una línea dentro de la
cabecera de la tarjeta, no una pantalla. Los datos demo se generan sin ediciones, así
que la marca no aparece en el set.

### 15. Borrar publicación
Diálogo de confirmación que nombra la consecuencia («Replies, likes and reposts of
this post will be removed too»).
`components/ui/ConfirmDialog.tsx`
**Publicable: sí** — `11`

### 16. Menú de opciones de publicación
Copiar enlace · Guardar/Quitar de marcadores · Editar · Borrar (las dos últimas sólo
para el autor). `role="menu"` / `role="menuitem"`.
`components/ui/Menu.tsx`
**Publicable: sí** — `09`

### 17. Likes
Alternable, optimista, con contador. Crea y **borra** la notificación al deshacerse.
`apps/posts/views.py:PostViewSet.like`
**Publicable: sí**, visible en casi todas las capturas del feed

### 18. Lista «Liked by»
Quién dio like, más reciente primero, con su relación contigo y botón de seguir.
`apps/posts/views.py:PostViewSet.likes` (paginada)
**Publicable: sí** — `13`

### 19. Repost
Un clic. Se guarda como un `Post` propio con `repost_of` y sin contenido; una
restricción única condicional impide repostear dos veces lo mismo; repostear un repost
apunta al original.
`apps/posts/models.py:unique_plain_repost` · `apps/posts/services.py:resolve_original`
**Publicable: sí** — visible en `04`, `06`, `24`

### 20. Cita
Mismo modelo que el repost pero con contenido propio; el original se pinta embebido
dentro de la tarjeta.
`components/posts/QuoteModal.tsx` · `components/posts/QuotedPost.tsx`
**Publicable: sí** — `12`, `56`

### 21. Marcadores
Lista privada. Página propia con su estado vacío.
`apps/posts/models.py:Bookmark` · `pages/BookmarksPage.tsx`
**Publicable: sí** — `27`, `47`, `64`, `38` (vacío)

### 22. Visor de imagen (lightbox)
Superposición a pantalla completa con cierre por botón, clic fuera y Escape.
`components/ui/Lightbox.tsx`
**Publicable: no** — funciona, pero las imágenes demo son degradados abstractos, así
que la captura es un rectángulo morado a pantalla completa que no comunica nada.
Ver `excluded.md`.

---

## Conversación

### 23. Comentarios con respuestas de un nivel
Comentarios sobre la publicación y respuestas anidadas bajo cada comentario; editar y
borrar los propios; dar like a cualquiera.
`apps/posts/views.py:PostCommentsView`, `CommentViewSet` · `components/posts/CommentSection.tsx`
**Publicable: sí** — `14`, `42` (oscuro), `57`

### 24. Caja de respuesta
Se abre bajo el comentario, con `autoFocus`, envío con Enter y cierre con Escape.
`components/posts/CommentItem.tsx`
**Publicable: sí** — `16`, `58`

### 25. Enlace profundo a un comentario
`/post/:id?comment=:commentId` hace scroll hasta él y lo resalta con un anillo. Es a
donde llevan las notificaciones de comentario, respuesta y mención.
`pages/PostDetailPage.tsx` · `components/posts/CommentSection.tsx`
**Publicable: sí** — `15`

---

## Personas

### 26. Perfil propio
Portada, avatar, nombre, titular, biografía, ubicación, web, fecha de alta y tres
contadores. Pestañas Posts / Media / Likes.
`pages/ProfilePage.tsx`
**Publicable: sí** — `18`, `43` (oscuro), `59`, `74`

### 27. Perfil ajeno
Igual, pero con botón Seguir/Siguiendo y la insignia «Follows you» si procede.
**Publicable: sí** — `24`, `62`

### 28. Pestaña Media
Rejilla cuadrada de 3 columnas con las imágenes del usuario; al pasar el cursor
aparece «View post →»; al pulsar, se abre el visor.
`pages/ProfilePage.tsx:MediaGrid`
**Publicable: sí** — `19`, `60`

### 29. Pestaña Likes
Las publicaciones a las que esa persona dio like (`?liked_by=`).
**Publicable: sí** — `20`

### 30. Editar perfil
Modal con portada y avatar (subir y quitar), nombre, apellidos, titular con contador
47/120, biografía con contador 123/500, ubicación y web.
`components/users/EditProfileModal.tsx`
**Publicable: sí** — `21`

### 31. Seguidores y seguidos
Dos modales deep-linkables (`?tab=followers` / `?tab=following`), cada fila con la
relación y su botón.
`components/users/UserListModal.tsx` · `apps/users/views.py:followers`, `following`
**Publicable: sí** — `22`, `23`, `61`

### 32. «Who to follow»
Las personas más seguidas a las que aún no sigues, máximo 5, cacheado 5 minutos por
usuario e invalidado al seguir o dejar de seguir.
`apps/users/views.py:suggestions`
**Publicable: sí** — visible en toda la columna derecha del escritorio

---

## Descubrimiento

### 33. Búsqueda
Caja global en la barra superior con atajo `/`, y página propia con pestañas People /
Posts, escritura con rebote de 350 ms, URL sincronizada y modo `#hashtag` que salta
directo a publicaciones.
`pages/SearchPage.tsx` · `components/layout/Navbar.tsx` · `hooks/useDebounce.ts`
**Publicable: sí** — `28` (inicial), `29` (personas), `30` (publicaciones),
`31`/`45`/`67` (hashtag), `32` (sin resultados), `65`, `66`

### 34. Hashtags y «Trending this week»
Extraídos en el servidor con expresión regular, máximo 10 por publicación, guardados
en minúsculas. El widget cuenta los de los últimos 7 días, top 8, cacheado 5 minutos.
`apps/core/text.py` · `apps/posts/views.py:TrendingHashtagsView`
**Publicable: sí** — `28`, `31`
*Nota: el widget se duplica en `/search` sin consulta. Ver `README.md` §5.*

### 35. @menciones
Se enlazan al perfil y notifican a la persona mencionada, evitando duplicar con la
notificación de comentario o cita.
`apps/posts/services.py:notify_mentions` · `frontend/src/lib/richtext.ts`
**Publicable: sí** — visible en `25` («Tobi Okonkwo mentioned you»)

---

## Notificaciones

### 36. Centro de notificaciones
Ocho verbos, cada uno con su icono, su color y su frase: seguir, like a publicación,
comentario, respuesta, like a comentario, mención, repost y cita. No leídas con fondo
y punto. Marcar todo como leído, borrar todo, y cada fila lleva a su destino.
`apps/notifications/` · `pages/NotificationsPage.tsx`
**Publicable: sí** — `25`, `44` (oscuro), `63`, `75`, `26` (confirmación de borrado)

### 37. Contador de no leídas
Insignia en la campana de la barra superior y en la navegación inferior móvil; muestra
`99+` por encima de 99.
`hooks/useNotifications.ts:useUnreadCount`
**Publicable: sí** — visible en todas las capturas autenticadas

---

## Sistema y estados

### 38. Tema claro / oscuro / sistema
Selector de tres opciones en Ajustes, conmutador rápido en la barra, preferencia
persistida y script inline que la aplica antes de montar React para que no parpadee.
`stores/theme.ts` · `frontend/index.html`
**Publicable: sí** — `34` vs `46`, y toda la serie oscura `41`–`48`

### 39. Estados vacíos diseñados
Componente `EmptyState` con icono, título, descripción y acción opcional. Hay copia
específica para: feed de seguidos vacío, marcadores vacíos, sin notificaciones, perfil
sin publicaciones, sin medios, sin likes, búsqueda sin resultados y perfil inexistente.
`components/ui/EmptyState.tsx`
**Publicable: sí** — `37`, `38`, `39`, `40`, `32`, `71`, `72`

### 40. Página 404
`pages/NotFoundPage.tsx`
**Publicable: sí** — `36`, `70`

### 41. Navegación móvil
Barra inferior fija con Home, Search, Notifications y Profile, con insignia y
`env(safe-area-inset-bottom)`. Marcadores y Ajustes quedan en el menú de cuenta.
`components/layout/MobileNav.tsx`
**Publicable: sí** — toda la serie `51`–`75`

### 42. Menú de cuenta
Avatar en la barra que abre perfil, marcadores, ajustes y cerrar sesión.
`components/layout/Navbar.tsx`
**Publicable: sí** — `33`, `68`

### 43. Avisos (toasts) y diálogos de confirmación
Toasts con Zustand para éxito/error/info; `ConfirmDialog` reutilizable.
`stores/toast.ts` · `components/ui/Toaster.tsx` · `components/ui/ConfirmDialog.tsx`
**Publicable: no como captura propia** — los toasts son efímeros y desaparecen antes de
poder fotografiarlos de forma fiable. Los diálogos sí están: `11`, `26`, `35`.

### 44. Límite de errores (ErrorBoundary)
Envuelve la aplicación y cada ruta.
`components/ui/ErrorBoundary.tsx`
**Publicable: no** — sólo se ve provocando un fallo real; una pantalla de error no
aporta nada al portafolio.

---

## Plataforma

### 45. Documentación de API
Esquema OpenAPI 3 generado con drf-spectacular, servido en `/api/schema/`, con Swagger
UI en `/api/docs/` y ReDoc en `/api/redoc/`. 28 rutas, 37 operaciones, 36 componentes.
`backend/config/urls.py` · `settings.py:SPECTACULAR_SETTINGS`
**Publicable: sí** — `49` (Swagger), `50` (ReDoc)

### 46. Health-check
`GET /health/` sin autenticación: comprueba base de datos y caché, devuelve la versión
y sólo falla (503) si la base de datos no responde.
`apps/core/views.py:HealthView`
**Publicable: no como captura** — es JSON, no una pantalla. Su salida está transcrita
en `overview.md` y en `metrics.md`.

### 47. Panel de administración de Django
Registrado en `/admin/` para usuarios, posts, comentarios y notificaciones.
`apps/*/admin.py`
**Publicable: no** — es el admin genérico de Django, no diseño propio; incluirlo resta
en vez de sumar.

### 48. Manifest instalable
`manifest.webmanifest` con iconos 192/512/maskable, `theme_color`, `display:
standalone` y metas de Apple.
`frontend/public/manifest.webmanifest` · `frontend/index.html`
**Publicable: no como captura** — no hay pantalla que lo muestre.
*Importante: **no hay service worker**, así que no hay soporte offline. Ver `README.md` §4.*

---

## Resumen

| | |
| --- | --- |
| Entradas documentadas | **48** |
| Publicables con captura propia | **34** |
| No publicables o sin pantalla propia | **14** (nº 4, 14, 17\*, 22, 43, 44, 46, 47, 48 y las que se ven integradas en otras) |
| Capturas en `raw/` | 75 |
| Capturas en `principales/` | 74 |

\* El nº 17 (likes) sí es publicable, pero no tiene captura dedicada: aparece en casi
todas las del feed.
