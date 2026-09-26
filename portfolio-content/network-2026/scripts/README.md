# Scripts — sembrado y captura reproducibles

Tres piezas, en el orden en que se usan:

| Archivo | Qué hace |
| --- | --- |
| `demo-env.sh` | variables compartidas: rutas, puertos, base de datos y media aislados |
| `seed_portfolio_demo.py` | crea la base demo con personas **ficticias** |
| `capture.mjs` | recorre la aplicación con Playwright y guarda las 75 capturas |
| `gen_manifest.py` | regenera `screenshots/manifest.md` desde una tabla de metadatos |

---

## Garantías de aislamiento

Nada de esto escribe dentro del repositorio de Network.

- La base de datos es un **SQLite propio** fuera del repo, elegido con `DATABASE_URL`.
- Los archivos subidos van a un **`MEDIA_ROOT` propio**, también fuera del repo.
- El `db.sqlite3` de desarrollo y `backend/media/` del repositorio **no se tocan**.
- El único efecto secundario sobre el repositorio es `frontend/node_modules/`, creado
  por `npm ci` y ya ignorado por git.

---

## Requisitos

- Python con las dependencias del backend instaladas (el `.venv` del repositorio sirve).
- Node 20 o superior.
- Playwright con Chromium. Se instala en un directorio de trabajo aparte, **no** dentro
  del portafolio:

  ```bash
  mkdir -p /tmp/network-capture && cd /tmp/network-capture
  npm init -y
  npm i playwright
  npx playwright install chromium
  ```

---

## Paso 1 — variables de entorno

`demo-env.sh` está escrito para esta máquina; ajusta `REPO` y `DEMO_DIR` si lo mueves.
Los puertos son los que estaban libres aquí: el 8000 y el 5173 los ocupan otros
proyectos.

```bash
source scripts/demo-env.sh
mkdir -p "$DEMO_DIR/media"
```

Define `REPO`, `NETWORK_BACKEND`, `DEMO_DIR`, `DATABASE_URL`, `MEDIA_ROOT`,
`WEB_PORT` (5199), `API_PORT` (8001), `CORS_ALLOWED_ORIGINS` y `PY`.

## Paso 2 — migrar y sembrar

```bash
cd "$NETWORK_BACKEND"
"$PY" manage.py migrate
"$PY" /ruta/a/scripts/seed_portfolio_demo.py
```

El script es **idempotente**: borra todas sus filas y reconstruye desde cero con una
semilla fija, así que dos ejecuciones producen los mismos datos (salvo las marcas de
tiempo, que son relativas al momento de ejecutar).

Salida esperada:

```
users: 10
follows: 54
posts: 32
quotes: 4
reposts: 7
likes: 156, comments: 51, replies: 25, bookmarks: 7
hero notification verbs on page 1: 8/8
totals - users: 10, posts: 43 (incl. 4 quotes / 7 reposts), comments: 76, likes: 156,
bookmarks: 13, hashtags: 22, notifications: 300 (unread for mira.kessel: 8)
```

### Qué crea, y por qué así

- **Diez personas inventadas.** No se usó `manage.py seed` del repositorio porque crea
  ocho cuentas con nombres de personas reales (Ada Lovelace, Grace Hopper, Linus
  Torvalds…), y el portafolio no puede mostrar eso.
- **Avatares y portadas generados por código**: degradado abstracto con las iniciales
  encima. Nunca fotografías de personas.
- **`mira.kessel` es la cuenta protagonista**: perfil completo, seis publicaciones con
  imagen (justo para dos filas completas de la rejilla de medios), marcadores y ocho
  notificaciones sin leer, una de cada verbo.
- **`noah.fielding` es una cuenta recién creada** y se mantiene deliberadamente vacía:
  es la que permite fotografiar los estados vacíos con datos honestos en vez de
  falsearlos.
- **Las marcas de tiempo se reescriben** después de insertar. Tres motivos:
  1. Sin eso, todo aparecería como «ahora» y el feed no tendría profundidad.
  2. `is_edited` se calcula como `updated_at - created_at > 2 s`, así que hay que mover
     las dos o **todas** las publicaciones se marcarían como editadas.
  3. `date_joined` se reescribe **después** de guardar el avatar, porque
     `FileField.save(save=True)` reescribe la fila entera y devolvería la fecha de hoy.
- **Los reposts apuntan a publicaciones antiguas.** Un repost se guarda como una fila
  propia y el feed no deduplica, así que un repost pegado a su original produce dos
  tarjetas idénticas seguidas. El comportamiento del producto se documenta en
  `../README.md` §5; los datos simplemente no provocan el caso extremo.
- **Los comentarios de una misma publicación nunca repiten texto**: el texto se sortea
  sin reemplazo, porque dos comentarios idénticos parecen un fallo de renderizado.

### Contraseña de las cuentas demo

Por defecto `PortfolioDemo!2026`, configurable con la variable `DEMO_PASSWORD`. Sólo
existe en esta base local; **no** es una credencial de nada real, y no aparece en
ninguna captura.

## Paso 3 — levantar la aplicación

Dos terminales, ambas con `source scripts/demo-env.sh` hecho.

```bash
# API
cd "$NETWORK_BACKEND"
"$PY" manage.py runserver "127.0.0.1:$API_PORT" --noreload
```

```bash
# Web
cd "$REPO/frontend"
npm ci                      # sólo la primera vez
VITE_API_URL="http://127.0.0.1:8001" VITE_SHOW_DEMO_ACCOUNTS=0 \
  npx vite --port 5199 --strictPort
```

`VITE_SHOW_DEMO_ACCOUNTS=0` es un flag **del propio proyecto**, documentado en
`frontend/.env.example`. Oculta el ayudante de cuentas demo de la pantalla de login,
que mostraría una contraseña en claro y nombres de personas reales.

## Paso 4 — capturar

`capture.mjs` importa `playwright`, así que hay que ejecutarlo desde el directorio
donde esté instalado:

```bash
cp scripts/capture.mjs /tmp/network-capture/
cd /tmp/network-capture
WEB_URL="http://127.0.0.1:5199" \
API_URL="http://127.0.0.1:8001" \
OUT_DIR="/ruta/a/portfolio-content/network-2026/screenshots/raw" \
COMPOSER_IMAGE="$DEMO_DIR/media/posts/post-10.webp" \
node capture.mjs
```

Salida esperada: `done: 75/75 captured`, más un `_capture-report.json` en `OUT_DIR`
con los fallos si los hubiera.

### Cómo consigue capturas estables

- **Sesión inyectada, no tecleada.** El script pide los tokens a la API y los escribe
  en `localStorage` con un `addInitScript`, en vez de rellenar el formulario de login
  75 veces. La pantalla de login se captura aparte, sin sesión.
- **Tema forzado por `localStorage`**, no pulsando el conmutador, para que el modo
  oscuro sea determinista.
- **Animaciones y transiciones a cero** mediante una hoja de estilo inyectada, y cursor
  de texto transparente, para que dos ejecuciones den el mismo píxel.
- **Espera en tres tiempos**: `networkidle`, `document.fonts.ready` y una pausa corta.
- **Ids descubiertos en tiempo de ejecución**: el script consulta la API para encontrar
  una publicación de la protagonista con comentarios e imagen, y el id de un comentario
  real, en vez de codificar números que cambian en cada sembrado.
- **Los esqueletos de carga se capturan interceptando la petición** del feed y
  retrasándola seis segundos.
- Un contexto de navegador nuevo por captura, así ninguna deja estado a la siguiente.

## Paso 5 — regenerar el manifiesto

```bash
python scripts/gen_manifest.py
```

Lee los archivos de `screenshots/raw/`, cruza cada uno con la tabla de metadatos del
propio script y reescribe `screenshots/manifest.md`. Verifica además que ninguna
caption pase de 15 palabras.

---

## Verificar que el resultado es correcto

```bash
# 75 en raw, 74 en principales
ls screenshots/raw/*.png | wc -l
ls screenshots/principales/*.png | wc -l

# ninguna publicación marcada como editada
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8001/api/v1/posts/?page_size=50" | \
  python -c "import sys,json; d=json.load(sys.stdin); \
  print('editadas:', sum(1 for p in d['results'] if p['is_edited']))"

# nodes.yaml apunta a capturas que existen
python -c "import yaml,pathlib; \
d=yaml.safe_load(open('architecture/nodes.yaml',encoding='utf-8')); \
p={x.name for x in pathlib.Path('screenshots/principales').glob('*.png')}; \
print([n['id'] for n in d['nodes'] if n.get('screen') and n['screen'] not in p] or 'ok')"
```

## Limpiar

```bash
rm -rf "$DEMO_DIR"     # base de datos y media demo
```

No hay nada que revertir en el repositorio de Network.
