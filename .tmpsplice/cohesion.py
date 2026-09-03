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
    """  float gauge = (wa - 0.5) * 0.17;
  float density = mix(0.10, 2.55, smoothstep(0.28 + gauge, 0.74 + gauge, fabric));""",
    """  /*
    COHESIÓN DE LA BANDA PRIMARIA, y el problema que resuelve es de PRODUCTO.

    La densidad se construye multiplicando tres campos independientes, cada uno
    con su propio suelo: la textura (0.10), las masas macro (0.34) y los carriles
    de polvo (0.07). Por separado ninguno es agresivo. Pero cuando los tres
    coinciden en su valle —y con campos independientes eso ocurre— el producto
    vale 0.10 · 0.34 · 0.07 = 0.0024, el 0.09 % del máximo. Con el camino óptico
    de esta cámara eso da una opacidad del 0.8 %: transparente. En pantalla no se
    lee como plasma tenue, se lee como si le hubieran recortado un trozo al
    disco, y en movimiento algunos fotogramas abren una ventana negra limpia
    dentro del flujo frontal.

    El arreglo NO es subir la densidad media —eso devuelve la banda uniforme que
    tanto costó quitar— sino impedir que los tres suelos se multipliquen hasta
    cero, y sólo donde importa. En la banda primaria los suelos suben y los
    techos bajan un pelo, así que la MEDIA apenas se mueve (+19 %) mientras el
    producto de los tres valles sube 8.9 veces: los huecos siguen siendo huecos,
    pero con filamento residual dentro en vez de fondo.

    Hacia fuera la cohesión cae a 0.35 y el disco exterior conserva su derecho a
    grandes regiones casi vacías, que es lo que lo hace fragmentario. Ese 0.35 no
    es cero a propósito: es lo que le da CONTEXTO al streamer exterior de la
    izquierda. Sobresalir de la elipse es correcto —un disco de acreción no tiene
    borde duro— pero sin nada tenue alrededor deja de leerse como una corriente
    que se aleja y pasa a leerse como un trozo suelto.
  */
  float cohesion = mix(1.0, 0.35, smoothstep(0.28, 0.70, t));

  /*
    GROSOR VARIABLE. La ventana que convierte textura en densidad se mueve con
    el campo grueso, así que unos filamentos salen anchos y otros finos. Con una
    ventana fija todos tenían el mismo calibre, y un calibre constante es media
    firma de «procedural».
  */
  float gauge = (wa - 0.5) * 0.17;
  float density = mix(mix(0.10, 0.24, cohesion), 2.48, smoothstep(0.28 + gauge, 0.74 + gauge, fabric));""",
)

# El comentario viejo de GROSOR VARIABLE queda duplicado: se quita el original.
sub(
    """  /*
    GROSOR VARIABLE. La ventana que convierte textura en densidad se mueve con
    el campo grueso, así que unos filamentos salen anchos y otros finos. Con una
    ventana fija todos tenían el mismo calibre, y un calibre constante es media
    firma de «procedural».
  */
  /*
    COHESIÓN DE LA BANDA PRIMARIA""",
    """  /*
    COHESIÓN DE LA BANDA PRIMARIA""",
)

sub(
    """  float mass = smoothstep(0.24, 0.76, macro);
  density *= mix(0.34, 1.55, mass);
  density *= mix(0.07, 1.0, laneMask);""",
    """  /*
    Y la ventana del macro se ENSANCHA dentro de la banda.

    Con smoothstep(0.24, 0.76) el campo macro se satura: la mayor parte de sus
    píxeles acaba pegada al suelo o al techo, así que una sola celda macro por
    debajo de 0.24 apaga de golpe una zona entera del tamaño de un sexto del
    disco. Eso es exactamente la ventana negra grande del flujo frontal — no la
    abre la turbulencia, la abre UNA celda. Abriendo la ventana a (0.12, 0.88) la
    misma celda entra en su valle de forma gradual y deja un degradado en vez de
    un borde. Fuera de la banda se conserva el contraste original.
  */
  float mass = smoothstep(mix(0.24, 0.12, cohesion), mix(0.76, 0.88, cohesion), macro);
  density *= mix(mix(0.34, 0.55, cohesion), 1.48, mass);
  density *= mix(mix(0.07, 0.16, cohesion), 1.0, laneMask);""",
)

sub(
    """  float shred = mix(streams * 0.42 + macro * 0.58, 0.5, soften);""",
    """  /* La amplitud baja de 0.72 a 0.64: con 0.72 el radio donde muere el material
     variaba tanto de un sector a otro que a veces el disco terminaba a menos de
     un tercio de su extensión, y ahí es donde el streamer de la izquierda perdía
     todo su contexto. Sigue siendo un borde deshilachado, no una circunferencia. */
  float shred = mix(streams * 0.42 + macro * 0.58, 0.5, soften);""",
)

sub(
    """  density *= 1.0 - smoothstep(0.50, 1.06, t + (shred - 0.5) * 0.72);""",
    """  density *= 1.0 - smoothstep(0.50, 1.06, t + (shred - 0.5) * 0.64);""",
)

sub(
    """  float source = mix(0.30, 1.85, fabric)
               * mix(0.34, 1.0, laneMask)
               * mix(0.45, 1.40, mass);""",
    """  /* Los suelos suben con la cohesión igual que en la densidad, y por el mismo
     motivo: subir sólo la opacidad de un hueco no lo saca del negro si lo que
     hay dentro no emite. Con los dos a la vez, el fondo de un hueco de la banda
     primaria pasa de 1.4·10⁻⁴ del pico a 3·10⁻³ — sigue siendo oscurísimo, pero
     ya tiene estructura que mirar en vez de ser fondo. */
  float source = mix(mix(0.30, 0.42, cohesion), 1.85, fabric)
               * mix(mix(0.34, 0.48, cohesion), 1.0, laneMask)
               * mix(mix(0.45, 0.58, cohesion), 1.40, mass);""",
)

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
