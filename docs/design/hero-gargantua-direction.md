# Hero / System Map — dirección artística vigente

**Estado:** candidato en iteración. Esta especificación guía la implementación y
la revisión visual, pero no declara el Hero aprobado por el mero hecho de compilar
o pasar tests.

Manda sobre cualquier descripción anterior del Hero en
`docs/plans/sistema-gargantua.md`, el plan principal y el contrato WP0. La
arquitectura de rutas y cámara sigue perteneciendo al pivote; este documento
manda en composición, mundos, HUD, interacción, luz y motion del System Map.

## 1. Propósito

El Hero es tres cosas:

1. sistema espacial;
2. navegación;
3. exploración.

No es una introducción personal ni una portada editorial. El bloque visible con
«Jonás Javier Encarnación», los dos roles y la frase de propuesta desaparece por
completo y no se sustituye por otro párrafo, tarjeta o panel de vidrio.

La identidad visible se reduce a `JONAS ORBIT` o `JONÁS // ORBIT` dentro del HUD.
El nombre completo, el rol, las acciones contractuales y el CV permanecen en el
HTML semántico servido sin JavaScript para conservar contexto, accesibilidad y
conversión, pero no forman un bloque visual de perfil dentro del System Map.

## 2. El sistema está quieto

Las posiciones de los seis cuerpos alrededor de Gargantúa son constantes de
dirección de arte. `phase` describe una posición, no una animación orbital.

Permanecen vivos únicamente:

- el disco de acreción de Gargantúa;
- la rotación local de los cuerpos cuando aporta materialidad;
- una deriva mínima de las naves;
- balizas pequeñas;
- el campo de estrellas y una respiración de cámara apenas perceptibles;
- paralaje aditivo de hasta 1.5°, apagado con reduced-motion.

La quietud permite componer, mantener etiquetas estables y usar el movimiento
como respuesta de sistema. No se añade movimiento para llenar silencio.

## 3. Jerarquía y composición

| Nivel | Elemento | Lectura requerida |
|---|---|---|
| 1 | **Gargantúa** | foco dominante; escala, luz y contraste mayores |
| 2 | **Endurance** | segunda ancla; nave radial reconocible en primer plano |
| 3 | **Cooper system**, Miller y Edmunds | siluetas claras y profundidad intermedia |
| 4 | Tesseracto y Ranger | destinos menores, legibles y deliberadamente distantes |

La retirada del copy libera espacio para el universo. Ese espacio se resuelve con
escala, profundidad y posición, no con más texto. Gargantúa puede ocupar más
territorio; Endurance gana presencia; Cooper aporta una silueta planetaria
memorable. Ningún objeto se agranda por igual ni se deja una mitad muerta del
viewport por conservar el layout anterior.

Gargantúa permanece sin rótulo permanente. Su escala ya establece identidad.

## 4. Identidad de los mundos

### Gargantúa

Se conserva el motor actual. Revisar brillo, contraste, detalle del disco y su
integración lumínica, sin reiniciar la dirección ni añadir una etiqueta fija.

### Endurance — Proyectos

Endurance es una nave original de espacio profundo, no una copia cinematográfica
y no un toro decorativo. Su estructura contiene:

- hub central;
- radios estructurales;
- entre 8 y 12 módulos de hábitat o misión;
- anillo exterior parcial o disposición radial abierta;
- antenas y pequeños elementos de comunicación;
- estructura mecánica visible;
- luces de navegación discretas.

El casco es metálico oscuro o gris, con borde cálido de Gargantúa, relleno frío
contenido y como máximo un acento de sistema cian. No hay bandas gigantes
azules/blancas ni un anillo exterior macizo. A primera vista debe leerse como
vehículo diseñado y ser la segunda ancla después de Gargantúa.

### Cooper Station — Formación

Cooper se representa como un **planeta anillado inventado con un pequeño hábitat
orbital**. El planeta aporta la silueta; la estación justifica el nombre sin
dominarla.

La atmósfera es fría y desaturada, con reflejo cálido de Gargantúa. Los anillos
son finos y elegantes. El hábitat puede incluir un anillo pequeño, eje, antenas y
pocos módulos iluminados. Debe comunicar conocimiento, orden, calma y una
civilización aspiracional; nunca un cilindro provisional.

### Tesseracto — Historia

Mantiene su escala distante y misteriosa. Se construye con marcos anidados,
profundidad real, brillo interior sutil y una leve sensación de perspectiva
imposible. No compite por tamaño.

### Miller — Desarrollo

Se preserva. Solo se ajustan material y luz para recibir un borde cálido coherente
con Gargantúa.

### Edmunds — Creatividad

Gana riqueza fotográfica mediante terreno sutil, bruma o atmósfera, posible velo
de nubes y una paleta cálida/cobre. No se convierte en otra Tierra ni usa efectos
arcoíris.

### Ranger — Contacto

Sigue siendo una nave metálica pequeña. El violeta se limita a una baliza mínima;
no invade el casco ni el HUD.

## 5. Luz compartida

Gargantúa es la fuente cálida principal. Cada cuerpo recibe un borde o frente
cálido consistente con su posición respecto al centro. Una luz ambiente fría y
contenida recupera volumen en sombra.

La dirección, temperatura e intensidad forman un solo entorno. Los mundos no se
iluminan como assets independientes y el HUD no hereda el arcoíris de sus acentos.

## 6. HUD: jerarquía y paleta

El HUD utiliza tres niveles:

| Nivel | Contenido | Contraste |
|---|---|---|
| 1 — importante | `JONAS ORBIT`, objetivo, destino actual, acción crítica | alto |
| 2 — sistema | modo, estado, índice y sección | medio |
| 3 — ambiente | ticks, marcas y lecturas secundarias | bajo o muy bajo |

Paleta:

- blanco suave para información primaria;
- cian o azul frío para navegación y foco;
- ámbar cálido derivado de Gargantúa para activación secundaria;
- rojo apagado solo para advertencia o error real.

El violeta no es un color principal de navegación. La legibilidad se corrige por
jerarquía individual, no subiendo globalmente la opacidad.

La franja superior se limita a:

- izquierda: `ENDURANCE // NAV`;
- centro: `JONAS ORBIT`;
- derecha: un punto real de estado y `SYSTEM NOMINAL` o su estado verdadero.

## 7. TARGET y brackets

El subsistema TARGET no usa tarjeta, fondo ni panel.

En reposo:

```text
NAVIGATION
──────────
SELECT DESTINATION
```

Con hover o focus sobre Endurance:

```text
TARGET LOCK
04

ENDURANCE
PROJECTS

[ ENTER ]
```

Al activar un destino cambia a `DESTINATION LOCKED`, mantiene nombre, sección e
índice y estabiliza su trayectoria. El nombre del objetivo es uno de los textos
más grandes del HUD.

El cuerpo apuntado recibe cuatro brackets de esquina pequeños. Solo existen para
hover, focus o selected; nunca se dibuja un círculo permanente alrededor de cada
cuerpo ni un retículo gigante. El focus del raíl activa los brackets del mismo
mundo para que teclado y puntero produzcan una respuesta equivalente.

La información de hover es ambiental y no se anuncia por `aria-live` en cada
movimiento. El enlace enfocado aporta el nombre accesible; la navegación final se
confirma con la ruta y el heading de destino.

## 8. Trayectorias y etiquetas

Las trayectorias son feedback:

- reposo: invisibles o casi subliminales;
- hover/focus: uno o varios arcos cortos y tenues;
- selected: una trayectoria mayor o completa solo si ayuda a leer el destino.

No aparece una elipse grande y saturada de golpe. Los rótulos de escena se
reducen al nombre en reposo y revelan índice/función solo al apuntar. Gargantúa no
tiene rótulo permanente.

## 9. Raíl de destinos

El raíl inferior es el selector de misión y el único recorrido accesible de los
siete destinos. Su gramática es tipográfica: índice, nombre, tick y espacio. No
son siete botones rectangulares.

- inactivo: muy apagado;
- hover/focus: contraste medio y señal inequívoca de foco;
- selected: blanco/cian y marcador corto.

Los enlaces conservan `href` real y nombre accesible. El orden del DOM es 01→07,
independiente de la posición espacial.

## 10. Navegación actual y futura

Hoy seleccionar un mundo navega a su ruta. La cámara sigue siendo una función
pura de la ruta activa: `cameraPose = f(routeWorldId)`.

Toda activación del Hero pasa por `navigateToWorld(worldId)`. El raíl conserva
enlaces reales como fallback; los ecos de la escena no crean un segundo recorrido
de teclado. La implementación futura podrá cambiar rutas por anclas sin rehacer
el HUD, el raíl ni el target.

El viaje continuo permanece diferido. `SYSTEM MAP ↑` pertenece a esa fase futura;
en la arquitectura actual las páginas de mundo vuelven a `/es` con navegación
convencional.

## 11. Responsive, accesibilidad y rendimiento

Desktop y móvil son composiciones distintas:

- desktop conserva top HUD, target lateral y raíl;
- móvil prioriza `JONAS ORBIT`, sistema, target y selector;
- la instrumentación ambiental de poco valor se oculta antes de comprimirla;
- el documento no desborda a 375 px.

Los siete mundos son alcanzables por teclado mediante el raíl. El foco no depende
solo de glow o color. El canvas sigue `aria-hidden`, detrás del HTML y nunca es el
contenido ni candidato a LCP.

La dirección se resuelve con geometría, composición, luz y material. No se añade
postprocesado costoso, bloom general, partículas o shaders sin medición y una
ganancia visual demostrable.

## 12. Gate de aprobación visual

Cada iteración se revisa con un frame estático y estados de interacción. Deben
responderse afirmativamente estas preguntas:

1. ¿Se siente como navegación de una nave y no como un menú web?
2. ¿Hay menos texto y más jerarquía?
3. ¿El HUD despierta sin volverse más ruidoso?
4. ¿Endurance se reconoce inmediatamente como nave?
5. ¿Cooper es bello y memorable?
6. ¿Todos los mundos comparten la misma luz?
7. ¿Gargantúa sigue dominando?
8. ¿La interacción se entiende en menos de tres segundos?

Tests verdes son obligatorios, pero no responden estas preguntas. Hasta que la
evidencia visual las responda, el estado sigue siendo **candidato en iteración**.
