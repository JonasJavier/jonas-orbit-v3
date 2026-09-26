<!-- portfolio-content/omsta-2026/README.md -->
# OMSTA 2026 — paquete de portafolio

- **Fecha:** 2026-09-25.
- **Commit de OMSTA investigado:** `3f5cea73` (`main`, árbol limpio; no se
  cambió código ni se hizo commit en ningún repo).
- **Entorno:** Windows 11 · Python 3.12 (`.codex_venv`) · PostgreSQL local ·
  Node 24.16 · Playwright 1.61.1 (Chromium) · adb (Motorola Edge 2024, Android).
- **Datos:** todo lo capturado sale de una **BD local aislada nueva,
  `omsta_portfolio`**, sembrada con datos sintéticos por los mismos servicios
  que usa la app. Nunca se tocó producción ni la BD de desarrollo
  (`cristecno_db`), salvo dos consultas de solo lectura y sin imprimir datos para
  comprobar que direcciones y coordenadas sembradas no coinciden con las reales.
- La carpeta vieja `portfolio-content/omsta/` no se editó ni se reutilizó.

## Estado del paquete

| Pieza | Estado | Nota |
| --- | --- | --- |
| Investigación (overview, stack, métricas, casos, arquitectura) | **Hecha** | Cada afirmación con evidencia y etiqueta |
| Tests Python | **Ejecutados**: 3.161 pasan, 3 fallan | `metrics.md` §3 |
| Capturas web | **Hechas**: 130 en `raw/`, 47 en `principales/` | 34 excluidas por la regla principal |
| Capturas móviles | **Hechas** (2026-09-26): 44 en `raw/`, 19 en `principales/` | Motorola Edge 2024, 1080×2400, barra 9:41; 4 excluidas y las que mostraban ubicación, borradas |
| Capturas iOS | **No es posible hoy** | No hay build iOS ni TestFlight; lista de tomas en `mobile/screenshots/inbox-ios/` |
| Vídeo del asistente | No grabado | Opcional; no se hizo |

## Índice

| Archivo | Qué contiene |
| --- | --- |
| `overview.md` | Qué es OMSTA, para quién, roles, estado real y fechas de cada parte |
| `case-notes.md` | Notas factuales para el caso: contexto, problema, decisiones, incidentes, estado |
| `stack.md` | Todas las tecnologías con versión exacta y archivo de evidencia |
| `metrics.md` | Cifras comprobables con su comando y propuesta para la tarjeta |
| `design-decisions.md` | 8 pares problema → decisión con su captura |
| `excluded.md` | Lo que quedó fuera y por qué (fallos, maquetación, cifras, privacidad) |
| `cv-notes.md` | Viñetas de CV (ES/EN), línea de habilidades y qué afirmar sobre iOS |
| `architecture/` | `system-overview.md`, `data-flow.md`, `deployment.md`, `nodes.yaml` y 4 diagramas Mermaid en `diagrams/` |
| `web/modules.md` | Mapa completo de la web (19 apps, secciones, rutas) con columna «Publicable» |
| `web/screenshots/` | `raw/` (130 + `audit.json`), `principales/` (47) y `manifest.md` |
| `mobile/` | `overview.md`, `modules.md`, `native-capabilities.md`, `api-contract.md` y `screenshots/` |
| `scripts/` | Siembra, captura y generación de manifiestos (abajo) |

## Scripts (reproducibles)

Todos se ejecutan **desde la raíz del repo OMSTA**. Ninguno escribe en el repo
OMSTA: los scripts Python abortan si la BD no es `omsta_portfolio` o el host no
es local.

| Script | Qué hace |
| --- | --- |
| `scripts/portfolio-env.ps1` | Entorno del servidor de portafolio: `POSTGRES_DB=omsta_portfolio`, sin Redis, jobs síncronos, correo a consola, sin gate de ubicación ni GeoIP, media en `%LOCALAPPDATA%\omsta-portfolio-media`. Con `-Seed` activa `DEMO_MODE` (lo exige `seed_demo`) |
| `scripts/rebuild_portfolio_db.ps1` | Recrea la BD, migra y siembra las tres fases. Genera contraseñas aleatorias para las cuentas demo y las guarda **fuera de ambos repos** (`%LOCALAPPDATA%\omsta-portfolio\demo-credentials.txt`) |
| `scripts/recreate_portfolio_db.py` | `DROP`/`CREATE` de `omsta_portfolio` (y solo esa) |
| `scripts/seed_portfolio.py` | Fase 1: catálogos, empresa, 2 sucursales, usuarios por rol y 22 reservas (hotel, vuelo, otros) en DOP con sus cobros; los 5 viajes ya realizados se dan de alta «en su día» y se facturan por la vista real (NCF B02); 10 empleados de nómina |
| `scripts/seed_portfolio_fase2.py` | Fase 2: crucero, 2 paquetes y un seguro; localizadores (el motor de estados confirma); cobros por transferencia con comprobante sintético; 3 empresas; una anulación liquidada |
| `scripts/seed_portfolio_fase3.py` | Fase 3: RNC ficticios (000000xxx), documento fiscal del proveedor + pago aplicado (base del 606), nombres creíbles, configuración contable de nómina |
| `scripts/session_key.py` | Imprime una clave de sesión de Django para inyectarla en Playwright (no se teclean contraseñas en el navegador) |
| `scripts/capture_web.mjs` + `web-shots.json` | Captura 1440×900 ×2 (y 390×844) y audita cada pantalla: HTTP, errores JS, peticiones fallidas, imágenes rotas, desborde, textos sospechosos → `audit.json` |
| `scripts/build_web_manifest.py` | Genera `web/screenshots/manifest.md` desde la curación |
| `scripts/fill_publicable.py` | Rellena la columna «Publicable» de `web/modules.md` |
| `scripts/capture_mobile.ps1` | Ayudas adb: modo demo de la barra de estado (se reaplica en cada toma), abrir la app en Metro, `Save-Shot` |
| `scripts/build_mobile_manifest.py` | Copia las principales móviles y genera `mobile/screenshots/manifest.md` |

Secuencia completa:

```powershell
& "<omsta-2026>\scripts\rebuild_portfolio_db.ps1"
. "<omsta-2026>\scripts\portfolio-env.ps1"
.\.codex_venv\Scripts\python.exe manage.py runserver 127.0.0.1:8130 --noreload   # otra terminal
$env:OMSTA_SESSION = (.\.codex_venv\Scripts\python.exe "<omsta-2026>\scripts\session_key.py" demo.admin)
node "<omsta-2026>\scripts\capture_web.mjs" "<omsta-2026>\scripts\web-shots.json"
python "<omsta-2026>\scripts\build_web_manifest.py"; python "<omsta-2026>\scripts\fill_publicable.py"
```

Anonimización: no hizo falta anonimizar a nivel de píxel porque la BD nace con
datos sintéticos (nombres inventados, correos `@example.com`, teléfonos
con la central ficticia 555, cédulas y RNC ficticios). Las 130 capturas se revisaron
en hojas de contacto reducidas y los casos de riesgo (evento de bitácora,
sucursal, vistas a 390 px) a tamaño real; lo
dudoso quedó fuera (`excluded.md` §5). Las 44 capturas móviles se revisaron una a una;
las dos que mostraban la ubicación real del teléfono se borraron y la BD se
reconstruyó para eliminarla (`excluded.md` §6).

Lo que queda en esta PC tras la sesión: la BD `omsta_portfolio`, la carpeta de
media `%LOCALAPPDATA%\omsta-portfolio-media` y el archivo de credenciales
demo. Se pueden borrar sin afectar a nada más.

## Preguntas para Jonás

### Respondidas (2026-09-26)

| Pregunta | Respuesta de Jonás | Dónde se aplicó |
| --- | --- | --- |
| ¿Desarrollo en solitario? | Sí, 100 % en solitario | `case-notes.md`, `metrics.md` §5, `cv-notes.md` |
| ¿Producción en uso diario? | Sí | `overview.md`, `case-notes.md` |
| ¿Cuántos usuarios y sucursales? | «15» | `overview.md` (se interpreta como 15 usuarios; ver pregunta abierta 1) |
| ¿Se puede nombrar a la agencia? | Sí: «CristegnoViajes srl» | `overview.md`, `cv-notes.md` (escrito «Cristecno Viajes SRL», como en el repo; ver pregunta abierta 2) |
| ¿Teléfono libre? | Sí | Capturas móviles hechas |
| ¿Cuenta de Apple Developer? | «Pronto», sin fecha | `cv-notes.md`: iOS sigue sin poder afirmarse |
| ¿Arreglar los fallos de `excluded.md`? | Sí, en otra sesión | Tarea propuesta aparte (incluye el centro del mapa) |
| ¿Centro del mapa de sucursales? | «Lo que consideres mejor» | Recomendación: centro neutro sin coordenadas de oficinas; va en esa tarea |
| ¿Tests o apps en la tarjeta? | «Lo que consideres mejor» | Elegido «19 · apps Django» mientras fallen 3 tests (`metrics.md` §6) |
| ¿Migraciones automáticas en producción? | Sí, desde el push corren solas | `case-notes.md`, `architecture/deployment.md` (la §7 de `despliegue-railway.md` está desfasada) |
| ¿Problemas de `design-decisions.md`? | Sin respuesta | Siguen marcados como inferencia |

### Abiertas

1. **«15»**: ¿son 15 usuarios? ¿Y cuántas sucursales reales hay?
2. **Nombre**: el repo dice «CristecnoViajes_SRL» y escribiste «CristegnoViajes srl». ¿Cuál es la
   grafía legal correcta? Usé «Cristecno Viajes SRL».
3. **Design decisions**: ¿los ocho «problemas» coinciden con lo que te pidió el cliente?
