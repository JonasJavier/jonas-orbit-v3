<!-- portfolio-content/omsta/branding/README.md -->

# Branding — OMSTA

> Assets de marca copiados del repo OMSTA (`static/images/`) para uso en el caso de
> estudio. Solo lo necesario; no se copió `static/` completo.

## Identidad

- **Nombre del producto:** OMSTA.
- **Isotipo:** avión estilizado en **degradado dorado/ámbar** (símbolo de viajes).
- **Logotipo (wordmark):** «OMSTA» en mayúsculas junto al ícono de avión
  (`bi bi-airplane` de Bootstrap Icons como marca de respaldo cuando no hay logo de
  empresa cargado).
- **Fuente en UI:** tipografías del sistema/Bootstrap (sans-serif); títulos con
  serif en el hero del dashboard.

## Paleta (tokens verificados en el CSS del proyecto)

| Uso | Color | Token |
|---|---|---|
| Azul profundo (hero/base) | `#0d1f35` | `--db-navy` |
| Azul medio | `#152840` | `--db-navy-mid` |
| Azul claro | `#1e3a56` | `--db-navy-light` |
| Ámbar/acento | `#b45309` | `--db-amber` |
| Dorado del isotipo | degradado ~`#fbbf24`→`#f59e0b` | (logo) |
| Acento vouchers | `#7c3aed` | `--voucher-color-accent` |
| Acento azul (Bootstrap) | `#0d6efd` | `--fp-accent` |
| Fondo claro | `#f8fafc` | `--light-bg` |
| Sidebar | `#f4f8fd` | `--sidebar-bg` |

## Assets incluidos (`assets/`)

| Archivo | Formato | Tamaño | Uso sugerido |
|---|---|---|---|
| `omsta-favicon.ico` | ICO | multi | Favicon clásico |
| `omsta-favicon.png` | PNG | grande | Logo/isotipo de alta resolución |
| `omsta-favicon-192.png` | PNG | 192px | Icono PWA / tarjeta / redes |
| `omsta-favicon-32.png` | PNG | 32px | Favicon pequeño |
| `omsta-apple-touch-icon.png` | PNG | ~180px | Icono iOS / touch |

## Variantes recomendadas

- **Fondo oscuro:** el isotipo dorado funciona muy bien sobre el azul profundo
  `#0d1f35` (como en el hero del dashboard). Recomendado para la tarjeta de
  Endurance en el portafolio espacial.
- **Fondo claro:** el isotipo dorado sobre blanco/`#f8fafc` mantiene contraste;
  para el wordmark en claro, usar el texto «OMSTA» en `#0d1f35` o `#152840`.

## Restricciones

- Es la marca de un **sistema en producción de un cliente**. El plan (Gate 0)
  autoriza mostrar el nombre «OMSTA» y su logo en el portafolio.
- **No** usar los datos fiscales reales de la empresa operadora (RNC, teléfono,
  correo): se anonimizaron en desarrollo (ver `../demo/demo-data.md`).
- <!-- [CONFIRMAR] con Jonás si existe un logo/wordmark vectorial (SVG) oficial; aquí
  solo hay los PNG/ICO del favicon. Si existe un SVG, añadirlo a assets/. -->
