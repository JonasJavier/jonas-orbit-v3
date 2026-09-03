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


sub(
    """  /*
    Y EL EXTERIOR SE DESHILACHA, no termina en una corona.

    El radio donde muere el material varía con el campo turbulento, pero ahora
    pesa sobre todo el MACRO: con streams mandando, el borde se deshilachaba a
    la escala de los filamentos y el conjunto seguía siendo un anillo de contorno
    irregular. Con el macro mandando son sectores enteros los que terminan antes
    o alcanzan mucho más lejos, y el disco se pierde en negro por streamers en
    vez de por una franja marrón de grosor constante.
  */
  /* La amplitud baja de 0.72 a 0.64: con 0.72 el radio donde muere el material
     variaba tanto de un sector a otro que a veces el disco terminaba a menos de
     un tercio de su extensión, y ahí es donde el streamer de la izquierda perdía
     todo su contexto. Sigue siendo un borde deshilachado, no una circunferencia. */
  float shred = mix(streams * 0.42 + macro * 0.58, 0.5, soften);
  density *= 1.0 - smoothstep(0.50, 1.06, t + (shred - 0.5) * 0.64);""",
    """  /*
    Y EL EXTERIOR SE DESHILACHA, no termina en una corona.

    El radio donde muere el material varía con el campo turbulento y pesa sobre
    todo el MACRO, así que son sectores enteros los que terminan antes o alcanzan
    mucho más lejos: el disco se pierde en negro por streamers en vez de por una
    franja marrón de grosor constante.

    ── EL SIGNO ESTABA AL REVÉS ────────────────────────────────────────────────

    Era `t + (shred - 0.5)`, con shred = streams·0.42 + macro·0.58. Un argumento
    mayor muere antes, así que la regla que se estaba aplicando era:

        mucho material en la vecindad  →  el disco termina PRONTO
        vecindad vacía                 →  el disco llega MUY LEJOS

    Justo del revés. Y el defecto que producía es exactamente el que se ve en el
    borde izquierdo: en un sector donde el macro está en su valle, todo el
    material de alrededor desaparece —porque el macro también multiplica la
    densidad— pero el corte radial le regala a ese mismo sector el alcance
    máximo. Lo que sobrevive es una hebra sola en el radio exterior, y a 9° de
    elevación una hebra en el radio exterior se proyecta como una línea larga,
    fina y casi horizontal: la gramática de una órbita, no la de un chorro de
    plasma. Con la escena llena de trayectorias dibujadas, esa confusión es
    especialmente cara.

    Invertido, el alcance sigue al material: un sector con masa llega lejos —y
    llega ANCHO, porque el macro que lo sostiene mide entre 8 y 23 unidades de
    mundo, así que arrastra vecindad consigo— y un sector vacío se apaga cerca.
    No cambia la media: el campo es simétrico alrededor de 0.5, sólo cambia QUÉ
    sectores se quedan largos.
  */
  float reach = mix(streams * 0.38 + macro * 0.62, 0.5, soften);
  density *= 1.0 - smoothstep(0.50, 1.06, t - (reach - 0.5) * 0.64);

  /*
    Y una hebra suelta se disipa en vez de seguir kilómetros.

    Invertir el signo evita FABRICAR hebras aisladas, pero no borra las que el
    ruido produzca por su cuenta. Esto es el criterio que faltaba, escrito tal
    cual: lejos del centro, el material sólo existe si su VECINDAD existe. mass
    es la medida de vecindad —viene del campo macro, que es el único que describe
    la escala de las masas— así que donde la vecindad se ha ido, lo que quede se
    apaga progresivamente en vez de continuar como una raya de grosor constante.

    Sólo RESTA densidad, y sólo en el tercio exterior: no sube la media de nada,
    y de hecho compensa un poco la subida de la pasada anterior justo donde esa
    subida no hacía falta. El deshilachado, el grosor variable y la dirección
    orbital se conservan enteros — lo que desaparece es la continuidad de lo que
    ya no tiene con qué continuar.
  */
  float lonely = smoothstep(0.55, 0.95, t) * (1.0 - mass);
  density *= 1.0 - lonely * 0.75;""",
)

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
