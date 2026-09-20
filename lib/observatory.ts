import { worldsData, type WorldId } from "@/content/worlds.data";

/**
 * Los presets de observación del Observatorio, y la matemática que los convierte
 * en posiciones de mundo.
 *
 * > El Observatorio puede cambiar las condiciones de observación, pero no puede
 * > alterar la identidad material del objeto para hacerlo funcionar.
 * > — docs/design/tesseract-experimentos.md §6
 *
 * Este módulo es esa regla escrita como dato. Está aquí —fuera de la escena, sin
 * three.js, sin DOM— por el mismo motivo que `scene-poses.ts`: así se puede
 * DEMOSTRAR con un test unitario que ningún preset toca un parámetro de material
 * y que el ángulo de luz que promete cada uno es el que sale de la geometría.
 *
 * ── Por qué el espécimen NO va en el origen ─────────────────────────────────
 *
 * El acoplamiento que decide todo este módulo no es un uniform, es una línea de
 * shader. No existe dirección de luz configurable: la luz ES el origen del
 * mundo.
 *
 *     vec3 toLight = normalize(-vPositionW);   // bodies.ts, fragment
 *     vec3 toLightW = normalize(-world.xyz);   // bodies.ts, vertex
 *
 * Consecuencia dura y nada obvia: un cuerpo centrado en el origen queda A
 * OSCURAS. Para una esfera en el origen, `toLight = -normal` y `ndl = -1` en
 * todo el disco. `uLightIntensity` no lo arregla — multiplica una clave que no
 * llega.
 *
 * Así que el espécimen se coloca A DISTANCIA del origen, y **la dirección en la
 * que se coloca es el ángulo de luz**. Eso es exactamente lo que el §6 pide sin
 * gastar ni un uniform ni una línea de shader: no se añade una lámpara, se
 * elige dónde sentarse respecto de la única que hay. El espécimen aparece
 * centrado EN PANTALLA porque lo encuadra la cámara, no porque esté en el
 * origen del mundo.
 *
 * La alternativa «limpia» —añadir un uniform de dirección al fragment
 * compartido— es la cara: ese shader lo comparten los cinco cuerpos del System
 * Map y habría que demostrar que el valor por defecto reproduce `-vPositionW`
 * bit a bit. No se hace.
 */

/** Un punto o una dirección en el mundo. Tupla y no `THREE.Vector3` a propósito:
 *  este módulo no conoce three.js y así el test no necesita una escena. */
export type Vec3 = readonly [number, number, number];

/**
 * Los instrumentos de `INSPECCIONAR` que tienen sentido sobre un espécimen.
 *
 * `ESTRUCTURA` (alambre / normales) NO está aquí: sale de la V1 como deuda
 * V1.1 porque es el único que exige construir un sistema entero desde cero.
 */
export type ObservationInstrument =
  | "bloom"
  | "material"
  | "datos"
  /*
    Los tres de Gargantúa. No son instrumentos «de agujero negro» inventados
    para llenar la fila: son uniformes que llevan en el fragmento desde que se
    escribió —`uDoppler`, `uSecondary`, `uSkyLens`— y que hasta este pase valían
    1 y no los tocaba nadie. Apagar cada uno retira una pieza de física concreta
    y comprobable, que es lo más cerca que esta página puede estar de un
    laboratorio de verdad.
  */
  | "doppler"
  | "secundarias"
  | "lente";

export interface ObservationPreset {
  /**
   * Ángulo entre la luz y la mirada, en grados, medido EN EL ESPÉCIMEN.
   *
   * 0° = la luz llega por detrás de la cámara (frontal, plana).
   * 90° = luz lateral: el terminador cruza el centro.
   * 180° = contraluz: el espécimen se recorta contra su propio filo.
   *
   * No es gusto: es qué revela cada material. Ver la tabla de abajo.
   */
  keyAngle: number;
  /**
   * Azimut de la cámara ALREDEDOR DEL EJE DE LUZ, en grados.
   *
   * Se llamaba `keyRoll` y estaba mal en el nombre y en la descripción: no es
   * un roll alrededor del eje de mirada, y no sitúa la luz «a la derecha del
   * cuadro». Medido: con `keyAngle 90` y azimut 0 la luz cae completamente a la
   * IZQUIERDA (componente de pantalla −1.0).
   *
   * Lo que este número controla es por dónde rodea la cámara al eje que une el
   * espécimen con la luz. Dónde acaba la luz EN PANTALLA depende además del
   * `up` de la cámara, así que se calcula aparte: ver `keyScreenDirection`.
   *
   * ⏳ Pendiente de calibración visual.
   */
  keyAzimuth: number;
  /**
   * Ambiente de campo estelar, 0-1. Es AMBIENTE, no un *fill*: no tiene
   * dirección y no puede levantar el terminador.
   *
   * Existe porque la cara noche funciona en el System Map gracias a que el
   * cuadro está lleno —disco, estrellas, cinco vecinos—. Sola contra negro, un
   * cuerpo al 60 % apagado se lee como un objeto roto.
   */
  environment: number;
  /**
   * Filo frío de separación de silueta, 0-1. `0` en casi todos.
   *
   * Excepción declarada: el Tesseracto es cristal casi negro y salió del
   * material común. Si su rim llega a leerse como una luz, está mal calibrado:
   * su único trabajo es que la silueta no se pierda contra el fondo.
   */
  rim: number;
  /** Qué instrumentos se ofrecen. El laboratorio adapta sus instrumentos a la
   *  muestra; no fuerza a los seis a tener los mismos botones. */
  instruments: readonly ObservationInstrument[];
  /**
   * Qué fracción del alto del cuadro ocupa la ESFERA ENVOLVENTE del espécimen.
   *
   * Vive en el preset y no como constante del driver porque **no se hereda**, y
   * eso se supo antes de tener un segundo espécimen: la relación entre la
   * envolvente y lo que se ve es propia de cada figura. Un 4-cubo en alambre
   * toca su esfera en ocho vértices y en ningún otro sitio, así que su silueta
   * ocupa mucho menos que el disco de esa esfera; una nave alargada la toca en
   * las puntas de sus radiadores, que son lo más fino que tiene.
   *
   * Mismo número en dos figuras distintas da dos tamaños en pantalla
   * distintos, y por eso encuadrar «como el Tesseracto» sería exactamente el
   * error que este Observatorio intenta no cometer: tratar al laboratorio como
   * si fuera la página de un objeto.
   *
   * Se calibra sobre captura, midiendo ocupación real. Nunca por fórmula.
   */
  boundsFill: number;
}

/**
 * La tabla del §6, y el motivo de cada ángulo.
 *
 * Gargantúa NO está aquí, y su ausencia es la misma que la de `createBody`, que
 * devuelve `null` para ella: no tiene malla y no recibe ninguna luz añadida. Se
 * observa por VISTAS CURADAS, que son otro contrato (§7) — órbita libre queda
 * descartada en V1 porque el raymarch acumula en el tiempo y esa acumulación
 * sólo vale con la cámara quieta.
 */
/**
 * El orden del CATÁLOGO del laboratorio, que no es el orden narrativo.
 *
 * `worldsData.order` gobierna el raíl de navegación, el DOM, el tabulador y el
 * sitemap, y eso no se toca: es la secuencia con la que se cuenta el sitio. El
 * Observatorio es otra cosa —una vitrina de muestras— y su orden lo fijó Jonás
 * al elegir por dónde crecía. Reordenar aquí no mueve ni un cuerpo ni un enlace
 * de la navegación.
 *
 * Esta lista ya NO reparte montadas y pendientes: desde que entraron Miller y
 * Edmunds las seis están montadas y `OBSERVATORY_SLUGS` tiene seis filas. Lo
 * que conserva es la secuencia en la que se crecía —los dos primeros, las naves
 * y los planetas, y Gargantúa al final por ser el único que se observa con otro
 * contrato (§7)—, que sigue siendo el orden con el que se recorre la vitrina.
 */
export const OBSERVATION_ORDER: readonly WorldId[] = [
  "tesseract",
  "endurance",
  "ranger",
  "miller",
  "edmunds",
  "gargantua",
];

export const OBSERVATION_PRESETS: Record<
  Exclude<WorldId, "gargantua">,
  ObservationPreset
> = {
  /* Contraluz: la jerarquía por profundidad en W —celda cercana gruesa y clara,
     lejana fina y apagada— sólo se separa cuando la luz viene de detrás. Y es
     el único que lleva rim, por lo dicho arriba. */
  tesseract: {
    keyAngle: 145,
    keyAzimuth: 70,
    environment: 0.06,
    rim: 0.12,
    instruments: ["bloom", "material", "datos"],
    /*
      Calibrado sobre 12 000 instantes en `observatory-framing.test.ts` y
      aprobado en el pase visual: media 69.0 % del alto, con mínimo 54.2 y
      máximo 85.6. La banda es ancha porque la reconfiguración 4D encoge y
      estira la silueta, y no se puede estrechar sin sacrificar la presencia
      media de la figura. Congelado.
    */
    boundsFill: 0.91,
  },
  /* Tres cuartos: es donde separan las facetas y las cavidades del aluminio.
     De frente se aplana en una silueta y a 90° se parte en dos mitades. */
  endurance: {
    keyAngle: 55,
    keyAzimuth: 35,
    environment: 0.04,
    rim: 0,
    instruments: ["bloom", "material", "datos"],
    /*
      Mayor que uno, y no es un error: con 0.91 —el número del Tesseracto— la
      Endurance ocupaba el 58.3 % del alto contra el 70-85 % que pide el §5.

      La causa es la que este campo existe para admitir: su esfera envolvente la
      fijan las PUNTAS DE LOS RADIADORES, que son lo más fino que tiene y
      además apuntan fuera del plano de la silueta. Encuadrar por esa esfera es
      encuadrar por algo que casi no se ve. Que el valor pase de uno significa
      exactamente eso — la envolvente se sale del cuadro y la nave no.

      Y basta UNA medida, al revés que con el Tesseracto: la Endurance no
      reconfigura nada. Con el giro genérico apagado, lo único que se mueve en
      su silueta es la corrección de actitud de ±0.4°, así que su ocupación es
      un número y no una banda de treinta puntos. Medido: 76.9 % del alto.
    */
    boundsFill: 1.15,
  },
  /*
    Contraluz alto por babor, y el camino hasta ahí es la muestra entera.

    ── 1. La luz de este laboratorio no es la del System Map ─────────────────

    La actitud de la nave (`RANGER_ATTITUDE`, en `bodies.ts`) no es una
    propiedad suya: es la SOLUCIÓN de «encarar la luz y la cámara a la vez» en
    el sitio que ocupa en el mapa. Aquí el sitio es otro —el espécimen se sienta
    en `(0, 0, -D)` y la lámpara es el origen— así que la misma actitud da otra
    incidencia. Medido sobre la geometría real:

      dorso · luz      mapa  +0.197        laboratorio  -0.088
      estribor · luz                       laboratorio  +0.759
      proa · luz                           laboratorio  -0.645

    O sea: aquí la luz le llega por el costado de estribor y algo por detrás, y
    el DORSO cae justo en el arranque del terminador. El suelo que
    `bodies.test.ts` vigila en el mapa es 0.15 y aquí sale negativo. Ninguna
    elección de cámara lo arregla: la cámara no mueve la luz.

    ── 2. El barrido geométrico eligió mal, y la captura lo dijo ─────────────

    Primer intento, `70 / 35`: sale de proyectar los 2 184 triángulos del modelo
    sobre 36 x 72 direcciones y quedarse con la que maximiza área vista, área
    iluminada e incidencia media a la vez (área 17.7, 53 % iluminada,
    incidencia 0.32, tres cuartos altos por estribor). Sobre el papel es el
    óptimo del compromiso. En la captura es una masa crema sin terminador.

    Y el motivo estaba en el shader desde antes de este pase: la Ranger tiene
    BLOQUE PROPIO (`uKind == 5`) y está escrito para contraluz —«a 153° entre
    luz y cámara ESTE es el término que dibuja el borde de ataque, la cabina y
    las góndolas»—. Su identidad no la lleva el difuso: la llevan la envoltura
    y el filo ámbar, que a clave baja no existen. Maximizar área iluminada era
    optimizar justo el término que en esta nave no cuenta.

    Medido sobre ocho capturas con el azimut clavado en 80, variando sólo la
    clave, contando píxeles del cuadro por encima de dos umbrales:

      clave      ≥200 (meseta)      ≥235 (brillo de verdad)
        60      102 494  (7.9 %)          3 037
        90       61 892  (4.8 %)          4 753
       120       26 738  (2.1 %)          5 380
       135       13 298  (1.0 %)          6 630
       150        4 874  (0.4 %)          1 479

    La meseta se desploma a un octavo mientras el brillo real se DOBLA: la luz
    deja de ser un lavado y se concentra en cantos. Ese es exactamente el
    movimiento que el §9 bis pide para las dos naves —«repartir el valor, no
    bajar la exposición»— y aquí no cuesta ni un uniforme, sólo elegir dónde
    sentarse. Pasados los 145° el cielo del laboratorio empieza a encenderse por
    detrás y le come el contraste a la silueta, así que el techo no lo pone el
    gusto: lo pone el fondo.

    La clave se queda en 135, que es además la vecindad de los 153° del mapa: el
    visitante llega del System Map y encuentra la nave con la luz donde la dejó.

    ── 3. El azimut lo decidió Jonás, y fue la segunda entrega ───────────────

    La primera propuesta fue `135 / 80`: tres cuartos ALTOS —proa 0.55, dorso
    0.74, o sea cuarenta y cuatro grados de elevación— y la rechazó. Tenía
    razón y se ve en la captura: a esa elevación la nave se lee picada y con el
    morro caído, que es exactamente el defecto que la fase 1 corrigió en el
    System Map cuando midió la proa contra la pantalla.

    `110` baja la cámara y pone la nave de perfil-tres cuartos, con la proa a
    la izquierda, la planta abierta y las dos toberas a la derecha. El tope no
    es de gusto: por encima de 115 el ala toca el borde del cuadro en móvil
    —medido sobre la malla, 0.985 del centro contra el 0.98 que exige
    `observatory-frames.test.ts`— y a 110 queda en 0.957.
  */
  ranger: {
    keyAngle: 135,
    keyAzimuth: 110,
    environment: 0.04,
    rim: 0,
    instruments: ["bloom", "material", "datos"],
    /*
      Uno, y es el primero que NO se calibra por presencia sino por recorte.

      La Ranger mide 1.40 de largo por 1.21 de envergadura y 0.28 de alto: es la
      figura más anisótropa del catálogo, y su envolvente la fija el morro —el
      radio publicado, 2.564, sale de la baliza de proa—. Encuadrarla por el
      alto la deja en una franja: con el 0.91 del marcador, 28.1 % del alto y
      49.7 % del ancho.

      Subirlo tiene tope, y el tope está medido. Proyectando la malla sobre los
      dos formatos de la suite, con las cuatro vistas:

        boundsFill 1.15   escritorio 78 % del alto   móvil: el ala se sale (1.08)
        boundsFill 1.00   escritorio 67 % del alto   móvil: cabe todo (0.95)

      Se queda en uno. El §5 pide entre el 70 % y el 85 % del alto y esto da 67,
      tres puntos por debajo — y es la decisión correcta mientras el encuadre
      salga de la ESFERA envolvente: por encima de uno la envolvente se sale del
      cuadro y quien garantiza que la figura no la siga es la suerte, no la
      fórmula. ⏳ Si Jonás pide más presencia, el precio está dicho.

      (Lo que sí se sale en dos vistas de móvil es la PLUMA, y eso es herencia
      deliberada: `modelRadius` la poda porque «una nave no ocupa más espacio
      por encender un motor». El casco nunca toca el borde: 0.95 en el peor
      caso de los ocho.)
    */
    boundsFill: 1.0,
  },
  /*
    Tres cuartos, y el marcador anterior decía 25° por un motivo que el shader
    no sostiene.

    ── Lo que decía este comentario, y por qué era falso ─────────────────────

    «Casi frontal: el camino de luz y la cresta son reflejos, y un reflejo sólo
    vuelve a la cámara cuando la fuente está cerca de su eje. A 90° Miller es un
    planeta azul cualquiera.» Suena a óptica y no lo es. En este material el
    camino no se calcula contra el eje de la cámara: `oceanSheet` y `oceanGlint`
    son gaussianas sobre `alongOff` / `acrossOff`, que miden la separación
    respecto de la DIRECCIÓN ESPECULAR — y ésa existe para cualquier ángulo de
    clave. Encima el destello se pondera con `mix(0.86, 1.34, waterFresnel)`, o
    sea que un espejo devuelve MÁS cuanto más rasante se le mira, no menos.

    Medido sobre cinco capturas con el azimut clavado en 20, restando los 25 px
    que el instrumento cuenta SIEMPRE, también donde no hay nada encendido: son
    el indicador del servidor de desarrollo (`NEXTJS-PORTAL`, comprobado con
    `elementFromPoint`), no un píxel del espécimen:

      clave   blanco real (≥250)   meseta (≥200)   luz total
        25             0 px           18 537        44.0 Mlum
        45           172 px           22 573        39.5 Mlum
        55           120 px           21 786        35.4 Mlum
        75           314 px           19 208        25.1 Mlum
        90           259 px           15 174        18.1 Mlum

    A 25° el camino de luz NO LLEGA A BLANCO ni en un píxel: la lámina se
    extiende en meseta por medio disco en vez de concentrarse en un trazo. Es
    exactamente el mismo movimiento que el §9 bis pidió para las naves —repartir
    el valor, no bajar la exposición— leído al revés: aquí el defecto era el
    lavado, no la penumbra. Y sin terminador el cuerpo no tiene volumen; con la
    luz a 25° del ojo, Miller es una calcomanía azul.

    55 es donde coinciden las tres cosas: meseta casi máxima, blanco de verdad
    en el trazo, y un terminador que devuelve el volumen y saca las bandas
    latitudinales, que son lo que impide que la lámina se lea como gas.

    Los 25° no se tiran: bajan a la vista `BONANZA`, que es donde ese lavado
    dice algo —la extensión del campo de destellos— en vez de ser el estado por
    defecto.

    Sin `material`: verificado en el shader, `emissive` sólo se escribe dentro
    de la rama `uKind == 8`, así que apagar la emisión no cambiaría UN SOLO
    píxel de Miller. Un botón que no hace nada es peor que un botón ausente.
  */
  miller: {
    keyAngle: 55,
    keyAzimuth: 20,
    environment: 0.04,
    rim: 0,
    instruments: ["bloom", "datos"],
    /*
      Y aquí `boundsFill` deja de ser una calibración y pasa a ser una lectura.

      En las tres muestras anteriores este número no decía cuánto se ve: un
      4-cubo toca su esfera envolvente en ocho vértices, la Endurance en las
      puntas de sus radiadores y la Ranger en la baliza del morro, así que hubo
      que medirlo sobre captura y salieron 0.91, 1.15 y 1.00 para tres figuras
      que ocupan cosas muy distintas. **Una esfera es su propia envolvente**, y
      con eso la fórmula del encuadre se vuelve exacta: la fracción del alto es
      `tan(asin(boundsFill · sin(fov/2))) / tan(fov/2)`.

      Comprobado y no deducido, que es la regla de este campo. Con 0.91 la
      aritmética promete el 90.0 % del alto y la captura da 89.6; con 0.78
      promete el 76.0 y la captura da **75.4**. El medio punto que falta es la
      teselación —el poliedro va inscrito en la esfera que `modelRadius` mide—
      y es la única diferencia que queda entre las dos.

      0.78 y no 0.91 porque 0.91 es el 90 % del alto: el cuerpo llegaba a tres
      dedos del borde y el §5 pide entre el 70 % y el 85 %. Con 0.78 los dos
      planetas caen en mitad de banda, y son los dos primeros especímenes que
      la cumplen sin discusión.
    */
    boundsFill: 0.78,
  },
  /*
    Tres cuartos también, y por el motivo contrario al de Miller: aquí la luz
    rasante no lavaba el cuerpo, lo APAGABA.

    El marcador decía 82° —«Edmunds se define por PENDIENTE y no por altura,
    así que la luz casi tangente es el instrumento correcto para ese campo»— y
    esa frase sigue siendo verdad. Lo que no se había medido es el precio.
    Cinco capturas con el azimut clavado en 10, midiendo cuánto del cuerpo
    lleva luz encima:

      clave   ancho iluminado   alto ocupado   luz total
        30        605 px          74.4 %        31.3 Mlum
        55        466 px          72.6 %        20.1 Mlum
        65        395 px          70.0 %        15.6 Mlum
        82        267 px          65.2 %         9.0 Mlum
       110          0 px           0.9 %         2.4 Mlum

    El disco mide 678 px, así que a 82° sólo el 39 % de su ancho recibe algo, y
    la ocupación medida —que se mide sobre LUZ, no sobre geometría— cae al
    65.2 %, o sea por debajo del suelo del 70 % que pide el §5. El encuadre no
    tiene la culpa: el cuerpo cabe entero y se ve la mitad. A 55° el 69 % del
    ancho lleva luz, la sombra larga de la cordillera sigue ahí y el campo de
    provincias se lee entero.

    Los 82° tampoco se tiran: bajan a la vista `RASANTE`, que es su sitio. Una
    vista curada es para el extremo que revela una propiedad bajo demanda; un
    preset es lo que ve quien entra.

    Y una cifra que dice qué material es esto: en todo el barrido, de 30° a
    150°, Edmunds **no llega a blanco en un solo píxel**. El instrumento cuenta
    25 px por encima de 250 en las cinco capturas, y son los mismos 25 px del
    indicador de desarrollo. La roca no tiene especular; no es que falte exposición.

    Sin `material`, por lo mismo que Miller.
  */
  edmunds: {
    keyAngle: 55,
    keyAzimuth: 10,
    environment: 0.04,
    rim: 0,
    instruments: ["bloom", "datos"],
    /* El mismo 0.78, y por la misma razón: ver la nota de Miller. Medido
       aquí da 72.6 % del alto en vez de 75.4 porque la medida se hace sobre
       píxeles encendidos y a 55° la roca deja un gajo en penumbra. */
    boundsFill: 0.78,
  },
};

/*
  ── LO QUE ESTE PASE APRENDIÓ DE LOS DOS PLANETAS ──────────────────────────

  **Ningún cuerpo de `uKind == 0` o `uKind == 1` admite contraluz**, y no es
  cuestión de grados: es que todos sus términos de canto están cerrados por
  `ndl`. El filo de aire de Miller va por `airLit = smoothstep(0.20, 0.90, ndl)`
  y el arco de Edmunds por `smoothstep(0.26, 0.94, ndl)`, así que lo que
  enciende su limbo es MIRAR A LA LUZ, no tenerla detrás. En un punto del limbo
  el producto `n·l` no pasa de `sin(clave)`, o sea que el término muere solo
  según la clave se acerca a 180.

  Verificado en captura, que es como se vio: a 160° Miller deja 94 px por
  encima de 200 y a 150° Edmunds deja 93 —contra los veinte mil de sus poses
  de trabajo— y lo que ocupa el cuadro en las dos capturas no es el espécimen,
  es el cielo del laboratorio encendiéndose por detrás.

  O sea que la vista `SILUETA` que tienen el Tesseracto y la Endurance NO es
  trasladable aquí, y el motivo es material y no de gusto: el Tesseracto tiene
  `rim` propio y las dos naves tienen envoltura y filo ámbar escritos para
  contraluz. Un planeta a contraluz en este laboratorio es un agujero.
*/

/**
 * A cuántos radios del cuerpo se pone el origen del mundo.
 *
 * Gobierna cuán PARALELA llega la luz al espécimen. Tiene que parecerse a lo
 * que hace el System Map o el material se comporta de otra manera: allí la
 * razón `orbitRadius / radio del cuerpo` va de ~6 (Endurance, 25 rs) a ~13
 * (Tesseracto, 32 rs), y diez queda dentro de esa banda.
 *
 * Y tiene un suelo duro: debe superar la distancia de encuadre, o con
 * `keyAngle` pequeño la cámara cruzaría el origen y se metería entre la luz y
 * el espécimen. A 40° de campo el encuadre ronda 2.9 radios, así que diez
 * sobra con holgura.
 *
 * ⏳ **No es una decisión visual, es una inicialización.** «Está dentro del
 * rango» no implica «el material se verá igual»: la Endurance vive cerca de 6
 * radios y es una estructura grande, así que la divergencia de la luz a 10
 * radios puede leerse distinta. Antes de congelar este número hay que comparar
 * el System Map original contra el Observatorio a 6, 10 y 13 radios sobre al
 * menos dos cuerpos, y juzgar cuál conserva el carácter.
 */
/**
 * QUÉ INSTRUMENTOS OFRECE CADA MUESTRA. Los seis, incluida la que no tiene malla.
 *
 * Existe porque hasta este pase la respuesta vivía en `OBSERVATION_PRESETS`, que
 * por contrato **excluye a Gargantúa**: la ruta leía `preset.instruments` para
 * pintar el banco en frío y con la sexta muestra montada eso deja de compilar.
 * La salida no era darle un preset —eso sería darle una luz añadida, que el §6
 * prohíbe— sino separar dos preguntas que estaban juntas: «cómo se ilumina esta
 * muestra» y «qué se puede hacer con ella».
 *
 * Es la regla del §5 escrita como función: *el laboratorio adapta sus
 * instrumentos a la muestra; no fuerza a los seis a tener los mismos botones.*
 */
export const GARGANTUA_INSTRUMENTS: readonly ObservationInstrument[] = [
  /*
    `bloom` primero, y no por orden alfabético: en Gargantúa es el instrumento
    con algo que contar. El §14 undecies del documento del hero fija que el halo
    no puede encender lo que estaba apagado, y la vista `SOMBRA` es donde eso se
    ve — apagarlo y encenderlo enseña la guarda trabajando.
  */
  "bloom",
  "doppler",
  "secundarias",
  "lente",
  "datos",
];

/**
 * Los instrumentos de una muestra.
 *
 * `material` no aparece para Gargantúa y no es un olvido: `uEmission` vive en el
 * material común de los cuerpos y aquí no hay cuerpo. Un botón que no cambia un
 * píxel es peor que un botón ausente — el mismo argumento que ya dejó a Miller y
 * a Edmunds sin él.
 */
export function instrumentsFor(id: WorldId): readonly ObservationInstrument[] {
  return id === "gargantua"
    ? GARGANTUA_INSTRUMENTS
    : OBSERVATION_PRESETS[id as Exclude<WorldId, "gargantua">].instruments;
}

/**
 * Si esta muestra admite el instrumento `LUZ`.
 *
 * **Gargantúa no, y es el único.** Ese mando gira el espécimen alrededor del
 * origen para barrer su iluminación, y aquí el espécimen ES la fuente: el
 * origen del mundo es el agujero, y lo que ilumina la escena es su propio
 * disco. Ofrecer el dial sería ofrecer mover una lámpara que no existe.
 *
 * Vive aquí, junto a los presets, porque es la misma frontera: quien no tiene
 * preset de luz no tiene luz que mover.
 */
export function hasLightInstrument(id: WorldId): boolean {
  return id !== "gargantua";
}

/**
 * Si esta muestra admite el instrumento `EJE`: girar la FIGURA sobre su eje.
 *
 * ── Qué gesto es éste, y por qué faltaba ────────────────────────────────────
 *
 * El laboratorio tenía dos maneras de cambiar lo que se ve y las dos cambian
 * algo más por el camino:
 *
 *   · **Orbitar** mueve la cámara. Como la luz ES el origen del mundo, rodear
 *     el espécimen cambia también de dónde le llega la clave: se ve otra cara,
 *     sí, pero iluminada de otra manera.
 *   · **`LUZ`** gira el espécimen alrededor del origen con la cámara enganchada:
 *     misma cara, otra luz.
 *
 * Faltaba el tercero, que es el que pidió Jonás: **otra cara, la MISMA luz**.
 * Eso no lo puede dar ninguno de los dos, porque los dos mueven la relación
 * entre el cuerpo y la lámpara. Sólo lo da girar la figura sobre su propio eje,
 * que es la única rotación de este laboratorio que no toca ni el encuadre ni la
 * geometría de luz: el cuerpo sigue en el mismo sitio del mundo, así que
 * `lightGeometry` devuelve exactamente los mismos dos números antes y después.
 *
 * ── Las dos ausencias, que son de distinta clase ────────────────────────────
 *
 * **Gargantúa** no tiene malla. `createBody` devuelve `null` para ella y no hay
 * raíz que girar; es la misma frontera que la deja fuera de los presets.
 *
 * **El Tesseracto** sí tiene malla y aun así se queda fuera, y su motivo está
 * escrito desde antes de que este mando existiera: su `SPIN_RATE` vale cero
 * porque «un objeto que gira sobre su eje afirma que tiene un eje, un dentro y
 * un fuera estables — que es exactamente la lectura que su diseño intenta
 * negar». Y su orientación de reposo no es una pose entre otras: es TODA su
 * lectura —el eje de la recursión casi enfilado a la cámara, los tres marcos
 * uno dentro de otro—, así que un dial que la deshaga no ofrece otra cara, le
 * quita la suya.
 *
 * La Ranger también vale cero en esa tabla y aquí SÍ entra, y esa asimetría es
 * la decisión de este pase. Los dos ceros de `SPIN_RATE` no dicen lo mismo: el
 * del Tesseracto niega que haya eje, y el de la Ranger dice que una lanzadera
 * dando vueltas sola es «un modelo colgado de un hilo». Lo primero sobrevive a
 * una mano en el dial; lo segundo no, porque una vuelta PEDIDA no es una vuelta
 * que se dé sola.
 */
export function hasTurnInstrument(id: WorldId): boolean {
  return id !== "gargantua" && id !== "tesseract";
}

export const ORIGIN_DISTANCE_RADII = 10;

/**
 * Qué está verificado y qué no, dicho en el código y no sólo en un documento.
 *
 * **CONTRATO VERIFICADO ✅** — los tests demuestran que si un preset dice 55°,
 * la geometría produce exactamente 55°; que ningún preset puede escribir un
 * parámetro de material; que la luz llega tan paralela como en el mapa; y que
 * la base de cámara nunca degenera.
 *
 * **CALIBRACIÓN VISUAL ⏳** — los tests NO dicen que 55° sea el ángulo correcto
 * para la Endurance. Estos valores son puntos de partida técnicamente válidos,
 * no dirección de arte aprobada. Cuando se monte el primer espécimen puede
 * resultar que 55 deba ser 47, o que Miller funcione mejor a 18. Eso no sería
 * un fallo de la arquitectura: sería el pase visual haciendo su trabajo.
 *
 * Esta lista se vacía a medida que Jonás aprueba cada palanca sobre una
 * captura. Mientras tenga entradas, nadie puede dar los valores por buenos
 * porque la suite esté verde.
 */
export const PENDING_VISUAL_CALIBRATION = [
  "keyAngle",
  "keyAzimuth",
  "environment",
  "rim",
  "ORIGIN_DISTANCE_RADII",
] as const;

/**
 * La intensidad de clave del espécimen, con la MISMA ley que el System Map.
 *
 * Se copia a propósito en vez de elegir un valor bonito para el visor: es parte
 * de la identidad del cuerpo —«a qué distancia del disco vive»— y cambiarla
 * sería alterar cómo se ve el material, que es justo lo que el §6 prohíbe.
 */
export function observationLightIntensity(orbitRadius: number): number {
  return Math.min(1.66, Math.max(1.08, (25 / Math.max(orbitRadius, 1)) * 1.36));
}

export interface ObservationPlacement {
  /** Dónde va el espécimen en el mundo. Nunca el origen. */
  body: Vec3;
  /** Dónde va la cámara. Mira al espécimen. */
  camera: Vec3;
  /**
   * Vertical de la cámara. Con `body` y `camera` completa el encuadre.
   *
   * Sin esto el contrato estaba a medias: `keyAzimuth` decide por dónde rodea
   * la cámara, pero dónde acaba la luz EN PANTALLA no queda determinado hasta
   * que se fija el `up`. Aquí se deriva del eje +Y del mundo, con salvaguarda
   * cuando la mirada se alinea con él (ver `observationPlacement`).
   */
  up: Vec3;
  /** Qué escribir en `uLightIntensity`. */
  lightIntensity: number;
  /** El preset del que sale todo esto. */
  preset: ObservationPreset;
}

const DEG = Math.PI / 180;
const WORLD_UP: Vec3 = [0, 1, 0];
/** Eje de reserva cuando la mirada se alinea con `WORLD_UP` y el producto
 *  vectorial colapsa. No es hipotético: `keyAngle 90` con `keyAzimuth 90` lo
 *  produce exacto, y la Ranger ya está en `keyAngle 90`. */
const FALLBACK_UP: Vec3 = [0, 0, 1];
const DEGENERATE = 1e-4;

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalise(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}

/**
 * La base de cámara a partir de la mirada: derecha y vertical.
 *
 * El `up` es el eje +Y del mundo con la componente paralela a la mirada
 * retirada. Cuando la mirada se alinea con +Y ese vector se anula, y **no es un
 * caso de laboratorio**: `keyAngle 90` con `keyAzimuth 90` lo produce exacto, y
 * la Ranger ya está en `keyAngle 90`. Ahí se cambia a un eje de reserva antes
 * de dividir por cero.
 *
 * Vive fuera de `observationPlacement` para poder alcanzar esa rama desde un
 * test: por la ruta normal ningún preset la toca hoy, y una salvaguarda que no
 * se puede ejercitar es una salvaguarda que nadie sabe si funciona.
 */
export function cameraBasis(forward: Vec3): { right: Vec3; up: Vec3 } {
  const look = normalise(forward);
  const reference =
    Math.abs(dot(look, WORLD_UP)) > 1 - DEGENERATE ? FALLBACK_UP : WORLD_UP;
  const right = normalise(cross(look, reference));
  return { right, up: cross(right, look) };
}

/**
 * Convierte un preset en posiciones de mundo.
 *
 * La construcción, que es toda la idea del módulo:
 *
 * 1. El espécimen va en `B = (0, 0, -D)`, así que la luz le llega desde
 *    `L = normalize(-B) = (0, 0, 1)`.
 * 2. La cámara se coloca en la dirección `V` que forma `keyAngle` con `L`,
 *    girada `keyAzimuth` alrededor del eje de luz.
 * 3. `C = B + V · encuadre`, y el `up` sale del eje +Y del mundo proyectado
 *    perpendicular a la mirada, con eje de reserva si degenera.
 *
 * Por construcción, el ángulo entre «hacia la luz» y «hacia la cámara» medido
 * en el espécimen es EXACTAMENTE `keyAngle`. Eso es lo que hace que la columna
 * `KEY` de la tabla sea un dato y no una descripción literaria — y lo que el
 * test comprueba.
 *
 * @param radius     radio del modelo ya construido (`SceneBody.radius`).
 * @param framing    distancia de encuadre, que decide la página según su campo
 *                   de visión y su viewport.
 * @param override   otra geometría de luz para el MISMO espécimen. Es lo que
 *                   usan las vistas curadas de `observation-views.ts`, y entra
 *                   por aquí en vez de por una segunda función para que exista
 *                   una sola implementación de esta construcción: una vista es
 *                   el mismo cálculo con otros dos ángulos, no otro cálculo.
 *                   El espécimen no se mueve, el material no se toca y la luz
 *                   sigue siendo el origen del mundo.
 */
export function observationPlacement(
  id: Exclude<WorldId, "gargantua">,
  radius: number,
  framing: number,
  override?: { keyAngle?: number; keyAzimuth?: number },
): ObservationPlacement {
  const preset = OBSERVATION_PRESETS[id];
  const originDistance = radius * ORIGIN_DISTANCE_RADII;

  const body: Vec3 = [0, 0, -originDistance];

  const a = (override?.keyAngle ?? preset.keyAngle) * DEG;
  const r = (override?.keyAzimuth ?? preset.keyAzimuth) * DEG;
  const view: Vec3 = [
    Math.sin(a) * Math.cos(r),
    Math.sin(a) * Math.sin(r),
    Math.cos(a),
  ];

  const camera: Vec3 = [
    body[0] + view[0] * framing,
    body[1] + view[1] * framing,
    body[2] + view[2] * framing,
  ];

  // La mirada va de la cámara al espécimen, o sea `-view`.
  const { up } = cameraBasis([-view[0], -view[1], -view[2]]);

  return {
    body,
    camera,
    up,
    lightIntensity: observationLightIntensity(
      worldsData[id].placement.orbitRadius,
    ),
    preset,
  };
}

/**
 * Dónde cae la luz EN PANTALLA, como componentes derecha / arriba en `[-1, 1]`.
 *
 * Existe porque `keyAzimuth` no responde la pregunta que un humano quiere hacer
 * —«quiero la luz arriba a la derecha»— y fingir que sí la respondía fue el
 * error de la primera versión. Aquí la relación queda a la vista y medible: si
 * al calibrar se pide una posición de pantalla concreta, se ajusta `keyAzimuth`
 * hasta que estos dos números digan lo que se busca.
 *
 * `right: -1` es luz completamente a la izquierda; `up: +1`, completamente
 * arriba. Los dos a la vez cerca de cero significa que la luz está casi en el
 * eje de cámara, de frente o de espaldas según `keyAngle`.
 */
export function keyScreenDirection(placement: ObservationPlacement): {
  right: number;
  up: number;
} {
  const { body, camera, up } = placement;
  const forward = normalise([
    body[0] - camera[0],
    body[1] - camera[1],
    body[2] - camera[2],
  ]);
  const toLight = normalise([-body[0], -body[1], -body[2]]);
  return {
    right: dot(toLight, normalise(cross(forward, up))),
    up: dot(toLight, up),
  };
}

/**
 * ── MOVER LA LUZ SIN MOVER LA OBSERVACIÓN ───────────────────────────────────
 *
 * Todo lo de arriba coloca la CÁMARA. Esto coloca la LUZ, y son dos
 * instrumentos distintos aunque los dos acaben cambiando el mismo número.
 *
 * La luz es el origen del mundo, así que no hay una lámpara que arrastrar: lo
 * que se mueve es el espécimen ALREDEDOR del origen, con la cámara enganchada a
 * él. Y ésa es exactamente la diferencia entre los dos gestos:
 *
 *   · **Orbitar** mueve la cámara y deja el espécimen quieto → cambia qué CARA
 *     se ve, y de paso cambia el ángulo de clave.
 *   · **Mover la luz** gira el espécimen alrededor del origen con la cámara
 *     rígidamente unida a él → la cara que se ve es la MISMA y lo único que
 *     cambia es de dónde le llega la luz.
 *
 * El segundo es el que convierte el visor en un instrumento: permite sostener
 * la pose y barrer la iluminación, que es la variable que el §6 dice que el
 * Observatorio sí puede tocar. La identidad material no se roza — ni un
 * uniform, ni una rama de shader.
 *
 * Y conserva el carácter de la luz por construcción: el espécimen se queda
 * SIEMPRE a la misma distancia del origen, así que la divergencia del haz —lo
 * paralela que llega— es idéntica antes y después. Lo único que cambia es la
 * dirección.
 */
export interface LightGeometry {
  /**
   * Ángulo entre la luz y la mirada, medido en el espécimen. 0-180°.
   *
   * Es el mismo `keyAngle` del preset y la misma `key` de la telemetría: una
   * sola magnitud con un solo nombre. 0° es luz frontal plana, 180° contraluz.
   */
  key: number;
  /**
   * Dónde cae la luz en el RELOJ DE LA PANTALLA, -180 a 180°.
   *
   * 0° es luz por la derecha del cuadro, +90° por arriba, ±180° por la
   * izquierda. Se mide en pantalla y no en el mundo a propósito: `keyAzimuth`
   * es el parámetro correcto para declarar un preset y el incorrecto para
   * MANIPULAR, porque nadie puede predecir dónde acabará la luz sin resolver
   * antes el `up` de la cámara. Aquí la pregunta que se contesta es la que un
   * humano se hace: «quiero la luz arriba a la derecha».
   */
  roll: number;
}

/**
 * La base de PANTALLA de una cámara: derecha y arriba, ortonormales.
 *
 * `cameraBasis` deriva la vertical del eje +Y del mundo, que es lo que hace
 * falta para CONSTRUIR una pose. Esto es lo contrario: se parte de una cámara
 * que ya existe y que puede llevar cualquier `up` —las vistas curadas lo
 * cambian—, así que la vertical se ortonormaliza contra la mirada en vez de
 * inventarse. Sin eso, la componente vertical de la luz saldría torcida en
 * cuanto el `up` dejara de ser perpendicular al eje de mirada.
 */
function screenBasis(toCamera: Vec3, cameraUp: Vec3): { right: Vec3; up: Vec3 } {
  const forward: Vec3 = [-toCamera[0], -toCamera[1], -toCamera[2]];
  const reference =
    Math.abs(dot(normalise(forward), normalise(cameraUp))) > 1 - DEGENERATE
      ? FALLBACK_UP
      : cameraUp;
  const right = normalise(cross(forward, reference));
  return { right, up: normalise(cross(right, forward)) };
}

/**
 * Cómo está iluminada AHORA MISMO esta observación, en los dos números que se
 * pueden manipular.
 *
 * Es una lectura, no un ajuste: sale de dónde están la cámara y el espécimen, y
 * por eso los mandos de `LUZ` se mueven solos cuando el visitante orbita. Un
 * dial que no responde al resto del aparato es una caja de texto con estilo.
 */
export function lightGeometry(
  camera: Vec3,
  body: Vec3,
  cameraUp: Vec3,
): LightGeometry {
  const span = Math.hypot(...sub3(camera, body));
  const reach = Math.hypot(body[0], body[1], body[2]);
  // Con el espécimen en el origen no hay dirección de luz que medir: la luz ES
  // el origen. Devolver ceros es lo único honesto — un NaN llegaría a pantalla.
  if (span === 0 || reach === 0) return { key: 0, roll: 0 };

  const toCamera = normalise(sub3(camera, body));
  const toLight = normalise([-body[0], -body[1], -body[2]]);
  const { right, up } = screenBasis(toCamera, cameraUp);

  return {
    key: Math.acos(Math.min(1, Math.max(-1, dot(toLight, toCamera)))) / DEG,
    roll: Math.atan2(dot(toLight, up), dot(toLight, right)) / DEG,
  };
}

/**
 * Dónde hay que poner el espécimen —y con él la cámara— para que la luz caiga
 * con esta geometría.
 *
 * El offset cámara-espécimen se conserva ENTERO en coordenadas de mundo, y eso
 * es lo que garantiza la propiedad que hace útil al instrumento: la misma cara,
 * el mismo encuadre, la misma distancia, otra luz.
 *
 * La rotación propia de la figura sigue sin tocarse aquí, y desde que existe el
 * mando `EJE` eso dejó de ser una casualidad para ser la otra mitad del
 * reparto: esta función mueve el cuerpo POR EL MUNDO —cambia de dónde le llega
 * la luz— y aquel mando lo gira SOBRE SÍ MISMO —cambia qué cara mira—. Las dos
 * rotaciones son conmutativas y ninguna puede leer la otra en sus números: el
 * eje de la figura no aparece en esta construcción, y la posición del cuerpo en
 * el mundo no aparece en la de allí.
 */
export function lightPlacement(
  camera: Vec3,
  body: Vec3,
  cameraUp: Vec3,
  light: LightGeometry,
): { body: Vec3; camera: Vec3 } {
  const reach = Math.hypot(body[0], body[1], body[2]);
  if (reach === 0) return { body, camera };

  const offset = sub3(camera, body);
  const toCamera = normalise(offset);
  const { right, up } = screenBasis(toCamera, cameraUp);

  const key = Math.min(180, Math.max(0, light.key)) * DEG;
  const roll = light.roll * DEG;
  const sin = Math.sin(key);
  // La dirección en la que hay que ver la luz DESDE el espécimen, reconstruida
  // en el marco de la pantalla: `key` la separa del eje de mirada y `roll` la
  // reparte por el reloj del cuadro.
  const toLight: Vec3 = [
    Math.cos(key) * toCamera[0] +
      sin * (Math.cos(roll) * right[0] + Math.sin(roll) * up[0]),
    Math.cos(key) * toCamera[1] +
      sin * (Math.cos(roll) * right[1] + Math.sin(roll) * up[1]),
    Math.cos(key) * toCamera[2] +
      sin * (Math.cos(roll) * right[2] + Math.sin(roll) * up[2]),
  ];

  // Y el espécimen va justo enfrente: la luz es el origen, así que si desde el
  // cuerpo la luz se ve en `toLight`, el cuerpo está en `-reach · toLight`.
  const placed: Vec3 = [
    -toLight[0] * reach,
    -toLight[1] * reach,
    -toLight[2] * reach,
  ];

  return {
    body: placed,
    camera: [
      placed[0] + offset[0],
      placed[1] + offset[1],
      placed[2] + offset[2],
    ],
  };
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
