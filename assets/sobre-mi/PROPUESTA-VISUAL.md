# Mi pequeño universo · propuesta de composición 01

14 de septiembre de 2026. Maqueta local para revisar con Jonás, sin integrar ni
publicar en el sitio. La elección de F40 está confirmada; los textos y el resto
de las decisiones de composición son una propuesta editorial.

Abrir `_curaduria/propuesta-constelacion.html`. Funciona como archivo local o
desde un servidor local; sólo la referencia enlazada de Bonao necesita Internet.
Las fotos personales se cargan de las miniaturas existentes. No se han editado
los originales, generado rostros, añadido personas ni subido fotos a servicios.

## Idea del conjunto

Una entrada nocturna con seis caminos que salen del retrato de Jonás. El dorado
conecta las fotografías y el azul profundo deja espacio a sus colores reales.
La tipografía serif da intimidad a los títulos; el texto cotidiano va en una
tipografía sencilla. El recorrido empieza en Bonao y termina mirando al futuro.

Portada: «Mi pequeño universo. / Lo que me acompaña. Lo que me hace ser yo.»
F40 se presenta en un círculo, acercando rostro y hombros mediante encuadre CSS.
Los seis nodos conservan nombre, imagen o frase y una línea descriptiva.

## Composición y selección

| Parte | Fotos | Composición propuesta | Texto y función |
| --- | --- | --- | --- |
| Entrada | F40 + miniaturas de las secciones | Retrato central, seis nodos, líneas finas y estrellas | Presentar a Jonás y elegir por dónde conocerlo. |
| Mis raíces | E03, río Yuna, fuente Bonao City | Paisaje horizontal grande y frase sobre un degradado inferior | «Bonao, República Dominicana. Crecí entre ríos y montañas.» No atribuir recuerdos a un tramo concreto. |
| Mi gente | F50; pareja F09–F29; F04 | Familia en un marco cálido; dos edades de una amistad conectadas; abuelos con recuerdo breve | Madre alegre, padre trabajador, hermana compañera; meta compartida de Betel; aprendizajes con el abuelo y humor de la abuela. |
| Cómo soy | F28 como apoyo propuesto | Retrato junto al mar y texto con espacio; nota breve en cursiva | Amigos lo describen auténtico, tranquilo, humilde, amable y servicial; fe y curiosidad. Sobrepensar menos aparece como aprendizaje cotidiano. |
| Lo que disfruto | F44 principal y F42 secundaria | Cascada vertical completa; invierno junto a fotografía; música e historias como detalles desplegables | Explorar, observar, escuchar e historias. Smallville destaca como favorita; Dark se incluye. No mostrar la lista completa de gustos. |
| Mi camino | F13 + F36 | Equipo grande y actividad más pequeña conectados horizontalmente | Un párrafo sobre mantenimiento y Betel. Ambas fotos se etiquetan sólo como mantenimiento; sin fechas ni duración inventadas. |
| Lo que sueño | F45 | Foto vertical amplia, preservando lago y figura, con una frase al lado | Vida sencilla, cerca de la naturaleza y con espacio para seguir explorando. Detalles privados de granja/cabaña y motivos personales omitidos. |

Se eligieron 11 fotografías personales distintas para esta propuesta. F49, F11,
F23 y otras candidatas siguen disponibles; no se eliminan ni se declaran
descartadas. F28 y F42 entran como apoyos propuestos tras la conversación sobre
el retrato principal. No inferir lugares, fechas o identidades por apariencia.

## Interacción que se puede probar

- Apuntar o enfocar un nodo ilumina su conexión. Pulsarlo lleva a su sección.
- Un índice permanece disponible durante la lectura y marca la sección actual.
- Cada capítulo enlaza con el siguiente; el cierre vuelve a la constelación.
- Las fotos de los capítulos se amplían en un diálogo con título y pie breve.
  Cerrar y Escape funcionan; el diálogo devuelve el foco al botón de origen.
- Música y cine/anime tienen desplegables opcionales, sin audio automático.
- En móvil el retrato abre el índice y los seis nodos se distribuyen en dos
  columnas; las secciones se apilan y no dependen de hover.
- El contenido esencial sigue en HTML. La ampliación y el indicador de sección
  necesitan JavaScript; las anclas y los desplegables nativos no.

## Alcance de esta maqueta

La cabecera simplificada sólo ayuda a juzgar esta página; no propone reemplazar
la navegación global. El cierre vuelve al mapa personal para que la maqueta sea
autosuficiente. Al integrar se decidirá cómo encaja el regreso al System Map
existente, siguiendo sus contratos y documentos vigentes.

La maqueta no introduce animación ambiental continua: demuestra encuadres,
jerarquía, navegación y detalles. El movimiento final se conectará al único
interruptor del proyecto, según `docs/design/movimiento-unificado.md`; no añadir
pausas por sección ni cambiar contratos de cámara. El respeto a reduced-motion
de este documento independiente sólo limita sus transiciones de demostración.

La fuente E03 sigue siendo una referencia remota enlazada y acreditada. Su
elección editorial no resuelve la licencia de publicación; consultar
`mis-raices/referencias-externas/FUENTES.md` antes de llevarla al sitio público.
La maqueta no contiene los detalles privados del documento BASE-EDITORIAL.md.

## Revisión realizada

Revisada visualmente en navegador de escritorio y a 390 px de ancho. Medidos
320, 390, 768 y 1440 px: sin desbordamiento horizontal, seis secciones y todas
las anclas internas con destino. Todas las fotografías de los capítulos y las
dos apariciones de la referencia externa cargaron correctamente.

Probados: navegación de nodo a Mi gente, indicador de sección, ampliación de
foto con foco en Cerrar, Escape y desplegable de música. Las capturas de revisión
están en `output/playwright/sobre-mi-*.png` desde la raíz del proyecto.
No se han ejecutado pruebas del sitio porque sus componentes y rutas no cambian.

Próximo paso editorial: valorar esta composición con Jonás y ajustar su gusto
visual. La maqueta es una base revisable, no un diseño final aprobado.
