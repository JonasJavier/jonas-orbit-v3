/**
 * Recorrido capturado del Observatorio, con vídeo.
 *
 * `shot.mjs` captura el hero: una pose fija de una escena que nadie toca. El
 * Observatorio es lo contrario —un instrumento que se manipula— y por eso no se
 * puede juzgar con una imagen suelta. Esto recorre la sesión entera: reposo,
 * instrumentación, arrastre, zoom, los tres instrumentos de INSPECCIONAR y la
 * vuelta al preset; deja ocho PNG numerados y un `.webm` de todo el recorrido.
 *
 * El vídeo no es un adorno: la mitad de las decisiones del pase visual —si el
 * gesto lleva el espécimen con la mano, si el modo cine molesta, si la figura
 * tiene ritmo— no existen en una captura estática.
 *
 * Cuatro cosas que conviene saber, tres heredadas de `shot.mjs`:
 *
 *   · SwiftShader para tener WebGL por software, y `reducir-efectos: false` en
 *     localStorage porque casi todo equipo de desarrollo reporta
 *     `prefers-reduced-motion` y el interruptor global lo respeta.
 *   · `deviceScaleFactor` se queda en 1: a 2, el Tesseracto regenera su
 *     geometría cada fotograma por software y no converge en ningún timeout.
 *   · Aquí `networkidle` SÍ resuelve, al contrario que en el hero. El bucle del
 *     Observatorio es bajo demanda: en reposo deja de dibujar, así que la red
 *     queda ociosa de verdad. Es el primer sitio del proyecto donde se nota esa
 *     diferencia de arquitectura.
 *   · Los botones se buscan con `exact: true`. Sin él, «Datos» casa también con
 *     cualquier rótulo que lo contenga — la misma trampa que costó una entrega
 *     en los tests de la Ranger.
 *
 * ── El barrido de ciclo ─────────────────────────────────────────────────────
 *
 * `--ciclo=N` hace otra cosa distinta: en vez del recorrido, captura N
 * fotogramas repartidos por el ciclo de animación del espécimen, todos en la
 * pose del preset. Existe porque «cuánto ocupa el espécimen» NO es un número
 * en el Tesseracto — su silueta encoge y crece con la reconfiguración 4D, y
 * medida sobre una captura suelta la cifra sale entre el 57 % y el 70 % según
 * el instante que toque. Calibrar el encuadre contra un fotograma es calibrar
 * contra el azar.
 *
 * Uso:
 *   node tools/observatory-shot.mjs <carpeta-destino> [objeto] [url-base]
 *   node tools/observatory-shot.mjs <carpeta-destino> [objeto] --ciclo=12
 *
 * Ejemplo:
 *   npm run dev
 *   node tools/observatory-shot.mjs .shots/observatorio tesseracto
 */

import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2];
if (!OUT) {
  console.error(
    "Falta la carpeta de destino.\n" +
      "  node tools/observatory-shot.mjs <carpeta> [objeto] [url-base]",
  );
  process.exit(1);
}

const args = process.argv.slice(3);
const sueltos = args.filter((a) => !a.startsWith("--"));
const cicloFlag = args.find((a) => a.startsWith("--ciclo="));
const relojFlag = args.find((a) => a.startsWith("--reloj="));
/** Modo A/B/C de atmósfera: tres cargas, un reloj, cero diferencias más. */
const ATMOSFERA = args.includes("--atmosfera");
/** Modo órbita: sólo cámara. Ni un instrumento, ni un interruptor. */
const ORBITA = args.includes("--orbita");
/** Modo asentamiento: cuántos fotogramas tarda la acumulación en converger. */
const ASENTAMIENTO = args.includes("--asentamiento");
/**
 * `--vista=<rótulo>` fija una vista curada para TODO el recorrido.
 *
 * Existe por el A/B del bloom de Gargantúa. La historia del §14 undecies —el
 * halo no puede encender lo que estaba apagado— sólo se ve donde el negro ocupa
 * bastante cuadro, y eso es la vista `SOMBRA`; hacer el A/B en la canónica
 * mide el mismo interruptor sobre la parte del cuadro donde menos cuenta.
 */
const vistaFlag = args.find((a) => a.startsWith("--vista="));
const VISTA = vistaFlag ? vistaFlag.split("=")[1] : null;
/**
 * Y se compara SIN TILDES, que es el defecto que dejó la vista canónica fuera
 * de alcance: `--vista=cinematografica` construía `/cinematografica/i` y el
 * nombre accesible del mando es «Cinematográfica». El regex crudo no casa una
 * tilde, así que la única vista del catálogo que lleva uno era la única que no
 * se podía fijar — y es la canónica, la que se usa en todos los A/B.
 */
const sinTildes = (texto) =>
  (texto ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
/**
 * El instante que se clava. 16.5 s no es arbitrario: `lib/tesseract.ts` lo
 * documenta como una de las poses que el dueño marcó como BUENAS cuando se
 * calibró el ritmo de la figura.
 */
const RELOJ = relojFlag ? Number(relojFlag.split("=")[1]) : 16.5;
/** Fotogramas del barrido de ciclo, o 0 para el recorrido normal. */
const CICLO = cicloFlag ? Number(cicloFlag.split("=")[1]) : 0;

const OBJETO = sueltos[0] ?? "tesseracto";
const BASE = sueltos[1] ?? "http://localhost:3000";
const URL = `${BASE}/es/experimentos/observatorio/${OBJETO}`;

/** El circuito euleriano del Tesseracto recorre sus 32 aristas en 18 s, y la
 *  reconfiguración interior comparte ese reloj. Un ciclo = 18 s. */
const CICLO_MS = 18_000;

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
  ],
});

/**
 * `--movil` captura a 375 × 812, que es el proyecto móvil de la suite.
 *
 * No es un capricho de encuadre: en móvil la consola se APRIETA y no rueda
 * —O10 bis: un mando que hay que desplazar para tocar es un mando que no está—
 * y con Gargantúa hay además una decisión propia que sólo se puede juzgar ahí,
 * porque el disco es una figura ancha y en vertical hay que retroceder para que
 * no se salga por los lados.
 */
const MOVIL = args.includes("--movil");
const ANCHO = MOVIL ? 375 : 1440;
const ALTO = MOVIL ? 812 : 900;

const context = await browser.newContext({
  viewport: { width: ANCHO, height: ALTO },
  deviceScaleFactor: 1,
  reducedMotion: "no-preference",
  recordVideo: { dir: OUT, size: { width: ANCHO, height: ALTO } },
});

const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem("jonas-orbit:reducir-efectos", "false");
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".observatory__canvas", { timeout: 30_000 });
// Margen de asentamiento: por software, los primeros fotogramas del Tesseracto
// llegan a cuentagotas y la figura todavía no tiene su pose.
await page.waitForTimeout(6_000);

const boton = (nombre) => page.getByRole("button", { name: nombre, exact: true });
/**
 * Despliega la consola.
 *
 * Desde el pase de los dos modos el aparato arranca en `OBSERVAR` —sólo el
 * espécimen y la mano— y todos los instrumentos viven en `ESTUDIO`. La consola
 * plegada va `inert`, así que sin esta llamada los clics de abajo no fallan por
 * un selector equivocado: no llegan.
 */
const abrirEstudio = async () => {
  await page.getByRole("radio", { name: "Estudio", exact: true }).click();
  await page.waitForTimeout(500);
  if (VISTA) {
    const mandos = page.getByRole("radio").filter({ hasNotText: /observar|estudio/i });
    const buscado = sinTildes(VISTA);
    const total = await mandos.count();
    let elegido = -1;
    for (let i = 0; i < total; i++) {
      if (sinTildes(await mandos.nth(i).textContent()).includes(buscado)) {
        elegido = i;
        break;
      }
    }
    if (elegido < 0) {
      const rotulos = [];
      for (let i = 0; i < total; i++) rotulos.push((await mandos.nth(i).textContent())?.trim());
      throw new Error(
        `No hay ninguna vista que case con "${VISTA}". Las que hay: ${rotulos.join(", ")}`,
      );
    }
    await mandos.nth(elegido).click();
    // La espera es larga a propósito: cambiar de vista tira la acumulación
    // entera, y capturar antes compararía una imagen de una sola muestra.
    await page.waitForTimeout(6_000);
  }
};
const paso = async (nombre, espera = 900) => {
  await page.waitForTimeout(espera);
  await page.screenshot({ path: join(OUT, `${nombre}.png`) });
};

if (ATMOSFERA) {
  /*
    Las tres capturas del pase de atmósfera, y la razón de que sean tres CARGAS
    y no tres pulsaciones.

    El requisito es «mismo frame, mismo instante y mismo estado de chrome». La
    tentación es quedarse en la misma página y conmutar en caliente, pero eso
    sólo garantiza el instante DENTRO de esa ejecución: el `elapsed` congelado
    es el que tocó ese día, así que las mismas tres capturas la semana que
    viene son otra pose y la comparación no se puede rehacer.

    El determinismo no sale de quedarse en la página, sale de NOMBRAR el
    instante. `sampleTesseract` es una función pura de los segundos —y el trazo
    euleriano también—, así que con `reloj` clavado el mismo número da los
    mismos dieciséis vértices bit a bit, hoy, la semana que viene y en otra
    máquina. Lo que no puede darlo es `elapsed`, que se acumula de deltas de
    rAF: su valor a los diez segundos depende de cuántos fotogramas haya
    conseguido la GPU.

    Todo lo demás se mantiene solo: nadie toca el arrastre ni la rueda, así que
    la cámara sale de la pose del preset en las tres; y nadie mueve el puntero,
    así que el modo cine ha atenuado igual en las tres.
  */
  const capas = [
    ["A-negro", { estrellas: false, halo: false, marcas: false }],
    ["B-estrellas", { estrellas: true, halo: false, marcas: false }],
    ["C-completa", { estrellas: true, halo: true, marcas: true }],
  ];

  for (const [nombre, atmosfera] of capas) {
    await page.evaluate(
      ([atmosfera, reloj]) => {
        localStorage.setItem(
          "jonas-orbit:banco-visual",
          JSON.stringify({ reloj, atmosfera }),
        );
      },
      [atmosfera, RELOJ],
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".observatory__canvas", { timeout: 30_000 });
    await paso(nombre, 7_000);
  }

  await context.close();
  await browser.close();
  console.log(
    `Observatorio · ${OBJETO}: A/B/C de atmósfera en ${OUT}, reloj clavado en ${RELOJ} s`,
  );
  process.exit(0);
}

if (ASENTAMIENTO) {
  /*
    CUÁNTO TARDA EN ASENTARSE, MEDIDO.
    
    Gargantúa es el único espécimen cuya imagen se compone promediando
    fotogramas, así que su bucle no puede parar en cuanto nadie toca nada: tiene
    que seguir dibujando hasta que el promedio converge. «Hasta cuándo» es un
    número que hay que medir, y la serie geométrica no lo da: que la
    contribución del historial caiga como 0.82^n es aritmética y no dice cuándo
    deja de verse la diferencia en una pantalla de ocho bits.
    
    El método es el único honesto: capturar fotogramas consecutivos con todo
    quieto y ver en qué momento la diferencia entre dos seguidos baja hasta el
    ruido de captura. Ese mismo barrido da las dos cifras que hacen falta — el
    umbral de asentamiento y el SUELO contra el que se juzga cualquier otro
    A/B de esta página.
    
    El movimiento se apaga primero: con el reloj corriendo el disco se devana y
    la imagen no converge nunca, que es justo lo que hace que O12 se afirme con
    el interruptor apagado.
  */
  const interruptor = page.getByRole("button", { name: "Desactivar movimiento" });
  if (await interruptor.count()) {
    await interruptor.first().click();
    await page.waitForTimeout(1_000);
  }
  // La consola desplegada y `DATOS` abierto: el contador de fotogramas
  // promediados lo publica el instrumento ahí, y es el eje del experimento.
  await page.getByRole("radio", { name: "Estudio", exact: true }).click();
  await page.getByRole("button", { name: "Datos", exact: true }).click();
  // Y se reinicia la acumulación para empezar a contar desde cero de verdad.
  await page.getByRole("button", { name: "Reajustar", exact: true }).click();

  /*
    ── POR QUÉ SE CAPTURA SIN ESPERAR ENTRE FOTOGRAMAS ────────────────────────

    En un Chromium headless `requestAnimationFrame` DEJA DE DISPARARSE cuando
    nada fuerza un pintado. Se midió con un contador de rAF propio en la página:
    se queda clavado a los veintitantos ciclos y no vuelve. O sea que «esperar
    420 ms entre capturas» no deja pasar fotogramas — deja pasar tiempo, y el
    bucle no avanza.

    Eso invalidó la primera medición entera: parecía que la acumulación se
    asentaba en tres pasos, y lo que pasaba es que cada paso era un fotograma,
    forzado por la propia captura. La conclusión habría sido un `SETTLE_FRAMES`
    ridículamente bajo y una imagen ruidosa en cualquier equipo real.

    `page.screenshot()` SÍ fuerza un pintado, así que capturar en cadena y sin
    esperas convierte el número de capturas en el eje del experimento. Y se lee
    el contador de fotogramas promediados junto a cada una, que es el eje de
    verdad: lo publica el propio instrumento en `DATOS`.
  */
  const PASOS = 64;
  const promediados = [];
  for (let i = 0; i < PASOS; i++) {
    await page.screenshot({ path: join(OUT, `asiento-${String(i).padStart(2, "0")}.png`) });
    promediados.push(
      await page.evaluate(() => {
        const filas = [...document.querySelectorAll(".observatory__data dl > div")];
        const fila = filas.find((d) =>
          d.querySelector("dt")?.textContent?.includes("promediados"),
        );
        return Number(fila?.querySelector("dd")?.textContent ?? -1);
      }),
    );
  }

  await context.close();
  await browser.close();
  console.log(
    `Observatorio · ${OBJETO}: ${PASOS} capturas de asentamiento en ${OUT}
` +
      `fotogramas promediados por captura: ${promediados.join(" ")}`,
  );
  process.exit(0);
}

if (ORBITA) {
  /*
    El clip de órbita, y por qué no reutiliza el recorrido normal.

    Este modo se queda en `OBSERVAR` a propósito: no despliega la consola ni
    toca un instrumento, que es exactamente lo que necesita.

    Lo que hay que juzgar aquí es una sola pregunta: **¿el cielo se comporta
    como espacio o como un fondo pegado a la pantalla?** Eso no se ve en una
    imagen fija y se contamina con cualquier otra cosa que pase en el cuadro,
    así que este modo no toca un solo instrumento: ni DATOS, ni BLOOM, ni
    MATERIAL, ni el interruptor de movimiento. Sólo la mano sobre el lienzo.

    Dos tramos, y cada uno responde a una mitad de la pregunta:

     · ÓRBITA. La cámara rota alrededor del espécimen. La cáscara del cielo
       viaja con la cámara pero NO rota, así que el campo tiene que barrer el
       cuadro. Si se quedara quieto sería papel pintado.
     · ZOOM. La cámara se acerca y se aleja. Ahora la cáscara se traslada CON
       ella, así que el cielo no puede cambiar de escala ni moverse. Un fondo a
       distancia finita sí lo haría, y eso se lee como el interior de una sala.

    Las dos cosas juntas son la definición de «infinitamente lejos», y las dos
    se pueden medir sobre el contacto: `observatory-atmosfera.mjs --movimiento`.

    El contacto va en pasos PEQUEÑOS y regulares —40 px de arrastre, o sea 10°
    de cámara— porque la medida de barrido correlaciona dos fotogramas
    consecutivos: con saltos grandes el campo sale entero de cuadro entre uno y
    otro y no hay nada que correlacionar.
  */
  const CX = 720;
  const CY = 450;
  const PASOS = 10;
  const PASO_PX = 40;

  await page.waitForTimeout(2_000);

  // Tramo 1 · órbita en pasos medibles, con el contacto de fotogramas.
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  for (let i = 0; i < PASOS; i++) {
    await paso(`orbita-${String(i).padStart(2, "0")}`, 260);
    await page.mouse.move(CX + (i + 1) * PASO_PX, CY);
  }
  await page.mouse.up();

  // Tramo 2 · órbita continua, sólo para el vídeo: lo que vería un visitante.
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  for (let i = 1; i <= 90; i++) {
    await page.mouse.move(CX - i * 8, CY + Math.sin(i / 14) * 70);
    await page.waitForTimeout(28);
  }
  await page.mouse.up();
  await page.waitForTimeout(700);

  // Tramo 3 · zoom. El cielo NO puede seguirlo.
  await paso("zoom-00-antes", 400);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(160);
  }
  await paso("zoom-01-cerca", 700);
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(160);
  }
  await paso("zoom-02-lejos", 700);

  await context.close();
  await browser.close();
  const clip = readdirSync(OUT).find((name) => name.endsWith(".webm"));
  if (clip) renameSync(join(OUT, clip), join(OUT, "00-orbita.webm"));
  console.log(
    `Observatorio · ${OBJETO}: clip de órbita y ${PASOS} fotogramas de contacto en ${OUT}`,
  );
  process.exit(0);
}

if (CICLO > 0) {
  /*
    Barrido de ciclo: la misma pose de cámara, N instantes de la animación.

    Nada de tocar la cámara ni los instrumentos — lo único que cambia entre dos
    capturas es el reloj del espécimen, que es justo la variable que confunde
    cualquier medida de encuadre hecha sobre un fotograma suelto.
  */
  for (let i = 0; i < CICLO; i++) {
    await paso(`ciclo-${String(i).padStart(2, "0")}`, CICLO_MS / CICLO);
  }
  await context.close();
  await browser.close();
  console.log(
    `Observatorio · ${OBJETO}: ${CICLO} fotogramas de un ciclo en ${OUT}`,
  );
  process.exit(0);
}

/**
 * ¿Existe este mando en ESTA muestra?
 *
 * El recorrido dejó de poder ser una lista fija cuando el laboratorio montó su
 * primer espécimen sin malla: Gargantúa no tiene `LUZ` —es la fuente—, ni
 * `MATERIAL` —no hay `uEmission` que apagar— ni `SONDA`, y en cambio tiene tres
 * interruptores de física que ningún sólido tiene. Una herramienta que diera
 * por supuestos los mandos del Tesseracto se quedaría colgada treinta segundos
 * esperando un dial que no existe, que es exactamente lo que hizo la primera
 * vez que se apuntó a Gargantúa.
 *
 * Se pregunta al DOM en vez de mirar el nombre del objeto: así montar el cuarto
 * espécimen no vuelve a pasar por aquí.
 */
const hay = async (locator) => (await locator.count()) > 0;

/**
 * Deja un mando en el estado pedido, COMPROBÁNDOLO.
 *
 * No es prudencia de más. El A/B del bloom salió invertido una vez —la captura
 * llamada «sin bloom» era la que lo tenía encendido— y no se detectó mirando,
 * sino midiendo: el negro de la sombra salía más grande CON halo, que es
 * imposible. Una pareja de capturas mal etiquetada es peor que no tenerla,
 * porque se usa para decidir.
 *
 * Así que en vez de contar clics se lee `aria-pressed`, que es el estado real
 * del instrumento, y se pulsa hasta que coincide. `pressed` significa «el canal
 * está aislado», o sea bloom APAGADO.
 */
const fijar = async (nombre, pulsado) => {
  const mando = boton(nombre);
  if (!(await hay(mando))) return false;
  for (let intento = 0; intento < 3; intento++) {
    const ahora = (await mando.getAttribute("aria-pressed")) === "true";
    if (ahora === pulsado) return true;
    await mando.click();
    await page.waitForTimeout(400);
  }
  throw new Error(`no se pudo dejar ${nombre} en ${pulsado ? "pulsado" : "suelto"}`);
};

// 1 · OBSERVAR en reposo. Sin tocar nada, el modo cine ya se ha llevado todo lo
//     que no dice dónde estás: queda el espécimen, su nombre y la salida.
await paso("01-limpia", 4_000);

// 2 · Cualquier gesto devuelve la identidad y la barra del aparato. Sigue sin
//     haber un solo instrumento a la vista, y ése es el modo por defecto.
await page.mouse.move(ANCHO / 2, ALTO / 2);
await paso("02-observar", 400);

// 3 · ESTUDIO: la consola se despliega bajo su alféizar.
await abrirEstudio();
await paso("03-estudio", 900);

/*
  4 y 5 · La mano, DONDE LA HAY.

  Gargantúa no se arrastra ni se acerca con la rueda: el §7 la deja en cuatro
  vistas curadas porque el arrastre tiraría el supermuestreo que paga su
  acabado y porque una órbita libre acabaría enseñando el pase visual final
  desde un ángulo que nadie encuadró. Su lienzo no escucha el puntero, así que
  estos dos pasos no fallan sobre ella: no significan nada.

  Se decide por la pista del aparato, que es donde el visor publica lo que se
  puede hacer ahora, y no por el nombre del espécimen.
*/
const pista = await page.locator(".observatory__hint").textContent();
const seArrastra = /arrastra/i.test(pista ?? "");

if (seArrastra) {
  // La cámara rodea al espécimen. Y como la luz es el origen del mundo,
  // rodearlo CAMBIA su iluminación — eso es lo que hay que juzgar. Los dos
  // diales de `LUZ` lo dicen moviéndose solos.
  await page.mouse.move(ANCHO / 2, ALTO / 2);
  await page.mouse.down();
  for (let i = 1; i <= 24; i++) {
    await page.mouse.move(ANCHO / 2 + i * 9, ALTO / 2 + Math.sin(i / 5) * 24);
    await page.waitForTimeout(45);
  }
  await page.mouse.up();
  await paso("04-arrastre", 600);

  await page.mouse.wheel(0, -420);
  await paso("05-zoom");
}

/*
  4 bis · LAS VISTAS CURADAS, una captura por vista.

  En los sólidos son un instrumento más; en Gargantúa son LA interacción, así
  que el recorrido tiene que recorrerlas enteras o no enseña la página. Se
  buscan por rol y no por nombre para que valga igual con tres vistas que con
  cuatro.
*/
const vistas = page.getByRole("radio").filter({ hasNotText: /observar|estudio/i });
const cuantas = VISTA ? 0 : await vistas.count();
for (let i = 0; i < cuantas; i++) {
  const nombre = (await vistas.nth(i).textContent())?.trim().toLowerCase();
  await vistas.nth(i).click();
  await paso(`04-vista-${String(i + 1).padStart(2, "0")}-${nombre?.replace(/\W+/g, "-")}`, 5_000);
}
if (cuantas > 0) await vistas.first().click();

/*
  6 y 7 · LUZ. El instrumento que sostiene la pose y barre la iluminación.

  Se mueve por TECLADO y no arrastrando el dial: un `<input type="range">` se
  recorre con las flechas grado a grado, así que la captura cae en un ángulo
  nombrable en vez de en el que toque el píxel donde se soltó el ratón. Y la
  prueba de que el mando hace lo que dice está en la fila de al lado: `AZ`, `EL`
  y `DIST` tienen que salir idénticos en las dos.
*/
const clave = page.getByRole("slider", { name: /clave/i });
if (await hay(clave)) {
  await clave.focus();
  for (let i = 0; i < 25; i++) await page.keyboard.press("ArrowRight");
  await paso("06-luz-contraluz", 900);
  for (let i = 0; i < 100; i++) await page.keyboard.press("ArrowLeft");
  await paso("07-luz-frontal", 900);
  await boton("Reajustar").click();
  await page.waitForTimeout(600);
}

// 8 · DATOS. Las métricas viven aquí dentro y no en la vista normal.
await boton("Datos").click();
await paso("08-datos", 700);
/*
  Y se cierra por donde se puede cerrar.

  En móvil, abrir la ficha pone el aparato en modo lectura: la consola se retira
  entera y con ella el mando que la abrió, así que volver a pulsar «Datos» es
  esperar treinta segundos a un botón que ya no existe. La hoja tiene su propia
  salida —está ahí justamente para esto— y en escritorio funciona igual.
*/
const cerrarFicha = page.getByRole("button", { name: /^Cerrar/ });
if (await hay(cerrarFicha)) await cerrarFicha.first().click();
else await boton("Datos").click();

// 9 · BLOOM apagado: la prueba de oficio del contrato visual — un cuerpo que
//     pierde su identidad sin glow no está terminado.
await fijar("Bloom", true);
await paso("09-sin-bloom");
await fijar("Bloom", false);

// 10 · MATERIAL: el material sin su emisión, vía `uEmission`. Sólo donde hay
//      material que aislar — ni Miller, ni Edmunds, ni Gargantúa lo tienen.
if (await hay(boton("Material"))) {
  await boton("Material").click();
  await paso("10-sin-emision");
  await boton("Material").click();
}

/*
  10 bis · LOS TRES INTERRUPTORES DE FÍSICA, sólo en Gargantúa.

  Cada uno retira una pieza concreta del integrador y las tres capturas son el
  A/B con el que se decide si merecen ser un mando: si apagar `DOPPLER` no
  cambia la imagen de forma legible, el botón sobra. La espera es larga a
  propósito — cambiar un uniforme del raymarch reinicia la acumulación, así que
  la captura tiene que esperar a que el promedio se vuelva a asentar o compara
  una imagen limpia contra una ruidosa.
*/
const fisicas = ["Doppler", "Secundarias", "Lente"];
// Y el bloom vuelve a su sitio antes de la referencia: el paso anterior lo
// apagó, y una base con el halo apagado mediría dos cambios a la vez.
await fijar("Bloom", false);
const interruptor = page.getByRole("button", { name: "Desactivar movimiento" });
if (await hay(boton(fisicas[0]))) {
  /*
    EL A/B DE FÍSICA, Y EL RELOJ CONGELADO.

    Esto costó dos rondas de medidas inútiles y la lección merece quedarse
    escrita, porque es la misma que tropieza cada vez que hay más de una cosa
    moviéndose en la pantalla.

    Primer intento: comparar cada variante contra la captura de «reajustada» de
    más abajo. Contaminado — entre una y otra pasaba el paso del bloom.

    Segundo intento: tomar una referencia propia justo antes del bucle. Seguía
    sin valer, y ésta es la buena: **dos capturas del MISMO estado separadas
    por diez segundos difieren en 9.3 de media**, porque el disco de Gargantúa
    se devana con `uTime` y la acumulación temporal vuelve a empezar. Las tres
    medidas —11.7, 2.4 y 5.3— caían dentro de ese ruido o por debajo. Estaban
    midiendo el paso del tiempo.

    El interruptor global congela `elapsed` sin tocar la cámara ni los mandos,
    así que con él apagado la ÚNICA diferencia entre las dos imágenes es el
    uniforme. Es exactamente el truco que el A/B del bloom ya usaba doce líneas
    más abajo, y que a este bucle se le había olvidado heredar.
  */
  const congelado = await hay(interruptor);
  if (congelado) {
    await interruptor.first().click();
    await page.waitForTimeout(2_000);
  }

  await paso("10-fisica-base", 5_000);
  for (const fisica of fisicas) {
    if (!(await hay(boton(fisica)))) continue;
    await fijar(fisica, true);
    // La espera larga no es cortesía: cambiar un uniforme del raymarch tira el
    // historial entero, así que capturar antes compararía una imagen asentada
    // contra una de una sola muestra.
    await paso(`10-sin-${fisica.toLowerCase()}`, 6_000);
    await fijar(fisica, false);
    await page.waitForTimeout(5_000);
  }

  // Y se devuelve el movimiento: lo que viene después es el recorrido normal.
  if (congelado) {
    await page
      .getByRole("button", { name: "Activar movimiento" })
      .first()
      .click();
    await page.waitForTimeout(1_500);
  }
}

// 11 · Reajustar: vuelta exacta a la pose del preset, vista y luz incluidas.
//      Con `--vista` no se hace: contradiría la vista que se pidió fijar.
if (!VISTA) {
  await boton("Reajustar").click();
  await paso("11-reajustada", 1_200);
}

/*
  12 y 13 · El A/B de verdad, con el reloj congelado.

  Los pasos 5 y 9 de arriba NO sirven para comparar bloom encendido contra
  apagado: entre uno y otro el Tesseracto sigue reconfigurándose, así que son
  dos poses 4D distintas y la diferencia medida mezcla las dos cosas. Es
  exactamente la trampa que documenta `body-metrics.mjs` para un cuerpo que
  gira — «para aislar lo que decide el material, compara dos renders del MISMO
  instante».

  El Observatorio no tiene `--reloj` como `shot.mjs`, pero tiene algo mejor: el
  interruptor global de movimiento congela `elapsed` sin tocar la cámara ni la
  mano del visitante. Apagarlo deja las dos capturas en el mismo fotograma de
  la animación y con el mismo encuadre, que es la única forma de que la resta
  signifique algo.
*/
const movimiento = page.getByRole("button", { name: "Desactivar movimiento" });
if (await hay(movimiento)) {
  await movimiento.first().click();
  await fijar("Bloom", false);
  await paso("12-ab-bloom", 6_000);
  await fijar("Bloom", true);
  await paso("13-ab-sin-bloom", 6_000);
  await fijar("Bloom", false);
}

// El vídeo sólo se escribe al cerrar el contexto, y con un nombre de hash.
await context.close();
await browser.close();

const video = readdirSync(OUT).find((name) => name.endsWith(".webm"));
if (video) renameSync(join(OUT, video), join(OUT, "00-interaccion.webm"));

console.log(`Observatorio · ${OBJETO}: trece capturas y un vídeo en ${OUT}`);
