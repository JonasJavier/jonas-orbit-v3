# Proyectos · la mesa de ingeniería

## `boceto-mesa-2026-09-21.webp` · referencia de composición

- Archivo: 1586 × 992, WebP. Boceto que el dueño entregó el 21 de septiembre
  de 2026 con la idea de la mesa (`docs/design/endurance-proyectos.md`). **No
  se publica** y no es fuente de contenido: el diagrama de arquitectura que
  muestra (gateway, rate limiting, servicio de notificaciones) es una
  interfaz genérica y no describe OMSTA, y las pantallas que enseña son
  maquetas, no capturas del sistema. Lo que se toma de él es la composición:
  sala oscura, mesa de proyección en el tercio inferior, lectura a la
  izquierda, selector de tres capas arriba y muelle de proyectos abajo.

## `sala.png` · fondo de `/es/proyectos`

- Archivo: 2560 × 1440 (16:9), PNG. Es el original; no se publica tal cual.
- Copias publicadas: `public/images/proyectos/sala-{960,1440,1920,2560}.webp`,
  generadas por `tools/prepare-projects.mjs` (calidad 90: a 80 el cuantizador
  aplana los grises oscuros en manchas). **No se amplía nunca** por encima del
  nativo.
- Origen: render 3D procedural, generado por `tools/render-projects-room.mjs`
  con Three.js en un Chromium sin ventana (24 de septiembre de 2026). La sala
  se construye con primitivas y texturas hechas por código, y la imagen es el
  promedio de 192 pasadas (antialias, profundidad de campo, sombras suaves,
  reflejo del suelo y bruma). Todo el azar sale de una semilla: repetir el
  comando en la misma máquina da la misma imagen. No es una fotografía de un
  lugar real ni retrata a una persona real, y no se presenta como tal en
  ninguna parte del sitio: va `aria-hidden`, con `alt` vacío, y la página no
  le atribuye autoría, lugar ni fecha. Es decorado, y el decorado no afirma
  nada.
- Qué se ve: bahía de ingeniería a oscuras con bóveda de cuadernas, ventanal
  al fondo con el horizonte de un planeta en el paño de la derecha (el sol
  escondido justo detrás del borde: sólo brilla la atmósfera), contraventana
  blindada cerrada en el paño de la izquierda, luces de servicio ámbar, una
  mesa de trabajo con papeles en la esquina inferior izquierda y cajas de
  carga en la inferior derecha. Paleta: negro, carbón, acero frío, ámbar de
  servicio y el azul blanco del limbo; un candado de color en el revelado
  impide cualquier tono cian, que es de lo que proyecta la mesa.
- Encuadre pactado con la página (`object-position: 50% 45%`): tercio
  inferior central de suelo liso y oscuro para la mesa CSS; pared de babor en
  sombra detrás del título; ventanal detrás de los paneles; lo más brillante,
  el limbo, a la derecha de los paneles.
- Explícitamente **no contiene**: texto, rótulos ni logotipos (tampoco el
  nombre de la nave), interfaz, pantallas ni monitores con contenido,
  hologramas, figuras humanas ni mesa de proyección. Todo lo que informa es
  HTML (regla 7) y una pantalla pintada sería una captura falsa (regla 8).
- Brief de partida (§4.1 del documento): bahía de ingeniería de la Endurance
  a oscuras, paredes de módulos con cajas y equipo, ventanal ancho con limbo
  de planeta. Se apartó en una cosa a propósito: la mesa no está pintada,
  porque la dibuja la página.
