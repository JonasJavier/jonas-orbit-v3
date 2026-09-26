<!-- portfolio-content/omsta-2026/metrics.md · 2026-09-25 · commit 3f5cea73 -->
# OMSTA — métricas comprobables (2026-09-25, HEAD `3f5cea73`)

Todas las cifras se calcularon hoy, en el repositorio en `main`, con árbol
limpio. Cada una lleva el comando que la produce. Etiquetas:
**comprobado** (salida del comando), **inferencia** (lectura razonada),
**pendiente** (no ejecutado).

Convenciones de los comandos:

- `$REPO` = raíz del repositorio OMSTA.
- Bash = Git Bash en Windows; PowerShell = Windows PowerShell 5.1.
- Intérprete: `.codex_venv\Scripts\python.exe`, con
  `DJANGO_SETTINGS_MODULE=CristecnoViajes_SRL.settings` y
  `USE_REDIS_CACHE=False`. La introspección de Django no escribe en la BD
  (solo `django.setup()`, registro de apps y resolvedor de URLs).

---

## 1. Backend Django

| Métrica | Valor | Estado |
| --- | --- | --- |
| Apps Django propias | **19** | comprobado |
| Modelos propios (concretos, sin `django.*` ni terceros) | **150** | comprobado |
| Modelos instalados en total (incluye `django.*` y terceros) | 162 | comprobado |
| Modelos proxy / no gestionados entre los propios | 0 / 0 | comprobado |
| URL patterns totales (resolvedor completo) | **1.173** | comprobado |
| — de ellos, del admin de Django (`admin/`) | 539 | comprobado |
| — de ellos, con callback en una app propia | 613 | comprobado |
| Vistas únicas propias (criterio abajo) | **556** | comprobado |
| Vistas únicas en todo el URLconf (incluye admin/terceros) | 580 | comprobado |
| Endpoints de la API móvil (`api/movil/v1/`) | **94** patterns, 94 vistas únicas | comprobado |
| Migraciones | **169** | comprobado |
| Templates HTML (bajo carpetas `templates/`) | **356** | comprobado |

**Apps propias (19):** banco, catalogs, coa, contabilidad, core, crm,
dashboard, divisas, documentos, ledger, movil, nomina, operations, reports,
reservas, security, sucursales, tutoriales, usuarios.

**Modelos por app:** reservas 47 · contabilidad 29 · nomina 13 · usuarios 11 ·
crm 9 · sucursales 6 · ledger 6 · documentos 6 · banco 5 · divisas 5 · coa 4 ·
catalogs 3 · tutoriales 3 · movil 2 · operations 1 · security/core/dashboard/reports 0.

> Discrepancia documentada (inferencia): `docs/tecnica/arquitectura.md` §3 dice
> «155 modelos, 145 del dominio propio» y 44 en reservas. El conteo de hoy por
> `apps.get_app_configs()` da 150 propios y 47 en reservas. El documento está
> desactualizado o usa otro criterio (p. ej. incluye tablas M2M
> autogeneradas). La cifra válida para el portafolio es la de hoy.

**Criterio de «vista»:** callback único del URLconf. Para vistas basadas en
clase (Django CBV o DRF `APIView`) cuenta la clase (`callback.view_class` o
`callback.cls`); para funciones, la función. Es «propia» si el primer segmento
de su módulo es una app propia o el paquete del proyecto.

**Comando (Bash)** — script guardado en el scratchpad de la sesión; su cuerpo
completo:

```python
import os, sys, pathlib
BASE = pathlib.Path(r"<REPO>").resolve()
sys.path.insert(0, str(BASE)); os.chdir(BASE)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "CristecnoViajes_SRL.settings")
os.environ["USE_REDIS_CACHE"] = "False"
import django; django.setup()
from django.apps import apps
from django.urls import get_resolver, URLResolver
own = [a for a in apps.get_app_configs()
       if pathlib.Path(a.path).resolve().is_relative_to(BASE)
       and 'site-packages' not in a.path and '.codex_venv' not in a.path]
print("APPS_PROPIAS", len(own))
models = [m for a in own for m in a.get_models(include_auto_created=False)]
print("MODELOS_PROPIOS", len(models)); print("MODELOS_TOTALES", len(apps.get_models()))
pats = []
def walk(r, prefix=""):
    for p in r.url_patterns:
        if isinstance(p, URLResolver): walk(p, prefix + str(p.pattern))
        else: pats.append((prefix + str(p.pattern), p.callback))
walk(get_resolver())
def cbkey(cb):
    c = getattr(cb, 'view_class', None) or getattr(cb, 'cls', None)
    return f"{c.__module__}.{c.__qualname__}" if c else f"{cb.__module__}.{cb.__qualname__}"
own_mods = {a.name.split('.')[0] for a in own} | {"CristecnoViajes_SRL"}
own_pats = [(u, c) for u, c in pats if cbkey(c).split('.')[0] in own_mods]
mov = [(u, c) for u, c in pats if u.startswith("api/movil/v1/")]
print("URL_PATTERNS_TOTALES", len(pats), "PROPIOS", len(own_pats))
print("VISTAS_UNICAS_TODAS", len({cbkey(c) for _, c in pats}),
      "PROPIAS", len({cbkey(c) for _, c in own_pats}))
print("API_MOVIL_V1", len(mov), len({cbkey(c) for _, c in mov}))
print("ADMIN", len([u for u, _ in pats if u.startswith('admin/')]))
```

```bash
cd "$REPO"; USE_REDIS_CACHE=False ./.codex_venv/Scripts/python.exe metrics_django.py
```

**Migraciones y templates (Bash):**

```bash
git ls-files | grep -E '(^|/)migrations/[0-9]{4}_[^/]*\.py$' | wc -l          # 169
git ls-files | grep -E '\.html$' | grep -E '(^|/)templates/' | wc -l          # 356
git ls-files | grep -E '\.html$' | wc -l                                      # 357 (uno fuera de templates/)
```

---

## 2. App móvil (Expo, `mobile/`)

| Métrica | Valor | Estado |
| --- | --- | --- |
| Archivos de ruta en `mobile/app/` | 57 | comprobado |
| — layouts (`_layout.tsx`) | 2 | comprobado |
| — rutas especiales (`+not-found.tsx`) | 1 | comprobado |
| — **pantallas** (resto) | **54** | comprobado |
| Pestañas (grupo `(tabs)`) | 5 (inicio, reservas, clientes, cobros, avisos) | comprobado |

```bash
cd "$REPO/mobile"
git ls-files app | grep -E '\.(tsx|ts|jsx|js)$' | wc -l                             # 57
git ls-files app | grep -E '(^|/)_layout\.(tsx|ts)$' | wc -l                        # 2
git ls-files app | grep -E '\.(tsx|ts)$' | grep -vE '(^|/)_layout\.' \
  | grep -vE '\+not-found|\+html|\+api' | wc -l                                     # 54
git ls-files "app/(tabs)"                                                           # 5 pantallas + layout
```

---

## 3. Tests

| Métrica | Valor | Estado |
| --- | --- | --- |
| Archivos de test Python (patrón de `pytest.ini`) | **244** | comprobado |
| Tests Python recolectados (`--collect-only`) | **3.164** (0 errores de recolección) | comprobado |
| Líneas en archivos de test Python | 76.931 | comprobado |
| Archivos de test Jest de la app móvil (`*.test.ts(x)`) | **6** | comprobado |
| Archivos de test Jest del JS web (raíz, `jest.config.js`) | 33 | comprobado |

```powershell
$env:USE_REDIS_CACHE="False"
.\.codex_venv\Scripts\python.exe -m pytest --collect-only -q -p no:warnings   # «3164 tests collected»
# archivos distintos entre los ids recolectados → 244
$o = .\.codex_venv\Scripts\python.exe -m pytest --collect-only -q -p no:warnings 2>&1
($o | Where-Object { $_ -match "::" } | ForEach-Object { ($_ -split "::")[0] } | Sort-Object -Unique | Measure-Object).Count
```

```bash
git ls-files | grep -E '(^|/)(tests\.py|test_[^/]*\.py|[^/]*_tests\.py)$' | wc -l      # 244
git ls-files | grep -E '\.test\.(ts|tsx)$' | wc -l                                   # 6 (todos en mobile/src)
git ls-files | grep -vE '^mobile/' | grep -E '\.(test|spec)\.(ts|tsx|js|jsx)$' | wc -l  # 33
```

### Tests: resultado

**Ejecutada el 2026-09-25 (23:16 → 23:41), suite Python completa contra
PostgreSQL local, con BD de test propia** (`test_cristecno_db_portfolio2026`,
para no chocar con otras sesiones):

```powershell
$env:PYTHONPATH="<scratchpad>"; $env:USE_REDIS_CACHE="False"; $env:DJANGO_Q_ASYNC="False"
.\.codex_venv\Scripts\python.exe -m pytest -q -p no:cacheprovider --ds=portfolio_test_settings --create-db
# 3 failed, 3161 passed, 954 warnings in 1513.90s (0:25:13)
```

| Resultado | Cantidad | Estado |
| --- | ---: | --- |
| Pasan | **3.161** | comprobado |
| Fallan | **3** | comprobado |

Los 3 fallos (salida exacta resumida):

1. `core/tests/test_seed_demo.py::…test_reinicio_nocturno_deja_la_demo_recien_sembrada`
   → `CommandError: Hay modelos de negocio sin clasificar … contabilidad.DGII606ManualDocument`
   (un modelo nuevo sin clasificar en `reset_produccion`).
2. `documentos/tests.py::test_financial_documents_preview_uses_real_template_and_editor_blocks[recibo_proveedor-…]`
   → `VariableDoesNotExist: Failed lookup for key [currency]` (500 en la vista
   previa del recibo a proveedor).
3. `core/tests/test_ui_guards.py::ComentariosDeDjangoTests::test_no_hay_comentarios_multilinea`
   → `{# … #}` sin cerrar en `banco/templates/banco/dashboard.html:92` y
   `reports/templates/reports/run_dgii_606.html:40,101`. **Es el mismo defecto
   que se ve en las capturas `w76` y `w70`** (ver `excluded.md`).

Cifra honesta para el portafolio: «3.164 tests; 3.161 pasan (99,9 %)». No usar
«todos pasan». Jest (móvil y web) **no se ejecutó**.

---

## 4. Líneas de código

No hay `cloc`, `tokei`, `scc` ni `pygount` disponibles (comprobado con
`which` y un `import pygount` fallido). Conteo con `git ls-files` + `wc -l`:
**líneas físicas** (incluyen blancos y comentarios), solo archivos
versionados, **excluyendo** migraciones, `package-lock.json`,
`mobile/api/schema.yaml` (OpenAPI generado) y `mobile/src/api/types.ts`
(generado por `openapi-typescript`). No hay archivos `vendor/` ni `.min.*`
versionados (comprobado).

| Lenguaje | Archivos | Líneas | Estado |
| --- | ---: | ---: | --- |
| Python (incluye tests) | 1.242 | **331.771** | comprobado |
| HTML (plantillas Django) | 357 | 80.375 | comprobado |
| JavaScript | 178 | 48.618 | comprobado |
| CSS | 83 | 47.812 | comprobado |
| TypeScript JSX (`.tsx`) | 85 | 24.843 | comprobado |
| TypeScript (`.ts`) | 30 | 3.905 | comprobado |
| PowerShell | 26 | 1.666 | comprobado |
| Markdown (docs) | 106 | 26.867 | comprobado |
| Migraciones Python (excluidas arriba) | — | 29.435 | comprobado |

```bash
EXCL='(^|/)migrations/|package-lock\.json$|^mobile/api/schema\.yaml$|^mobile/src/api/types\.ts$'
for ext in py html js ts tsx css ps1 md; do
  n=$(git ls-files | grep -vE "$EXCL" | grep -E "\.$ext$" | wc -l)
  l=$(git ls-files -z | tr '\0' '\n' | grep -vE "$EXCL" | grep -E "\.$ext$" | tr '\n' '\0' | xargs -0 cat | wc -l)
  echo "$ext archivos=$n lineas=$l"
done
```

---

## 5. Historia de Git

| Métrica | Valor | Estado |
| --- | --- | --- |
| Commits totales (alcanzables desde HEAD) | **1.139** (919 sin merges; 220 merges) | comprobado |
| Commits que tocan `mobile/` | **52** (todos sin merge) | comprobado |
| Commits que tocan `movil/` | **37** (todos sin merge) | comprobado |
| Commits que tocan `mobile/` o `movil/` | 58 | comprobado |
| Commits «solo web» (no tocan `mobile/` ni `movil/`) | **1.081** (861 sin merges) | comprobado |
| Identidades de autor (nombre) | **3** (1.128 / 8 / 3 commits) | comprobado |
| Correos de autor distintos | 4 | comprobado |
| Pull requests fusionados (merge «Merge pull request») | 181 | comprobado |
| Commits con trailer `Co-Authored-By: Claude` | 113 | comprobado |
| Primer commit del repo | `11fa52ee` · **2025-04-02** | comprobado |
| Primer commit en `movil/` (backend API móvil) | `273780c4` · **2026-09-10** | comprobado |
| Primer commit en `mobile/` (app Expo) | `bac191cd` · **2026-09-11** | comprobado |
| Último commit | `3f5cea73` · 2026-09-25 | comprobado |

```bash
git rev-list --count HEAD                                   # 1139
git rev-list --count --no-merges HEAD                       # 919
git rev-list --count --merges HEAD                          # 220
git rev-list --count HEAD -- mobile/                        # 52
git rev-list --count HEAD -- movil/                         # 37
git rev-list HEAD -- mobile/ movil/ | wc -l                 # 58
comm -23 <(git rev-list HEAD | sort) <(git rev-list HEAD -- mobile/ movil/ | sort) | wc -l   # 1081
comm -23 <(git rev-list --no-merges HEAD | sort) <(git rev-list --no-merges HEAD -- mobile/ movil/ | sort) | wc -l  # 861
git log --format='%an' | sort -u | wc -l                    # 3
git log --format='%ae' | sort -u | wc -l                    # 4
git shortlog -sn HEAD | awk '{print $1}'                    # 1128 / 8 / 3
git log --merges --format=%s | grep -c 'Merge pull request' # 181
git log --format=%B | grep -ci 'Co-Authored-By: Claude'     # 113
git log --reverse --format='%h %ad' --date=short | head -1               # 11fa52ee 2025-04-02
git log --reverse --format='%h %ad' --date=short -- movil/ | head -1     # 273780c4 2026-09-10
git log --reverse --format='%h %ad' --date=short -- mobile/ | head -1    # bac191cd 2026-09-11
git log -1 --format='%h %ad' --date=short                                # 3f5cea73 2026-09-25
```

Notas:

- Los conteos por ruta usan la simplificación de historia por defecto de Git.
- «Un único desarrollador»: **confirmado por Jonás** (2026-09-26). Hay 3
  identidades de autor en git; una concentra el 99 % de los commits (1.128 de 1.139).
- La app móvil completa (backend `movil/` + app `mobile/`) se construyó en
  **16 días** (2026-09-10 → 2026-09-25) — comprobado por las fechas anteriores.

---

## 6. Propuesta para la tarjeta del proyecto

Todas verificadas arriba:

**Elegidas** (Jonás delegó la decisión, 2026-09-26):

- **19 · apps Django**
- **150 · modelos de dominio**
- **94 · endpoints API móvil**
- **54 · pantallas en la app**

Por qué no los tests: hoy fallan 3 de 3.164. Cuando se arreglen, cambiar
«19 · apps Django» por «3.164 · tests» (y volver a correr la suite).

Alternativas igual de verificadas: «19 · apps Django», «1.139 · commits»,
«556 · vistas propias».
