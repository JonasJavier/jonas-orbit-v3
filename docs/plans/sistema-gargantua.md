# Diseño: Sistema Gargantúa — la home deja de ser un scroll y pasa a ser un lugar

Generado 2026-08-06 · Decisión del dueño (Jonás) en sesión
Estado: **APROBADO — sustituye la arquitectura de navegación de F1A**
Documento canónico de alcance/fases/contenido: [`jonas-orbit-v3-mission-endurance.md`](jonas-orbit-v3-mission-endurance.md)

Este documento manda sobre el plan principal **solo** en: arquitectura de rutas,
contrato de cámara, capa visual, transiciones y presupuestos de rendimiento. En
todo lo demás (contenido, conversión, seguridad del formulario, SEO, i18n,
criterios de honestidad) el plan principal sigue vigente sin cambios.

**Enmienda de dirección artística (2026-08-29):**
[`../design/hero-gargantua-direction.md`](../design/hero-gargantua-direction.md)
manda sobre este plan en composición del Hero, identidad visible, diseño de los
mundos, escala, HUD, estados, trayectorias, luz, estrellas, hit testing,
interacción de puntero y motion. Su estado es candidato en iteración: no implica
aprobación visual consumada.

---

## 1. Qué cambia y por qué

### El pedido

> «Quiero que sea más como una galaxia en vez de una órbita. ¿Recuerdas en la
> peli de Interstellar luego de que pasaron el agujero de gusano? Quiero que sea
> esa galaxia o sistema como lo representa en la peli, quiero que sea realista
> pero controlado por el rendimiento. El home sería la galaxia, cada planeta o
> agujero como Gargantúa será una página diferente, el usuario podrá elegir los
> planetas. No creo que sería bueno que pudiera mover la cámara, que la cámara
> esté fija por favor.»

### Corrección de concepto (importa para el diseño)

Lo que se ve tras el agujero de gusano en la película **no es una galaxia**: es
un **sistema** — el agujero negro supermasivo Gargantúa, su disco de acreción, y
tres planetas candidatos en órbita (Miller, Mann, Edmunds). La galaxia entera
nunca se muestra.

Usar el nombre correcto no es purismo: **desbloquea la idea futura**. El agujero
de gusano de la película está junto a Saturno y Cooper Station orbita Saturno al
final. Esa referencia registra un posible cruce al Sistema Solar como G4, pero no
dicta la representación del Hero actual: Cooper Station se lee hoy como un
«Cooper system» inventado —planeta anillado + hábitat pequeño— dentro del mapa.
El cruce y cualquier reinterpretación narrativa no se construyen ahora.

Por eso el nombre interno de la escena es **Sistema Gargantúa**, no «galaxia».

### Las tres consecuencias arquitectónicas

| Antes (F1A construida) | Ahora |
|---|---|
| Una página narrativa por idioma; los 7 mundos son secciones con ancla | 8 rutas reales: la home-escena + 7 páginas de mundo |
| El scroll es la única fuente de verdad de la cámara | **No hay controlador de cámara.** La pose es función pura de la ruta |
| El fondo es una capa decorativa detrás del texto | El **System Map es la home**; HUD y raíl son su interfaz visible, mientras la identidad profesional permanece en HTML semántico |

---

## 2. Arquitectura de rutas

Se conservan las decisiones ya tomadas: identidad canónica `WorldId` (regla 4) y
slugs localizados con significado (tensión T1, ya resuelta a favor del slug ES).

| `WorldId` | Ruta ES | Contenido |
|---|---|---|
| — | `/es` | **System Map / Sistema Gargantúa** (escena + HUD/raíl; fallback semántico sin bloque personal visible) |
| `tesseract` | `/es/sobre-mi` | Historia y perfil |
| `cooper-station` | `/es/formacion` | Formación, CS50x/CS50W, Marketing Digital |
| `miller` | `/es/desarrollo` | Desarrollo: stack, forma de trabajar |
| `endurance` | `/es/proyectos` | Índice de proyectos |
| `edmunds` | `/es/creatividad` | Fotografía y diseño |
| `gargantua` | `/es/laboratorio` | Experimentos reales del propio build |
| `ranger` | `/es/contacto` | Contacto, oferta freelance, canales directos |

**El árbol de rutas ya existente encaja sin forzarlo** — y esto es evidencia de
que el pivote va a favor del código, no en contra:

- `app/[locale]/proyectos/[slug]/` ya existe → `/es/proyectos` se convierte en su
  índice natural.
- `app/[locale]/contacto/gracias/` ya existe → `/es/contacto` se convierte en su
  padre natural.

### Ganancia colateral: SEO

Ocho páginas indexables con `title`, `description`, canonical y OG propios, en
lugar de una sola página con siete anclas que Google trata como un único
documento. Esto era una debilidad silenciosa de la arquitectura anterior. El
`sitemap.ts` pasa de 6 a 12 URLs.

### Coste real

`content-visibility: auto` deja de hacer falta (cada ruta carga solo lo suyo), y
con él desaparecen las pruebas de ancla/búsqueda-en-página que exigía. A cambio,
cada navegación es una navegación de verdad: hay que prefetchear.

### Costura de navegación y viaje continuo diferido

El Hero no acopla sus controles a `router.push`: raíl, eco visual y TARGET pasan
por `navigateToWorld(worldId)`. Hoy esa abstracción conserva un `href` real y
navega a la ruta correspondiente. Una fase futura podrá resolver la misma acción
con scroll a un ancla sin reconstruir el HUD.

Esa experiencia continua está **diferida** en
[`../design/continuous-journey-phase.md`](../design/continuous-journey-phase.md).
`SYSTEM MAP ↑` pertenece a dicha fase futura. Mientras la arquitectura siga
basada en rutas, volver al mapa es una navegación convencional a `/es`; no se
implementa aquí un store de progreso ni una animación de retorno.

---

## 3. Contrato de cámara — el corazón del pivote

> **Regla:** la cámara no tiene controlador. Su pose es una **función pura de la
> ruta activa**: `cameraPose = f(routeWorldId)`. Nadie más le escribe. Nunca.

Esto **sustituye** la regla 6 del repositorio («scroll = única fuente de verdad
de la cámara»). El scroll deja de tocar la cámara por completo.

Reglas derivadas, todas verificables:

1. **Sin `OrbitControls`, sin drag, sin rueda, sin scroll acoplado.** Añadir
   cualquiera de ellos es una regresión, no una mejora.
2. **Transiciones guionadas.** Ir de una pose a otra es una animación acotada en
   el tiempo, interrumpible y con timeout duro. La navegación se compromete
   *aunque la animación no termine*: la animación nunca es dueña del router.
3. **`prefers-reduced-motion` → `flat` instantáneo por defecto.** No comienza
   ninguna transición ni movimiento sin una acción del visitante. En hardware
   compatible, un opt-in explícito y reversible puede activar 3D + movimiento;
   al volver a «Mapa sin animación» / «Reducir efectos», el corte a `flat`
   vuelve a ser instantáneo.
4. **Único input continuo permitido:** un paralaje acotado (≤ 2°) desde el
   puntero o el giroscopio. Es *aditivo* sobre la pose de destino, no la
   modifica, y se desactiva mientras reduced-motion siga siendo el modo efectivo;
   el opt-in 3D lo habilita como parte del movimiento solicitado. Si algún día
   molesta, se quita sin tocar nada más.

### Por qué la cámara fija es la decisión de rendimiento más importante del proyecto

No es una limitación que aceptamos: es la palanca que hace viable el realismo.

Con un punto de vista conocido de antemano se puede acotar casi todo:

- El fondo WebGL integra tres estratos procedurales de estrellas en el shader de
  Gargantúa; `flat` los agrupa en un único canvas 2D. No existen 10.000 sprites,
  meshes o nodos DOM animados.
- Las capas `far`, `mid` y `near` fijan de antemano densidad, tamaño y movimiento;
  junto al disco reducen luminancia para proteger su lectura.
- Los cuerpos compuestos usan volúmenes conocidos y una iluminación compartida;
  no necesitan LOD complejo ni cámara libre.
- La interacción no hace raycast: la proyección publica centro y radio compuesto
  a siete proxies DOM acotados.

Un motor con cámara libre gasta la mayor parte de su presupuesto en ser correcto
desde cualquier ángulo. Nosotros solo tenemos que ser correctos desde ocho.

---

## 4. Propiedad de la escena: un único canvas persistente

El `<Canvas>` vive en `app/[locale]/layout.tsx`, **no** en las páginas.

```
app/[locale]/layout.tsx
  └─ <SceneShell>            ← monta el canvas UNA vez, sobrevive a la navegación
       ├─ <GargantuaSystem/> ← WebGL, aria-hidden, position: fixed, z-index bajo
       └─ {children}         ← el contenido SSR de cada ruta, encima
```

Consecuencias:

- Navegar entre mundos **no destruye ni recrea el contexto WebGL**. Esto es lo
  que permite que la transición de viaje sea continua en lugar de un parpadeo
  negro.
- El contenido de cada ruta se renderiza en el servidor y llega como HTML real.
  El canvas es una capa decorativa: `aria-hidden="true"`, fuera del orden de
  tabulación, sin texto dentro.

### Regla no negociable: la escena nunca es el contenido

> El HTML servido de `/es` contiene, sin JavaScript, el nombre de Jonás, su rol,
> los dos CTAs, el enlace al CV y enlaces `<a href>` reales a los siete mundos.
> La identidad, el rol, las acciones y el CV son fallback semántico: no forman un
> bloque personal visible dentro del Hero. Los destinos sí se presentan en el
> raíl de navegación.

Un reclutador con la red lenta, un lector de pantalla, un móvil sin WebGL2 y
Googlebot conservan el mismo significado y las mismas rutas. La escena entra
después y se coloca detrás. Esto no es una concesión de accesibilidad: es lo que
hace que un portafolio 3D siga sirviendo para conseguir trabajo.

Corolario: el candidato a LCP de `/es` es el shell HTML/CSS ligero, nunca el
canvas ni una textura de la escena.

---

## 5. Tres niveles de fidelidad

El gate de capacidad ya especificado en el plan principal elige el nivel. El
visitante puede sobrescribir una recomendación de calidad o reduced-motion en
hardware compatible, y su elección se persiste. Sólo la ausencia de WebGL2 es
irreversible: una preferencia o heurística nunca fabrica esa capacidad.

| Nivel | Cuándo | Qué monta |
|---|---|---|
| `flat` | reduced-motion por defecto · `?no3d=1` · sin WebGL2 · opt-out · fallo de escena | `StaticBackdrop` + tres capas de estrellas agrupadas + Gargantúa y los seis destinos como cuerpos 2D estáticos, con proxies/HUD/raíl íntegros. Cero Three descargado |
| `orbit` | Por defecto en móvil y equipos modestos | Raymarch acotado, cuerpos compuestos, fondo procedural far/mid/near, luz compartida, sin postprocesado caro, DPR ≤ 1.25 |
| `deep` | Escritorio capaz, señales verdes | El mismo sistema con más pasos/DPR y detalle material; no suma efectos por principio, DPR ≤ 1.75 |

`lib/starfield.ts` y `components/starfield-2d.tsx` **sobreviven** como el nivel
`flat`. La preferencia reduced-motion detiene su deriva y conserva las estrellas
estáticas; el mapa añade Tesseracto, Cooper, Miller, Endurance, Edmunds y Ranger
como siluetas 2D propias alrededor de Gargantúa. No convierte el cielo en un
vacío ni reduce los destinos a cruces de calibración.

**La ausencia de WebGL2 sigue siendo un veto duro.** Reduced-motion,
rasterizador por software, red/memoria modestas y `?no3d=1` recomiendan o piden
`flat`, pero muestran un opt-in accesible si WebGL2 existe; sólo dejan de ser el
modo efectivo tras esa acción explícita. «Mapa sin animación» / «Reducir
efectos» revierte la elección y devuelve el mapa a `flat`. Señales ausentes
(`deviceMemory`, `effectiveType`) cuentan como neutrales.

**Prohibido sigue prohibido:** ninguna rama de este gate puede depender de
detectar un auditor. `?no3d=1` es el mismo mecanismo del botón «Reducir
efectos», visible en la interfaz (regla 5 del repositorio).

---

## 6. Gargantúa: propuesta inicial por capas — **SUPERADA**

Esta sección conserva el razonamiento histórico de G0, pero **no describe la
implementación vigente**. La enmienda §6-bis la sustituye por completo.

Decisión del dueño: **disco + distorsión falseada por capas.**

El lente gravitacional honesto (raymarching de la métrica de Kerr, que es lo que
hizo Double Negative para la película con horas de render por frame) no cabe en
un presupuesto web. La aproximación por capas sí, y a la distancia y ángulo fijos
que usamos es visualmente muy difícil de distinguir:

1. **Disco de acreción** — geometría anular real con shader propio: gradiente de
   temperatura, ruido en el borde, rotación diferencial (el interior gira más
   rápido que el exterior). Es la capa que más «vende» el efecto.
2. **Anillo de Einstein / imagen superior del disco** — el arco que en la película
   pasa por encima y por debajo del agujero. Se **hornea como textura** y se
   compone como billboard alineado. A cámara fija esto es exacto, no aproximado.
3. **Sombra del horizonte** — esfera negra pura con un borde de *photon ring*
   estrecho y brillante.
4. **Distorsión de pantalla acotada** (solo nivel `deep`) — un pase que desplaza
   las UV del fondo dentro de un radio limitado alrededor del horizonte. Cuesta
   un pase de pantalla completa con lectura restringida, no una integración de
   geodésicas.
5. **Doppler / beaming** — un lado del disco más brillante y azulado que el otro.
   Es un multiplicador en el shader del punto 1: coste cero, y es el detalle que
   más distingue «parece un agujero negro» de «parece Gargantúa».

Si el spike (§9, G0) demuestra que no llega a 60 fps en el dispositivo de
referencia, el orden de sacrificio es: 4 → 2 → 5. Nunca 1 ni 3.

### 6-bis. Enmienda 2026-08-06 — geodésicas de Schwarzschild, una sola capa

**Lo de arriba queda superado por el hallazgo de G0.** Se construyeron las cinco
capas y **la capa 2 no funciona**: un billboard no puede coserse con continuidad
al disco real, y esa costura era justo lo que delataba el render. Los intentos de
disimularla acabaron con un disco lavado, la sombra gris y un borde rectangular
del plano visible en cuadro.

Lo que sustituye a las cinco capas es **un raymarch de geodésicas nulas de
Schwarzschild** en un único cuad de pantalla completa.

**Esto no contradice el veto de §6, lo respeta.** Lo vetado era el raymarching de
la métrica de **Kerr** — arrastre de marcos, integración de la métrica completa,
horas por frame. Las geodésicas de Schwarzschild son otra cosa: se reducen a una
fuerza central, `a⃗ = −(3/2)·h²·r⃗/r⁵` con `h² = |r⃗ × v⃗|²` constante, que es un
Verlet de dos líneas y ~60-120 pasos por píxel. El coste está en el mismo orden
que la cadena de cuatro pases que sustituye.

Lo que se gana no es fidelidad marginal: sale **exacto y gratis** todo lo que las
capas falsificaban — anillo de fotones, arco de la cara lejana por encima, imagen
secundaria por debajo, sombra al radio aparente correcto, anillo de Einstein del
fondo, y la oclusión mutua entre todo ello. Y desaparecen las capas 2, 3 y 4
enteras, con su código y sus costuras.

**Lo que sigue mandando de §6:** el disco (1) y el Doppler (5) siguen siendo el
alma del efecto, ahora dentro del mismo shader. El orden de sacrificio se
reescribe en términos del nuevo motor: **DPR → nº de pasos → calidad del fondo**.
La física no se sacrifica.

**Corolario del contrato de cámara.** §3 hacía barato el *falseo*; resulta que
hace barato lo *real*. Con la pose fija, la acumulación temporal (jitter de
Halton dentro del píxel + mezcla con el fotograma anterior) es una línea de
código, sin reproyección ni detección de desoclusiones, y da ~8 muestras por
píxel. Es lo que permite bajar el DPR y lo que convierte el anillo de fotones de
un punteado a un hilo continuo.

---

## 7. Transición de viaje

Decisión del dueño: **el agujero de gusano es una transición de viaje, no una
pantalla de carga inicial.** Es además lo fiel a la película: lo cruzan para
*viajar*, no para arrancar.

Dos intensidades de la misma familia visual:

| Transición | Cuándo | Duración | Qué es |
|---|---|---|---|
| **Aproximación** | `/es` → mundo, y mundo → mundo | 900–1400 ms | Caída de cámara hacia el cuerpo + estelas de luz + aberración cromática leve |
| **Cruce** | Sistema Gargantúa ↔ Sistema Solar (G4) | 1600–2000 ms | La esfera del agujero de gusano con el otro lado distorsionado en su superficie |

Reglas duras de la transición:

- **Nunca bloquea la primera pintura.** No existe en la carga inicial.
- **La ruta se prefetchea antes de empezar.** Las 8 rutas son estáticas, así que
  la navegación es instantánea; la animación existe para dar sensación de viaje,
  no para tapar una espera.
- **El router manda.** Si la navegación termina antes, la animación se acorta. Si
  la animación termina antes, se espera con un timeout duro y luego se corta.
  Nunca se atrapa al visitante en una animación.
- **Saltable:** cualquier tecla, clic o gesto la corta.
- **`flat` y reduced-motion antes del opt-in:** navegación normal, sin
  transición. Un *crossfade* de 120 ms como mucho.

---

## 8. Rendimiento: controles y presupuestos

### Controles activos

- Tope de DPR por nivel (§5).
- **Paso de animación fijo** desacoplado del framerate: el disco de Gargantúa,
  las rotaciones locales y la deriva mínima avanzan por tiempo real, no por
  frame. Las posiciones orbitales de dirección de arte permanecen fijas.
- Pausa total con `document.hidden`.
- Pausa cuando el canvas queda completamente cubierto por contenido (páginas de
  mundo con scroll largo).
- **Calidad adaptativa:** ventana deslizante de tiempo de frame; degrada de
  `deep` a `orbit` antes de perder frames, y de `orbit` a `flat` si colapsa.
- **Teardown real** del canvas al degradar a `flat`: liberar geometrías,
  texturas y el contexto WebGL, no solo dejar de dibujar.
- **Pointer life con techo:** custom cursor y stardust sólo para fine-pointer.
  Un único canvas 2D usa pool circular/typed arrays, no React state por partícula;
  su RAF existe únicamente mientras el pool tiene actividad y se pausa al ocultar
  el documento.

### Presupuestos — y la deuda que hay que saldar antes (T8)

El plan principal fija «JS inicial < 150 KB gz». **Ese número ya era inalcanzable
antes de este pivote**: la auditoría de 2026-08-03 midió 231 KiB gz en la home y
147,7 KiB gz en `/es/privacidad`, una página casi sin interactividad. El baseline
de Next 16 + React 19 consume el 98 % del presupuesto él solo. Añadir three.js no
crea el problema; lo hace imposible de ignorar.

**Propuesta de re-línea-base** (requiere confirmación del dueño, ver §11):

| Presupuesto | Valor propuesto | Cómo se mide |
|---|---|---|
| Baseline compartido de Next/React | Se **mide y se congela** como cifra registrada; regla de no-regresión | `next build` por ruta |
| JS propio de ruta (sin baseline) | < 40 KB gz por ruta | Total de ruta − baseline |
| Chunk de la escena 3D | < 350 KB gz, **siempre** vía `next/dynamic`, nunca en la carga inicial | Chunk aparte |
| Texturas de la escena | < 1,2 MB en total, KTX2/Basis | Presupuesto propio, no cuenta como JS |
| **Gate real de CI** | Lighthouse ≥ 90 en las 4 categorías, perfil ligero | Ya implementado en `ci.yml` |

El último es el que importa: es el único que se verifica automáticamente en cada
PR y el único que refleja lo que vive un visitante. El resto son controles de
higiene.

### Meta de fluidez de la escena

Promedio ≈ 60 fps con p5 ≥ 45 en el dispositivo de referencia (Android de gama
media clase Pixel 7a, Chrome estable, DPR ≤ 2), midiendo la home con Gargantúa
visible — que es ahora la escena más pesada y además la primera que se ve.
Degradación automática de nivel antes que incumplir la meta.

---

## 9. Fases

Cada fase termina en un sitio completo y desplegable (regla del plan principal).

### G0 — Spike de dirección visual · *timeboxed, código desechable*

Una escena aislada, fuera del sitio, que responda una sola pregunta:
**¿Gargantúa lee como la película a 60 fps en un móvil de gama media?**

- Entregable: la escena + una medición real, no una impresión.
- **Gate:** si no llega, se cae al plan B (nivel «estilizado, no fotorrealista»)
  y se registra la decisión. El pivote de rutas sigue adelante igual.
- Nada de este código entra al sitio sin reescribirse.

**Estado 2026-08-06 — reconstruido sobre geodésicas (§6-bis), pendiente de
medición formal.** Vive en `app/spike/gargantua/` (`/spike/gargantua`):
`noindex`, bloqueado en `robots.txt`, fuera del sitemap. Medición de
percentiles en ventanas de 20 s, con las condiciones de render (resolución,
DPR pedido / de pantalla / efectivo, nº de pasos) publicadas junto a la cifra.

Hallazgos de G0 que la escena de G2 debe heredar:

1. **La sombra aparente es √27/2 ≈ 2.6 rs, no 1 rs.** Con el raymarch esto sale
   solo, pero el número sigue mandando en el encuadre de cada pose.
2. **La capa 2 de §6 no era viable** (§6-bis). Es el hallazgo que justifica el
   spike entero.
3. **El borde interior del disco es el parámetro que decide si el anillo de
   fotones parece dibujado.** Un pase de depuración clasificando cada rayo
   mostró que el aro sospechoso era un anillo de rayos que escapaban *sin tocar
   el disco*, no falta de presupuesto de pasos. Un borde en `r = R` se ve en
   `b = R/√(1−1/R)`; hay que elegir R para que eso caiga sobre 2.598. En el
   spike, R = 1.58 (Gargantúa es un Kerr casi extremo: su disco llega casi al
   horizonte).
4. **El bloom es quien pone gris la sombra, no la física.** Comprobado apagándolo:
   el horizonte sale negro puro. Nunca se toca la geodésica para arreglar el glow.
5. **El rango dinámico del disco hay que comprimirlo ANTES de ACES.** Con un pico
   de ~28 en HDR, media imagen llega al tone mapping ya saturada y la banda
   brillante pierde toda la estructura. Un rodillo de altas luces en el shader
   deja clipar el núcleo y conserva el detalle alrededor.

Falta: medir en hardware real (portátil e Iris Xe + Android de referencia) y
registrar el veredicto aquí. `app/spike/` se borra al cerrar G0.

### G1 — Migración de rutas · *sin nada de 3D* — **COMPLETADA 2026-08-07**

Los 7 mundos pasan de secciones a rutas. Nivel `flat` únicamente.

- Mover la prosa de cada mundo a su página, con metadata/OG propios.
- Home nueva: hero + selector de mundos como enlaces reales, sobre el backdrop
  2D actual.
- Retirar el aparato de scroll narrativo (§10) y reescribir sus tests.
- Actualizar `sitemap.ts`, `structured-data.tsx`, navegación y 404.

**Al terminar G1 el sitio es desplegable y está completo.** Es la red de
seguridad: si en algún momento urge tener el portafolio en línea, se despliega G1
sin esperar a la escena.

#### Qué se construyó

| Pieza | Dónde |
|---|---|
| Contrato de rutas `WorldId ↔ slug` | `lib/worlds.ts` (`getWorldPath`, `getWorldBySlug`, `getWorldNeighbours`, `getWorldNavItems`) |
| Ruta activa → mundo, función pura | `lib/world-route.ts` — **es el embrión de `cameraPose = f(ruta)`**; G2 la reutiliza tal cual |
| Índice: mapa del sistema | `components/system-map.tsx` + `lib/system-map.ts` |
| Página de mundo | `components/world-page.tsx` (sustituye a `world-section.tsx`) |
| Shell sin JavaScript | `components/site-shell.tsx`, `site-header.tsx`, `mission-navigation.tsx` |
| Nivel `flat` persistente | `app/[locale]/layout.tsx` + `components/site-backdrop.tsx` |
| Tarjetas OG por mundo | `lib/world-og.tsx` + 3 `opengraph-image.tsx` |

Decisiones tomadas al ejecutar, todas dentro de lo que §14 dejaba abierto:

1. **Slugs ES fijados** en la propuesta funcional. Único cambio de contenido:
   `tesseract` pasa de `historia` a `sobre-mi`.
2. **La estructura del sistema es polar y vive en `content/worlds.data.ts`**
   (`placement: { angle, radius, size }`), sustituyendo a los parámetros `orbit`
   heredados de v2, que ya no tenían consumidor. El mapa 2D la proyecta a una
   elipse achatada; **G2 puede leer el mismo ángulo y radio como posición real
   en el plano del disco.** La estructura se decidió una vez y sobrevive al
   cambio de capa visual.
3. **Gargantúa es el centro del mapa** (`radius: 0`) y enlaza al laboratorio.
4. **`?no3d=1` pasa a persistirse.** Con 8 rutas reales el parámetro moría en el
   primer enlace; §5 ya pedía que la elección se persistiera. La URL es la
   entrada; el almacenamiento, la memoria.
5. **La navegación de mundos conserva un carril horizontal táctil en móvil.**
   El primer destino queda visible, el resto se alcanza con desplazamiento
   nativo y el foco del teclado sigue actualizando TARGET sin depender del
   antiguo store de scroll.

#### El DOM del mapa es un contrato con G2

El raíl de `SystemMap` contiene siete `<a href>` reales, ordenados 01→07 y con
nombre accesible. Cada cuerpo dispone además de un proxy DOM visual,
`aria-hidden` y no tabulable, separado del rótulo. No hay R3F ni raycasting: la
escena publica `--map-x`, `--map-y` y el radio compuesto `--map-radius`; el proxy
se centra ahí, cubre 110–135 % de la silueta y garantiza 44 px. Así anillos de
Cooper y estructura completa de Endurance responden sin anunciar catorce
destinos. Raíl y proxies consumen el mismo `WorldId`, estado TARGET y
`navigateToWorld(worldId)`. `?debugHitboxes=1` sólo en desarrollo visualiza los
bounds sin modificar su tamaño.

#### Medición del presupuesto de JS (cierra la deuda de §8 y T8)

Medido sobre `next start`, tamaño comprimido en el cable, sin contar prefetch:

| Ruta | Total gz | Propio (total − baseline) |
|---|---|---|
| **Baseline compartido** (8 chunks) | **145,6 KiB** | — |
| `/es` (Sistema Gargantúa) | 149,1 KiB | 3,5 KiB |
| Los 5 mundos de prosa | 149,1 KiB | 3,5 KiB |
| `/es/proyectos` y casos | 153,8 KiB | 8,3 KiB |
| `/es/contacto` | 217,5 KiB | 71,9 KiB |
| `/es/privacidad` | 149,1 KiB | 3,5 KiB |

**La home baja de 231 a 149,1 KiB gz (−35 %).** No es una optimización: es el
peso del aparato de scroll narrativo — `motion`, `zustand`, el controlador y el
formulario de contacto, que vivía en la misma página — que ha desaparecido.
`motion` y `zustand` se retiraron de `package.json` por quedarse sin consumidor.

El presupuesto propuesto de «< 40 KB gz propios por ruta» **se cumple en 11 de
las 12 rutas**. La excepción es `/es/contacto` con 71,9 KiB: formulario con
máquina de estados, validación compartida con Zod y widget de Turnstile. Requiere
decisión del dueño (§14): declarar la excepción para la ruta de conversión, o
bajar la cifra atacando Zod en el cliente.

### G2 — La escena — **CONSTRUIDA 2026-08-07, pendiente de validación visual**

Canvas persistente, cámara fija, nivel `orbit`, selección de planeta → ruta.
Gate de capacidad y botones «Activar experiencia 3D» / «Reducir efectos».

#### Decisión del dueño que reencuadra la home

`/es` deja de ser hero + mapa apilados y pasa a ser **una sola pantalla sin
scroll**: la escena ocupa el viewport y el System Map vive encima. G1 los apiló
porque todavía no había escena.

La revisión artística de 2026-08-29 retira el bloque visible con nombre completo,
roles, propuesta, CTAs y CV. No se reemplaza con otro párrafo ni tarjeta. La marca
visible se limita a `JONAS ORBIT`; identidad profesional, rol, acciones y CV
siguen presentes como HTML semántico y metadata, de acuerdo con la regla 7.

#### Dirección artística vigente del System Map

- **Gargantúa** sigue siendo el foco dominante y la fuente cálida compartida.
- La escala aumenta por jerarquía, no uniformemente: Endurance es segunda ancla;
  Miller, Edmunds y Cooper forman el nivel planetario; Tesseracto y Ranger siguen
  menores pero localizables.
- **Endurance** deja de ser un toro rayado y sigue la referencia cinematográfica
  fijada por la dirección del Hero: doce módulos separados, hub central
  dominante, cuatro brazos de doble larguero, full stack y motores legibles.
- **Cooper Station** deja de ser un cilindro: la representa un planeta anillado
  inventado con un hábitat orbital pequeño y ordenado.
- El HUD usa cuatro niveles: PRIMARY (90–100 %), SECONDARY (60–75 %), TERTIARY
  (35–50 %) y GHOST (15–25 %). `JONAS ORBIT` y el objetivo son PRIMARY; el idle
  conserva calma sin ocultar información útil.
- TARGET no es una tarjeta: nombre grande, regla fina, índice, función y acción.
  Hover, focus y selected activan cuatro brackets pequeños y una trayectoria que
  empieza como arco tenue.
- El raíl inferior es tipográfico, contiene los siete enlaces reales y expresa
  inactivo, hover/focus y selected sin siete botones rectangulares.
- El starfield usa capas far/mid/near batched, reduce densidad junto al disco y
  añade sólo velos casi negros de navy/violeta/polvo cálido.
- Desktop fine-pointer añade retículo mínimo y stardust pooled/batched. Touch no
  monta esa capa; reduced-motion conserva estrellas estáticas y desactiva dust,
  cursor animado, paralaje y respiración hasta que el visitante activa 3D de
  forma explícita.
- El fallback `flat` conserva la composición completa: Gargantúa y seis destinos
  2D estáticos, cada uno con silueta propia, además de los mismos proxies, estados
  TARGET y enlaces del raíl. No es una versión vacía del Hero.
- Cuando reduced-motion provoca `flat`, el botón `ACTIVAR ANIMACIÓN` permanece
  visible en hardware compatible. Es opt-in, persistente y reversible mediante
  `MAPA SIN ANIMACIÓN`; nunca comienza movimiento antes de esa acción.

La especificación completa y su gate de revisión visual viven en
[`../design/hero-gargantua-direction.md`](../design/hero-gargantua-direction.md).

#### Qué se construyó

| Pieza | Dónde |
|---|---|
| Raymarch de geodésicas | `components/scene/gargantua-shaders.ts` (del spike, física intacta) |
| Los 6 cuerpos compuestos + materiales compartidos | `components/scene/bodies.ts` |
| Motor: posiciones fijas, encuadre y proyección | `components/scene/system-scene.ts` |
| Canvas persistente y unión con el DOM | `components/scene/gargantua-system.tsx` |
| Gate de capacidad | `components/scene/capability.ts` |
| `cameraPose = f(ruta)` | `lib/scene-poses.ts` |

#### Las seis decisiones técnicas que definen la escena

1. **Los cuerpos NO van dentro del raymarch.** Serían siete tests de
   intersección por paso, con 190–340 pasos por píxel. Van como geometría real
   compuesta delante, con una cámara en perspectiva que copia a mano la base de
   rayos del shader. Gargantúa lleva la física; los cuerpos, iluminación.
2. **Nada ocluye a los cuerpos.** Un planeta que pasa medio minuto detrás del
   disco es un enlace que desaparece del menú: eso es un fallo de accesibilidad,
   no un detalle de realismo. Se dibujan siempre delante.
3. **El encuadre se calcula, no se tabula.** La escena mide las posiciones fijas
   y el volumen aparente de los cuerpos compuestos, y deduce la distancia mínima
   a la que todos caben en el viewport actual. Cambiar una escala o posición no
   puede sacar un destino de cuadro silenciosamente.
4. **La composición es estable.** Los cuerpos no recorren sus órbitas; sus fases
   son constantes de dirección de arte. Las etiquetas se revelan por estado y
   apuntan hacia fuera, sin un solver de colisión animado ni deriva editorial.
5. **Veto al rasterizador por software.** SwiftShader, llvmpipe y el «basic
   render driver» de Windows caen a `flat`. No es cosmética: sin GPU el raymarch
   no completa un fotograma y el visitante ve un rectángulo negro con el
   ventilador a tope. **No es detección del auditor (regla 5)**: se mira una
   capacidad real, la misma para todo el mundo. Que un CI headless caiga aquí es
   una consecuencia correcta, no el objetivo.
6. **Three imperativo, sin R3F.** El motor crea y libera geometrías/materiales de
   forma explícita. El canvas permanece `aria-hidden` y sin eventos; hit testing,
   labels y navegación viven en el DOM proyectado.

#### Un error que conviene no repetir

El primer intento giraba cada plano orbital por su propia fase para diversificar
las elipses proyectadas. La trigonometría lo castigó: con `node = φ`, la
coordenada x sale `r·(cos²φ + sen²φ·cos i)`, **positiva para cualquier fase**.
Los siete cuerpos arrancaban apiñados al mismo lado del agujero negro. Las siete
trayectorias comparten ahora línea de nodos y la fase fija vuelve a decidir de
verdad dónde está cada cuerpo.

#### Presupuesto medido

| | Antes de G2 | Ahora |
|---|---|---|
| Baseline compartido | 145,6 KiB gz | **147,9 KiB gz** |
| `/es` (carga inicial) | 149,1 KiB gz | **151,4 KiB gz** |
| Chunks de la escena | — | **≈160,6 KiB gz combinados**, aparte y bajo demanda |
| Texturas | — | **0 B transferidos**; 128 KiB RGBA generados en runtime (≈171 KiB con mipmaps GPU) |

El chunk de la escena entra muy por debajo del techo de 350 KB gz de §8. Los dos
mapas de 128×128 para Endurance y Ranger se fabrican de forma determinista en el
cliente: no hay imágenes externas y el presupuesto de red de texturas (1,2 MB)
permanece intacto. Quien recibe el nivel `flat` no descarga ni un byte de
three.js — lo verifica el test G4.

#### Cierre visual de G2

El Hero se validó en navegador con WebGL a 1280×720 y 375×812, además del perfil
flat/reduced-motion. La evidencia cubre primer frame, bounds de los siete
proxies, TARGET/HUD, cursor, polvo estelar y navegación. La enmienda de producto
del 2026-08-31 exige además que el frame `flat` muestre Gargantúa y los seis
destinos 2D, que reduced-motion arranque sin movimiento y que el opt-in 3D sea
visible y reversible. «Reducir efectos» y `?no3d=1` comparten el destino ligero;
el control de activación permite cambiar después de opinión. La matriz automatizada
cubre teclado, fallback, reduced-motion, rutas y ausencia de overflow; la
precisión de los bounds se conserva como prueba visual/manual porque depende de
la proyección real. La comprobación en Android físico queda como QA de dispositivo,
no como trabajo arquitectónico pendiente de G2.

### G3 — Viaje y profundidad

Transición de aproximación, nivel `deep` (§6-bis: más pasos y más DPR sobre el
mismo shader, no capas añadidas), calidad adaptativa y teardown.

Riesgo propio de G3 detectado en G0: durante una transición la cámara SÍ se
mueve, así que la acumulación temporal deja de ser válida fotograma a fotograma.
Se resuelve degradando durante la transición (menos pasos, mezcla más agresiva),
no reproyectando: el movimiento tapa la pérdida de detalle.

**La primitiva ya existe en el spike.** El peso de la mezcla no es constante:
arranca en `1/(n+1)` — la media exacta de lo visto — y decae hasta el 0.18 de
régimen hacia el quinto fotograma. Degradar durante una transición es sostener
ese peso alto mientras dura el movimiento y soltarlo al llegar. G3 hereda el
mecanismo; solo tiene que decidir cuándo. Lo que **no** puede hacer G3 es
reproyectar el historial: eso es TAA de motor de juego y saca el coste del
presupuesto.

### G4 — El otro lado del agujero de gusano · *futuro, requiere aprobación*

Cruce al Sistema Solar. La representación actual de Cooper —planeta anillado
inventado + hábitat orbital— pertenece al System Map y no anticipa este cruce.
G4 podrá reinterpretar la ubicación narrativa de Cooper Station y el Tesseracto,
pero no se planifica en detalle hasta cerrar G3 y obtener aprobación propia.

---

## 10. Qué se retira, qué sobrevive

La regla 3 del repositorio («cero huérfanos», Knip en CI) obliga a **borrar**, no
a dejar aparcado.

### Se retira

| Archivo | Motivo |
|---|---|
| `lib/narrative-progress.ts` (+ test) | Calcula `worldIndex`/`worldProgress` desde el scroll. Sin cámara acoplada al scroll, no tiene consumidor |
| `lib/narrative-store.ts` | Se reemplaza por un store de escena indexado por ruta |
| `lib/narrative-types.ts` | Idem |
| `components/narrative-experience.tsx` (+ test, + módulo CSS) | Es el controlador de scroll, anclas e historial. Desaparece entero |
| `components/world-section.tsx` (+ test) | Se convierte en el layout de una página de mundo |

### Se adapta

`components/site-header.tsx`, `components/mission-navigation.tsx`,
`app/[locale]/page.tsx`, `app/sitemap.ts`, `components/structured-data.tsx`,
`content/worlds.data.ts`, `lib/starfield.ts` y `components/starfield-2d.tsx`.

### Sobrevive intacto

La prosa MDX (`content/es/worlds/`), la composición `getWorld(id, locale)`, el
stack de contacto completo (schema, Route Handler, Turnstile, honeypot, Resend,
rate limit IaC), SEO/OG, CV, proyectos, privacidad, página de gracias,
`effects-mode` y `use-prefers-reduced-motion`.

**El pivote toca el shell de navegación. No toca el producto.**

---

## 11. Dependencias nuevas

Versiones fijadas sin `^`/`~` (regla 2). G2 usa únicamente:

- `three`
- `@types/three` (dev)

No se usan `@react-three/fiber`, Drei ni postprocessing. Añadir una dependencia
visual exige medición, tarea dedicada y consumidor real; Knip mantiene cero
huérfanos.

---

## 12. Delta de la matriz de tests (Appendix A del plan principal)

### Se retiran

`A6`, `A7`, `A8` (progreso de scroll), `A22`, `A23`, `A24` (anclas,
`replaceState`/`pushState` por scroll). El comportamiento que cubrían deja de
existir.

### Se reescriben

| ID | Nuevo escenario | Nivel |
|---|---|---|
| A20 | Hero → caso de estudio ≤ 2 interacciones, **ahora por rutas** | E2E |
| A21 | Hero → contacto ≤ 3 interacciones, **ahora por rutas** | E2E |
| A28 | `prefers-reduced-motion`: arranque `flat` sin transición, Gargantúa + seis destinos 2D y contenido íntegro; opt-in 3D visible/reversible en hardware compatible | E2E |
| A29 | Viaje completo solo-teclado por las 8 rutas | E2E |
| A32 | Viewport 375 px en las 8 rutas | E2E |

### Nuevos

| ID | Escenario | Riesgo cubierto | Fase | Nivel |
|---|---|---|---|---|
| G1 | Cada `WorldId` resuelve a su ruta y viceversa; ruta desconocida → 404 | Mundo inalcanzable o duplicado | G1 | Unit |
| G2 | Las 8 rutas tienen `title`, `description`, canonical y OG propios y distintos | Compartir roto, SEO canibalizado | G1 | E2E |
| G3 | El HTML servido de `/es` contiene nombre, rol, 2 CTAs, CV y 7 enlaces `<a href>` **sin JS**; la identidad profesional no forma un bloque visible del Hero | La escena se convierte en el contenido o reaparece el copy retirado | G1 | E2E |
| G4 | Nivel `flat`: cero three.js en la red | Presupuesto roto para quien no puede pagarlo | G2 | E2E |
| G5 | Los 7 proxies DOM cubren centro y bordes percibidos (incluidos rings/craft bounds) y los 7 enlaces del raíl cubren teclado; hover/focus/selected sincronizan TARGET, brackets y marcador | Hitbox parcial, navegación duplicada o estado incomprensible | G2 | E2E + validación manual con `?debugHitboxes=1` |
| G6 | Seleccionar un cuerpo cambia la ruta; el canvas **no** se remonta | Parpadeo negro, contexto WebGL recreado | G2 | E2E |
| G7 | `cameraPose` es función pura de la ruta: misma ruta → misma pose, sin estado residual | Deriva de cámara, dos controladores | G2 | Unit |
| G8 | Ningún listener de rueda, drag o scroll escribe en la cámara | Regresión al doble controlador | G2 | Unit |
| G9 | La transición se corta con tecla/clic y respeta su timeout duro | Visitante atrapado en una animación | G3 | E2E |
| G10 | Navegación con transición fallida (animación abortada) igual completa la ruta | La animación se vuelve dueña del router | G3 | E2E |
| G11 | Degradación `deep`→`orbit`→`flat` libera contexto WebGL y texturas | Fuga de memoria en móvil | G3 | Unit |
| G12 | `document.hidden` pausa el bucle de render | Batería quemada en segundo plano | G3 | Unit |
| G13 | Toda activación del Hero pasa por `navigateToWorld(worldId)` y conserva el `href` real | El Hero queda acoplado al router y bloquea la futura fase continua | G2 | Unit |

`A33` del plan principal (navegación orbital 3D) queda **absorbido** por G5 + G6
+ G7, con una diferencia importante: ya no dice «la cámara reacciona al scroll»,
porque el scroll ya no toca la cámara.

---

## 13. Riesgos registrados

1. **No hay despliegue hasta que la escena esté lista.** Decisión explícita del
   dueño. El coste es que el portafolio no se usa para buscar empleo mientras
   tanto, teniendo F1A prácticamente terminada. Mitigación disponible y no
   activada: G1 es desplegable por sí sola.
2. **El spike puede fallar.** G0 existe precisamente para descubrirlo barato. El
   plan B (estilizado) está escrito y no bloquea nada más.
3. **El presupuesto de JS necesita una decisión** (§8). Hasta que se tome, el
   gate operativo sigue siendo Lighthouse ≥ 90 en el perfil ligero.
4. **three.js es una superficie grande.** Se mitiga con: import dinámico, nivel
   `flat` sin three.js, presupuesto de chunk propio y Knip en CI.

---

## 14. Decisiones abiertas

- **Presupuesto de JS re-línea-base** (§8): **medido en G1**, ver la tabla del
  cierre de G1 en §9. Queda una sola decisión: `/es/contacto` gasta 71,9 KiB gz
  propios contra los 40 propuestos. *Recomendación: declarar la excepción para la
  única ruta de conversión del sitio y congelar el resto — el formulario es el
  producto, no adorno.* Hereda y sustituye a T8.
- **Slugs ES definitivos** (§2) — ✅ **CERRADA 2026-08-07.** Fijados los
  funcionales: `/es/sobre-mi`, `/es/formacion`, `/es/desarrollo`,
  `/es/proyectos`, `/es/creatividad`, `/es/laboratorio`, `/es/contacto`.
- **Baseline de Next/React congelado en 145,6 KiB gz.** Regla de no-regresión:
  cualquier subida se investiga antes de aceptarse.
- **Dominio y 301** — heredado del plan principal, sin cambios.
