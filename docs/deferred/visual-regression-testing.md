# Pruebas visuales de regresión

## Estado

DEFERRED — candidato para F1B/F2.

No bloquea F1A ni se considera deuda pendiente para publicar la primera versión.

## Objetivo

Detectar cambios visuales accidentales que las pruebas funcionales no pueden identificar, como:

- Composiciones rotas.
- Cambios inesperados de espaciado.
- Overflow.
- Elementos desplazados.
- Texto cortado.
- Imágenes deformadas.
- Regresiones responsive.
- Estados de focus visualmente dañados.
- Cambios accidentales en temas, tipografía o jerarquía visual.

## Condiciones para implementarlas

Solo se incorporarán cuando:

1. F1A esté desplegada.
2. El diseño principal haya sido revisado y aprobado.
3. Los componentes visuales elegidos como baseline ya no estén cambiando semanalmente.
4. Existan datos y contenido deterministas para ejecutar las capturas.
5. Las animaciones puedan congelarse durante las pruebas.
6. Las fuentes estén cargadas de forma determinista.
7. Los fondos dinámicos puedan sustituirse por una variante estable.

## Alcance inicial

No tomar snapshots de cada elemento ni de cada frame del viaje. Comenzar con una matriz pequeña de puntos visualmente críticos:

1. Hero.
2. Endurance con las tarjetas de proyectos.
3. Un caso de estudio completo.
4. Edmunds o galería.
5. Ranger y formulario de contacto.
6. Navegación móvil.
7. Estado reduced-motion.
8. Página 404.

Añadir snapshots de mundos adicionales solo cuando protejan una composición visual realmente distinta.

## Viewports iniciales

Viewports fijos y explícitos: móvil y escritorio. Tablet puede añadirse si se detectan regresiones propias de ese breakpoint.

## Estrategia de estabilidad

Durante las capturas:

- Activar `prefers-reduced-motion`.
- Desactivar o congelar animaciones y transiciones.
- Fijar fecha y hora.
- Utilizar contenido y datos deterministas.
- Esperar a que las fuentes estén listas.
- Desactivar cursores, carets y elementos intermitentes.
- Evitar dependencias de red externas.
- Usar la variante ligera o un backdrop determinista.
- Ocultar información variable (tiempos, métricas en vivo, IDs).
- Mantener dimensiones de imágenes conocidas.

La escena WebGL completa NO forma parte de la primera matriz visual mientras no exista una forma determinista de renderizarla. Inicialmente se prueba la composición DOM con `?no3d=1`. La experiencia 3D puede recibir después: pruebas visuales separadas, un modo determinista de cámara/tiempo, o revisión visual manual si los snapshots resultan demasiado inestables.

## Herramienta

Playwright `toHaveScreenshot()` o solución equivalente integrada con la suite existente.

## Ejecución

No se ejecutan en cada pull request inicialmente. Se ejecutan:

- En `main`.
- De forma programada.
- Manualmente antes de un release visual importante.

## Revisión de diferencias

Un snapshot no se actualiza automáticamente solo para hacer verde el pipeline. Cuando aparezca una diferencia:

1. Revisar visualmente el diff.
2. Determinar si el cambio fue intencional.
3. Corregirlo si es una regresión.
4. Actualizar el baseline únicamente si el nuevo diseño fue aprobado.

## Criterio de adopción

Se mantienen únicamente si su señal supera su ruido. Si una captura sigue flaky tras estabilizar animaciones, fuentes, datos y viewport: reducir su alcance, reemplazarla por una prueba de componente, convertirla en revisión manual, o eliminarla. No deben convertirse en un sistema que bloquee despliegues por diferencias irrelevantes de un píxel.

## Prioridad

PARKED / F1B-F2. Implementar después de estabilizar visualmente F1A y antes de que el diseño crezca lo suficiente como para que las regresiones sean difíciles de detectar manualmente.
