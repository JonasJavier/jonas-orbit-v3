import * as THREE from "three";
import { sampleTesseract, TESSERACT_FACETS, TESSERACT_PATH } from "@/lib/tesseract";

const VERTEX = /* glsl */ `
  uniform vec3 uCamPos;
  uniform float uLayer;
  uniform float uDepthPush;
  attribute float aCell;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vNear;
  varying float vCell;
  void main() {
    vCell = aCell;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    /*
      Profundidad DENTRO de la figura: 0 al fondo, 1 al frente.

      Sin ella el hipercubo era una jaula. Treinta y dos aristas del mismo
      valor sobre negro no dicen cuál está delante, y el ojo las lee como un
      dibujo plano — que es exactamente el wireframe grueso que la dirección
      de arte lleva tres pases evitando.

      El reparto sale de la propia matriz y no necesita un uniforme más que
      mantener sincronizado: la columna 3 de modelMatrix es el centro del
      cuerpo —la geometría se normaliza centrada en su origen local— y la
      columna 0 da la escala del conjunto.
    */
    vec3 centre = modelMatrix[3].xyz;
    float radius = length(modelMatrix[0].xyz) * 1.56;
    float depth = dot(normalize(uCamPos - centre), world.xyz - centre);
    vNear = clamp(depth / max(radius, 0.0001), -1.0, 1.0) * 0.5 + 0.5;
    /*
      LA CAPA DE OCLUSIÓN ESCRIBE PROFUNDIDAD MÁS ATRÁS DE LO QUE OCUPA.

      Es un tubo gordo que sólo escribe el buffer de profundidad, y sin este
      empujón se taparía a sí mismo: su superficie está más cerca de la cámara
      que la del tubo fino que envuelve, así que el cristal habría fallado su
      propio test de profundidad y la figura entera habría desaparecido.
      Empujándolo hacia atrás una escala de radio, su profundidad queda
      aproximadamente sobre el EJE de la arista: por delante de cualquier
      arista que de verdad esté más lejos, y por detrás de la suya.
    */
    if (uLayer < -0.5) {
      /*
        La cinta se ensancha AQUÍ, y no en la malla, porque así se orienta a la
        cámara: el ancho de la interrupción se mide en pantalla, que es donde
        se ve el cruce. En la malla son cuatro vértices por arista —dos
        extremos, ya retraídos— con el eje de la arista guardado en la normal.

        Cuesta 128 vértices en vez de los 768 de un tubo, y ésa no es una
        optimización cosmética: con el tubo, el presupuesto de vértices del
        sistema pasaba de 19 500 a 20 001 y el test de batches se ponía rojo.
      */
      vec3 axis = normalize(mat3(modelMatrix) * normal);
      vec3 toCam = normalize(uCamPos - world.xyz);
      vec3 sideways = normalize(cross(axis, toCam));
      // half es palabra reservada en GLSL ES: el nombre no es cosmetico.
      float reach = uDepthPush * (0.58 + 0.84 * aCell) * length(modelMatrix[0].xyz);
      world.xyz += sideways * (uv.x * 2.0 - 1.0) * reach;
      world.xyz += normalize(world.xyz - uCamPos) * reach;
    }
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uFocus;
  uniform float uEmission;
  uniform float uLightIntensity;
  uniform float uLayer;
  uniform vec3 uCamPos;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vNear;
  varying float vCell;
  void main() {
    /*
      LAS DOS CELDAS NO PESAN LO MISMO, y ahí se juega la lectura entera.

      Un hipercubo proyectado son dos cubos —el de dentro y el de fuera— unidos
      por ocho tirantes. Con las treinta y dos aristas al mismo valor eso es
      una jaula: el ojo ve un dibujo plano de líneas cruzadas y no encuentra
      qué contiene a qué. vCell es la profundidad en la CUARTA dimensión, 1 en
      la celda que ahora mismo está más cerca y 0 en la lejana, y reparte con
      ella la luz —y, en la geometría, el grosor—. Es la misma idea que ordena
      la escena en 3D con vNear, un eje más adentro.
    */
    float hierarchy = 0.26 + 0.52 * vCell + 0.22 * vNear;
    vec3 n = normalize(vNormal);
    vec3 view = normalize(uCamPos - vWorld);
    vec3 light = normalize(-vWorld);
    float facing = abs(dot(n, view));
    float fresnel = pow(1.0 - facing, 2.3);
    float key = max(0.0, dot(n, light));
    float reflection = pow(max(0.0, dot(n, normalize(view + light))), 28.0);
    vec3 cyan = vec3(0.24, 0.81, 1.0);
    vec3 violet = vec3(0.57, 0.36, 1.0);
    vec3 spectral = mix(cyan, violet, 0.5 + 0.5 * sin(vUv.y * 0.31 + n.y * 2.0));
    if (uLayer > 1.5) {
      /*
        Membranas: seis de las veinticuatro caras, y sólo a contraluz.

        Con las veinticuatro llenas esto sería un cubo translúcido, que es lo
        contrario de lo que se pide: el vidrio se lee por el canto, no por el
        relleno. Las de delante pesan el doble que las de detrás, porque lo
        que tiene que verse cambiar es el PLANO, y un plano sin frente ni
        fondo no cambia, parpadea.
      */
      vec3 colour = spectral * (0.055 + fresnel * 0.17) + vec3(1.0, 0.78, 0.48) * reflection * 0.13;
      float presence = 0.32 + 0.68 * hierarchy;
      gl_FragColor = vec4(colour * presence, (0.013 + fresnel * 0.058) * presence + uFocus * 0.018);
    } else if (uLayer > 0.5) {
      /*
        Un circuito euleriano continuo: la punta escribe, la estela se apaga.

        Recorre las treinta y dos aristas en dieciocho segundos sin levantar
        el lápiz ni teletransportarse —de eso se encarga TESSERACT_PATH—, así
        que aquí sólo hace falta la EDAD de cada punto del recorrido: cuánto
        hace que pasó la punta por él. La resta va en módulo 32 para que el
        salto de vuelta al inicio no parta la estela por la mitad.

        Tres términos y no uno: la punta (blanca y corta, es la que escribe),
        el halo alrededor de la punta (lo que hace que se lea como luz y no
        como un segmento encendido) y la estela larga, que es la que deja ver
        POR DÓNDE ha pasado sin competir con el frente.
      */
      float head = mod(uTime * (32.0 / 18.0), 32.0);
      float age = mod(head - vUv.y + 32.0, 32.0);
      /*
        MENOS COMETA, MÁS TRAZO. La estela conserva su longitud —trece aristas,
        que es lo que deja seguir la geometría recién construida— y lo que
        encoge es la PUNTA: el exponente sube de 14 a 22, o sea un 20 % menos
        de extensión, y su ganancia y su halo bajan con ella. El orden de
        lectura que se busca es Tesseracto primero y recorrido después; con la
        punta anterior el ojo iba a la bolita y volvía luego a la figura.
      */
      float trail = pow(1.0 - smoothstep(0.0, 13.0, age), 1.5);
      float tip = exp(-age * age * 22.0);
      float glow = exp(-age * age * 1.9);
      vec3 colour = mix(spectral, vec3(0.93, 0.99, 1.0), tip * 0.92 + glow * 0.30);
      float weight = max(trail * 0.62 + glow * 0.24, tip * 0.86);
      gl_FragColor = vec4(colour * (1.15 + tip * 2.0 + uFocus * 0.45) * uEmission, weight);
    } else {
      /*
        Cristal oscuro, no alambre.

        El cuerpo del vidrio es casi negro; lo que dibuja la figura es el
        FILETE especular del disco sobre el canto, que sólo aparece donde la
        geometría mira a Gargantúa. Por eso una arista de delante y otra de
        detrás no valen lo mismo aunque midan lo mismo en pantalla.

        Ni la clave ni el fresnel bajan a cero, y es deliberado: con la
        emisión y el bloom apagados la silueta tiene que seguir entera. Ése es
        el bloom-off test del contrato visual, y el trazo —que es emisivo— no
        cuenta para pasarlo.

        El nivel general SUBE respecto de la primera pasada, y no la
        contradice: lo que hacía ilegible la figura no era la exposición sino
        la falta de jerarquía. Con las dos celdas repartidas se puede subir el
        valor sin volver al alambre, porque lo que crece es el contraste
        interno y no la luminancia media.
      */
      /*
        TRES NIVELES DENTRO DE DOS PÍXELES: núcleo, cuerpo y halo.

        Una arista de valor plano se lee como «línea con opacity» por mucho
        volumen que tenga la malla. Lo que dice «material» es que el centro y
        el canto NO valgan lo mismo. El parámetro que los separa ya estaba
        aquí: en un tubo, la normal mira a la cámara en la línea central
        —facing cerca de 1— y se va de canto en los bordes. Así que:

         · núcleo, pow(facing, 7): blanco frío, estrechísimo, es el que
           convierte la sección en algo con centro;
         · cuerpo, cian/violeta translúcido, que es casi toda la superficie;
         · halo, el fresnel del canto, casi inexistente — y sólo se enciende
           donde la energía acaba de pasar, que es lo que pidió dirección.

        No sube el grosor de nada. La presencia extra sale del contraste dentro
        de la sección, que es exactamente lo contrario de engordar la arista:
        engordarla nos devolvería a la jaula.
      */
      float core = pow(facing, 7.0);
      float since = mod(mod(uTime * (32.0 / 18.0), 32.0) - vUv.y + 32.0, 32.0);
      float energy = pow(1.0 - smoothstep(0.0, 9.0, since), 2.0);
      vec3 colour = spectral * (0.020 + fresnel * 0.052)
        + vec3(0.82, 0.94, 1.0) * core * (0.040 + 0.036 * vCell)
        + vec3(0.65, 0.77, 0.85) * key * uLightIntensity * 0.058
        + vec3(1.0, 0.84, 0.61) * reflection * 0.46;
      /*
        Y la arista que mira a Gargantúa se contamina de ella. Un 3.5 % de
        temperatura cálida sobre la clave: no la vuelve ámbar —eso rompería la
        familia fría que la separa del resto del sistema— pero hace que el
        cuerpo PERTENEZCA al mismo espacio físico aunque su material sea
        imposible. Sólo se nota comparando dos caras.
      */
      colour += vec3(1.0, 0.72, 0.42) * key * key * uLightIntensity * 0.035;
      colour *= hierarchy;
      colour += spectral * fresnel * energy * 0.055 * uEmission;
      colour += cyan * uFocus * (0.07 + fresnel * 0.15);
      gl_FragColor = vec4(colour, 1.0);
    }
  }
`;

function material(layer: number) {
  const occluder = layer < 0;
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT,
    transparent: layer > 0, depthWrite: layer === 0 || occluder,
    depthTest: layer !== 1, side: layer === 2 ? THREE.DoubleSide : THREE.FrontSide,
    colorWrite: !occluder,
    forceSinglePass: true,
    blending: layer === 1 ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 }, uFocus: { value: 0 }, uEmission: { value: 1 },
      uCamPos: { value: new THREE.Vector3() }, uLightIntensity: { value: 1 },
      uLayer: { value: layer }, uDepthPush: { value: 0.062 },
    },
  });
}

function tubeGeometry() {
  const geometry = new THREE.BufferGeometry();
  const count = TESSERACT_PATH.length * 6 * 4;
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aCell", new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
  const uv = new Float32Array(count * 2), indices: number[] = [];
  for (let edge = 0; edge < TESSERACT_PATH.length; edge++) {
    for (let side = 0; side < 6; side++) {
      const base = (edge * 6 + side) * 4;
      uv.set([0, edge, 0, edge + 1, 1, edge + 1, 1, edge], base * 2);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.56);
  return geometry;
}

/** Cuatro vértices por arista: los dos extremos, cada uno duplicado a los dos
 *  lados. El ancho lo pone el vertex shader, orientado a la cámara. */
function haloGeometry() {
  const geometry = new THREE.BufferGeometry();
  const count = TESSERACT_PATH.length * 4;
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aCell", new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
  const uv = new Float32Array(count * 2), indices: number[] = [];
  for (let edge = 0; edge < TESSERACT_PATH.length; edge++) {
    const base = edge * 4;
    uv.set([0, edge, 0, edge + 1, 1, edge + 1, 1, edge], base * 2);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.56);
  return geometry;
}

/**
 * Dieciséis vértices, treinta y dos aristas de vidrio con volumen real, un
 * lápiz que las recorre y cuatro draws: oclusión, cristal, trazo y membranas.
 *
 * Cuatro materiales y no uno, al revés que el corredor que sustituye. Aquí la
 * diferencia entre capas no es de acabado sino de MEZCLA —el trazo es aditivo
 * y no escribe profundidad, las membranas son translúcidas a dos caras, el
 * cristal es opaco y la oclusión no escribe color—, y eso no cabe en un ramo
 * del fragment.
 *
 * ── Por qué hay una cuarta capa que no se ve ────────────────────────────────
 *
 * El cristal ya se ocultaba a sí mismo: es geometría sólida con profundidad,
 * así que una arista de detrás YA quedaba tapada donde pasa por debajo de otra.
 * El problema es que la tapaba durante los dos píxeles que mide el tubo, y dos
 * píxeles no se leen: las dos líneas seguían pareciendo igual de presentes en
 * el cruce.
 *
 * Esta capa es el truco de la ilustración técnica de toda la vida: un tubo
 * GORDO que sólo escribe profundidad, así que la arista de detrás se interrumpe
 * unos píxeles alrededor de la intersección en vez de justo debajo. Y como el
 * corte lo decide la profundidad real, cuando la rotación 4D invierte la
 * relación, la interrupción se invierte con ella — que es donde aparece la
 * sensación de espacio imposible.
 *
 * Sus extremos se retraen un 13 %: sin eso, el tubo gordo de una arista se
 * comería a sus vecinas justo en los vértices, donde todas se tocan, y la
 * figura saldría mordida por las esquinas.
 */
export function createTesseractModel() {
  const root = new THREE.Object3D();
  const materials = [material(0), material(1), material(2), material(-1)];
  const ribs = new THREE.Mesh(tubeGeometry(), materials[0]);
  const ink = new THREE.Mesh(tubeGeometry(), materials[1]);
  const occluder = new THREE.Mesh(haloGeometry(), materials[3]);
  const filmGeometry = new THREE.BufferGeometry();
  filmGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6 * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  filmGeometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(6 * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  filmGeometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(Array.from({ length: 6 }, () => [0, 0, 1, 0, 1, 1, 0, 1]).flat()), 2));
  filmGeometry.setAttribute("aCell", new THREE.BufferAttribute(new Float32Array(6 * 4), 1).setUsage(THREE.DynamicDrawUsage));
  filmGeometry.setIndex(Array.from({ length: 6 }, (_, i) => [i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3]).flat());
  filmGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.56);
  const film = new THREE.Mesh(filmGeometry, materials[2]);
  ribs.name = "tesseract-crystal-edges";
  ink.name = "tesseract-drawing-light";
  film.name = "tesseract-glass-facets";
  occluder.name = "tesseract-crossing-occluder";
  occluder.renderOrder = -1; film.renderOrder = 1; ink.renderOrder = 2;
  root.add(occluder, ribs, film, ink);
  const points = new Float32Array(48), cells = new Float32Array(16);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), axis = new THREE.Vector3();
  const across = new THREE.Vector3(), normal = new THREE.Vector3(), radial = new THREE.Vector3();
  const temp = new THREE.Vector3();
  const animate = (seconds: number) => {
    sampleTesseract(seconds, points, cells);
    for (const [mesh, base] of [[ribs, 0.028], [ink, 0.024]] as const) {
      const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      const normals = mesh.geometry.getAttribute("normal") as THREE.BufferAttribute;
      const cell = mesh.geometry.getAttribute("aCell") as THREE.BufferAttribute;
      TESSERACT_PATH.forEach(([from, to], edge) => {
        /*
          El GROSOR también cuenta la cuarta dimensión, y es la otra mitad de
          lo que hace legible la figura: la celda cercana en w se dibuja con
          trazo grueso y la lejana con trazo fino, como lo haría cualquiera a
          mano. Sale gratis porque el tubo se reconstruye entero en cada
          muestra.
        */
        const radius = base * (0.58 + 0.84 * (cells[from] + cells[to]) * 0.5);
        a.fromArray(points, from * 3); b.fromArray(points, to * 3);
        axis.subVectors(b, a).normalize();
        normal.set(0, 1, 0);
        if (Math.abs(axis.y) > 0.9) normal.set(1, 0, 0);
        across.crossVectors(axis, normal).normalize();
        normal.crossVectors(across, axis).normalize();
        for (let side = 0; side < 6; side++) {
          for (let corner = 0; corner < 4; corner++) {
            const angle = (side + (corner > 1 ? 1 : 0)) * Math.PI / 3;
            /*
              La normal va POR ESQUINA y no por faceta, y ésa es la diferencia
              entre una varilla y una cinta. Con la normal de la faceta,
              facing —el parametro que separa núcleo, cuerpo y halo— salta en
              seis escalones: una cara encendida, las vecinas apagadas, y a dos
              píxeles eso se lee como una tira plana con un filo duro. Interpolada
              alrededor del tubo, el núcleo blanco cae donde tiene que caer, en el
              centro de la sección, y la arista pasa a tener redondez.
            */
            radial.copy(across).multiplyScalar(Math.cos(angle)).addScaledVector(normal, Math.sin(angle));
            temp.copy(corner === 1 || corner === 2 ? b : a)
              .addScaledVector(across, Math.cos(angle) * radius)
              .addScaledVector(normal, Math.sin(angle) * radius);
            const index = (edge * 6 + side) * 4 + corner;
            position.setXYZ(index, temp.x, temp.y, temp.z);
            normals.setXYZ(index, radial.x, radial.y, radial.z);
            cell.setX(index, corner === 1 || corner === 2 ? cells[to] : cells[from]);
          }
        }
      });
      position.needsUpdate = true; normals.needsUpdate = true; cell.needsUpdate = true;
    }
    /*
      La cinta de oclusión: los dos extremos retraídos un 13 % hacia el centro,
      con el eje de la arista en la normal. Sin la retracción, el ensanchado de
      una arista se comería a sus vecinas justo en los vértices, donde todas se
      tocan, y la figura saldría mordida por las esquinas.
    */
    const haloPosition = occluder.geometry.getAttribute("position") as THREE.BufferAttribute;
    const haloNormal = occluder.geometry.getAttribute("normal") as THREE.BufferAttribute;
    const haloCell = occluder.geometry.getAttribute("aCell") as THREE.BufferAttribute;
    TESSERACT_PATH.forEach(([from, to], edge) => {
      a.fromArray(points, from * 3); b.fromArray(points, to * 3);
      temp.copy(b).sub(a).multiplyScalar(0.13);
      a.add(temp); b.sub(temp);
      axis.subVectors(b, a).normalize();
      for (let corner = 0; corner < 4; corner++) {
        const end = corner === 1 || corner === 2;
        const index = edge * 4 + corner;
        haloPosition.setXYZ(index, end ? b.x : a.x, end ? b.y : a.y, end ? b.z : a.z);
        haloNormal.setXYZ(index, axis.x, axis.y, axis.z);
        haloCell.setX(index, cells[end ? to : from]);
      }
    });
    haloPosition.needsUpdate = true; haloNormal.needsUpdate = true; haloCell.needsUpdate = true;
    const facePosition = filmGeometry.getAttribute("position") as THREE.BufferAttribute;
    const faceCell = filmGeometry.getAttribute("aCell") as THREE.BufferAttribute;
    TESSERACT_FACETS.forEach((face, i) => face.forEach((vertex, corner) => {
      facePosition.setXYZ(i * 4 + corner, points[vertex * 3], points[vertex * 3 + 1], points[vertex * 3 + 2]);
      faceCell.setX(i * 4 + corner, cells[vertex]);
    }));
    facePosition.needsUpdate = true; faceCell.needsUpdate = true;
    filmGeometry.computeVertexNormals();
    // La envolvente MEDIDA se mantiene constante en toda fase, extremos de los
    // tubos incluidos: `modelRadius` recorre vértices, no el centro del eje.
    const pos = ribs.geometry.getAttribute("position");
    let radius = 0;
    for (let i = 0; i < pos.count; i++) radius = Math.max(radius, Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)));
    const scale = 1.56 / radius;
    for (const mesh of [ribs, ink, film, occluder]) {
      const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) position.setXYZ(i, position.getX(i) * scale, position.getY(i) * scale, position.getZ(i) * scale);
      position.needsUpdate = true;
    }
    for (const m of materials) m.uniforms.uTime.value = seconds;
  };
  animate(0);
  return { root, materials, animate };
}
