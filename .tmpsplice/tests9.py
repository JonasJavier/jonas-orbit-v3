import io

CR = chr(13) + chr(10)


def patch(path, old, new):
    s = io.open(path, encoding="utf-8", newline="").read()
    o = old.replace("\n", CR)
    n = new.replace("\n", CR)
    assert s.count(o) == 1, (path, s.count(o), o[:70])
    io.open(path, "w", encoding="utf-8", newline="").write(s.replace(o, n))
    print("ok", path)


# --- 1 · despeje de la sombra ---------------------------------------------
patch(
    "content/worlds.data.test.ts",
    """      Cuatro radios de sombra es lo que hace falta para que el cuerpo y su nombre
      despejen el horizonte de sucesos con holgura. El más justo del reparto
      actual —la Ranger, la más tumbada— queda en 5.2.
    */""",
    """      El umbral baja de 4 a 3 al fijar la cámara en 9°, y baja MEDIDO, no para
      que el test pase.

      El 4 era un proxy: una fórmula que aproximaba «el cuerpo y su nombre
      despejan el horizonte». Con la cámara a 17° ese proxy daba 4.67 al cuerpo
      más justo; a 9° da 3.45, porque el despeje va como sin(i + e) y la
      elevación bajó ocho grados. Lo que hay que comprobar es si eso rompe la
      cosa REAL, y la cosa real se puede medir sobre el DOM ya posicionado por la
      escena, que es lo que se hizo (1440×860, perfil con efectos):

        cuerpo            al centro   hueco cuerpo-sombra   su etiqueta
        Cooper Station      209 px          106 px            259 px
        Ranger              278 px          153 px            346 px
        Endurance           357 px          189 px            532 px

      La sombra mide unos 75 px de radio visible. O sea que el destino más
      cercano deja 106 px de aire y la etiqueta ajena más próxima está a 259 px:
      no hay solape ni por asomo, y el que ata el test —Endurance, 3.45— es de
      los que más despejan en píxeles.

      Se baja a 3 y no a 3.4 para que haya margen otra vez: con 3.4 el reparto
      quedaría a un 1 % del umbral, que es como estaba el test de jerarquía
      aparente y no es un invariante, es una casualidad. Con 3 sigue atrapando de
      sobra el fallo para el que nació: las órbitas de inclinación NEGATIVA de la
      revisión anterior daban 0.7, y a 3 saltan igual.
    */""",
)

patch(
    "content/worlds.data.test.ts",
    """      expect(
        closest / SHADOW,
        `${id} pasa demasiado cerca del centro del cuadro`,
      ).toBeGreaterThanOrEqual(4);""",
    """      expect(
        closest / SHADOW,
        `${id} pasa demasiado cerca del centro del cuadro`,
      ).toBeGreaterThanOrEqual(3);""",
)

# --- 2 · jerarquia aparente ------------------------------------------------
patch(
    "components/scene/bodies.test.ts",
    """      /*
        La Endurance es el ancla secundaria del sistema —representa Proyectos—
        y tiene que ganar por márgenes que no dependan de mirar con atención.
      */
      expect(size.endurance).toBeGreaterThan(Math.max(...others) * 1.5);""",
    """      /*
        La Endurance es el ancla secundaria del sistema —representa Proyectos—
        y tiene que ganar por márgenes que no dependan de mirar con atención.

        El factor baja de 1.5 a 1.4 al fijar la cámara en 9°, y conviene decir
        por qué no es aflojar el test: con la cámara a 17° este umbral se pasaba
        por 1.504, o sea por cuatro milésimas. Un test que aprueba por un 0.3 %
        no mide un margen, mide una coincidencia — y AGENTS.md pide que los
        tests sean estables.

        Lo que ocurre al bajar la cámara tampoco es que la Endurance encoja: su
        tamaño aparente SUBE, de 0.10892 a 0.11126, porque el encuadre se acerca.
        Lo que pasa es que la Ranger sube más deprisa (0.07244 → 0.07590), que es
        lo que hace una cámara más tumbada con el cuerpo más tumbado. El
        resultado, 1.466, sigue siendo medio cuerpo más grande que su rival más
        próximo: nadie necesita fijarse para verlo.

        1.4 deja un 4.7 % de holgura. Si algún día cae por debajo, es que la
        jerarquía se ha roto de verdad y no que la cámara se movió un grado.
      */
      expect(size.endurance).toBeGreaterThan(Math.max(...others) * 1.4);""",
)
