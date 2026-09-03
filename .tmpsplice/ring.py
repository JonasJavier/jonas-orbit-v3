import io

p = "components/scene/gargantua-shaders.ts"
s = io.open(p, encoding="utf-8", newline="").read()
lines = s.split("\r\n")

start = next(i for i, l in enumerate(lines) if "EL ANILLO DE FOTONES ES UN FILO" in l)
# el bloque abre con el /* de la linea anterior
assert lines[start - 1].strip() == "/*", lines[start - 1]
start -= 1
end = next(i for i, l in enumerate(lines) if "* (2.9 * ringLuma);" in l)
# se lleva tambien la linea en blanco siguiente
assert lines[end + 1] == "", repr(lines[end + 1])

replacement = """  /*
    NO HAY TERMINO DE ANILLO DE FOTONES, y quitarlo es el arreglo.

    Había una línea analítica en el parámetro de impacto crítico, b = √27/2·rs,
    que existía para «recuperar el filo» que la compresión de altas luces y ACES
    se comían. La intención era buena y el número es correcto —la convención de
    unidades del integrador es rs = 2GM/c², con horizonte en r = rs, esfera de
    fotones en 1.5·rs y el término (3/2)·rs·u² en la geodésica, así que b crítico
    = 3√3·GM/c² = (√27/2)·rs ≈ 2.598·rs— pero el resultado era indefendible:

    b es constante sobre una circunferencia EXACTA de la pantalla, y una
    circunferencia exacta de un píxel de ancho es un círculo dibujado encima. Da
    igual con qué se module: mientras el material lensado rodee la sombra por los
    cuatro costados, la modulación por luminancia deja el trazo completo. Era el
    elemento más gráfico del cuadro y el que primero delataba el render.

    El filo lo dibuja quien tiene que dibujarlo: el apilamiento de imágenes de
    orden superior que produce la propia integración. Ese apilamiento hereda
    textura, cortes, masas y asimetría del material —ahora de verdad, con soften
    casi a cero— así que el borde de la sombra sale irregular, más brillante
    donde el material se acerca y apagado donde se aleja, que es como se ve en la
    referencia. Menos código y mejor modelo.
  */

"""
out = lines[:start] + replacement.split("\n")[:-1] + lines[end + 2:]
s = "\r\n".join(out)

# `impact` ya no lo usa nadie.
old = """  /* Parámetro de impacto del rayo: la distancia a la que pasaría del centro si
     el espacio fuese plano. Lo usa el anillo de fotones, al final. */
  float impact = sqrt(h2);
"""
assert s.count(old.replace("\n", "\r\n")) == 1
s = s.replace(old.replace("\n", "\r\n"), "")

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
