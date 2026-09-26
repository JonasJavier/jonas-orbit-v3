# Scripts reproducibles

Recrean la base demo y las 56 capturas sin tocar el repositorio de Delicaté (todo lo local va a `%TEMP%/delicate-portfolio-demo`) ni el de jonas-orbit-v3 fuera de esta carpeta.

| Script | Qué hace |
| --- | --- |
| `seed_demo.py` | Crea la base SQLite demo: migra, ejecuta `seed_products --reset`, pone «Flor de Ámbar» sin existencias, 4 mensajes y 3 suscripciones ficticias (`@example.com`, teléfonos 555) y un administrador demo sólo local. Descarta las variables `DJANGO_*` globales de esta PC. |
| `serve_demo.sh` | Construye el frontend de producción en `%TEMP%/…/dist` y levanta Django (`:8000`) y `vite preview` (`:4173`). |
| `capture.mjs` | Recorre tienda y admin con Playwright (1440×900 y 390×844, `deviceScaleFactor` 2), guarda los PNG en `../screenshots/raw/` y escribe `../screenshots/capture-report.json`. |

## Pasos (Git Bash, en Windows)

```bash
cd "C:/Users/savage/Documents/kimi/Workspaces/portafolio espacial/jonas-orbit-v3/portfolio-content/delicate-2026/scripts"
PYTHONUTF8=1 "C:/Users/savage/Documents/GitHub/Delicate-4.0/.venv/Scripts/python.exe" seed_demo.py
bash serve_demo.sh          # dejar corriendo en otra terminal
node capture.mjs
```

La selección de `principales/` se hizo a mano revisando cada imagen; ver `../screenshots/manifest.md` y `../excluded.md`.

## Qué se simula y qué no

- **Datos:** todos ficticios y locales. Los 10 productos son los del comando oficial del repo.
- **Carga, error y categoría vacía:** la red se simula con `page.route` sobre el build real.
- **Carrito desactualizado:** se escribe `localStorage` antes de recargar.
- **WhatsApp:** los enlaces se leen; sólo se abre la página pública de `wa.me` (GET). Nunca se envía un mensaje.
- **404:** es la única captura tomada de producción (GET de sólo lectura), porque el Django local corre con `DEBUG=True`.

## Requisitos

- Venv de Delicaté con `backend/requirements.txt` instalado.
- `frontend/node_modules` instalado en Delicaté (`npm ci`).
- Playwright 1.61.1 y su Chromium en `jonas-orbit-v3/node_modules` (ya presentes; `capture.mjs` lo resuelve desde ahí).
