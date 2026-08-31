# Hero / System Map — quality + life pass (2026-08-31)

## Dictamen

**HERO QUALITY PASS: APPROVED CANDIDATE**  
**CONTINUOUS JOURNEY: DEFERRED**

La aprobación procede de revisión visual de los frames estático, Endurance
activa, Ranger activa, móvil a 390 × 844 y fallback con reduced-motion. Los tests
son condición necesaria, no la razón principal del dictamen.

## Qué estaba débil

- Endurance se comprimía visualmente en una cruz/rueda y no se parecía a la nave
  de la película.
- Ranger se leía como una mota o un caza genérico.
- El reparto de vida favorecía a Endurance; varios destinos parecían props.
- El estado inactivo del HUD repetía copy genérico, especialmente en móvil.
- Reduced-motion aún podía ser contradicho por una activación 3D persistida.

## Endurance

Reconstrucción procedural basada en la arquitectura cinematográfica: doce
módulos rectangulares independientes, huecos visibles, centro abierto, un único
brazo radial, hub compacto, dos Ranger, dos Lander, cuatro módulos de motor y
doce campanas. Usa cuatro mallas fusionadas y cuatro familias materiales:
manta/panel, estructura, servicio y balizas.

El casco pasa a blanco roto y gris de manta térmica, con recesos negros, acento
naranja localizado y fill azul limitado al canto. Referencias de producción:

- Steve Burg, arte conceptual de Endurance:
  <https://steveburg.artstation.com/projects/96GNQ>
- fxguide, miniaturas y efectos de _Interstellar_:
  <https://www.fxguide.com/fxfeatured/real-and-raw-the-miniature-fx-behind-interstellar/>
- Space.com, diagrama de las naves:
  <https://www.space.com/27694-interstellar-movie-spaceships-infographic.html>

## Ranger y otros mundos

Ranger crece de `1.5` a `2.5` y adopta lifting body bajo y ancho, planta de
manta, cabina integrada, vientre térmico y toberas gemelas. Tesseracto conserva
la jerarquía en `2.7`; Endurance sube a `5.15`. Cooper, Miller y Edmunds mantienen
su dirección y reciben la vida local ya implementada: giro material, atmósfera,
anillos/hábitat y terminador compartido.

## Movimiento y luz

Los seis destinos no centrales tienen movimiento local determinista sin cambiar
su posición. No hay touring ni órbitas continuas. Gargantúa sigue siendo la
fuente cálida; el fill frío recupera volumen y el terminador/specular hace que la
rotación afecte la lectura material.

## HUD, viewport y navegación

- Sin `01…07` delante de los destinos.
- Sin `MOTION // REDUCED` persistente.
- `SYSTEM MAP / SELECT TARGET` sustituye frases más largas.
- En móvil el bloque idle desaparece hasta adquirir un objetivo.
- Primary, secondary y tertiary son colores opacos con luminancia diferenciada.
- Viñeta, reflejo, marcas de calibración, brackets y retícula sugieren cristal de
  navegación sin añadir una cabina pesada.
- El raíl conserva siete enlaces reales y blancos táctiles mínimos de 44 px.

## Rendimiento, responsive y accesibilidad

- Presupuesto de los cuerpos: como máximo 23 batches y menos de 15 000 vértices.
- Las piezas de Endurance se fusionan; un invariante impide aceptar mallas vacías.
- Móvil verificado a 390 × 844 y E2E a 375 × 812, sin overflow vertical.
- Reduced-motion es un veto duro: no WebGL, no cursor/polvo, sin control que
  prometa reactivar la escena. El contenido y los siete destinos permanecen.

## Verificación

- `npm run lint` — verde.
- `npm run typecheck` — verde.
- `npm run knip` — verde.
- `npm run test` — 25 archivos, 152 tests verdes.
- `npx next build --webpack` — build de producción verde. Webpack es necesario
  en esta máquina porque Windows Application Control bloquea el SWC nativo que
  necesita Turbopack.
- `npm run test:e2e` — 58/58 en Chromium escritorio y móvil.

## Límite conocido

El modelo está calibrado para la distancia del System Map. Conserva la
arquitectura y la silueta de la Endurance cinematográfica, pero no pretende ser
un asset texturizado para un plano de inspección a pantalla completa. Ese nivel
de close-up sería otro alcance y no es necesario para este Hero.
