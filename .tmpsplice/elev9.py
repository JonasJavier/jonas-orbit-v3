import io

p = "lib/scene-poses.ts"
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
    Elevación sobre el plano del disco. **Es la palanca más barata que existe
    para hacer grande a Gargantúa**, y durante mucho tiempo estuvo desperdiciada
    en 9°.

    El motivo es geométrico. La distancia de encuadre la fijan las órbitas, no el
    disco: el disco cabe de sobra en cualquier caso, así que subir la elevación
    NO aleja la cámara de forma apreciable. Pero el disco vive en el plano y =
    0, de modo que su altura en pantalla vale su diámetro por el seno de la
    elevación. A 9° eso son 8.9 % del alto del viewport — una raya. A 17° son
    18.8 %: **más del doble de agujero negro por el mismo precio de encuadre.**

    Y sigue siendo un ángulo bajo, que es lo que hace la imagen: el disco se ve
    casi de canto, el arco lensado de la cara lejana pasa por encima de la sombra
    y la imagen secundaria por debajo. Por encima de ~22° empieza a leerse como
    un donut visto desde arriba y se pierde esa lectura.
  */
  elevation: 17,""",
    """  /*
    Elevación sobre el plano del disco. Vuelve a 9°, y el argumento que la había
    subido a 17° estaba midiendo la cosa equivocada.

    Aquel razonamiento era: el disco vive en y = 0, así que su ALTURA en pantalla
    vale su diámetro por el seno de la elevación; a 9° eso son 8.9 % del alto del
    viewport y a 17° un 18.8 %, o sea el doble de agujero negro por el mismo
    precio de encuadre. Todo cierto. Y era la métrica equivocada, porque lo que
    hace que esto se lea como un agujero negro no es cuánta pantalla ocupa el
    disco: es que se distinga el PLANO de acreción de su imagen doblada por la
    gravedad. Engordar la elipse primaria hace justo lo contrario — le da volumen
    propio, y el conjunto pasa a leerse como un remolino visto desde arriba.

    El A/B de 17° / 12° / 9° (mismo viewport, mismo shader, misma fase temporal,
    capturas en docs) lo dejó sin discusión. La elipse proyectada va como
    1/sin(θ), o sea 3.42 : 1 a 17°, 4.81 : 1 a 12° y 6.39 : 1 a 9°: bajar a 9°
    aplana la silueta un 87 %. Y cuesta un 9.4 % de acercamiento —medido sobre el
    diámetro de Miller, que es de tamaño fijo—, porque el sistema ocupa menos alto
    y el encuadre se ajusta. Ése es todo el precio.

    A 9° el alto de la estructura lo pone casi entero el lensado: el arco de la
    cara lejana pasando por encima de la sombra y la imagen secundaria por debajo,
    con la banda primaria fina cruzando el cuadro. Es la lectura que se buscaba.

    Por debajo de 9° no se baja. No por geometría —seguiría aplanando— sino
    porque a partir de ahí se persigue un fotograma concreto de Interstellar a
    costa de la composición propia: esto es Jonás Orbit, no un remake.
  */
  elevation: 9,""",
)

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("elevacion fijada a 9")
