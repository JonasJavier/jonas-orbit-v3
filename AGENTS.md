<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Jonás Orbit v3 — reglas del repositorio

**Sobre mí — constelación personal (2026-09-14):**
`docs/design/sobre-mi-constelacion.md` manda en contenido y composición de
`/es/sobre-mi`. El dueño aprobó la maqueta y pidió construir conservando la
navbar. Seis constelaciones, F40 como retrato central y F28 en Cómo soy,
fondo generado de cielo/montañas, fotos reales y textos breves. SiteShell y
navbar originales intactos; movimiento conectado al interruptor global. La
escena persistente duerme también en Gargantúa porque ahora la cubre el álbum.
No convertir las aficiones en CV ni publicar los detalles privados del sueño.
La autorización de publicación de E03/Bonao City sigue pendiente; ver las fuentes.

**Fuente de verdad:** `docs/plans/jonas-orbit-v3-mission-endurance.md` (plan
aprobado con eng review CLEAR). No abras decisiones arquitectónicas nuevas sin
pasar por ese documento. La matriz de tests vive en su Appendix A.

**Página de Edmunds — cubierta de observación (2026-09-11):**
`docs/design/edmunds-creatividad.md` documenta la segunda implementación de
`/es/creatividad`, pedida por el dueño el mismo día tras rechazar la primera
(«la galería 3D no me gusta, quiero que sea más inmersiva; el foco de toda la
página debe ser la galería 3D»). La página abre directamente sobre la galería,
que ocupa la primera pantalla ENTERA con el cromo superpuesto y lleva el
`h1`: anillo de obras en CSS 3D con suelo de rejilla, reflejos, nebulosa,
estrellas, polvo, luz ambiente de la obra activa y el limbo de Edmunds bajo el
horizonte; HUD con lecturas `OBRA / SECTOR / REGISTRO`; retículo sobre la obra
centrada; raíl de sectores; paralaje de ±2° con puntero fino. Sigue sin WebGL,
sin bucle y sin autoplay. El catálogo pasa de 60 a **90 obras en siete
sectores con Diseño primero** (Diseño, Horizontes, De cerca, Criaturas,
Retratos, Invierno, Después del sol), ordenadas como un viaje, con `caption` y
`medium` nuevos en el esquema de Velite. Dos reglas que costaron una entrega
cada una: **en un contexto 3D real el plano de la lista está en z = 0, delante
de toda obra empujada en Z, y se traga el puntero** — los contenedores llevan
`pointer-events: none` y sólo las obras lo reciben —, y **un suelo inclinado
dentro del mismo contexto 3D que las obras se levanta por delante de la activa
y pinta una franja sobre la foto** — el suelo vive en su propia perspectiva,
detrás. Un cuarto pase añade el **modo cine** —la instrumentación se atenúa
tras 3,5 s sin entrada y vuelve con cualquiera— y rehace el orden dentro de
cada sector con criterio (las más fuertes primero, «Fantasía» abre, el
homenaje a Interstellar cierra Diseño); las 90 obras se conservan porque la
curación manual la hará el dueño. Un quinto pase **simplifica**: la cabecera
es una sección propia que respira, la cubierta ocupa un viewport ella sola con
sólo filtros, flechas y título, y desaparecen lecturas, raíl, leyendas de obra,
cabeceras de sector y bitácora; el arrastre lleva el anillo con la mano. El
System Map, sus cuerpos, cámara y materiales no cambian. Su valoración visual
queda abierta.

**Página de Miller — océano en WebGL2 y formación en curso (2026-09-12):**
la sección `Océano en WebGL2 y formación en curso` de
`docs/design/miller-formacion.md` manda sobre el resto de ese documento en
**cómo se anima el hero de `/es/formacion` y cómo se presenta lo que Jonás está
estudiando ahora**. El canvas 2D que desplazaba filas enteras —«gelatina», no
agua— se sustituye por un contexto WebGL2 propio que refracta la fotografía con
un campo de oleaje en perspectiva y luz desde la derecha; el cielo no se toca y
la foto sigue siendo el fallback. Se conservan consentimiento, pausa, 30 fps,
suspensión fuera de pantalla y reduced-motion; sin WebGL2 desaparecen canvas y
control. La escena persistente sigue dormida detrás: nunca hay dos contextos
dibujando. El esquema de Velite gana `education.inProgress` —sin `href` ni
`preview` a propósito— y la página lo muestra como «En curso» entre los
estudios y el punto de partida; cuando un curso tenga documento, la entrada se
MUEVE a `certificates`, no se duplica. La dirección de vídeo del hero queda
descartada. El System Map, sus cuerpos, cámara y materiales no cambian.

**Página de la Ranger — cabina de mando (2026-09-13):** la sección `Cabina de
mando` de `docs/design/ranger-contacto.md` manda sobre el resto de ese
documento en **composición, interacción y límites de `/es/contacto`**. El
dueño rechazó la cabina de comunicaciones del día anterior («no me gusta la
versión actual») y pidió algo totalmente distinto, «estar como dentro de una
nave espacial». Ahora el visitante va sentado DENTRO de la Ranger: ventanal en
WebGL2 propio sin ningún asset (estrellas en vuelo, nebulosa violeta y cian,
mundo azul con nubes y atmósfera, todo con paralaje de cabeza por planos),
casco en SVG con montante, HUD cian sobre el cristal con lecturas reales (hora
en Santo Domingo, rumbo = `placement.phase`) y un panel ámbar con los tres
canales como frecuencias, radar e interruptor de vuelo. La consola del
formulario mide la potencia de señal campo a campo y sus botones de misión
escriben en el `<select>` real. Tres reglas: **un solo estado gobierna todo lo
que se mueve** (consentimiento, pausa, reduced-motion, perfil ligero) y sin
WebGL2 el interruptor desaparece; **el encendido es aditivo** —nada se oculta
antes de animarse, el HTML servido ya está completo—; y **la escena persistente
duerme también en la Ranger** (`COVERED_WORLDS`). `public/images/ranger/` se
retira. El System Map, sus cuerpos, cámara y materiales no cambian. La
cabina quedó aprobada por el dueño el mismo día y un **segundo pase** (sección
`Vuelo`) hizo que el vuelo se sintiera como tal: el campo de estrellas se
indexa por DISTANCIA recorrida —los motores arrancan en 2,8 s y las estrellas
y el polvo cercano se estiran en estelas radiales según la velocidad—, la
nave alabea y deriva con armónicos lentos aplicados a toda la vista, la cinta
de rumbo sigue el mismo `yaw`, y el mundo gira bajo la nave con la distancia.
La búsqueda de estrellas es de cuatro celdas, exacta porque ninguna mide más
de media celda. Su valoración visual queda abierta.

**UN SOLO INTERRUPTOR DE MOVIMIENTO (2026-09-13) — manda sobre todo lo
anterior en consentimiento, pausa y perfil ligero:**
`docs/design/movimiento-unificado.md`. Un icono en la bandeja inferior
derecha (`components/motion-toggle.tsx`, junto a la banda sonora, en todas las
rutas) enciende y apaga TODO lo que se mueve: escena 3D y su polvo, cielo de
la cabecera, océano y corrientes de Miller, vuelo de la Ranger, cubierta de
Edmunds y las animaciones CSS (`html[data-motion="off"]`). **Por defecto
encendido**; `prefers-reduced-motion` ya no apaga nada por sí solo. Quedan
retirados «Activar animación 3D» del HUD, el `scene-toggle`, «Pausar océano»,
«Pausar vuelo» y «Pausar estrellas»: ninguna página guarda estado de pausa.
`lib/effects-mode.ts` tiene un solo valor con dos lecturas:
`useMotionEnabled()` (por defecto o a propósito; las páginas) y
`useForcedEffects()` (a propósito: icono pulsado o `?no3d=0`; sólo esa salta
por encima de reduced-motion y de las heurísticas de capacidad para montar la
escena). `?no3d=1` sigue siendo la puerta al perfil ligero y se persiste con
la clave de siempre. Cualquier texto anterior que describa botones de
consentimiento por página está obsoleto.

**Travesía espacio-temporal (2026-09-14) — manda sobre el §7 del pivote en
duración, fases, momento del cambio de ruta y versión reducida de la
transición de aproximación:** `docs/design/travesia-espaciotemporal.md`. Al
activar un destino desde el System Map (proxy o raíl, clic o Enter) la
navegación es una travesía cinematográfica de 2,6 s en cuatro fases —bloqueo
de objetivo (0–0,4 s), aceleración con easing de potencia y campo de 35° a
50° (0,4–1,35 s), distorsión del espacio-tiempo alrededor del destino
PROYECTADO (1,05–2,05 s: lente de masa puntual con anillo de Einstein fuera
del limbo, centro comprimido, imagen duplicada, arcos rotos sobre borde
oscuro, aberración mínima) y cruce con compresión luminosa (1,85–2,6 s)—; no
es un túnel de hiperespacio. `lib/voyage.ts` es la línea de tiempo pura
(`sampleVoyage(t)` → `lock/approach/warp/flash`) y las huellas por mundo;
`lib/voyage-controller.ts` decide CUÁNDO navega el router —**por temporizador
en el pico, nunca desde un fotograma** (G10), cualquier tecla/clic/gesto
corta (G9), tope de llegada de 1,4 s— y publica `data-voyage` en `<html>`;
`components/scene/voyage-pass.ts` es el `ShaderPass` (deshabilitado en
reposo) y la escena mueve la cámara SOBRE la pose sin escribir en ella
(`setPose` termina la travesía). `components/voyage-layer.tsx` (layout) lleva
la luz del cruce y avisa de la llegada al cambiar el pathname. Sin escena
viva va la **versión reducida** de medio segundo en el DOM, que sustituye al
crossfade de 120 ms del §7 por decisión del dueño. Tres reglas que costaron
una prueba: **el anillo se mide sobre el limbo ya ampliado** por la
compresión del centro; **poco refuerzo al destino** (+15 % luz, +40 %
emisión) o sale lavado; **las trazas orbitales se retiran al caer**. Su
valoración visual queda abierta.

**Cabecera — observatorio y acento por mundo (2026-09-13):** la sección
`Observatorio y acento por mundo` de `docs/design/identity-gargantua.md`
manda sobre el resto de ese documento en **estado activo, línea viajera, CV y
cielo de la barra**. **La navbar es minimalista por decisión del dueño**:
rechazó una versión con segunda línea «índice · cuerpo» bajo cada destino
(«muy cargada») y quiere los seis nombres repartidos por el ancho como
estaban. Conserva marca, borde a borde sin marco, 67/63 px, una fila, control
de pausa, «Mapa estelar ↑» y menú «Explorar». Nuevo: el activo y el punto de
hover usan `--nav-accent` de su mundo; la línea del activo se mide en un
layout effect y VIAJA entre rutas por un recuerdo de módulo (cada página
monta su cabecera), con la línea por enlace del CSS para el primer pintado y
sin JavaScript; el CV es un `<details>` con **los dos CV, español e inglés**
(hay dos CV, siempre), con el glifo compartido `download-icon.tsx` que también
usan el hero de Miller y el registro de la Ranger; y el cielo pasa a
`voyage-sky.tsx`, un canvas 2D de observatorio —tres profundidades en un solo
sentido, magnitudes reales, centelleo, difracción, banda lechosa y meteoros—
con la textura SVG como fallback sin JavaScript, un solo fotograma cuando
está quieto y «Activar estrellas» como opt-in bajo reduced-motion o perfil
ligero (el dueño tiene movimiento reducido en su equipo y no veía nada). El
estado previo vive en
`output/archive/navbar-cristal-editorial-20260913-antes-instrumento.zip`.

**Edmunds — sexto pase (2026-09-12):** la sección `Sexto pase` de
`docs/design/edmunds-creatividad.md` manda en **nitidez de las obras, gesto de
arrastre, transición del anillo y cielo de la cubierta**. Tres reglas que
costaron verificación: **un WebP visto a 1:1 se ve blando y el mismo archivo
reducido se ve nítido** —por eso cada contexto pide 1,5× los píxeles que pinta
sobre seis peldaños (320-1920)—; **el anillo se mueve con UN número**,
`--drag` en posiciones fraccionarias registrado con `@property`, y las obras
derivan giro, profundidad y luz de `--p = --o + --drag` con `abs()`: nunca se
vuelve a poner una transición sobre el `transform` de cada obra, ni un
`translate` plano durante el gesto; y **la luz ambiente funde sobre la anterior**,
no desde negro. El cielo es noche azul marino con auroras de degradado, sin
`filter`. La curación del catálogo sigue siendo del dueño.

**Pivote vigente (2026-08-06):** `docs/plans/sistema-gargantua.md` manda sobre el
plan principal en **arquitectura de rutas, contrato de cámara, capa visual,
transiciones y presupuestos**. En todo lo demás el plan principal sigue intacto.
Ante contradicción entre ambos, manda el pivote.

**Dirección artística del hero (2026-08-29):**
`docs/design/hero-gargantua-direction.md` manda sobre los dos anteriores en
**composición del hero, identidad visible, diseño de los mundos, HUD, interacción,
escala de Gargantúa, posiciones de los cuerpos, motion en reposo, trayectorias,
etiquetas y estados**. Sus cambios centrales: **el sistema está quieto** — los
cuerpos no recorren su órbita — y el Hero **no muestra un bloque personal**. La
identidad profesional, rol, CTAs y CV siguen en el HTML semántico y metadata; la
marca visible del HUD es `JONAS ORBIT`. Cualquier texto anterior que describa
cuerpos orbitando continuamente, Endurance como toro o el
copy personal como bloque visible está obsoleto. El viaje continuo y
`SYSTEM MAP ↑` siguen diferidos en `docs/design/continuous-journey-phase.md`.

**Lenguaje visual de los mundos (2026-09-03):**
`docs/design/world-visual-language.md` manda sobre los tres anteriores en
**material, iluminación y criterio de aceptación de los cinco cuerpos secundarios**. No toca
composición, cámara, HUD ni interacción, que siguen perteneciendo a la dirección
artística del hero. Congela el modelo de luz común —la misma luz toca materiales
diferentes— y define el bloom-off test: un cuerpo que pierde su identidad al
apagar el glow no está terminado. Gargantúa queda **congelada** durante la fase.
El `Rediseño imposible` del Tesseracto conserva su geometría y material.

**Revisión de Edmunds (2026-09-05):** la sección `Mundo mineral` de
`docs/design/world-visual-language.md` sustituye su material y su paleta por
petición del dueño: roca seca, ocre, arena y hierro, sin nubes ni apariencia
incandescente; provincias geológicas, crestas orientadas hacia Gargantúa y
atmósfera fina direccional. Posición, tamaño, órbita y el resto de los cuerpos
siguen intactos. Dos sitios de FBM, dos menos que antes. El apartado anterior
`Mundo habitable` queda como referencia histórica sustituida.

**Revisión de Miller (2026-09-05):** las secciones `Océano global`,
`Corrientes y dirección de luz` y `Trenes largos y filo sin halo` de
`docs/design/world-visual-language.md` sustituyen su material, su paleta, su
modelo de reflejo y su atmósfera por petición del dueño: océano continuo azul
grisáceo con corrientes zonales, lámina de luz anisótropa en vez de foco
isótropo, y filo de aire asimétrico que nace
mirando a Gargantúa. La marejada baja a un tercio —su patrón de batido era lo
que producía las manchas blandas— y la banda latitudinal manda sobre el relieve.
El halo común de Miller queda casi apagado (0.09) porque, con exponente 2.2, por
construcción no puede ser direccional: todo el aire visible lo pone su filo
propio. Posición, tamaño, órbita, inclinación, cámara y el resto de los cuerpos
siguen intactos. Tres sitios de FBM, los mismos que antes.

**Revisión de Endurance (2026-09-05):** la sección `Endurance — peso, escala e
integración` de `docs/design/world-visual-language.md` sustituye su material,
núcleo y pose por petición del dueño: aluminio marfil apagado, luz facetada desde
Gargantúa, cavidades oscuras, eje esbelto, módulos en planos distintos, dos
radiadores más largos y 6.9° adicionales de yaw. Posición, escala del conjunto,
cámara, HUD, fallback plano y otros cuerpos siguen intactos. Cuatro draws.

**Revisión del Tesseracto (2026-09-05):** la sección `Umbral vivo` de
`docs/design/world-visual-language.md` sustituye sus límites anteriores de
deriva mínima y acabado por petición del dueño. Tres grupos interiores se
reconfiguran de forma perceptible; cáscara, posición, tamaño y cámara siguen
fijos. El Tesseracto usa cuatro draws con un material compartido.

**Pase de autoridad de Gargantúa (2026-09-05):** la sección `14 quáter` de
`docs/design/hero-gargantua-direction.md` sustituye la escala de los cinco
destinos secundarios por petición del dueño — Endurance −10 %, Miller y Edmunds
−8 %, Tesseracto −5.6 %, Ranger −3.5 %. Gargantúa no se toca. Posición, fase,
inclinación, cámara, material y HUD siguen intactos.

**Pase de respiración (2026-09-05):** la sección `14 quinquies` de
`docs/design/hero-gargantua-direction.md` mueve Miller (26/242/31 → 28/240/37) y
el Tesseracto (30/298/26 → 32/300/30) para despegarlos del arco brillante de
Gargantúa. No cambia tamaño, cámara ni los otros tres cuerpos. Sustituye radio,
fase e inclinación de esos dos en `docs/design/sistema-seis-destinos.md`.

**Pase de puntero (2026-09-05):** las secciones `11 bis` y `11 ter` de
`docs/design/hero-gargantua-direction.md` sustituyen la figura del retículo y la
presencia del stardust en WebGL por petición del dueño. El retículo pasa de cruz
de cuatro trazos a anillo + núcleo + marcas laterales, con `target` abriendo el
anillo en arcos que barren. El stardust de WebGL sube alfa, capacidad, ráfaga,
tamaño y vida, y alarga la curva de apagado. No cambian el ámbito de la capa
—desktop fine-pointer dentro del System Map—, los cuatro estados, ni el perfil
`flat`, que sigue congelado. Un segundo pase (mismo día) alarga la permanencia
—exponente de apagado a 1,2— y añade un **segundo calibre**: motas finas con
sprite propio sembradas encima de las de cuerpo, no en su lugar.

**Segundo recorte de escala (2026-09-05):** la sección `14 sexies` de
`docs/design/hero-gargantua-direction.md` sustituye otra vez la escala de los
cinco destinos secundarios por petición del dueño — Endurance −2 %, Tesseracto
−1.5 %, Miller y Edmunds −1 %, Ranger −0.5 %. Gargantúa no se toca. Posición,
fase, inclinación, cámara, material y HUD siguen intactos. Sustituye la columna
de tamaño de `14 quáter` y la de `docs/design/sistema-seis-destinos.md`.

**Fase 1 — presencia, lectura y cine (2026-09-05):** la sección `9 bis` de
`docs/design/world-visual-language.md` manda sobre todo lo anterior en
**iluminación, material, silueta, acento de propulsión y pose de Endurance,
Edmunds y la Ranger**. No toca composición, cámara, HUD ni fallback plano, y no
toca a Miller ni al Tesseracto. Su principio es explícito y sustituye cualquier
lectura contraria: **no hacerlos más oscuros, hacerlos más intencionales** —el
cine sale de repartir el valor, no de bajar la exposición. Cambios centrales:
el suelo nocturno deja de ser un número por familia y pasa a depender de la
geometría de luz medida en cada sitio (Endurance 0.42 → 0.30, Edmunds 0.28 →
0.22); el filo cálido también (Endurance 0.18 → 0.50, Edmunds 0.12 → 0.34 del
común); las dos naves y el mundo mineral ganan contraste interno sin ganar
luminancia media; la Endurance estrena propulsión de maniobra visible y la
Ranger separa escape (blanco azulado) de baliza (violeta) por máscara de
vértice, sin un draw call más. Las poses de Endurance y Ranger cambian dentro
de las puertas que fija `bodies.test.ts`.

Una **segunda ronda** (mismo día, misma sección) añade **estela de propulsión**
a las dos naves y sustituye la solución de propulsión de la primera: la
maniobra de la Endurance se va del barril al **borde del aro** —cuatro toberas
entre grupos, dos encendidas y opuestas— porque en el barril no se leían. La
pluma no cuesta ningún draw: viaja en el material emisivo con la rampa dentro de
`aSurfaceMask` (base 8, por encima de las máscaras de casco), el emisivo pasa a
mezcla aditiva con las balizas compensadas a la mitad, y **`modelRadius` poda la
pluma** — una nave no ocupa más espacio por encender un motor, y contarla
hinchaba el blanco de clic y la distancia de encuadre. Edmunds gana una cuarta
macroforma (cuenca pálida) bajando la frecuencia de provincia de 1.62 a 1.28, y
la Ranger cambia su relleno plano por un **rebote dirigido**: ámbar hacia
Gargantúa, azul de campo estelar en la espalda.

**Raíl, atlas plano y Tesseracto (2026-09-06):**
`docs/design/atlas-tesseract-reference.md` manda sobre los documentos anteriores
en **el orden visible de las etiquetas del raíl, la composición y el acabado del
mapa 2D, y la geometría del Tesseracto en las dos versiones**. El raíl nombra
primero el CONTENIDO —Historia, Desarrollo, Proyectos, Creatividad, Laboratorio,
Contacto— y revela el nombre cósmico al apuntar; el nombre accesible de cada
enlace pasa a ser «Contacto Ranger» y no al revés. El atlas plano tiene
composición propia en **tres** formatos —`wide`, `portrait` y `short`, este
último para el apaisado corto— en `lib/flat-composition.ts`, independiente de
los datos orbitales de WebGL. El Tesseracto sustituye la caja compacta por un
corredor de marcos entrelazados hacia un punto de fuga, con cuatro draws y un
solo material. No cambian posición, cámara ni datos orbitales de ningún cuerpo.
`e2e/atlas.spec.ts` comprueba los seis formatos: cuerpos dentro de pantalla y por
encima del raíl, enlaces y proxies de 44 px, centro de cada proxy alcanzable y
cero desbordamiento horizontal.

**Tercer recorte de escala (2026-09-06):** la sección `14 septies` de
`docs/design/hero-gargantua-direction.md` sustituye la columna de tamaño de
`14 sexies` para **tres** cuerpos y sólo tres — Endurance −3.5 % (4.547 →
4.388), Tesseracto −1.5 % (2.669 → 2.629), Ranger −0.5 % (1.92 → 1.9104).
Miller y Edmunds **no se tocan**, y esa asimetría es la decisión: son el
contrapeso del cuadro y encogerlos otra vez habría movido la composición, no la
escala. Gargantúa, posición, fase, inclinación, cámara, material y HUD siguen
intactos.

**El cielo deja de participar del remolino (2026-09-06):** la sección
`14 octies` de `docs/design/hero-gargantua-direction.md` manda sobre `6` en
**cuánto se estira el fondo estelar y dónde**. El estiramiento se reserva para
la vecindad del agujero —puerta por parámetro de impacto, entera hasta 17 rs y
cerrada en 30— y en la periferia pagan sólo las escalas gruesas; **el campo fino
(escala 520) no se toca**. Medido con `tools/star-streaks.mjs`: −31 % de
presencia luminosa en la periferia, 0 % de cambio en el anillo de 250-400 px. No
se toca el lensing del disco.

**El rastro del puntero vuelve a la cabina (2026-09-06):** la sección
`14 nonies` de `docs/design/hero-gargantua-direction.md` sustituye `11 ter` y
`11 quater` en **densidad, cola, calibre y color** del perfil `webgl` del
stardust: 21 % de la densidad anterior, cola un 65 % más corta, motas a la mitad
de radio y ventana de tonos en la mitad FRÍA de la paleta (cian, cian pálido,
blanco frío) — la navegación ya había convergido al cian y el rastro era la
única pieza que seguía hablando en magenta. El retículo de `11 bis` no se toca y
el perfil `flat` sigue congelado byte a byte.

**Miller — océano gigantesco (2026-09-06):** la sección `9 ter` de
`docs/design/world-visual-language.md` sustituye material, paleta e iluminación
de Miller. **Su posición no se toca**, por petición explícita del dueño. Cambios
centrales: ley difusa propia sin meseta de terminador, Fresnel de agua sobre la
lámina, camino de luz cálido contra sábana fría, agua honda más profunda y masas
pálidas retiradas, y suelo nocturno y filos propios en vez de los comunes. Ni un
sitio de FBM, ni una textura, ni un draw call nuevos.

**Miller — océano encendido y en movimiento (2026-09-06):** la sección
`9 quinquies` de `docs/design/world-visual-language.md` **revierte** la
dirección de `9 ter` para Miller y manda sobre `9`, `9 ter` y la parte de
`9 quater` que le toca, en **paleta, exposición, nubes, animación de superficie
y filo**. Posición, tamaño, órbita, inclinación, cámara, HUD, fallback plano y
el resto de los cuerpos siguen intactos.

El dueño rechazó el resultado acumulado de las cuatro revisiones anteriores —
«está muy apagado y oscuro»— y dio una referencia de mundo de agua **encendido**,
con nubes visibles y oleaje animado. El principio que sustituye al anterior:
**«océano» no es un nivel de exposición, es un comportamiento.** La identidad se
defiende con camino de luz que se desplaza, destellos que centellean, cresta con
espuma intermitente y una capa de nube que va a otra velocidad que el agua —
todo eso se lee igual de bien sobre un cuerpo brillante. Cualquier texto anterior
que justifique bajar la luz de Miller para que se lea como océano está obsoleto.

Cambios centrales: cinco tonos de agua en vez de tres grises azulados; el bajío
pasa de veta a provincia; las nubes vuelven a verse (tinte 5.5 % → 30 %) y se
mueven al doble del giro del cuerpo; tres escalas de oleaje animadas de verdad;
suelo difuso 0.10 → 0.19 y atmósfera 0.09 → 0.26.

La animación deja **dos reglas**, y las dos costaron una entrega. Primera: se
calibra en **píxeles por segundo, no en rad/s** — sobre un cuerpo que gira, un
campo animado no existe hasta que su velocidad de superficie es varias veces la
del giro. Miller gira a 2.35 px/s en su ecuador y todo su oleaje iba entre 0.5 y
2.5 px/s, o sea que era textura arrastrada. Segunda: **acelerar no basta si el
movimiento no tiene MARCHA** — con las velocidades ya subidas seguía sin verse,
porque los trenes iban en ejes distintos y a velocidades de superficie distintas
y se deslizaban unos a través de otros. Eso es hervor, no oleaje. Ahora los
cuatro trenes y la nube comparten **un solo eje y una sola velocidad de
superficie** (0.24 unidades/s, 11.3 px/s). Medido: el oleaje decide el 49 % del
disco por segundo contra el 13 % de la rotación, y **cuánto cambia no predice si
se ve; en qué dirección cambia, sí**.

El pase cierra además la última excepción de `9 quater`: Miller era el único
cuerpo con `focusTint` 1.0, y sobre un mundo que ya es cian eso no lo identifica,
le **dobla la luminancia de la cara noche** (p05 28 → 57) y le borra el
terminador. Baja a 0.20 con `focusGain` 0.15 y `focusEdge` 0.16. **Sobrevive la
cresta** de `9 quater`, que es lo único de aquel pase que el dueño aprobó y que
no dependía de que el cuerpo fuera oscuro. Presupuesto intacto: tres sitios de
FBM, una octava suelta, ni un draw call ni un uniforme nuevos. El movimiento no
toca accesibilidad: con reduced-motion no hay canvas.

**El foco no puede borrar el material (2026-09-06):** la sección `9 quater` de
`docs/design/world-visual-language.md` manda sobre la respuesta de adquisición
de los seis cuerpos. El tinte de navegación deja de ser uniforme y se reparte por
material: Edmunds al 8 % y Endurance al 16 %, con la diferencia devuelta en
ganancia propia y filo. Es la aplicación directa del criterio de la capa visual
—la misma luz toca materiales diferentes sin borrar su identidad— al único sitio
donde el sistema lo incumplía.

**Edmunds — geología, no textura (2026-09-07):** la sección `9 sexies` de
`docs/design/world-visual-language.md` manda sobre `8`, sobre el `Pase 2 ·
Edmunds` de `9 bis` y sobre `Edmunds: cuatro macroformas` en **campo geográfico,
relieve, paleta, ley difusa y filo de limbo** de Edmunds. **Tamaño y posición
quedan congelados por petición explícita del dueño** — Edmunds contrapesa a la
Endurance y forma con la Ranger la base inferior, y eso no se discute. Tampoco
cambian órbita, inclinación, cámara, HUD, fallback plano ni ningún otro cuerpo.

El diagnóstico que sustituye a cualquier lectura anterior: **una puerta estrecha
sobre una fbm de cuatro octavas no dibuja una macroforma, dibuja la octava
fina.** De ahí las manchas del mismo calibre. La geografía pasa a decidirse en
un campo ANALÍTICO de baja frecuencia —liso por construcción y con gradiente
gratis— y la fbm queda degradada a perturbación de la frontera. Con eso, color y
sombreado dejan de contar dos terrenos distintos: la misma función pinta la
provincia y la ilumina. La cordillera se define por PENDIENTE y no por altura,
lo que además retira el vocabulario de cráteres sin quitar ninguno —una puerta
sobre una fbm isótropa sólo sabe hacer manchas redondas—, y el carbón deja de
ser una máscara para ser el SUSTRATO, porque un fondo con frontera se lee como
un cráter difuminado. El terminador no se aclara: la ley difusa de la roca pasa
a exponente 1.35 sobre suelo 0.07 —contra el 0.55 sobre 0.19 del agua de
Miller—, así que la caída a oscuridad es material y no exposición. El filete
continuo del limbo se trocea con una máscara de cresta y gana destellos sueltos.
Seis minerales —ocre, cobre, carbón, arcilla, arena, oliva apagado— sin subir la
saturación media, porque Edmunds es Creatividad. Presupuesto intacto: dos sitios
de fbm, uno de noise, cero draws y cero uniformes nuevos.

**El marco del overlay (2026-09-08):** la sección `13` de
`docs/design/endurance-navigation-interface.md` manda sobre `7` y `12` en **en
qué espacio se miden las coordenadas del mapa**, y es la causa raíz de «el HUD
está descentrado» y «el hover sólo funciona en zonas muy específicas». La escena
publica `--map-x` / `--map-y` en píxeles del VIEWPORT —proyecta contra un canvas
`position: fixed; inset: 0`— pero `.system-map` era `position: absolute` dentro
de `.system-home`, que mide `min(100%, 92rem)` y va centrada. Por encima de
1472 px de ventana, cada destino quedaba desplazado (viewport − 1472)/2 a la
derecha: **+224 px a 1920 y +544 px a 2560**. Con la escena viva, `.system-map`
pasa a `fixed; inset: 0`; el atlas plano conserva su marco de columna, que es el
suyo. No hay ni un desfase por objeto: la proyección siempre estuvo bien y el
contenedor mal.

Sobrevivió por dos coincidencias que hay que recordar antes de dar por buena
cualquier prueba de la portada: **la suite entera vive en 1440 px**, justo por
debajo del umbral, y **ninguna prueba e2e montaba la escena viva** —toda la
cobertura usaba `?no3d=1`, donde el marco de columna es correcto—. La deuda la
cubre `e2e/scene-overlay.spec.ts`, que comprueba el contrato en 1440, 1920 y
2560 sin necesitar GPU. Se evaluó y se DESCARTÓ con números anclar el proxy en
el centro de un `Box3` en vez del pivote: Miller y Edmunds tienen desfase 0.0 %,
la Endurance 1.7 %, y en el Tesseracto el centro de la caja es peor ancla que el
pivote porque `sampleTesseract` ya normaliza sus vértices a radio 1.5 alrededor
de su centroide en cada fase.

**Pase de cierre del puntero (2026-09-08):** la sección `12` de
`docs/design/endurance-navigation-interface.md` manda sobre `6` y `7` del mismo
documento en **tamaño del raíl y condiciones bajo las que un cuerpo recibe el
puntero**. No toca composición, cámara, material, HUD ni el contrato
`idle → target → locked`. El «a veces el hover no funciona» eran **tres fallos
deterministas** que se disparaban en circunstancias distintas: el campo de
cuerpos desaparecía entero por debajo de 960 px CSS aunque la escena estuviera
viva —regla escrita para el atlas plano, aplicada también al 3D—; el proxy de
Gargantúa, que cubre el disco completo, subía por encima de sus vecinos al ser
apuntado y los dejaba inalcanzables en la franja de solape; y el paralaje seguía
moviendo el sistema bajo un cursor quieto, así que el planeta se escurría solo.
Ahora el campo vuelve con puntero fino y escena viva (sin los rótulos anclados,
que son lo que no cabe), el centro se queda por debajo de los cinco cuerpos —en
un mapa con blancos solapados gana siempre el más pequeño—, `setFocus` congela
el paralaje mientras hay destino adquirido, y soltar sólo apaga lo que uno
encendió. `.nav-rail__name` sube de 0.69 a 0.78 rem.

**El bloom no puede encender la sombra (2026-09-08):** la sección `14 undecies`
de `docs/design/hero-gargantua-direction.md` manda sobre `6` en **qué le está
permitido al halo dentro del disco de la sombra**. Es la única excepción a la
congelación de Gargantúa y la pidió el dueño. No se toca el bloom —ni fuerza, ni
radio, ni umbral—, ni el raymarch, ni la geodésica, ni la escala. Se guarda la
imagen previa al halo y se vuelve a ella dentro del disco de parámetro de
impacto crítico, con puerta de material para no apagar los arcos lensados que sí
viven ahí dentro. La regla: **el halo no puede encender lo que estaba apagado, y
no toca nada de lo que ya estaba encendido.** Medido: el núcleo de la sombra baja
de 106.8 a 18.2 y fuera del disco no cambia ni un dígito.

**Pase visual final de Gargantúa (2026-09-12):** la sección `14 duodecies` de
`docs/design/hero-gargantua-direction.md` manda sobre `4`, `6` y `14 undecies`
en **cómo se separan materia, luz y vacío en la sombra, cuánto blanco hay en el
disco y dónde, la estructura interna de las bandas, qué es el arco inferior y
cuánto se diferencian los dos lados**. Levanta la congelación de Gargantúa por
petición del dueño, con un diagnóstico de cinco puntos y la orden de hacer **un
solo pase y parar**. No toca `rs`, posición, inclinación, cámara, HUD, bloom
(fuerza, radio, umbral), raymarch ni geodésica. Cuatro reglas que costaron una
entrega cada una: **el parámetro de impacto se conoce antes de integrar**, así
que los rayos condenados a caer apagan lo que cruzan cerca del horizonte y el
interior de la sombra se vacía en el propio raymarch (negro real 92 → 113 px sin
glow, píxel central con glow 18 → 1); **el blanco se localiza bajando la rodilla
de altas luces (9.6 → 5.8), no la exposición**, y pasa a ser propiedad de unos
nudos; **el índice de orden no sabe qué es lensado** —los arcos de cobre bajo la
sombra eran orden 0, medido con un render de sólo orden 0— y la regla correcta
es geométrica: un cruce del plano hacia arriba es luz que ha dado la vuelta por
debajo; y **el desvanecido de las lensadas tiene que entrar en la emisión**,
porque los rayos rasantes saturan alpha y en la densidad sola no hace nada. La
guarda del bloom sube a `inner` 0.80 / `amount` 0.96. `tools/gargantua-metrics.mjs`
nace en este pase para medir anillos de la sombra, negro real, recorte blanco y
asimetría. Cero evaluaciones de ruido, uniformes o draws nuevos. El dueño
revisó el primer resultado («8.9-9/10 […] pulir 2 o 3 cosas concretas y parar»)
y la **ronda final** hizo exactamente sus cuatro retoques —arco inferior roto
por máscara sobre tejido y masas, borde del negro más apretado, algo más de
estructura en la masa crema y contraste extra en el lado que se aleja— y se
detuvo ahí. El pase queda cerrado salvo veredicto contrario.

**ARQUITECTURA NARRATIVA (2026-09-06) — manda sobre todo lo anterior en
significado, etiquetas y rutas:** `docs/design/arquitectura-narrativa.md` fija la
asociación canónica entre cuerpo y sección:

| `WorldId` | Significado | Ruta ES |
| --- | --- | --- |
| `gargantua` | Sobre mí | `/es/sobre-mi` |
| `miller` | Formación | `/es/formacion` |
| `endurance` | Proyectos | `/es/proyectos` |
| `edmunds` | Creatividad | `/es/creatividad` |
| `tesseract` | Experimentos | `/es/experimentos` |
| `ranger` | Contacto | `/es/contacto` |

Cualquier texto anterior que diga **Tesseracto = Sobre mí/Historia**, **Miller =
Desarrollo** o **Gargantúa = Laboratorio** está obsoleto. El nombre visible de
`tesseract` es `Experimentos`, nunca `Laboratorio`. `/es/desarrollo` y
`/es/laboratorio` responden 404, sin alias ni redirección.

Dos separaciones que hay que respetar al tocar esto:

1. **`order` es orden NARRATIVO, no posición.** Gobierna raíl, DOM, tabulador,
   vecinos y sitemap; la escena se indexa por `WorldId` vía `placement` y
   `lib/scene-depth.ts`. Reordenar la narrativa no mueve ningún cuerpo.
2. **El significado vive en el MDX, no en la estructura.** `worlds.data.ts`
   sigue sin una sola palabra visible: etiqueta, título y slug están en el
   frontmatter, y por eso este cambio no tocó routing.

Este documento **revoca el veto sobre `/es/formacion`** que estableció la
decisión del 2026-09-04 al retirar Cooper Station. Lo retirado entonces fue un
CUERPO y sigue retirado; lo que vuelve es un SIGNIFICADO sobre un cuerpo que ya
existía. Siguen siendo seis destinos.

**Tesseracto V4 — pase de pulido (2026-09-06):** la sección `V4 — pase de pulido
sobre la base canónica` de `docs/design/atlas-tesseract-reference.md` manda sobre
`Hipercubo de cristal` en **material de la arista, oclusión de cruces, ritmo de la
animación y tamaño de la punta**. V3 queda como BASE CANÓNICA por decisión del
dueño —la búsqueda conceptual está cerrada— y de aquí en adelante sólo se pule:
prohibido reabrir la matemática del 4-cubo, la estructura o la dirección visual.
Cambios: normales por esquina en vez de por faceta (sin eso el material de tres
niveles no se ve), punta un 20 % menor con la estela intacta, reloj deformado por
dos armónicos que frenan en las poses legibles y aceleran en las comprimidas, una
cuarta capa que sólo escribe profundidad para interrumpir la línea de detrás en
los cruces, y un 3.5 % de contaminación cálida de Gargantúa. **No se engordan las
aristas**: la presencia sale de contraste, oclusión y ritmo, nunca de masa. Cuatro
draws, los mismos que el corredor. La persistencia 4D queda sin implementar a
propósito: es una prueba A/B que sólo se puede juzgar en movimiento. Checkpoints
intactos en `output/archive/tesseract-crystal-v2-…zip` y `-v3-…zip`.
**Cuarto recorte de escala — sólo el Tesseracto (2026-09-06):** la sección
`14 decies` de `docs/design/hero-gargantua-direction.md` sustituye la fila
`Tesseracto` de `14 septies` y sólo esa: `size` 2.629 → 2.5764 (−2 %), radio
publicado 4.667 → 4.574 rs. Es la deuda que aquel pase dejó abierta — el dueño
había pedido entre 1 y 2 % y se aplicó 1.5 porque la banda dura de
`bodies.test.ts` no daba para más. Ahora pide el 2 completo, así que la banda
baja su suelo de 4.55 a 4.47 conservando el margen que tenía (0.117 → 0.104 rs).
No se toca ningún otro cuerpo, ni posición, fase, inclinación, cámara, material
o HUD, ni las cuatro guardas donde vive «ni mota ni inflado»: suelo aparente
0.035, Miller el menor, el Tesseracto por encima de Miller y la Ranger entre el
Tesseracto y el 65 % de la Endurance.

**Hipercubo de cristal (2026-09-06):** la sección `Hipercubo de cristal` de
`docs/design/atlas-tesseract-reference.md` manda sobre todo lo anterior en
**geometría, material y versión plana del Tesseracto**. Sustituye el corredor de
marcos por el 4-cubo real —dieciséis vértices, treinta y dos aristas y rotación
en cuatro dimensiones proyectada por perspectiva— recorrido por un trazo
luminoso en circuito euleriano, en cristal casi negro con acentos cian y
violeta. Un segundo pase (mismo día) corrige la primera versión, que salió
ilegible: la lectura no dependía de la exposición sino de la JERARQUÍA, así que
`sampleTesseract` publica la profundidad en W de cada vértice y con ella se
reparten luz y grosor de trazo entre las dos celdas del hipercubo — gruesa y
clara la cercana en la cuarta dimensión, fina y apagada la lejana. El perfil
plano comparte ese reparto en ancho de trazo y opacidad. Tres draws y **tres** materiales, uno menos y dos más que antes: la
diferencia entre capas es de MEZCLA, no de acabado. El Tesseracto sale del
material común de los cuerpos y con él se retiran sus ocho ramas `uKind == 2`.
No cambian posición, fase, inclinación, tamaño, cámara ni datos orbitales de
ningún cuerpo, y la envolvente se normaliza al mismo radio de antes. El corredor
anterior queda recuperable en `output/archive/` (ignorado por git) y vivo en el
historial. Las secciones `Profundidad contradictoria` y `Remodelado estructural`
del mismo documento quedan como referencia histórica sustituida. La sección
`V2 aprobada, y la deuda que deja para una V3` recoge la aprobación del dueño,
dos vetos —no se recupera nada del Tesseracto arquitectónico anterior y no se
añade nada alrededor: ni partículas, ni energía, ni rayos, ni esfera de glow— y
siete frentes abiertos por orden de techo. El checkpoint intacto de esa V2 vive
en `output/archive/tesseract-crystal-v2-2026-09-06.zip`.

**Decisión del dueño (2026-09-04):** `docs/design/sistema-seis-destinos.md`
manda sobre los documentos anteriores en catálogo y recomposición: seis destinos
(Tesseracto, Miller, Endurance, Edmunds, Gargantúa, Ranger), sin Cooper Station
ni su ruta de Formación. No se reasigna contenido. La composición nueva necesita
revisión visual del dueño; se conserva el contrato de cámara y Gargantúa.

## Comandos

- `npm run check` — lint + typecheck + knip + test + build (lo que corre CI).
- `npm run test:e2e` — Playwright; requiere `npm run build` previo.
- `npm run content` — compila el contenido (Velite). Los scripts `pre*` ya lo
  corren antes de dev/build/typecheck/test.

**Nunca canalices `npm run check` por una tubería** (`| tail`, `| head`): el
código de salida pasa a ser el del último comando de la tubería y un build roto
se lee como verde. Redirige a un archivo y consulta `$?`.

## Entorno de desarrollo

- Node fijado en `.nvmrc` (24); CI usa 24. Node 26 también funciona.
- `.env.local` (ignorado por git) lleva los ajustes de máquina. Si `workerd`
  no arranca en tu equipo — Windows con VBS/HVCI aborta con *access violation* —
  usa `CF_DEV_CONTEXT=off`: `next.config.ts` se salta Miniflare y
  `readContactBindings()` cae a `process.env`. El runtime real de Cloudflare se
  sigue verificando en CI y en el deploy.

## Reglas no negociables (vienen del plan)

1. **Un solo pipeline MDX: Velite.** Prohibido añadir otro procesador MDX sin
   retirar este (plan B documentado: gray-matter + Zod + next-mdx-remote — uno
   u otro, nunca ambos).
2. **Versiones fijadas.** `package.json` sin `^`/`~`. Actualizar dependencias
   solo en tarea dedicada, tras pasar la suite completa. Los `overrides` de
   postcss/sharp existen por avisos de npm audit sobre deps transitivas de
   Next — revisar si siguen haciendo falta al subir Next.
3. **Cero huérfanos.** Knip corre en CI: nada de deps sin uso, exports sin
   consumidor ni componentes experimentales sueltos. `tailwindcss` está en
   `ignoreDependencies` porque se usa vía `@import "tailwindcss"` en CSS, que
   Knip no sigue.
4. **Identidad canónica `WorldId`.** La unión estructura↔prosa usa el id, nunca
   el slug de URL. Texto visible al usuario JAMÁS en `content/worlds.data.ts`.
5. **Sin sniffing del auditor.** Prohibido código cuya única función sea
   alterar una auditoría (Lighthouse se audita vía `?no3d=1` explícito, que es
   el mismo mecanismo del botón "Reducir efectos").
6. **La cámara no tiene controlador.** *(Sustituye a la regla anterior «scroll =
   fuente de verdad de la cámara», retirada por el pivote.)* La pose es una
   función pura de la ruta activa: `cameraPose = f(routeWorldId)`. Prohibidos
   `OrbitControls`, drag, rueda y cualquier acoplamiento al scroll. Único input
   continuo permitido: paralaje aditivo ≤ 2° desde puntero/giroscopio, apagado
   con reduced-motion. Las transiciones son guionadas, interrumpibles y con
   timeout duro: **la animación nunca es dueña del router**.
7. **La escena nunca es el contenido.** El HTML servido de cada ruta contiene el
   texto real sin JavaScript — en `/es`: nombre, rol, dos CTAs, CV y seis
   enlaces `<a href>` a los mundos. Nombre, rol, CTAs y CV forman el fallback
   semántico, pero **no** un bloque personal visible dentro del Hero; el raíl sí
   presenta los destinos. El canvas es `aria-hidden`, va detrás y nunca es
   candidato a LCP. Un reclutador con red lenta, un lector de pantalla y
   Googlebot conservan el mismo significado y las mismas rutas.
8. **Contenido honesto.** Sin lorem ipsum, sin métricas inventadas, sin
   placeholders disfrazados. Las fichas breves son un formato completo.
9. **Middleware:** no existe en F1 (redirect estático `/` → `/es` en
   `next.config.ts`). En F2A llega como `proxy.ts` (así se llama en Next 16).

## Referencias de v2

`docs/reference/v2/` conserva código de la versión anterior SOLO como
referencia (excluido de tsconfig y Knip): `universe.ts` (copy ya migrado a
`content/es/worlds/` corrigiendo Marketing Digital a carrera terminada),
`use-reduced-motion.ts`, `use-device-capability.ts`, `performance.ts` (base
para el gate de capacidad de F2B — adaptar al puerto nuevo cuando se
implemente, no importar directo). El `app/api/contact` de v2 estaba vacío: el
Worker de contacto de F1A se construye desde cero según la spec del plan.

## Al terminar una feature

Ninguna feature se considera completa sin sus tests del Appendix A
implementados y estables. Antes de cerrar una fase: revisión de bundle y
eliminación de experimentos sueltos.
