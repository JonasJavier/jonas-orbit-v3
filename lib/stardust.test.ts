import { describe, expect, it } from "vitest";
import {
  createStardustPool,
  spawnStardust,
  STARDUST_PROFILES,
  STARDUST_MAX_LIFETIME_MS,
  STARDUST_MIN_LIFETIME_MS,
  updateStardust,
} from "./stardust";

function fixedRandom(value: number) {
  return () => value;
}

describe("stardust pool", () => {
  it("preasigna buffers tipados y nunca supera su capacidad", () => {
    const pool = createStardustPool(8);

    expect(pool.x).toBeInstanceOf(Float32Array);
    expect(pool.active).toBeInstanceOf(Uint8Array);
    for (let index = 0; index < 12; index += 1) {
      spawnStardust(pool, 100, 100, 1.5, 0, 16, fixedRandom(0.4));
    }

    expect(pool.capacity).toBe(8);
    expect(pool.activeCount).toBe(8);
    expect(pool.x).toHaveLength(8);
  });

  it("conserva en flat el rastro aprobado de 1–14 motas", () => {
    const pool = createStardustPool(30);

    // Puntero prácticamente quieto: no hay gesto que acompañar.
    expect(spawnStardust(pool, 0, 0, 0.01, 0, 16, fixedRandom(0.5))).toBe(0);
    // Movimiento mínimo: una mota, no un chorro.
    expect(spawnStardust(pool, 0, 0, 0.03, 0, 16, fixedRandom(0.5))).toBe(1);
    // Barrido violento: el techo, y el tramo sembrado se corta por su tope.
    expect(spawnStardust(pool, 0, 0, 20, 0, 16, fixedRandom(0.5))).toBe(14);
  });

  it("aplica en WebGL su propio perfil de 1–9 motas de cuerpo más finas", () => {
    const pool = createStardustPool(STARDUST_PROFILES.webgl.capacity);
    // 9 de cuerpo + round(9 × 0.55) = 5 finas.
    expect(
      spawnStardust(
        pool,
        0,
        0,
        20,
        0,
        16,
        fixedRandom(0.5),
        "webgl",
      ),
    ).toBe(14);
    expect(pool.capacity).toBe(640);
    expect(pool.lifetime[0]).toBeGreaterThanOrEqual(
      STARDUST_PROFILES.webgl.minLifetimeMs,
    );
    expect(pool.lifetime[0]).toBeLessThanOrEqual(
      STARDUST_PROFILES.webgl.maxLifetimeMs,
    );
  });

  it("mantiene el rastro de WebGL como instrumentación y no como cometa", () => {
    /*
      El pase de instrumentación (2026-09-06) puso números al encargo, y esta
      prueba los fija en la unidad en la que se pidieron. Ninguna de las tres
      primeras se puede leer de un solo campo del perfil, que es justamente por
      lo que existían las confusiones que costaron el pase anterior.

      · DENSIDAD en motas por PÍXEL RECORRIDO, no por evento. `maxBurst` no es
        «motas por evento» desde que hay dos calibres, y `trailStepPx` solo no
        dice nada sin `fineShare`. Lo que se ve es (1 + fineShare)/trailStepPx.
      · COLA en tiempo VISIBLE, no en vida del pool. `fadePower` decide qué
        fracción de la vida está por encima del umbral de visión, así que una
        vida más corta con exponente más plano puede no acortar nada.
      · TAMAÑO en radio medio, que es el único sitio donde `sizeBase`,
        `sizePower` y `sizeRange` significan algo juntos.

      Y las tres tienen SUELO además de techo, que es la lección de la primera
      pasada: se cumplió la horquilla del encargo en las tres a la vez, las
      reducciones se multiplicaron —21 % de densidad × un cuarto de área × 0.8
      de alfa— y el rastro se quedó en un 4 % de masa luminosa. El dueño abrió
      la escena y dijo que casi no había polvo. Un techo sin suelo no describe
      un rastro discreto; describe cualquier cosa por debajo, incluido nada.

      La cola es la excepción y sigue teniendo el techo apretado: de las cuatro
      quejas, los arcos cruzando zonas vacías los resolvía ella sola.
    */
    const webgl = STARDUST_PROFILES.webgl;
    const flat = STARDUST_PROFILES.flat;

    /* El punto de comparación es el WebGL ANTERIOR, no `flat`: los porcentajes
       del encargo se dieron sobre lo que había en pantalla, y `flat` nunca tuvo
       calibre fino ni esta vida. Los tres valores viejos quedan escritos aquí
       para que la horquilla se pueda releer sin git. */
    const beforeDensity = (1 + 0.75) / 6.5;
    const beforeVisible = ((560 + 1_000) / 2) * (1 - Math.pow(0.1, 1 / 1.2));
    const beforeRadius = 0.74 + (2.3 + 0.95) / (2.3 + 1);

    const density = (p: typeof webgl | typeof flat) =>
      (1 + p.fineShare) / p.trailStepPx;
    expect(density(webgl)).toBeLessThan(beforeDensity * 0.65);
    expect(density(webgl)).toBeGreaterThan(beforeDensity * 0.45);

    // Vida media × fracción visible de esa vida. La fracción sale de resolver
    // restante^fadePower = 0.1, el umbral por debajo del cual la mota deja de
    // leerse sobre el disco.
    const visible = (p: typeof webgl | typeof flat) =>
      ((p.minLifetimeMs + p.maxLifetimeMs) / 2) *
      (1 - Math.pow(0.1, 1 / p.fadePower));
    expect(visible(webgl)).toBeLessThan(beforeVisible * 0.4);
    expect(visible(webgl)).toBeGreaterThan(beforeVisible * 0.3);

    // Radio medio de una mota de cuerpo a velocidad 1: la esperanza de
    // random^sizePower es 1/(sizePower + 1).
    const radius = (p: typeof webgl | typeof flat) =>
      p.sizeBase + (p.sizeRange + p.sizeSpeed) / (p.sizePower + 1);
    /* El calibre dejó de ser una palanca de recorte: lo que fabrica la
       sensación de arco es la densidad, y el radio sólo decide si una mota se
       ve. Lo que sigue vigilado es que no crezca por encima del rastro de
       `flat`, que es el límite acordado del efecto. */
    expect(radius(webgl)).toBeLessThanOrEqual(beforeRadius);
    expect(radius(webgl)).toBeLessThan(radius(flat));

    /* La ventana de tonos de WebGL vive ENTERA en la mitad fría de la paleta:
       el rastro no puede volver a introducir magenta en una navegación que ya
       había convergido al cian. Los tres primeros tonos son el rastro violeta
       de `flat` y no se tocan. */
    expect(webgl.toneFirst).toBeGreaterThanOrEqual(3);
    expect(flat.toneLast).toBeLessThan(webgl.toneFirst + 1);

    expect(webgl.peakAlpha).toBeLessThan(flat.peakAlpha);
    expect(webgl.maxBurst).toBeLessThan(flat.maxBurst);
    /* Si `fineSizeScale` se acercara a 1, «fina» pasaría a ser una segunda capa
       de cuerpo por la puerta de atrás y el tope de ráfaga dejaría de proteger
       nada. */
    expect(webgl.fineSizeScale).toBeLessThan(0.5);
    expect(webgl.maxLifetimeMs).toBeLessThanOrEqual(flat.maxLifetimeMs);
  });

  it("siembra WebGL sólo con tonos fríos y flat sólo con los suyos", () => {
    // El reparto es aleatorio, así que se recorre la ventana entera en vez de
    // fiarse de una muestra: `flat` no puede tocar el frío ni WebGL el violeta.
    for (const draw of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) {
      const cold = createStardustPool(20);
      spawnStardust(cold, 0, 0, 20, 0, 16, fixedRandom(draw), "webgl");
      for (let index = 0; index < cold.capacity; index += 1) {
        if (cold.active[index] === 0) continue;
        expect(cold.tone[index]).toBeGreaterThanOrEqual(3);
        expect(cold.tone[index]).toBeLessThanOrEqual(5);
      }

      const warm = createStardustPool(20);
      spawnStardust(warm, 0, 0, 20, 0, 16, fixedRandom(draw), "flat");
      for (let index = 0; index < warm.capacity; index += 1) {
        if (warm.active[index] === 0) continue;
        expect(warm.tone[index]).toBeLessThanOrEqual(3);
      }
    }
  });

  it("la mota fina se suma a la de cuerpo, no la sustituye", () => {
    // La petición fue «aparte de las partículas que están»: el rastro aprobado
    // no pierde ninguna mota y el grano fino se añade encima.
    const pool = createStardustPool(STARDUST_PROFILES.webgl.capacity);
    const total = spawnStardust(pool, 0, 0, 20, 0, 16, fixedRandom(0.5), "webgl");

    let body = 0;
    let fine = 0;
    for (let index = 0; index < pool.capacity; index += 1) {
      if (pool.active[index] === 0) continue;
      if (pool.fine[index] === 1) fine += 1;
      else body += 1;
    }

    expect(body).toBe(STARDUST_PROFILES.webgl.maxBurst);
    expect(fine).toBe(total - body);
    expect(fine).toBeGreaterThan(0);
  });

  it("la mota fina es realmente más fina que la de cuerpo", () => {
    // Con el mismo `random` fijo las dos clases sólo se diferencian por la
    // escala, así que el cociente tiene que ser exactamente `fineSizeScale`.
    const pool = createStardustPool(STARDUST_PROFILES.webgl.capacity);
    spawnStardust(pool, 0, 0, 20, 0, 16, fixedRandom(0.5), "webgl");

    let body = 0;
    let fine = 0;
    for (let index = 0; index < pool.capacity; index += 1) {
      if (pool.active[index] === 0) continue;
      if (pool.fine[index] === 1) fine = pool.size[index];
      else body = pool.size[index];
    }

    expect(fine).toBeLessThan(body);
    expect(fine / body).toBeCloseTo(STARDUST_PROFILES.webgl.fineSizeScale, 5);
  });

  it("el perfil flat no siembra ninguna mota fina", () => {
    // `flat` es el rastro congelado: el calibre nuevo no puede filtrarse ahí.
    const pool = createStardustPool(40);
    spawnStardust(pool, 0, 0, 20, 0, 16, fixedRandom(0.5), "flat");

    expect(STARDUST_PROFILES.flat.fineShare).toBe(0);
    for (let index = 0; index < pool.capacity; index += 1) {
      expect(pool.fine[index]).toBe(0);
    }
  });

  it("la caída del alfa nunca crece con la edad de la mota", () => {
    // `fadePower` es el único parámetro que puede convertir el rastro en una
    // mancha permanente: por debajo de 1 la curva se vuelve cóncava y la mota
    // se pasa media vida a brillo casi pleno.
    for (const profile of Object.values(STARDUST_PROFILES)) {
      expect(profile.fadePower).toBeGreaterThanOrEqual(1);
    }
  });

  it("una pausa larga no dibuja una raya que el gesto nunca recorrió", () => {
    // Puntero que vuelve a la ventana tras dos segundos fuera: el tramo entre
    // muestras es enorme, pero lo que se siembra está acotado.
    const pool = createStardustPool(30);
    expect(spawnStardust(pool, 900, 400, 0.9, 0, 2_000, fixedRandom(0.5))).toBe(
      10,
    );

    let furthest = 900;
    for (let index = 0; index < pool.capacity; index += 1) {
      if (pool.active[index]) furthest = Math.min(furthest, pool.x[index]);
    }

    expect(900 - furthest).toBeLessThanOrEqual(64 * 0.9 + 6);
  });

  it("siembra la estela sobre el tramo ya recorrido, no en un punto", () => {
    // Emitir todas las motas en la posición actual deja huecos en cuanto el
    // puntero corre; lo que se comprueba aquí es que ocupan el tramo entero.
    const pool = createStardustPool(30);
    const count = spawnStardust(pool, 400, 200, 1.2, 0, 16, fixedRandom(0.5));
    expect(count).toBeGreaterThan(1);

    const xs: number[] = [];
    for (let index = 0; index < pool.capacity; index += 1) {
      if (pool.active[index]) xs.push(pool.x[index]);
    }

    expect(xs).toHaveLength(count);
    // Nada por delante del puntero, y el tramo de ~19 px queda cubierto.
    expect(Math.max(...xs)).toBeLessThanOrEqual(400);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(10);
  });

  it("mantiene las vidas dentro del rango declarado y libera todo el pool", () => {
    const pool = createStardustPool(12);
    spawnStardust(pool, 20, 20, 1, 0, 16, fixedRandom(0.35));

    for (let index = 0; index < pool.capacity; index += 1) {
      if (!pool.active[index]) continue;
      expect(pool.lifetime[index]).toBeGreaterThanOrEqual(
        STARDUST_MIN_LIFETIME_MS,
      );
      expect(pool.lifetime[index]).toBeLessThanOrEqual(
        STARDUST_MAX_LIFETIME_MS,
      );
    }

    expect(updateStardust(pool, STARDUST_MAX_LIFETIME_MS + 1)).toBe(0);
  });
});
