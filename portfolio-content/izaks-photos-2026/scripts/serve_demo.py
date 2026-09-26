"""Compila el frontend y sirve Izak's Photos como en producción, contra la base demo.

Django sirve el build de Vite, la API y el admin desde el mismo origen
(http://127.0.0.1:8000), igual que en Railway, pero con DEBUG y la base SQLite
local creada por seed_demo.py. Déjalo corriendo mientras se ejecuta capture.mjs.

Uso:
    python seed_demo.py
    python serve_demo.py            # Ctrl+C para parar
Variables opcionales: IZAK_REPO, IZAK_DEMO_DIR, IZAK_SKIP_BUILD=1.

Nota: el build escribe en frontend/dist del repo (carpeta ignorada por git).
"""
import os
import shutil
import subprocess
import sys

from seed_demo import DB, REPO, demo_env


def main() -> int:
    if not DB.exists():
        print(f"Falta la base demo ({DB}). Ejecuta primero: python seed_demo.py", file=sys.stderr)
        return 1

    if os.environ.get("IZAK_SKIP_BUILD") != "1":
        npm = shutil.which("npm.cmd") or shutil.which("npm")
        subprocess.run([npm, "--prefix", str(REPO / "frontend"), "run", "build"], check=True)

    demo_env()
    os.environ.setdefault("PYTHONUNBUFFERED", "1")
    manage = REPO / "backend" / "manage.py"
    # --noreload: el proceso no vigila archivos; reinícialo si recompilas el frontend.
    return subprocess.call([sys.executable, str(manage), "runserver", "127.0.0.1:8000", "--noreload"])


if __name__ == "__main__":
    raise SystemExit(main())
