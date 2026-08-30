# WP0 — contrato visual de Jonás Orbit

Estado histórico: **aprobado para implementación F1A** · 2026-08-03.

Vigencia actual: contrato base. La dirección específica del Hero / System Map
vive en [`hero-gargantua-direction.md`](hero-gargantua-direction.md) y manda sobre
este documento en composición, mundos, HUD, interacción y motion; esa dirección
permanece candidata hasta completar su validación visual.

## Dirección

**Instrumentación orbital editorial.** El sitio combina la precisión de una
interfaz de misión con la jerarquía y el espacio negativo de una publicación de
diseño. No replica interfaces de cine ni utiliza planetas fotorrealistas como
decoración. La evidencia real —capturas, decisiones y resultados— es el centro.

Principios:

1. Oscuridad para profundidad; contraste para lectura.
2. El brillo comunica foco o estado, nunca rellena espacio.
3. Una composición memorable por viewport, no diez efectos simultáneos.
4. Toda estética espacial conserva semántica HTML, teclado y reduced-motion.
5. El primer pantallazo presenta el sistema, hace visibles sus destinos y ofrece
   acceso inmediato a la prueba. La identidad profesional completa vive en el
   HTML semántico y en las páginas de contenido, no en un bloque de perfil del
   Hero.

## Tipografía

- **Display:** Bahnschrift → Aptos Display → Segoe UI Variable Display →
  Avenir Next Condensed → `-apple-system` → Helvetica Neue → Roboto → Noto Sans.
- **Texto:** Segoe UI Variable Text → Aptos → Segoe UI → `-apple-system` →
  Helvetica Neue → Roboto → Noto Sans.
- **Telemetría:** Cascadia Code → Cascadia Mono → `ui-monospace` → SF Mono →
  Menlo → Consolas → Liberation Mono.
- H1: `clamp(3.5rem, 7.3vw, 7.5rem)`, línea 0.87, máximo 12 caracteres.
- H2 de mundo: `clamp(2.8rem, 6vw, 6.5rem)`.
- Texto largo: 16–18 px, línea 1.65–1.8, ancho máximo aproximado de 70 caracteres.

Se usan fuentes del sistema para evitar transferencia, bloqueo de render y una
dependencia tipográfica externa en F1A. La personalidad proviene de jerarquía,
condensación y contraste, no de descargar una fuente por defecto.

Cada pila empieza por Windows y **debe** terminar en equivalentes de Apple,
Android y Linux antes del genérico. Corregido el 2026-08-03 en la auditoría de
WP6: las pilas originales solo nombraban fuentes de Microsoft, así que en macOS,
iOS y Android el display y el texto caían a `sans-serif` genérico y la identidad
tipográfica desaparecía. Al revisarse desde Windows el fallo era invisible.

## Color y luz

- Fondo: `#03050a` / `#05070f`.
- Texto: `#eef3ff`; secundario: `#929fba`.
- Ámbar `#f2c879`: luz de Gargantúa, prueba y activación secundaria.
- Cian `#7fe5ff`: navegación, foco y sistemas.
- Coral `#ff7a66`: señal semántica o error real; no es decoración del HUD.
- Cada mundo hereda `accent` y `secondary` desde `worlds.data.ts`.

El HUD usa blanco suave, cian y ámbar como un único sistema. Los acentos de los
mundos no lo convierten en una interfaz arcoíris; el violeta queda limitado a la
baliza de Ranger.

Las superficies usan líneas al 17–32 % y brillos por debajo del 25 %. Ningún
párrafo depende del color para comunicar significado.

## Espaciado y geometría

- Gutter fluido: `clamp(1.25rem, 4vw, 4.5rem)`.
- Ancho máximo: 92 rem.
- Ritmo principal: 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 144 px.
- Radio: 8 px controles, 14 px tarjetas, 22 px escenas principales.
- Bordes de un píxel forman la retícula de misión.

## Arquetipos de los siete mundos

| Mundo | Forma visual | Función |
| --- | --- | --- |
| Tesseracto | Marcos dimensionales anidados y núcleo interior | Historia y visión |
| Cooper Station | Planeta anillado inventado + hábitat orbital pequeño | Formación modular |
| Miller | Esfera oceánica estratificada | Ingeniería full-stack |
| Endurance | Nave radial: hub, radios, módulos y anillo parcial | Archivo de proyectos |
| Edmunds | Mundo cálido con terreno, atmósfera y bruma | Creatividad visual |
| Gargantúa | Núcleo negro y disco luminoso | Laboratorio |
| Ranger | Nave metálica pequeña con baliza mínima | Contacto y conversión |

Son diseños originales construidos con geometría y materiales propios; no copias
de assets cinematográficos. Gargantúa aporta la fuente cálida compartida y una
luz ambiente fría recupera volumen en todos los cuerpos.

## Componentes

### Navegación

- En la home, un raíl tipográfico expone siete enlaces reales en orden 01→07.
- El raíl es el único recorrido de teclado; los rótulos junto a cuerpos son ecos
  visuales y no duplican el árbol de accesibilidad.
- Hover, focus y selección alimentan un único TARGET y los brackets del mismo
  mundo.
- Toda activación pasa por `navigateToWorld(worldId)`: hoy navega por ruta y la
  futura fase continua podrá sustituirlo por scroll a un ancla.
- En las páginas de mundo, la navegación actual sigue marcando la ruta con
  `aria-current="page"` y ofrece retorno convencional a `/es`.

### Hero

- Es System Map, navegación y exploración; no una introducción personal.
- No muestra el bloque con nombre completo, roles y propuesta, ni lo reemplaza
  con otra tarjeta o párrafo.
- La marca visible se limita a `JONAS ORBIT` dentro del HUD.
- Nombre completo, rol, CTAs y CV permanecen en el HTML semántico servido sin
  JavaScript; el canvas sigue siendo una capa decorativa `aria-hidden`.
- Gargantúa domina, Endurance es la segunda ancla y Cooper aporta una silueta
  planetaria memorable.

### Tarjetas de proyecto

- Caso completo: tarjeta dominante de ancho completo.
- Ficha: tarjeta compacta con la misma anatomía y menor jerarquía.
- Estado, captura, resumen, tecnologías y CTA siempre visibles.
- No se publica “en producción” sin URL verificada.

### Caso OMSTA

- Apertura con captura real y lectura rápida de rol/problema/contribución/decisión.
- Narrativa MDX completa en bloques escaneables.
- Galería editorial con caption; el visor modal queda para WP5.

### 404 y gracias

- 404: coordenada fuera de órbita, retorno único y visible.
- Gracias (WP3): señal recibida, expectativas y canal alternativo.

### Máquina de estados del formulario (para WP3)

| Estado | Presentación | Comportamiento |
| --- | --- | --- |
| Reposo | Campos limpios, CTA “Enviar transmisión” | Nombre, email, tipo de misión y mensaje; honeypot fuera del flujo visual |
| Incompleto | Mensaje coral junto al campo y resumen accesible | No se borra ningún dato; foco al primer error |
| Verificando | Indicador discreto “Verificando señal” | Turnstile de prueba/producción; controles preservan su ancho |
| Enviando | CTA bloqueado con telemetría animada | Evita doble submit y navegación accidental |
| Recibido | Redirect a `/es/contacto/gracias` | Página `noindex`, expectativa de respuesta y canal directo |
| Error recuperable | Panel coral con causa pública y “Reintentar” | Conserva todos los valores y devuelve el foco al estado |
| Rate limited | Tiempo de espera explícito | No reintenta automáticamente ni expone reglas internas |

Los mensajes no dependen únicamente del color y se anuncian con `aria-live`.

## Responsive y accesibilidad

- Breakpoints por contenido: 1152, 864 y 672 px.
- Objetivo móvil de control: 375 px sin scroll horizontal del documento.
- Foco cian de 2 px con offset; skip link; landmark y headings semánticos.
- Targets primarios de al menos 44 px.
- `prefers-reduced-motion` elimina paralaje, respiración, pulsos y adquisición sin
  retirar contenido, focus, target ni destinos.
- Contraste objetivo WCAG 2.2 AA; `ink-muted` no se usa para texto esencial por
  debajo de 16 px sobre fondos variables.

En móvil se priorizan `JONAS ORBIT`, sistema, TARGET y raíl. La instrumentación
ambiental se oculta antes de comprimir el layout de desktop.

## Movimiento del System Map

- Los cuerpos ocupan posiciones fijas de dirección de arte; no recorren órbitas.
- Gargantúa mantiene el disco, los mundos pueden rotar localmente y las naves
  derivan de forma casi imperceptible.
- Hover/focus revela arcos breves; selected puede estabilizar una trayectoria
  mayor. No aparece una elipse saturada de golpe.
- El paralaje aditivo no supera 1.5° y se apaga con reduced-motion.
- Tarjetas y páginas fuera del Hero conservan microelevación y zoom máximo de
  1.8 % cuando no interfieren con lectura.

## Contrato actual de escena y rutas

- `cameraPose = f(routeWorldId)`: la cámara no tiene controlador y el scroll no
  le escribe.
- No existen `OrbitControls`, drag, rueda ni scroll acoplado. La animación nunca
  es dueña del router.
- El canvas persistente es decorativo, está detrás y no sustituye HTML, enlaces,
  headings ni contenido.
- El nivel `flat` conserva el mismo contenido y no descarga Three.
- La futura experiencia continua por scroll está documentada aparte en
  [`continuous-journey-phase.md`](continuous-journey-phase.md) y permanece
  diferida hasta que el Hero sea aprobado visualmente.
