# Network — decisiones de diseño y UX

Seis pares problema → decisión. Máximo 20 palabras por lado, como pediste.
Cada uno con su captura principal y con la evidencia en el código que lo respalda.

---

## 1. Feed

**Captura principal**: `04-feed-desktop.png`

> **Problema**: el contenido de una red social depende de a quién sigues, y eso no se
> descubre solo.
>
> **Decisión**: publicar, conversar y descubrir personas conviven en una sola vista de
> tres columnas.

*Evidencia*: `components/layout/AppLayout.tsx` define la rejilla
`260px · contenido · 300px`; la columna derecha (`SidebarRight.tsx`) trae «Who to
follow» y «Trending this week» sin sacar al usuario del feed.

---

## 2. Paginación del timeline

**Captura principal**: `06-feed-infinite-scroll-desktop.png`

> **Problema**: con páginas numeradas, publicar algo nuevo desplaza la lista y la
> página siguiente repite contenido.
>
> **Decisión**: cursor ordenado por fecha e id, cargado al llegar al final en vez de
> con botones.

*Evidencia*: `apps/core/pagination.py:TimelineCursorPagination`, cuyo docstring dice
*«Cursors stay correct while new items are inserted at the top»*;
`hooks/useInfiniteScroll.ts` usa `IntersectionObserver`.
El enunciado de CS50W pedía 10 por página con botones Next/Previous: el tamaño de
página sigue siendo 10, el mecanismo cambió.

---

## 3. Estados de carga

**Captura principal**: `05-feed-loading-skeleton-desktop.png`

> **Problema**: un spinner centrado no dice qué viene, y al llegar el contenido la
> página salta.
>
> **Decisión**: esqueletos con la geometría exacta de la tarjeta real, para que el
> layout no se mueva.

*Evidencia*: `components/ui/PostSkeleton.tsx` replica avatar, dos líneas de cabecera,
tres de texto y tres botones; el contenedor lleva `role="status"` y
`aria-label="Loading posts"`.

---

## 4. Estados vacíos

**Captura principal**: `37-empty-following-feed-desktop.png`

> **Problema**: una pantalla vacía que sólo dice «no hay nada» parece una función a
> medio terminar.
>
> **Decisión**: cada vacío explica qué irá ahí y ofrece la acción que lo llena.

*Evidencia*: `components/ui/EmptyState.tsx` exige `title` y acepta `description` y
`action`; hay copia específica para feed de seguidos, marcadores, notificaciones,
perfil sin publicaciones, sin medios, sin likes, búsqueda sin resultados y perfil
inexistente. El feed de seguidos vacío enlaza directamente a «Find people to follow →».

---

## 5. Acciones destructivas

**Captura principal**: `35-settings-delete-account-modal-desktop.png`

> **Problema**: «¿Estás seguro?» no informa de nada; el usuario confirma sin saber qué
> pierde.
>
> **Decisión**: el diálogo nombra la consecuencia concreta y, si es irreversible, pide
> la contraseña.

*Evidencia*: el modal de borrar cuenta enumera «profile, posts, comments, likes and
followers» y exige contraseña; el de borrar publicación avisa de que también se van
respuestas, likes y reposts; el de limpiar notificaciones dice exactamente qué borra.
`pages/SettingsPage.tsx`, `components/ui/ConfirmDialog.tsx`.

---

## 6. Notificaciones

**Captura principal**: `25-notifications-desktop.png`

> **Problema**: ocho tipos de actividad distintos en una sola lista se leen como un
> muro indiferenciado.
>
> **Decisión**: cada verbo lleva su icono, su color y su frase, y cada fila lleva a su
> origen exacto.

*Evidencia*: `pages/NotificationsPage.tsx:VERB_META` asocia icono y color a los ocho
verbos; `targetPath()` construye `/post/:id?comment=:commentId`, y el destino resalta
el comentario con un anillo (captura `15`). Las no leídas tienen fondo y punto.
En el backend, las notificaciones son una app de Django propia, no un campo colgado de
los posts.

---

## Nota sobre el modo oscuro

No es un séptimo par, pero conviene saberlo si lo cuentas: el tema no es un filtro
invertido. `stores/theme.ts` distingue *preferencia* (claro/oscuro/**sistema**) de
*tema resuelto*, escucha los cambios del sistema operativo en vivo, y un script inline
en `index.html` aplica la clase antes de que React monte para que no haya parpadeo.
Comparación visual: `34-settings-desktop.png` frente a `46-settings-dark-desktop.png`.
