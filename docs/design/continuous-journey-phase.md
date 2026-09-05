# Fase futura — Viaje continuo (DIFERIDA, no implementada)

> **Decisión vigente del dueño · 2026-09-04:** el sistema tiene exactamente seis destinos: Tesseracto, Miller, Endurance, Edmunds, Gargantúa y Ranger. Cooper Station y `/es/formacion` están retirados, sin sustituto ni reasignación editorial. El [contrato de seis destinos](sistema-seis-destinos.md) sustituye cualquier número, pose, destino o bloqueo de posición anterior que lo contradiga. Los registros fechados de fases anteriores son evidencia histórica, no instrucciones para reintroducir objetos. La nueva composición queda pendiente de aprobación visual del dueño.


**Estado: DIFERIDA.** No se ha implementado nada de este documento. Se empieza
como tarea propia, y sólo después de que el Hero / System Map esté aprobado.

Existe para que el hero de hoy no cierre la puerta de mañana.

## 1. Qué es

Hoy cada mundo es una ruta con su página. En la fase futura, los siete se
convierten en **un único documento narrativo por idioma**, recorrido con scroll:

```
/es              SYSTEM MAP / HERO
/es#tesseract    Historia
/es#miller       Desarrollo
/es#endurance    Proyectos
/es#edmunds      Creatividad
/es#gargantua    Laboratorio
/es#ranger       Contacto
```

Los casos de estudio **siguen siendo rutas independientes** (`/es/proyectos/omsta`,
…). No se tocan: son las URLs que se comparten, las que posicionan y las que
alguien enlaza desde fuera.

## 2. Fuente de verdad

```
SCROLL DEL USUARIO
      ↓
POSICIÓN EN EL DOM
      ↓
STORE DE PROGRESO   { worldIndex, worldProgress, globalProgress }
      ↓
CÁMARA · HUD · MUNDO ACTIVO · ILUMINACIÓN · (audio, aún más adelante)
```

**Una sola autoridad.** El scroll manda; todo lo demás reacciona. Esto sustituye
al contrato actual `cameraPose = f(rutaActiva)` — y sólo cuando esta fase se
implemente de verdad, no antes.

## 3. Selección de un mundo

```
El usuario selecciona MILLER
      ↓
scrollTo("#miller")
      ↓
cambia la posición en el DOM
      ↓
cambia el store de progreso
      ↓
la cámara reacciona al progreso
```

El clic **no teletransporta la cámara**. Si lo hiciera habría dos autoridades
compitiendo, que es exactamente el problema que este diseño evita.

## 4. Volver al System Map

El HUD expone `SYSTEM MAP ↑`, que conceptualmente hace `scrollTo("#system-map")`.
La cámara se retira, los otros mundos reaparecen y Gargantúa vuelve al centro —
todo como consecuencia del scroll, no como una animación aparte. La marca mínima
`JONAS ORBIT` funciona además como afordancia de inicio.

En la arquitectura actual, todavía basada en rutas, volver al mapa es una
navegación convencional a `/es`. No se implementa ahora una animación de retorno
ni se anticipa el store futuro.

## 5. Prohibido el secuestro del scroll

La rueda, el trackpad, el táctil, el teclado, la barra y `Página abajo` siguen
funcionando como en cualquier página. Sin bloqueos entre mundos, sin
transiciones obligatorias de cinco segundos, sin esperar a que termine una
animación para poder seguir.

**La escena sigue al scroll. El scroll no espera a la escena.**

## 6. Modos del HUD

| Momento | Lectura |
|---|---|
| Hero | `ENDURANCE // NAVEGACIÓN` · `SYSTEM MAP ↑` |
| En tránsito | `ENDURANCE // TRÁNSITO` · `DESTINO // MILLER` |
| Dentro de un mundo | `MUNDO ACTUAL` · `03 // MILLER` |
| Salida | `PARTIDA` · `SIGUIENTE // ENDURANCE` |

## 7. La costura que ya existe

El hero **ya está preparado**: no conoce rutas. Llama a `navigateToWorld(worldId)`
(`lib/world-navigation.ts`), que hoy resuelve a `router.push(href)` y mañana
resolverá a `scrollTo(ancla)`. Toda activación —raíl, eco visual o target— pasa
por esa misma costura. El raíl conserva su `href` real como fallback; los rótulos,
brackets y TARGET no cambian.

## 8. Criterios de aceptación de ESA fase

Viaje continuo · seis mundos anclados · scroll como fuente primaria · cámara y
HUD sincronizados con el progreso · seleccionar un planeta desplaza al destino ·
los casos conservan ruta propia · `SYSTEM MAP ↑` devuelve al hero · scroll natural
sin secuestro · teclado · paridad con movimiento reducido · comportamiento móvil
propio.

## 9. Lo que NO pertenece a esa fase

La banda sonora adaptativa sigue siendo un experimento aparte y posterior.
