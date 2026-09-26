# Network — notas de caso (material factual, sin prosa)

Sólo hechos con su evidencia. La narración la escribes tú.
Etiquetas: **comprobado** · **inferencia** · **pendiente**.

---

## 1. Contexto

- Origen académico: **CS50W (Harvard), Proyecto 4, «Network»**. *(comprobado — el
  `README.md` lo declara; `git show d1d2a90` contiene el monolito original)*
- Historia del repositorio en tres bloques. *(comprobado — `git log`)*

| Fecha | Qué pasó |
| --- | --- |
| 2024-05-05 | `2cfa0bf` Initial commit (plantilla del curso) |
| 2026-06-12 | `d1d2a90` entrega original de CS50W → `5f421b7` se retira el monolito → `438199a` backend Django 6 + DRF → `c540d10` frontend React 19 + Vite + TS → `9be7ad4` Docker y documentación |
| 2026-09-25/26 | `a097f54` CI → `30aec11` dependencias → `9d93f32` endurecimiento + nuevas funciones sociales → `f3654b3` rediseño del frontend → `1f8773d` documentación → PR #8 y #9 (despliegue) |

- 19 commits en total, 2 pull requests fusionados (#8, #9). *(comprobado)*
- **Tiempo real de desarrollo: alrededor de dos semanas.** *(dato de Jonás,
  2026-09-26)* El historial de git no lo refleja: los commits se concentran en cuatro
  días porque el trabajo se subió en bloques, no porque se hiciera en cuatro días.
  Si usas la duración en la ficha, conviene decirlo así — «un par de semanas de
  trabajo» — y no intentar deducirla de las fechas del repositorio.

---

## 2. CS50W: el enunciado y lo que va más allá

Esta es la sección que más te interesa contar, y la evidencia permite separarla en
**tres** capas, no dos.

### 2a. Lo que el enunciado pedía *(comprobado — especificación oficial de CS50W Project 4)*

| Requisito del enunciado | Restricción declarada |
| --- | --- |
| **New Post** | escribir texto en un textarea y enviarlo |
| **All Posts** | todas las publicaciones, más recientes primero, con autor, contenido, fecha y número de likes |
| **Profile Page** | contadores de seguidores/seguidos, publicaciones del usuario en orden inverso, botón Follow/Unfollow (no sobre uno mismo) |
| **Following** | página con las publicaciones de las personas seguidas, sólo para usuarios autenticados |
| **Pagination** | **10 publicaciones por página**, con botones «Next» y «Previous» |
| **Edit Post** | editar las propias publicaciones sustituyendo el contenido por un textarea, guardar **sin recargar la página**; impedir editar las ajenas |
| **Like and Unlike** | alternar el like **de forma asíncrona con `fetch`**, sin recargar |

### 2b. Lo que la entrega original ya añadía por encima *(comprobado — `git show d1d2a90:network/models.py` y `:network/urls.py`)*

El modelo original ya tenía `Comment`, `Reply`, `dislikes`, imágenes en publicaciones
(`post_images/`), foto de perfil y portada, y campos de perfil extendido (móvil,
dirección, fecha de nacimiento, género, intereses, idiomas). Las rutas ya incluían
`add_comment`, `like_comment`, `delete_post` y `search_results`.

> Es decir: **comentarios, respuestas, imágenes, borrado y búsqueda ya iban más allá
> del enunciado en la primera entrega.** Eso es tuyo y conviene decirlo.

### 2c. Lo que añade la reescritura 3.x *(comprobado — código actual + `CHANGELOG.md`)*

**Arquitectura**
- Monolito con plantillas → **API REST versionada + SPA**, desplegables por separado.
- Autenticación por sesión → **JWT con rotación de refresh y lista negra**.
- Paginación por número de página → **paginación por cursor** para timelines.
- **Esquema OpenAPI 3** generado, con Swagger y ReDoc.

**Producto**
- **Reposts y citas** (`Post.repost_of`, con una restricción única parcial que impide
  repostear dos veces lo mismo).
- **Marcadores** privados.
- **Hashtags** extraídos en el servidor, buscables, con widget «Trending this week»
  (últimos 7 días, cacheado 5 minutos).
- **@menciones** que enlazan al perfil y notifican.
- **Notificaciones** como dominio propio, con 8 verbos, contador de no leídas,
  marcar-todo-como-leído, borrar y enlaces profundos que resaltan el comentario.
- **Perfiles** con portada, titular, ubicación, web y pestañas Posts / Media / Likes.
- **Sugerencias «a quién seguir»** cacheadas en Redis.
- **Ajustes**: tema claro/oscuro/sistema, cambio de contraseña, borrado de cuenta.
- **Búsqueda** de personas y publicaciones, con modo `#hashtag` y atajo `/`.

**Oficio**
- **132 pruebas automatizadas** (98 backend + 34 frontend) donde antes no había ninguna.
- **CI en GitHub Actions**: lint, tipos, formato, tests, `makemigrations --check`,
  `check --deploy` y construcción de ambas imágenes Docker.
- **Docker** multi-stage para ambos servicios, `docker-compose.yml` con PostgreSQL 17
  y Redis 8, `railway.json` para despliegue como código.
- **Procesado de imágenes** en servidor: validación, EXIF, reescalado, WebP.
- **Endurecimiento**: rate limit en credenciales, HSTS, cabeceras de seguridad, CSP en
  nginx, health-check, logging estructurado, Sentry y almacenamiento S3 opcionales.
- **Documentación**: `docs/architecture.md`, `docs/api.md`, `docs/development.md`,
  `docs/deployment-railway.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`.

---

## 3. Restricciones

- **Sin servidor de base de datos en desarrollo.** El proyecto arranca con SQLite y
  caché en memoria; PostgreSQL y Redis se activan sólo por variable de entorno. Eso
  obliga a que todo código dependiente de la caché funcione sin ella.
  *(comprobado — `backend/config/settings.py`, bloques DATABASES y CACHES)*
- **Sin almacenamiento de objetos garantizado.** Los archivos subidos van al disco
  local salvo que se configure un bucket S3-compatible, lo que obliga a que Django
  pueda servir `MEDIA_ROOT` él mismo (`SERVE_MEDIA`).
  *(comprobado — `settings.py`, `config/urls.py`)*
- **Una sola persona.** 19 commits, un único autor humano en el historial.
  *(comprobado — `git log`)*
- **Unas dos semanas de trabajo**, sin equipo y sin usuarios a los que consultar:
  todas las decisiones de producto se tomaron sin datos de uso.
  *(dato de Jonás + comprobado: no hay analítica, issues ni estrellas)*

---

## 4. Proceso

*(comprobado — reconstruido del historial de git)*

1. Entrega original de CS50W: Django monolítico con plantillas y JavaScript plano.
2. Decisión de reescribir en vez de refactorizar: se **elimina** el monolito completo
   en un commit dedicado (`5f421b7`) antes de escribir nada nuevo.
3. Backend primero (`438199a`), frontend después (`c540d10`), contenedores al final
   (`9be7ad4`).
4. Tres meses después, un segundo bloque de trabajo orientado a producción: primero
   CI (`a097f54`), luego actualización de dependencias vulnerables (`30aec11`), luego
   endurecimiento y funciones (`9d93f32`, `f3654b3`), luego documentación (`1f8773d`).
5. Despliegue real y ajustes derivados de él: permisos de volumen, `HOME` para el
   usuario sin privilegios, migración corregida, `SEED_ON_START` (PR #9).

> **inferencia**: el orden (CI y dependencias *antes* que funciones nuevas) sugiere
> una decisión deliberada de asegurar la red antes de volver a tocar el producto.

---

## 5. Decisiones técnicas

### 5.1 Autenticación — JWT con rotación y lista negra

*(comprobado — `backend/config/settings.py:SIMPLE_JWT`, `apps/users/views.py`)*

- Access 30 min, refresh 7 días, ambos configurables por entorno.
- `ROTATE_REFRESH_TOKENS: True` + `BLACKLIST_AFTER_ROTATION: True`: cada uso del
  refresh emite uno nuevo e invalida el anterior, así un refresh robado sirve una vez.
- El cambio de contraseña llama a `revoke_all_tokens()`, que pone en lista negra
  **todos** los refresh vivos del usuario, y devuelve un par nuevo para la sesión actual.
- Login por **usuario o email** mediante un backend de autenticación propio
  (`apps/users/backends.py:EmailOrUsernameBackend`).
- En el cliente, un interceptor de Axios reintenta una vez tras refrescar, con una
  única promesa compartida para que N peticiones en paralelo no disparen N refrescos.
  *(comprobado — `frontend/src/lib/api.ts`, variable `refreshPromise`)*

### 5.2 Paginación — cursor para timelines, página para listas acotadas

*(comprobado — `backend/apps/core/pagination.py`)*

- `TimelineCursorPagination`: posts y notificaciones. `ordering = ("-created_at", "-id")`.
  El comentario del propio código explica el porqué: *«Cursors stay correct while new
  items are inserted at the top, which page numbers cannot guarantee for a live feed»*.
- `StandardPagination`: personas, comentarios, resultados de búsqueda. Página de 10,
  máximo 50, tamaño configurable por query param.

> El enunciado de CS50W pedía exactamente 10 por página con botones Next/Previous.
> Aquí el tamaño de página sigue siendo 10, pero el mecanismo cambió y la interacción
> es scroll infinito con `IntersectionObserver`.
> *(comprobado — `frontend/src/hooks/useInfiniteScroll.ts`)*

### 5.3 Consultas del feed — subconsultas correlacionadas en vez de JOIN múltiples

*(comprobado — `backend/apps/posts/views.py`)*

```python
def _count_subquery(model, fk):
    """COUNT(*) of `model` rows pointing at the outer post, without join explosion."""
```

Cada tarjeta necesita `likes_count`, `comments_count`, `reposts_count`, `is_liked`,
`is_reposted`, `is_bookmarked`. Los tres contadores son subconsultas correlacionadas
independientes; los tres booleanos son `Exists`. Además `select_related("author")`,
`prefetch_related("hashtags")` y un `Prefetch("repost_of")` que aplica **el mismo
conjunto de anotaciones** al post original embebido, para que la tarjeta citada
también traiga sus contadores.

### 5.4 Caché / Redis — opcional y no crítica

*(comprobado — `settings.py`, `apps/posts/views.py`, `apps/users/views.py`, `apps/core/views.py`)*

- Con `REDIS_URL` usa `django_redis` con `IGNORE_EXCEPTIONS: True` y timeouts de 3 s:
  si Redis cae, la aplicación se ralentiza, no se rompe.
- Sin `REDIS_URL` cae a `LocMemCache`.
- Dos cosas se cachean: **hashtags en tendencia** (clave global, 5 min) y
  **sugerencias de a quién seguir** (clave por usuario, 5 min, invalidada al
  seguir/dejar de seguir).
- El health-check reporta el estado de la caché pero **nunca devuelve 503 por ella**;
  sólo la base de datos puede marcar el servicio como caído.

### 5.5 Tiempo real — **no hay**

*(comprobado)*

No hay WebSockets, ni SSE, ni Channels, ni polling explícito. La frescura la da
TanStack Query al refetch. `config/asgi.py` existe porque Django lo genera, pero el
despliegue usa Gunicorn WSGI. **No afirmes tiempo real en el portafolio.**

### 5.6 Modelo de datos — tres decisiones no obvias

*(comprobado — `backend/apps/posts/models.py`, `apps/users/models.py`)*

1. **Un repost y una cita son el mismo modelo.** `Post.repost_of` apunta a otro post;
   si además hay contenido propio es una cita, si no es un repost. La propiedad
   `is_repost` lo distingue, y una `UniqueConstraint` **condicional**
   (`condition=Q(content="") & NO_IMAGE`) impide repostear dos veces lo mismo sin
   impedir citarlo varias veces.
2. **No se puede seguir a uno mismo a nivel de base de datos**, con
   `CheckConstraint(condition=~Q(follower=F("following")))`, no sólo por validación
   en la vista.
3. **Nombres de usuario reservados**: un `frozenset` de 22 nombres (`me`, `admin`,
   `api`, `settings`, `search`…) que colisionarían con rutas de la SPA o de la API.

### 5.7 Frontend — estado servidor y estado cliente separados

*(comprobado — `frontend/src/hooks/`, `frontend/src/stores/`)*

- **TanStack Query** para todo lo que vive en el servidor (11 hooks).
- **Zustand** con `persist` para las tres cosas que son del cliente: sesión (`auth`),
  tema (`theme`) y avisos (`toast`).
- `hooks/cache.ts` centraliza las actualizaciones optimistas para que un like escrito
  en el feed se refleje también en el detalle del post y en el perfil.
- Todas las rutas son `lazy()`; el build produce un chunk por página.

### 5.8 Seguridad y subida de archivos

*(comprobado — `apps/core/images.py`, `apps/core/throttling.py`, `settings.py`, `frontend/nginx.conf.template`)*

- `AuthRateThrottle` con scope propio (`10/min` por defecto) sobre registro, login y
  cambio de contraseña, con la clave basada **sólo en la IP**, con un comentario que
  explica el porqué: el atacante es anónimo o tiene token de otra cuenta.
- Imágenes: validación con Pillow, `Image.MAX_IMAGE_PIXELS = 40_000_000`,
  `exif_transpose`, reescalado por tipo (post 1600², avatar 512², portada 1600×600),
  reescritura a WebP. Los GIF animados se dejan intactos a propósito.
- Con `DEBUG=0`: HSTS un año con subdominios y preload, cookies seguras, nosniff,
  referrer-policy, `X_FRAME_OPTIONS=DENY`, y la aplicación **se niega a arrancar** si
  la `SECRET_KEY` es la de desarrollo o mide menos de 32 caracteres.
- La CSP la sirve nginx, no Django.

---

## 6. Desafíos

*(comprobado a partir de los comentarios del propio código, que documentan el porqué)*

1. **Que el feed no se repita al paginar** → cursor con desempate por `id`.
2. **Que la tarjeta no dispare N+1 ni multiplique filas** → subconsultas correlacionadas
   en lugar de `COUNT(DISTINCT)` sobre JOIN.
3. **Que un repost concurrente no reviente** → `try/except IntegrityError` alrededor de
   la creación, apoyado en la restricción única parcial, con el comentario
   *«raced with a concurrent request — already reposted»*.
4. **Que un refresh caducado no dispare una tormenta de refrescos** → promesa compartida
   en el interceptor.
5. **Que el tema no parpadee al cargar** → script inline en `index.html` que aplica la
   clase `dark` antes de que React monte.
6. **Que las notificaciones no se dupliquen ni queden huérfanas** → `get_or_create` al
   crear y borrado explícito de la notificación cuando se deshace el like, el follow o
   el repost.
7. **Que el seed sea reproducible** → dos generadores de aleatoriedad con semilla fija,
   uno para relaciones y otro para imágenes, y consumo incondicional de valores para
   que la secuencia no se desplace entre ejecuciones.

---

## 7. Aprendizajes

> **inferencia** en todos los casos: son lecturas del código, no declaraciones tuyas.
> Confírmalos o cámbialos antes de publicarlos en primera persona.

- Reescribir salió más barato que refactorizar: el monolito se borró de una vez, en su
  propio commit, antes de escribir el reemplazo.
- El orden del segundo bloque de trabajo (CI → dependencias → funciones) sugiere haber
  aprendido a asegurar la red antes de volver a construir.
- El código explica el *porqué*, no el *qué*: los comentarios más largos del repositorio
  están en `pagination.py`, `throttling.py`, `images.py` y `seed.py`, y todos justifican
  una decisión.
- El despliegue enseñó cosas que el desarrollo no: los cuatro commits posteriores al
  primer despliegue son permisos de volumen, `HOME` del usuario sin privilegios,
  una migración desalineada con el modelo y un flag de sembrado al arrancar.

---

## 8. Estado

Ver `overview.md` §«Estado real hoy». Resumen: **desplegado de forma permanente** y
respondiendo, repositorio público, CI verde, 132 pruebas en verde, sin deuda visible
marcada en el código.

Sin usuarios ni feedback: nadie externo lo ha usado, así que no hay ninguna cifra de
adopción que contar ni ninguna lección venida de usuarios reales.
*(confirmado por Jonás, 2026-09-26)*

**pendiente**: si hay trabajo planeado después de 3.1.0. Mientras no se confirme, todo
el material presenta el proyecto como terminado en esa versión, sin prometer
continuidad ni declararlo abandonado.
