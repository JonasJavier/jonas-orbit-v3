# Diseño: Sistema Gargantúa — la home deja de ser un scroll y pasa a ser un lugar

Generado 2026-08-06 · Decisión del dueño (Jonás) en sesión
Estado: **APROBADO — sustituye la arquitectura de navegación de F1A**
Documento canónico de alcance/fases/contenido: [`jonas-orbit-v3-mission-endurance.md`](jonas-orbit-v3-mission-endurance.md)

Este documento manda sobre el plan principal **solo** en: arquitectura de rutas,
contrato de cámara, capa visual, transiciones y presupuestos de rendimiento. En
todo lo demás (contenido, conversión, seguridad del formulario, SEO, i18n,
criterios de honestidad) el plan principal sigue vigente sin cambios.

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
de gusano de la película está junto a Saturno, y Cooper Station orbita Saturno al
final. Es decir, «cruzar el agujero de gusano hacia nuestro sistema solar» no es
un añadido arbitrario — es el otro extremo real del mismo mapa, y es donde
Cooper Station (formación) y el Tesseracto (historia) pertenecen narrativamente.
Queda registrado como G4; no se construye ahora.

Por eso el nombre interno de la escena es **Sistema Gargantúa**, no «galaxia».

### Las tres consecuencias arquitectónicas

| Antes (F1A construida) | Ahora |
|---|---|
| Una página narrativa por idioma; los 7 mundos son secciones con ancla | 8 rutas reales: la home-escena + 7 páginas de mundo |
| El scroll es la única fuente de verdad de la cámara | **No hay controlador de cámara.** La pose es función pura de la ruta |
| El fondo es una capa decorativa detrás del texto | La escena **es** la home; el texto vive encima de ella |

---

## 2. Arquitectura de rutas

Se conservan las decisiones ya tomadas: identidad canónica `WorldId` (regla 4) y
slugs localizados con significado (tensión T1, ya resuelta a favor del slug ES).

| `WorldId` | Ruta ES | Contenido |
|---|---|---|
| — | `/es` | **Sistema Gargantúa** (escena + capa de texto del hero) |
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
3. **`prefers-reduced-motion` → corte instantáneo.** Sin excepción.
4. **Único input continuo permitido:** un paralaje acotado (≤ 2°) desde el
   puntero o el giroscopio. Es *aditivo* sobre la pose de destino, no la
   modifica, y se desactiva con reduced-motion. Si algún día molesta, se quita
   sin tocar nada más.

### Por qué la cámara fija es la decisión de rendimiento más importante del proyecto

No es una limitación que aceptamos: es la palanca que hace viable el realismo.

Con un punto de vista conocido de antemano se puede **hornear** casi todo:

- El campo de estrellas deja de ser 10.000 sprites animados y pasa a ser **una
  textura de entorno** (equirectangular o cubemap) comprimida. Coste de dibujo:
  un cuadrilátero.
- El anillo de Einstein y el halo lensado de Gargantúa se hornean como textura en
  vez de calcularse por frame.
- Los cuerpos lejanos son *billboards* (impostores), no geometría.
- No hay LOD que gestionar, no hay culling dinámico interesante, no hay
  reproyección de sombras.

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

Un reclutador con la red lenta, un lector de pantalla, un móvil sin WebGL2 y
Googlebot ven **exactamente el mismo contenido**. La escena entra después y se
coloca detrás. Esto no es una concesión de accesibilidad: es lo que hace que un
portafolio 3D siga sirviendo para conseguir trabajo.

Corolario: el candidato a LCP de `/es` sigue siendo el título del hero, nunca el
canvas.

---

## 5. Tres niveles de fidelidad

El gate de capacidad ya especificado en el plan principal elige el nivel; el
visitante siempre puede sobrescribirlo, y su elección se persiste.

| Nivel | Cuándo | Qué monta |
|---|---|---|
| `flat` | reduced-motion · `?no3d=1` · sin WebGL2 · opt-out del usuario · fallo de la escena | **El código actual**: `StaticBackdrop` / `Starfield2D` (canvas 2D). Cero three.js descargado |
| `orbit` | Por defecto en móvil y equipos modestos | Cubemap horneado, cuerpos instanciados/billboard, disco de acreción con shader simple, sin post-procesado, DPR ≤ 1.25 |
| `deep` | Escritorio capaz, señales verdes | Añade lente por capas (§6), bloom acotado, DPR ≤ 1.75 |

`lib/starfield.ts` y `components/starfield-2d.tsx` **sobreviven** como el nivel
`flat`. No se tira código que ya funciona y ya tiene tests.

**Los vetos siguen siendo duros** (regla del plan principal): WebGL2 ausente y
`prefers-reduced-motion` mandan por encima de cualquier heurística. Señales
ausentes (`deviceMemory`, `effectiveType`) cuentan como neutrales.

**Prohibido sigue prohibido:** ninguna rama de este gate puede depender de
detectar un auditor. `?no3d=1` es el mismo mecanismo del botón «Reducir
efectos», visible en la interfaz (regla 5 del repositorio).

---

## 6. Gargantúa: realismo por capas, no raymarching

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
- **`flat` y reduced-motion:** navegación normal, sin transición. Un
  *crossfade* de 120 ms como mucho.

---

## 8. Rendimiento: controles y presupuestos

### Controles activos

- Tope de DPR por nivel (§5).
- **Paso de animación fijo** desacoplado del framerate: las órbitas avanzan por
  tiempo real, no por frame, así que degradar a 30 fps no ralentiza el sistema.
- Pausa total con `document.hidden`.
- Pausa cuando el canvas queda completamente cubierto por contenido (páginas de
  mundo con scroll largo).
- **Calidad adaptativa:** ventana deslizante de tiempo de frame; degrada de
  `deep` a `orbit` antes de perder frames, y de `orbit` a `flat` si colapsa.
- **Teardown real** del canvas al degradar a `flat`: liberar geometrías,
  texturas y el contexto WebGL, no solo dejar de dibujar.

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

### G1 — Migración de rutas · *sin nada de 3D*

Los 7 mundos pasan de secciones a rutas. Nivel `flat` únicamente.

- Mover la prosa de cada mundo a su página, con metadata/OG propios.
- Home nueva: hero + selector de mundos como enlaces reales, sobre el backdrop
  2D actual.
- Retirar el aparato de scroll narrativo (§10) y reescribir sus tests.
- Actualizar `sitemap.ts`, `structured-data.tsx`, navegación y 404.

**Al terminar G1 el sitio es desplegable y está completo.** Es la red de
seguridad: si en algún momento urge tener el portafolio en línea, se despliega G1
sin esperar a la escena.

### G2 — La escena

Canvas persistente, cámara fija, nivel `orbit`, selección de planeta → ruta.
Gate de capacidad y botones «Activar experiencia 3D» / «Reducir efectos».

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

Cruce al Sistema Solar. Es donde Cooper Station (Saturno) y el Tesseracto
pertenecen narrativamente. No se planifica en detalle hasta cerrar G3.

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
`app/[locale]/page.tsx`, `app/sitemap.ts`, `components/structured-data.tsx`.

### Sobrevive intacto

Todo el contenido (`content/`), la composición `getWorld(id, locale)`, el stack
de contacto completo (schema, Route Handler, Turnstile, honeypot, Resend, rate
limit IaC), SEO/OG, CV, proyectos, privacidad, página de gracias, `effects-mode`,
`use-prefers-reduced-motion`, `lib/starfield.ts` y `starfield-2d.tsx`.

**El pivote toca el shell de navegación. No toca el producto.**

---

## 11. Dependencias nuevas

Versiones fijadas sin `^`/`~` (regla 2). Se añaden en G2, no antes:

- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `@types/three` (dev)

`@react-three/postprocessing` solo si G3 lo exige tras medir. Knip debe verlas
usadas o el CI las marca como huérfanas.

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
| A28 | `prefers-reduced-motion`: sin transición, contenido íntegro | E2E |
| A29 | Viaje completo solo-teclado por las 8 rutas | E2E |
| A32 | Viewport 375 px en las 8 rutas | E2E |

### Nuevos

| ID | Escenario | Riesgo cubierto | Fase | Nivel |
|---|---|---|---|---|
| G1 | Cada `WorldId` resuelve a su ruta y viceversa; ruta desconocida → 404 | Mundo inalcanzable o duplicado | G1 | Unit |
| G2 | Las 8 rutas tienen `title`, `description`, canonical y OG propios y distintos | Compartir roto, SEO canibalizado | G1 | E2E |
| G3 | El HTML servido de `/es` contiene nombre, rol, 2 CTAs, CV y 7 enlaces `<a href>` **sin JS** | La escena se convierte en el contenido | G1 | E2E |
| G4 | Nivel `flat`: cero three.js en la red | Presupuesto roto para quien no puede pagarlo | G2 | E2E |
| G5 | Los 7 cuerpos son seleccionables por clic **y** por teclado, con estados hover/focus/selección | Planetas decorativos e inaccesibles | G2 | E2E |
| G6 | Seleccionar un cuerpo cambia la ruta; el canvas **no** se remonta | Parpadeo negro, contexto WebGL recreado | G2 | E2E |
| G7 | `cameraPose` es función pura de la ruta: misma ruta → misma pose, sin estado residual | Deriva de cámara, dos controladores | G2 | Unit |
| G8 | Ningún listener de rueda, drag o scroll escribe en la cámara | Regresión al doble controlador | G2 | Unit |
| G9 | La transición se corta con tecla/clic y respeta su timeout duro | Visitante atrapado en una animación | G3 | E2E |
| G10 | Navegación con transición fallida (animación abortada) igual completa la ruta | La animación se vuelve dueña del router | G3 | E2E |
| G11 | Degradación `deep`→`orbit`→`flat` libera contexto WebGL y texturas | Fuga de memoria en móvil | G3 | Unit |
| G12 | `document.hidden` pausa el bucle de render | Batería quemada en segundo plano | G3 | Unit |

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

- **Presupuesto de JS re-línea-base** (§8): confirmar las cifras propuestas tras
  medirlas en G1. Hereda y sustituye a T8.
- **Slugs ES definitivos** (§2): `/es/sobre-mi`, `/es/formacion`,
  `/es/desarrollo`, `/es/creatividad`, `/es/laboratorio` son propuestas; los
  slugs viven en la prosa localizada y cambiarlos es barato ahora y caro después
  del deploy.
- **Dominio y 301** — heredado del plan principal, sin cambios.
