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


# 1) El filtro se pasaba de frenada: la acumulacion temporal ya es un supersampler.
sub(
    """  float slant = min(1.0 / max(abs(dir.y), 0.085), 8.0);
  float footprint = travelled * uPixelScale * pow(slant, 0.30);""",
    """  /*
    Y el exponente es 0.24, no 0.5.

    La media geométrica pura (√slant, exponente 0.5) es lo correcto para UN
    fotograma. Aquí no hay un fotograma: la cámara es fija y el raymarch se
    acumula sobre ocho posiciones de Halton (ver TEMPORAL_BLEND en scene.ts), o
    sea que el muestreo efectivo ya está ocho veces por encima del que ve el
    filtro. Con 0.5 el disco interior perdía casi todo su microdetalle —el grano
    quedaba al 10 % de amplitud justo en la zona más brillante, que es la que más
    se mira— y el resultado era una mancha lisa donde tiene que haber estriado.
    Con 0.24 la huella crece lo justo para matar el hervor de los arcos rasantes
    sin borrar el material.
  */
  float slant = min(1.0 / max(abs(dir.y), 0.085), 8.0);
  float footprint = travelled * uPixelScale * pow(slant, 0.24);""",
)

sub(
    """  const float WARP_GAIN = 1.25;""",
    """  const float WARP_GAIN = 1.05;""",
)

# 2) El mediotono va a naranja de verdad, no a caqui.
sub(
    """  tint = mix(tint, vec3(0.94, 0.47, 0.15), smoothstep(0.20, 0.52, t));""",
    """  tint = mix(tint, vec3(0.97, 0.42, 0.10), smoothstep(0.20, 0.52, t));""",
)
sub(
    """  tint = mix(tint, vec3(0.56, 0.24, 0.07), smoothstep(0.52, 1.00, t));""",
    """  tint = mix(tint, vec3(0.58, 0.22, 0.05), smoothstep(0.52, 1.00, t));""",
)

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
