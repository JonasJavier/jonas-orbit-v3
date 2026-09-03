import io

p = "components/scene/gargantua-shaders.ts"
s = io.open(p, encoding="utf-8", newline="").read()
CR = chr(13) + chr(10)


def sub(old, new):
    global s
    old = old.replace("\n", CR)
    new = new.replace("\n", CR)
    assert s.count(old) == 1, (s.count(old), old[:70])
    s = s.replace(old, new)


# ===========================================================================
# 3 · MENOS REMOLINO: el enrollado global baja, la cizalla local se mantiene.
# ===========================================================================
sub(
    """  float omega = pow(uDiskInner / r, 1.5);
  float pitch = 3.10 + 0.80 * (valueNoise(vec2(logR * 0.50, 3.7)) - 0.5);
  float twist = pitch * logR + uTime * omega * 0.30;""",
    """  float omega = pow(uDiskInner / r, 1.5);

  /*
    ENROLLADO GLOBAL vs CIZALLA LOCAL. Son dos números distintos y se estaban
    fijando con uno solo.

    La cizalla LOCAL —d(twist)/d(logR)— es la que estira el ruido y produce la
    lectura de flujo tangencial. El enrollado GLOBAL —la integral de esa cizalla
    a lo largo del radio— es la que hace que una masa macro barra media vuelta
    mientras cae hacia dentro, y es exactamente el gesto de espiral de galaxia.

    Con pitch constante a 3.10 los dos iban atados: cizalla 3.10 en todas partes
    y 3.10 × ln(17/1.58) = 7.4 rad de enrollado, o sea 1.17 vueltas de disco. De
    ahí salía la curva macro que conducía al centro por la izquierda.

    Ahora la tasa OSCILA en logR alrededor de una media baja. La media fija el
    enrollado (1.15 × 2.376 = 2.7 rad, 0.43 vueltas: un tercio del anterior) y la
    oscilación devuelve la cizalla local donde hace falta —llega a 2.5, así que
    el material se sigue estirando en tangencial— pero se cancela a lo largo del
    radio en vez de acumularse. El resultado es flujo en bandas, no un remolino.

    La primitiva de la tasa es analítica: ∫(a + b·cos(kx+φ))dx = a·x + (b/k)·sin(kx+φ).
    Nada de esto cuesta una evaluación de ruido más que antes.
  */
  const float WIND_MEAN = 1.15;
  const float WIND_SWING = 1.35;
  const float WIND_FREQ = 2.40;
  float pitchNoise = 0.55 * (valueNoise(vec2(logR * 0.50, 3.7)) - 0.5);
  float wind = WIND_MEAN * logR
             + (WIND_SWING / WIND_FREQ)
               * (sin(logR * WIND_FREQ + 1.3) - sin(1.3));
  float twist = wind + pitchNoise * logR + uTime * omega * 0.30;""",
)

# El campo macro se muestrea en el marco POCO enrollado.
sub(
    """  vec2 macroP = sheared * (0.105 * compress);""",
    """  /*
    Y el macro se muestrea en el marco POCO enrollado (shearedFine, 0.45 × twist),
    no en el completo.

    Es la otra mitad del remolino. Las corrientes finas pueden —y deben— ir muy
    cizalladas: eso es lo que las hace parecer material rápido. Pero una MASA de
    un cuarto de disco cizallada igual se convierte en un brazo espiral, que es
    justo la forma que el ojo reconoce como galaxia. Sampleándola en el marco que
    ya existe para las octavas finas, su enrollado cae a 0.45 × 0.43 = 0.19
    vueltas: las masas salen como bandas tangenciales largas en vez de como
    brazos que caen hacia el centro. Cuesta cero — ese marco ya estaba calculado.
  */
  vec2 macroP = shearedFine * (0.105 * compress);""",
)

# ===========================================================================
# 1 · JERARQUIA DE ORDENES LENSADOS.
# ===========================================================================
sub(
    """  float soften = clamp(order * 0.12, 0.0, 0.24);
  fabric = mix(fabric, 0.52, soften);
  laneMask = mix(laneMask, 0.60, soften);""",
    """  /*
    JERARQUÍA DE ÓRDENES, y el reparto anterior era plano.

    soften valía order·0.12 y nada más: los tres cruces salían con la misma
    energía y la misma opacidad, sólo con algo menos de textura. En pantalla eso
    son tres arcos concéntricos de peso parecido debajo de la sombra — aro 1, aro
    2, aro 3 — y contar aros es ver el ray marcher.

    La física dice otra cosa. Cada media vuelta extra alrededor del agujero
    demagnifica la imagen por un factor e^{-π} ≈ 0.043 en anchura: la sucesión de
    imágenes de orden superior no es una escalera suave, es una caída
    exponencial que se apelotona contra la curva crítica. Estaban saliendo
    demasiado gordas y demasiado brillantes, no demasiado nítidas.

    Así que la primera imagen lensada se queda INTACTA —order 1 con soften 0,
    textura, cortes, masas y Doppler completos, que es lo que tiene que leerse
    como el mismo plasma doblado— y a partir de la segunda entra una exponencial.
    El 1.5 es mucho más suave que el e^{-π} real: la idea es que se intuyan, no
    que desaparezcan.
  */
  float higher = max(order - 1.0, 0.0);
  float orderFade = exp(-higher * 1.5);
  float soften = clamp(higher * 0.34, 0.0, 0.60);
  fabric = mix(fabric, 0.52, soften);
  laneMask = mix(laneMask, 0.60, soften);""",
)

sub(
    """  float shred = mix(streams * 0.42 + macro * 0.58, 0.5, soften);
  density *= 1.0 - smoothstep(0.50, 1.06, t + (shred - 0.5) * 0.72);""",
    """  float shred = mix(streams * 0.42 + macro * 0.58, 0.5, soften);
  density *= 1.0 - smoothstep(0.50, 1.06, t + (shred - 0.5) * 0.72);

  // La caída exponencial por orden entra en la DENSIDAD, no en la emisión: así
  // las imágenes de orden alto pierden a la vez brillo y opacidad, y dejan de
  // tapar lo que tienen detrás. Un arco que además es translúcido deja de
  // leerse como un aro y pasa a leerse como un reflejo del mismo material.
  density *= orderFade;""",
)

# El techo del camino optico rasante era lo que volvia SOLIDOS los ordenes altos.
sub(
    """  float grazing = 1.0 / max(abs(dir.y), 0.05);
  alpha = 1.0 - exp(-density * grazing * 0.40);""",
    """  /*
    Y el TECHO del camino óptico rasante era la otra causa de los aros sólidos.

    El tope estaba en |dir.y| ≥ 0.05, o sea camino óptico hasta ×20. Los rayos
    que forman las imágenes de orden superior cruzan el plano casi paralelos a
    él, así que caían todos en el tope: con ×20, cualquier densidad razonable
    satura alpha a 1 y el arco sale opaco, brillante y además tapando lo que hay
    detrás. Tres bandas opacas concéntricas es exactamente lo que se veía.

    El tope existe porque el disco aquí es un plano sin grosor y sin él la
    integral diverge; pero 0.05 era demasiado permisivo. A 0.13 el camino máximo
    baja a ×7.7, que es lo que atravesaría un disco de grosor realista. La imagen
    directa no se entera —a 9° de elevación |dir.y| vale 0.156, por encima del
    tope— y los arcos lensados pasan de opacos a translúcidos.

    El coeficiente sube de 0.40 a 0.52 para devolver al disco primario la
    opacidad que el tope más bajo le quita de paso.
  */
  float grazing = 1.0 / max(abs(dir.y), 0.13);
  alpha = 1.0 - exp(-density * grazing * 0.52);""",
)

# ===========================================================================
# 4 · SEPARACION CROMATICA.
# ===========================================================================
sub(
    """  vec3 tint = mix(
    vec3(1.00, 0.99, 0.96),
    vec3(1.00, 0.88, 0.62),
    smoothstep(0.00, 0.07, t)
  );
  tint = mix(tint, vec3(1.00, 0.70, 0.31), smoothstep(0.05, 0.22, t));
  tint = mix(tint, vec3(0.97, 0.42, 0.10), smoothstep(0.20, 0.52, t));
  tint = mix(tint, vec3(0.58, 0.22, 0.05), smoothstep(0.52, 1.00, t));""",
    """  /*
    Y los tramos NO se solapan, que era el motivo del beige.

    Las ventanas iban 0.00-0.07, 0.05-0.22, 0.20-0.52, 0.52-1.00: cada mezcla
    empezaba a tirar hacia el color siguiente antes de que la anterior hubiera
    llegado al suyo. Así el oro nunca existe —se queda a medio camino entre crema
    y ámbar— y el ámbar nunca existe —se queda entre oro y cobre—. Interpolar en
    RGB lineal entre dos colores saturados pasa además por un centro desaturado,
    de modo que ese «a medio camino» permanente es literalmente beige.

    Ahora cada transición TERMINA antes de que arranque la siguiente, así que hay
    mesetas donde el color es el que dice ser: oro puro en t ∈ [0.11, 0.15],
    ámbar puro en [0.30, 0.36], cobre puro en [0.58, 0.64]. No sube la saturación
    global ni la exposición: sólo deja de promediar los tramos entre sí.
  */
  vec3 tint = vec3(1.00, 0.98, 0.93);
  tint = mix(tint, vec3(1.00, 0.84, 0.46), smoothstep(0.015, 0.11, t));
  tint = mix(tint, vec3(1.00, 0.60, 0.20), smoothstep(0.15, 0.30, t));
  tint = mix(tint, vec3(0.86, 0.34, 0.09), smoothstep(0.36, 0.58, t));
  tint = mix(tint, vec3(0.46, 0.15, 0.04), smoothstep(0.64, 1.00, t));""",
)

# El empuje Doppler hacia el blanco era lo que lavaba el oro del lado que se acerca.
sub(
    """  tint = mix(tint, vec3(1.00, 0.98, 0.93), max(doppler, 0.0) * 0.34 * uDoppler);""",
    """  /* Baja de 0.34 a 0.20: el empuje al crema lavaba justo el oro y el ámbar del
     lado que se acerca, que es donde más superficie ocupan. El lado approaching
     no pierde intensidad por esto — la pone boost, que llega a 6.6, y ACES ya
     blanquea solo lo que satura. Lo que se recupera es el color de todo lo que
     NO satura, que es la mayor parte. */
  tint = mix(tint, vec3(1.00, 0.98, 0.93), max(doppler, 0.0) * 0.20 * uDoppler);""",
)

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
