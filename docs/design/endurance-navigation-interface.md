# Endurance Navigation Interface — especificación del HUD del System Map

**Fase:** Hero / System Map. El viaje continuo por scroll está **diferido**; ver
`continuous-journey-phase.md`.

La dirección artística general, los mundos y el gate de aprobación viven en
`hero-gargantua-direction.md`. Este documento detalla únicamente la interfaz de
navegación.

## 1. Encuadre conceptual

El visitante observa Jonás Orbit a través de un sistema de navegación de la
Endurance. El universo sigue siendo protagonista; el HUD es instrumentación
sincera, no tablero decorativo.

El efecto de cabina se consigue con tipografía, alineación, marcas de esquina y
respuesta al objetivo. No se dibujan interiores metálicos, paneles de vidrio,
radares, gauges ni datos ficticios.

## 2. Composición

```text
┌───────────────────────────────────────────────────────────────────────┐
│ ENDURANCE // NAV              JONAS ORBIT           ● SYSTEM NOMINAL │
│                                                                       │
│                                                       NAVIGATION      │
│                                                       ──────────      │
│                                                       SELECT          │
│                                                       DESTINATION     │
│                                                                       │
│                         GARGANTÚA                                     │
│                    universo y destinos                               │
│                                                                       │
│ 01 TESS  02 COOPER  03 MILLER  04 ENDURANCE  …  07 RANGER           │
└───────────────────────────────────────────────────────────────────────┘
```

- **Superior:** nave, marca y estado real.
- **Centro:** universo; sin bloque visible de perfil.
- **Lateral:** TARGET, alineado al borde y sin fondo.
- **Inferior:** raíl tipográfico de siete destinos.
- **Esquinas:** marcas de calibración casi invisibles.

El nombre completo, rol, acciones contractuales y CV permanecen en el HTML
semántico sin JavaScript, pero no se presentan como un bloque de copy dentro de
este encuadre.

## 3. Jerarquía de información

| Nivel | Elementos | Tratamiento |
|---|---|---|
| 1 — importante | `JONAS ORBIT`, nombre del target, destino bloqueado, acción crítica | blanco suave o cian, contraste alto |
| 2 — sistema | modo, estado, índice y sección | contraste medio |
| 3 — ambiente | ticks, reglas, calibración y lecturas secundarias | contraste bajo |

No se aumenta la opacidad de todo el HUD. Los elementos ambientales pueden casi
desaparecer para que el objetivo se lea en menos de un segundo.

## 4. Paleta

- blanco suave: información primaria;
- cian/azul frío: navegación, focus y adquisición;
- ámbar cálido: respuesta secundaria ligada a Gargantúa;
- rojo apagado: solo warning o error real.

Los acentos propios de los mundos pueden modular objetos y trayectorias, pero no
convierten el HUD en una interfaz multicolor. El violeta de Ranger queda limitado
a una baliza pequeña.

## 5. Franja superior

- izquierda: `ENDURANCE // NAV`;
- centro: `JONAS ORBIT`;
- derecha: `● SYSTEM NOMINAL`, `SYSTEM FLAT` u otro estado que corresponda al
  gate real.

El punto de estado puede pulsar muy lentamente. No se añaden coordenadas,
combustible, oxígeno, velocidad ni telemetría inventada.

## 6. Subsistema TARGET

TARGET se compone con texto, reglas finas, micro marcadores y espacio negativo.
Nunca es una tarjeta.

### Reposo

```text
NAVIGATION
──────────
SELECT DESTINATION
```

### Hover o focus

```text
TARGET LOCK
04

ENDURANCE
PROJECTS

[ ENTER ]
```

El nombre es uno de los textos de mayor jerarquía del viewport. Focus y hover
producen la misma lectura, el mismo realce del mundo y los mismos brackets.

### Activado

```text
DESTINATION LOCKED
04

ENDURANCE
PROJECTS
```

Los brackets quedan estables y la trayectoria puede ampliarse mientras se
completa la navegación. No aparece un modal ni una segunda acción.

## 7. Brackets y trayectoria

Solo el objetivo actual recibe cuatro pequeños brackets de esquina. Se acercan al
silhouette con un easing corto; no forman un círculo ni un radar.

La trayectoria responde por niveles:

- reposo: ausente o casi invisible;
- hover/focus: arco corto y tenue;
- selected: recorrido mayor solo si mejora orientación.

El objetivo también puede ganar un borde cálido ligeramente más intenso. La
respuesta es de estado, no una animación ornamental permanente.

## 8. Raíl de destinos

El raíl es el único recorrido accesible de los siete mundos y conserva siete
`<a href>` reales en orden 01→07:

```text
01        02        03        04
TESS      COOPER    MILLER    ENDURANCE
```

No hay cajas por destino. El índice, el nombre, un tick y el espaciado construyen
el control.

- inactivo: muy apagado;
- hover/focus: contraste medio;
- selected: blanco/cian y marcador corto.

El nombre accesible contiene el nombre cósmico y la sección. El índice es
orientación visual y no añade ruido al anuncio. Focus usa un indicador geométrico
visible, no solo glow.

Los rótulos junto a cuerpos son ecos visuales y no crean otros siete elementos de
tabulación. Hover sobre un eco y focus sobre su enlace del raíl actualizan el
mismo TARGET.

## 9. Estado real y accesibilidad

| Lectura | Fuente |
|---|---|
| estado del sistema | gate publicado por la escena |
| TARGET | hover/focus/selected del destino |
| índice | orden canónico del mundo |
| movimiento | preferencia real de reduced-motion |
| 3D | perfil real de efectos |

La lectura ambiental de hover no usa `aria-live`: anunciar cada movimiento del
puntero sería ruido. Quien navega con teclado recibe el nombre completo del enlace
enfocado y feedback visual equivalente. Un control real nunca vive bajo un
ancestro `aria-hidden`; solo las marcas decorativas se ocultan del árbol.

## 10. Navegación y costura futura

El HUD no decide si viajar significa cambiar de ruta o desplazarse a un ancla.
Toda activación llama a `navigateToWorld(worldId)` desde
`lib/world-navigation.ts`.

Hoy la abstracción conserva el `href` real y completa una navegación de ruta. En
la fase futura resolverá a `scrollTo(ancla)`. El raíl, TARGET y los brackets no
cambian por ese reemplazo.

Las páginas actuales ofrecen un retorno convencional a `/es`. `SYSTEM MAP ↑`
es la afordancia de retorno de la futura experiencia continua, no una animación
que se construya durante este pase.

## 11. Responsive

En móvil no se encoge el desktop:

- `JONAS ORBIT`, el sistema, TARGET y el raíl tienen prioridad;
- el estado superior se simplifica;
- controles secundarios y calibración ambiental se ocultan;
- el raíl puede distribuirse o desplazarse sin provocar overflow del documento;
- el objetivo nunca tapa el selector ni un target táctil.

Reduced-motion conserva todos los estados y destinos, pero elimina adquisición,
respiración, pulsos y desplazamientos no esenciales.
