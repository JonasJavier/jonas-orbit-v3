# Footer — una última ventana al universo

2026-09-23. Petición de Jonás: mejorar composición, creatividad y UX del
footer, darle vida y una animación muy similar a la navbar para que se
complementen. **Implementación candidata; valoración visual pendiente.**

## Segundo pase — paleta exacta y estrellas fugaces (09-23)

Corrección explícita de Jonás: los colores tienen que ser exactamente los de
la navbar y la animación debe notarse más, con estrellas fugaces. Manda
sobre los colores y ritmos del primer pase descrito debajo.

`voyage-palette.css` contiene una única paleta consumida por ambas piezas:
fondo y gradientes originales de la navbar, bordes, blancos, textos, cian,
paneles y foco. El footer abandona el baño violeta por ruta, el degradado del
titular y el botón claro; usa los tonos originales de la cabecera. Los seis
destinos mantienen sus acentos, como los seis enlaces de la navbar.
Se retiran las reglas antiguas de Sobre mí, Miller, Edmunds y Ranger que
sobrescribían el fondo del footer por el de cada página: impedían que la
paleta compartida se aplicara realmente.

El perfil `footer` de `VoyageSky` usa 8 px/s en la capa cercana y 2,4 veces
la cantidad de estrellas para su ventana alta. La primera fugaz llega
0,8 s después de activar el cielo visible; las siguientes comienzan cada
3,5–6,5 s. Duran 1,3 s, con trayectoria diagonal, estela degradada, un halo
suave y cabeza luminosa. La velocidad se adapta al ancho para que también
crucen dentro del móvil. Colores estelares compartidos con la navbar. La
traza orbital tarda 12 s. Todo sigue suspendiéndose con OFF, fuera de la
vista y en segundo plano. La navbar conserva su velocidad y cadencia.

Verificación del segundo pase: igualdad de `backgroundColor` y
`backgroundImage` calculados entre `.site-header` y `.site-footer` en los
seis destinos. La sonda del canvas detecta dos fugaces en 8,5 s, captura
una estela real y comprueba que deja de dibujarse con OFF. Lint de fuentes,
TypeScript, Knip, 448 tests, 32 e2e de navbar y build de producción pasan.
Las duraciones de hover se aplican sólo a elementos con una transición
declarada: no deben animarse tipografías ni tamaños al cambiar de breakpoint.

## Primer pase — estructura

El cierre conserva la invitación «Tu próxima idea, un nuevo universo» y el
contacto directo. Comparte la marca JONÁS ØRBIT y el observatorio de la
cabecera (`VoyageSky`), con la misma velocidad, estrellas, centelleo y
meteoros. El acento de la ruta tiñe el titular, el horizonte y el instrumento
del mapa. No se añade sonido.

La composición tiene cuatro niveles: invitación y mapa, seis destinos,
identidad y perfiles, pie legal. El mapa es un enlace con una retícula
orbital y una traza luminosa de 24 s. En móvil se convierte en un acceso
horizontal de 84 px. Los destinos ocupan seis, tres o dos columnas según
el ancho, siempre en el orden narrativo del MDX. Hover y foco iluminan la
línea, el punto y la flecha con el acento del destino; el activo conserva
su marca y `aria-current`. Los textos nunca dependen del hover.

`SiteFooter` sigue siendo servidor: enlaces, identidad, contacto y privacidad
están en el HTML inicial. Sólo `FooterSky` es cliente. Observa la ventana de
560 px del cielo: `useMotionEnabled`, `IntersectionObserver` y la visibilidad
del documento gobiernan el bucle. Fuera de pantalla, en segundo plano o con
el interruptor OFF queda un fotograma. La traza SVG sigue ese mismo estado.
Sin JS o canvas queda la textura estática. El encendido global prevalece
sobre reduced-motion, según `movimiento-unificado.md`. No hay otra pausa,
dependencias nuevas, imágenes nuevas ni escena WebGL.

El componente compartido `VoyageSky` sólo añade un nombre de clase opcional:
el valor por defecto y el funcionamiento de la navbar se conservan. El
footer usa su propia clase para no contaminar las mediciones de la cabecera.

Verificación: 448 tests de esta copia (incluidos navegación HTML, CTA de
Contacto y suspensión/reanudación del cielo), TypeScript, Knip, build de
producción y 32 e2e de navbar. El lint de fuentes pasa excluyendo artefactos
locales. `npm run check` sin exclusiones tropieza con `.claude/worktrees/`
y scripts antiguos de `output/`; no se modificaron ni eliminaron.

La sonda sobre producción verifica 320, 375, 704, 768, 1024, 1080, 1440 y
2560 px sin desbordamiento tras asentar el resize, destinos con blancos de
al menos 44 px, orden de Tab y navegación con Enter, ancla de vuelta arriba
y navegación con JavaScript desactivado. Cuenta llamadas reales a `clearRect`
del canvas del footer forzando pintados: hay cuadros con movimiento ON,
cero con OFF y cero con documento oculto. Verifica también reanudación y
la pausa de la traza CSS. Las capturas finales son de producción, con
`jonas-orbit:reducir-efectos = "false"`.

Capturas y sonda de navegador en `output/playwright/footer-*` (ignoradas por
Git). El tamaño del cielo está acotado, comparte el módulo ya usado por la
cabecera y no hace prefetch de destinos. No se declara una mejora de tiempo
de carga ni de tamaño del bundle sin una comparación medida.
