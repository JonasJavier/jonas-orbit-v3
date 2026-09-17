import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BASE_EXPOSURE } from "./observatory-scene";
import { createObservatorySky, SKY_CALIBRATION } from "./observatory-sky";

/**
 * La atmósfera del Observatorio.
 *
 * Aquí no se juzga si se ve bonita —eso es una captura y un veredicto— sino las
 * promesas que la hacen posible y que se rompen en silencio. Ninguna da error al
 * romperse; todas dan una imagen peor.
 *
 * ── Por qué este archivo cambió de tesis ────────────────────────────────────
 *
 * La primera versión calibraba TODO contra el «suelo del espécimen» —HDR
 * 0.0083, el canto más débil de la celda lejana— y le imponía al halo la mitad
 * de ese número. Las aserciones pasaban y la imagen estaba vacía: pasado por la
 * cadena real, aquel halo sale a sRGB 0, 0, 1 y en el centro del cuadro a 0.
 *
 * El fallo no era el número, era la UNIDAD. Cerca del negro la curva ACES es
 * plana y comprime tres décadas de radiancia lineal en los diez primeros
 * valores de sRGB, así que una cota en HDR no acota la imagen: la borra. Y un
 * test escrito en la misma unidad que el error no puede verlo.
 *
 * Así que la comprobación central de este archivo pasa por la CADENA COMPLETA
 * —ACES a la exposición real del Observatorio, más la codificación sRGB del
 * OutputPass— y afirma cosas sobre niveles de pantalla. Es la única unidad en
 * la que «se ve» y «no se ve» significan algo, y es la que habría cazado el
 * fallo el primer día.
 */

/**
 * La cadena de salida del Observatorio, reproducida exactamente.
 *
 * Los dos detalles que hay que copiar y que es fácil olvidar: el `/ 0.6` que
 * three mete dentro de `ACESFilmicToneMapping` antes de las matrices —así que
 * la exposición efectiva es 1.583 y no 0.95— y que el OutputPass codifica a
 * sRGB, que es lo que aplana la parte baja de la escala.
 */
const ACES_IN = [
  [0.59719, 0.35458, 0.04823],
  [0.076, 0.90834, 0.01566],
  [0.0284, 0.13383, 0.83777],
];
const ACES_OUT = [
  [1.60475, -0.53108, -0.07367],
  [-0.10208, 1.10813, -0.00605],
  [-0.00327, -0.07276, 1.07602],
];
const aplicar = (m: number[][], v: number[]) =>
  m.map((fila) => fila[0] * v[0] + fila[1] * v[1] + fila[2] * v[2]);
const sRGB = (x: number) =>
  x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;

/** Radiancia lineal HDR → los tres bytes que acaban en el PNG. */
function enPantalla(rgb: number[]): number[] {
  let c = rgb.map((x) => (x * BASE_EXPOSURE) / 0.6);
  c = aplicar(ACES_IN, c).map(
    (x) =>
      (x * (x + 0.0245786) - 0.000090537) /
      (x * (0.983729 * x + 0.43295) + 0.238081),
  );
  return aplicar(ACES_OUT, c)
    .map((x) => Math.min(1, Math.max(0, x)))
    .map((x) => Math.round(255 * sRGB(x)));
}
const luma = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** El tinte frío de las estrellas y el azul del lóbulo ancho, tal cual están en
 *  el fragmento. Cambiarlos allí sin cambiarlos aquí descalibra el test. */
const TINTE_ESTRELLA = [0.86, 0.92, 1.0];
const TINTE_HALO = [0.2, 0.46, 0.9];

/**
 * El brillo de las aristas VIVAS del espécimen, en niveles de pantalla.
 *
 * Medido sobre la captura con `tools/observatory-atmosfera.mjs`: percentil 99.9
 * del cuadro = 226. Éste es el «100 %» de la jerarquía que fijó la dirección
 * —objeto 100, atmósfera 25-35, instrumentación 10-15— y sustituye al suelo del
 * espécimen, que era el ancla equivocada: acotar la atmósfera contra el canto
 * MÁS APAGADO de la figura obliga a que sea invisible, porque ese canto está a
 * seis niveles de pantalla.
 */
const ESPECIMEN = 226;

describe("atmósfera del Observatorio", () => {
  it("cada ingrediente sobrevive a los ocho bits", () => {
    /*
      La prueba que faltaba, y la única que habría cazado el pase invisible.

      No basta con que un número sea mayor que cero en el shader: tiene que
      llegar a la pantalla. El listón está puesto donde un ojo empieza a
      distinguir algo de negro sobre un monitor en una habitación normal, que es
      del orden de tres o cuatro niveles.
    */
    const { STAR_PEAK, STAR_FLOOR, HALO_PEAK } = SKY_CALIBRATION;

    const estrellaViva = luma(enPantalla(TINTE_ESTRELLA.map((c) => c * STAR_PEAK)));
    const estrellaFloja = luma(
      enPantalla(TINTE_ESTRELLA.map((c) => c * STAR_PEAK * STAR_FLOOR)),
    );
    const halo = luma(enPantalla(TINTE_HALO.map((c) => c * HALO_PEAK)));

    // Las referencias de profundidad: «unas pocas claramente visibles».
    expect(estrellaViva).toBeGreaterThan(45);
    // El grueso del campo: tenue, pero PRESENTE. Por debajo de cuatro niveles
    // el campo entero deja de existir, que es lo que pasó.
    expect(estrellaFloja).toBeGreaterThan(4);
    // La masa fría, en su pico. Se pidió que se pudiera señalar en la captura
    // sin subir el brillo del monitor.
    expect(halo).toBeGreaterThan(30);
  });

  it("y ninguno le disputa el cuadro al espécimen", () => {
    /*
      El techo, dicho contra lo que de verdad domina la imagen —las aristas
      vivas— y no contra el canto más flojo.

      La jerarquía pedida es 100 / 25-35 / 10-15. La atmósfera se queda por
      debajo del 40 % con holgura: una estrella puntual a un tercio del brillo
      de una arista continua de cientos de píxeles no compite, y el halo es un
      degradado sin borde, que compite todavía menos.
    */
    const { STAR_PEAK, HALO_PEAK } = SKY_CALIBRATION;
    const estrella = luma(enPantalla(TINTE_ESTRELLA.map((c) => c * STAR_PEAK)));
    const halo = luma(enPantalla(TINTE_HALO.map((c) => c * HALO_PEAK)));

    expect(estrella / ESPECIMEN).toBeLessThan(0.4);
    expect(halo / ESPECIMEN).toBeLessThan(0.4);
    // Y el halo por debajo de la estrella más viva: la masa es fondo y los
    // puntos son referencias. Si el fondo pasa a los puntos, deja de haber
    // profundidad y hay niebla.
    expect(halo).toBeLessThan(estrella);
  });

  it("el núcleo de petróleo modifica el halo, no lo duplica", () => {
    // El segundo lóbulo existe para meter COLOR en el centro de la masa, no
    // para añadir una segunda fuente. En cuanto su peso se acerca al del lóbulo
    // ancho deja de leerse como una variación del negro y empieza a leerse como
    // un foco, que es lo que el encargo descarta por su nombre.
    expect(SKY_CALIBRATION.HALO_CORE).toBeLessThan(SKY_CALIBRATION.HALO_PEAK / 1.5);
    expect(SKY_CALIBRATION.HALO_CORE).toBeGreaterThan(0);
  });

  it("el halo se ancla a la luz y no al centro del cuadro", () => {
    /*
      Es la única decisión del archivo que interpreta el encargo en vez de
      transcribirlo, así que queda escrita: «detrás del Tesseracto» se resuelve
      como «donde está la luz», que en la pose del preset es el mismo sitio —el
      Tesseracto está a contraluz— y al orbitar deja de serlo, a propósito.

      Y es además la defensa de la jerarquía 4D: con el pico anclado a la luz,
      el máximo de la masa cae en la esquina del cuadro y el espécimen vive en
      el hombro. Anclarlo a la vista lo pondría justo encima de la silueta.
    */
    expect(SKY_CALIBRATION.HALO_ANCHOR).toBe("luz");
  });

  it("no anima nada: el bucle del Observatorio es bajo demanda", () => {
    /*
      La promesa arquitectónica. En reposo la escena no llama a
      `composer.render()` ni una vez, y un fotograma aquí no es barato: `spinAt`
      reescribe en CPU los vértices de las 32 aristas y recalcula las normales
      de las membranas. Un centelleo de estrellas obligaría a repetir todo eso
      para mover unos subpíxeles.

      Y hay una segunda razón, más difícil de ver: un reloj propio no lo congela
      el interruptor global de movimiento, así que el cielo seguiría corriendo
      con el movimiento apagado —contra `movimiento-unificado.md`— y además
      rompería el A/B/C de atmósfera, cuyo requisito es «mismo instante».
    */
    const sky = createObservatorySky(new THREE.Vector3(0, 0, 1));
    const mesh = sky.object as THREE.Mesh;
    const material = mesh.material as THREE.ShaderMaterial;
    try {
      expect(Object.keys(material.uniforms).sort()).toEqual([
        "uHalo",
        "uLightDirection",
        "uStars",
      ]);
      expect(material.fragmentShader).not.toMatch(/uTime|iTime/);
      expect(material.vertexShader).not.toMatch(/uTime|iTime/);
    } finally {
      sky.dispose();
    }
  });

  it("se dibuja antes que el oclusor del Tesseracto", () => {
    // -2 y no -1: la capa que sólo escribe profundidad para que las aristas de
    // detrás se interrumpan en los cruces ya ocupa el -1. Empatar ahí dejaría
    // el orden en manos del recorrido de la escena.
    const sky = createObservatorySky(new THREE.Vector3(0, 0, 1));
    try {
      expect(sky.object.renderOrder).toBeLessThan(-1);
      expect(sky.object.frustumCulled).toBe(false);
      const material = (sky.object as THREE.Mesh).material as THREE.ShaderMaterial;
      expect(material.depthWrite).toBe(false);
      expect(material.depthTest).toBe(false);
      // Opaco: transparente caería en la lista que three dibuja DESPUÉS.
      expect(material.transparent).toBe(false);
    } finally {
      sky.dispose();
    }
  });

  it("viaja con la cámara sin rotar, que es lo que lo hace infinito", () => {
    /*
      Traslación sí, rotación no. Al arrastrar, el cielo barre el cuadro porque
      la cámara gira contra él; al acercar, no cambia de escala porque la
      distancia es constante.

      Si además rotara, sería una viñeta pegada a la vista y no se movería
      nunca: papel pintado. Si en cambio se quedara fijo en el mundo, la cámara
      —que orbita a 45.7 unidades del centro de esa esfera— produciría paralaje
      contra él, y una cáscara con paralaje se lee como el interior de una
      habitación. Las dos cosas están vetadas por el encargo.
    */
    const sky = createObservatorySky(new THREE.Vector3(0, 0, 1));
    try {
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 4000);
      camera.position.set(3, -7, 12);
      camera.rotation.set(0.4, 1.1, -0.2);

      sky.follow(camera);
      expect(sky.object.position.toArray()).toEqual([3, -7, 12]);
      expect(sky.object.quaternion.toArray()).toEqual([0, 0, 0, 1]);

      camera.position.set(-40, 2, 0);
      sky.follow(camera);
      expect(sky.object.position.toArray()).toEqual([-40, 2, 0]);
      expect(sky.object.quaternion.toArray()).toEqual([0, 0, 0, 1]);
    } finally {
      sky.dispose();
    }
  });

  it("el banco visual sólo puede RESTAR capas", () => {
    /*
      La propiedad que mantiene honestas las tres capturas del pase. Apagar deja
      la capa en cero exacto; encender la devuelve a su valor de producción, no
      a uno mejor. Un interruptor que pudiera subir el cielo por encima de lo
      que recibe el visitante convertiría la entrega en propaganda.

      Y el alcance también importa: el banco sólo llega a estos dos uniformes.
      El suelo de magnitud y la mezcla del núcleo entran al shader como
      literales, así que A, B y C comparten el CARÁCTER del cielo y sólo se
      diferencian en su presencia. Si una capa pudiera cambiar la forma del
      degradado, las tres capturas dejarían de ser comparables.
    */
    const sky = createObservatorySky(new THREE.Vector3(0, 0, 1));
    const material = (sky.object as THREE.Mesh).material as THREE.ShaderMaterial;
    try {
      expect(material.uniforms.uStars.value).toBe(SKY_CALIBRATION.STAR_PEAK);
      expect(material.uniforms.uHalo.value).toBe(SKY_CALIBRATION.HALO_PEAK);

      sky.setLayers({ stars: false, halo: false });
      expect(material.uniforms.uStars.value).toBe(0);
      expect(material.uniforms.uHalo.value).toBe(0);

      sky.setLayers({ stars: true, halo: true });
      expect(material.uniforms.uStars.value).toBe(SKY_CALIBRATION.STAR_PEAK);
      expect(material.uniforms.uHalo.value).toBe(SKY_CALIBRATION.HALO_PEAK);
    } finally {
      sky.dispose();
    }
  });
});
