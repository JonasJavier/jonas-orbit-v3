# Endurance — vida operacional · 2026-09-06

Pedido del dueño: la geometría ya funciona, pero la nave parece apagada. Este
pase sustituye **sólo** las luces propias y la maniobra de Endurance descritas
en `world-visual-language.md` §9 bis. No rediseña la estación.

## Contrato

- Se conservan posición, escala, orientación y movimiento de reposo existentes,
  anillo, módulos, eje, radiadores, casco, iluminación desde Gargantúa, cámara,
  HUD, navegación y perfil plano. Las igniciones no aplican fuerzas ni escriben
  transforms.
- Nueve fuentes cálidas: seis pequeñas aperturas en módulos elegidos, dos
  puntos de servicio interiores y una señal en el collar de atraque. Algunas
  quedan parcialmente ocultas; no hay una luz por módulo ni un reparto uniforme.
- Cuatro fuentes técnicas frías: collar, extremo del eje y dos conexiones.
  Dos de las cálidas y una fría tienen pulsos suaves, con distintas fases y
  periodos de 8.3, 10.47 y 12.64 segundos; siempre conservan un nivel de reposo.
- Se conservan las cuatro campanas y depósitos de los pods del aro. Se añaden
  ocho pequeños RCS en esos pods y dos junto al docking: catorce canales de
  ignición. Las diez campanas nuevas son geometría oscura, incluso apagadas.
- Impulsos de 279–380 ms, con ataque y apagado suaves, más de 3.7 segundos
  de silencio entre correcciones y un máximo absoluto de dos canales activos.
  Cada evento incluye una tobera expuesta del aro (0/2 alternas); los RCS y
  las otras dos toberas sólo son el segundo canal ocasional. Duración y desfase
  varían por evento; no hay catorce ciclos
  independientes que puedan coincidir accidentalmente. El reloj es determinista
  y permite inspeccionar cualquier instante sin simular los anteriores.
- Escape corto, blanco en la garganta, azul pálido al desvanecerse. No hay
  rescoldo permanente: un thruster apagado no emite. El núcleo técnico mantiene
  la vida del centro durante el silencio.
- El halo local pertenece a la fuente y comparte su geometría/material fusionado.
  No cambia el bloom amplio de Gargantúa. Las fuentes tienen profundidad y pueden
  quedar ocultas por el casco. No se ilumina artificialmente ningún panel.

## Implementación y presupuesto

`endurance-operations.ts` contiene el reloj operacional y el fragment de las
luces. Sólo sustituye el fragment del cuarto material **existente** de Endurance;
el vertex, las tres familias de casco y los shaders de los demás cuerpos se
conservan. No añade texturas, luces de Three ni draws: cuatro batches de cuerpo,
más la trayectoria ya existente. Se respeta el límite conjunto de 19 500 vértices
y 20 batches; no se amplían las puertas de los tests.

La máscara emisiva reserva 0–4 para luces, 8–35 para las catorce gargantas y
sus rampas, y 40–44 para los halos. La luz emitida queda fuera de la medición
de silueta, como las plumas anteriores. Los pequeños nozzles físicos quedan
dentro de la envolvente existente.

## Validación

- Tests de diez minutos de actividad: duración, separación, máximo simultáneo,
  uso de los catorce canales, navegación discreta y lectura del reloj hacia atrás.
- Tests de geometría, envolvente, jerarquía aparente y presupuesto en
  `bodies.test.ts`, conservando las puertas originales.
- Capturas en `output/playwright/endurance/`: Hero y recorte a la misma escala
  de cámara; reloj 4 s (todos apagados), 15.94 s (dos canales activos), BEFORE y
  AFTER. El close-up es un recorte del Hero, no una cámara favorecedora.
- El criterio artístico sigue siendo la primera lectura del Hero. Las capturas
  son evidencia para revisión, no una aprobación visual atribuida al dueño.

## Corrección tras revisión del dueño — propulsores ilegibles

El dueño señaló que habían dejado de funcionar visualmente. La primera versión
validaba que cualquier canal se activara, pero en el primer minuto elegía casi
siempre RCS pequeños u ocultos: el aro podía parecer apagado pese a pasar los
tests. Además, el descarte global de caras traseras debilitaba los conos abiertos.

Se garantiza una corrección del aro por evento (ventana de 5.8 s con 1.6 s de
variación); ataque y caída caben en 310–380 ms, y el canal secundario dura el
90 % de eso. La pluma del aro recupera 0.24 unidades de longitud geométrica,
con caída fuerte hasta desaparecer. Se dibujan sus dos caras y se conserva
un mínimo angular para que el escape no se borre al verse de canto. Las luces
funcionales mantienen su shader y su energía. No cambia ninguna pose ni casco.

La regresión se cubre exigiendo al menos dos frames fuertes del aro por evento
a 15 fps durante cien eventos. Se verifica también con reloj vivo y capturas
a 1.74 s (aro) y 13.37 s (aro + RCS), bajo `output/playwright/endurance/`.
Las capturas a 15.94 s del primer pase quedan como evidencia histórica.
