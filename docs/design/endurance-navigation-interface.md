# Endurance Navigation Interface — especificación del Hero / System Map

**Fase:** SYSTEM MAP / HERO. El viaje continuo por scroll está **diferido**
(ver `continuous-journey-phase.md`).

## 1. El encuadre conceptual

El hero deja de ser «un mapa orbital con etiquetas» y pasa a ser **el puesto de
navegación de la Endurance mirando al sistema Jonás Orbit a través de su
cristal**.

La diferencia no la hace el universo —que ya funcionaba— sino el **marco**: el
visitante tiene que sentir que *observa desde algún sitio*. Sin marco, un
sistema estelar flotando en negro es una ilustración; con marco, es una vista.

El universo sigue siendo el protagonista. El HUD es instrumentación, no tablero.

## 2. Composición

```
┌───────────────────────────────────────────────────────────────────────┐
│ ⌐ ENDURANCE // NAVEGACIÓN     JONAS ORBIT      SISTEMA // NOMINAL   ¬ │
│                                                                       │
│  JONÁS JAVIER ENCARNACIÓN                                             │
│  DESARROLLADOR FULL-STACK                             ── NAV TARGET   │
│  DISEÑADOR DE PRODUCTO DIGITAL                        04 // ENDURANCE │
│                                                       PROYECTOS       │
│  Construyo productos digitales donde                  ───────────     │
│  ingeniería y diseño orbitan juntos.                                  │
│                                                                       │
│                    ●  G A R G A N T Ú A                               │
│                       (universo intacto)                              │
│                                                                       │
│                                                                       │
│ ⌐                                                                   ¬ │
│  01─02─03─04─05─06─07                          MOVIMIENTO · 3D        │
└───────────────────────────────────────────────────────────────────────┘
```

- **Esquinas:** corchetes de calibración. Es todo el «cristal» que hay. Nada de
  marcos metálicos ni interiores de cabina.
- **Franja superior:** nave · sistema · estado. Tres lecturas, ninguna inventada.
- **Izquierda:** identidad. Subordinada a Gargantúa por tamaño, no por opacidad.
- **Derecha:** NAV TARGET. Reacciona a hover/focus real.
- **Inferior izquierda:** raíl de los siete destinos.
- **Inferior derecha:** controles reales (movimiento reducido, escena 3D).
- **Centro:** intacto.

## 3. Regla dura: cero instrumentación falsa

Todo lo que se ve corresponde a **estado real de la aplicación**:

| Lectura | De dónde sale |
|---|---|
| `SISTEMA // NOMINAL \| PLANO` | nivel del gate de capacidad (`data-scene`) |
| `NAV TARGET` | hover/focus real sobre un destino |
| índice `01…07` | `order` de `worlds.data.ts` |
| `MOVIMIENTO` | `prefers-reduced-motion` real |
| `3D` | `?no3d` / perfil ligero real |

Prohibido: combustible, oxígeno, coordenadas, avisos, telemetría, radares.
Si no corresponde a algo que el sitio sabe, no se dibuja.

## 4. Navegación: un solo juego de enlaces

El problema a evitar es anunciar catorce destinos para siete mundos.

- **El raíl inferior lleva los siete `<a href>` reales.** Es lo que recorre el
  teclado, lo que indexa Googlebot y lo que funciona sin JavaScript.
- **Los rótulos de la escena son un eco visual** (`aria-hidden`, fuera del orden
  de tabulación) anclados a su cuerpo. Se pueden pulsar con el ratón, pero no
  duplican el árbol de accesibilidad.

Esto además **mejora** lo anterior: antes el recorrido con teclado saltaba entre
etiquetas repartidas por la pantalla; ahora es una fila ordenada 01→07.

## 5. Divulgación progresiva de los rótulos

| Estado | Muestra |
|---|---|
| reposo | `MILLER` |
| hover / focus | `MILLER` + `03 // DESARROLLO` |
| destino apuntado | además, el NAV TARGET de la derecha |

El universo se queda más limpio y el detalle aparece donde se está mirando.

## 6. La costura con el futuro

El HUD **no sabe cómo se navega**. Llama a `navigateToWorld(worldId)`
(`lib/world-navigation.ts`). Hoy resuelve a una ruta; mañana resolverá a
`scrollTo("#miller")` sin tocar una línea del hero.
