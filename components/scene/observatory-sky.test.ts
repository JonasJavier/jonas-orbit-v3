import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createObservatorySky, SKY_CALIBRATION } from "./observatory-sky";

/**
 * La atmósfera del Observatorio.
 *
 * Aquí no se juzga si se ve bonita —eso es una captura y un veredicto— sino las
 * cuatro promesas que la hacen posible y que se rompen en silencio:
 *
 *  1. Que no compita con el espécimen. Es el encargo literal: «ninguna estrella
 *     puede competir con las aristas».
 *  2. Que no borre la jerarquía 4D del Tesseracto, que costó dos versiones.
 *  3. Que no anime nada, porque el bucle es bajo demanda y un centelleo lo
 *     convertiría en continuo.
 *  4. Que se dibuje ANTES que todo lo demás.
 *
 * Ninguna da error al romperse. Las cuatro dan una imagen ligeramente peor.
 */

/**
 * El suelo del espécimen, en radiancia lineal HDR.
 *
 * Es el canto más débil de la celda LEJANA del hipercubo —la que la jerarquía
 * por profundidad en W empuja al fondo— evaluado sobre el ramo de cristal del
 * Tesseracto con su intensidad de clave real. En pantalla son sRGB 3-6-12.
 *
 * Éste es el número contra el que se calibra la atmósfera entera, y NO el
 * umbral del bloom: el umbral vale 2.0 y está entre sesenta y trescientas veces
 * por encima de cualquier cosa que un ojo llame «tenue», así que no restringe
 * nada. Quien restringe es la figura.
 */
const SPECIMEN_FLOOR = 0.0083;

describe("atmósfera del Observatorio", () => {
  it("ninguna estrella puede competir con las aristas del espécimen", () => {
    /*
      El techo no es «menor que el suelo de la figura» sino holgadamente menor
      en el sitio donde importa: el pico de una estrella es puntual y el canto
      del cristal es una línea continua de cientos de píxeles, así que a igual
      luminancia la estrella gana la atención. Se le deja un margen de tres
      veces el suelo, que es lo que separa «hay algo ahí detrás» de «hay una
      estrella ahí».
    */
    expect(SKY_CALIBRATION.STAR_PEAK).toBeLessThan(SPECIMEN_FLOOR * 3);
    // Y no puede ser cero: un campo apagado no es una atmósfera sutil.
    expect(SKY_CALIBRATION.STAR_PEAK).toBeGreaterThan(0);
  });

  it("el halo no borra la celda lejana del hipercubo", () => {
    /*
      La trampa concreta de este ingrediente, y la única que puede deshacer
      trabajo ya aprobado.

      El encargo describe el halo como «#000000 → negro azulado muy profundo →
      #000000». Un azul de ésos, #04070e, es HDR luma ≈ 0.0084: exactamente el
      nivel del canto más débil de la celda lejana. Un halo así detrás del
      espécimen sube el suelo de los píxeles donde vive esa celda y borra la
      jerarquía 4D — que es justo lo que costó las versiones V2 y V3 del
      Tesseracto, cuando se descubrió que la figura no se leía por falta de
      jerarquía y no por falta de exposición.

      Por eso el pico se queda por debajo de la mitad del suelo. La segunda
      defensa —que su máximo caiga FUERA de la silueta— la da el anclaje.
    */
    expect(SKY_CALIBRATION.HALO_PEAK).toBeLessThan(SPECIMEN_FLOOR / 2);
    expect(SKY_CALIBRATION.HALO_PEAK).toBeGreaterThan(0);
  });

  it("el halo se ancla a la luz y no al centro del cuadro", () => {
    // Es la única decisión del archivo que interpreta el encargo en vez de
    // transcribirlo, así que queda escrita: «detrás del Tesseracto» se resuelve
    // como «donde está la luz», que en la pose del preset es el mismo sitio
    // —el Tesseracto está a contraluz— y al orbitar deja de serlo, a propósito.
    expect(SKY_CALIBRATION.HALO_ANCHOR).toBe("luz");
  });

  it("no anima nada: el bucle del Observatorio es bajo demanda", () => {
    /*
      La promesa arquitectónica. En reposo la escena no llama a
      `composer.render()` ni una vez, y un fotograma aquí no es barato: `spinAt`
      reescribe en CPU los vértices de las 32 aristas y recalcula las normales
      de las membranas. Un centelleo de estrellas obligaría a repetir todo eso
      para mover unos subpíxeles.

      Y hay una segunda razón, más difícil de ver: un reloj propio no lo
      congela el interruptor global de movimiento, así que el cielo seguiría
      corriendo con el movimiento apagado —contra `movimiento-unificado.md`— y
      además rompería el A/B/C de atmósfera, cuyo requisito es «mismo instante».
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
