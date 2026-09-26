# Scripts reproducibles

Recrean la base demo y las 63 capturas sin tocar el código de IZAK-S-PHOTOS ni su `backend/db.sqlite3`. Todo lo local va a `%TEMP%/izaks-portfolio-demo`. En jonas-orbit-v3 sólo escriben dentro de esta carpeta.

| Script | Qué hace |
| --- | --- |
| `seed_demo.py` | Crea la base SQLite demo: migra, siembra 8 solicitudes ficticias (correos `@example.com`, teléfonos 555; 4 atendidas) con fechas de los últimos 15 días y crea el superusuario `demo-admin`, que sólo existe en esa base. Ignora las variables `DJANGO_*` y `DATABASE_URL` globales de esta PC. |
| `serve_demo.py` | Compila el frontend (`npm --prefix frontend run build`, que escribe en `frontend/dist`, carpeta ignorada por git) y levanta Django en `127.0.0.1:8000` contra la base demo. Sirve el build, la API y el admin desde el mismo origen, como en Railway. |
| `capture.mjs` | Recorre el sitio y el admin con Playwright (1440×900 y 390×844, `deviceScaleFactor` 2, `prefers-reduced-motion: reduce`). Guarda los PNG en `../screenshots/raw/` y escribe `../screenshots/capture-report.json`. |

## Pasos (Git Bash, en Windows)

```bash
cd "C:/Users/savage/Documents/kimi/Workspaces/portafolio espacial/jonas-orbit-v3/portfolio-content/izaks-photos-2026/scripts"
PYTHONUTF8=1 python seed_demo.py
python serve_demo.py        # dejar corriendo en otra terminal
node capture.mjs
```

`python` tiene que tener instalado `requirements.txt` del repo. El `env/` que estuvo versionado no sirve: le falta WhiteNoise. Se usó un venv aparte con Python 3.12.10.

`serve_demo.py` arranca Django con `--noreload` y la plantilla `index.html` queda en caché. Si recompilas el frontend, reinicia el servidor.

La selección de `principales/` se hizo a mano revisando cada imagen: ver [../screenshots/manifest.md](../screenshots/manifest.md) y [../excluded.md](../excluded.md).

## Qué se simula y qué no

- **Datos:** todos ficticios y locales. Las 2 solicitudes que el script envía desde el formulario (Sofía Marte y Andrés Lora) van a la API local y se guardan en la base demo.
- **Carga:** las miniaturas WebP (galería) y un JPEG completo (visor) se retienen con `page.route` hasta después de la captura.
- **Error de validación:** se escribe `sofia@example`. El navegador lo acepta, pero la API lo rechaza con un 400 real.
- **Sin conexión:** `page.route("**/api/contact/", route => route.abort())`. No sale ninguna petición.
- **Enlaces directos:** el visor se abre con `?photo=` y los filtros con `?category=`, igual que un enlace compartido.
- **Idioma:** `localStorage["izak-lang"]` se fija antes de cargar (inglés o español).
- **Producción:** no se envió nada. Sólo se hicieron peticiones GET de lectura: `curl`, medición de peso con Playwright y el bundle desplegado.

## Requisitos

- Venv con `requirements.txt` de IZAK-S-PHOTOS.
- `frontend/node_modules` instalado en IZAK-S-PHOTOS (`npm ci --prefix frontend`).
- Playwright 1.61.1 y su Chromium en `jonas-orbit-v3/node_modules`: `capture.mjs` lo resuelve desde ahí y no instala nada.
- Variables opcionales: `IZAK_REPO` (ruta del repo), `IZAK_DEMO_DIR` (carpeta de la base), `IZAK_SKIP_BUILD=1`, `DEMO_SITE_URL` y `ORBIT_REPO`.
