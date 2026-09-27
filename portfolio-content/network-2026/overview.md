# Network — visión general

Etiquetas: **comprobado** = verificado en el código o ejecutándolo · **inferencia** =
deducción razonable a partir de la evidencia · **pendiente** = requiere confirmación
de Jonás.

---

## Qué es

Network es una **red social profesional full-stack**: una API REST en Django que
sirve a una aplicación de una sola página en React. Un usuario se registra, publica
texto con imagen opcional, sigue a otras personas, reacciona, comenta en hilos,
guarda publicaciones, busca, y recibe notificaciones de todo lo que le ocurre.

Nació como el **Proyecto 4 («Network») de CS50W** de Harvard y hoy es una reescritura
completa: el monolito con plantillas de Django desapareció y en su lugar hay dos
servicios desacoplados, cada uno con su imagen de Docker, su suite de pruebas y su
paso en CI. *(comprobado — `git show 5f421b7`, que elimina el monolito original, y
`docker-compose.yml`)*

---

## Qué problema técnico resuelve

El problema interesante de una red social pequeña no son las pantallas: es que **todo
está conectado con todo y todo cambia mientras lo miras**.

1. **El timeline se mueve bajo los pies del lector.** Con paginación por número de
   página, publicar algo nuevo desplaza todo hacia abajo y la «página 2» repite lo que
   ya viste. La respuesta aquí es paginación por cursor ordenada por
   `(-created_at, -id)`, con el `id` como desempate para filas creadas en el mismo
   instante. *(comprobado — `backend/apps/core/pagination.py`)*

2. **Cada tarjeta del feed necesita cinco datos agregados.** Likes, comentarios,
   reposts, «¿le di like yo?», «¿lo guardé yo?». Resolverlo con `COUNT(DISTINCT)` sobre
   varios JOIN multiplica filas y degrada la consulta. Aquí cada contador es una
   subconsulta correlacionada independiente y los booleanos por usuario son `EXISTS`.
   *(comprobado — `backend/apps/posts/views.py:_count_subquery` y `base_posts`)*

3. **Una interacción cambia varias vistas a la vez.** Dar like toca el contador de la
   tarjeta, la pestaña «Likes» del perfil, la lista de «a quién le gustó» y crea una
   notificación en otra persona. El cliente aplica el cambio de forma optimista y el
   servidor es la fuente de verdad; las notificaciones viven en su propia app de
   Django, con sus verbos y sus endpoints, en vez de colgar de las vistas de posts.
   *(comprobado — `frontend/src/hooks/cache.ts`, `backend/apps/notifications/`)*

4. **Contenido subido por terceros es contenido hostil.** Toda imagen se valida con
   Pillow, se rota según su EXIF y se le quitan los metadatos, se reescala a un tamaño
   máximo por tipo y se reescribe como WebP; hay un guardia contra bombas de
   descompresión a 40 MP. *(comprobado — `backend/apps/core/images.py`)*

---

## Estado real hoy (2026-09-26)

### ¿Está desplegado? **Sí.** *(comprobado)*

Dos servicios en Railway, ambos respondiendo en el momento de escribir esto:

| | URL | Comprobación |
| --- | --- | --- |
| Web | https://web-production-9475c.up.railway.app | HTTP 200 |
| API | https://api-production-53d41.up.railway.app | — |
| Health | `.../health/` | `{"status":"ok","version":"3.1.0","checks":{"database":"ok","cache":"ok"}}` |
| Swagger | `.../api/docs/` | HTTP 200 |

El health-check confirma que en producción hay **base de datos y caché vivas**, es
decir PostgreSQL y Redis reales, no los fallbacks de desarrollo.

**El despliegue es permanente** (confirmado por Jonás), así que la URL se puede
enlazar desde el portafolio como demo viva sin advertencias ni fecha de caducidad.

Para entrar: `ada`, `grace`, `linus`, `margaret`, `alan`, `katherine`, `tim` o `hedy`,
contraseña `network123` para todas. La propia pantalla de acceso ofrece cuatro de ellas
con un clic. *(Estas son las cuentas del `seed` del repositorio, con nombres de figuras
históricas reales; las capturas del portafolio usan un elenco ficticio aparte — ver
`README.md` §6.)*

### ¿El repositorio es público? **Sí.** *(comprobado — `gh repo view`)*

`https://github.com/JonasJavier/cs50w-network` · licencia **GPL-3.0** · 0 estrellas ·
último push 2026-09-26.

**Esta es la URL que hay que publicar.** La que enlaza hoy el portafolio
(`.../Network-3.0`) sólo llega por la redirección 301 que GitHub mantiene tras un
renombrado; el razonamiento está en `README.md` §6.

### ¿Está terminado? **Funcionalmente sí; operativamente, con matices.** *(comprobado)*

- 98 pruebas de backend y 34 de frontend en verde; CI verde en el último run de `main`.
- Cero `TODO`, `FIXME` o placeholders en `backend/apps`, `backend/config` y `frontend/src`.
- Las 35 pantallas y estados fotografiados funcionan; sólo una captura se descartó, y
  por pobreza del dato demo, no por un fallo (ver `excluded.md`).
- **Sin usuarios ni feedback**, confirmado por Jonás: no hay analítica, ni issues, ni
  estrellas, ni nadie que lo haya probado y comentado. Sentry está **integrado pero
  desactivado** salvo que se defina `SENTRY_DSN`.
- Tiempo de desarrollo: **alrededor de dos semanas** (dato de Jonás; el historial de
  git no lo refleja porque los 19 commits se concentran en 4 días).

### ¿Qué tamaño tiene? *(comprobado — ver `metrics.md`)*

2 857 líneas de Python de aplicación, 992 de pruebas de backend, 6 732 líneas de
TypeScript/CSS en el frontend. 8 modelos, 28 rutas de API con 37 operaciones, 11
páginas, 31 componentes, 11 hooks.

---

## Qué lo diferencia de un proyecto de curso

En una frase: **está construido como si fuera a mantenerlo otra persona**.

- API versionada (`/api/v1/`) con esquema OpenAPI 3 generado, Swagger y ReDoc.
- JWT con rotación de refresh y lista negra; el cambio de contraseña invalida el resto
  de sesiones.
- Límite de peticiones específico para los endpoints de credenciales, separado del
  general.
- Configuración íntegramente por variables de entorno, con valores por defecto seguros
  para desarrollo y una barrera que impide arrancar en producción con la clave de dev.
- Degradación elegante: sin `REDIS_URL` usa memoria local; el health-check reporta la
  caché pero nunca falla por ella.
- Dos imágenes Docker multi-stage conscientes de `$PORT`, `railway.json` para ambos
  servicios y un `docker-compose.yml` con PostgreSQL y Redis reales.
- CI que además de tests corre `makemigrations --check`, `check --deploy` y construye
  ambas imágenes.

El desglose de qué pedía el enunciado de CS50W y qué se añadió por encima está en
`case-notes.md`, §«CS50W: el enunciado y lo que va más allá».
