# Network — qué quedó fuera y por qué

Regla aplicada: **una pantalla sólo entra si está terminada y se ve profesional.**
Ante la duda, fuera. Nada de lo que sigue se arregló; sólo se documenta.

---

## 1. Capturas descartadas del set publicable

### `17-image-lightbox-desktop.png` — visor de imagen a pantalla completa

- **Estado**: la funcionalidad **funciona correctamente** (abre, cierra con botón,
  clic fuera y Escape).
- **Motivo del descarte**: *se ve pobre por falta de datos*. Todas las imágenes de la
  base demo son degradados abstractos generados con Pillow, así que el visor a pantalla
  completa es literalmente un rectángulo morado de 1440×900. Un reclutador no ve un
  visor de imágenes: ve una pantalla en blanco de color.
- **Qué haría falta para rescatarla**: sembrar una fotografía real con licencia libre.
  Se descartó hacerlo porque el resto del set usa imágenes generadas y mezclarlas
  rompería la coherencia visual del conjunto.
- **Dónde está**: sigue en `screenshots/raw/`, sólo se omitió de `principales/`.

> Es la **única** captura descartada. Las otras 74 pasan el filtro.

---

## 2. Funciones que existen pero no tienen captura

No son descartes por calidad: sencillamente no hay una pantalla que fotografiar.

| Función | Por qué no hay captura |
| --- | --- |
| Marca «edited» en publicaciones y comentarios | Es un fragmento de texto de una línea dentro de una cabecera, no una pantalla. Además los datos demo se generan sin ediciones, a propósito, para que ninguna publicación aparezca marcada como editada sin serlo. |
| Avisos (toasts) | Son efímeros; desaparecen antes de que la captura sea fiable. Los diálogos de confirmación, que sí son persistentes, están capturados (`11`, `26`, `35`). |
| `ErrorBoundary` | Sólo aparece provocando un fallo real. Una pantalla de error no aporta nada positivo a un portafolio. |
| `GET /health/` | Devuelve JSON, no una interfaz. Su salida literal está transcrita en `overview.md`. |
| Manifest instalable / PWA | No hay pantalla propia. Además **no hay service worker**, así que tampoco habría estado offline que enseñar. |
| Panel de administración de Django | Es la interfaz genérica de Django, no diseño propio. Incluirla debilitaría el conjunto en vez de reforzarlo. |

---

## 3. Elementos desactivados a propósito durante la captura

### Ayudante «Try a demo account» de la pantalla de login

Se capturó con `VITE_SHOW_DEMO_ACCOUNTS=0`, un flag **documentado por el propio
proyecto** en `frontend/.env.example`.

Dos motivos, ambos de las reglas del encargo:

1. **Muestra una contraseña en pantalla** (`Password for every demo account:
   network123`). La regla de privacidad pide que no haya credenciales visibles.
2. **Precarga nombres de personas reales**: los chips son `@ada`, `@grace`, `@linus`
   y `@tim`, que en el `seed` del repositorio corresponden a Ada Lovelace, Grace
   Hopper, Linus Torvalds y Tim Berners-Lee. La regla pide usuarios demo ficticios.

La función existe, funciona y está bien resuelta; si prefieres enseñarla, basta con
volver a capturar `01`, `48` y `51` sin ese flag.

### Elenco demo del repositorio

El comando `python manage.py seed` del propio proyecto crea ocho cuentas con nombres
de figuras históricas reales (Ada Lovelace, Grace Hopper, Linus Torvalds, Margaret
Hamilton, Alan Turing, Katherine Johnson, Tim Berners-Lee, Hedy Lamarr).

Para las capturas **no se usó ese seed**. Se escribió uno aparte
(`scripts/seed_portfolio_demo.py`) con diez personas inventadas y avatares generados
por código (iniciales sobre degradado), nunca fotografías de personas.

> La demo pública desplegada en Railway **sigue usando el elenco real**. Es una de las
> preguntas del `README.md`.

---

## 4. Comprobaciones que no se pudieron ejecutar

| Comprobación | Motivo |
| --- | --- |
| `ruff check` / `ruff format --check` | `ruff` no está instalado en el `.venv` local del repositorio. Se optó por no instalarlo para no alterar el entorno más de lo imprescindible. **En CI pasa** (job `backend`, último run verde). |
| Stack completo con Docker Compose | Se ejecutó el modo de desarrollo (SQLite + caché en memoria) en vez de PostgreSQL + Redis en contenedores. Motivo: evitar levantar servicios en una máquina que ya tiene los puertos 8000 y 5173 ocupados por otros proyectos. Lo que sí se comprobó es que **en producción sí hay PostgreSQL y Redis reales**, porque el `/health/` desplegado devuelve `"database":"ok","cache":"ok"`. |
| Capturas contra la demo de producción | Se capturó contra local para poder controlar los datos demo. La demo pública muestra el elenco de nombres reales, que no puede ir al portafolio. |

---

## 5. Cosas del producto que se documentan pero no se arreglan

Están detalladas en `README.md` §5. En resumen: el feed no deduplica reposts, el
widget de tendencias se repite en `/search`, el contador del editor es un número sin
etiqueta, el recorte de las notificaciones deja la comilla pegada a una palabra
partida, y la ausencia de `.gitattributes` hace fallar `prettier --check` en Windows.

Ninguna de las cinco impide que las capturas afectadas pasen el filtro: en los datos
demo se distribuyeron los reposts en el tiempo para que el caso extremo del primer
punto no se produzca, y los otros cuatro son detalles menores que no rompen la
maquetación ni contradicen ninguna cifra.
