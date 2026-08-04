# WP0 — contrato visual de Jonás Orbit

Estado: **aprobado para implementación F1A** · 2026-08-03

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
5. El primer pantallazo responde quién, qué construye y dónde está la prueba.

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
- Ámbar `#f2c879`: prueba, acción primaria y Endurance.
- Cian `#7fe5ff`: navegación, foco y sistemas.
- Coral `#ff7a66`: señal semántica; no comparte color con Ranger.
- Cada mundo hereda `accent` y `secondary` desde `worlds.data.ts`.

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
| Tesseracto | Cuadrados superpuestos y núcleo geométrico | Historia y visión |
| Cooper Station | Cilindro/anillo inclinado | Formación modular |
| Miller | Esfera oceánica estratificada | Ingeniería full-stack |
| Endurance | Anillo técnico | Archivo de proyectos |
| Edmunds | Esfera cálida y sedimentaria | Creatividad visual |
| Gargantúa | Núcleo negro y disco luminoso | Laboratorio |
| Ranger | Baliza/nave vertical | Contacto y conversión |

Son interpretaciones gráficas originales realizadas con CSS; no copias de assets
cinematográficos.

## Componentes

### Navegación

- Cabecera sticky de dos niveles: identidad/estado y mapa de siete mundos.
- El segundo nivel tiene scroll horizontal en móvil y no oculta destinos.
- El estado activo consume el store canónico de WP4, centra el destino visible
  en móvil y expone `aria-current="location"` sin convertir el menú en otro
  controlador del scroll.

### Hero

- Responde nombre, propuesta y prueba antes del primer scroll.
- CTAs contractuales: “Ver proyectos”, “Trabajemos juntos” y “Descargar CV”.
- Instrumento orbital CSS como firma visual, marcado `aria-hidden`.

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
- `prefers-reduced-motion` elimina órbitas, scans y desplazamientos sin retirar
  contenido ni estados.
- Contraste objetivo WCAG 2.2 AA; `ink-muted` no se usa para texto esencial por
  debajo de 16 px sobre fondos variables.

## Movimiento permitido en WP0–WP2

- Órbitas CSS lentas y lineales.
- Microelevación de tarjetas y zoom máximo de 1.8 %.
- Línea de señal en el indicador de scroll.
- Sin parallax, scroll listeners, canvas ni controlador de cámara: pertenecen a
  WP4/F2B y no deben aparecer antes.

## Contrato de narrativa espacial — WP4

- El scroll del documento es la única fuente de verdad. Un único `requestAnimationFrame`
  bajo demanda calcula `worldIndex`, `worldProgress` y `globalProgress` y los
  publica en Zustand; el canvas solo dibuja la fotografía de ese mismo estado.
- La selección explícita usa `pushState`; el scroll usa `replaceState`. Cada
  entrada conserva fase e índice para restaurar Atrás/Adelante sin contaminar el
  historial ni depender de un slug como identidad estructural.
- Los saltos re-miden y re-anclan tras materializar contenido diferido. Esto
  evita drift en 375 px con `content-visibility: auto` y alturas intrínsecas.
- Motion aporta entradas editoriales y el HUD; las scroll-driven animations CSS
  son una mejora progresiva, nunca un requisito para comprender el contenido.
- El starfield 2D es determinista, responde solo al progreso, limita DPR a 1.75
  y se monta después de hidratación/idle. No mantiene un loop permanente.
- `prefers-reduced-motion` veta el canvas, los desplazamientos y el scroll suave;
  conserva los siete destinos, el fondo estático, anclas, historial y telemetría.
- En móvil el HUD ocupa el corredor bajo la navegación sticky para no tapar CTAs,
  canales ni campos del formulario.
