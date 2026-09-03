import io

p = "components/scene/gargantua-shaders.ts"
s = io.open(p, encoding="utf-8", newline="").read()


def sub(old, new):
    global s
    old = old.replace("\n", "\r\n")
    new = new.replace("\n", "\r\n")
    assert s.count(old) == 1, (s.count(old), old[:80])
    s = s.replace(old, new)


old_block = """  /*
    CAMPO MACRO. Es la pieza que faltaba, y la que decide la lectura.

    Todo lo que había —deformación, corrientes, grano, carriles, cortes— vivía
    entre λ ≈ 6 y λ ≈ 0.27 en unidades de mundo, sobre un disco de 48 de
    diámetro. Ni un solo campo describía la escala del disco ENTERO, y por eso
    el resultado era densidad procedural uniforme: mucha estructura pequeña
    repartida por igual, ningún sitio donde el material se acumule y ninguno
    donde falte.

    Éste va a λ ≈ 18 y λ ≈ 7.6, o sea cuartos y octavos de disco. De él salen
    las grandes masas densas, las regiones calientes y los huecos, y como se
    muestrea en el marco corrotado esas masas nacen ya estiradas a lo largo de
    la dirección orbital: son corrientes anchas que se funden y se bifurcan, no
    manchas.

    Sale casi por el precio de nada: sus dos primeras evaluaciones son las
    mismas que antes se gastaban sólo en desplazar el dominio.
  */
  vec2 macroP = sheared * 0.076;
  float m1 = valueNoise(macroP + 4.1);
  float m2 = valueNoise(macroP + 19.3);
  vec2 coarse = vec2(m1, m2) - 0.5;
  float macro = m1 * 0.62 + valueNoise(macroP * 2.35 + 12.7) * 0.38;

  vec2 warped = sheared + (vec2(wa, wb) - 0.5) * 2.6 + coarse * 9.0;

  /*
    LA DEFORMACIÓN DE DOMINIO MULTIPLICA LA FRECUENCIA REAL, y el corte por
    huella no lo sabía.

    fbmAA recibe cuántas celdas de la octava base caben en un píxel, y se le
    pasaba la frecuencia NOMINAL. Pero el campo no se muestrea en sheared, se
    muestrea en warped, y el jacobiano de esa deformación vale del orden de 2
    (1.55 del término fino más 0.74 del grueso, sumados sobre la identidad). O
    sea que la frecuencia que llega a la pantalla es casi el doble de la que se
    estaba filtrando, y de ahí salía el hervor residual al bajar el DPR. La
    constante es una estimación del jacobiano, no un fudge: cambia si cambian
    las dos amplitudes de arriba.
  */
  const float WARP_GAIN = 1.25;

  /*
    JERARQUÍA RADIAL. La corrección anterior se quedó a medio camino.

    El ruido pasó de frecuencia fija a compress entre 1.95 y 0.58: un factor
    3.4 sobre un rango de radios de 10.8. En unidades ANGULARES —que son las que
    ve el ojo— eso deja al exterior con 3.2 veces MÁS detalle que al interior,
    exactamente lo contrario de lo que cuenta un disco de acreción y buena parte
    de la lectura de «vetas».

    Con 2.60 → 0.28 el factor es 9.3 sobre 10.8: la frecuencia angular queda
    prácticamente plana y la radial cae hacia fuera. El exterior se abre en
    corrientes anchas y lentas; el interior queda comprimido.
  */
  float compress = mix(2.60, 0.44, smoothstep(0.02, 0.82, t + (wa - 0.5) * 0.22));
  float streamFreq = 0.62 * compress;
"""

new_block = """  /*
    JERARQUÍA RADIAL, y ahora manda sobre TODAS las escalas.

    La corrección anterior se quedó a medio camino: el ruido pasó de frecuencia
    fija a compress entre 1.95 y 0.58, un factor 3.4 sobre un rango de radios de
    10.8. En unidades ANGULARES —que son las que ve el ojo— eso deja al exterior
    con 3.2 veces MÁS detalle que al interior, exactamente lo contrario de lo que
    cuenta un disco de acreción y buena parte de la lectura de «vetas».

    Con 2.60 → 0.44 el factor es 5.9 sobre 10.8: la frecuencia angular queda casi
    plana y la radial cae hacia fuera. El exterior se abre en corrientes anchas y
    lentas; el interior queda comprimido.

    Se calcula aquí arriba porque también escala el campo macro, y ése era el
    fallo del primer intento: con el macro a frecuencia fija en unidades de
    mundo, su longitud de onda era varias veces el radio interior y TODO el disco
    interno —justo la zona más brillante, la que más se mira— caía dentro de una
    sola celda. Por eso el núcleo salía liso: no era el antialias, era que ahí no
    había campo que variase.
  */
  float compress = mix(2.60, 0.44, smoothstep(0.02, 0.82, t + (wa - 0.5) * 0.22));
  float streamFreq = 0.62 * compress;

  /*
    CAMPO MACRO. Es la pieza que faltaba, y la que decide la lectura.

    Todo lo que había —deformación, corrientes, grano, carriles, cortes— vivía
    entre λ ≈ 6 y λ ≈ 0.27 en unidades de mundo, sobre un disco de 48 de
    diámetro. Ni un solo campo describía la escala de las MASAS, y por eso el
    resultado era densidad procedural uniforme: mucha estructura pequeña
    repartida por igual, ningún sitio donde el material se acumule y ninguno
    donde falte.

    Éste va a un sexto de la frecuencia de las corrientes, y con ellas: λ ≈ 4 en
    el borde interior y λ ≈ 23 en el exterior, o sea masas que ocupan siempre una
    fracción parecida del contorno a cualquier radio. Como se muestrea en el
    marco corrotado nacen ya estiradas a lo largo de la dirección orbital: son
    corrientes anchas que se funden y se bifurcan, no manchas.

    Sale casi por el precio de nada: sus dos primeras evaluaciones son las mismas
    que antes se gastaban sólo en desplazar el dominio.
  */
  vec2 macroP = sheared * (0.105 * compress);
  float m1 = valueNoise(macroP + 4.1);
  float m2 = valueNoise(macroP + 19.3);
  vec2 coarse = vec2(m1, m2) - 0.5;
  float macro = m1 * 0.62 + valueNoise(macroP * 2.35 + 12.7) * 0.38;

  /*
    Deformación de dominio, fina y gruesa. La amplitud de la gruesa va como
    1/compress a propósito: así el desplazamiento vale siempre la misma fracción
    de la longitud de onda del campo que lo genera, y su jacobiano —o sea la
    frecuencia extra que introduce— se queda constante en todo el disco en vez de
    dispararse hacia dentro, que es donde menos píxeles hay para resolverla.
  */
  vec2 warped = sheared
              + (vec2(wa, wb) - 0.5) * 2.6
              + coarse * (2.5 / compress);

  /*
    LA DEFORMACIÓN DE DOMINIO MULTIPLICA LA FRECUENCIA REAL, y el corte por
    huella no lo sabía.

    fbmAA recibe cuántas celdas de la octava base caben en un píxel, y se le
    pasaba la frecuencia NOMINAL. Pero el campo no se muestrea en sheared, se
    muestrea en warped, y el jacobiano de esa deformación vale del orden de 1.6
    (1.55 del término fino más 0.39 del grueso, sumados sobre la identidad). O
    sea que la frecuencia que llega a la pantalla es bastante más alta que la que
    se estaba filtrando, y de ahí salía el hervor residual al bajar el DPR. La
    constante es una estimación del jacobiano, no un fudge: cambia si cambian las
    dos amplitudes de arriba.
  */
  const float WARP_GAIN = 1.25;
"""

sub(old_block, new_block)

# --- Asimetria: el lado que se aleja tiene que tener MATERIAL, no un recorte.
sub("""  float boost = clamp(pow(g, 3.4), 0.13, 6.6);""",
    """  float boost = clamp(pow(g, 3.3), 0.24, 6.6);""")

# --- Rampa termica: el oro y el ambar tienen que ocupar sitio.
sub("""  vec3 tint = mix(
    vec3(1.00, 0.99, 0.96),
    vec3(1.00, 0.92, 0.72),
    smoothstep(0.00, 0.11, t)
  );
  tint = mix(tint, vec3(1.00, 0.76, 0.40), smoothstep(0.09, 0.32, t));
  tint = mix(tint, vec3(0.92, 0.50, 0.18), smoothstep(0.30, 0.64, t));
  tint = mix(tint, vec3(0.55, 0.24, 0.08), smoothstep(0.64, 1.00, t));""",
    """  vec3 tint = mix(
    vec3(1.00, 0.99, 0.96),
    vec3(1.00, 0.88, 0.62),
    smoothstep(0.00, 0.07, t)
  );
  tint = mix(tint, vec3(1.00, 0.70, 0.31), smoothstep(0.05, 0.22, t));
  tint = mix(tint, vec3(0.94, 0.47, 0.15), smoothstep(0.20, 0.52, t));
  tint = mix(tint, vec3(0.56, 0.24, 0.07), smoothstep(0.52, 1.00, t));""")

sub("""  tint = mix(tint, vec3(1.00, 0.98, 0.93), max(doppler, 0.0) * 0.60 * uDoppler);""",
    """  tint = mix(tint, vec3(1.00, 0.98, 0.93), max(doppler, 0.0) * 0.34 * uDoppler);""")

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
