# Network — flujos de datos

Cuatro recorridos completos, del clic a la base de datos y de vuelta. Todo comprobado
en el código del commit `e90c581`.

---

## 1. Cargar el feed

```
HomePage
  └─ PostFeed
       └─ usePostsFeed()                    TanStack Query, infinito
            └─ GET /api/v1/posts/?cursor=…
                 │
                 └─ PostViewSet.get_queryset()
                      annotated_posts(user)
                        ├─ select_related("author")
                        ├─ prefetch_related("hashtags")
                        ├─ likes_count      ← subconsulta correlacionada
                        ├─ comments_count   ← subconsulta correlacionada
                        ├─ reposts_count    ← subconsulta correlacionada
                        ├─ is_liked         ← EXISTS
                        ├─ is_reposted      ← EXISTS
                        ├─ is_bookmarked    ← EXISTS
                        └─ Prefetch("repost_of", queryset=base_posts(user))
                      └─ TimelineCursorPagination, 10 por página,
                         orden (-created_at, -id)
```

Dos detalles que importan:

- **Los contadores no usan `COUNT(DISTINCT)` sobre JOIN.** Cada uno es una subconsulta
  correlacionada independiente, para que combinar tres agregados no multiplique filas.
  El helper se llama `_count_subquery` y su docstring lo dice: *«without join
  explosion»*.
- **El post citado se anota igual que el de primer nivel.** El `Prefetch` sobre
  `repost_of` aplica `base_posts(user)`, así que la tarjeta embebida también trae sus
  contadores y su estado por usuario, sin una segunda ronda de consultas.

El scroll infinito lo dispara un `IntersectionObserver` sobre un `<div>` centinela al
final de la lista (`hooks/useInfiniteScroll.ts`).

---

## 2. Dar like a una publicación

```
PostCard  ── clic ──►  useLikePost()  (mutación optimista)
                          │
                          ├─ 1. cancela refetches en vuelo
                          ├─ 2. escribe el nuevo estado en la caché  ← la UI ya cambió
                          ├─ 3. POST /api/v1/posts/{id}/like/
                          │        │
                          │        └─ PostLike.objects.get_or_create()
                          │             ├─ creado  → Notification(LIKE_POST)  si no es tuyo
                          │             └─ existía → borra el like Y borra la notificación
                          │
                          ├─ 4. onError   → revierte al snapshot anterior
                          └─ 5. onSettled → invalida y sincroniza con el servidor
```

Lo que hace que esto no se desmonte:

- **Deshacer el like borra la notificación.** No se queda un «te dio like» de algo que
  ya no tiene like. Lo mismo ocurre con follow y repost.
  *(`apps/posts/views.py:like`, `apps/users/views.py:follow`)*
- **La escritura optimista se propaga a todas las vistas.** `hooks/cache.ts` actualiza
  la entrada en el feed, en el detalle del post y en la lista del perfil, para que no
  haya dos contadores distintos en pantalla.
- **La respuesta trae la verdad**: `{"is_liked": …, "likes_count": …}` recalculado en
  el servidor.

---

## 3. Publicar con hashtags y menciones

```
PostComposer
  └─ POST /api/v1/posts/   (multipart: content, image?, repost_of_id?)
       │
       └─ PostViewSet.perform_create()      ── todo dentro de transaction.atomic()
            ├─ serializer.save(author=request.user)
            │    └─ el serializador pasa la imagen por process_image()
            │         · Pillow la valida y la abre       (falla → 400)
            │         · exif_transpose y descarte de metadatos
            │         · thumbnail al máximo del tipo      (post 1600×1600)
            │         · reescritura a WebP                (calidad 85)
            │         · los GIF animados se dejan intactos
            │
            ├─ sync_hashtags(post)
            │    · extract_hashtags()  → minúsculas, únicos, máximo 10,
            │                            descarta los que no tienen ninguna letra
            │    · bulk_create(ignore_conflicts=True) + post.hashtags.set(...)
            │
            ├─ si es una cita → Notification(QUOTE) al autor del original
            │
            └─ notify_mentions(actor, content, post, exclude_ids=[autor del original])
                 · extract_mentions() → @usuario, únicos, en orden
                 · sólo usuarios existentes y activos
                 · nunca a uno mismo, nunca a quien ya recibió la de cita
                 · Notification(MENTION) con get_or_create → sin duplicados
```

Al editar, `perform_update` vuelve a llamar a `sync_hashtags`, así que quitar un
`#tag` del texto lo desvincula de la publicación.

---

## 4. Notificación → destino exacto

```
NotificationsPage
  └─ GET /api/v1/notifications/            cursor, 10 por página
       select_related("actor", "post", "post__repost_of", "comment")
       │
       └─ NotificationSerializer
            ├─ post_preview      ← 80 caracteres; si es un repost, los del original;
            │                       si sólo hay imagen, "📷 Photo"
            └─ comment_preview   ← 80 caracteres del comentario

  clic en una fila
       ├─ si no estaba leída → POST /notifications/{id}/read/
       └─ navigate(targetPath(n))
            ├─ con comentario → /post/{post}?comment={comment}
            ├─ con post       → /post/{post}
            └─ sin ninguno    → /profile/{actor}        (caso "te siguió")

  PostDetailPage lee ?comment=…
       └─ CommentSection hace scroll hasta #comment-{id} y lo resalta
```

El contador de no leídas es una consulta aparte (`GET /notifications/unread-count/`)
que alimenta la insignia de la barra superior y de la navegación móvil.

---

## 5. Ciclo de vida del token

```
login / register
  └─ { access (30 min), refresh (7 días), user }   → localStorage "network-auth"

cada petición
  └─ interceptor de petición añade Authorization: Bearer <access>

401 en una ruta que no es /auth/
  └─ interceptor de respuesta
       ├─ ¿ya se reintentó?  → propaga el error
       └─ refreshPromise ??= refreshAccessToken()      ← una sola para todas
            ├─ POST /auth/token/refresh/
            │    └─ emite un par nuevo y pone el viejo en lista negra
            ├─ éxito → reintenta la original con el token nuevo
            └─ fallo → logout() y vuelta a /login

cambio de contraseña
  └─ revoke_all_tokens(user): todos los refresh vivos a la lista negra
       + par nuevo devuelto sólo a la sesión que hizo el cambio

logout
  └─ POST /auth/logout/ con el refresh → lista negra
       + queryClient.clear()
```

---

## Dónde se toca la caché

| Acción | Efecto |
| --- | --- |
| Pedir hashtags en tendencia | lee `hashtags:trending`; si falta, consulta los últimos 7 días, top 8, y guarda 5 min |
| Pedir sugerencias | lee `user-suggestions:<id>`; si falta, calcula los 5 más seguidos que no sigues y guarda 5 min |
| Seguir o dejar de seguir | **borra** `user-suggestions:<id>` del que actúa |
| `/health/` | escribe y lee una clave de prueba; informa del resultado pero no falla por él |
