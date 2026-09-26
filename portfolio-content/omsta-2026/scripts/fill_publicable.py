# portfolio-content/omsta-2026/scripts/fill_publicable.py
"""Rellena la columna «Publicable» de web/modules.md con el resultado de las
capturas (web-shots.json + curación de build_web_manifest.py). Idempotente."""
import importlib.util
import json
import pathlib
import re

BASE = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("m", BASE / "scripts/build_web_manifest.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)  # regenera también el manifest

shots = json.loads((BASE / "scripts/web-shots.json").read_text(encoding="utf-8-sig"))
EXTRA_EXCL = {  # vistas vistas en el triaje, fuera de web-shots.json
    "/reservas/agregar-hotel/": "no — error JS ([excluded.md](../excluded.md) §1)",
    "/usuarios/config/permisos/": "no — 403 para admin ([excluded.md](../excluded.md) §1)",
    "/sucursales/mapa/": "no — privacidad ([excluded.md](../excluded.md) §5)",
    "/sucursales/crear/": "no — privacidad ([excluded.md](../excluded.md) §5)",
    "/usuarios/online-users/": "no — privacidad ([excluded.md](../excluded.md) §5)",
}


def patron(url: str) -> re.Pattern:
    url = url.split(" ")[0]
    esc = re.escape(url)
    esc = re.sub(r"<[^>]+>", r"[^/]+", esc.replace(r"\<", "<").replace(r"\>", ">"))
    return re.compile("^" + esc + "$")


def estado(url: str) -> str:
    if url in EXTRA_EXCL:
        return EXTRA_EXCL[url]
    pat = patron(url)
    hits = [s["name"] for s in shots if pat.match(s["url"]) or pat.match(s["url"].split("?")[0])]
    if not hits:
        return "no capturada"
    for n in hits:
        if n in m.P:
            return f"sí — principal `{m.P[n][0]}`"
    for n in hits:
        if n not in m.EXCL:
            return f"sí — `raw/{n}`"
    return f"no — {m.EXCL[hits[0]]} ([excluded.md](../excluded.md))"


path = BASE / "web/modules.md"
out = []
for line in path.read_text(encoding="utf-8").splitlines():
    if line.startswith("|") and "`/" in line and line.rstrip().endswith("|"):
        cells = line.split("|")
        url = re.search(r"`(/[^`]*)`", line).group(1)
        if len(cells) >= 6 and ("pendiente de captura" in cells[-2] or cells[-2].strip().startswith(("sí", "no"))):
            cells[-2] = f" {estado(url)} "
            line = "|".join(cells)
    out.append(line)
text = "\n".join(out) + "\n"
text = text.replace(
    "- **Columna «Publicable»:** siempre «pendiente de captura»; se decide al capturar.",
    "- **Columna «Publicable»:** resultado de la captura del 2026-09-25 (`screenshots/manifest.md`); «no capturada» = no se tomó.",
)
path.write_text(text, encoding="utf-8")
print("ok")
