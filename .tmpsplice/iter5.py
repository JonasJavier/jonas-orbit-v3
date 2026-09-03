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


# 1) Perfil radial un punto mas: en la referencia el exterior es cobre oscuro.
sub(
    """  float heat = pow(uDiskInner / r, 1.5);""",
    """  float heat = pow(uDiskInner / r, 1.62);""",
)
sub(
    """    PERFIL RADIAL: exponente 1.5, no el bolométrico y tampoco el 1.15 de antes.""",
    """    PERFIL RADIAL: exponente 1.62, ni el bolométrico ni el 1.15 de antes.""",
)
sub(
    """    A 1.5 el exterior queda a un 2.8 % del interior en vez de a un 5.3 %: el ojo
    ve primero un plano de plasma incandescente cerca de la sombra y unos
    streamers de cobre perdiéndose fuera, que es la jerarquía de energía que se
    pedía. El exterior no desaparece, deja de mandar.""",
    """    A 1.62 el exterior queda al 2.2 % del interior en vez de al 5.3 %: el ojo ve
    primero un plano de plasma incandescente pegado a la sombra y unos streamers
    de cobre perdiéndose fuera, que es la jerarquía de energía de la referencia —
    allí lo blanco vive junto al horizonte y dentro de las imágenes lensadas, y
    todo el disco primario lejano es una banda oscura de óxido. El exterior no
    desaparece: deja de mandar.""",
)

# 2) Carriles de polvo: en la referencia son el rasgo dominante del disco primario.
sub(
    """  float lanes = fbm3(warped * 0.145 + 11.3) * 0.58 + macro * 0.42;
  float laneMask = smoothstep(0.26, 0.68, lanes);""",
    """  /*
    Y ABSORBEN DE VERDAD. En la referencia el disco primario no es plasma luminoso
    con vetas: es una banda de polvo OSCURA atravesada por material caliente, y
    los carriles negros que la cortan son el rasgo que más dice «materia en caída»
    y menos dice «textura procedural». La ventana se estrecha —era
    smoothstep(0.26, 0.68), tan suave que sólo teñía— para que haya carril y
    no-carril en vez de un degradado continuo.
  */
  float lanes = fbm3(warped * 0.145 + 11.3) * 0.58 + macro * 0.42;
  float laneMask = smoothstep(0.31, 0.63, lanes);""",
)

# 3) Ventana de densidad mas estrecha: grumos y huecos, no niebla intermedia.
sub(
    """  float density = mix(0.12, 2.35, smoothstep(0.20 + gauge, 0.80 + gauge, fabric));""",
    """  float density = mix(0.10, 2.55, smoothstep(0.28 + gauge, 0.74 + gauge, fabric));""",
)

sub(
    """  density *= mix(0.34, 1.55, mass);
  density *= mix(0.12, 1.0, laneMask);""",
    """  density *= mix(0.34, 1.55, mass);
  density *= mix(0.07, 1.0, laneMask);""",
)

sub(
    """  tint *= mix(0.68, 1.0, laneMask);""",
    """  tint *= mix(0.52, 1.0, laneMask);""",
)

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
