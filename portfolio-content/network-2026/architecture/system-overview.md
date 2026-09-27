# Network — arquitectura del sistema

Todo lo de esta página está comprobado contra el código del commit `e90c581`.

---

## Forma general

Dos servicios independientes, desplegables y escalables por separado, que no comparten
nada más que un contrato HTTP.

```
Navegador
   │
   ├── SPA estático  ──►  nginx  (imagen frontend)
   │                        · sirve el bundle de Vite
   │                        · cabeceras de seguridad + CSP
   │                        · fallback SPA a index.html
   │
   └── XHR /api/v1/  ──►  Gunicorn → Django + DRF  (imagen backend)
                              │
                              ├── PostgreSQL 17     (datos)
                              ├── Redis 8           (caché, opcional)
                              └── disco o S3        (media)
```

El SPA nunca es servido por Django. Django nunca renderiza HTML de producto: sólo API
JSON, el esquema OpenAPI, el panel de administración y, si hace falta, los archivos
subidos. *(`backend/config/urls.py`)*

---

## El backend, por dentro

Cuatro aplicaciones de Django, separadas por dominio y no por capa técnica.

| App | Responsabilidad | Modelos |
| --- | --- | --- |
| `core` | piezas transversales: paginación, permisos, throttling, procesado de imágenes, parseo de texto, health-check, comando `seed` | ninguno |
| `users` | identidad, perfil y grafo de seguimiento | `User`, `Follow` |
| `posts` | publicaciones, reposts, citas, likes, marcadores, hashtags y comentarios | `Post`, `PostLike`, `Bookmark`, `Comment`, `Hashtag` |
| `notifications` | actividad dirigida a una persona | `Notification` |

La dirección de las dependencias es deliberada: `posts` importa de `users` y de
`notifications`, pero `notifications` no importa de `posts` salvo por referencias
perezosas por cadena (`"posts.Post"`), así que el dominio de notificaciones no queda
atado al de publicaciones.

### Los tres modelos con decisiones no obvias

**`Post` hace tres cosas con una sola tabla.** `repost_of` nulo → publicación normal.
`repost_of` con contenido → cita. `repost_of` sin contenido ni imagen → repost. Y una
restricción única **condicional** impide repostear dos veces lo mismo sin impedir
citarlo varias veces:

```python
models.UniqueConstraint(
    fields=["author", "repost_of"],
    condition=Q(content="") & NO_IMAGE,
    name="unique_plain_repost",
)
```

**`Follow` prohíbe seguirse a uno mismo en la base de datos**, no sólo en la vista:

```python
models.CheckConstraint(condition=~Q(follower=F("following")), name="no_self_follow")
```

**`Notification`** guarda destinatario, actor, verbo y, opcionalmente, la publicación
y el comentario implicados. Ocho verbos y un índice compuesto
`(recipient, is_read, -created_at)` pensado exactamente para las dos consultas que
existen: la lista y el contador de no leídas.

---

## El frontend, por dentro

```
src/
├── lib/        cliente HTTP, tipos, utilidades, tokenizador de texto enriquecido
├── hooks/      11 hooks de TanStack Query + helpers de caché
├── stores/     3 stores de Zustand (auth, theme, toast) con persist
├── components/ ui · layout · posts · users
└── pages/      11 rutas, todas cargadas con lazy()
```

**La separación importante** es entre estado de servidor y estado de cliente:

- Lo que vive en el servidor (publicaciones, perfiles, notificaciones) lo gobierna
  **TanStack Query**: caché, reintentos, scroll infinito y actualizaciones optimistas.
- Lo que es del cliente y sólo del cliente (sesión, tema, avisos) lo gobierna
  **Zustand** con `persist` sobre `localStorage`.

`hooks/cache.ts` centraliza las escrituras optimistas para que un like dado en el feed
se refleje también en el detalle de la publicación y en el perfil, sin repetir la
lógica en tres sitios.

---

## Autenticación, de principio a fin

1. `POST /api/v1/auth/token/` con usuario **o** email y contraseña.
2. La respuesta trae `access` (30 min), `refresh` (7 días) y el objeto del usuario, así
   que el cliente queda autenticado sin una segunda petición.
3. Un interceptor de petición de Axios añade `Authorization: Bearer <access>`.
4. Ante un 401 en una ruta que no sea de `auth`, un interceptor de respuesta refresca
   una sola vez y reintenta. Las peticiones concurrentes comparten **una única**
   promesa de refresco, así que N fallos simultáneos provocan un refresco, no N.
5. Cada uso del refresh emite uno nuevo y pone el anterior en lista negra.
6. Cambiar la contraseña pone en lista negra **todos** los refresh del usuario y
   devuelve un par nuevo sólo para la sesión actual.

---

## Caché

Sólo dos cosas se cachean, y ninguna es crítica:

| Clave | TTL | Invalidación |
| --- | --- | --- |
| `hashtags:trending` | 5 min | por expiración |
| `user-suggestions:<id>` | 5 min | expiración **o** al seguir/dejar de seguir |

Con `REDIS_URL` se usa `django_redis` con `IGNORE_EXCEPTIONS: True` y timeouts de 3 s.
Sin `REDIS_URL` se usa `LocMemCache`. El health-check informa del estado de la caché
pero **nunca** devuelve 503 por ella: sólo la base de datos puede tumbar el servicio.

---

## Configuración

Todo por variables de entorno, con valores por defecto de desarrollo. Las barreras
importantes:

- Si `DJANGO_DEBUG=0` y la `SECRET_KEY` es la de desarrollo o mide menos de 32
  caracteres, **la aplicación se niega a arrancar** (`ImproperlyConfigured`).
- Con `DEBUG=0` se activan HSTS (1 año, subdominios, preload), cookies seguras,
  nosniff, referrer-policy y `X_FRAME_OPTIONS=DENY`.
- Railway inyecta `RAILWAY_PUBLIC_DOMAIN` y `RAILWAY_PRIVATE_DOMAIN`, y los settings
  los añaden solos a `ALLOWED_HOSTS` y `CSRF_TRUSTED_ORIGINS`.
- La **CSP no la pone Django**: la pone nginx en el contenedor del frontend.

---

## Lo que **no** hay

Dicho explícitamente para que nadie lo dé por supuesto:

- **No hay tiempo real.** Ni WebSockets, ni SSE, ni Channels, ni polling explícito.
  `asgi.py` existe porque Django lo genera; el despliegue usa Gunicorn WSGI.
- **No hay cola de tareas.** Ni Celery, ni RQ, ni tareas en segundo plano. Las
  notificaciones se crean dentro de la misma transacción que la acción que las provoca.
- **No hay service worker**, así que tampoco hay funcionamiento offline.
- **No hay multi-tenancy, ni feature flags, ni sistema de permisos** más allá de
  «autenticado» y «eres el autor».
