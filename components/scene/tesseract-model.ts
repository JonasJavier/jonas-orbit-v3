import * as THREE from "three";
import { sampleTesseract, TESSERACT_FACETS, TESSERACT_PATH } from "@/lib/tesseract";

const VERTEX = /* glsl */ `
  uniform vec3 uCamPos;
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
      vec3 colour = spectral * (0.07 + fresnel * 0.24) + vec3(1.0, 0.78, 0.48) * reflection * 0.16;
      float presence = 0.32 + 0.68 * hierarchy;
      gl_FragColor = vec4(colour * presence, (0.024 + fresnel * 0.11) * presence + uFocus * 0.022);
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
      float trail = pow(1.0 - smoothstep(0.0, 13.0, age), 1.5);
      float tip = exp(-age * age * 14.0);
      float glow = exp(-age * age * 1.4);
      vec3 colour = mix(spectral, vec3(0.93, 0.99, 1.0), tip * 0.92 + glow * 0.35);
      float weight = max(trail * 0.62 + glow * 0.30, tip);
      gl_FragColor = vec4(colour * (1.15 + tip * 2.5 + uFocus * 0.45) * uEmission, weight);
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
      vec3 colour = spectral * (0.022 + fresnel * 0.062)
        + vec3(0.65, 0.77, 0.85) * key * uLightIntensity * 0.070
        + vec3(1.0, 0.84, 0.61) * reflection * 0.46;
      colour *= hierarchy;
      colour += cyan * uFocus * (0.07 + fresnel * 0.15);
      gl_FragColor = vec4(colour, 1.0);
    }
  }
`;

function material(layer: number) {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT,
    transparent: layer > 0, depthWrite: layer === 0,
    depthTest: layer !== 1, side: layer === 2 ? THREE.DoubleSide : THREE.FrontSide,
    forceSinglePass: true,
    blending: layer === 1 ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 }, uFocus: { value: 0 }, uEmission: { value: 1 },
      uCamPos: { value: new THREE.Vector3() }, uLightIntensity: { value: 1 },
      uLayer: { value: layer },
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

/**
 * Dieciséis vértices, treinta y dos aristas de vidrio con volumen real, un
 * lápiz que las recorre y tres draws: cristal, trazo y membranas.
 *
 * Tres materiales y no uno, al revés que el corredor que sustituye. Aquí la
 * diferencia entre capas no es de acabado sino de MEZCLA —el trazo es aditivo
 * y no escribe profundidad, las membranas son translúcidas a dos caras y el
 * cristal es opaco—, y eso no cabe en un ramo del fragment.
 */
export function createTesseractModel() {
  const root = new THREE.Object3D();
  const materials = [material(0), material(1), material(2)];
  const ribs = new THREE.Mesh(tubeGeometry(), materials[0]);
  const ink = new THREE.Mesh(tubeGeometry(), materials[1]);
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
  film.renderOrder = 1; ink.renderOrder = 2;
  root.add(ribs, film, ink);
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
          const centre = (side + 0.5) * Math.PI / 3;
          radial.copy(across).multiplyScalar(Math.cos(centre)).addScaledVector(normal, Math.sin(centre));
          for (let corner = 0; corner < 4; corner++) {
            const angle = (side + (corner > 1 ? 1 : 0)) * Math.PI / 3;
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
    for (const mesh of [ribs, ink, film]) {
      const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) position.setXYZ(i, position.getX(i) * scale, position.getY(i) * scale, position.getZ(i) * scale);
      position.needsUpdate = true;
    }
    for (const m of materials) m.uniforms.uTime.value = seconds;
  };
  animate(0);
  return { root, materials, animate };
}
