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

## 3. La pantalla de acceso, en dos versiones

El ayudante «Try a demo account» —cuatro chips que rellenan las credenciales de un
clic, más la contraseña en claro— se controla con `VITE_SHOW_DEMO_ACCOUNTS`, un flag
documentado en `frontend/.env.example` y **activo por defecto**.

En la primera pasada se capturó apagado, por la regla de privacidad del encargo (no
mostrar credenciales, no usar nombres de personas reales). **Jonás decidió después
publicar las credenciales de la demo**, así que existen las dos versiones y ninguna
está excluida:

| Versión | Capturas | Cuándo usarla |
| --- | --- | --- |
| Con el ayudante visible | `76`, `77` (oscuro), `78` (móvil) | Es el estado real de la demo pública y enseña que probar el producto cuesta un clic |
| Con el ayudante oculto | `01`, `48` (oscuro), `51` (móvil) | Si prefieres que el portafolio no muestre una contraseña en una imagen, o que ningún nombre real aparezca en el set |

La única pega de la versión con ayudante: los chips precargan `@ada`, `@grace`,
`@linus` y `@tim` —Ada Lovelace, Grace Hopper, Linus Torvalds y Tim Berners-Lee—,
mientras que el resto de las capturas usa el elenco ficticio. Es una incoherencia
visible si alguien compara. Está señalada también en `README.md` §6.

### Elenco demo del repositorio

El comando `python manage.py seed` del propio proyecto crea ocho cuentas con nombres
de figuras históricas reales (Ada Lovelace, Grace Hopper, Linus Torvalds, Margaret
Hamilton, Alan Turing, Katherine Johnson, Tim Berners-Lee, Hedy Lamarr).

Para las capturas **no se usó ese seed**. Se escribió uno aparte
(`scripts/seed_portfolio_demo.py`) con diez personas inventadas y avatares generados
por código (iniciales sobre degradado), nunca fotografías de personas.

> La demo pública desplegada en Railway **sigue usando el elenco real, y así se queda**
> (decisión de Jonás). Quien pase de las capturas a la demo verá nombres distintos; si
> eso molesta, la salida es ejecutar `scripts/seed_portfolio_demo.py` también contra la
> base de datos de Railway.

---

## 4. Comprobaciones que no se pudieron ejecutar

| Comprobación | Motivo |
| --- | --- |
| `ruff check` / `ruff format --check` | `ruff` no está instalado en el `.venv` local del repositorio. Se optó por no instalarlo para no alterar el entorno más de lo imprescindible. **En CI pasa** (job `backend`, último run verde). |
| Stack completo con Docker Compose | Se ejecutó el modo de desarrollo (SQLite + caché en memoria) en vez de PostgreSQL + Redis en contenedores. Motivo: evitar levantar servicios en una máquina que ya tiene los puertos 8000 y 5173 ocupados por otros proyectos. Lo que sí se comprobó es que **en producción sí hay PostgreSQL y Redis reales**, porque el `/health/` desplegado devuelve `"database":"ok","cache":"ok"`. |
| Capturas contra la demo de producción | Se capturó contra local para poder controlar los datos demo. La demo pública muestra el elenco de nombres reales; las capturas del set usan el elenco ficticio a propósito. |

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
