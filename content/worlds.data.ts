/**
 * Datos estructurales de los 6 mundos — EXCLUSIVAMENTE neutrales al idioma.
 *
 * La identidad canónica es WorldId: tipada, inmutable e independiente de las
 * URLs. La prosa localizada vive en content/{locale}/worlds/*.mdx y se une a
 * esta estructura vía getWorld(id, locale) en lib/worlds.ts. Las URLs/anclas
 * pueden cambiar o localizarse sin romper la relación con la escena.
 *
 * Aquí NUNCA va texto visible al usuario (títulos, narrativa, alt, CTAs).
 * Sólo viven identidad técnica y parámetros estructurales de la escena.
 */
/**
 * ── Arquitectura narrativa vigente (2026-09-06) ─────────────────────────────
 *
 * Cada cuerpo representa una dimensión distinta del portafolio, y la
 * asociación es CANÓNICA: sustituye cualquier mapping anterior.
 *
 *   1. Gargantúa  → Sobre mí       2. Miller    → Formación
 *   3. Endurance   → Proyectos      4. Edmunds   → Creatividad
 *   5. Tesseracto  → Experimentos   6. Ranger    → Contacto
 *
 * Gargantúa es el centro visual del sistema, así que es también el centro de
 * IDENTIDAD del portafolio: quién soy, cómo pienso, hacia dónde quiero crecer.
 * Esa coincidencia entre jerarquía visual y jerarquía narrativa es la razón de
 * ser del cambio, y por eso Gargantúa no puede volver a ser «Laboratorio» ni
 * «Proyectos».
 *
 * ── Qué es `order` y qué NO es ──────────────────────────────────────────────
 *
 * `order` es el orden NARRATIVO: el del raíl, el del DOM, el del tabulador, el
 * de los vecinos y el del sitemap. **No tiene ninguna relación con la posición
 * del cuerpo en la escena**, que vive entera en `placement` y en
 * `lib/scene-depth.ts`, y que se indexa por `WorldId`. Reordenar la narrativa
 * no mueve un solo píxel de la composición: se comprobó al aplicar este pase,
 * y `worlds.data.test.ts` lo mantiene separado.
 *
 * El único efecto colateral de `order` fuera de la navegación es el retardo
 * escalonado de entrada de las etiquetas (`--order` en globals.css), que por
 * definición sigue al orden de lectura.
 */
export const WORLD_IDS = [
  "tesseract",
  "miller",
  "endurance",
  "edmunds",
  "gargantua",
  "ranger",
] as const;

export type WorldId = (typeof WORLD_IDS)[number];

type WorldVisual =
  | "tesseract"
  | "water"
  | "ship"
  | "desert"
  | "black-hole"
  | "beacon";

/**
 * Disposición estática de un destino sobre su trayectoria de referencia.
 *
 * Todas las distancias usan radios de Schwarzschild (rs = 1), la misma unidad
 * del shader. `orbitRadius`, `phase` e `inclination` ya no describen un tour:
 * fijan la composición aprobada y permiten construir la guía orbital tenue que
 * responde al target. La cámara conserva el invariante geométrico que evita que
 * una trayectoria proyectada atraviese la sombra de Gargantúa.
 */
interface WorldPlacement {
  /** Radio de la trayectoria en rs. 0 = el centro (solo Gargantúa). */
  orbitRadius: number;
  /** Fase fija de dirección de arte sobre la trayectoria, en grados. */
  phase: number;
  /** Inclinación de su plano de referencia respecto al disco, en grados. */
  inclination: number;
  /** Escala nominal del modelo en rs. */
  size: number;
}

export interface WorldStructuralData {
  /** Orden narrativo del viaje (1-6, único). */
  order: number;
  /** Nombre cósmico propio (idéntico en todos los idiomas). */
  cosmicName: string;
  /** Color de acento principal (hex). */
  accent: string;
  /** Color secundario (hex). */
  secondary: string;
  /** Modelo visual del planeta. */
  visual: WorldVisual;
  /** Sitio del cuerpo en el sistema. */
  placement: WorldPlacement;
  /** Nombre interno de la escena para la capa 3D (G2+). */
  sceneName: string;
}

/**
 * Escala y encuadre del sistema.
 *
 * Gargantúa manda; Endurance es el segundo ancla y los demás destinos conservan
 * una jerarquía clara. Los blancos de interacción no dependen de la geometría:
 * el DOM mantiene áreas accesibles de 44 px. Cambiar radio, fase, inclinación o
 * escala altera cámara, proyección, brackets y colisiones de etiquetas, así que
 * estos valores son decisiones de composición, no telemetría decorativa.
 *
 * ── Recomposición de los seis destinos (2026-09-04) ─────────────────────────
 *
 * Al retirar Cooper Station el cuadrante superior izquierdo se quedó sin nada:
 * medido sobre 1440×860, ningún cuerpo caía en x < 48 % con y < 50 %, y la masa
 * se repartía 34/66 entre izquierda y derecha.
 *
 * El primer arreglo fue mandar a Miller a ese hueco, y dirección lo rechazó con
 * un argumento que conviene dejar escrito porque contradice el diagnóstico:
 *
 *   **Un cuadrante vacío no es un error.** Es lo que hace respirar a una escena
 *   espacial. Lo que sí era un error es que Miller, aislado contra negro en una
 *   esquina, se convertía en lo SEGUNDO que se mira después del agujero negro —
 *   una jerarquía que no le toca— y que junto a Edmunds volvía a formar la
 *   distribución periférica de la que se venía huyendo.
 *
 * Así que Miller no vuelve a donde estaba, pero tampoco se queda en la esquina:
 * entra al tercio superior izquierdo, dentro del campo visual de Gargantúa. El
 * hueco de la esquina se conserva a propósito. Los cambios, entonces:
 *
 * 1. **Miller entra al tercio, no a la esquina** (fase 337 → 242, radio 27 →
 *    26, inclinación 38 → 31). Pasa de 25.6 % / 17.4 % del cuadro a 32.2 % /
 *    30.3 %: sigue arriba y a la izquierda, pero pertenece al sistema en vez de
 *    estar anclado al borde del visor. Los tres grados finales de fase y los
 *    tres de inclinación son de la tercera pasada: a 33.2 / 27.8 quedaba a la
 *    misma altura que el Tesseracto y los dos formaban una línea superior.
 *    Entre él y el brazo izquierdo del disco queda una franja de negro que los
 *    separa; ésa es la distancia que no hay que cerrar.
 * 2. **El Tesseracto se corre a la derecha del eje** (fase 279 → 298). Con
 *    Miller arriba a la izquierda, dejarlo centrado los habría convertido en
 *    dos objetos colgados de la misma banda superior; a 298 abre la diagonal
 *    Miller → Tesseracto → Endurance y sigue sin tocar el disco. Su ORIENTACIÓN
 *    sí cambia mucho, y eso vive en `TESSERACT_BOX_TILT`. El `size` sube de 2.7
 *    a 2.87 —un 6.3 %— porque siendo «Sobre mí» llegaba modesto al lado de la
 *    Endurance; sigue muy por debajo de Gargantúa.
 * 3. **Endurance baja y se abre** (fase 45 → 42, inclinación 12 → 16): separa
 *    su silueta de la cola derecha del disco, que era donde se ensuciaba.
 * 4. **La Ranger sube y se centra** (fase 109 → 97, inclinación 23 → 14): se
 *    despega del borde inferior y del raíl sin dejar de ser el plano cercano.
 *    A 82 % del alto empezaba a leerse como parte del pie de página; a 79.8 %
 *    vuelve a estar dentro de la escena. El tamaño no se toca: 2.0.
 * 5. **Edmunds no se toca.** Ya era el ancla inferior izquierda.
 *
 * Y hay un efecto de segundo orden que importa tanto como las posiciones: el
 * encuadre se mide contra la envolvente de los cuerpos, así que recogerlos
 * ACERCA la cámara. Gargantúa pasa de 42 a 46 px de radio de sombra a 1440 px
 * sin tocar su `size` ni la pose — el sistema llena más cuadro porque ocupa
 * mejor el que tiene, no porque nada haya crecido.
 *
 * El orden de lectura que persigue todo esto: Gargantúa, la Endurance, el
 * Tesseracto, Miller y Edmunds, y por último la Ranger.
 *
 * ── Pase de autoridad de Gargantúa (2026-09-05) ─────────────────────────────
 *
 * El orden de lectura de arriba se cumplía, pero el primer golpe de vista no
 * era «ese monstruo gravitacional» sino «un sistema de objetos». La diferencia
 * es real y no se arregla moviendo nada: los cinco destinos sumaban demasiada
 * área para el cuadro que dejaban.
 *
 * Así que se encogen, y NO todos igual — reducirlos por parejo habría
 * conservado exactamente el problema a otra escala. El reparto va por cuánto
 * compite cada uno con el centro:
 *
 *   · **Endurance −10 %** (5.15 → 4.64). El único que competía de verdad, y no
 *     sólo por tamaño: es blanca, tiene mucha geometría por unidad de silueta y
 *     cae cerca del centro visual. Su silueta también deja de rozar la cola
 *     derecha del disco.
 *   · **Miller −8 %** (3.05 → 2.81) y **Edmunds −8 %** (3.0 → 2.76). Los dos se
 *     leían como protagonistas individuales; a este tamaño pasan a pertenecer al
 *     sistema. Mantienen entre sí la misma relación de dos profundidades.
 *   · **Tesseracto −5.6 %** (2.87 → 2.71). Apenas: su lectura depende de la
 *     silueta y por debajo de esto se vuelve irrelevante. Conserva la ventaja
 *     relativa sobre la Endurance que le dio la recomposición.
 *   · **Ranger −3.5 %** (2.0 → 1.93). Casi nada, y por una razón: ya funcionaba
 *     como acento pequeño. Encogerla más la convierte en una miga.
 *
 * Gargantúa no se toca, y aun así CRECE: el encuadre se mide contra la
 * envolvente de los cuerpos, así que al encogerlos la cámara se acerca. La
 * sombra pasa de 45.9 a 46.7 px de radio a 1440×860. Medido con
 * `tools/composition.mjs`, el radio de cada destino en proporción a esa sombra:
 *
 *   Endurance 3.16 → 2.86 · Tesseracto 1.41 → 1.33 · Edmunds 1.30 → 1.19 ·
 *   Ranger 1.63 → 1.59 · Miller 1.11 → 1.02
 *
 * El criterio de aceptación fue el del dueño: si al mirar se ve primero
 * Gargantúa, luego el sistema entero y por último los objetos, el ajuste
 * acertó; si en su lugar aparece vacío y los cuerpos se leen tímidos, se pasó.
 * Ésa es también la señal de cuándo parar si algún día alguien quiere seguir
 * bajando.
 *
 * ── Pase de respiración (2026-09-05) ────────────────────────────────────────
 *
 * Encoger resolvió la jerarquía y dejó al descubierto un problema distinto:
 * Miller se leía PEGADO a Gargantúa. La medición desmintió la explicación
 * obvia — no era la distancia. Con 234 px de separación estaba igual de lejos
 * que el Tesseracto, que se lee suelto.
 *
 * Lo que decide si dos cosas se leen separadas no es cuánto hay entre ellas,
 * es si ese hueco llega a NEGRO. Recorriendo el segmento que une cada cuerpo
 * con Gargantúa sobre el render de verdad, el punto más oscuro marcaba:
 *
 *   Miller 22.4 · Ranger 17.5 · Tesseracto 6.0 · Edmunds 3.5 · Endurance 1.9
 *
 * Miller era el único que nunca tocaba fondo, porque caía justo encima del arco
 * superior lensado —la parte más brillante del cuadro— y el halo subía a su
 * encuentro. Con la banda oscura en 19 px, el ojo lo agrupaba con el disco.
 *
 * Así que los dos cuerpos de arriba se mueven, y sólo ellos:
 *
 *   · **Miller 26/242/31 → 28/240/37.** Sale de encima del arco. El valle baja
 *     a 11.7, la banda oscura sube de 19 a 30 px y su despeje contra la zona
 *     brillante pasa de 26 a 67 px.
 *   · **Tesseracto 30/298/26 → 32/300/30.** El mismo problema en grado mucho
 *     menor —oscuro y de poca masa—, así que el movimiento también es menor:
 *     despeje de 48 a 93 px. Su radio de órbita sube A LA VEZ que el de Miller
 *     para seguir siendo el cuerpo más exterior, que es parte de su identidad.
 *
 * Dos cosas que este pase NO gasta. La primera, Gargantúa: la cámara se queda
 * clavada en 75.8 rs y la sombra en 46.7 px, porque ninguno de estos dos fija
 * el encuadre —lo fijan los que tocan los bordes del cuadro—. La segunda,
 * tamaño: 47.5 px de Miller y 61.9 → 61.6 del Tesseracto, prácticamente
 * idénticos. Se mueven, no encogen; el pase de autoridad de arriba sigue
 * intacto.
 *
 * Y las guardas de composición que ya estaban decididas se respetan todas:
 * Miller no vuelve a la esquina que dirección rechazó (estaba en 25.6 % / 17.4 %
 * del cuadro; queda en 29.7 % / 25.6 %), sigue cinco puntos por debajo del
 * Tesseracto en vez de formar con él una línea superior, y el vacío de la
 * esquina superior izquierda sigue ahí a propósito.
 *
 * ── Segundo recorte, y por qué es de otra naturaleza (2026-09-05) ───────────
 *
 * El pase de autoridad de arriba resolvía una jerarquía rota: la escena no
 * decía «agujero negro», decía «objetos». Éste no arregla nada roto. El dueño
 * pidió un margen extra, en porcentajes pequeños y distintos por cuerpo, y esa
 * diferencia de propósito importa a la hora de leer los números:
 *
 *   · **Endurance −2 %** (4.64 → 4.547) · **Tesseracto −1.5 %** (2.71 → 2.669)
 *   · **Miller −1 %** (2.81 → 2.782) · **Edmunds −1 %** (2.76 → 2.732)
 *   · **Ranger −0.5 %** (1.93 → 1.92)
 *
 * El reparto conserva el orden del pase de autoridad —quien más competía, más
 * cede— pero a una décima parte de su magnitud. Ninguno de estos recortes es
 * visible por sí solo; lo que se mueve es la suma, que es exactamente lo que
 * pedía el encargo.
 *
 * Y NO es un cambio de composición: sitio, fase, inclinación, cámara, HUD y
 * fallback plano no se tocan. Lo único que se desplaza, y otra vez de rebote,
 * es Gargantúa — pero mucho menos que la vez anterior, y eso hay que leerlo
 * bien: el encuadre se mide contra la envolvente de los cuerpos Y contra el
 * borde del disco, y desde el pase de autoridad quien manda casi siempre es el
 * disco. Medido con `tools/composition.mjs`, la sombra pasa de 45.7 a 45.9 px
 * mientras los cinco destinos ceden entre un 0.3 y un 2.1 % de radio RELATIVO a
 * ella. Ése es el número del encargo; el radio absoluto en píxeles engaña
 * porque la cámara se acerca a la vez.
 *
 * Las cuatro guardas de `bodies.test.ts` siguen con holgura de sobra —la que
 * más aprieta es la ventaja de la Endurance sobre el resto, 2.045 → 2.014
 * contra un suelo de 1.4— porque los cinco encogen a la vez y los cocientes
 * apenas se mueven. Que un recorte de este tamaño no roce ningún test es la
 * comprobación de que es un ajuste fino y no una decisión de composición
 * disfrazada.
 *
 * ── Tercer recorte, y por qué esta vez NO son los cinco (2026-09-06) ────────
 *
 * Los dos anteriores movían a los cinco destinos a la vez para conservar sus
 * relaciones intactas. Éste toca tres y deja fuera a Miller y a Edmunds, y esa
 * asimetría es la decisión, no un descuido:
 *
 *   · **Endurance −3.5 %** (4.547 → 4.388) · **Tesseracto −1.5 %** (2.669 →
 *     2.629) · **Ranger −0.5 %** (1.92 → 1.9104)
 *
 * Los dos planetas se quedan donde están porque son el contrapeso del cuadro
 * —Miller arriba a la izquierda, Edmunds abajo— y encogerlos otra vez con la
 * Endurance cediendo el triple habría movido la composición, no la escala. Lo
 * que este pase reparte es el peso de las tres piezas que quedaban por encima
 * de su sitio: la nave grande, la estructura anómala y el acento pequeño.
 *
 * Radios publicados: Endurance 6.496 → 6.269, Tesseracto 4.723 → 4.652, Ranger
 * 2.577 → 2.564. La guarda que más aprieta vuelve a ser la ventaja aparente de
 * la Endurance, 2.014 → 1.954 contra el suelo de 1.4, y la banda del Tesseracto
 * queda en 4.652 con 0.10 rs por encima de su mínimo — el margen más fino de
 * todo el bloque, y el motivo de que su recorte se quedara en el borde bajo de
 * la horquilla que pidió el dueño en vez de en el alto.
 */
export const worldsData: Record<WorldId, WorldStructuralData> = {
  tesseract: {
    order: 5,
    cosmicName: "Tesseracto",
    accent: "#f2c879",
    secondary: "#73d7ff",
    visual: "tesseract",
    /* Sigue siendo el cuerpo más exterior (32 rs) y el más lejano en el eje de
       vista (capa −6 en `scene-depth.ts`): pequeño para su tamaño real, que es
       lo que lo mantiene anómalo. La fase 300 lo deja a la derecha del eje de
       la sombra y por encima del disco, sin tocarlo.

       30/298/26 → 32/300/30 (2026-09-05, pase de respiración). El mismo
       problema que Miller pero en grado mucho menor —es oscuro y de poca masa,
       así que la cercanía no molestaba igual—, y por eso el movimiento es
       menor: sube de 24.7 % a 20.6 % del alto y su despeje contra la zona
       brillante pasa de 48 a 93 px. Su tamaño aparente no se mueve (61.9 →
       61.6 px) y su órbita sigue siendo la más exterior, que es parte de su
       identidad: el radio sube A LA VEZ que el de Miller justamente para no
       perderla.

       `size` 2.87 → 2.71 en el pase de autoridad: el recorte más leve de los
       cinco cuerpos que se tocan, porque éste se reconoce por silueta y encoge
       mal. Sigue por encima de donde estaba antes de la recomposición (2.7).
       El segundo recorte le quita un 1.5 % más (2.71 → 2.669): su radio
       publicado baja de 4.796 a 4.723 rs y sigue dentro de la banda [4.55,
       5.05] que fija `bodies.test.ts`, con 0.17 rs de margen por abajo. El
       tercero repite exactamente ese 1.5 % (2.669 → 2.629) y el radio queda en
       4.652: cien milésimas de rs por encima del suelo de la banda, que sigue
       siendo el margen más apretado de los tres cuerpos que se tocan.

       CUARTO RECORTE (2026-09-06, §14 decies): 2.629 → 2.5764, el 2 % que el
       tercero dejó a deber. Aquel pase se quedó en el 1.5 de una horquilla de
       1 a 2 SÓLO porque la banda de `bodies.test.ts` no daba para más; el dueño
       pidió el 2 completo, así que la banda baja su suelo de 4.55 a 4.47 y
       conserva el margen que tenía (0.117 → 0.104 rs). El radio de partida es
       4.667 y no el 4.652 de arriba porque entre medias el cuerpo dejó de ser
       un corredor de marcos y pasó a ser el hipercubo de cristal: misma
       envolvente normalizada, otra figura dentro, medio punto porcentual más
       de vértice lejano. Radio publicado: 4.667 → 4.574. */
    placement: { orbitRadius: 32, phase: 300, inclination: 30, size: 2.5764 },
    sceneName: "scene-tesseract",
  },
  miller: {
    order: 2,
    cosmicName: "Miller",
    accent: "#55d9ff",
    secondary: "#5e7dff",
    visual: "water",
    /* El tercio superior izquierdo, no la esquina: 29.7 % / 25.6 % del cuadro,
       dentro del campo de Gargantúa, con el vacío de la esquina intacto por
       encima y cinco puntos por debajo del Tesseracto.

       Los tres números están atados entre sí y no se tocan por separado. La
       altura sale de −r·sen(fase)·sen(inclinación) y la profundidad de
       r·sen(fase)·cos(inclinación), así que acercarlo al centro del cuadro lo
       MANDA HACIA ATRÁS: es geometría, no una elección. Es también el cuerpo
       más lejano después del Tesseracto, y esa distancia es justo lo que le
       quita el peso visual que dirección no le quería dar.

       El radio no baja de 24: por debajo entraría en el disco de acreción
       (`DISK_OUTER`, 23.8 rs) y lo comprueba `worlds.data.test.ts`.

       `size` 3.05 → 2.81 en el pase de autoridad. A su tamaño anterior seguía
       leyéndose como un protagonista individual pese a la distancia; ahora la
       distancia y el tamaño dicen lo mismo. El segundo recorte le quita un 1 %
       más (2.81 → 2.782); sigue siendo el cuerpo de menor tamaño aparente del
       sistema, que es la condición que comprueba la suite.

       ── 26/242/31 → 28/240/37 (2026-09-05, pase de respiración) ────────────

       Era el cuerpo que se leía PEGADO a Gargantúa, y el diagnóstico correcto
       no era la distancia: a 234 px de separación estaba igual de lejos que el
       Tesseracto, que se leía suelto. Lo que fallaba es que caía justo encima
       del arco superior lensado, la parte más brillante del cuadro, y entre los
       dos nunca llegaba a haber negro — el punto más oscuro del segmento que
       los une marcaba 22.4 de luma contra 6.0 del Tesseracto y 1.9 de la
       Endurance. Un cuerpo cuyo «hueco» no llega a negro se agrupa con lo que
       tiene al lado, mida lo que mida.

       Los tres grados de más de inclinación y los dos radios lo sacan de encima
       del arco: el valle cae a 11.7 y la banda oscura pasa de 19 a 30 px. Medido
       sobre el render, no estimado.

       Y no cuesta NADA de Gargantúa —la cámara se queda en 75.8 rs— porque
       Miller no es el cuerpo que fija el encuadre; los que lo fijan son los que
       tocan los bordes del cuadro. Su tamaño aparente tampoco cambia: 47.5 px
       antes y después, porque los 2 rs de órbita extra se compensan con la
       inclinación. Se mueve, no encoge. */
    placement: { orbitRadius: 28, phase: 240, inclination: 37, size: 2.782 },
    sceneName: "scene-miller",
  },
  endurance: {
    order: 3,
    cosmicName: "Endurance",
    accent: "#f0bc72",
    secondary: "#7fe5ff",
    visual: "ship",
    /* La pieza artificial grande, en el hemisferio derecho. Los tres grados y
       los cuatro de inclinación que se le quitaron a la composición anterior no
       la mueven de sitio: la bajan lo justo para que la cola derecha del disco
       pase por detrás y su silueta se recorte limpia contra el fondo.

       `size` 5.15 → 4.64 en el pase de autoridad, el recorte mayor de los cinco
       (−10 %). Era el único cuerpo que competía de verdad con Gargantúa, y por
       más motivos que el tamaño: masa blanca, mucho detalle por unidad de
       silueta y el sitio más cercano al centro visual. Sigue siendo el segundo
       ancla —le saca un 40 % largo al siguiente, y eso lo vigila
       `bodies.test.ts`—, sólo que ahora a distancia del centro.

       El segundo recorte le quita un 2 % más (4.64 → 4.547), el mayor de los
       cinco por el mismo motivo que entonces: es el único que puede competir.
       Su ventaja sobre el resto pasa de 2.045 a 2.014 veces, muy por encima
       del 1.4 que exige la suite.

       Y el tercero un 3.5 % (4.547 → 4.388, radio publicado 6.496 → 6.269).
       Es el recorte grande de esa pasada —los otros dos cuerpos ceden diez
       veces menos— y va aquí por tercera vez consecutiva por la misma razón de
       siempre: la envolvente de esta nave incluye las dos Ranger y las dos
       Lander atracadas, así que cada punto que cede se lo devuelve al centro
       más que ningún otro. Su ventaja aparente baja de 2.014 a 1.954, todavía
       medio cuerpo por encima del 1.4 de la suite. */
    /* 2026-09-21: el dueño pide un 10 % menos de presencia en el inicio.
       El Observatorio encuadra por radio y conserva su ocupación del visor.

       Y el mismo día, viendo ya la arquitectura de doce módulos montada, pide
       otro recorte «de un 5 a un 10 %». Se toma el 8 % (3.9492 → 3.6333). Los
       tres extremos, medidos: al 5 % la ventaja aparente sobre el siguiente
       cuerpo queda en 1.667, al 8 % en 1.6147 y al 10 % en 1.579. El 10 % es
       la primera vez en siete recortes que este cuerpo bajaría de 1.6, y la
       otra guarda —la Ranger por debajo del 65 % de la Endurance— pasa de
       0.619 a 0.633 en la misma pasada. El 8 % mueve la silueta lo suficiente
       para que se note y deja las dos guardas con la holgura de siempre. */
    placement: { orbitRadius: 25, phase: 42, inclination: 16, size: 3.6333 },
    sceneName: "scene-endurance",
  },
  edmunds: {
    order: 4,
    cosmicName: "Edmunds",
    accent: "#ff9b6b",
    secondary: "#f5cf83",
    visual: "desert",
    /* Sin tocar. Es el ancla inferior izquierda y el contrapeso cálido de
       Miller: mismo lado del cuadro, mitad opuesta, más cerca de la cámara
       (capa +2) y por tanto más grande. Dos planetas, dos profundidades.

       Lo único que cambia es `size`, 3.0 → 2.76: el mismo −8 % que Miller, para
       que la relación entre los dos planetas se conserve exacta mientras ambos
       ceden peso al centro. El segundo recorte repite la regla —−1 % en los
       dos, 2.76 → 2.732— justamente para no romperla. */
    placement: { orbitRadius: 25.5, phase: 167, inclination: 56, size: 2.732 },
    sceneName: "scene-edmunds",
  },
  gargantua: {
    order: 1,
    cosmicName: "Gargantúa",
    accent: "#ffb45c",
    secondary: "#d8e6ff",
    visual: "black-hole",
    // El centro del sistema, y por eso el único sin órbita: la home ES este
    // cuerpo. Que el laboratorio viva en el agujero negro no es decoración —
    // los experimentos del propio build son literalmente lo que se ve al llegar.
    // `size` es el radio APARENTE de la sombra, √27/2 ≈ 2.6 rs, que es lo que
    // el raymarch dibuja y por tanto lo que hay que hacer pulsable.
    placement: { orbitRadius: 0, phase: 0, inclination: 0, size: 2.598 },
    sceneName: "scene-gargantua",
  },
  ranger: {
    order: 6,
    cosmicName: "Ranger",
    accent: "#c58cff",
    secondary: "#72ddff",
    visual: "beacon",
    /*
      El detalle de escala humana, y el cuerpo más cercano a la cámara (capa +7)
      — por eso una nave de 2 rs se dibuja más grande que un planeta de 3.

      Vive en el vacío de abajo, por delante del plano del disco. La fase 97 y
      la inclinación 14 la separan del borde inferior y del raíl: a 109/23
      quedaba a un 84 % del alto —con los rótulos de destinos justo debajo, y
      leyéndose como un elemento del pie— y a 99/16 todavía a un 82 %. A 79.8 %
      vuelve a estar dentro de la escena. Por debajo de 14° de inclinación no se
      baja: el margen contra la sombra cae a 3.6 veces su radio y el suelo del
      test está en 3. El
      tamaño bajó de 2.6 a 2.0 porque con seis cuerpos, y sin Cooper llenando el
      cuadro, a 2.6 dejaba de ser un detalle y empezaba a ser un sexto
      protagonista. El pase de autoridad de Gargantúa le quita otro 3.5 % (2.0 →
      1.93) y ni uno más: éste ya era el acento pequeño de la escena, y lo que
      hay por debajo no es «más discreta» sino una miga. El segundo recorte le
      quita medio punto (1.93 → 1.92), el menor de los cinco y por la misma
      razón, y el tercero repite ese medio punto exacto (1.92 → 1.9104, radio
      publicado 2.577 → 2.564): tres pasadas seguidas cediendo el mínimo, que
      es lo que significa que este cuerpo ya está en su suelo. El mapa plano usa
      esta misma fase: las dos vistas cuentan lo mismo.
    */
    placement: { orbitRadius: 24, phase: 97, inclination: 14, size: 1.9104 },
    sceneName: "scene-ranger",
  },
};
