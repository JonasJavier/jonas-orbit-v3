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
