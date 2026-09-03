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


# 1 · La cohesion llega mas lejos: es el PEGAMENTO entre la banda y la hebra.
sub(
    """  float cohesion = mix(1.0, 0.35, smoothstep(0.28, 0.70, t));""",
    """  /* La rampa se estira de (0.28, 0.70) a (0.34, 0.82). No sube el suelo del
     disco exterior —sigue en 0.35 al final— sino que retrasa su caida, y eso es
     justo el radio intermedio donde vive el material que une la banda principal
     con el streamer de la izquierda. Sin ese tramo la hebra nace ya despegada y
     el ojo la lee como una linea aparte; con el, nace del disco. */
  float cohesion = mix(1.0, 0.35, smoothstep(0.34, 0.82, t));""",
)

# 2 · El hueco de la derecha: la ventana del macro se abre casi del todo.
sub(
    """  float mass = smoothstep(mix(0.24, 0.12, cohesion), mix(0.76, 0.88, cohesion), macro);
  density *= mix(mix(0.34, 0.55, cohesion), 1.48, mass);""",
    """  /* Y dentro de la banda la ventana se abre casi entera, (0.06, 0.94): con ella
     el macro deja de ser un interruptor y pasa a ser una rampa, asi que la
     region oscura de la derecha conserva su valle pero lo recorre con
     filamentos en vez de con un borde. El suelo sube de 0.55 a 0.66 por lo
     mismo: no para cerrar el hueco, para que dentro del hueco haya algo. Fuera
     de la banda se conserva el contraste original y el disco exterior sigue
     pudiendo vaciarse. */
  float mass = smoothstep(mix(0.24, 0.06, cohesion), mix(0.76, 0.94, cohesion), macro);
  density *= mix(mix(0.34, 0.66, cohesion), 1.48, mass);""",
)

# 3 · La hebra se disipa antes al alejarse, pero sin morder donde nace.
sub(
    """  float lonely = smoothstep(0.48, 0.92, t) * (1.0 - mass);
  density *= 1.0 - lonely * 0.82;""",
    """  /* La ventana se corre de (0.48, 0.92) a (0.60, 0.88) y el peso sube a 0.90, y
     las dos cosas van juntas: empezar mas tarde deja intacto el radio donde la
     hebra NACE —que es donde hacia falta pegamento, no tijera— y terminar antes
     y con mas fuerza hace que la PUNTA se disuelva en vez de continuar. Es la
     forma que se buscaba: nace del disco, se estira, adelgaza y se disipa, en
     lugar de mantener grosor constante durante muchos radios. */
  float lonely = smoothstep(0.60, 0.88, t) * (1.0 - mass);
  density *= 1.0 - lonely * 0.90;""",
)

# 4 · Y lo que quede en el hueco derecho tiene que EMITIR, no solo estar.
sub(
    """               * mix(mix(0.45, 0.58, cohesion), 1.40, mass);""",
    """               * mix(mix(0.45, 0.68, cohesion), 1.40, mass);""",
)

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
