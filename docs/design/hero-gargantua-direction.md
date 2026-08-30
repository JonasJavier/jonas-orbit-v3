# Hero / Sistema Gargantúa — dirección artística vigente

**Estado:** aprobado e implementado. Manda sobre cualquier descripción anterior
del hero en `docs/plans/sistema-gargantua.md` y en el plan principal.

Este documento describe **el sistema que existe**, no una intención.

---

## 1. El cambio que lo desbloqueó todo: el sistema está QUIETO

Los seis cuerpos ya no recorren su órbita. Sus posiciones son constantes de
dirección de arte.

No es una limitación técnica. Es la decisión de la que cuelga el resto:

- **Encuadre.** El encuadre garantiza que ningún destino salga de cuadro. Con
  los cuerpos en movimiento eso obligaba a encajar la *unión de las seis
  elipses enteras*, y la cámara se iba a 90 rs. Con posiciones fijas sólo hay
  que encajar seis puntos: la cámara se queda en 73 rs y **el disco pasa del
  35 % al 42 % del ancho del cuadro sin tocar una sola constante de tamaño.**
- **Composición.** Con posiciones fijas se puede *componer*. Antes cada cuerpo
  estaba donde su fase lo dejara en ese instante.
- **Estabilidad.** Las etiquetas ya no derivan, no cambian de lado y no se
  reordenan. La mitad de los «movimientos raros» eran consecuencia del
  movimiento orbital, no bugs independientes.
- **Verosimilitud.** Un sistema real a esta escala tampoco se mueve de forma
  perceptible. La Endurance tarda horas en cruzar un grado.

**Lo que sigue vivo:** el giro propio de cada cuerpo, el latido de las balizas,
el paralaje del puntero (≤ 1.5°), el disco de acreción —que no para nunca— y la
acumulación temporal del raymarch.

---

## 2. Jerarquía visual

| Nivel | Cuerpo | Radio aparente (1440×810) |
|---|---|---|
| 1 | **Gargantúa** | disco al 42 % del ancho |
| 2 | **Endurance** — Proyectos | 51 px · el más cercano (65 rs) |
| 3 | **Miller**, **Edmunds** | ~31 px |
| 4 | **Tesseracto**, **Cooper Station**, **Ranger** | 17-19 px · los más lejanos (100 rs) |

Endurance es el segundo cuerpo del sistema porque **el portafolio existe para
enseñar proyectos**. Es el más grande, el más cercano y el único en primer
plano bajo-derecha.

## 3. Profundidad

La regla que la produce es geométrica y se sostiene sola:

> Un cuerpo en la mitad cercana de su órbita aparece **abajo**; en la mitad
> lejana, **arriba**.

Sale de la proyección (`screen_y ∝ R·sin(a)·sin(i+e)`) y coincide con cómo se
lee un plano que se aleja. Por eso el primer plano vive en la banda inferior y
el fondo en la superior, y por eso las distancias a cámara van de 65 a 100 rs
— un factor 1.5 que se traduce en tamaño aparente.

## 4. El invariante que sustituye a «|inclinación| ≥ 10»

El achatamiento en pantalla no lo decide la inclinación sola, sino su suma con
la elevación de la cámara. El semieje menor de la elipse proyectada vale
`R·|sin(i + e)|`, y esa es la distancia mínima del cuerpo al centro del cuadro.

> **R·|sin(i + elevación)| ≥ 4 radios de sombra.**

Lo verifica `content/worlds.data.test.ts`.

## 5. Órbitas

Casi subliminales por defecto (2.6 % sobre negro, **desaturadas hacia gris
acero**) y con el arco lejano atenuado al 8 %. El color es **información de
estado**: sólo la órbita apuntada recupera el color de su mundo, a 58 %. El
salto es de más de veinte veces.

Son feedback, no decoración permanente.

## 6. Etiquetas

Dos líneas: **nombre del cuerpo** arriba (0.74 rem) y **función** debajo
(0.54 rem, más apagada). El nombre accesible es «Miller Desarrollo» — cumple
*Label in Name* (WCAG 2.5.3) y es más informativo que cualquiera de los dos por
separado.

Apuntan **hacia fuera** del sistema, de modo que el texto se abre en abanico
desde Gargantúa en vez de apilarse encima.

**Gargantúa no lleva rótulo en reposo.** Un disco incandescente de medio cuadro
no necesita un pie de foto: sólo debilitaba la composición. Queda una marca de
instrumento y el nombre aparece al apuntarlo. El enlace sigue entero en el DOM.

## 7. Estados

Sin caja, sin píldora, sin aro. Nunca.

| Estado | Qué ocurre |
|---|---|
| reposo | nombre al 82 %, función al 50 %, órbita casi invisible |
| hover | nombre y función al color del mundo, trazo de 1 px, cuerpo encendido, **su órbita revelada** |
| focus | lo mismo + filete alrededor de la palabra (no depende del color) |

## 8. Identidad

El hero muestra nombre, rol en dos líneas y una frase de propuesta. Estaban
ocultos en texto para lectores de pantalla: cumplía la regla 7 pero fallaba en
lo humano, porque se podía mirar la escena diez segundos sin saber a qué se
dedica Jonás.

## 9. Responsive

- **> 960 px:** las etiquetas se anclan a los cuerpos.
- **≤ 960 px:** el mapa es una lista al pie y la escena pasa a telón (canvas al
  40 %). No es el escritorio encogido: es otra composición.

## 10. Navegación

Sigue siendo **por ruta**, no por scroll. `cameraPose = f(routeWorldId)`; la
home es una sola pantalla sin scroll y cada mundo es una página propia con su
metadata y su SEO. Ver la nota de `docs/plans/sistema-gargantua.md` §3.
