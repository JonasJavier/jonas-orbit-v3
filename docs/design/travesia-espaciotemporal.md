# Travesía espacio-temporal · la transición de viaje

Petición del dueño, 2026-09-14: construir la transición entre el System Map y
un destino como una **travesía cinematográfica del espacio-tiempo**, no como
un túnel de hiperespacio. Cuatro fases —bloqueo de objetivo, aceleración,
distorsión del espacio-tiempo, cruce— en 2,2–2,8 s; la cámara real se mueve
y un shader de pantalla completa dobla la imagen alrededor del destino
proyectado; la ruta cambia en el pico de la distorsión; cada mundo deja su
huella al final; y con el movimiento apagado se ve una versión de medio
segundo, no los dos y medio. Este documento manda sobre el §7 del pivote
(`docs/plans/sistema-gargantua.md`) en **duración, fases, momento del cambio
de ruta y versión reducida** de la transición de aproximación; el resto del
§7 —nunca en la carga inicial, la ruta se prefetchea, el router manda,
saltable— sigue intacto y aquí se cumple pieza por pieza.

## Qué se ve

| Fase | Cuándo | Qué pasa |
| --- | --- | --- |
| **Bloqueo** | 0–0,4 s | El mapa deja de recibir puntero. El destino sube de luz y emisión, los demás bajan un 38 %. La mirada de la cámara se lleva al centro del cuerpo (ease-out cúbico). El HUD dice *Target locked*; los rótulos ajenos se apagan. |
| **Aceleración** | 0,4–1,35 s | La cámara cae por la recta que la une con el cuerpo, con easing de potencia 2,6 (el 47 % del recorrido en el último cuarto del tiempo). El campo se abre de 35° a 50°. Las estrellas se estiran en estelas radiales. Las trazas orbitales se retiran. El cuerpo llega a ocupar dos tercios del alto del cuadro. |
| **Distorsión** | 1,05–2,05 s | Alrededor del destino proyectado: lente gravitacional de masa puntual con un anillo de Einstein justo fuera del limbo, el centro se comprime (el cuerpo crece hasta el 93 %), la imagen exterior se duplica girada dentro del anillo, arcos de luz rotos por ruido sobre un borde oscurecido, torsión y oleaje del espacio, aberración cromática mínima (0,45 % del cuadro), los laterales se cierran envolviendo la cámara. |
| **Cruce** | 1,85–2,6 s | Compresión luminosa (200 ms) que se recoge hacia el destino; a 2,05 s el router recibe la ruta; cuando la página nueva está en el DOM la luz se retira expandiéndose desde donde estaba el destino (550 ms) y la página emerge por opacidad. |

**Versión reducida** (sin escena viva: movimiento apagado, perfil ligero,
reduced-motion sin activación, sin WebGL2, escena aún cargando): zoom del 6 %
del campo de destinos hacia el objetivo con fundido (320 ms), luz al 86 %
desde 160 ms, ruta a 300 ms, llegada en 220 ms. Medio segundo en total.
Sustituye el «crossfade de 120 ms como mucho» del §7 por decisión del dueño:
así el interruptor único de movimiento tiene sentido también al navegar.

**Huella por destino** (`VOYAGE_FLAVOURS` en `lib/voyage.ts`; cuatro
multiplicadores del mismo shader, no efectos distintos):

| Destino | lente | líquido | retícula | negro | Qué se nota |
| --- | --- | --- | --- | --- | --- |
| Gargantúa | 1 | 0 | 0 | 1 | La cámara se para al borde del disco (1,35 × radio exterior), lente máxima, el cuadro se cierra en negro. |
| Miller | 0,35 | 1 | 0 | 0 | Tonos fríos, el espacio ondula como agua. |
| Endurance | 0,4 | 0 | 0 | 0,1 | Arcos marfil, poca lente. |
| Edmunds | 0,45 | 0,15 | 0 | 0,2 | Ondas con polvo, cierre cálido. |
| Tesseracto | 0,3 | 0 | 1 | 0,15 | Las estelas se cuantizan a 90°: retícula. |
| Ranger | 0,4 | 0,2 | 0 | 0 | Cian y violeta, ondas suaves. |

El acento de cada mundo (`worldsData[id].accent`) tiñe los arcos, la
compresión luminosa y la luz del DOM (`--voyage-tint`).

## Arquitectura

```
clic / Enter en proxy o raíl
        │
        ▼
useWorldNavigation  ──  startVoyage({ id, href, mode, navigate: router.push })
        │                        (lib/world-navigation.ts · lib/voyage-controller.ts)
        │
        ├── <html data-voyage="depart|flash|arrive"
        │         data-voyage-mode="full|short" data-voyage-world
        │         style="--voyage-x --voyage-y --voyage-tint">      → CSS (globals.css)
        │
        ├── readVoyageDeparture()  → GargantuaSystem → SceneHandle.setVoyage({ id, startedAt })
        │        └── system-scene.ts: sampleVoyage(t) cada fotograma
        │              ├── orientCamera: mirada → dolly → FOV
        │              ├── updateBodies: luz/emisión del destino, trazas fuera
        │              └── voyage-pass.ts: ShaderPass después del bloom y la
        │                  guarda de la sombra, antes del OutputPass
        │
        ├── setTimeout(push − flashLead) → data-voyage="flash"
        ├── setTimeout(push)             → navigate(href)          ← el router
        │
        └── VoyageLayer (layout): usePathname cambia → markVoyageArrived()
                  → data-voyage="arrive" → +550 ms → limpio
```

**Un solo número gobierna todo lo que se mueve**: `t`, segundos desde la
activación, muestreado por reloj real en `sampleVoyage(t)` (`lib/voyage.ts`),
que devuelve `lock`, `approach`, `warp` y `flash` en 0–1, monótonos. La escena
y el shader los leen; el controlador usa la misma línea de tiempo con
temporizadores.

## Las reglas del pivote, y cómo se cumplen

- **La animación nunca es dueña del router (§3, G10).** La ruta se pide por
  `setTimeout` en `timeline.push`, no desde un fotograma. Si
  `requestAnimationFrame` no corre —pestaña oculta, GPU saturada, `flat`—
  la navegación se completa igual. `e2e/voyage.spec.ts` lo comprueba con un
  `requestAnimationFrame` anulado.
- **Saltable (§7, G9).** `keydown`, `pointerdown`, `wheel` y `touchstart` en
  captura cortan la travesía: luz y ruta en el acto, `data-voyage-skipped`.
  El clic que la arrancó no se lee a sí mismo: su `pointerdown` ya pasó y con
  teclado el `click` sintético se despacha después del `keydown`.
- **Tope duro de llegada.** Tras pedir la ruta se espera al pathname como
  mucho 1,4 s; después la luz se retira igual. Nunca se atrapa al visitante
  detrás de un fundido.
- **La cámara no tiene controlador (§3).** La travesía es una transición
  guionada SOBRE la pose de la ruta: nadie escribe en `pose`. `setPose`
  termina cualquier travesía, y el paralaje queda congelado mientras dura.
- **El canvas no se remonta (G6).** Todo ocurre en la escena persistente y en
  una capa fija del layout (`components/voyage-layer.tsx`).
- **La escena duerme en los mundos cubiertos.** Miller, Edmunds, la Ranger y
  Sobre mí tapan la escena con su propio lienzo; ahí la segunda mitad del
  viaje no la dibuja el shader sino la luz del DOM, que cubre el cambio de
  página en los dos modos.
- **Acumulación temporal durante el movimiento (G3).** No se reproyecta: el
  peso de la mezcla del raymarch sube de 0,18 a 0,55 mientras dura la
  travesía y vuelve al llegar.
- **Presupuesto.** Un `ShaderPass` deshabilitado en reposo (coste cero), 8
  muestras del desenfoque radial en `orbit` y 12 en `deep`, ningún uniforme
  nuevo en los cuerpos (el bloqueo usa `uLightIntensity`, `uEmission` y
  `uFocus`), ningún draw nuevo.

## Tres cosas que costaron una prueba

1. **El anillo se mide sobre el limbo YA AMPLIADO.** La compresión del centro
   agranda la imagen del cuerpo 1/(1 − 0,28·warp); medido sobre el radio
   proyectado sin ampliar, el anillo de Einstein caía DENTRO del planeta.
2. **Poco refuerzo al destino.** Con +35 % de luz y +80 % de emisión, más los
   arcos a 2,4 y el fantasma a 0,45, Miller salía lavado en blanco. Queda en
   +15 % / +40 %, arcos 1,3 sobre un borde oscurecido, fantasma 0,25 y sólo
   fuera del cuerpo.
3. **Las trazas orbitales se retiran al caer.** Una cinta que pasa a un radio
   de la cámara es un garabato de un píxel cruzando el cuadro entero.

## Verificación

Unitarios: `lib/voyage.test.ts` (duración total 2,2–2,8 s, fases en orden,
curvas monótonas a 1 en su instante, aceleración exponencial, reducida en
menos de medio segundo, seis huellas distintas), `lib/voyage-controller.test.ts`
(pico por temporizador, G9 con tecla y gestos, G10 sin fotogramas, tope de
llegada, cambio de ruta ajeno, sin sustitución de viaje, limpieza),
`components/system-map.test.tsx` (clic → locked → ruta en el pico; Escape
adelanta la ruta), `lib/world-navigation.test.ts` (`voyageModeFor`). E2E
`e2e/voyage.spec.ts` (contrato con el router en modo reducido: estados
`depart → flash → arrive`, sin rastro al llegar, puntero bloqueado, salto con
tecla, `requestAnimationFrame` anulado, clic modificado sin travesía). La
versión completa se verificó a mano en el navegador midiendo la posición
proyectada del destino cada 100 ms: centro a 0,4 s, 47 → 400 px de radio
entre 0,6 y 1,4 s, luz a 1,85 s, ruta a 2,05 s. Su valoración visual queda
abierta.

## Segundo pase — el sonido, el pestillo y el alabeo (2026-09-22)

Petición del dueño: «quiero como algún sonido para la animación en 3D cuando
se le da click a un planeta y se deforma el espacio», más carta blanca para
mejorar la animación si había algo que mejorar. Esta sección manda sobre el
resto del documento en **qué se oye al viajar, quién lo apaga y qué hace la
cámara durante la distorsión**. No toca duración, fases, momento del cambio
de ruta, versión reducida, flavours ni los tres hallazgos de arriba.

### El sonido se SINTETIZA, no se descarga

La petición era «consígueme alguno» y la respuesta es un motor, no un archivo,
por tres razones —y la tercera es la que manda—:

1. **Licencia.** La banda sonora ya arrastra esa deuda por escrito
   (`docs/design/soundtrack.md`: «la aportación del archivo no acredita una
   licencia de publicación»). Un segundo archivo de origen ajeno la duplica en
   un portafolio que se va a enseñar a reclutadores.
2. **Peso.** Cero bytes de transferencia, contra los 7,44 MiB de la música. El
   presupuesto del §7 del plan no se toca.
3. **Son SEIS destinos.** `VOYAGE_FLAVOURS` ya le da a cada mundo cuatro
   números —lente, líquido, retícula, negro— con los que el shader hace que
   Gargantúa se doble distinto a Miller. Un archivo grabado obliga a seis
   archivos, o a un solo sonido para los seis. Una síntesis lee esos mismos
   cuatro números, y entonces **el sonido no acompaña al efecto: sale de sus
   mismos números**, que es la única forma de que los dos digan lo mismo.

`lib/voyage-audio.ts` se parte igual que `voyage.ts`: `voyageSoundFor(id, mode)`
es una función PURA que devuelve la partitura completa —instantes, frecuencias,
envolventes— y el reproductor de abajo se limita a renderizarla con Web Audio.
Así `lib/voyage-audio.test.ts` puede demostrar sin tarjeta de sonido que el
golpe cae con el fogonazo y no con el cambio de ruta, que ninguna capa se pasa
de la unidad y que los seis destinos suenan de verdad distinto.

Cuatro capas, una por fase, y los cuatro sabores repartidos por donde se ven:

| Capa | Cuándo | Qué es | Qué sabor la manda |
| --- | --- | --- | --- |
| **Pestillo** | 0–0,4 s | Dos golpes cortos de triángulo por paso de banda | `retícula` confirma en OCTAVA (intervalo exacto, sin color); el resto, en quinta |
| **Caída** | 0,4–1,35 s | Sub de 32 Hz subiendo, y ruido cuyo filtro se abre de 220 a 2 600 Hz | `lente` sube el destino del sub |
| **Distorsión** | 1,05–2,05 s | Barrido resonante sobre ruido + par de osciladores desafinados | `líquido` → Q 13 y vibrato (Miller); `retícula` → onda cuadrada y par casi sin batido; `negro` → el filtro maestro se cierra; `lente` → **el tono CAE** en vez de subir |
| **Cruce** | 1,85 s | Golpe de ruido, sub de 96→30 Hz y cola de aire | `lente` pega más fuerte y más largo |

Sólo Gargantúa se desploma —una octava y media, que es lo que le da `lens: 1`—
y los otros cinco suben de tono. Es el pozo de gravedad, y es el mismo número
que curva su luz.

### Quién lo apaga: el control de AUDIO, no el de movimiento

Es el principio del interruptor único aplicado al oído: **un solo mando para
todo lo que suena**. `SoundtrackControl` publica su estado en
`voyageAudio.configure()`, y pausar o silenciar deja el sitio entero en
silencio. Medido: con el mando en MUTE, un clic en un destino crea **cero**
`AudioContext` y mide **0,000000** de pico en 237 bloques de audio, y la ruta
cambia igual.

Una distinción que sí importa: «pausa» SIN intención —autoplay bloqueado por
el navegador, pestaña oculta— no cuenta como apagado. Ahí el visitante sigue
queriendo audio, y el primer clic en un destino es justo el gesto que el
navegador estaba esperando. El interruptor de MOVIMIENTO no entra: el sonido
no se mueve. Quien viaja en modo reducido oye la versión corta, de 0,7 s.

### La trampa que costó la entrega: una exponencial que arranca en épsilon

El idiom que se ve en todas partes es hinchar y apagar cada capa con
`exponentialRampToValueAtTime` desde y hasta un épsilon, porque una
exponencial no puede tocar el cero. Es un error, y no se oye como un error:
se oye como que no hay sonido.

Medido en el navegador con un `ScriptProcessor` en el HILO DE AUDIO —rAF no
sirve, ver abajo—, la caída entera, de 0,4 a 1,05 s, justo el tramo en el que
la cámara se desploma, daba **RMS 0,0009: silencio**. La aritmética: una
exponencial de 0,0001 a 0,55 multiplica por 5 500, así que a mitad de
recorrido lleva sólo la raíz de eso, el 1,3 % del objetivo, y **todo el rango
audible se apila en el último quinto del tiempo**. Lo mismo mataba la cola del
cruce a los 250 ms de nacer (RMS 0,0010).

La corrección: el hinchado va **lineal en amplitud**, en dos tramos que imitan
la potencia 2,6 de la aceleración sin desaparecer por el camino; y la caída va
exponencial **hasta −34 dB del pico, no hasta cero**, con un corte lineal
final. Una exponencial que termina en un valor real es una caída natural; una
que persigue el cero se pasa la vida en él.

RMS medido antes → después, en el mismo equipo y con volumen 28 %:

| Tramo | Antes | Después |
| --- | --- | --- |
| Pestillo 0–400 ms | 0,0056 | 0,0100 |
| Caída 400–700 ms | 0,0009 | 0,0061 |
| Caída 700–1 050 ms | (silencio) | 0,0254 |
| Distorsión 1 050–1 500 ms | 0,0663 | 0,0975 |
| Distorsión 1 500–1 850 ms | 0,1123 | 0,1288 |
| Cruce 1 850–2 150 ms | 0,0590 | 0,1131 |
| Cola 2 150–2 500 ms | 0,0010 | 0,0160 |

Ahora es una escalera continua del pestillo al golpe, que es la forma que
tiene la animación. Pico global 0,508 sin recorte, y silencio absoluto a
partir de 2,9 s, cuando el contexto se suspende solo.

Hay además un **limitador** al final de la cadena, y no por gusto: en el cruce
suenan a la vez el golpe (0,62), el sub (hasta 0,92) y la cola (0,26). A
volumen 28 % eso mide 0,295 de pico y no pasa nada, pero el visitante puede
subir el mando al 100 % y entonces la suma teórica se va por encima de 1 —o
sea recorte, que en un golpe grave suena a chasquido roto y no a impacto—.

### Dos mejoras de la animación, y una descartada con números

**El pestillo se ve.** `uLock` sólo bajaba un 10 % la intensidad del entorno y
no había ningún acento en el instante del enganche. Ahora hay un latido de
exposición: `4·u·(1−u)` sobre `uLock` es un pulso exacto —cero al arrancar,
cero al terminar, pico a los 80 ms— que no deja residuo durante el resto del
viaje, y cae con los dos golpes del pestillo del audio. **No es un aro**: un
círculo de interfaz dibujado encima de un cuerpo iluminado de verdad ya se
rechazó una vez (`endurance-navigation-interface` §14) y la razón sigue en pie.

**El cuadro alabea con la distorsión** (`VOYAGE_ROLL`, 3,4°). Entre 1,35 s y el
pico la aceleración ya vale 1 y la cámara se quedaba CLAVADA: siete décimas de
distorsión sin un solo movimiento debajo.

**Lo obvio era cerrar más la distancia de parada, y está descartado con
números.** El anillo de Einstein se dibuja a 1,08 limbos, y el limbo ya llega
al borde del cuadro con la compresión del shader (`mag = 1/(1 − 0,28·warp)`),
así que acercarse más echa el anillo fuera de pantalla y con él toda la lente
—el efecto central del pase original—. El alabeo no tiene ese problema:
**girar el cuadro sobre el eje de la mirada no cambia ni el tamaño aparente
del destino ni el radio del anillo**. Es el único grado de libertad que quedaba
gratis, y además es el correcto: el espacio se dobla y la nave rueda con él.
Como la mirada ya está en el centro del cuerpo cuando el alabeo entra, el
cuadro gira ALREDEDOR del destino.

Un matiz que costó un rato: **la composición NO alabea**. `orientCamera` tiene
dos bases con la misma forma, y la primera es la que COLOCA los cuerpos en el
mundo para que caigan en su sitio compuesto de la pantalla. Si rodara con la
cámara, los cuerpos rodarían con ella, el alabeo se cancelaría a la vista y de
paso cada destino se movería en el mundo a mitad de viaje, con él su proyección
y su blanco de clic. Rueda la cámara; el sistema, no.

### Verificación

Unitarios: `lib/voyage-audio.test.ts` (partitura sobre la línea de tiempo, el
golpe con el fogonazo, ningún cero en una rampa exponencial, ninguna capa por
encima de uno, los seis distintos, el reparto de los cuatro sabores, la
versión reducida sin distorsión ni dos golpes ni cola larga). Los 429
unitarios del repositorio siguen pasando. En navegador, contra el build de
producción y con un `ScriptProcessor` en el hilo de audio: travesía completa a
la Endurance medida en nueve tramos (tabla de arriba), modo reducido en 0,7 s
con el golpe en 160–400 ms y silencio a partir de 700 ms, y el caso MUTE con
cero contextos y pico cero.

**Dos trampas de medición, las dos nuevas.** Primera: **un medidor por
`requestAnimationFrame` no sirve para medir audio**. Con el panel del navegador
oculto rAF deja de dispararse —el mismo fenómeno que ya documentaba el §14
duodecies para las capturas— y el muestreador daba 6 muestras en 4,5 s, o sea
una lectura inventada. El hilo de audio no depende de rAF: un `ScriptProcessor`
da 352 bloques en los mismos 3,8 s. Segunda: **la escena no publica
`data-scene-live` con el panel oculto**, porque ese interruptor se acciona con
la primera PROYECCIÓN; sin él `voyageModeFor` devuelve `short` y se acaba
midiendo la travesía equivocada. Se empuja con pantallazos encadenados.

Su valoración visual y sonora queda abierta.
